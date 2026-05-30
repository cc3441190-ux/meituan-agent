import type { TimelineItem } from '../../v2/types'
import { StopExecutionCard } from './StopExecutionCard'
import { TransitLegRow } from './TransitLegRow'

interface TimelineColumnProps {
  items: TimelineItem[]
  focusedIndex: number
  onSelectStop: (index: number) => void
  onConfirmStop: (index: number) => void
}

export function TimelineColumn({
  items,
  focusedIndex,
  onSelectStop,
  onConfirmStop,
}: TimelineColumnProps) {
  return (
    <div className="v2-timeline">
      {items.map((item) => {
        if (item.kind === 'transit') {
          return <TransitLegRow key={`t-${item.nodeIndex}`} item={item} />
        }
        return (
          <StopExecutionCard
            key={`s-${item.nodeIndex}`}
            item={item}
            active={item.nodeIndex === focusedIndex}
            onSelect={() => onSelectStop(item.nodeIndex)}
            onConfirm={
              item.status === 'pending' ? () => onConfirmStop(item.nodeIndex) : undefined
            }
          />
        )
      })}
    </div>
  )
}
