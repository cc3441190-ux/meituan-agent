import { formatTime } from '../agent/constants'
import { getMapInventoryChip } from '../agent/nodeCopy'
import { AGENT_TYPE_TO_SCENE_LABEL, resolveNodeImage } from '../config/nodeAssets'
import type { PlanNode } from '../agent/types'

interface MapNodeProps {
  node: PlanNode
  index: number
  animate: boolean
  playStamp?: boolean
  onSelect: () => void
}

type VisualState = 'pending' | 'confirmed' | 'loading' | 'error'

function resolveVisualState(node: PlanNode): VisualState {
  if (node.status === 'loading') return 'loading'
  if (node.status === 'confirmed') return 'confirmed'
  if (
    node.status === 'error' ||
    node.conflict === 'no_seat' ||
    node.conflict === 'no_ticket' ||
    node.inventory?.available === false
  ) {
    return 'error'
  }
  return 'pending'
}

export function MapNode({ node, index, animate, playStamp, onSelect }: MapNodeProps) {
  const visual = resolveVisualState(node)
  const sceneLabel =
    node.sceneLabel ?? AGENT_TYPE_TO_SCENE_LABEL[node.type] ?? node.name
  const imageSrc = resolveNodeImage({ label: sceneLabel, agentType: node.type })

  const timeStr = node.fixed
    ? index === 0
      ? '出发'
      : '到达'
    : visual === 'error'
      ? `${formatTime(node.startTime)}-${formatTime(node.endTime)} · 需调整`
      : visual === 'pending'
        ? `${formatTime(node.startTime)}-${formatTime(node.endTime)} · 待确认`
        : `${formatTime(node.startTime)}-${formatTime(node.endTime)}`

  const ariaStatus =
    visual === 'pending'
      ? '待你确认'
      : visual === 'confirmed'
        ? '已锁定'
        : visual === 'loading'
          ? '规划中'
          : '需调整'

  const showLockStamp = visual === 'confirmed' && !node.fixed
  const inventoryChip = getMapInventoryChip(node)

  return (
    <div
      className={`node node--${visual} ${animate ? 'node-pop' : ''} ${playStamp ? 'node--stamp-play' : ''}`}
      style={{ animationDelay: `${index * 0.35}s` }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-label={`${node.poi?.name ?? node.name}，${ariaStatus}，点击查看详情`}
    >
      {visual === 'loading' && <div className="node-badge node-badge--spin" />}

      <div className="signboard">
        <div className={`node-time node-time--above ${visual === 'pending' ? 'node-time--pending' : ''}`}>
          {timeStr}
        </div>
        <div className="sign-wood sign-wood--image">
          {showLockStamp && <span className="node-lock-stamp">✓ 已锁定</span>}
          <img className="node-image" src={imageSrc} alt={sceneLabel} draggable={false} />
        </div>
        <div className="sign-stick" />
      </div>

      <div className="node-name">{node.poi?.name ?? node.name}</div>
      {inventoryChip && (
        <span
          className={`node-map-chip node-map-chip--${inventoryChip.level} ${inventoryChip.pulse ? 'node-map-chip--pulse' : ''}`}
        >
          {inventoryChip.level === 'green' ? '🟢' : inventoryChip.level === 'yellow' ? '🟡' : '🔴'}{' '}
          {inventoryChip.label}
        </span>
      )}
    </div>
  )
}
