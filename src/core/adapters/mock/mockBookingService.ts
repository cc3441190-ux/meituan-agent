import { MockAPI } from '../../../agent/mockApi'
import type { Deliverable } from '../../../agent/deliverables'
import type { Plan } from '../../../agent/types'
import type { BookingResult, IBookingService } from '../../ports'

/** Mock 预订 —— 替换为 HttpBookingService */
export class MockBookingService implements IBookingService {
  readonly mode = 'mock' as const

  async book(poiId: string, timeSlot?: Date) {
    const res = await MockAPI.bookPOI(poiId, timeSlot)
    return {
      success: res.success,
      orderId: res.orderId,
      message: res.message,
    } satisfies BookingResult
  }

  async cancel(orderId: string) {
    await delay(200)
    return { ok: true, orderId } as { ok: boolean; orderId?: string }
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
    const res = await MockAPI.bookDeliverable(d)
    return {
      success: res.success,
      orderId: res.orderId,
      message: res.message,
      eta: res.eta,
      fallback: res.fallback,
    }
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
