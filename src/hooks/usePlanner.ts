import { useCallback, useRef, useState } from 'react'
import { fetchPlanFromAI } from '../services/aiPlanner'
import type { PlannedStep } from '../types/planner'

const REVEAL_INTERVAL_MS = 650

interface UsePlannerResult {
  /** AI 返回的完整行程，存入后不会立刻全部展示 */
  plannedSteps: PlannedStep[]
  /** 地图上当前已“冒出”的节点 */
  visibleSteps: PlannedStep[]
  /** AI 思考中（2s 模拟延迟） */
  isThinking: boolean
  /** 节点逐个构建动画进行中 */
  isBuilding: boolean
  error: string | null
  submit: (instruction: string) => Promise<void>
  reset: () => void
}

async function revealSteps(
  steps: PlannedStep[],
  onReveal: (step: PlannedStep) => void,
  shouldContinue: () => boolean,
) {
  for (const step of steps) {
    if (!shouldContinue()) return
    await new Promise((resolve) => setTimeout(resolve, REVEAL_INTERVAL_MS))
    if (!shouldContinue()) return
    onReveal(step)
  }
}

export function usePlanner(): UsePlannerResult {
  const [plannedSteps, setPlannedSteps] = useState<PlannedStep[]>([])
  const [visibleSteps, setVisibleSteps] = useState<PlannedStep[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef(0)

  const reset = useCallback(() => {
    sessionRef.current += 1
    setPlannedSteps([])
    setVisibleSteps([])
    setIsThinking(false)
    setIsBuilding(false)
    setError(null)
  }, [])

  const submit = useCallback(async (instruction: string) => {
    const sessionId = ++sessionRef.current

    setPlannedSteps([])
    setVisibleSteps([])
    setIsThinking(true)
    setIsBuilding(false)
    setError(null)

    try {
      const steps = await fetchPlanFromAI(instruction)
      if (sessionId !== sessionRef.current) return

      // 数据返回后先存入 plannedSteps，地图仍为空
      setPlannedSteps(steps)
      setVisibleSteps([])
      setIsThinking(false)
      setIsBuilding(true)

      await revealSteps(
        steps,
        (step) => {
          if (sessionId !== sessionRef.current) return
          setVisibleSteps((prev) => [...prev, step])
        },
        () => sessionId === sessionRef.current,
      )

      if (sessionId === sessionRef.current) {
        setIsBuilding(false)
      }
    } catch (err) {
      if (sessionId !== sessionRef.current) return

      const message = err instanceof Error ? err.message : 'AI 规划失败，请重试'
      setError(message)
      setPlannedSteps([])
      setVisibleSteps([])
      setIsThinking(false)
      setIsBuilding(false)
    }
  }, [])

  return {
    plannedSteps,
    visibleSteps,
    isThinking,
    isBuilding,
    error,
    submit,
    reset,
  }
}
