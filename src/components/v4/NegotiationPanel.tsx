import type { NegotiationItemVM } from '../../v4/types'

interface NegotiationPanelProps {
  items: NegotiationItemVM[]
  title?: string
  onAction: (itemId: string, actionId: string) => void
}

function primaryLabel(item: NegotiationItemVM): string {
  const primary = item.actions.find((a) => a.variant === 'primary')
  return primary?.label ?? '处理'
}

export function NegotiationPanel({ items, title, onAction }: NegotiationPanelProps) {
  const linkedStop = (item: NegotiationItemVM) =>
    item.impacts.find((i) => !i.startsWith('点「') && !i.startsWith('可继续'))

  return (
    <section className="v4-feedback" aria-label="家人反馈">
      <header className="v4-feedback-head">
        <h2 className="v4-feedback-title">
          {title ?? '家人反馈'}
          <span className="v4-feedback-count">{items.length}</span>
        </h2>
      </header>

      <ul className="v4-feedback-list">
        {items.map((item) => {
          const stop = linkedStop(item)
          const ignore = item.actions.find((a) => a.id === 'ignore')

          return (
            <li key={item.id} className="v4-feedback-item">
              <span className="v4-feedback-avatar" aria-hidden>
                {item.avatar}
              </span>

              <div className="v4-feedback-main">
                <p className="v4-feedback-msg">
                  <span className="v4-feedback-who">{item.personName}</span>
                  {item.request}
                </p>
                {stop && <span className="v4-feedback-stop">{stop}</span>}
              </div>

              <div className="v4-feedback-ops">
                <button
                  type="button"
                  className="v4-feedback-cta"
                  onClick={() => onAction(item.id, 'adopt')}
                >
                  {primaryLabel(item)}
                </button>
                {ignore && (
                  <button
                    type="button"
                    className="v4-feedback-skip"
                    onClick={() => onAction(item.id, 'ignore')}
                  >
                    忽略
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
