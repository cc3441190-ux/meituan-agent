import {
  deliverableKindIcon,
  type Deliverable,
} from '../../agent/deliverables'

interface PreflightChecklistSheetProps {
  open: boolean
  items: Deliverable[]
  totalPrice: number
  onToggle: (id: string) => void
  onConfirm: () => void
  onClose: () => void
}

function groupLabel(kind: Deliverable['kind']): string {
  if (kind === 'booking') return '站点预订'
  if (kind.startsWith('addon')) return '温馨惊喜（AI 推荐）'
  if (kind.startsWith('logistics')) return '出行服务'
  if (kind === 'service-note') return '餐厅备注'
  return '其他'
}

export function PreflightChecklistSheet({
  open,
  items,
  totalPrice,
  onToggle,
  onConfirm,
  onClose,
}: PreflightChecklistSheetProps) {
  if (!open) return null

  const selectedCount = items.filter((d) => d.selected).length
  const groups = new Map<string, Deliverable[]>()
  for (const d of items) {
    const key = groupLabel(d.kind)
    const list = groups.get(key) ?? []
    list.push(d)
    groups.set(key, list)
  }

  return (
    <div className="v4-sheet-overlay" role="dialog" aria-modal="true" aria-label="行前交付清单">
      <button type="button" className="v4-sheet-backdrop" onClick={onClose} aria-label="关闭" />
      <div className="v4-sheet v4-preflight-sheet">
        <div className="v4-sheet-handle" aria-hidden />
        <header className="v4-preflight-head">
          <h2>确认授权代办清单</h2>
          <p>以下事项会在你确认后执行；涉及支付/不可取消规则时会再次提醒</p>
        </header>

        <div className="v4-preflight-guard">
          <span>不会越权下单</span>
          <span>先锁库存再确认支付</span>
          <span>展示退改/取消规则</span>
        </div>

        <div className="v4-preflight-body">
          {[...groups.entries()].map(([label, groupItems]) => (
            <section key={label} className="v4-preflight-group">
              <h3>{label}</h3>
              <ul>
                {groupItems.map((d) => (
                  <li key={d.id} className={d.selected ? '' : 'v4-preflight-item--off'}>
                    <label className="v4-preflight-item">
                      <input
                        type="checkbox"
                        checked={d.selected}
                        onChange={() => onToggle(d.id)}
                        disabled={!d.recommendedByAI && d.kind === 'booking'}
                      />
                      <span className="v4-preflight-icon">{deliverableKindIcon(d.kind)}</span>
                      <span className="v4-preflight-main">
                        <strong>{d.title}</strong>
                        <span className="v4-preflight-detail">{d.detail}</span>
                        <span className="v4-preflight-rationale">
                          {d.recommendedByAI ? 'AI 推荐 · ' : ''}
                          {d.rationale}
                        </span>
                      </span>
                      {d.estimatedPrice != null && d.estimatedPrice > 0 && (
                        <span className="v4-preflight-price">¥{d.estimatedPrice}</span>
                      )}
                      {d.estimatedPrice === 0 && (
                        <span className="v4-preflight-price v4-preflight-price--free">免费</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="v4-preflight-foot">
          <p className="v4-preflight-summary">
            已选 {selectedCount} 项 · 预计 ¥{totalPrice}
          </p>
          <button type="button" className="v4-preflight-cta" onClick={onConfirm}>
            确认授权并开始代办
          </button>
          <button type="button" className="v4-preflight-secondary" onClick={onClose}>
            再调整一下方案
          </button>
        </footer>
      </div>
    </div>
  )
}
