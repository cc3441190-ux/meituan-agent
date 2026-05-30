export type PlanItemType = 'park' | 'food' | 'activity' | 'shopping'

export interface Position {
  x: number
  y: number
}

/** AI 返回的完整行程节点 */
export interface PlannedStep {
  id: number
  type: PlanItemType
  name: string
  icon: string
  time: string
  position: Position
}

/** @deprecated 使用 PlannedStep */
export type PlanItem = PlannedStep

export const CATEGORY_ICONS: Record<PlanItemType, string> = {
  park: '🎢',
  food: '🍜',
  activity: '🎡',
  shopping: '🛍️',
}
