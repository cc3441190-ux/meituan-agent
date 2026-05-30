import type { ProposalViewModel } from '../../v4/types'

interface PlanSummaryHeaderProps {
  vm: ProposalViewModel
  onShare?: () => void
}

export function PlanSummaryHeader({ vm, onShare }: PlanSummaryHeaderProps) {
  const isLoading = vm.planTitle.includes('正在生成')

  return (
    <header className="v4-plan-header">
      {!isLoading && (
        <p className="v4-scene-understood">已理解：这是一个「{vm.sceneLabel}」</p>
      )}

      <p className="v4-plan-eyebrow">
        {isLoading ? vm.planSubtitle : 'AI 已为你安排了一个'}
      </p>

      <div className="v4-plan-title-row">
        <h1 className="v4-plan-title">
          {isLoading ? vm.planTitle : `「${vm.planTitle}」`}
        </h1>
        {onShare && !isLoading && (
          <button type="button" className="v4-plan-share" onClick={onShare}>
            {vm.shareButtonLabel}
          </button>
        )}
      </div>

      {!isLoading && (
        <div className="v4-plan-header-body">
          <p className="v4-scene-meta">
            {vm.detectedPeople} · {vm.planningIntent}
          </p>

          <div className="v4-plan-stats" aria-label="方案概览">
            <span className="v4-plan-stat">{vm.timeRange}</span>
            <span className="v4-plan-stat">
              {vm.budgetLabel} {vm.budgetDisplay}
            </span>
            <span className="v4-plan-stat">步行 {vm.walkDistance}</span>
            <span className="v4-plan-stat">{vm.stopCount} 站</span>
          </div>

          <div className="v4-plan-chips">
            <span className="v4-plan-chip v4-plan-chip--auto">已自动兼顾</span>
            {vm.constraintChips.map((c) => (
              <span key={c.id} className="v4-plan-chip">
                {c.label}
              </span>
            ))}
          </div>

          {vm.schemeSummary && <p className="v4-plan-summary">{vm.schemeSummary}</p>}
        </div>
      )}
    </header>
  )
}
