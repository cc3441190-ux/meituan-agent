import type { Constraints } from './types'

export function isVagueIntent(text: string): boolean {
  return /^(随便|无所谓|都行|你定|你来|帮我定|你安排|随意|啥都行|无语|不知道)$/.test(text.trim())
}

/** 从自然语言推断 budget；低/高短语优先于子串「贵」误伤 */
export function parseBudgetFromText(text: string): 'low' | 'medium' | 'high' | null {
  const t = text.trim()
  if (!t) return null

  const perCapita = t.match(/人均\s*(\d+)\s*(以内|左右|以下|之内|内|块|元)?/)
  if (perCapita) {
    const amount = Number(perCapita[1])
    const capped = /以内|以下|之内|内/.test(perCapita[2] ?? '')
    if (amount <= 80 || (capped && amount <= 100)) return 'low'
    if (amount <= 250) return 'medium'
    return 'high'
  }

  const totalBudget = t.match(/(?:总)?预算\s*(\d+)\s*(以内|左右|以下|之内|内)?/)
  if (totalBudget) {
    const amount = Number(totalBudget[1])
    if (amount <= 300) return 'low'
    if (amount <= 800) return 'medium'
    return 'high'
  }

  if (/便宜|省一点|经济实惠|预算紧|性价比|别太贵|不要太贵|不要太高|别太/.test(t)) {
    return 'low'
  }
  if (/高档|奢华|不差钱|预算充足|贵一点|品质优先/.test(t)) {
    return 'high'
  }
  if (/预算/.test(t)) return 'medium'

  return null
}

/** 出发时刻：默认当前时间 + 准备缓冲；上午规划下午场则锚定 14:00 */
export function resolvePlanStartTime(constraints: Constraints, rawInput = ''): Date {
  const now = new Date()
  const start = new Date(now)
  const wantsAfternoon = /下午|午后|半天/.test(rawInput)
  const wantsEvening = /晚上|今晚|夜里|宵夜/.test(rawInput)

  start.setMinutes(start.getMinutes() + 15, 0, 0)
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0)

  if (wantsEvening && start.getHours() < 17) {
    start.setHours(17, 30, 0, 0)
  } else if (wantsAfternoon && start.getHours() < 10) {
    start.setHours(14, 0, 0, 0)
  }

  void constraints
  return start
}

export function applyVagueDefaults(constraints: Constraints): void {
  if (constraints.people.length > 0) return
  constraints.people.push('family')
  constraints.timeWindow = Math.max(constraints.timeWindow, 4)
  if (constraints.budget === 'medium' && !constraints.preferences.length) {
    constraints.location = constraints.location === 'current' ? 'nearby' : constraints.location
  }
}
