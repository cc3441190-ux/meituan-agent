import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { getMapHeight, getNodePosition } from '../agent/constants'
import type { Plan } from '../agent/types'
import { MapBackground } from './MapBackground'
import { MapNode } from './MapNode'
import { TransitClasp } from './TransitClasp'

export interface PlannerMapHandle {
  scrollToNode: (index: number) => void
}

interface PlannerMapProps {
  plan: Plan
  roadAnimate: boolean
  playRoadVideo: boolean
  stampedNodeIdx: number | null
  onNodeSelect: (index: number) => void
}

export const PlannerMap = forwardRef<PlannerMapHandle, PlannerMapProps>(function PlannerMap(
  { plan, roadAnimate, playRoadVideo, stampedNodeIdx, onNodeSelect },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const mapHeight = getMapHeight(plan.nodes.length)

  useImperativeHandle(ref, () => ({
    scrollToNode(index: number) {
      const el = scrollRef.current
      if (!el) return
      const pos = getNodePosition(index, plan.nodes.length)
      const targetTop = Math.max(0, pos.y - el.clientHeight * 0.35)
      el.scrollTo({ top: targetTop, behavior: 'smooth' })
    },
  }))

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollToTop = () => {
      el.scrollTo({ top: 0, behavior: 'auto' })
    }
    requestAnimationFrame(scrollToTop)
    const t = window.setTimeout(scrollToTop, 120)
    return () => window.clearTimeout(t)
  }, [plan.nodes.length, mapHeight])

  return (
    <div className="map-scroll" ref={scrollRef}>
      <div className="map-bg map-bg--assets" style={{ minHeight: mapHeight }}>
        <MapBackground playRoadVideo={playRoadVideo} minHeight={mapHeight} />

        <div className="map-nodes-layer">
          {plan.nodes.map((node, idx) => {
            const pos = getNodePosition(idx, plan.nodes.length)
            const prevPos = idx > 0 ? getNodePosition(idx - 1, plan.nodes.length) : null
            const prev = idx > 0 ? plan.nodes[idx - 1] : null
            const leg = idx > 0 ? node.transit : undefined

            return (
              <div key={`${node.type}-${idx}-${node.poi?.id ?? node.name}`}>
                {prev && prevPos && leg && (
                  <TransitClasp
                    from={prev}
                    to={node}
                    fromPos={prevPos}
                    toPos={pos}
                    route={leg}
                    animationDelay={`${idx * 0.35 + 0.15}s`}
                  />
                )}

                <div
                  className="map-node-anchor"
                  style={{ left: pos.x, top: pos.y }}
                  data-node-role={
                    node.type === 'home' ? 'start' : node.type === 'home_back' ? 'end' : 'stop'
                  }
                >
                  <MapNode
                    node={node}
                    index={idx}
                    animate={roadAnimate}
                    playStamp={stampedNodeIdx === idx}
                    onSelect={() => onNodeSelect(idx)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})
