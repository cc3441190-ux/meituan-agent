import { formatTime } from './constants'
import type { Plan, PlanNode, Route } from './types'

/** 站间默认路程（无 POI 坐标时） */
const DEFAULT_TRANSIT_MIN = 12
/** 每站留给用户整理/调整的缓冲 */
const USER_BUFFER_MIN = 10
/** 活动时段对外展示的弹性（±分钟） */
export const ACTIVITY_FLEX_MIN = 15

type RouteResolver = (from: [number, number], to: [number, number]) => Route

function estimateWaitMinutes(node: PlanNode): number {
  if (node.fixed || node.duration <= 0) return 0
  const q = node.inventory?.queue ?? 0
  if (node.category === 'dining') {
    if (!node.inventory?.available) return 0
    if (q > 0) return Math.min(40, 8 + q * 8)
    return 5
  }
  if (node.category === 'entertainment' || node.type === 'indoor_play' || node.type === 'park') {
    return q > 0 ? Math.min(25, q * 6) : 3
  }
  return 0
}

function resolveTransitMinutes(
  prev: PlanNode,
  curr: PlanNode,
  getRoute?: RouteResolver,
): number {
  if (curr.transit?.duration != null) return curr.transit.duration
  if (prev.poi && curr.poi && getRoute) {
    const route = getRoute(prev.poi.location, curr.poi.location)
    curr.transit = route
    return route.duration
  }
  return DEFAULT_TRANSIT_MIN
}

/**
 * 重算整段行程时间轴：
 * 上一站结束 → 路程 → 等位 → 用户缓冲 → 本站活动开始 → 活动时长 → 本站结束
 */
export function schedulePlanTimeline(plan: Plan, getRoute?: RouteResolver): void {
  if (plan.nodes.length === 0) return

  let cursor = new Date(plan.startTime)

  for (let i = 0; i < plan.nodes.length; i++) {
    const node = plan.nodes[i]

    if (i === 0) {
      node.startTime = new Date(cursor)
      node.endTime = new Date(cursor)
      node.transitMinutes = 0
      node.waitMinutes = 0
      node.bufferMinutes = 0
      node.flexMinutes = 0
      node.earliestStart = new Date(cursor)
      node.latestEnd = new Date(cursor)
      continue
    }

    const prev = plan.nodes[i - 1]
    const transitMin = resolveTransitMinutes(prev, node, getRoute)
    const waitMin = estimateWaitMinutes(node)
    const bufferMin = node.fixed ? 0 : USER_BUFFER_MIN

    node.transitMinutes = transitMin
    node.waitMinutes = waitMin
    node.bufferMinutes = bufferMin

    const departPrev = prev.endTime ?? cursor
    const arriveVenue = new Date(departPrev.getTime() + transitMin * 60000)
    const activityStart = new Date(
      arriveVenue.getTime() + (waitMin + bufferMin) * 60000,
    )
    const activityEnd = new Date(activityStart.getTime() + node.duration * 60000)

    node.startTime = activityStart
    node.endTime = activityEnd
    node.flexMinutes = node.fixed ? 0 : ACTIVITY_FLEX_MIN
    node.earliestStart = new Date(
      activityStart.getTime() - ACTIVITY_FLEX_MIN * 60000,
    )
    node.latestEnd = new Date(activityEnd.getTime() + ACTIVITY_FLEX_MIN * 60000)

    cursor = activityEnd
  }
}

export function formatNodeTimeRange(node: PlanNode): string {
  if (!node.startTime || !node.endTime) return '--:-- – --:--'
  if (node.fixed) return formatTime(node.startTime)

  const flex = node.flexMinutes ?? ACTIVITY_FLEX_MIN
  if (flex > 0 && node.earliestStart && node.latestEnd) {
    return `${formatTime(node.earliestStart)} – ${formatTime(node.latestEnd)}（建议 ${formatTime(node.startTime)}–${formatTime(node.endTime)}）`
  }
  return `${formatTime(node.startTime)} – ${formatTime(node.endTime)}`
}

export function formatNodeScheduleDetail(node: PlanNode): string | null {
  if (node.fixed) return null
  const parts: string[] = []
  if (node.transitMinutes && node.transitMinutes > 0) {
    parts.push(`路程约 ${node.transitMinutes} 分`)
  }
  if (node.waitMinutes && node.waitMinutes > 0) {
    parts.push(`等位约 ${node.waitMinutes} 分`)
  }
  if (node.bufferMinutes && node.bufferMinutes > 0) {
    parts.push(`预留调整 ${node.bufferMinutes} 分`)
  }
  if (node.flexMinutes && node.flexMinutes > 0) {
    parts.push(`时段可浮动 ±${node.flexMinutes} 分`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

export function getPlanTimeSpan(plan: Plan): string {
  const first = plan.nodes[0]?.startTime ?? plan.startTime
  const last = plan.nodes[plan.nodes.length - 1]?.latestEnd ?? plan.nodes[plan.nodes.length - 1]?.endTime
  if (!first || !last) return ''
  return `${formatTime(first)} – ${formatTime(last)}`
}

export function getPlanEndTime(plan: Plan): Date | null {
  const last = plan.nodes[plan.nodes.length - 1]
  return last?.latestEnd ?? last?.endTime ?? null
}

export function getPlanDurationMinutes(plan: Plan): number {
  const end = getPlanEndTime(plan)
  if (!end) return 0
  return (end.getTime() - plan.startTime.getTime()) / 60000
}

/**
 * 确保整段行程不超出用户时间窗：先压缩可调整站点时长，仍超出则标注 time_exceeded。
 */
export function enforceTimeWindow(
  plan: Plan,
  timeWindowHours: number,
  getRoute?: RouteResolver,
): { adjusted: boolean; overflowMinutes: number } {
  const limitMin = timeWindowHours * 60
  let duration = getPlanDurationMinutes(plan)
  plan.timeWindowOverflowMinutes = undefined

  if (duration <= limitMin) {
    return { adjusted: false, overflowMinutes: 0 }
  }

  const flexible = plan.nodes.filter(
    (n) =>
      !n.fixed &&
      n.type !== 'rest' &&
      n.category !== 'rest' &&
      n.duration > 30,
  )

  let overflow = duration - limitMin
  let rounds = 0
  while (overflow > 0 && flexible.some((n) => n.duration > 30) && rounds < 8) {
    rounds++
    for (const node of flexible) {
      if (overflow <= 0) break
      const shrink = Math.min(15, node.duration - 30, Math.ceil(overflow / flexible.length))
      if (shrink > 0) {
        node.duration -= shrink
        overflow -= shrink
      }
    }
    schedulePlanTimeline(plan, getRoute)
    duration = getPlanDurationMinutes(plan)
    overflow = duration - limitMin
  }

  if (duration > limitMin) {
    plan.timeWindowOverflowMinutes = Math.round(duration - limitMin)
    for (let i = plan.nodes.length - 2; i >= 0; i--) {
      const node = plan.nodes[i]
      if (node.fixed || node.type === 'rest') continue
      if (node.status !== 'confirmed') node.status = 'warning'
      if (!node.conflict) node.conflict = 'time_exceeded'
      break
    }
  }

  return { adjusted: true, overflowMinutes: Math.max(0, Math.round(duration - limitMin)) }
}
