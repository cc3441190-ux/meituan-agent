import { env } from '../../../config/env'
import { safeParseLlmJson, fetchWithTimeout } from './safeJson'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

async function chatCompletion(messages: ChatMessage[], jsonMode: boolean): Promise<string> {
  if (!env.llmApiKey) throw new Error('VITE_LLM_API_KEY 未配置，无法调用 LLM')
  const base = env.llmBaseUrl.endsWith('/') ? env.llmBaseUrl.slice(0, -1) : env.llmBaseUrl
  const res = await fetchWithTimeout(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.llmApiKey}`,
    },
    body: JSON.stringify({
      model: env.llmModel,
      temperature: jsonMode ? 0.2 : 0.5,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages,
    }),
    timeoutMs: env.apiTimeoutMs,
  })
  if (!res.ok) {
    throw new Error(`LLM 请求失败: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as ChatCompletionResponse
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('LLM 返回为空')
  return content
}

export async function llmJson<T>(messages: ChatMessage[]): Promise<T> {
  const content = await chatCompletion(messages, true)
  try {
    return safeParseLlmJson<T>(content)
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'LLM JSON 解析失败')
  }
}

export async function llmText(messages: ChatMessage[]): Promise<string> {
  return chatCompletion(messages, false)
}
