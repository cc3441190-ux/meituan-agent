import { schedulePlanTimeline } from './timeline'
import type { Plan, Route } from './types'
import { clonePlanShallow } from '../v3/planMutations'

type RouteResolver = (from: [number, number], to: [number, number]) => Route

function parseHHMM(timeHHMM: string, ref: Date): Date {
  const [h, m] = timeHHMM.split(':').map((s) => parseInt(s, 10))
  const d = new Date(ref)
  d.setHours(Number.isNaN(h) ? 14 : h, Number.isNaN(m) ? 0 : m, 0, 0)
  return d
}

/** 修改某站停留时长（分钟），并顺延重算后续站点 */
export function setNodeDuration(
  plan: Plan,
  nodeIndex: number,
  durationMinutes: number,
  getRoute?: RouteResolver,
): Plan {
  const next = clonePlanShallow(plan)
  const node = next.nodes[nodeIndex]
  if (!node || node.fixed) return next

  node.duration = Math.max(15, Math.min(300, Math.round(durationMinutes)))
  schedulePlanTimeline(next, getRoute)
  return next
}

/** 修改某站建议到达时间（HH:mm）；上一站为起点时改 plan.startTime，否则改上一站停留 */
export function setNodeArrivalTime(
  plan: Plan,
  nodeIndex: number,
  timeHHMM: string,
  getRoute?: RouteResolver,
): Plan {
  const next = clonePlanShallow(plan)
  const node = next.nodes[nodeIndex]
  if (!node || node.fixed) return next

  schedulePlanTimeline(next, getRoute)

  const targetStart = parseHHMM(timeHHMM, node.startTime ?? next.startTime)

  if (nodeIndex === 0) {
    next.startTime = new Date(targetStart)
    schedulePlanTimeline(next, getRoute)
    return next
  }

  const prev = next.nodes[nodeIndex - 1]
  if (!prev) return next

  const transit = node.transitMinutes ?? 12
  const wait = node.waitMinutes ?? 0
  const buffer = node.bufferMinutes ?? 10
  const leadMs = (transit + wait + buffer) * 60000

  if (prev.fixed) {
    next.startTime = new Date(targetStart.getTime() - leadMs)
    schedulePlanTimeline(next, getRoute)
    return next
  }

  if (!prev.startTime) return next

  const neededPrevEnd = targetStart.getTime() - leadMs
  const neededDuration = (neededPrevEnd - prev.startTime.getTime()) / 60000
  prev.duration = Math.max(15, Math.round(neededDuration))

  schedulePlanTimeline(next, getRoute)
  return next
}

/** 同时应用停留时长与到达时间 */
export function applyNodeTimePatch(
  plan: Plan,
  nodeIndex: number,
  patch: { durationMinutes: number; arrivalTime: string },
  getRoute?: RouteResolver,
): Plan {
  let next = setNodeDuration(plan, nodeIndex, patch.durationMinutes, getRoute)
  next = setNodeArrivalTime(next, nodeIndex, patch.arrivalTime, getRoute)
  return next
}

/** 将某站整体顺延/提前若干分钟 */
export function nudgeNodeArrival(
  plan: Plan,
  nodeIndex: number,
  deltaMinutes: number,
  getRoute?: RouteResolver,
): Plan {
  const next = clonePlanShallow(plan)
  const node = next.nodes[nodeIndex]
  if (!node || node.fixed) return next

  if (nodeIndex === 0) {
    next.startTime = new Date(next.startTime.getTime() + deltaMinutes * 60000)
    schedulePlanTimeline(next, getRoute)
    return next
  }

  const prev = next.nodes[nodeIndex - 1]
  if (!prev) return next

  if (prev.fixed) {
    next.startTime = new Date(next.startTime.getTime() + deltaMinutes * 60000)
  } else {
    prev.duration = Math.max(15, prev.duration + deltaMinutes)
  }

  schedulePlanTimeline(next, getRoute)
  return next
}
