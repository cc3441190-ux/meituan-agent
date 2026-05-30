import { IPHONE_16 } from '../config/device'

/** 与背景图 `新背景.jpeg`（1536×2752）等比缩放到手机逻辑宽度 */
export const MAP_BG_REF_WIDTH = IPHONE_16.width
export const MAP_BG_REF_HEIGHT = Math.round(MAP_BG_REF_WIDTH * (2752 / 1536))

/**
 * 手工标定在背景图透明蜿蜒道路上的控制点（393×704 坐标系）。
 * 路径：顶部居中 → 右上 → 左中 → 右中下 → 左下 → 底部居中
 */
const ROAD_KNOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 196, y: 52 },
  { x: 302, y: 128 },
  { x: 86, y: 228 },
  { x: 312, y: 368 },
  { x: 94, y: 508 },
  { x: 198, y: 652 },
]

/** 中间站：锚点在路面上方，招牌底脚落在轨道中心 */
const NODE_ANCHOR_Y_OFFSET = -88

/** 画布上下留白，避免起点/终点被工具栏或裁切挡住 */
export const MAP_PADDING_TOP = 88
export const MAP_PADDING_BOTTOM = 48

/** 起点/终点少向上拉，保证整卡（含时间）在可视区内 */
const ENDPOINT_ANCHOR_Y_OFFSET = -56

/** 起点「出发 / 当前位置」画布坐标（用户标定） */
const START_NODE_CANVAS = { x: 110, y: 20 } as const

function catmullRomPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  }
}

/** 沿背景道路采样，t ∈ [0, 1] */
export function sampleRoadPath(t: number): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(1, t))
  const knots = ROAD_KNOTS
  if (knots.length < 2) return knots[0] ?? { x: MAP_BG_REF_WIDTH / 2, y: 0 }

  const segments = knots.length - 1
  const scaled = clamped * segments
  const seg = Math.min(Math.floor(scaled), segments - 1)
  const localT = scaled - seg

  const i0 = Math.max(seg - 1, 0)
  const i1 = seg
  const i2 = seg + 1
  const i3 = Math.min(seg + 2, knots.length - 1)

  return catmullRomPoint(knots[i0], knots[i1], knots[i2], knots[i3], localT)
}

export function getMapCanvasHeight(_nodeCount: number): number {
  return MAP_BG_REF_HEIGHT + MAP_PADDING_TOP + MAP_PADDING_BOTTOM
}

function getRoadScaleY(mapHeight: number): number {
  const drawable = mapHeight - MAP_PADDING_TOP - MAP_PADDING_BOTTOM
  return drawable / MAP_BG_REF_HEIGHT
}

/** 道路曲线 y → 画布坐标（含上内边距） */
export function roadToCanvasY(roadY: number, mapHeight: number): number {
  return roadY * getRoadScaleY(mapHeight) + MAP_PADDING_TOP
}

function anchorYOffset(index: number, total: number): number {
  if (index === 0 || index === total - 1) return ENDPOINT_ANCHOR_Y_OFFSET
  return NODE_ANCHOR_Y_OFFSET
}

/** 节点在道路曲线上的参数：首站 t=0、末站 t=1，中间均匀分布 */
export function getRoadParamForNode(index: number, total: number): number {
  if (total <= 1) return 0.5
  return index / (total - 1)
}

export function getNodePositionOnRoad(
  index: number,
  total: number,
  mapHeight: number = MAP_BG_REF_HEIGHT,
): { x: number; y: number } {
  if (index === 0) {
    return { x: START_NODE_CANVAS.x, y: START_NODE_CANVAS.y }
  }

  const t = getRoadParamForNode(index, total)
  const onRoad = sampleRoadPath(t)

  return {
    x: onRoad.x,
    y: roadToCanvasY(onRoad.y, mapHeight) + anchorYOffset(index, total),
  }
}

/** 兴趣点：沿背景道路曲线，法向偏移到路的一侧 */
export function getInterestPoiOnRoad(
  t: number,
  side: 'left' | 'right',
  mapHeight: number = getMapCanvasHeight(4),
  lateral = 42,
): { x: number; y: number } {
  const p = sampleRoadPath(t)
  const p2 = sampleRoadPath(Math.min(1, t + 0.025))
  const cx = p.x
  const cy = roadToCanvasY(p.y, mapHeight)
  const dx = p2.x - p.x
  const dy = roadToCanvasY(p2.y, mapHeight) - cy
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const sign = side === 'left' ? -1 : 1
  return {
    x: cx + nx * lateral * sign,
    y: cy + ny * lateral * sign - 18,
  }
}

/** 沿道路曲线绘制两站之间的路径段（仅路面，不连接站点锚点） */
export function buildRoadSegmentPath(
  tStart: number,
  tEnd: number,
  mapHeight: number = MAP_BG_REF_HEIGHT,
  steps = 14,
): string {
  const start = sampleRoadPath(tStart)
  let d = `M ${start.x.toFixed(1)} ${roadToCanvasY(start.y, mapHeight).toFixed(1)}`
  for (let i = 1; i <= steps; i++) {
    const t = tStart + ((tEnd - tStart) * i) / steps
    const p = sampleRoadPath(t)
    d += ` L ${p.x.toFixed(1)} ${roadToCanvasY(p.y, mapHeight).toFixed(1)}`
  }
  return d
}

type CanvasPoint = { x: number; y: number }

/** 站点锚点 → 沿道路 → 下一站锚点，保证虚线接到招牌脚点 */
export function buildLegPathConnectingNodes(
  from: CanvasPoint,
  to: CanvasPoint,
  tStart: number,
  tEnd: number,
  mapHeight: number,
  roadSteps = 12,
): string {
  const parts: string[] = [`M ${from.x.toFixed(1)} ${from.y.toFixed(1)}`]
  for (let i = 1; i < roadSteps; i++) {
    const t = tStart + ((tEnd - tStart) * i) / roadSteps
    const p = sampleRoadPath(t)
    parts.push(`L ${p.x.toFixed(1)} ${roadToCanvasY(p.y, mapHeight).toFixed(1)}`)
  }
  parts.push(`L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`)
  return parts.join(' ')
}

/** 两站之间交通图标：节点中点与路面中点混合，避免「飘到最上/最下」 */
export function getTransitPinPosition(
  from: CanvasPoint,
  to: CanvasPoint,
  tStart: number,
  tEnd: number,
  mapHeight: number,
  roadBlend = 0.42,
): CanvasPoint {
  const nodeMidX = (from.x + to.x) / 2
  const nodeMidY = (from.y + to.y) / 2
  const roadPt = sampleRoadPath((tStart + tEnd) / 2)
  const roadX = roadPt.x
  const roadY = roadToCanvasY(roadPt.y, mapHeight) + 10
  return {
    x: nodeMidX * (1 - roadBlend) + roadX * roadBlend,
    y: nodeMidY * (1 - roadBlend) + roadY * roadBlend,
  }
}

const ROAD_SAMPLE_STEPS = 48

/** 生成贴合道路的 SVG path（用于连线与蓝图） */
export function buildRoadSvgPath(mapHeight: number = MAP_BG_REF_HEIGHT): string {
  const start = sampleRoadPath(0)
  let d = `M ${start.x.toFixed(1)} ${roadToCanvasY(start.y, mapHeight).toFixed(1)}`

  for (let i = 1; i <= ROAD_SAMPLE_STEPS; i++) {
    const t = i / ROAD_SAMPLE_STEPS
    const p = sampleRoadPath(t)
    d += ` L ${p.x.toFixed(1)} ${roadToCanvasY(p.y, mapHeight).toFixed(1)}`
  }

  return d
}

export function buildRoadSvgPathBetween(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
}
