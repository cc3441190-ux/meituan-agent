import { getNodePosition } from '../agent/constants'

const MARKERS = [
  { icon: '📍', label: 'POI数据校验中...' },
  { icon: '💻', label: 'API工具调度中...' },
  { icon: '🚚', label: '异常兜底路线规划中...' },
] as const

interface AgentThinkingMarkersProps {
  nodeCount: number
  visible: boolean
}

export function AgentThinkingMarkers({ nodeCount, visible }: AgentThinkingMarkersProps) {
  if (!visible || nodeCount < 2) return null

  const total = nodeCount
  const positions = MARKERS.map((m, i) => {
    const idx = Math.min(total - 1, Math.max(1, Math.round((i + 1) * ((total - 1) / (MARKERS.length + 1)))))
    return { ...m, pos: getNodePosition(idx, total) }
  })

  return (
    <div className="agent-thinking-layer" aria-hidden>
      {positions.map((item) => (
        <div
          key={item.label}
          className="agent-thinking-marker"
          style={{ left: item.pos.x + 24, top: item.pos.y - 8 }}
        >
          <span className="agent-thinking-icon">{item.icon}</span>
          <span className="agent-thinking-label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
