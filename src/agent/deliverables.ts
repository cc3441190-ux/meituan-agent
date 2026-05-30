export type DeliverableKind =
  | 'booking'
  | 'addon-cake'
  | 'addon-flower'
  | 'addon-gift'
  | 'logistics-ride'
  | 'logistics-parking'
  | 'ticket'
  | 'service-note'

export type DeliverableStatus =
  | 'idle'
  | 'queued'
  | 'dispatching'
  | 'in_progress'
  | 'awaiting_confirm'
  | 'done'
  | 'failed'
  | 'fallback_proposed'

export interface Deliverable {
  id: string
  kind: DeliverableKind
  title: string
  detail: string
  rationale: string
  nodeIndex?: number
  scheduledAt?: Date
  dependsOn?: string[]
  estimatedPrice?: number
  recommendedByAI: boolean
  selected: boolean
  status: DeliverableStatus
  progress?: number
  orderId?: string
  failureReason?: string
  fallback?: Deliverable
  /** 完成后可撤销截止时间（ms timestamp） */
  cancellableUntil?: number
}

export const DELIVERABLE_CANCEL_WINDOW_MS = 5 * 60 * 1000

export interface DeliveryGroup {
  nodeIndex: number | null
  groupTitle: string
  items: Deliverable[]
}

export function cloneDeliverable(d: Deliverable): Deliverable {
  return {
    ...d,
    scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : undefined,
    fallback: d.fallback ? cloneDeliverable(d.fallback) : undefined,
  }
}

export function cloneDeliverables(list: Deliverable[]): Deliverable[] {
  return list.map(cloneDeliverable)
}

export function estimateDeliverablesTotal(items: Deliverable[]): number {
  return items
    .filter((d) => d.selected)
    .reduce((sum, d) => sum + (d.estimatedPrice ?? 0), 0)
}

export function groupDeliverables(
  items: Deliverable[],
  planNodeNames: Map<number, string>,
): DeliveryGroup[] {
  const groups = new Map<number | null, Deliverable[]>()

  for (const d of items) {
    const key = d.nodeIndex ?? null
    const list = groups.get(key) ?? []
    list.push(d)
    groups.set(key, list)
  }

  const result: DeliveryGroup[] = []
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === null) return 1
    if (b === null) return -1
    return a - b
  })

  for (const key of sortedKeys) {
    const groupItems = groups.get(key) ?? []
    result.push({
      nodeIndex: key,
      groupTitle:
        key === null
          ? '行程服务'
          : (planNodeNames.get(key) ?? `站点 ${key}`),
      items: groupItems,
    })
  }

  return result
}

export function deliverableKindIcon(kind: DeliverableKind): string {
  switch (kind) {
    case 'booking':
      return '📍'
    case 'addon-cake':
      return '🎂'
    case 'addon-flower':
      return '💐'
    case 'addon-gift':
      return '🎁'
    case 'logistics-ride':
      return '🚗'
    case 'logistics-parking':
      return '🅿️'
    case 'ticket':
      return '🎫'
    case 'service-note':
      return '📝'
    default:
      return '✓'
  }
}
