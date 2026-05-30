import type { Deliverable } from '../agent/deliverables'
import type { NegotiationItemVM } from './types'

/** 交付失败时注入「方案协商」区的 AI 协商卡片 */
export function buildDeliveryFallbackNegotiation(d: Deliverable): NegotiationItemVM | null {
  if (d.status !== 'fallback_proposed' || !d.fallback) return null

  const fb = d.fallback
  return {
    id: `delivery-fallback-${d.id}`,
    personName: '配送异常',
    avatar: '⚠️',
    request: d.failureReason ?? '该项暂时无法完成',
    resolution: `AI 已找到替代：${fb.title}${fb.estimatedPrice != null ? ` · ¥${fb.estimatedPrice}` : ''}`,
    impacts: ['同价位替代', '约 25 分钟送达', '不影响后续行程'],
    actions: [
      { id: 'accept', label: '接受替代', variant: 'primary' },
      { id: 'tracker', label: '查看交付单', variant: 'secondary' },
      { id: 'skip', label: '跳过此项', variant: 'ghost' },
    ],
  }
}

export function parseDeliveryFallbackId(itemId: string): string | null {
  if (!itemId.startsWith('delivery-fallback-')) return null
  return itemId.slice('delivery-fallback-'.length)
}
