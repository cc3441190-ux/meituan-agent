import type { TimelineStopItem } from '../../v2/types'

interface StopExecutionCardProps {
  item: TimelineStopItem
  active: boolean
  onSelect: () => void
  onConfirm?: () => void
}

export function StopExecutionCard({ item, active, onSelect, onConfirm }: StopExecutionCardProps) {
  return (
    <article
      className={`v2-stop-card v2-stop-card--${item.status} ${active ? 'v2-stop-card--active' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="v2-stop-card-head">
        <div>
          <time className="v2-stop-time">{item.time}</time>
          <h3 className="v2-stop-title">{item.title}</h3>
        </div>
        <span className={`v2-stop-badge v2-stop-badge--${item.status}`}>{item.badge}</span>
      </div>

      {item.inventoryLabel && (
        <div className={`v2-stop-inventory v2-stop-inventory--${item.status}`}>
          {item.inventoryLabel}
        </div>
      )}

      <ul className="v2-stop-facts">
        {item.facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      {item.apiFreshness && <div className="v2-stop-trust">{item.apiFreshness}</div>}

      {item.isBookable && item.status === 'pending' && onConfirm && (
        <button
          type="button"
          className="v2-stop-confirm"
          onClick={(e) => {
            e.stopPropagation()
            onConfirm()
          }}
        >
          确认此站
        </button>
      )}
    </article>
  )
}
