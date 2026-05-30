import { type MutableRefObject, useState } from 'react'
import type { Deliverable } from '../../agent/deliverables'
import type { Plan } from '../../agent/types'
import type { ProposalCardVM } from '../../v4/types'
import { ProposalCard } from './ProposalCard'
import { TransitSegmentRow } from './TransitSegmentRow'

interface ProposalCardListProps {
  plan: Plan
  proposals: ProposalCardVM[]
  deliverablesByNode?: Map<number, Deliverable[]>
  cardRefs?: MutableRefObject<Record<number, HTMLDivElement | null>>
  onAddOnChipClick?: () => void
  onSelect: (nodeIndex: number) => void
  onSwap: (nodeIndex: number) => void
  onAlternatives: (nodeIndex: number) => void
  onAdjustTime: (nodeIndex: number) => void
  onConfirm: (nodeIndex: number) => void
  onInventoryIssue?: (nodeIndex: number) => void
  onRequestRide?: (fromIdx: number, toIdx: number) => void
  swappingNodeIdx?: number | null
}

export function ProposalCardList({
  plan,
  proposals,
  deliverablesByNode,
  cardRefs,
  onAddOnChipClick,
  onSelect,
  onSwap,
  onAlternatives,
  onAdjustTime,
  onConfirm,
  onInventoryIssue,
  onRequestRide,
  swappingNodeIdx = null,
}: ProposalCardListProps) {
  const [detailMode, setDetailMode] = useState(false)

  return (
    <div className="v4-proposal-list-wrap">
      {/* ── 标题栏 + 视图切换 ── */}
      <div className="v4-proposal-list-header">
        <h2 className="v4-section-title v4-section-title--inline">下午方案</h2>
        <button
          type="button"
          className={`v4-list-mode-btn ${detailMode ? 'v4-list-mode-btn--active' : ''}`}
          onClick={() => setDetailMode((v) => !v)}
        >
          {detailMode ? '收起明细' : '展开明细'}
        </button>
      </div>

      <div className="v4-proposal-list">
        {proposals.map((card, listIdx) => {
          const node = plan.nodes[card.nodeIndex]
          const nextProposal = proposals[listIdx + 1]
          const nextNode = nextProposal ? plan.nodes[nextProposal.nodeIndex] : null
          const transit = nextNode?.transit

          return (
            <div key={card.id}>
              <div
                ref={(el) => {
                  if (cardRefs) cardRefs.current[card.nodeIndex] = el
                }}
              >
                <ProposalCard
                  card={card}
                  addOns={deliverablesByNode?.get(card.nodeIndex) ?? []}
                  onAddOnChipClick={onAddOnChipClick}
                  forceExpanded={detailMode}
                  onSelect={() => onSelect(card.nodeIndex)}
                  onSwap={() => onSwap(card.nodeIndex)}
                  onAlternatives={() => onAlternatives(card.nodeIndex)}
                  onAdjustTime={() => onAdjustTime(card.nodeIndex)}
                  onConfirm={() => onConfirm(card.nodeIndex)}
                  onInventoryIssue={
                    card.status === 'error' && onInventoryIssue
                      ? () => onInventoryIssue(card.nodeIndex)
                      : undefined
                  }
                  swapDisabled={swappingNodeIdx === card.nodeIndex}
                />
              </div>
              {transit && nextProposal && (
                <TransitSegmentRow
                  transit={transit}
                  fromName={node.poi?.name ?? node.name}
                  toName={nextNode.poi?.name ?? nextNode.name}
                  onRequestRide={
                    onRequestRide
                      ? () => onRequestRide(card.nodeIndex, nextProposal.nodeIndex)
                      : undefined
                  }
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
