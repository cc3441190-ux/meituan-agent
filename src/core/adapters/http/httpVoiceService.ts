import type { IVoiceService } from '../../ports'

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: {
      transcript: string
    }
  }>
}

type SpeechRecognitionErrorEventLike = {
  error: string
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionCtor
    SpeechRecognition?: SpeechRecognitionCtor
  }
}

const ERROR_HINTS: Record<string, string> = {
  'not-allowed':
    '麦克风权限被拒绝：请在浏览器地址栏左侧打开站点权限，允许麦克风后刷新重试。',
  network:
    '语音识别服务连不上（国内网络常见）。请改用文字输入，或换 Chrome/Edge 并确保能访问外网语音服务。',
  'service-not-allowed': '当前环境不允许语音服务，请使用 https:// 或 localhost 访问。',
  'audio-capture': '未检测到麦克风设备，请检查系统麦克风是否可用。',
  'no-speech': '没有听到声音，请按住按钮多说 1～2 秒，靠近麦克风再试。',
  aborted: '录音时间太短，请按住说话按钮多说一会儿再松开。',
}

export function getSpeechSupportIssue(): string | null {
  const host = window.location.hostname
  const local = host === 'localhost' || host === '127.0.0.1'
  if (!window.isSecureContext && !local) {
    return '语音输入需要 HTTPS 或 localhost 环境'
  }
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    return '当前浏览器不支持语音，请使用 Chrome / Edge 最新版'
  }
  return null
}

async function ensureMicrophonePermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  stream.getTracks().forEach((t) => t.stop())
}

export class HttpVoiceService implements IVoiceService {
  readonly mode = 'live' as const
  private recognition: SpeechRecognitionLike | null = null
  private latestText = ''
  private manuallyStopped = false
  private settled = false

  isSupported(): boolean {
    return getSpeechSupportIssue() === null
  }

  async startListening(onPartial?: (text: string) => void): Promise<string> {
    const supportIssue = getSpeechSupportIssue()
    if (supportIssue) throw new Error(supportIssue)

    if (this.recognition) {
      try {
        this.recognition.abort()
      } catch {
        /* ignore */
      }
      this.recognition = null
    }

    try {
      await ensureMicrophonePermission()
    } catch {
      throw new Error(ERROR_HINTS['not-allowed'])
    }

    this.latestText = ''
    this.manuallyStopped = false
    this.settled = false

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) throw new Error('当前浏览器不支持语音识别')

    const recognition = new Ctor()
    this.recognition = recognition
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.continuous = true

    return new Promise<string>((resolve, reject) => {
      const finish = (fn: () => void) => {
        if (this.settled) return
        this.settled = true
        this.cleanup()
        fn()
      }

      recognition.onresult = (event) => {
        let combined = ''
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript
        }
        combined = combined.trim()
        if (!combined) return
        this.latestText = combined
        onPartial?.(combined)
      }

      recognition.onerror = (event) => {
        const code = event.error
        if ((code === 'aborted' || code === 'no-speech') && this.latestText.trim()) {
          return
        }
        if (code === 'aborted' && this.manuallyStopped) {
          return
        }
        finish(() => reject(new Error(ERROR_HINTS[code] ?? `语音识别失败: ${code}`)))
      }

      recognition.onend = () => {
        const text = this.latestText.trim()
        if (text) {
          finish(() => resolve(text))
          return
        }
        if (this.manuallyStopped) {
          finish(() => reject(new Error('语音识别已取消')))
          return
        }
        finish(() => reject(new Error(ERROR_HINTS['no-speech'])))
      }

      try {
        recognition.start()
      } catch (err) {
        finish(() =>
          reject(err instanceof Error ? err : new Error('无法启动语音识别，请稍后重试')),
        )
      }
    })
  }

  stopListening(): void {
    this.manuallyStopped = true
    if (!this.recognition) return
    try {
      this.recognition.stop()
    } catch {
      try {
        this.recognition.abort()
      } catch {
        /* ignore */
      }
    }
  }

  private cleanup() {
    this.recognition = null
  }
}
