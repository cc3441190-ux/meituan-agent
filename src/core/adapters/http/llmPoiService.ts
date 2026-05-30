import { normalizeInventory, normalizePoi } from '../../../agent/poiNormalize'
import type { Constraints, Inventory, POI, Route } from '../../../agent/types'
import type { IPOIService } from '../../ports'
import { fallbackCheckInventory, fallbackCheckTicketAvailability, fallbackSearchPOI } from '../fallback/poiFallback'
import { llmJson } from './llmClient'

type PoiResp = {
  id?: string
  name?: string
  rating?: number
  distance?: number
  location?: [number, number]
  tags?: string[]
}

type InventoryResp = {
  available?: boolean
  queue?: number
  reason?: string
}

/**
 * 武汉城区中心锚点（江汉区）及合理边界
 * lat: 30.35 – 30.75  lng: 114.05 – 114.65
 */
const WUHAN_CENTER: [number, number] = [30.575, 114.29]
const WUHAN_BOUNDS = { latMin: 30.35, latMax: 0.75 + 30, lngMin: 114.05, lngMax: 114.65 }

/** 若 LLM 返回坐标越界，用武汉中心加小随机偏移替代 */
function sanitizeLocation(loc: unknown, seed: number): [number, number] {
  if (
    Array.isArray(loc) &&
    loc.length === 2 &&
    typeof loc[0] === 'number' &&
    typeof loc[1] === 'number' &&
    Number.isFinite(loc[0]) &&
    Number.isFinite(loc[1]) &&
    loc[0] >= WUHAN_BOUNDS.latMin &&
    loc[0] <= WUHAN_BOUNDS.latMax &&
    loc[1] >= WUHAN_BOUNDS.lngMin &&
    loc[1] <= WUHAN_BOUNDS.lngMax
  ) {
    return [loc[0], loc[1]]
  }
  const jitter = 0.018
  return [
    WUHAN_CENTER[0] + Math.sin(seed * 7.3) * jitter,
    WUHAN_CENTER[1] + Math.cos(seed * 5.1) * jitter,
  ]
}

/** 无业务后端时，由 LLM 生成 POI / 库存；失败时降级 Mock Plan B */
export class LlmPOIService implements IPOIService {
  readonly mode = 'live' as const

  async searchPOI(type: string, constraints: Constraints): Promise<POI> {
    const used = constraints._usedPoiNames ?? []
    try {
      const poi = await llmJson<PoiResp>([
        {
          role: 'system',
          content: `你是本地生活 POI 检索器。为「${type}」类型推荐 1 家武汉真实门店。
规则：
1) 只输出 JSON: id,name,rating,distance,location,tags
2) name 必须是武汉真实存在的具体店名，不要和 alreadyUsed 重复，不要用同一品牌系列
3) 符合 nodeHint 与用户需求；budget=low 时人均不超过 60 元
4) distance 单位 km（合理范围 0.5-8），location 为武汉城区 [lat,lng]（lat 在 30.40-30.70 之间，lng 在 114.10-114.55 之间）
5) tags 数组包含 2-4 个中文标签，体现儿童友好/氛围/拍照等特性`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            type,
            nodeHint: constraints._nodeName,
            userInput: constraints._userInput,
            constraints: {
              people: constraints.people,
              preferences: constraints.preferences,
              budget: constraints.budget,
              location: constraints.location,
            },
            alreadyUsed: used,
          }),
        },
      ])

      const normalized = normalizePoi(poi, type, constraints._nodeName)
      let name = normalized.name
      if (used.some((u) => isSimilarName(u, name))) {
        name = `${name}（${type}-${used.length + 1}）`
      }
      const seed = used.length + 1
      return {
        ...normalized,
        name,
        location: sanitizeLocation(poi.location ?? normalized.location, seed),
      }
    } catch (err) {
      console.warn('[LlmPOIService] searchPOI 降级 Mock:', err)
      return fallbackSearchPOI(type, constraints)
    }
  }

  async checkInventory(poiId: string, timeSlot?: Date): Promise<Inventory> {
    try {
      const inv = await llmJson<InventoryResp>([
        {
          role: 'system',
          content:
            '你是餐厅库存助手。输出 JSON: {available:boolean, queue?:number, reason?:string}。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            poiId,
            timeSlot: timeSlot?.toISOString(),
          }),
        },
      ])
      return normalizeInventory(inv)
    } catch (err) {
      console.warn('[LlmPOIService] checkInventory 降级 Mock:', err)
      return fallbackCheckInventory(poiId, timeSlot)
    }
  }

  async checkTicketAvailability(poiId: string, timeSlot?: Date): Promise<Inventory> {
    try {
      const inv = await llmJson<InventoryResp>([
        {
          role: 'system',
          content:
            '你是景点/乐园门票库存助手。输出 JSON: {available:boolean, queue?:number, reason?:string}。available=false 表示无票或场次已满。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            poiId,
            timeSlot: timeSlot?.toISOString(),
          }),
        },
      ])
      return normalizeInventory(inv)
    } catch (err) {
      console.warn('[LlmPOIService] checkTicketAvailability 降级 Mock:', err)
      return fallbackCheckTicketAvailability(poiId, timeSlot)
    }
  }

  getRoute(
    from: [number, number],
    to: [number, number],
    mode?: 'drive' | 'walk' | 'subway',
  ): Route {
    void mode
    const dx = from[0] - to[0]
    const dy = from[1] - to[1]
    const distKm = Math.sqrt(dx * dx + dy * dy) * 100
    const duration = Math.max(8, Math.ceil((distKm / 28) * 60))
    return { distance: distKm.toFixed(1), duration, mode: 'drive' }
  }
}

function isSimilarName(a: string, b: string): boolean {
  const na = a.replace(/\s/g, '').toLowerCase()
  const nb = b.replace(/\s/g, '').toLowerCase()
  if (na === nb) return true
  const prefixLen = 2
  if (na.length >= prefixLen && nb.length >= prefixLen && na.slice(0, prefixLen) === nb.slice(0, prefixLen)) {
    return true
  }
  return false
}
