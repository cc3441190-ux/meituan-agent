interface ExecutionSummaryBarProps {
  line: string
  ctaLabel: string
  readyToBook: boolean
  isExecuting: boolean
  disabled?: boolean
  deliveryStarted?: boolean
  deliveryComplete?: boolean
  deliverablesSelectedCount?: number
  deliverablesDoneCount?: number
  onExecute?: () => void
  onOpenTracker?: () => void
}

export function ExecutionSummaryBar({
  line,
  ctaLabel,
  readyToBook,
  isExecuting,
  disabled,
  deliveryStarted = false,
  deliveryComplete = false,
  deliverablesSelectedCount = 0,
  deliverablesDoneCount = 0,
  onExecute,
  onOpenTracker,
}: ExecutionSummaryBarProps) {
  const showPreflightCta = readyToBook && !deliveryStarted && !isExecuting
  const showTrackerCta = deliveryStarted || isExecuting || deliveryComplete

  return (
    <div className="v4-exec-summary">
      <p className="v4-exec-line">
        {isExecuting
          ? `正在执行已授权代办 ${deliverablesDoneCount}/${deliverablesSelectedCount || '?'} 项…`
          : deliveryComplete
            ? '全部已交付 · 可发给家人确认'
            : line}
      </p>
      {!deliveryStarted && !isExecuting && (
        <p className="v4-exec-safe-note">下单/支付前会展示价格、库存和取消规则</p>
      )}
      {showPreflightCta && (
        <button
          type="button"
          className="v4-exec-cta"
          onClick={onExecute}
          disabled={disabled}
        >
          {ctaLabel}
        </button>
      )}
      {showTrackerCta && (
        <button
          type="button"
          className="v4-exec-cta v4-exec-cta--tracker"
          onClick={onOpenTracker}
        >
          {deliveryComplete
            ? '查看交付单 · 发给老婆'
            : isExecuting
              ? `行程交付中 ${deliverablesDoneCount}/${deliverablesSelectedCount}`
              : '查看行程交付单'}
        </button>
      )}
    </div>
  )
}
