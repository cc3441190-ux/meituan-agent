import type { Deliverable } from '../../../agent/deliverables'
import type { Plan } from '../../../agent/types'
import type { BookingResult, IBookingService } from '../../ports'
import { postJson } from './httpClient'

/**
 * 美团预订 / 跑腿 / 打车等真实 API 接入占位。
 * 替换 MockBookingService 后，dispatchDeliverable 走统一编排出口。
 */
export class HttpBookingService implements IBookingService {
  readonly mode = 'live' as const

  async book(
    poiId: string,
    timeSlot?: Date,
    meta?: Record<string, unknown>,
  ): Promise<BookingResult> {
    return postJson<BookingResult>('/booking/book', {
      poiId,
      timeSlot: timeSlot?.toISOString(),
      meta: meta ?? {},
    })
  }

  async cancel(orderId: string): Promise<{ ok: boolean }> {
    return postJson<{ ok: boolean }>('/booking/cancel', { orderId })
  }

  async executeAll(plan: Plan): Promise<BookingResult[]> {
    const results: BookingResult[] = []
    for (const node of plan.nodes) {
      if (node.fixed || node.status !== 'confirmed' || !node.poi) continue
      results.push(await this.book(node.poi.id, node.startTime))
    }
    return results
  }

  async dispatchDeliverable(d: Deliverable): Promise<BookingResult> {
    return postJson<BookingResult>('/booking/deliverable', {
      deliverable: {
        ...d,
        scheduledAt: d.scheduledAt?.toISOString(),
      },
    })
  }
}
