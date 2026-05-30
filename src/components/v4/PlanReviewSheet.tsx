import type { Plan } from '../../agent/types'
import type { ProposalCardVM } from '../../v4/types'

interface PlanReviewSheetProps {
  open: boolean
  plan: Plan | null
  proposals: ProposalCardVM[]
  bookingEstimate: number
  onConfirm: () => void
  onClose: () => void
}

export function PlanReviewSheet({
  open,
  plan,
  proposals,
  bookingEstimate,
  onConfirm,
  onClose,
}: PlanReviewSheetProps) {
  if (!open || !plan) return null

  return (
    <div className="v4-sheet-overlay" role="dialog" aria-modal="true" aria-label="方案总览确认">
      <button type="button" className="v4-sheet-backdrop" onClick={onClose} aria-label="关闭" />
      <div className="v4-sheet v4-review-sheet">
        <div className="v4-sheet-handle" aria-hidden />
        <header className="v4-review-head">
          <h2>这是你最终的下午方案</h2>
          <p>确认无误后，进入代办清单核对订花、排队、定金等事项</p>
        </header>

        <div className="v4-review-body">
          <ol className="v4-review-stops">
            {proposals.map((p, i) => {
              const node = plan.nodes[p.nodeIndex]
              const transit = node?.transit
              return (
                <li key={p.id} className="v4-review-stop">
                  {transit && i > 0 && (
                    <div className="v4-review-transit">
                      → {transit.mode === 'walk' ? '步行' : transit.mode === 'drive' ? '驾车' : '前往'}
                      约 {transit.duration} 分钟
                      {transit.mode !== 'walk' && ' · 可代叫车'}
                    </div>
                  )}
                  <div className="v4-review-stop-main">
                    <span className="v4-review-stop-time">{p.timeRange}</span>
                    <strong>{p.poiName}</strong>
                    <span className={`v4-review-stop-status v4-review-stop-status--${p.status}`}>
                      {p.status === 'locked' ? '已确认' : p.status === 'error' ? '需处理' : '待确认'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <footer className="v4-review-foot">
          <p>预估代办费用约 <strong>¥{bookingEstimate}</strong> · 支付前会再次展示规则</p>
          <button type="button" className="v4-review-primary" onClick={onConfirm}>
            确认方案 · 查看代办清单
          </button>
          <button type="button" className="v4-review-secondary" onClick={onClose}>
            再改改
          </button>
        </footer>
      </div>
    </div>
  )
}
