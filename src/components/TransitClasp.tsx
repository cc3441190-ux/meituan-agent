import { getTransitImage, getTransitLabel } from '../config/transitAssets'
import type { PlanNode, Route } from '../agent/types'

interface TransitClaspProps {
  from: PlanNode
  to: PlanNode
  fromPos: { x: number; y: number }
  toPos: { x: number; y: number }
  route: Route
  animationDelay?: string
}

export function TransitClasp({
  from,
  to,
  fromPos,
  toPos,
  route,
  animationDelay = '0s',
}: TransitClaspProps) {
  const fromName = from.poi?.name ?? from.name
  const toName = to.poi?.name ?? to.name
  const midX = (fromPos.x + toPos.x) / 2
  const midY = (fromPos.y + toPos.y) / 2
  const dx = toPos.x - fromPos.x
  const dy = toPos.y - fromPos.y
  const length = Math.hypot(dx, dy)
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI

  return (
    <>
      <div
        className="transit-connector"
        style={{
          left: fromPos.x,
          top: fromPos.y,
          width: length,
          transform: `rotate(${angle}deg)`,
          animationDelay,
        }}
        aria-hidden
      />
      <div
        className="transit-clasp"
        style={{
          left: midX,
          top: midY,
          animationDelay,
        }}
      >
        <div className="transit-clasp-card">
          <img
            className="transit-clasp-icon"
            src={getTransitImage(route.mode)}
            alt=""
            draggable={false}
          />
          <div className="transit-clasp-copy">
            <span className="transit-clasp-route">
              {fromName} → {toName}
            </span>
            <span className="transit-clasp-meta">
              {getTransitLabel(route.mode)} {route.duration}分钟
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
