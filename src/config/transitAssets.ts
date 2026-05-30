/**
 * 地图两站之间的交通图标
 * 优先使用 public/assets/nodes/ 下的「自驾 / 网约车 / 地铁 / 步行」等分类图
 * 亦可放在 public/assets/transit/（小车 / 走路 / 地铁出行）作为兜底
 */

import { getNodeAssetByLabel } from './nodeAssets'

export type TransitCategory = 'car' | 'walk' | 'subway' | 'ride' | 'bike'

const TRANSIT_BASE = '/assets/transit'

export const TRANSIT_ASSETS: Record<'car' | 'walk' | 'subway', string> = {
  car: `${TRANSIT_BASE}/${encodeURIComponent('小车')}.png`,
  walk: `${TRANSIT_BASE}/${encodeURIComponent('走路')}.png`,
  subway: `${TRANSIT_BASE}/${encodeURIComponent('地铁出行')}.png`,
}

const NODE_TRANSIT_IMAGES: Record<TransitCategory, string> = {
  walk: getNodeAssetByLabel('步行'),
  subway: getNodeAssetByLabel('地铁'),
  car: getNodeAssetByLabel('自驾'),
  ride: getNodeAssetByLabel('网约车'),
  bike: getNodeAssetByLabel('城市骑行'),
}

/** 将 Agent / API 返回的 mode 归并为三种出行方式 */
export function resolveTransitCategory(mode?: string): TransitCategory {
  const m = (mode ?? 'drive').toLowerCase()

  if (m === 'walk' || m === 'walking' || m === 'transit_walk') {
    return 'walk'
  }
  if (m === 'bike' || m === 'transit_bike') {
    return 'bike'
  }
  if (m === 'subway' || m === 'metro' || m === 'light_rail' || m === 'transit_subway') {
    return 'subway'
  }
  if (m === 'ride' || m === 'taxi' || m === 'transit_ride' || m === 'didi') {
    return 'ride'
  }
  return 'car'
}

export function getTransitImage(mode?: string): string {
  const cat = resolveTransitCategory(mode)
  return NODE_TRANSIT_IMAGES[cat] ?? TRANSIT_ASSETS.car
}

export function getTransitLabel(mode?: string): string {
  const cat = resolveTransitCategory(mode)
  if (cat === 'walk') return '步行'
  if (cat === 'subway') return '轻轨'
  if (cat === 'ride') return '打车'
  if (cat === 'bike') return '骑行'
  return '自驾'
}

/** 根据距离自动选择出行方式（Mock 用，接 API 后可由后端返回） */
export function suggestTransitMode(distanceKm: number): 'drive' | 'walk' | 'subway' {
  if (distanceKm < 1.2) return 'walk'
  if (distanceKm > 5) return 'subway'
  return 'drive'
}
