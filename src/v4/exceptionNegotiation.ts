import type { Deliverable } from '../agent/deliverables'
import type { PlanNode } from '../agent/types'
import type { NegotiationItemVM } from './types'

export type ExceptionKind = 'inventory' | 'ticket' | 'schedule' | 'delivery' | 'delay' | 'weather'

export interface ExceptionAlertVM {
  id: string
  kind: ExceptionKind
  title: string
  message: string
  impacts: string[]
  actions: { id: string; label: string; variant: 'primary' | 'secondary' | 'ghost' }[]
  nodeIndex?: number
  deliverableId?: string
}

function isSeatConflict(node: PlanNode): boolean {
  return (
    node.conflict === 'no_seat' ||
    (node.category === 'dining' && node.inventory?.available === false)
  )
}

function isTicketConflict(node: PlanNode): boolean {
  return node.conflict === 'no_ticket'
}

/** 满座 / 餐厅无位：确认前不静默替换 */
export function buildSeatException(
  nodeIndex: number,
  node: PlanNode,
  alternativeName?: string,
): ExceptionAlertVM | null {
  const unavailable =
    node.status === 'error' || isSeatConflict(node) || node.inventory?.available === false
  if (!unavailable || node.fixed || isTicketConflict(node)) return null

  const poiName = node.poi?.name ?? node.name
  const alt = alternativeName ?? '同级备选餐厅'
  const queue = node.inventory?.queue ?? 0

  return {
    id: `seat-${nodeIndex}`,
    kind: 'inventory',
    title: `${poiName} 当前订不到`,
    message: node.inventory?.reason ?? '该时段已满或暂停接单',
    impacts: [
      alternativeName ? `备选：${alt}` : '可换一家同级店',
      queue > 0 ? `也可选择等位约 ${queue} 桌` : '可改时段再试',
      '不会在你不知情时自动替换',
    ],
    actions: [
      { id: 'use-alt', label: `换到 ${alt}`, variant: 'primary' },
      { id: 'wait', label: queue > 0 ? '我愿意等' : '改时间再订', variant: 'secondary' },
      { id: 'dismiss', label: '稍后处理', variant: 'ghost' },
    ],
    nodeIndex,
  }
}

/** 无票 / 场次已满 */
export function buildTicketException(
  nodeIndex: number,
  node: PlanNode,
  alternativeName?: string,
): ExceptionAlertVM | null {
  if (!isTicketConflict(node) || node.fixed) return null
  if (node.status !== 'error' && node.inventory?.available !== false) return null

  const poiName = node.poi?.name ?? node.name
  const alt = alternativeName ?? '同片区备选景点'

  return {
    id: `ticket-${nodeIndex}`,
    kind: 'ticket',
    title: `${poiName} 当前无票`,
    message: node.inventory?.reason ?? '该时段门票已售罄或场次已满',
    impacts: [
      alternativeName ? `备选：${alt}` : '可换同类型景点/乐园',
      '可改时段再查余票',
      '不会在你不知情时自动替换',
    ],
    actions: [
      { id: 'use-alt', label: `换到 ${alt}`, variant: 'primary' },
      { id: 'wait', label: '改时段再订', variant: 'secondary' },
      { id: 'dismiss', label: '稍后处理', variant: 'ghost' },
    ],
    nodeIndex,
  }
}

/** 库存/门票统一入口（兼容旧调用） */
export function buildInventoryException(
  nodeIndex: number,
  node: PlanNode,
  alternativeName?: string,
): ExceptionAlertVM | null {
  return (
    buildTicketException(nodeIndex, node, alternativeName) ??
    buildSeatException(nodeIndex, node, alternativeName)
  )
}

/** 站间行程冲突（time_short） */
export function buildScheduleConflictException(
  nodeIndex: number,
  node: PlanNode,
  prevName?: string,
): ExceptionAlertVM | null {
  if (node.conflict !== 'time_short' || node.fixed) return null

  const poiName = node.poi?.name ?? node.name
  const delay = Math.ceil(node.suggestedDelay ?? 15)
  const fromLabel = prevName ?? '上一站'

  return {
    id: `schedule-${nodeIndex}`,
    kind: 'schedule',
    title: '行程冲突 · 时间不够衔接',
    message: `从「${fromLabel}」到「${poiName}」路程比空档多约 ${delay} 分钟`,
    impacts: [
      `建议顺延本站约 ${delay} 分钟`,
      '或缩短上一站停留',
      '可代叫车缩短路程',
    ],
    actions: [
      { id: 'replan-time', label: `顺延 ${delay} 分钟`, variant: 'primary' },
      { id: 'call-car', label: '代叫车', variant: 'secondary' },
      { id: 'dismiss', label: '稍后处理', variant: 'ghost' },
    ],
    nodeIndex,
  }
}

export function buildDeliveryException(d: Deliverable): ExceptionAlertVM | null {
  if (d.status !== 'fallback_proposed' || !d.fallback) return null
  return {
    id: `delivery-${d.id}`,
    kind: 'delivery',
    title: '代办需你确认',
    message: d.failureReason ?? `${d.title} 暂时无法完成`,
    impacts: [
      `替代：${d.fallback.title}`,
      d.fallback.estimatedPrice != null ? `约 ¥${d.fallback.estimatedPrice}` : '同价位替代',
      '不影响其余已授权事项',
    ],
    actions: [
      { id: 'accept', label: '接受替代', variant: 'primary' },
      { id: 'tracker', label: '查看进度', variant: 'secondary' },
      { id: 'skip', label: '跳过此项', variant: 'ghost' },
    ],
    deliverableId: d.id,
  }
}

/** 行程中堵车等（演示用主动提醒） */
export function buildDelayException(
  fromName: string,
  toName: string,
  delayMinutes: number,
): ExceptionAlertVM {
  return {
    id: `delay-${Date.now()}`,
    kind: 'delay',
    title: '路上比预计慢',
    message: `前往「${toName}」可能晚 ${delayMinutes} 分钟`,
    impacts: [`从「${fromName}」出发`, '可为你重排后续站点时间', '可代叫车缩短路程'],
    actions: [
      { id: 'replan-time', label: '自动顺延后续', variant: 'primary' },
      { id: 'call-car', label: '代叫车', variant: 'secondary' },
      { id: 'dismiss', label: '我知道了', variant: 'ghost' },
    ],
  }
}

export function buildWeatherException(): ExceptionAlertVM {
  return {
    id: 'weather-hint',
    kind: 'weather',
    title: '下午可能有阵雨',
    message: '户外段已备室内备选，出发前会再复核一次',
    impacts: ['乐园→室内项目可切换', '步行段可改打车'],
    actions: [
      { id: 'view-indoor', label: '看室内备选', variant: 'secondary' },
      { id: 'dismiss', label: '知道了', variant: 'ghost' },
    ],
  }
}

export function deliveryExceptionToNegotiation(alert: ExceptionAlertVM): NegotiationItemVM {
  return {
    id: alert.id,
    personName: '交付异常',
    avatar: '⚠️',
    request: alert.message,
    resolution: alert.impacts[0] ?? '需你确认',
    impacts: alert.impacts.slice(1),
    actions: alert.actions.map((a) => ({
      id: a.id,
      label: a.label,
      variant: a.variant,
    })),
  }
}
