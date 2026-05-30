import type { IVoiceService } from '../../ports'

const DEMO_PHRASES = [
  '把餐厅换成轻食店',
  '删除第二站',
  '第一家太远了换一家',
  '重新规划一下',
]

/** Mock 语音 —— 替换为 HttpVoiceService / Web Speech API 实现 */
export class MockVoiceService implements IVoiceService {
  readonly mode = 'mock' as const
  private active = false

  isSupported() {
    return true
  }

  async startListening(onPartial?: (text: string) => void): Promise<string> {
    this.active = true
    onPartial?.('我在听…')
    await delay(1800)
    if (!this.active) throw new Error('已取消')
    const text = DEMO_PHRASES[Math.floor(Math.random() * DEMO_PHRASES.length)]
    onPartial?.(text)
    this.active = false
    return text
  }

  stopListening() {
    this.active = false
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
