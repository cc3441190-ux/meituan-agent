import { MockAPI } from '../../../agent/mockApi'
import type { Constraints, Inventory, POI } from '../../../agent/types'

/** LLM / 业务 API 失败时的 Plan B POI 兜底（保证主链路不中断） */
export async function fallbackSearchPOI(type: string, constraints: Constraints): Promise<POI> {
  return MockAPI.searchPOI(type, constraints)
}

export async function fallbackCheckInventory(poiId: string, timeSlot?: Date): Promise<Inventory> {
  return MockAPI.checkInventory(poiId, timeSlot)
}

export async function fallbackCheckTicketAvailability(
  poiId: string,
  timeSlot?: Date,
): Promise<Inventory> {
  return MockAPI.checkTicketAvailability(poiId, timeSlot)
}
