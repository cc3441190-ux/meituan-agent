import { VoiceBar } from './VoiceBar'

interface BottomDockProps {
  disabled?: boolean
  statusMessage: string
  onStatusChange: (msg: string) => void
  onSubmit: (text: string) => void
  showTripStatus?: boolean
  lockedCount?: number
  bookableCount?: number
  pendingCount?: number
  readyToBook?: boolean
  bookingEstimate?: number
  isExecuting?: boolean
  onExecute?: () => void
}

export function BottomDock({
  disabled,
  statusMessage,
  onStatusChange,
  onSubmit,
  showTripStatus,
  lockedCount = 0,
  bookableCount = 0,
  pendingCount = 0,
  readyToBook,
  bookingEstimate = 0,
  isExecuting,
  onExecute,
}: BottomDockProps) {
  return (
    <div className="bottom-dock">
      {showTripStatus && (
        <div className="bottom-status-bar" role="status" aria-live="polite">
          {isExecuting ? (
            <span className="bottom-status-text">正在锁定席位…</span>
          ) : readyToBook ? (
            <button
              type="button"
              className="bottom-status-bar--action"
              onClick={onExecute}
              disabled={disabled}
            >
              🛡️ 授权 AI 锁定席位 · 约 ¥{bookingEstimate}
            </button>
          ) : lockedCount > 0 ? (
            <span className="bottom-status-text">
              已锁定 {lockedCount}/{bookableCount} 站 · 继续确认剩余行程
            </span>
          ) : pendingCount > 0 ? (
            <span className="bottom-status-text">
              还有 {pendingCount} 站待确认 · 确认后可预订
            </span>
          ) : null}
        </div>
      )}
      <VoiceBar
        disabled={disabled}
        statusMessage={statusMessage}
        onStatusChange={onStatusChange}
        onSubmit={onSubmit}
      />
    </div>
  )
}
