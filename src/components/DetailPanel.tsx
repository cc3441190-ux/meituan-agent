import { useMemo, useRef, useState } from 'react'
import { formatTime } from '../agent/constants'
import { buildNodeRationale, getInventoryDisplay, type InventoryLevel } from '../agent/nodeCopy'
import type { Constraints, PlanNode } from '../agent/types'
import { getTransitLabel } from '../config/transitAssets'

interface DetailPanelProps {
  open: boolean
  closing?: boolean
  node: PlanNode | null
  nodeIndex: number | null
  constraints: Constraints
  familyVote?: 'approve' | 'reject' | null
  consensusSnippet?: string | null
  inventoryRefreshing?: boolean
  onClose: () => void
  onChange: () => void
  onDelete: () => void
  onReplan: (command: string) => void
  onConfirm: () => void
  onBook: () => void
  onFamilyVote: (vote: 'approve' | 'reject') => void
}

function inventoryBadgeClass(level: InventoryLevel): string {
  if (level === 'red') return 'inventory-badge inventory-badge--red'
  if (level === 'yellow') return 'inventory-badge inventory-badge--yellow'
  return 'inventory-badge inventory-badge--green'
}

export function DetailPanel({
  open,
  closing,
  node,
  nodeIndex,
  constraints,
  familyVote,
  consensusSnippet,
  inventoryRefreshing,
  onClose,
  onChange,
  onDelete,
  onReplan,
  onConfirm,
  onBook,
  onFamilyVote,
}: DetailPanelProps) {
  const [editCommand, setEditCommand] = useState('')
  const [confirmSquish, setConfirmSquish] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const rationale = useMemo(
    () => (node ? buildNodeRationale(node, constraints) : ''),
    [node, constraints],
  )
  const inventory = useMemo(() => (node ? getInventoryDisplay(node) : null), [node])

  if (!node) return null

  const submitEdit = () => {
    const cmd = editCommand.trim()
    if (!cmd) return
    setEditCommand('')
    onReplan(cmd)
  }

  const handleConfirmClick = () => {
    if (confirmSquish) return
    setConfirmSquish(true)
    window.setTimeout(() => {
      onConfirm()
      setConfirmSquish(false)
    }, 380)
  }

  const isConfirmed = node.status === 'confirmed'
  const poiName = node.poi?.name ?? node.name

  return (
    <>
      <div className={`overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <div
        className={`detail-panel dp2 ${open && !closing ? 'open' : ''} ${closing ? 'detail-panel--closing' : ''}`}
      >
        <div className="panel-handle" />

        <div className="dp2-header">
          <div className="dp2-header-main">
            <span className="dp2-name">{poiName}</span>
            <div className="dp2-meta">
              {node.poi?.rating != null && (
                <span className="dp2-rating">★ {node.poi.rating}</span>
              )}
              {node.poi?.distance != null && <span>{node.poi.distance}km</span>}
              {!node.fixed && node.startTime && node.endTime && (
                <span>
                  {formatTime(node.startTime)}–{formatTime(node.endTime)}
                </span>
              )}
            </div>
          </div>
          {inventory && !node.fixed && (
            <span
              className={`${inventoryBadgeClass(inventory.level)} ${inventoryRefreshing ? 'inventory-badge--checking' : ''} ${inventory.level === 'yellow' ? 'inventory-badge--pulse' : ''}`}
            >
              {inventoryRefreshing ? '核验中…' : inventory.label}
            </span>
          )}
        </div>

        {node.transit && (
          <div className="dp2-transit">
            <span className="dp2-transit-icon">🚗</span>
            <span>
              前往本站 · {getTransitLabel(node.transit.mode)} 约 {node.transit.duration} 分钟
            </span>
          </div>
        )}

        {!node.fixed && rationale && (
          <div className="dp2-voice">
            <span className="dp2-voice-label">Agent 说</span>
            <p className="dp2-voice-text">{rationale}</p>
          </div>
        )}

        {node.conflict === 'no_seat' && (
          <div className="dp2-alert">已检测到无空位，建议换一家或调整时间</div>
        )}
        {node.conflict === 'no_ticket' && (
          <div className="dp2-alert">该时段无票，建议换景点或改时段</div>
        )}
        {node.conflict === 'time_short' && (
          <div className="dp2-alert dp2-alert--warn">
            行程冲突：路程比空档多约 {Math.ceil(node.suggestedDelay ?? 15)} 分钟，建议顺延
          </div>
        )}

        {!node.fixed && (
          <div className="dp2-edit">
            <label className="dp2-edit-label" htmlFor="dp2-edit-input">
              想改这一站？直接说
            </label>
            <div className="dp2-edit-row">
              <input
                ref={inputRef}
                id="dp2-edit-input"
                className="dp2-edit-input"
                placeholder="如「换成轻食店」「延长30分钟」"
                value={editCommand}
                onChange={(e) => setEditCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitEdit()}
              />
              <button
                type="button"
                className="dp2-edit-send"
                onClick={submitEdit}
                disabled={!editCommand.trim()}
                aria-label="发送"
              >
                →
              </button>
            </div>
          </div>
        )}

        <div className="dp2-actions">
          {!node.fixed && (
            <>
              <button type="button" className="dp2-btn" onClick={onChange}>
                换一家
              </button>
              <button type="button" className="dp2-btn dp2-btn--del" onClick={onDelete}>
                删除
              </button>
              {!isConfirmed && (
                <button
                  type="button"
                  className={`dp2-btn dp2-btn--confirm ${confirmSquish ? 'dp2-btn--squish' : ''}`}
                  onClick={handleConfirmClick}
                  disabled={confirmSquish}
                >
                  ✓ 确认此站
                </button>
              )}
            </>
          )}
          {isConfirmed && !node.fixed && (
            <button type="button" className="dp2-btn dp2-btn--book" onClick={onBook}>
              预订此站
            </button>
          )}
        </div>

        {!node.fixed && nodeIndex !== null && (
          <div className="dp2-consensus">
            <span className="dp2-consensus-label">递给家人看 · 这站行不行？</span>
            <div className="dp2-consensus-btns">
              <button
                type="button"
                className={`consensus-btn consensus-btn--approve ${familyVote === 'approve' ? 'active' : ''}`}
                onClick={() => onFamilyVote('approve')}
              >
                赞成
              </button>
              <button
                type="button"
                className={`consensus-btn consensus-btn--reject ${familyVote === 'reject' ? 'active' : ''}`}
                onClick={() => onFamilyVote('reject')}
              >
                换一个
              </button>
            </div>
            {consensusSnippet && <p className="detail-consensus-snippet">{consensusSnippet}</p>}
          </div>
        )}
      </div>
    </>
  )
}
