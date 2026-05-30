import { resolveNodeImage } from '../../config/nodeAssets'

interface MapGhostNodeProps {
  name: string
  sceneLabel: string
  x: number
  y: number
}

export function MapGhostNode({ name, sceneLabel, x, y }: MapGhostNodeProps) {
  const imageSrc = resolveNodeImage({ label: sceneLabel })

  return (
    <div
      className="map-node-anchor v3-map-node-anchor v3-map-ghost"
      style={{ left: x, top: y }}
      aria-hidden
    >
      <div className="v3-map-ghost-card">
        <div className="v3-map-ghost-sign">
          <img className="v3-map-ghost-image" src={imageSrc} alt="" draggable={false} />
          <span className="v3-map-ghost-badge">预览</span>
        </div>
        <div className="v3-map-ghost-stick" />
        <div className="v3-map-ghost-name">{name}</div>
      </div>
    </div>
  )
}
