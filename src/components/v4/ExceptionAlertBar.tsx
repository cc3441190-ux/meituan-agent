import type { ExceptionAlertVM } from '../../v4/exceptionNegotiation'

interface ExceptionAlertBarProps {
  alert: ExceptionAlertVM
  onAction: (actionId: string) => void
  onDismiss?: () => void
}

const KIND_LABEL: Record<ExceptionAlertVM['kind'], string> = {
  inventory: '无座',
  ticket: '无票',
  schedule: '冲突',
  delivery: '交付',
  delay: '行程',
  weather: '天气',
}

export function ExceptionAlertBar({ alert, onAction, onDismiss }: ExceptionAlertBarProps) {
  return (
    <div className={`v4-exception-bar v4-exception-bar--${alert.kind}`} role="alert">
      <div className="v4-exception-bar-main">
        <span className="v4-exception-bar-kind">{KIND_LABEL[alert.kind]}</span>
        <strong>{alert.title}</strong>
        <p>{alert.message}</p>
        {alert.impacts.length > 0 && (
          <div className="v4-exception-bar-impacts">
            {alert.impacts.map((i) => (
              <span key={i}>{i}</span>
            ))}
          </div>
        )}
      </div>
      <div className="v4-exception-bar-actions">
        {alert.actions.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`v4-exception-bar-btn v4-exception-bar-btn--${a.variant}`}
            onClick={() => onAction(a.id)}
          >
            {a.label}
          </button>
        ))}
        {onDismiss && (
          <button type="button" className="v4-exception-bar-btn v4-exception-bar-btn--ghost" onClick={onDismiss}>
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
