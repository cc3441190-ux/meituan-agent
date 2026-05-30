import { normalizeInventory, normalizePoi } from '../../../agent/poiNormalize'
import type { Constraints, Inventory, POI, Route } from '../../../agent/types'
import type { IPOIService } from '../../ports'
import { fallbackCheckInventory, fallbackCheckTicketAvailability, fallbackSearchPOI } from '../fallback/poiFallback'
import { postJson } from './httpClient'

export class HttpPOIService implements IPOIService {
  readonly mode = 'live' as const

  async searchPOI(type: string, constraints: Constraints): Promise<POI> {
    try {
      const raw = await postJson<Partial<POI>>('/poi/search', { type, constraints })
      return normalizePoi(raw, type, constraints._nodeName)
    } catch (err) {
      console.warn('[HttpPOIService] searchPOI 降级 Mock:', err)
      return fallbackSearchPOI(type, constraints)
    }
  }

  async checkInventory(poiId: string, timeSlot?: Date): Promise<Inventory> {
    try {
      const raw = await postJson<Inventory>('/poi/inventory', {
        poiId,
        timeSlot: timeSlot?.toISOString(),
      })
      return normalizeInventory(raw)
    } catch (err) {
      console.warn('[HttpPOIService] checkInventory 降级 Mock:', err)
      return fallbackCheckInventory(poiId, timeSlot)
    }
  }

  async checkTicketAvailability(poiId: string, timeSlot?: Date): Promise<Inventory> {
    try {
      const raw = await postJson<Inventory>('/poi/ticket-inventory', {
        poiId,
        timeSlot: timeSlot?.toISOString(),
      })
      return normalizeInventory(raw)
    } catch (err) {
      console.warn('[HttpPOIService] checkTicketAvailability 降级 Mock:', err)
      return fallbackCheckTicketAvailability(poiId, timeSlot)
    }
  }

  async getRoute(
    from: [number, number],
    to: [number, number],
    mode?: 'drive' | 'walk' | 'subway',
  ): Promise<Route> {
    void mode
    const dx = from[0] - to[0]
    const dy = from[1] - to[1]
    const distKm = Math.sqrt(dx * dx + dy * dy) * 100
    const duration = Math.max(8, Math.ceil((distKm / 30) * 60))
    return Promise.resolve({ distance: distKm.toFixed(1), duration, mode: 'drive' })
  }
}
