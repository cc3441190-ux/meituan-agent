import { useEffect, useMemo, useRef, useState } from 'react'
import { isMockMode } from '../../config/env'
import { usePlannerServices } from '../../core/context'
import { getServiceModeLabel } from '../../core/services'
import type { Constraints } from '../../agent/types'
import { isVagueIntent } from '../../agent/intentRules'
import { inferIntentBudget } from '../../v4/inferIntentBudget'
import {
  constraintsToFormState,
  defaultIntentFormState,
  formStateToConstraints,
  type IntentFormState,
} from '../../v4/intentConstraintForm'
import { IntentUnderstandingFields } from './IntentUnderstandingFields'
import { MockKeyboard } from './MockKeyboard'

type IntentInputScreenProps = {
  isPlanning: boolean
  onGenerate: (prompt: string, constraints?: Constraints) => void
}

const examplePrompts = [
  '今天下午想和老婆、5岁的儿子一起出去玩，帮我规划一个轻松点的路线',
  '周末想安排一次亲子一日游，别太累，最好有室内备选',
  '今晚想和女朋友约会，预算不要太高，想有点氛围感',
  '下雨天想带老人和孩子出门，帮我找舒服一点的安排',
]

export function IntentInputScreen({ isPlanning, onGenerate }: IntentInputScreenProps) {
  const services = usePlannerServices()
  const { voice, planning } = services
  const modeLabel = getServiceModeLabel(services)

  const [text, setText] = useState('')
  const [constraints, setConstraints] = useState<Constraints | null>(null)
  const [form, setForm] = useState<IntentFormState>(defaultIntentFormState)
  const [formTouched, setFormTouched] = useState(false)
  const [budgetTouched, setBudgetTouched] = useState(false)
  const [parsingIntent, setParsingIntent] = useState(false)
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'transcribing' | 'recognized'>(
    'idle',
  )
  const [isPressing, setIsPressing] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [inputFocused, setInputFocused] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const pressStartedAt = useRef<number | null>(null)
  const pressStartY = useRef<number | null>(null)
  const recordTicker = useRef<number | null>(null)
  const parseTimer = useRef<number | null>(null)
  const listenPromiseRef = useRef<Promise<string> | null>(null)
  const isListeningRef = useRef(false)

  const canGenerate = text.trim().length > 0 && !isPlanning

  useEffect(() => {
    return () => {
      if (recordTicker.current) window.clearInterval(recordTicker.current)
      if (parseTimer.current) window.clearTimeout(parseTimer.current)
      voice.stopListening()
    }
  }, [voice])

  useEffect(() => {
    const trimmed = text.trim()
    if (!trimmed) {
      setConstraints(null)
      setForm(defaultIntentFormState())
      setFormTouched(false)
      setBudgetTouched(false)
      return
    }

    if (parseTimer.current) window.clearTimeout(parseTimer.current)
    parseTimer.current = window.setTimeout(() => {
      setParsingIntent(true)
      planning
        .resolveConstraints(trimmed)
        .then((c) => setConstraints(c))
        .catch(() => setConstraints(planning.parseIntent(trimmed)))
        .finally(() => setParsingIntent(false))
    }, isMockMode ? 120 : 450)

    return () => {
      if (parseTimer.current) window.clearTimeout(parseTimer.current)
    }
  }, [text, planning])

  useEffect(() => {
    if (!constraints || formTouched) return
    setForm(constraintsToFormState(constraints, text))
    if (!budgetTouched) {
      const inferred = inferIntentBudget(text)
      if (inferred.level !== 'unknown') {
        setForm((prev) => ({
          ...prev,
          budget:
            inferred.level === 'low' || inferred.level === 'high'
              ? inferred.level
              : 'medium',
        }))
      }
    }
  }, [constraints, text, formTouched, budgetTouched])

  const isVagueInput = isVagueIntent(text)

  const budgetPreview = useMemo(() => inferIntentBudget(text), [text])
  const budgetLabel = budgetPreview.label

  const patchForm = (patch: Partial<IntentFormState>) => {
    setFormTouched(true)
    setForm((prev) => ({ ...prev, ...patch }))
  }

  const handleGenerate = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const merged = formStateToConstraints(form, constraints, trimmed)
    onGenerate(trimmed, merged)
  }

  const startVoicePress = () => {
    if (isPlanning || voiceState === 'listening' || !voice.isSupported()) return
    setVoiceError(null)
    pressStartedAt.current = Date.now()
    setIsCanceling(false)
    setRecordSeconds(0)
    if (recordTicker.current) window.clearInterval(recordTicker.current)
    recordTicker.current = window.setInterval(() => {
      if (!pressStartedAt.current) return
      const elapsed = Math.floor((Date.now() - pressStartedAt.current) / 1000)
      setRecordSeconds(elapsed)
    }, 200)
    setIsPressing(true)
    isListeningRef.current = true
    setVoiceState('listening')
    const listenPromise = voice.startListening((partial) => {
      if (partial.trim()) setText(partial)
    })
    listenPromiseRef.current = listenPromise
    void listenPromise.catch((err) => {
      if (!isListeningRef.current) return
      setVoiceError(err instanceof Error ? err.message : '语音识别失败')
      setVoiceState('idle')
      isListeningRef.current = false
    })
  }

  const updateCancelIntent = (clientY: number) => {
    if (!isPressing || pressStartY.current === null) return
    const deltaY = pressStartY.current - clientY
    setIsCanceling(deltaY > 48)
  }

  const beginVoicePress = (clientY?: number) => {
    if (typeof clientY === 'number') {
      pressStartY.current = clientY
    } else {
      pressStartY.current = null
    }
    startVoicePress()
  }

  const finishVoicePress = async () => {
    if (!isListeningRef.current) return
    isListeningRef.current = false
    setIsPressing(false)
    pressStartedAt.current = null
    pressStartY.current = null
    if (recordTicker.current) {
      window.clearInterval(recordTicker.current)
      recordTicker.current = null
    }
    setRecordSeconds(0)

    if (isCanceling) {
      voice.stopListening()
      listenPromiseRef.current = null
      setIsCanceling(false)
      setVoiceState('idle')
      return
    }

    setVoiceState('transcribing')
    try {
      voice.stopListening()
      const finalText = (await listenPromiseRef.current)?.trim() ?? text.trim()
      listenPromiseRef.current = null
      if (finalText) {
        setText(finalText)
        setVoiceState('recognized')
      } else {
        setVoiceError('未识别到语音，请重试或使用文字输入')
        setVoiceState('idle')
      }
    } catch (err) {
      listenPromiseRef.current = null
      setVoiceError(err instanceof Error ? err.message : '语音识别失败')
      setVoiceState('idle')
    }
  }

  const recordDuration = `00:${String(Math.min(recordSeconds, 59)).padStart(2, '0')}`

  return (
    <div className={`v4-intent-screen ${inputFocused ? 'v4-intent-screen--keyboard' : ''}`}>
      <div className="v4-intent-scroll-content">
        <header className="v4-intent-hero">
          <p className="v4-scene-understood">
            AI 出行助理 · <span>{modeLabel}</span>
          </p>
          <h1>今天想怎么安排？</h1>
          <p>先说你的想法，AI 会先理解你的场景，再给你生成可执行的出行方案。</p>
        </header>

        <section className="v4-intent-card">
          <div className="v4-intent-card-head">
            <span>AI 理解预览</span>
            <small>
              {parsingIntent ? 'AI 识别中…' : text ? '可修改后生成' : '等待输入'}
            </small>
          </div>

          <IntentUnderstandingFields
            form={form}
            disabled={!text.trim()}
            isVague={isVagueInput}
            budgetLabel={budgetLabel}
            onChange={patchForm}
            onBudgetChange={(budget) => {
              setBudgetTouched(true)
              setFormTouched(true)
              setForm((prev) => ({ ...prev, budget }))
            }}
          />

          {isVagueInput && (
            <div className="v4-intent-vague-hint">
              <span>🎲</span>
              <span>检测到「随便」——AI 将按当前周边热门路线自动配比，生成后可逐站调整</span>
            </div>
          )}
        </section>

        <section className="v4-intent-trust-card">
          <strong>放心说需求，确认前不会自动下单</strong>
          <p>AI 会先生成方案，再把价格、库存、取消规则和代办项给你核对；只有你授权后才会执行预订/购票/叫车等动作。</p>
        </section>

        <section className="v4-intent-examples">
          <p>不知道怎么说？试试这些</p>
          <div>
            {examplePrompts.slice(1).map((prompt) => (
              <button key={prompt} type="button" onClick={() => setText(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="v4-intent-dock">
        <div className="v4-intent-dock-main-row">
          {voiceState === 'listening' && (
            <div className={`v4-intent-cancel-toast ${isCanceling ? 'is-canceling' : ''}`}>
              <span>{isCanceling ? '松开手指，取消发送' : '上滑取消'}</span>
              <strong>{recordDuration}</strong>
            </div>
          )}
          <textarea
            id="intent-input"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              if (voiceState !== 'idle') setVoiceState('recognized')
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="输入文字需求..."
            rows={1}
          />
          <button
            className={`v4-intent-mic-chip ${voiceState === 'listening' ? 'v4-intent-mic-chip--listening' : ''} ${voiceState === 'transcribing' ? 'v4-intent-mic-chip--transcribing' : ''} ${isCanceling ? 'v4-intent-mic-chip--canceling' : ''} ${isPressing ? 'v4-intent-mic-chip--pressed' : ''}`}
            type="button"
            disabled={isPlanning || !voice.isSupported()}
            onMouseDown={(event) => beginVoicePress(event.clientY)}
            onMouseUp={() => void finishVoicePress()}
            onMouseMove={(event) => updateCancelIntent(event.clientY)}
            onTouchStart={(event) => beginVoicePress(event.touches[0]?.clientY)}
            onTouchEnd={() => void finishVoicePress()}
            onTouchCancel={() => void finishVoicePress()}
            onTouchMove={(event) => updateCancelIntent(event.touches[0]?.clientY ?? 0)}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') startVoicePress()
            }}
            onKeyUp={(event) => {
              if (event.key === ' ' || event.key === 'Enter') void finishVoicePress()
            }}
          >
            <span className="v4-intent-mic-chip-icon">♪</span>
            <span>{voiceState === 'listening' ? '松开' : '按住说话'}</span>
          </button>
        </div>
        <p>
          {voiceError ??
            (voiceState === 'listening'
              ? '上滑可取消发送'
              : voiceState === 'transcribing'
                ? '正在识别语音…'
                : voice.isSupported()
                  ? '按住说话，或直接输入文字'
                  : '当前浏览器不支持语音，请用文字输入')}
        </p>
        <button
          className="v4-intent-generate"
          type="button"
          disabled={!canGenerate}
          onClick={handleGenerate}
        >
          {isPlanning ? '正在生成方案…' : '生成我的出行方案'}
        </button>
      </section>
      {inputFocused && (
        <MockKeyboard
          onDismiss={() => {
            setInputFocused(false)
            document.getElementById('intent-input')?.blur()
          }}
        />
      )}
    </div>
  )
}
