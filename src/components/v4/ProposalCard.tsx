import { useState } from 'react'
import type { Deliverable } from '../../agent/deliverables'
import { resolveNodeImage } from '../../config/nodeAssets'
import type { ProposalCardVM } from '../../v4/types'
import { ProposalCardAddOnChips } from './ProposalCardAddOnChips'

interface ProposalCardProps {
  card: ProposalCardVM
  addOns?: Deliverable[]
  forceExpanded?: boolean
  onAddOnChipClick?: () => void
  onSelect: () => void
  onSwap: () => void
  onAlternatives: () => void
  onAdjustTime: () => void
  onConfirm: () => void
  onInventoryIssue?: () => void
  swapDisabled?: boolean
}

function StatusBadge({
  card,
  onInventoryIssue,
}: {
  card: ProposalCardVM
  onInventoryIssue?: () => void
}) {
  if (card.status === 'locked') {
    return <span className="v4-proposal-status-badge v4-proposal-status-badge--locked">已锁定</span>
  }
  if (card.status === 'pending') {
    return <span className="v4-proposal-status-badge v4-proposal-status-badge--pending">待确认</span>
  }
  if (card.visualState === 'unavailable' && onInventoryIssue) {
    return (
      <button
        type="button"
        className="v4-proposal-status-badge v4-proposal-status-badge--warn v4-proposal-status-badge--btn"
        onClick={(e) => {
          e.stopPropagation()
          onInventoryIssue()
        }}
      >
        订不到 · 处理
      </button>
    )
  }
  if (card.inventoryLabel) {
    return (
      <span className="v4-proposal-status-badge v4-proposal-status-badge--warn">{card.inventoryLabel}</span>
    )
  }
  return null
}

/** 摘要区已展示的路程/等位/人流，展开区不再重复 */
function filterVerifiedChecks(checks: string[], card: ProposalCardVM, summaryHint: string): string[] {
  return checks.filter((item) => {
    if (card.transitMinutes > 0 && /路程|步行.*\d+\s*分/.test(item)) return false
    if (card.waitMinutes > 0 && /等位/.test(item)) return false
    if (/人流|免排队|有余位|排队/.test(item)) {
      const inSignals = card.qualitySignals.some((s) => /人流|排队|余位|免排队/.test(s))
      if (inSignals) return false
    }
    if (summaryHint && (summaryHint.includes(item) || item.includes(summaryHint.slice(0, 4)))) {
      return false
    }
    return true
  })
}

function filterTransactionChecks(checks: string[], card: ProposalCardVM): string[] {
  return checks.filter((item) => {
    if (card.transitMinutes > 0 && /路程|步行.*\d+\s*分/.test(item)) return false
    return true
  })
}

export function ProposalCard({
  card,
  addOns = [],
  forceExpanded = false,
  onAddOnChipClick,
  onSelect,
  onSwap,
  onAlternatives,
  onAdjustTime,
  onConfirm,
  onInventoryIssue,
  swapDisabled = false,
}: ProposalCardProps) {
  const [localExpanded, setLocalExpanded] = useState(false)
  const expanded = forceExpanded || localExpanded
  const imageSrc = resolveNodeImage({ label: card.sceneLabel })

  const summaryHint =
    card.rationaleBullets[0] ?? card.qualitySignals[0] ?? card.intent

  const extraRationale = card.rationaleBullets
    .slice(1)
    .filter((b) => b !== summaryHint && !summaryHint.includes(b))

  const verifiedChecks = filterVerifiedChecks(card.verifiedChecks, card, summaryHint)
  const transactionChecks = filterTransactionChecks(card.transactionChecks, card)

  const hasDetails =
    extraRationale.length > 0 ||
    verifiedChecks.length > 0 ||
    transactionChecks.length > 0 ||
    addOns.length > 0

  return (
    <article
      className={[
        'v4-proposal-card',
        card.isFocused ? 'v4-proposal-card--focus' : '',
        `v4-proposal-card--${card.visualState}`,
        expanded ? 'v4-proposal-card--expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="v4-proposal-summary"
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      >
        <div className="v4-proposal-visual">
          <img src={imageSrc} alt={card.sceneLabel} draggable={false} />
        </div>

        <div className="v4-proposal-summary-body">
          <div className="v4-proposal-summary-top">
            <span className="v4-proposal-phase">阶段 {card.phaseIndex}</span>
            <StatusBadge card={card} onInventoryIssue={onInventoryIssue} />
          </div>
          <p className="v4-proposal-phase-time text-tabular">{card.timeRange}</p>
          <h3 className="v4-proposal-poi">{card.poiName}</h3>
          {(card.transitMinutes > 0 || card.waitMinutes > 0) && (
            <div className="v4-proposal-commute">
              {card.transitMinutes > 0 && (
                <span className="v4-proposal-commute-tag">🚗 路程约 {card.transitMinutes} 分</span>
              )}
              {card.waitMinutes > 0 && (
                <span className="v4-proposal-commute-tag v4-proposal-commute-tag--wait">
                  ⏳ 预计等位 {card.waitMinutes} 分
                </span>
              )}
            </div>
          )}
          {summaryHint && <p className="v4-proposal-summary-hint">{summaryHint}</p>}
        </div>

        {hasDetails && (
          <button
            type="button"
            className={`v4-proposal-expand-btn ${expanded ? 'v4-proposal-expand-btn--open' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setLocalExpanded((v) => !v)
            }}
            aria-label={expanded ? '收起详情' : '展开 AI 工作明细'}
          >
            ›
          </button>
        )}
      </div>

      {expanded && (
        <div className="v4-proposal-detail">
          {extraRationale.length > 0 && (
            <div className="v4-proposal-detail-block">
              <p className="v4-proposal-detail-label">AI 这样安排</p>
              <ul className="v4-proposal-detail-list">
                {extraRationale.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {verifiedChecks.length > 0 && (
            <div className="v4-proposal-detail-block">
              <p className="v4-proposal-detail-label">已帮你查过</p>
              <p className="v4-proposal-detail-body">{verifiedChecks.join(' · ')}</p>
            </div>
          )}

          {transactionChecks.length > 0 && (
            <div className="v4-proposal-detail-block v4-proposal-detail-block--commerce">
              <p className="v4-proposal-detail-label">下单前会核对</p>
              <p className="v4-proposal-detail-body">{transactionChecks.join(' · ')}</p>
            </div>
          )}

          {addOns.length > 0 && onAddOnChipClick && (
            <ProposalCardAddOnChips addOns={addOns} onChipClick={onAddOnChipClick} />
          )}
        </div>
      )}

      <div className="v4-proposal-foot" onClick={(e) => e.stopPropagation()}>
        <div className="v4-proposal-actions">
          <button type="button" className="v4-proposal-action" onClick={onSwap} disabled={swapDisabled}>
            {swapDisabled ? '换店中…' : '换一个'}
          </button>
          <button type="button" className="v4-proposal-action" onClick={onAlternatives}>
            替代
          </button>
          <button type="button" className="v4-proposal-action" onClick={onAdjustTime}>
            调时间
          </button>
        </div>

        {card.status === 'pending' && (
          <button type="button" className="v4-proposal-confirm" onClick={onConfirm}>
            ✓ 确认
          </button>
        )}
        {card.status === 'locked' && <span className="v4-proposal-locked">已确认</span>}
      </div>
    </article>
  )
}
