import type { Inventory, Plan, PlanNode } from './types'
import { availabilityConflictType, requiresSeatCheck, requiresTicketCheck } from './nodeAvailability'

/** 根据库存校验结果同步节点状态（换店后必须清掉旧的 no_seat 标记） */
export function syncNodeFromInventoryCheck(
  node: PlanNode,
  inv: Inventory,
  options?: { suggestedAlternative?: string },
) {
  syncNodeFromAvailabilityCheck(node, inv, {
    ...options,
    conflictType: 'no_seat',
  })
}

/** 根据门票库存同步节点状态 */
export function syncNodeFromTicketCheck(
  node: PlanNode,
  inv: Inventory,
  options?: { suggestedAlternative?: string },
) {
  syncNodeFromAvailabilityCheck(node, inv, {
    ...options,
    conflictType: 'no_ticket',
  })
}

export function syncNodeFromAvailabilityCheck(
  node: PlanNode,
  inv: Inventory,
  options?: { suggestedAlternative?: string; conflictType?: 'no_seat' | 'no_ticket' },
) {
  const conflictType = options?.conflictType ?? availabilityConflictType(node)
  node.inventory = inv
  if (inv.available) {
    node.status = 'active'
    delete node.conflict
    node.inventoryResolved = false
    delete node.suggestedAlternative
    return
  }
  node.status = 'error'
  node.conflict = conflictType
  node.inventoryResolved = false
  if (options?.suggestedAlternative) {
    node.suggestedAlternative = options.suggestedAlternative
  }
}

/** 节点是否存在未处理的库存/门票异常 */
export function hasUnresolvedAvailability(node: PlanNode): boolean {
  if (node.fixed || node.inventoryResolved) return false
  return (
    node.conflict === 'no_seat' ||
    node.conflict === 'no_ticket' ||
    node.status === 'error' ||
    node.inventory?.available === false
  )
}

export async function refreshNodeAvailability(
  node: PlanNode,
  poi: { checkInventory: (id: string, t?: Date) => Promise<Inventory>; checkTicketAvailability: (id: string, t?: Date) => Promise<Inventory> },
  options?: { suggestedAlternative?: string },
): Promise<void> {
  if (!node.poi || node.fixed) return
  if (requiresSeatCheck(node)) {
    const inv = await poi.checkInventory(node.poi.id, node.startTime)
    syncNodeFromInventoryCheck(node, inv, options)
  } else if (requiresTicketCheck(node)) {
    const inv = await poi.checkTicketAvailability(node.poi.id, node.startTime)
    syncNodeFromTicketCheck(node, inv, options)
  }
}

/** 是否是不需要用户确认的辅助节点（休息缓冲等） */
function isAuxNode(n: { type?: string; category?: string }) {
  return n.type === 'rest' || n.category === 'rest'
}

/** 非固定、非辅助、未确认的站点 */
export function getPendingNodes(plan: Plan) {
  return plan.nodes.filter((n) => !n.fixed && !isAuxNode(n) && n.status !== 'confirmed')
}

export function getPendingCount(plan: Plan) {
  return getPendingNodes(plan).length
}

/** 需要用户确认的非固定、非辅助站 */
export function getBookableStops(plan: Plan) {
  return plan.nodes.filter((n) => !n.fixed && !isAuxNode(n))
}

export function getLockedCount(plan: Plan) {
  return getBookableStops(plan).filter((n) => n.status === 'confirmed').length
}

export function getBookableCount(plan: Plan) {
  return getBookableStops(plan).length
}

/** 存在待确认或异常节点时，禁止一键预订 */
export function canExecuteBookings(plan: Plan) {
  if (getPendingCount(plan) > 0) return false
  return plan.nodes.some((n) => !n.fixed && !isAuxNode(n) && n.status === 'confirmed' && n.poi)
}

/** Mock 预估下单金额（演示用） */
export function estimateBookingTotal(plan: Plan): number {
  const stops = getBookableStops(plan).filter((n) => n.status === 'confirmed')
  if (stops.length === 0) return 0
  const sum = stops.reduce((acc, n) => {
    if (n.category === 'dining') return acc + 128
    if (n.category === 'entertainment' || n.category === 'outdoor') return acc + 198
    return acc + 88
  }, 0)
  return sum || 350
}

export function findNextPendingIndex(plan: Plan, afterIndex = -1): number {
  for (let i = 0; i < plan.nodes.length; i++) {
    if (i <= afterIndex) continue
    const n = plan.nodes[i]
    if (!n.fixed && !isAuxNode(n) && n.status !== 'confirmed') return i
  }
  return plan.nodes.findIndex((n) => !n.fixed && !isAuxNode(n) && n.status !== 'confirmed')
}
