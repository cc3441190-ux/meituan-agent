interface ShareConsensusBarProps {
  onOpenInvite: () => void
  disabled?: boolean
  summaryPreview?: string | null
}

export function ShareConsensusBar({
  onOpenInvite,
  disabled,
  summaryPreview,
}: ShareConsensusBarProps) {
  return (
    <div className="share-consensus-bar">
      <div className="share-consensus-copy">
        <span className="share-consensus-eyebrow">One-click Shareable Summary</span>
        <span className="share-consensus-title">一键生成精美社交共识摘要卡</span>
        {summaryPreview && (
          <span className="share-consensus-preview">「{summaryPreview.slice(0, 42)}…」</span>
        )}
      </div>
      <button
        type="button"
        className="share-consensus-cta"
        onClick={onOpenInvite}
        disabled={disabled}
      >
        📮 发给家人看
      </button>
    </div>
  )
}
