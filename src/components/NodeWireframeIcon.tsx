import type { PlanNode } from '../agent/types'

const PATHS: Record<string, string> = {
  indoor_play:
    'M12 4h8v4h-8zm0 6h12v2H12zm-2 8h16v2H10zm4-14h4v2h-4z',
  dining: 'M6 8h12v2H6zm2 4h8v8H8zm10-8h2v12h-2z',
  outdoor: 'M4 18h16M8 14l4-8 4 8M6 6h12',
  default: 'M8 6h8v12H8zm2 2v8h4V8z',
}

function pickPath(node: PlanNode): string {
  if (node.category === 'dining' || node.type.includes('meal') || node.type === 'bbq') {
    return PATHS.dining
  }
  if (node.category === 'entertainment' || node.type === 'indoor_play') {
    return PATHS.indoor_play
  }
  if (node.category === 'outdoor') return PATHS.outdoor
  return PATHS.default
}

export function NodeWireframeIcon({ node }: { node: PlanNode }) {
  return (
    <svg
      className="node-wireframe-icon"
      viewBox="0 0 24 24"
      width={32}
      height={32}
      aria-hidden
    >
      <rect x="1" y="1" width="22" height="22" rx="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d={pickPath(node)} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
