import type { JourneyPhase } from '../../v3/types'

interface PhaseStripProps {
  phases: JourneyPhase[]
  focusIndex: number
  onSelectPhase: (nodeIndex: number) => void
}

export function PhaseStrip({ phases, focusIndex, onSelectPhase }: PhaseStripProps) {
  return (
    <div className="v3-phase-strip" role="tablist" aria-label="行程阶段">
      {phases.map((phase) => (
        <button
          key={phase.id}
          type="button"
          role="tab"
          aria-selected={phase.nodeIndex === focusIndex}
          className={[
            'v3-phase-pill',
            phase.nodeIndex === focusIndex ? 'v3-phase-pill--current' : '',
            `v3-phase-pill--${phase.status}`,
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelectPhase(phase.nodeIndex)}
        >
          <span className="v3-phase-pill-num">阶段{phase.phaseIndex}</span>
          <span className="v3-phase-pill-title">{phase.title}</span>
          {phase.status === 'locked' && <span className="v3-phase-pill-check">✓</span>}
          {phase.status === 'pending' && <span className="v3-phase-pill-dot" />}
        </button>
      ))}
    </div>
  )
}
