import type { CollaboratorOpinion } from '../../v3/types'

interface CollaborationStripV3Props {
  opinions: CollaboratorOpinion[]
  onShare: () => void
}

export function CollaborationStripV3({ opinions, onShare }: CollaborationStripV3Props) {
  return (
    <section className="v3-collab" aria-label="多人协同">
      <div className="v3-collab-avatars">
        {opinions
          .filter((o) => o.role !== 'agent')
          .map((o) => (
            <span key={o.id} className="v3-collab-avatar" title={o.name}>
              {o.avatar}
            </span>
          ))}
      </div>
      <div className="v3-collab-feed">
        {opinions.slice(0, 2).map((o) => (
          <div key={o.id} className={`v3-collab-row v3-collab-row--${o.role}`}>
            <span className="v3-collab-msg">
              {o.name}：{o.message}
            </span>
            {o.resolution && <span className="v3-collab-res">{o.resolution}</span>}
          </div>
        ))}
      </div>
      <button type="button" className="v3-collab-share" onClick={onShare}>
        邀请卡
      </button>
    </section>
  )
}
