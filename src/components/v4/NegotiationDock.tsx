import { useState } from 'react'
import { VoiceBar } from '../VoiceBar'

interface NegotiationDockProps {
  disabled?: boolean
  diffMessage?: string | null
  onSubmit: (text: string) => void
}

export function NegotiationDock({ disabled, diffMessage, onSubmit }: NegotiationDockProps) {
  const [hint, setHint] = useState('说句话，帮你调整方案…')
  const displayHint = diffMessage ?? hint

  return (
    <div className="v4-dock">
      <VoiceBar
        disabled={disabled}
        statusMessage={displayHint}
        onStatusChange={setHint}
        onSubmit={onSubmit}
      />
    </div>
  )
}
