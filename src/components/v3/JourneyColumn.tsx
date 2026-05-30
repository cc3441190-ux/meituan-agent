import type { JourneyPhase } from '../../v3/types'

interface JourneyColumnProps {
  phases: JourneyPhase[]
  onSelectPhase: (nodeIndex: number) => void
  onConfirm: (nodeIndex: number) => void
}

export function JourneyColumn({ phases, onSelectPhase, onConfirm }: JourneyColumnProps) {
  return (
    <div className="v3-journey">
      {phases.map((phase) => (
        <article
          key={phase.id}
          className={`v3-phase ${phase.isCurrent ? 'v3-phase--current' : ''} v3-phase--${phase.status}`}
          onClick={() => onSelectPhase(phase.nodeIndex)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelectPhase(phase.nodeIndex)}
        >
          <div className="v3-phase-head">
            <span className="v3-phase-num">阶段 {phase.phaseIndex}</span>
            <span className="v3-phase-intent">{phase.intent}</span>
          </div>
          <div className="v3-phase-time">{phase.timeRange}</div>
          <h3 className="v3-phase-title">{phase.title}</h3>
          {phase.inventoryLabel && (
            <div className="v3-phase-inventory">{phase.inventoryLabel}</div>
          )}
          <p className="v3-phase-summary">{phase.summary}</p>
          <div className="v3-phase-foot">
            <span className={`v3-phase-badge v3-phase-badge--${phase.status}`}>{phase.badge}</span>
            {phase.status === 'pending' && (
              <button
                type="button"
                className="v3-phase-confirm"
                onClick={(e) => {
                  e.stopPropagation()
                  onConfirm(phase.nodeIndex)
                }}
              >
                确认
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
