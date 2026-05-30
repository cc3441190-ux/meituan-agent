import type { Constraints, Route } from '../../../agent/types'
import type { IPOIService } from '../../ports'
import { MockAPI } from '../../../agent/mockApi'

/** Mock POI —— 替换为 HttpPOIService 即可接美团开放平台 */
export class MockPOIService implements IPOIService {
  readonly mode = 'mock' as const

  searchPOI(type: string, constraints: Constraints) {
    return MockAPI.searchPOI(type, constraints)
  }

  checkInventory(poiId: string, timeSlot?: Date) {
    return MockAPI.checkInventory(poiId, timeSlot)
  }

  checkTicketAvailability(poiId: string, timeSlot?: Date) {
    return MockAPI.checkTicketAvailability(poiId, timeSlot)
  }

  getRoute(from: [number, number], to: [number, number], mode?: 'drive' | 'walk' | 'subway'): Route {
    return MockAPI.getRoute(from, to, mode)
  }
}
