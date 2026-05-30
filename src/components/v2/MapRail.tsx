import { useMemo } from 'react'
import { getNodePosition } from '../../agent/constants'
import { MAP_ASSETS } from '../../config/nodeAssets'
import type { Plan } from '../../agent/types'

interface MapRailProps {
  plan: Plan
  focusIndex: number
}

export function MapRail({ plan, focusIndex }: MapRailProps) {
  const total = plan.nodes.length
  const positions = useMemo(
    () => plan.nodes.map((_, i) => getNodePosition(i, total)),
    [plan.nodes, total],
  )

  const mapHeight = Math.max(400, total * 120)
  const focus = positions[focusIndex]

  return (
    <aside className="v2-map-rail" aria-label="路线空间关系">
      <div className="v2-map-rail-inner" style={{ height: mapHeight }}>
        <img
          className="v2-map-rail-bg"
          src={MAP_ASSETS.background}
          alt=""
          draggable={false}
        />
        <svg className="v2-map-rail-svg" viewBox={`0 0 393 ${mapHeight}`} preserveAspectRatio="xMidYMin slice">
          {positions.slice(0, -1).map((from, i) => {
            const to = positions[i + 1]
            const active = i === focusIndex - 1 || i === focusIndex
            return (
              <line
                key={`leg-${i}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={active ? 'v2-map-path v2-map-path--active' : 'v2-map-path'}
              />
            )
          })}
          {positions.map((p, i) => (
            <circle
              key={`pin-${i}`}
              cx={p.x}
              cy={p.y}
              r={i === focusIndex ? 6 : 4}
              className={i === focusIndex ? 'v2-map-pin v2-map-pin--active' : 'v2-map-pin'}
            />
          ))}
        </svg>
        {focus && (
          <div
            className="v2-map-focus-label"
            style={{ top: `${(focus.y / mapHeight) * 100}%` }}
          >
            当前段
          </div>
        )}
      </div>
    </aside>
  )
}
