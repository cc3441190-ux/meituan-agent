import type { CollaboratorOpinion } from '../../v2/types'

interface CollaborationStripProps {
  opinions: CollaboratorOpinion[]
  onShare: () => void
}

export function CollaborationStrip({ opinions, onShare }: CollaborationStripProps) {
  return (
    <section className="v2-collab" aria-label="多人协同">
      <div className="v2-collab-avatars">
        {opinions
          .filter((o) => o.role !== 'agent')
          .map((o) => (
            <span key={o.id} className="v2-collab-avatar" title={o.name}>
              {o.avatar}
            </span>
          ))}
        <span className="v2-collab-you">我</span>
      </div>
      <div className="v2-collab-feed">
        {opinions.slice(0, 2).map((o) => (
          <div key={o.id} className={`v2-collab-bubble v2-collab-bubble--${o.role}`}>
            <strong>{o.name}：</strong>
            {o.message}
          </div>
        ))}
      </div>
      <button type="button" className="v2-collab-share" onClick={onShare}>
        邀请卡
      </button>
    </section>
  )
}
