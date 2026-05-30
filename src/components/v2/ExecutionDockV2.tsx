import { VoiceBar } from '../VoiceBar'

interface ExecutionDockV2Props {
  disabled?: boolean
  statusMessage: string
  onStatusChange: (msg: string) => void
  onSubmit: (text: string) => void
  tripStatus?: string | null
  readyToBook?: boolean
  bookingEstimate?: number
  isExecuting?: boolean
  onExecute?: () => void
}

export function ExecutionDockV2({
  disabled,
  statusMessage,
  onStatusChange,
  onSubmit,
  tripStatus,
  readyToBook,
  bookingEstimate,
  isExecuting,
  onExecute,
}: ExecutionDockV2Props) {
  return (
    <div className="v2-dock">
      {tripStatus && !readyToBook && (
        <div className="v2-dock-status">{tripStatus}</div>
      )}
      {readyToBook && !isExecuting && (
        <button
          type="button"
          className="v2-dock-shield"
          onClick={onExecute}
          disabled={disabled}
        >
          🛡️ 授权并完成下午行程（约 ¥{bookingEstimate}）
        </button>
      )}
      {isExecuting && (
        <div className="v2-dock-status v2-dock-status--run">正在锁定席位…</div>
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
