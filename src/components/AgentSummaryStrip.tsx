interface AgentSummaryStripProps {
  summary: string | null
  loading?: boolean
  onShare: () => void
  shareDisabled?: boolean
}

export function AgentSummaryStrip({
  summary,
  loading,
  onShare,
  shareDisabled,
}: AgentSummaryStripProps) {
  if (!loading && !summary) return null

  return (
    <div className="agent-summary-strip">
      <p className="agent-summary-strip-text">
        {loading ? 'Agent 正在提炼这趟行程…' : summary}
      </p>
      <button
        type="button"
        className="agent-summary-share-icon"
        onClick={onShare}
        disabled={shareDisabled}
        aria-label="发给家人看 · 生成邀请卡"
        title="发给家人看"
      >
        <span aria-hidden>📮</span>
      </button>
    </div>
  )
}
