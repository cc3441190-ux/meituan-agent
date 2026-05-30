import type { Constraints } from './types'

const KNOWN_PEOPLE = new Set([
  'family',
  'child_5',
  'diet',
  'friends',
  'group_4',
  'mixed_gender',
  'couple',
])

const KNOWN_PREFS = new Set(['dining', 'entertainment', 'walking', 'cultural', 'outdoor'])

const KNOWN_BUDGETS = new Set(['low', 'medium', 'high'])

/** LLM 可能返回字符串/空值，统一为 3–8 的整数小时 */
export function coerceTimeWindow(value: unknown, fallback = 4): number {
  const fb = sanitizeHours(fallback)
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampHours(value)
  }
  if (typeof value === 'string' && value.trim()) {
    const m = value.match(/(\d+(?:\.\d+)?)/)
    if (m) return clampHours(parseFloat(m[1]))
  }
  return fb
}

function sanitizeHours(n: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return 4
  return clampHours(n)
}

function clampHours(n: number): number {
  return Math.max(3, Math.min(8, Math.round(n)))
}

export function coerceBudget(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim()
    if (KNOWN_BUDGETS.has(v)) return v
    if (/别太贵|不要太贵|不要太高|低|便宜|省|经济/.test(value)) return 'low'
    if (/高档|奢华|品质|贵一点/.test(value)) return 'high'
    if (/中|适中|一般/.test(value)) return 'medium'
  }
  return KNOWN_BUDGETS.has(fallback) ? fallback : 'medium'
}

export function filterPeople(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  return list.filter((p): p is string => typeof p === 'string' && KNOWN_PEOPLE.has(p))
}

export function filterPreferences(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  return list.filter((p): p is string => typeof p === 'string' && KNOWN_PREFS.has(p))
}

export function pickName(value: unknown, fallback?: string): string | undefined {
  if (typeof value !== 'string') return fallback?.trim() || undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return fallback?.trim() || undefined
  return trimmed
}

export function mergeConstraintsFromLlm(
  result: Partial<Constraints>,
  ruleFallback: Constraints,
): Constraints {
  const timeWindow = coerceTimeWindow(result.timeWindow, ruleFallback.timeWindow)
  const llmPeople = filterPeople(result.people)
  const llmPrefs = filterPreferences(result.preferences)

  return {
    timeWindow,
    people: llmPeople.length > 0 ? llmPeople : ruleFallback.people,
    location:
      result.location === 'nearby' || result.location === 'current'
        ? result.location
        : ruleFallback.location,
    originName: pickName(result.originName, ruleFallback.originName),
    destinationName: pickName(result.destinationName, ruleFallback.destinationName),
    preferences: llmPrefs.length > 0 ? llmPrefs : ruleFallback.preferences,
    avoid: Array.isArray(result.avoid) && result.avoid.length > 0 ? result.avoid : ruleFallback.avoid,
    budget: coerceBudget(result.budget, ruleFallback.budget),
  }
}
