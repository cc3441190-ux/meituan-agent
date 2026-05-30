interface AgentSummaryBubbleProps {
  summary: string | null
  loading?: boolean
}

export function AgentSummaryBubble({ summary, loading }: AgentSummaryBubbleProps) {
  if (loading && !summary) {
    return (
      <div className="agent-bubble agent-bubble--loading" aria-live="polite">
        <div className="agent-bubble-head">
          <span className="agent-bubble-avatar" aria-hidden>
            🤖
          </span>
          <span className="agent-bubble-label">Agent 建议</span>
        </div>
        <p className="agent-bubble-text">正在为你提炼这趟行程的亮点…</p>
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="agent-bubble" role="note" aria-label="Agent 方案总结">
      <div className="agent-bubble-head">
        <span className="agent-bubble-avatar" aria-hidden>
          🤖
        </span>
        <span className="agent-bubble-label">Agent 建议 · 历史偏好融合</span>
      </div>
      <p className="agent-bubble-text">{summary}</p>
    </div>
  )
}
