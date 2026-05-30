import { formatTime } from '../agent/constants'
import { getInventoryDisplay } from '../agent/nodeCopy'
import type { Constraints, Plan, PlanNode } from '../agent/types'
import { getTransitLabel } from '../config/transitAssets'
import type {
  CollaboratorOpinion,
  ConstraintTag,
  CurrentPhaseInfo,
  ExecutionTask,
  JourneyPhase,
  JourneyViewModel,
  StopVisualStatus,
} from './types'

function resolveStopStatus(node: PlanNode, isExecuting: boolean): StopVisualStatus {
  if (node.fixed) return 'fixed'
  if (node.status === 'error') return 'error'
  if (isExecuting && node.status === 'confirmed') return 'executing'
  if (node.status === 'confirmed') return 'locked'
  if (node.status === 'loading') return 'executing'
  return 'pending'
}

function phaseIntent(node: PlanNode): string {
  if (node.category === 'entertainment' || node.type === 'indoor_play') return '释放孩子精力'
  if (node.category === 'dining') return '轻食休息'
  if (node.category === 'outdoor') return '江边散步'
  if (node.type === 'garden') return '户外放风'
  return '行程段落'
}

function stopBadge(status: StopVisualStatus, node: PlanNode): string {
  if (node.fixed) return node.type === 'home' ? '出发' : '到达'
  if (status === 'locked') return '已锁定'
  if (status === 'executing') return '执行中'
  if (status === 'error') return '需调整'
  return '待确认'
}

function buildConstraintTags(constraints: Constraints): ConstraintTag[] {
  const tags: ConstraintTag[] = []
  if (constraints.people.includes('child_5')) tags.push({ id: 'child', label: '适合 5 岁儿童' })
  tags.push({ id: 'indoor', label: '室内优先' })
  tags.push({ id: 'rain', label: '已规避降雨' })
  if (constraints.people.includes('diet')) tags.push({ id: 'diet', label: '低脂饮食' })
  tags.push({ id: 'duration', label: `总时长约 ${constraints.timeWindow || 5} 小时` })
  return tags.slice(0, 5)
}

function buildPhases(plan: Plan, focusIndex: number, isExecuting: boolean): JourneyPhase[] {
  const phases: JourneyPhase[] = []
  let phaseCounter = 0

  plan.nodes.forEach((node, idx) => {
    if (node.fixed) return
    const status = resolveStopStatus(node, isExecuting)
    const inv = getInventoryDisplay(node)
    const start = formatTime(node.startTime)
    const end = formatTime(node.endTime)

    phases.push({
      id: `phase-${idx}`,
      phaseIndex: ++phaseCounter,
      intent: phaseIntent(node),
      timeRange: `${start} – ${end}`,
      nodeIndex: idx,
      title: node.poi?.name ?? node.name,
      badge: stopBadge(status, node),
      status,
      summary: buildPhaseSummary(node),
      inventoryLabel: inv.label,
      isCurrent: idx === focusIndex,
    })
  })

  return phases
}

function buildPhaseSummary(node: PlanNode): string {
  const parts: string[] = []
  if (node.duration) parts.push(`停留 ${node.duration} 分钟`)
  if (node.transit) parts.push(`${getTransitLabel(node.transit.mode)} ${node.transit.duration} 分钟`)
  return parts.join(' · ') || 'Agent 已排入动线'
}

function buildCurrentPhase(
  plan: Plan,
  phases: JourneyPhase[],
  focusIndex: number,
): CurrentPhaseInfo | null {
  const phase = phases.find((p) => p.nodeIndex === focusIndex)
  if (!phase) return phases[0] ? phaseToCurrent(phases[0], plan) : null
  return phaseToCurrent(phase, plan)
}

function phaseToCurrent(phase: JourneyPhase, plan: Plan): CurrentPhaseInfo {
  const node = plan.nodes[phase.nodeIndex]
  const next = plan.nodes[phase.nodeIndex + 1]
  let nextLeg: string | undefined
  if (next?.transit) {
    nextLeg = `${getTransitLabel(next.transit.mode)} ${next.transit.duration} 分钟`
  }
  return {
    phaseIndex: phase.phaseIndex,
    intent: phase.intent,
    title: phase.title,
    endTime: formatTime(node.endTime),
    nextLeg,
  }
}

function buildExecutionTasks(
  plan: Plan,
  isPlanning: boolean,
  isExecuting: boolean,
  isRecalculating: boolean,
  inviteLoading: boolean,
  lockedCount: number,
  bookableCount: number,
  readyToBook: boolean,
): { completed: ExecutionTask[]; running: ExecutionTask[]; pendingHint: string | null } {
  const completed: ExecutionTask[] = []
  const running: ExecutionTask[] = []

  if (!isPlanning && plan.nodes.length > 0) {
    completed.push({ id: 'route', label: '路线优化', state: 'done' })
    completed.push({ id: 'weather', label: '天气规避', state: 'done' })
  }

  const play = plan.nodes.find((n) => n.category === 'entertainment' || n.type === 'indoor_play')
  const meal = plan.nodes.find((n) => n.category === 'dining')

  if (play?.status === 'confirmed' || isExecuting) {
    completed.push({ id: 'play', label: '乐园预约', state: 'done' })
  }
  if (meal?.status === 'confirmed' || isExecuting) {
    completed.push({ id: 'meal', label: '餐厅取号', state: 'done' })
  } else if (meal?.poi) {
    running.push({ id: 'meal-check', label: '晚餐余位确认', state: 'running', progress: 64 })
  }

  if (isRecalculating) {
    running.push({ id: 'replan', label: 'AI 重新计算下午动线', state: 'running', progress: 55 })
  }

  if (isPlanning) {
    running.push({ id: 'poi', label: 'POI 数据校验', state: 'running', progress: 42 })
  }

  if (inviteLoading) {
    running.push({ id: 'share', label: '共享行程生成', state: 'running', progress: 70 })
  }

  running.push({ id: 'collab', label: '协同意见分析', state: 'running', progress: 38 })

  if (isExecuting) {
    running.push({ id: 'exec', label: '一键锁定席位', state: 'running', progress: 82 })
  }

  let pendingHint: string | null = null
  if (!isPlanning && !readyToBook && bookableCount > lockedCount) {
    pendingHint = `还有 ${bookableCount - lockedCount} 站待确认`
  } else if (readyToBook) {
    pendingHint = '全部站点已锁定 · 等待授权'
  }

  return { completed, running, pendingHint }
}

function buildCollaborators(consensusSummary: string | null): CollaboratorOpinion[] {
  return [
    {
      id: 'wife',
      name: '老婆',
      avatar: '👩',
      message: '别吃太油',
      role: 'partner',
      resolution: 'Agent 已调整晚餐为轻食',
    },
    {
      id: 'friend',
      name: '朋友',
      avatar: '👤',
      message: '想加个小酒馆',
      role: 'friend',
      resolution: consensusSummary ? '已纳入阶段备选' : '⏳ 平衡分析中',
    },
    ...(consensusSummary
      ? [
          {
            id: 'agent',
            name: 'Agent',
            avatar: '🤖',
            message: consensusSummary.slice(0, 40),
            role: 'agent' as const,
          },
        ]
      : []),
  ]
}

export function planToJourneyVM(input: {
  plan: Plan | null
  constraints: Constraints
  agentSummary: string | null
  isPlanning: boolean
  isExecuting: boolean
  isRecalculating: boolean
  inviteLoading: boolean
  lockedCount: number
  bookableCount: number
  readyToBook: boolean
  consensusSummary: string | null
  focusNodeIndex: number
}): JourneyViewModel | null {
  const { plan, constraints } = input
  if (!plan) return null

  const phases = buildPhases(plan, input.focusNodeIndex, input.isExecuting)
  const currentPhase = buildCurrentPhase(plan, phases, input.focusNodeIndex)
  const { completed, running, pendingHint } = buildExecutionTasks(
    plan,
    input.isPlanning,
    input.isExecuting,
    input.isRecalculating,
    input.inviteLoading,
    input.lockedCount,
    input.bookableCount,
    input.readyToBook,
  )

  const first = plan.nodes.find((n) => !n.fixed)
  const last = [...plan.nodes].reverse().find((n) => !n.fixed)
  const totalDurationLabel =
    first && last
      ? `${formatTime(first.startTime)} – ${formatTime(last.endTime)}`
      : `约 ${constraints.timeWindow || 5} 小时`

  return {
    title: input.isPlanning ? '正在生成下午计划…' : '下午计划已生成',
    constraintTags: buildConstraintTags(constraints),
    weatherNote: '16:00 后有小雨 · 已切换室内路线',
    agentSummary: input.agentSummary,
    phases,
    currentPhase,
    completedTasks: completed,
    runningTasks: running,
    pendingAuthHint: pendingHint,
    collaborators: buildCollaborators(input.consensusSummary),
    focusNodeIndex: input.focusNodeIndex,
    totalDurationLabel,
  }
}
