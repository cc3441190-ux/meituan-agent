import { generateRoadPath, getMapHeight } from '../agent/constants'

interface BlueprintPathProps {
  nodeCount: number
  animate?: boolean
}

export function BlueprintPath({ nodeCount, animate }: BlueprintPathProps) {
  const mapHeight = getMapHeight(nodeCount)
  const d = generateRoadPath(nodeCount)

  return (
    <svg
      className={`blueprint-path-svg ${animate ? 'blueprint-path-svg--animate' : ''}`}
      width="100%"
      height={mapHeight}
      viewBox={`0 0 393 ${mapHeight}`}
      preserveAspectRatio="xMidYMin meet"
      aria-hidden
    >
      <defs>
        <marker
          id="bp-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="#4a7ba7" opacity="0.85" />
        </marker>
      </defs>
      <path className="blueprint-path blueprint-path--red" d={d} />
      <path className="blueprint-path blueprint-path--blue" d={d} />
      <path className="blueprint-path blueprint-path--blue-offset" d={d} />
      <path className="blueprint-path blueprint-path--dash" d={d} markerEnd="url(#bp-arrow)" />
    </svg>
  )
}
