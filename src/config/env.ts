/**
 * 环境配置 —— 接入真实 API 时修改 .env 即可切换
 *
 * ⚠️ 安全提示：Vite 会将 VITE_* 变量打包进前端 bundle，LLM Key 会暴露在浏览器。
 * 公开 Demo / 生产环境请使用 mock 模式，或通过独立后端代理转发 LLM 请求。
 *
 * VITE_PLANNER_MODE=mock | live
 * VITE_API_BASE_URL=https://your-backend.com
 * VITE_LLM_API_KEY=sk-...
 */
export const env = {
  plannerMode: (import.meta.env.VITE_PLANNER_MODE ?? 'mock') as 'mock' | 'live',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  llmApiKey: import.meta.env.VITE_LLM_API_KEY ?? '',
  llmBaseUrl: import.meta.env.VITE_LLM_BASE_URL ?? 'https://api.openai.com/v1',
  llmModel: import.meta.env.VITE_LLM_MODEL ?? 'gpt-4o-mini',
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000),
}

export const isMockMode = env.plannerMode === 'mock'

/** 是否配置了独立业务后端（POI/预订），与 LLM 网关分开 */
export function hasBusinessApi(): boolean {
  const base = env.apiBaseUrl.trim()
  if (!base) return false
  const llmHost = env.llmBaseUrl.replace(/\/v1\/?$/, '')
  return !base.startsWith(llmHost) && !base.includes('api.deepseek.com') && !base.includes('api.openai.com')
}
