import type { TimelineTransitItem } from '../../v2/types'

export function TransitLegRow({ item }: { item: TimelineTransitItem }) {
  return (
    <div className="v2-transit-row">
      <div className="v2-transit-line" aria-hidden />
      <div className="v2-transit-body">
        <span className="v2-transit-time">{item.time}</span>
        <span className="v2-transit-text">
          {item.mode} {item.duration} 分钟
          {item.distance ? ` · ${item.distance}km` : ''}
        </span>
      </div>
    </div>
  )
}
