import { useEffect, useState } from 'react'
import {
  deliverableKindIcon,
  groupDeliverables,
  type Deliverable,
} from '../../agent/deliverables'
import type { Plan } from '../../agent/types'

interface DeliveryTrackerSheetProps {
  open: boolean
  plan: Plan | null
  items: Deliverable[]
  isExecuting: boolean
  deliveryComplete: boolean
  awaitingDispatch?: boolean
  onClose: () => void
  onStartDispatch?: () => void
  onRetry: (id: string) => void
  onAcceptFallback: (id: string) => void
  onRejectFallback: (id: string) => void
  onCancel: (id: string) => void
}

function statusLabel(d: Deliverable): string {
  switch (d.status) {
    case 'queued':
      return '排队中'
    case 'dispatching':
      return '派单中'
    case 'in_progress':
      return '进行中'
    case 'done':
      return '已完成'
    case 'failed':
      return '失败'
    case 'fallback_proposed':
      return '需确认'
    default:
      return '待执行'
  }
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="v4-tracker-progress" aria-hidden>
      <div className="v4-tracker-progress-fill" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

function CancelCountdown({
  until,
  onCancel,
}: {
  until: number
  onCancel: () => void
}) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, until - Date.now()))

  useEffect(() => {
    const tick = () => setMsLeft(Math.max(0, until - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [until])

  if (msLeft <= 0) return null

  const totalSec = Math.ceil(msLeft / 1000)
  const mm = Math.floor(totalSec / 60)
  const ss = totalSec % 60
  const label = `${mm}:${ss.toString().padStart(2, '0')}`

  return (
    <div className="v4-tracker-cancel">
      <div className="v4-tracker-cancel-top">
        <span className="v4-tracker-cancel-label">5 分钟内可撤销</span>
        <span className="v4-tracker-cancel-timer" aria-live="polite">
          {label}
        </span>
      </div>
      <button type="button" className="v4-tracker-cancel-btn" onClick={onCancel}>
        撤销此项
      </button>
    </div>
  )
}

export function DeliveryTrackerSheet({
  open,
  plan,
  items,
  isExecuting,
  deliveryComplete,
  awaitingDispatch = false,
  onClose,
  onStartDispatch,
  onRetry,
  onAcceptFallback,
  onRejectFallback,
  onCancel,
}: DeliveryTrackerSheetProps) {
  if (!open) return null

  const selected = items.filter((d) => d.selected)
  const doneCount = selected.filter((d) => d.status === 'done').length
  const needsAttention = selected.some((d) => d.status === 'fallback_proposed')

  const nodeNames = new Map<number, string>()
  plan?.nodes.forEach((n, i) => {
    if (!n.fixed) nodeNames.set(i, n.poi?.name ?? n.name)
  })

  const groups = groupDeliverables(selected, nodeNames)

  return (
    <div className="v4-sheet-overlay" role="dialog" aria-modal="true" aria-label="行程交付进度">
      <button type="button" className="v4-sheet-backdrop" onClick={onClose} aria-label="关闭" />
      <div className="v4-sheet v4-tracker-sheet">
        <div className="v4-sheet-handle" aria-hidden />
        <header className="v4-tracker-head">
          <h2>行程代办进度</h2>
          <p>
            {deliveryComplete
              ? '下午的事我都安排好了'
              : isExecuting
                ? `正在交付 ${doneCount}/${selected.length} 项…`
                : awaitingDispatch
                  ? `已备好 ${selected.length} 项代办 · 点击下方开始执行`
                  : needsAttention
                    ? `${doneCount}/${selected.length} 已完成 · 有 1 项需要你确认`
                    : `${doneCount}/${selected.length} 已完成`}
          </p>
        </header>

        <div className="v4-tracker-guard">
          {awaitingDispatch ? (
            <>
              <span>清单已生成，尚未调用预订接口</span>
              <span>确认后将逐项订位/跑腿/备注</span>
              <span>可在授权页勾选或取消</span>
            </>
          ) : (
            <>
              <span>仅执行你已授权的事项</span>
              <span>失败会先给替代方案</span>
              <span>可撤销项保留倒计时</span>
            </>
          )}
        </div>

        <div className="v4-tracker-body">
          {groups.map((group) => (
            <section key={group.groupTitle} className="v4-tracker-group">
              <h3>{group.groupTitle}</h3>
              <ul>
                {group.items.map((d) => (
                  <li
                    key={d.id}
                    className={`v4-tracker-item v4-tracker-item--${d.status}`}
                  >
                    <div className="v4-tracker-item-head">
                      <span>{deliverableKindIcon(d.kind)}</span>
                      <div>
                        <strong>{d.title}</strong>
                        <span>{d.detail}</span>
                      </div>
                      <span className="v4-tracker-status">{statusLabel(d)}</span>
                    </div>

                    {(d.status === 'queued' ||
                      d.status === 'dispatching' ||
                      d.status === 'in_progress') && (
                      <ProgressBar value={d.progress ?? 0.3} />
                    )}

                    {d.status === 'done' && d.orderId && (
                      <p className="v4-tracker-order">订单号 {d.orderId}</p>
                    )}

                    {d.status === 'done' &&
                      d.cancellableUntil != null &&
                      d.cancellableUntil > Date.now() && (
                        <CancelCountdown
                          until={d.cancellableUntil}
                          onCancel={() => onCancel(d.id)}
                        />
                      )}

                    {d.status === 'fallback_proposed' && d.fallback && (
                      <div className="v4-tracker-fallback">
                        <p className="v4-tracker-fallback-warn">
                          {d.failureReason ?? '暂时无法完成'}
                        </p>
                        <p>
                          AI 已找到替代：{d.fallback.title}
                          {d.fallback.estimatedPrice != null &&
                            ` · ¥${d.fallback.estimatedPrice}`}
                        </p>
                        <div className="v4-tracker-fallback-actions">
                          <button
                            type="button"
                            onClick={() => onAcceptFallback(d.id)}
                          >
                            接受替代
                          </button>
                          <button
                            type="button"
                            className="v4-tracker-ghost"
                            onClick={() => onRejectFallback(d.id)}
                          >
                            跳过此项
                          </button>
                        </div>
                      </div>
                    )}

                    {d.status === 'failed' && (
                      <div className="v4-tracker-fallback">
                        <p>{d.failureReason}</p>
                        <button type="button" onClick={() => onRetry(d.id)}>
                          重试
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="v4-tracker-foot">
          {deliveryComplete && (
            <p className="v4-tracker-done-hint">已自动准备行程分享卡片，可发给家人/朋友</p>
          )}
          {awaitingDispatch && onStartDispatch && (
            <button type="button" className="v4-tracker-start" onClick={onStartDispatch}>
              确认授权并开始代办
            </button>
          )}
          <button
            type="button"
            className={awaitingDispatch ? 'v4-tracker-close v4-tracker-close--secondary' : 'v4-tracker-close'}
            onClick={onClose}
          >
            {deliveryComplete ? '完成' : '收起'}
          </button>
        </footer>
      </div>
    </div>
  )
}
