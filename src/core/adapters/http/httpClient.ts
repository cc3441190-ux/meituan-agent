import { env } from '../../../config/env'

type Json = Record<string, unknown>

export async function postJson<TResponse>(
  path: string,
  body: Json,
  init?: { timeoutMs?: number },
): Promise<TResponse> {
  if (!env.apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL 未配置，无法调用业务 API')
  }
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    init?.timeoutMs ?? env.apiTimeoutMs,
  )
  try {
    const res = await fetch(joinUrl(env.apiBaseUrl, path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`HTTP ${res.status}: ${errText || '请求失败'}`)
    }
    return (await res.json()) as TResponse
  } finally {
    window.clearTimeout(timeout)
  }
}

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}
