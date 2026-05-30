import type { POI } from './types'

const DEFAULT_LOCATION: [number, number] = [30.52, 114.28]

/** 强校验 LLM / 外部 API 返回的 POI，避免 undefined 导致白屏 */
export function normalizePoi(
  raw: Partial<POI> | null | undefined,
  type: string,
  fallbackName?: string,
): POI {
  const name = raw?.name?.trim() || fallbackName?.trim() || '推荐地点'
  const id =
    typeof raw?.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `fallback-${type}-${Date.now().toString(36)}`

  let location: [number, number] = DEFAULT_LOCATION
  if (
    Array.isArray(raw?.location) &&
    raw.location.length === 2 &&
    typeof raw.location[0] === 'number' &&
    typeof raw.location[1] === 'number' &&
    Number.isFinite(raw.location[0]) &&
    Number.isFinite(raw.location[1])
  ) {
    location = [raw.location[0], raw.location[1]]
  }

  const rating =
    typeof raw?.rating === 'number' && raw.rating >= 3 && raw.rating <= 5 ? raw.rating : 4.5
  const distance =
    typeof raw?.distance === 'number' && raw.distance > 0 && raw.distance < 30
      ? raw.distance
      : 2.5
  const tags = Array.isArray(raw?.tags)
    ? raw.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : []

  return { id, name, rating, distance, location, tags }
}

export function normalizeInventory(raw: Partial<{ available: boolean; queue?: number; reason?: string }> | null | undefined): {
  available: boolean
  queue?: number
  reason?: string
} {
  return {
    available: raw?.available !== false,
    queue: typeof raw?.queue === 'number' && raw.queue >= 0 ? raw.queue : undefined,
    reason: typeof raw?.reason === 'string' ? raw.reason : undefined,
  }
}
