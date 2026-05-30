interface PlanDiffBannerProps {
  message: string | null
}

export function PlanDiffBanner({ message }: PlanDiffBannerProps) {
  if (!message) return null

  return (
    <div className="v4-plan-diff" role="status">
      <span className="v4-plan-diff-icon">✦</span>
      <div>
        <p className="v4-plan-diff-title">方案已更新</p>
        <p className="v4-plan-diff-body">{message}</p>
      </div>
    </div>
  )
}
