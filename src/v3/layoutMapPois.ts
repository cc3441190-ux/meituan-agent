import type { MapInterestPoi } from './types'

const MIN_DIST_FROM_STATION = 92

type Point = { x: number; y: number }

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** 兴趣点避让方案站点，避免标签叠在一起 */
export function layoutInterestPois(
  pois: MapInterestPoi[],
  stationPositions: Point[],
  scaleY = 1,
): Array<MapInterestPoi & { hidden?: boolean }> {
  const placed: Point[] = []

  return pois.map((poi, index) => {
    const baseY = poi.y * scaleY
    const shifts = [0, index % 2 === 0 ? 32 : -32, index % 2 === 0 ? -32 : 32, 48, -48]

    for (const shift of shifts) {
      const candidate = { x: poi.x + shift, y: baseY }
      const tooCloseToStation = stationPositions.some((s) => dist(candidate, s) < MIN_DIST_FROM_STATION)
      const tooCloseToPlaced = placed.some((p) => dist(candidate, p) < 64)
      if (!tooCloseToStation && !tooCloseToPlaced) {
        placed.push(candidate)
        return { ...poi, x: candidate.x, y: candidate.y }
      }
    }

    return { ...poi, x: poi.x + shifts[1], y: baseY, hidden: true }
  })
}
