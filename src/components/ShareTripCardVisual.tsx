import type { Ref } from 'react'
import type { InviteCard } from '../core/ports'

interface ShareTripCardVisualProps {
  card: InviteCard
  audience: 'partner' | 'friends'
  /** 用于导出截图时挂 ref */
  exportRef?: Ref<HTMLDivElement>
}

const AUDIENCE_LABEL: Record<'partner' | 'friends', string> = {
  partner: '家人同行',
  friends: '朋友聚会',
}

export function ShareTripCardVisual({ card, audience, exportRef }: ShareTripCardVisualProps) {
  return (
    <div className="share-trip-card" ref={exportRef} aria-label="行程分享卡片">
      <div className="share-trip-card__glow" aria-hidden />
      <header className="share-trip-card__head">
        <span className="share-trip-card__badge">美团 Agent · 本地行程</span>
        <span className="share-trip-card__audience">{AUDIENCE_LABEL[audience]}</span>
        <h3 className="share-trip-card__title">{card.headline}</h3>
        {card.body ? <p className="share-trip-card__tagline">{card.body}</p> : null}
      </header>

      <div className="share-trip-card__route">
        <span className="share-trip-card__route-icon" aria-hidden>
          🗺
        </span>
        <p>{card.routeLine}</p>
      </div>

      <ol className="share-trip-card__timeline">
        {card.stops.map((stop, i) => (
          <li key={`${stop.time}-${stop.name}-${i}`}>
            <span className="share-trip-card__dot" aria-hidden />
            <div className="share-trip-card__stop">
              <time>{stop.time}</time>
              <strong>{stop.name}</strong>
            </div>
          </li>
        ))}
      </ol>

      <footer className="share-trip-card__foot">
        <span>扫码或打开链接可查看完整动线与订座状态</span>
        <em>AI 规划 · 已校验库存</em>
      </footer>
    </div>
  )
}
