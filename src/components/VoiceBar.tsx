import { useState } from 'react'
import { usePlannerServices } from '../core/context'

interface VoiceBarProps {
  disabled?: boolean
  statusMessage: string
  onStatusChange: (msg: string) => void
  onSubmit: (text: string) => void
}

export function VoiceBar({ disabled, statusMessage, onStatusChange, onSubmit }: VoiceBarProps) {
  const { voice } = usePlannerServices()
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)

  const toggleVoice = async () => {
    if (disabled || !voice.isSupported()) return

    if (listening) {
      voice.stopListening()
      setListening(false)
      onStatusChange('说句话或输入，帮你调整路线...')
      return
    }

    setListening(true)
    onStatusChange('我在听...')

    try {
      const text = await voice.startListening((partial) => onStatusChange(partial))
      setInput(text)
      onStatusChange(`识别到：「${text}」`)
      onSubmit(text)
    } catch {
      onStatusChange('语音识别已取消')
    } finally {
      setListening(false)
    }
  }

  const send = () => {
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    onSubmit(text)
  }

  return (
    <div className="voice-bar">
      <button
        type="button"
        className={`mic-btn ${listening ? 'listening' : ''}`}
        onClick={toggleVoice}
        disabled={disabled}
        aria-label="语音输入"
        title={voice.mode === 'mock' ? 'Mock 语音（接入 ASR 后替换）' : '语音输入'}
      >
        🎙️
      </button>
      <input
        type="text"
        className="text-input"
        placeholder={statusMessage}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        disabled={disabled}
      />
      <button type="button" className="send-btn" onClick={send} disabled={disabled} aria-label="发送">
        ➤
      </button>
    </div>
  )
}
