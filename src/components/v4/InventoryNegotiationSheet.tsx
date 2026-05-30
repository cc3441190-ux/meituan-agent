import type { ExceptionAlertVM } from '../../v4/exceptionNegotiation'

interface InventoryNegotiationSheetProps {
  open: boolean
  alert: ExceptionAlertVM | null
  onAction: (actionId: string) => void
  onClose: () => void
}

export function InventoryNegotiationSheet({
  open,
  alert,
  onAction,
  onClose,
}: InventoryNegotiationSheetProps) {
  if (!open || !alert) return null

  return (
    <div className="v4-sheet-overlay" role="dialog" aria-modal="true" aria-label="库存协商">
      <button type="button" className="v4-sheet-backdrop" onClick={onClose} aria-label="关闭" />
      <div className="v4-sheet v4-inventory-sheet">
        <div className="v4-sheet-handle" aria-hidden />
        <header className="v4-inventory-head">
          <span className="v4-inventory-eyebrow">需你决定 · 不会自动替换</span>
          <h2>{alert.title}</h2>
          <p>{alert.message}</p>
        </header>
        <div className="v4-inventory-body">
          <ul className="v4-inventory-impacts">
            {alert.impacts.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
        <footer className="v4-inventory-actions">
          {alert.actions.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`v4-inventory-btn v4-inventory-btn--${a.variant}`}
              onClick={() => onAction(a.id)}
            >
              {a.label}
            </button>
          ))}
        </footer>
      </div>
    </div>
  )
}
