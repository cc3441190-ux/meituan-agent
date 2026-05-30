import { formatNodeScheduleDetail, formatNodeTimeRange, getPlanTimeSpan } from '../agent/timeline'
import { getInventoryDisplay } from '../agent/nodeCopy'
import type { Constraints, Plan, PlanNode } from '../agent/types'
import {
  buildPhaseIntent,
  buildQualitySignals,
  buildStageRationale,
  buildVerifiedChecks,
  inferPlanTitle,
  inferSchemeSummary,
  resolveSceneLabel,
} from './rationale'
import { buildSceneUnderstanding } from './sceneUnderstanding'
import { feedbacksToNegotiations, type CompanionFeedback } from './companionFeedback'
import type {
  ConstraintChip,
  NegotiationItemVM,
  ProposalCardVM,
  ProposalStatus,
  ProposalVisualState,
  ProposalViewModel,
} from './types'

function resolveStatus(node: PlanNode): ProposalStatus {
  if (node.fixed) return 'fixed'
  if (node.status === 'error') return 'error'
  if (node.status === 'confirmed') return 'locked'
  return 'pending'
}

function resolveVisualState(node: PlanNode): ProposalVisualState {
  if (node.status === 'confirmed') return 'locked'
  const inv = getInventoryDisplay(node)
  if (
    node.status === 'error' ||
    node.conflict === 'no_seat' ||
    node.conflict === 'no_ticket' ||
    inv.level === 'red' ||
    node.inventory?.available === false
  ) {
    return 'unavailable'
  }
  return 'pending'
}

function buildConstraintChips(constraints: Constraints): ConstraintChip[] {
  const scene = buildSceneUnderstanding(constraints)
  return scene.autoConsiderations.map((label, i) => ({
    id: `auto-${i}`,
    label,
  }))
}

function estimateWalk(plan: Plan): string {
  let meters = 0
  for (const node of plan.nodes) {
    if (node.transit?.mode === 'walk') meters += node.transit.duration * 80
    else if (node.transit) meters += node.transit.duration * 30
  }
  if (meters === 0) return '约 1.2 km'
  const km = meters / 1000
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`
}

function estimateNodePrice(node: PlanNode): string {
  if (node.category === 'dining') return '预计人均 ¥80-120'
  if (node.type === 'indoor_play' || node.category === 'entertainment') return '门票/项目 ¥60 起'
  if (node.category === 'outdoor') return '免费或低消费'
  return '到店前二次确认价格'
}

function buildTransactionChecks(node: PlanNode, next?: PlanNode): string[] {
  const checks = [estimateNodePrice(node)]
  const inv = getInventoryDisplay(node)
  checks.push(inv.level === 'red' ? '当前不可订，建议替换' : inv.label)
  if (node.transit) {
    checks.push(`${node.transit.mode === 'walk' ? '步行' : '路程'}约 ${node.transit.duration} 分钟`)
  } else if (node.poi?.distance != null) {
    checks.push(`距离约 ${node.poi.distance}km`)
  }
  if (node.category === 'dining') checks.push('下单前展示等位/取消规则')
  else if (node.type === 'indoor_play' || node.category === 'entertainment') checks.push('购票前展示退改规则')
  else checks.push('出发前复核营业状态')
  if (next?.transit) checks.push(`下一站衔接 ${next.transit.duration} 分钟`)
  return checks.slice(0, 4)
}

function buildProposals(
  plan: Plan,
  constraints: Constraints,
  focusIndex: number,
): ProposalCardVM[] {
  const proposals: ProposalCardVM[] = []
  let phaseCounter = 0

  plan.nodes.forEach((node, idx) => {
    if (node.fixed) return
    // 休息缓冲节点不渲染为方案卡
    if (node.type === 'rest' || node.category === 'rest') return
    const next = plan.nodes[idx + 1]
    const inv = getInventoryDisplay(node)
    const scheduleDetail = formatNodeScheduleDetail(node)
    const qualitySignals = buildQualitySignals(node, next)
    if (scheduleDetail) qualitySignals.unshift(scheduleDetail)

    proposals.push({
      id: `proposal-${idx}`,
      phaseIndex: ++phaseCounter,
      intent: buildPhaseIntent(node, constraints),
      poiName: node.poi?.name ?? node.name,
      sceneLabel: resolveSceneLabel(node),
      timeRange: formatNodeTimeRange(node),
      nodeIndex: idx,
      status: resolveStatus(node),
      visualState: resolveVisualState(node),
      qualitySignals,
      verifiedChecks: buildVerifiedChecks(node, next),
      transactionChecks: buildTransactionChecks(node, next),
      rationaleBullets: buildStageRationale(node, constraints),
      inventoryLabel: inv.label,
      isFocused: idx === focusIndex,
      transitMinutes: node.transitMinutes ?? 0,
      waitMinutes: node.waitMinutes ?? 0,
    })
  })

  return proposals
}

/** 路线 A：仅展示分享后同伴真实回流，无反馈则不生成协商项 */
function buildNegotiations(
  plan: Plan,
  companionFeedbacks: CompanionFeedback[],
): NegotiationItemVM[] {
  if (companionFeedbacks.length === 0) return []
  return feedbacksToNegotiations(companionFeedbacks, plan)
}

function buildExecutionLine(
  pendingCount: number,
  readyToBook: boolean,
  lockedCount: number,
  bookableCount: number,
): string {
  if (readyToBook) return '全部站点已确认 · 下一步核对代办清单与费用规则'
  if (pendingCount > 0) return `${pendingCount} 项待确认 · 已锁定 ${lockedCount}/${bookableCount} 站`
  if (lockedCount > 0) return `已锁定 ${lockedCount}/${bookableCount} 站 · 继续确认剩余站点`
  return '浏览方案 · 确认后即可一键安排'
}

function buildExecutionCta(readyToBook: boolean, bookingEstimate: number): string {
  if (readyToBook) {
    return `查看代办清单 · 授权后执行`
  }
  return `确认方案后授权代办（约 ¥${bookingEstimate}）`
}

export function planToProposalVM(input: {
  plan: Plan | null
  constraints: Constraints
  focusNodeIndex: number
  bookingEstimate: number
  pendingCount: number
  readyToBook: boolean
  lockedCount: number
  bookableCount: number
  companionFeedbacks: CompanionFeedback[]
  isPlanning: boolean
}): ProposalViewModel | null {
  const { plan, constraints } = input
  if (!plan) return null

  const scene = buildSceneUnderstanding(constraints)
  const timeRange = getPlanTimeSpan(plan) || `约 ${constraints.timeWindow || 4} 小时`

  const proposals = buildProposals(plan, constraints, input.focusNodeIndex)
  const perPerson =
    scene.kind === 'friends' && constraints.people.includes('group_4')
      ? Math.round(input.bookingEstimate / 4)
      : input.bookingEstimate

  return {
    planTitle: input.isPlanning ? '正在生成你的下午方案…' : inferPlanTitle(constraints),
    planSubtitle: input.isPlanning ? 'AI 正在理解你的出行场景' : inferSchemeSummary(constraints),
    sceneLabel: scene.sceneLabel,
    detectedPeople: scene.detectedPeople,
    planningIntent: scene.planningIntent,
    autoConsiderations: scene.autoConsiderations,
    shareButtonLabel: scene.shareButtonLabel,
    budgetLabel: scene.budgetLabel,
    budgetDisplay:
      scene.kind === 'friends' ? `¥${perPerson}` : `¥${input.bookingEstimate}`,
    timeRange,
    totalBudget: input.bookingEstimate,
    walkDistance: estimateWalk(plan),
    stopCount: proposals.length,
    constraintChips: buildConstraintChips(constraints),
    schemeSummary: inferSchemeSummary(constraints),
    proposals,
    negotiations: buildNegotiations(plan, input.companionFeedbacks),
    executionLine: buildExecutionLine(
      input.pendingCount,
      input.readyToBook,
      input.lockedCount,
      input.bookableCount,
    ),
    executionCta: buildExecutionCta(input.readyToBook, input.bookingEstimate),
    pendingCount: input.pendingCount,
    readyToBook: input.readyToBook,
    lockedCount: input.lockedCount,
    bookableCount: input.bookableCount,
  }
}

/** 规划进行中、尚无 plan 时的顶栏占位（不展示方案卡片） */
export const PLANNING_PLACEHOLDER_VM: ProposalViewModel = {
  planTitle: '正在生成你的下午方案…',
  planSubtitle: 'AI 正在理解你的出行场景',
  sceneLabel: '—',
  detectedPeople: '—',
  planningIntent: '—',
  autoConsiderations: [],
  shareButtonLabel: '分享方案',
  budgetLabel: '总预算',
  budgetDisplay: '—',
  timeRange: '--:-- – --:--',
  totalBudget: 0,
  walkDistance: '—',
  stopCount: 0,
  constraintChips: [],
  schemeSummary: '',
  proposals: [],
  negotiations: [],
  executionLine: '方案生成中…',
  executionCta: '一键安排',
  pendingCount: 0,
  readyToBook: false,
  lockedCount: 0,
  bookableCount: 0,
}
