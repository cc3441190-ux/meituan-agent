export const NODE_EMOJI: Record<string, string> = {
  home: '🏠',
  home_back: '🌙',
  park: '🎡',
  indoor_play: '🎪',
  arcade: '🎮',
  exhibition: '🖼️',
  walk_street: '🛍️',
  garden: '🌳',
  light_meal: '🥗',
  family_restaurant: '🍽️',
  bbq: '🥩',
  hotpot: '🍲',
  sichuan: '🌶️',
  cafe: '☕',
  night_market: '🌃',
  restaurant: '🍴',
}

import { buildRoadSvgPath, getMapCanvasHeight, getNodePositionOnRoad } from './mapRoadPath'

export function formatTime(date?: Date): string {
  if (!date) return '--:--'
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export { MAP_BG_REF_HEIGHT } from './mapRoadPath'

export function getMapHeight(nodeCount: number) {
  return getMapCanvasHeight(nodeCount)
}

/** 与背景图透明轨道一致的 SVG 路径 */
export function generateRoadPath(_nodeCount: number): string {
  return buildRoadSvgPath(getMapHeight(_nodeCount))
}

/** 站点落在背景图蜿蜒道路之上 */
export function getNodePosition(index: number, total: number) {
  return getNodePositionOnRoad(index, total, getMapHeight(total))
}
