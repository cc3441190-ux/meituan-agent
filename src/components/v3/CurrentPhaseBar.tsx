import type { CurrentPhaseInfo } from '../../v3/types'

export function CurrentPhaseBar({ phase }: { phase: CurrentPhaseInfo | null }) {
  if (!phase) return null

  return (
    <div className="v3-current-bar" role="status">
      <div className="v3-current-bar-accent" aria-hidden />
      <div className="v3-current-bar-body">
        <span className="v3-current-label">
          当前 · 阶段 {phase.phaseIndex} {phase.intent}
        </span>
        <span className="v3-current-title">{phase.title}</span>
        <span className="v3-current-meta">
          预计 {phase.endTime} 结束
          {phase.nextLeg ? ` · 下一程 ${phase.nextLeg}` : ''}
        </span>
      </div>
    </div>
  )
}
