import type { PlanNode } from './types'

const TICKET_TYPES = new Set([
  'park',
  'indoor_play',
  'exhibition',
  'arcade',
  'garden',
])

/** 餐饮订位库存 */
export function requiresSeatCheck(node: PlanNode): boolean {
  return node.category === 'dining'
}

/** 玩乐/展览等需购票入场 */
export function requiresTicketCheck(node: PlanNode): boolean {
  if (node.fixed || node.type === 'rest' || node.category === 'rest') return false
  if (node.category === 'entertainment') return true
  return TICKET_TYPES.has(node.type)
}

export function availabilityConflictType(node: PlanNode): 'no_seat' | 'no_ticket' {
  return requiresSeatCheck(node) ? 'no_seat' : 'no_ticket'
}
