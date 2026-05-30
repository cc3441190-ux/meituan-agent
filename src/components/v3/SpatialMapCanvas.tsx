import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { getMapHeight, getNodePosition } from '../../agent/constants'
import { MAP_ASSETS } from '../../config/nodeAssets'
import type { Plan } from '../../agent/types'
import { layoutInterestPois } from '../../v3/layoutMapPois'
import { resolveInterestPois } from '../../v3/mapPois'
import type { JourneyPhase, MapInterestPoi } from '../../v3/types'
import {
  buildLegPathConnectingNodes,
  getRoadParamForNode,
  getTransitPinPosition,
} from '../../agent/mapRoadPath'
import { MapGhostNode } from './MapGhostNode'
import { MapTransitPin } from './MapTransitPin'
import { MapNode } from '../MapNode'
import { PhaseStrip } from './PhaseStrip'
import type { Route } from '../../agent/types'

interface SpatialMapCanvasProps {
  plan: Plan
  focusIndex: number
  isRecalculating: boolean
  variant: 'preview' | 'fullscreen'
  stampedNodeIdx: number | null
  roadAnimate?: boolean
  phases?: JourneyPhase[]
  ghostPoi?: MapInterestPoi | null
  onToggleExpand: () => void
  onFocusNode: (index: number) => void
  onReorder: (fromIdx: number, toIdx: number) => void
  onSelectInterest: (poi: MapInterestPoi) => void
  onSwapNode?: (index: number) => void
  onShowAlternatives?: (index: number) => void
  onAdjustNodeTime?: (index: number) => void
  onConfirmNode?: (index: number) => void
}

const PREVIEW_CANVAS_HEIGHT = 300

export function SpatialMapCanvas({
  plan,
  focusIndex,
  isRecalculating,
  variant,
  stampedNodeIdx,
  roadAnimate = false,
  phases = [],
  ghostPoi = null,
  onToggleExpand,
  onFocusNode,
  onReorder,
  onSelectInterest,
  onSwapNode,
  onShowAlternatives,
  onAdjustNodeTime,
  onConfirmNode,
}: SpatialMapCanvasProps) {
  const expanded = variant === 'fullscreen'
  const isPreview = variant === 'preview'
  const total = plan.nodes.length
  const mapHeight = getMapHeight(total)
  const canvasHeight = isPreview ? PREVIEW_CANVAS_HEIGHT : mapHeight

  const positions = useMemo(
    () => plan.nodes.map((_, i) => getNodePosition(i, total)),
    [plan.nodes, total],
  )

  const displayPositions = useMemo(() => {
    if (!isPreview) return positions
    const scaleY = canvasHeight / mapHeight
    return positions.map((p) => ({ x: p.x, y: p.y * scaleY }))
  }, [isPreview, positions, canvasHeight, mapHeight])

  const transitLegs = useMemo(() => {
    const legs: Array<{
      key: string
      route: Route
      x: number
      y: number
      fromName: string
      toName: string
      pathD?: string
    }> = []

    for (let i = 1; i < plan.nodes.length; i++) {
      const node = plan.nodes[i]
      const prev = plan.nodes[i - 1]
      const route: Route = node.transit ?? {
        mode: (node.transitMinutes ?? 12) <= 12 ? 'walk' : 'drive',
        duration: node.transitMinutes ?? 12,
        distance: '',
      }

      const p0 = displayPositions[i - 1]
      const p1 = displayPositions[i]
      const t0 = getRoadParamForNode(i - 1, total)
      const t1 = getRoadParamForNode(i, total)
      const roadH = isPreview ? canvasHeight : mapHeight
      const pin = getTransitPinPosition(p0, p1, t0, t1, roadH)
      const pathD = buildLegPathConnectingNodes(
        p0,
        p1,
        t0,
        t1,
        roadH,
        isPreview ? 10 : 14,
      )

      legs.push({
        key: `leg-${i}`,
        route,
        x: pin.x,
        y: pin.y,
        fromName: prev.poi?.name ?? prev.name,
        toName: node.poi?.name ?? node.name,
        pathD,
      })
    }

    return legs
  }, [displayPositions, isPreview, canvasHeight, mapHeight, plan.nodes, total])

  const displayPois = useMemo(() => {
    const base = resolveInterestPois(mapHeight, total)
    const scaled = isPreview
      ? base.map((poi) => ({ ...poi, y: poi.y * (canvasHeight / mapHeight) }))
      : base
    return layoutInterestPois(scaled, displayPositions, 1)
  }, [displayPositions, isPreview, canvasHeight, mapHeight, total])

  const scaledGhost = useMemo(() => {
    if (!ghostPoi) return null
    if (!isPreview) return ghostPoi
    const scaleY = canvasHeight / mapHeight
    return { ...ghostPoi, y: ghostPoi.y * scaleY }
  }, [ghostPoi, isPreview, canvasHeight, mapHeight])
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ idx: number; startX: number; startY: number } | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [hoveredPoiId, setHoveredPoiId] = useState<string | null>(null)

  const selectedPhase = phases.find((phase) => phase.nodeIndex === focusIndex)
  const selectedNode = plan.nodes[focusIndex]
  const canEditSelected = expanded && selectedNode && !selectedNode.fixed

  const scrollToNode = useCallback(
    (index: number) => {
      const el = scrollRef.current
      if (!el || isPreview) return
      const pos = displayPositions[index]
      const ratio = pos.y / canvasHeight
      const targetTop = Math.max(0, ratio * el.scrollHeight - el.clientHeight * 0.35)
      el.scrollTo({ top: targetTop, behavior: expanded ? 'smooth' : 'auto' })
    },
    [canvasHeight, displayPositions, expanded, isPreview],
  )

  useEffect(() => {
    if (variant === 'preview') return
    scrollToNode(focusIndex)
  }, [focusIndex, variant, scrollToNode])

  useEffect(() => {
    if (variant !== 'fullscreen' || !scrollRef.current) return
    scrollRef.current.scrollTop = 0
  }, [variant])

  useEffect(() => {
    if (variant === 'preview' || !ghostPoi || !scrollRef.current) return
    const el = scrollRef.current
    const ratio = ghostPoi.y / mapHeight
    const targetTop = Math.max(0, ratio * el.scrollHeight - el.clientHeight * 0.4)
    el.scrollTo({ top: targetTop, behavior: 'smooth' })
  }, [ghostPoi, mapHeight, isPreview, canvasHeight])

  const findNearestBookable = useCallback(
    (x: number, y: number, exclude: number) => {
      let best = -1
      let bestD = Infinity
      plan.nodes.forEach((node, i) => {
        if (i === exclude || node.fixed || i === 0 || i === plan.nodes.length - 1) return
        const p = displayPositions[i]
        const d = Math.hypot(p.x - x, p.y - y)
        if (d < bestD && d < 100) {
          bestD = d
          best = i
        }
      })
      return best
    },
    [displayPositions, plan.nodes],
  )

  const onPointerDown = (idx: number, e: PointerEvent) => {
    if (!expanded) return
    const node = plan.nodes[idx]
    if (node.fixed) return
    e.stopPropagation()
    dragRef.current = { idx, startX: e.clientX, startY: e.clientY }
    setDragIdx(idx)
    setDragPos(displayPositions[idx])
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragRef.current || dragIdx === null) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const base = displayPositions[dragIdx]
    setDragPos({ x: base.x + dx, y: base.y + dy })
  }

  const onPointerUp = (e: PointerEvent) => {
    if (dragRef.current) {
      const moved = Math.hypot(
        e.clientX - dragRef.current.startX,
        e.clientY - dragRef.current.startY,
      )
      if (moved < 8) {
        onFocusNode(dragRef.current.idx)
      } else if (dragPos) {
        const target = findNearestBookable(dragPos.x, dragPos.y, dragRef.current.idx)
        if (target !== -1 && target !== dragRef.current.idx) {
          onReorder(dragRef.current.idx, target)
        }
      }
    }
    dragRef.current = null
    setDragIdx(null)
    setDragPos(null)
    try {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={[
        'v3-spatial-map',
        variant === 'fullscreen' ? 'v3-spatial-map--fullscreen' : 'v3-spatial-map--preview',
        isRecalculating ? 'v3-spatial-map--recalc' : '',
        dragIdx !== null ? 'v3-spatial-map--dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="空间化规划地图"
    >
      <div className="v3-spatial-toolbar">
        <button
          type="button"
          className="v3-map-expand-btn"
          onClick={onToggleExpand}
          aria-label={expanded ? '收起地图' : '展开地图至全屏'}
        >
          {expanded ? (
            <>
              <span className="v3-map-expand-icon">✕</span>
              收起
            </>
          ) : (
            <>
              <span className="v3-map-expand-icon">⛶</span>
              全屏编辑地图
            </>
          )}
        </button>
        {variant === 'preview' && (
          <span className="v3-map-toolbar-hint">点击进入全屏 · 编辑下午动线</span>
        )}
      </div>

      {isRecalculating && (
        <div className="v3-recalc-banner">
          <span className="v3-recalc-dot" />
          AI 正在重新计算下午动线…
        </div>
      )}

      <div
        className="v3-spatial-scroll"
        ref={scrollRef}
        style={isPreview ? { height: canvasHeight } : undefined}
      >
        <div
          className="v3-spatial-map-inner map-bg map-bg--assets"
          style={{ minHeight: canvasHeight, height: canvasHeight }}
        >
          <img className="v3-spatial-bg" src={MAP_ASSETS.background} alt="" draggable={false} />

          <svg
            className="v3-map-transit-paths"
            aria-hidden
            style={{ width: '100%', height: canvasHeight }}
          >
            {transitLegs.map((leg) =>
              leg.pathD ? (
                <path
                  key={`path-${leg.key}`}
                  d={leg.pathD}
                  className="v3-map-transit-path"
                />
              ) : null,
            )}
          </svg>

          <div className="map-nodes-layer map-nodes-layer--spatial">
            {transitLegs.map((leg) => (
              <MapTransitPin
                key={leg.key}
                route={leg.route}
                x={leg.x}
                y={leg.y}
                variant={variant}
              />
            ))}

            {scaledGhost && (
              <MapGhostNode
                name={scaledGhost.name}
                sceneLabel={scaledGhost.sceneLabel}
                x={scaledGhost.x}
                y={scaledGhost.y}
              />
            )}

            {plan.nodes.map((node, i) => {
              const p = displayPositions[i]
              const isDragged = dragIdx === i && dragPos
              const cx = isDragged ? dragPos!.x : p.x
              const cy = isDragged ? dragPos!.y : p.y
              const bookable = expanded && !node.fixed && i > 0 && i < plan.nodes.length - 1

              const isEndpoint = node.fixed && (i === 0 || i === plan.nodes.length - 1)

              return (
                <div
                  key={`node-${i}-${node.poi?.id ?? node.name}`}
                  className={`map-node-anchor v3-map-node-anchor ${!expanded ? 'v3-map-node-anchor--preview' : ''} ${i === focusIndex ? 'v3-map-node-anchor--focus' : ''} ${bookable ? 'v3-map-node-anchor--draggable' : ''} ${isEndpoint ? 'v3-map-node-anchor--endpoint' : ''} ${node.fixed ? 'v3-map-node-anchor--fixed' : 'v3-map-node-anchor--stop'}`}
                  style={{ left: cx, top: cy }}
                  onPointerDown={bookable ? (e) => onPointerDown(i, e) : undefined}
                  onPointerMove={bookable ? onPointerMove : undefined}
                  onPointerUp={bookable ? onPointerUp : undefined}
                >
                  <MapNode
                    node={node}
                    index={i}
                    animate={roadAnimate}
                    playStamp={stampedNodeIdx === i}
                    onSelect={() => onFocusNode(i)}
                  />
                </div>
              )
            })}

            {displayPois.map((poi) =>
              poi.hidden ? null : (
                <button
                  key={poi.id}
                  type="button"
                  className={[
                    'v3-interest-pin',
                    ghostPoi?.id === poi.id ? 'v3-interest-pin--active' : '',
                    hoveredPoiId === poi.id ? 'v3-interest-pin--hover' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ left: poi.x, top: poi.y }}
                  onClick={() => onSelectInterest(poi)}
                  onMouseEnter={() => setHoveredPoiId(poi.id)}
                  onMouseLeave={() => setHoveredPoiId(null)}
                  aria-label={`插入 ${poi.name}`}
                >
                  <span className="v3-interest-pin-dot">+</span>
                  <span className="v3-interest-pin-name">{poi.name}</span>
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {expanded && phases.length > 0 && (
        <PhaseStrip
          phases={phases}
          focusIndex={focusIndex}
          onSelectPhase={onFocusNode}
        />
      )}

      {canEditSelected && selectedPhase && (
        <div className="v3-map-edit-dock">
          <div className="v3-map-edit-main">
            <span className="v3-map-edit-eyebrow">正在编辑</span>
            <strong>{selectedPhase.title}</strong>
            <span>{selectedPhase.timeRange} · {selectedPhase.summary}</span>
          </div>
          <div className="v3-map-edit-actions">
            <button type="button" onClick={() => onSwapNode?.(focusIndex)}>
              换一家
            </button>
            <button type="button" onClick={() => onShowAlternatives?.(focusIndex)}>
              替代
            </button>
            <button type="button" onClick={() => onAdjustNodeTime?.(focusIndex)}>
              调时间
            </button>
            {selectedPhase.status !== 'locked' && (
              <button
                type="button"
                className="v3-map-edit-primary"
                onClick={() => onConfirmNode?.(focusIndex)}
              >
                确认此站
              </button>
            )}
          </div>
        </div>
      )}

      {variant === 'preview' ? (
        <button
          type="button"
          className="v3-spatial-preview-tap"
          onClick={onToggleExpand}
          aria-label="全屏打开方案地图"
        />
      ) : null}

      <p className="v3-map-hint">
        {expanded ? '轻点站点编辑 · 拖动调整顺序 · 点 + 在两站之间加一站' : '随页面下滑浏览方案 · 点击地图全屏编辑'}
      </p>
    </div>
  )
}
