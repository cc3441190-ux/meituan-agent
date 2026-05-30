import { getTransitImage, getTransitLabel } from '../../config/transitAssets'
import type { Route } from '../../agent/types'

interface TransitSegmentRowProps {
  transit: Route
  fromName: string
  toName: string
  onRequestRide?: () => void
}

export function TransitSegmentRow({
  transit,
  fromName,
  toName,
  onRequestRide,
}: TransitSegmentRowProps) {
  const isWalk = transit.mode === 'walk'
  const label = getTransitLabel(transit.mode)

  return (
    <div className="v4-transit-segment">
      <div className="v4-transit-line" aria-hidden />
      <div className="v4-transit-body">
        <img className="v4-transit-icon" src={getTransitImage(transit.mode)} alt="" />
        <div className="v4-transit-copy">
          <span className="v4-transit-route">
            {fromName} → {toName}
          </span>
          <span className="v4-transit-meta">
            {label} · 约 {transit.duration} 分钟
            {transit.distance ? ` · ${transit.distance}` : ''}
          </span>
        </div>
        {!isWalk && onRequestRide && (
          <button type="button" className="v4-transit-ride-btn" onClick={onRequestRide}>
            代叫车
          </button>
        )}
      </div>
    </div>
  )
}
