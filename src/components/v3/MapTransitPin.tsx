import { getTransitImage, getTransitLabel } from '../../config/transitAssets'
import type { Route } from '../../agent/types'

export type MapTransitPinProps = {
  route: Route
  x: number
  y: number
  variant: 'preview' | 'fullscreen'
}

/** 地图上两站之间的交通方式：纯图标 + 方式/时间（无卡片） */
export function MapTransitPin({ route, x, y, variant }: MapTransitPinProps) {
  const label = getTransitLabel(route.mode)
  const compact = variant === 'preview'

  return (
    <div
      className={[
        'v3-map-transit-pin',
        'v3-map-transit-pin--minimal',
        compact ? 'v3-map-transit-pin--preview' : 'v3-map-transit-pin--fullscreen',
      ].join(' ')}
      style={{ left: x, top: y }}
      aria-label={`${label}约${route.duration}分钟`}
    >
      <img
        className="v3-map-transit-pin-icon"
        src={getTransitImage(route.mode)}
        alt=""
        draggable={false}
      />
      <span className="v3-map-transit-pin-caption">
        {label} · 约{route.duration}分钟
      </span>
    </div>
  )
}
