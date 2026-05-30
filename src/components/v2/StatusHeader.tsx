import type { ConstraintTag } from '../../v2/types'

interface StatusHeaderProps {
  title: string
  tags: ConstraintTag[]
  weatherNote: string
  onShare?: () => void
}

export function StatusHeader({ title, tags, weatherNote, onShare }: StatusHeaderProps) {
  return (
    <header className="v2-status-header">
      <div className="v2-status-header-top">
        <h1 className="v2-status-title">{title}</h1>
        {onShare && (
          <button type="button" className="v2-share-pill" onClick={onShare} aria-label="分享行程">
            Share
          </button>
        )}
      </div>
      <div className="v2-tag-row">
        {tags.map((t) => (
          <span key={t.id} className="v2-tag">
            {t.label}
          </span>
        ))}
      </div>
      <p className="v2-weather-note">{weatherNote}</p>
    </header>
  )
}
