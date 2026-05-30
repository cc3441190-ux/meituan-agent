import { getInterestPoiOnRoad, getMapCanvasHeight, getRoadParamForNode } from '../agent/mapRoadPath'
import type { MapInterestPoi } from './types'

export interface MapInterestDef {
  id: string
  name: string
  /** 默认道路参数，会被动线中段 t 覆盖 */
  t: number
  side: 'left' | 'right'
  category: MapInterestPoi['category']
  sceneLabel: string
}

/** 可插入兴趣点定义（位置由道路曲线 + 动线空隙计算） */
export const MAP_INTEREST_DEFS: MapInterestDef[] = [
  { id: 'exhibit', name: '当代艺术展', t: 0.32, side: 'right', category: 'cultural', sceneLabel: '展览馆' },
  { id: 'coffee', name: '缓冲咖啡', t: 0.5, side: 'left', category: 'dining', sceneLabel: '缓冲咖啡' },
  { id: 'bar', name: '滨江小酒馆', t: 0.68, side: 'right', category: 'night', sceneLabel: 'Livehouse' },
]

/** 每两个站点之间一个「+」，点击在该段插入新场景 */
export function resolveInterestPois(
  mapHeight: number,
  nodeCount: number,
): MapInterestPoi[] {
  if (nodeCount < 2) return []

  const pois: MapInterestPoi[] = []
  for (let i = 0; i < nodeCount - 1; i++) {
    const def = MAP_INTEREST_DEFS[i % MAP_INTEREST_DEFS.length]
    const t0 = getRoadParamForNode(i, nodeCount)
    const t1 = getRoadParamForNode(i + 1, nodeCount)
    const t = (t0 + t1) / 2
    const pos = getInterestPoiOnRoad(t, def.side, mapHeight)
    pois.push({
      id: `${def.id}-seg-${i}`,
      name: def.name,
      x: pos.x,
      y: pos.y,
      category: def.category,
      sceneLabel: def.sceneLabel,
      afterNodeIndex: i,
    })
  }
  return pois
}

/** @deprecated 使用 resolveInterestPois */
export const MAP_INTEREST_POIS: MapInterestPoi[] = resolveInterestPois(getMapCanvasHeight(4), 4)
