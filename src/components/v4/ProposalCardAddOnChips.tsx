import { deliverableKindIcon, type Deliverable } from '../../agent/deliverables'

interface ProposalCardAddOnChipsProps {
  addOns: Deliverable[]
  onChipClick: () => void
}

export function ProposalCardAddOnChips({ addOns, onChipClick }: ProposalCardAddOnChipsProps) {
  const chips = addOns.filter((d) => d.kind !== 'booking')
  if (chips.length === 0) return null

  return (
    <div className="v4-addon-chips" onClick={(e) => e.stopPropagation()}>
      <span className="v4-addon-chips-label">一并安排</span>
      {chips.map((d) => (
        <button
          key={d.id}
          type="button"
          className="v4-addon-chip"
          onClick={onChipClick}
        >
          {deliverableKindIcon(d.kind)} {d.kind === 'addon-cake' ? '蛋糕' : d.kind === 'addon-flower' ? '鲜花' : d.kind === 'service-note' ? '备注' : '服务'}
        </button>
      ))}
    </div>
  )
}
