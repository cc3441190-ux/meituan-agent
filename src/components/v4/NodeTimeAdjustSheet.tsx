import { useEffect, useState } from 'react'
import { formatTime } from '../../agent/constants'
import { formatNodeScheduleDetail, formatNodeTimeRange } from '../../agent/timeline'
import type { PlanNode } from '../../agent/types'

function toTimeInputValue(date?: Date): string {
  if (!date) return '14:00'
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

const DURATION_PRESETS = [45, 60, 75, 90, 120, 150]

interface NodeTimeAdjustSheetProps {
  open: boolean
  node: PlanNode | null
  nodeIndex: number | null
  onClose: () => void
  onApply: (patch: { durationMinutes: number; arrivalTime: string }) => void
  onNudge: (deltaMinutes: number) => void
}

export function NodeTimeAdjustSheet({
  open,
  node,
  nodeIndex,
  onClose,
  onApply,
  onNudge,
}: NodeTimeAdjustSheetProps) {
  const [duration, setDuration] = useState(60)
  const [arrival, setArrival] = useState('14:00')

  useEffect(() => {
    if (!open || !node) return
    setDuration(node.duration > 0 ? node.duration : 60)
    setArrival(toTimeInputValue(node.startTime))
  }, [open, node])

  if (!open || !node || nodeIndex === null || node.fixed) return null

  const scheduleDetail = formatNodeScheduleDetail(node)
  const poiName = node.poi?.name ?? node.name

  return (
    <div className="v4-sheet-overlay" role="dialog" aria-modal="true" aria-label="调节站点时间">
      <button type="button" className="v4-sheet-backdrop" onClick={onClose} aria-label="关闭" />
      <div className="v4-sheet v4-time-adjust-sheet">
        <div className="v4-sheet-handle" aria-hidden />
        <header className="v4-time-adjust-head">
          <span className="v4-time-adjust-eyebrow">调节时间 · 阶段{nodeIndex + 1}</span>
          <h2>{poiName}</h2>
          <p className="v4-time-adjust-current">当前：{formatNodeTimeRange(node)}</p>
          {scheduleDetail && <p className="v4-time-adjust-detail">{scheduleDetail}</p>}
        </header>

        <div className="v4-time-adjust-body">
          <section className="v4-time-adjust-block">
            <label className="v4-time-adjust-label" htmlFor="arrival-time">
              建议到达时间
            </label>
            <div className="v4-time-adjust-row">
              <input
                id="arrival-time"
                type="time"
                className="v4-time-adjust-time-input"
                value={arrival}
                onChange={(e) => setArrival(e.target.value)}
              />
              <button type="button" className="v4-time-adjust-nudge" onClick={() => onNudge(-15)}>
                −15分
              </button>
              <button type="button" className="v4-time-adjust-nudge" onClick={() => onNudge(15)}>
                +15分
              </button>
            </div>
            <p className="v4-time-adjust-hint">含路程、等位与整理时间；改到达会自动重算后续各站</p>
          </section>

          <section className="v4-time-adjust-block">
            <span className="v4-time-adjust-label">停留时长</span>
            <div className="v4-time-adjust-duration-row">
              <button
                type="button"
                className="v4-time-adjust-step"
                onClick={() => setDuration((d) => Math.max(15, d - 15))}
              >
                −15
              </button>
              <span className="v4-time-adjust-duration-value">{duration} 分钟</span>
              <button
                type="button"
                className="v4-time-adjust-step"
                onClick={() => setDuration((d) => Math.min(300, d + 15))}
              >
                +15
              </button>
            </div>
            <div className="v4-time-adjust-presets">
              {DURATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`v4-time-adjust-preset ${duration === m ? 'v4-time-adjust-preset--active' : ''}`}
                  onClick={() => setDuration(m)}
                >
                  {m}分
                </button>
              ))}
            </div>
          </section>

          {node.startTime && node.endTime && (
            <p className="v4-time-adjust-preview">
              预览：约 {formatTime(node.startTime)} 到{' '}
              {formatTime(new Date(node.startTime.getTime() + duration * 60000))} 在该店
            </p>
          )}
        </div>

        <footer className="v4-time-adjust-actions">
          <button type="button" className="v4-time-adjust-btn v4-time-adjust-btn--ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="v4-time-adjust-btn v4-time-adjust-btn--primary"
            onClick={() => onApply({ durationMinutes: duration, arrivalTime: arrival })}
          >
            应用并更新动线
          </button>
        </footer>
      </div>
    </div>
  )
}
