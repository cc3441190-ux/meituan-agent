import type { ExecutionTask } from '../../v2/types'

interface AgentExecutionPanelProps {
  completed: ExecutionTask[]
  running: ExecutionTask[]
  pendingHint: string | null
  collapsed?: boolean
}

export function AgentExecutionPanel({
  completed,
  running,
  pendingHint,
  collapsed,
}: AgentExecutionPanelProps) {
  if (collapsed && completed.length === 0 && running.length === 0) return null

  return (
    <section className="v2-exec-panel" aria-label="Agent 执行状态">
      {completed.length > 0 && (
        <div className="v2-exec-block">
          <div className="v2-exec-block-title">
            AI 已完成 · {completed.length}
          </div>
          <div className="v2-exec-grid">
            {completed.map((t) => (
              <span key={t.id} className="v2-exec-done">
                ✓ {t.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {running.length > 0 && (
        <div className="v2-exec-block">
          <div className="v2-exec-block-title v2-exec-block-title--run">AI 正在执行</div>
          {running.map((t) => (
            <div key={t.id} className="v2-exec-running">
              <div className="v2-exec-running-head">
                <span>⏳ {t.label}</span>
                {t.progress != null && <span className="v2-exec-pct">{t.progress}%</span>}
              </div>
              <div className="v2-exec-bar">
                <div
                  className="v2-exec-bar-fill"
                  style={{ width: `${t.progress ?? 40}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingHint && <p className="v2-exec-pending">{pendingHint}</p>}
    </section>
  )
}
