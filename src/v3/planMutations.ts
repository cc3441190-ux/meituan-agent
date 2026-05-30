import { formatTime } from '../agent/constants'
import { schedulePlanTimeline } from '../agent/timeline'
import type { Plan, PlanNode, Route } from '../agent/types'
import type { InsertSuggestion, MapInterestPoi } from './types'

export function clonePlanShallow(plan: Plan): Plan {
  return {
    ...plan,
    startTime: new Date(plan.startTime),
    nodes: plan.nodes.map((n) => ({
      ...n,
      startTime: n.startTime ? new Date(n.startTime) : undefined,
      endTime: n.endTime ? new Date(n.endTime) : undefined,
      earliestStart: n.earliestStart ? new Date(n.earliestStart) : undefined,
      latestEnd: n.latestEnd ? new Date(n.latestEnd) : undefined,
      poi: n.poi ? { ...n.poi, location: [...n.poi.location] as [number, number] } : undefined,
      inventory: n.inventory ? { ...n.inventory } : undefined,
      transit: n.transit ? { ...n.transit } : undefined,
    })),
  }
}

/** 交换两个可编辑站点顺序并粗略重算时间 */
export function reorderPlanNodes(plan: Plan, fromIdx: number, toIdx: number): Plan {
  const next = clonePlanShallow(plan)
  const nodes = next.nodes
  if (
    fromIdx === toIdx ||
    fromIdx <= 0 ||
    toIdx <= 0 ||
    fromIdx >= nodes.length - 1 ||
    toIdx >= nodes.length - 1 ||
    nodes[fromIdx].fixed ||
    nodes[toIdx].fixed
  ) {
    return next
  }

  const [moved] = nodes.splice(fromIdx, 1)
  nodes.splice(toIdx, 0, moved)
  recalcSchedule(next)
  return next
}

function recalcSchedule(plan: Plan) {
  schedulePlanTimeline(plan)
}

const INTEREST_CATEGORY_TO_TYPE: Record<string, string> = {
  cultural: 'exhibition',
  dining: 'cafe',
  night: 'night_market',
  entertainment: 'indoor_play',
  outdoor: 'garden',
}

export function createNodeFromInterest(interest: MapInterestPoi): PlanNode {
  const type = INTEREST_CATEGORY_TO_TYPE[interest.category] ?? 'exhibition'
  return {
    type,
    name: interest.name,
    sceneLabel: interest.sceneLabel,
    category: interest.category,
    duration: 40,
    status: 'active',
  }
}

/** 在 afterIndex 与 afterIndex+1 之间插入一站，并重算时间与路程 */
export function insertNodeAfterIndex(
  plan: Plan,
  afterIndex: number,
  node: PlanNode,
  getRoute: (from: [number, number], to: [number, number]) => Route,
): Plan {
  const next = clonePlanShallow(plan)
  if (afterIndex < 0 || afterIndex >= next.nodes.length - 1) return next

  next.nodes.splice(afterIndex + 1, 0, node)
  recalcScheduleWithTransit(next, getRoute, Math.max(1, afterIndex))
  return next
}

function recalcScheduleWithTransit(
  plan: Plan,
  getRoute: (from: [number, number], to: [number, number]) => Route,
  _startIdx = 1,
) {
  void _startIdx
  schedulePlanTimeline(plan, getRoute)
}

export function buildInsertSuggestion(
  _poiName: string,
  ctx: { afterNodeIndex: number; afterLabel: string; beforeLabel: string },
) {
  return {
    addMinutes: 40,
    walkMinutes: 8,
    afterNodeIndex: ctx.afterNodeIndex,
    insertBetween: `${ctx.afterLabel} → ${ctx.beforeLabel}`,
    dinnerDelay: '18:20',
    warning: '可能超出总时长约 20 分钟',
  }
}

export function buildReorderFeedback(before: Plan, after: Plan): string {
  const diningBefore = before.nodes.find((n) => n.category === 'dining')
  const diningAfter = after.nodes.find((n) => n.category === 'dining')

  if (diningBefore?.endTime && diningAfter?.endTime) {
    const deltaMin = Math.round(
      (diningAfter.endTime.getTime() - diningBefore.endTime.getTime()) / 60000,
    )
    if (deltaMin !== 0) {
      const delayPart = `晚餐${deltaMin > 0 ? '延后' : '提前'} ${Math.abs(deltaMin)} 分钟`
      return `${delayPart} · 步行 +8 分钟 · 仍在总时长内`
    }
  }

  const lastBefore = [...before.nodes].reverse().find((n) => !n.fixed && n.endTime)
  const lastAfter = [...after.nodes].reverse().find((n) => !n.fixed && n.endTime)
  if (lastBefore?.endTime && lastAfter?.endTime) {
    const endBefore = formatTime(lastBefore.endTime)
    const endAfter = formatTime(lastAfter.endTime)
    if (endBefore !== endAfter) {
      return `末站 ${endBefore} → ${endAfter} · 步行 +8 分钟 · 仍在总时长内`
    }
  }

  return '动线已更新 · 时间与排队已同步'
}

export function buildInsertFeedback(suggestion: InsertSuggestion): string {
  const parts = [`+${suggestion.addMinutes} 分钟`, `步行 +${suggestion.walkMinutes} 分钟`]
  if (suggestion.dinnerDelay) {
    parts.push(`晚餐建议 ${suggestion.dinnerDelay}`)
  }
  if (suggestion.warning) {
    parts.push(suggestion.warning.replace('可能', ''))
  }
  return parts.join(' · ')
}
