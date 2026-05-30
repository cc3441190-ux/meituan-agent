import type { Constraints, Plan } from '../../../agent/types'
import type { IShareService, InviteCard } from '../../ports'
import {
  buildAgentSummaryCopy,
  buildInviteCardCopy,
  buildShareTextCopy,
  inferConstraintsFromPlan,
} from '../mock/shareCopy'
import { llmJson, llmText } from './llmClient'

type InviteResp = {
  headline?: string
  body?: string
  routeLine?: string
  stops?: Array<{ time?: string; name?: string }>
}

export class HttpShareService implements IShareService {
  readonly mode = 'live' as const

  async buildShareText(plan: Plan, audience: 'partner' | 'friends'): Promise<string> {
    const constraints = inferConstraintsFromPlan(plan)
    try {
      const text = await llmText([
        {
          role: 'system',
          content:
            '你是中文行程分享文案助手。输出简洁自然、可直接发给同伴的文本，最多120字。',
        },
        { role: 'user', content: JSON.stringify({ audience, plan }) },
      ])
      return text.trim() || buildShareTextCopy(plan, audience, constraints)
    } catch (err) {
      console.warn('[HttpShareService] buildShareText 降级规则文案:', err)
      return buildShareTextCopy(plan, audience, constraints)
    }
  }

  async buildAgentSummary(plan: Plan, constraints: Constraints): Promise<string> {
    try {
      const text = await llmText([
        {
          role: 'system',
          content:
            '你是行程解释助手。输出一句中文总结，说明为何这样安排，突出距离/人群/偏好匹配，最多100字。',
        },
        { role: 'user', content: JSON.stringify({ plan, constraints }) },
      ])
      return text.trim() || buildAgentSummaryCopy(plan, constraints)
    } catch (err) {
      console.warn('[HttpShareService] buildAgentSummary 降级:', err)
      return buildAgentSummaryCopy(plan, constraints)
    }
  }

  async buildInviteCard(
    plan: Plan,
    audience: 'partner' | 'friends',
    constraints: Constraints,
  ): Promise<InviteCard> {
    try {
      const card = await llmJson<InviteResp>([
        {
          role: 'system',
          content:
            '输出 JSON: {headline,body,routeLine,stops:[{time,name}]}. headline 为卡片主标题(≤16字); body 为卡片副标题(≤36字); routeLine 为路线一行摘要; stops 为各站时间与店名。面向图片卡片展示，不要写成聊天话术。',
        },
        { role: 'user', content: JSON.stringify({ plan, audience, constraints }) },
      ])
      const fallback = buildInviteCardCopy(plan, audience, constraints)
      return {
        headline: card.headline?.trim() || fallback.headline,
        body: card.body?.trim() || fallback.body,
        routeLine: card.routeLine?.trim() || fallback.routeLine,
        stops:
          Array.isArray(card.stops) && card.stops.length > 0
            ? card.stops.map((s, i) => ({
                time: s.time?.trim() || fallback.stops[i]?.time || '--:--',
                name: s.name?.trim() || fallback.stops[i]?.name || '待定',
              }))
            : fallback.stops,
      }
    } catch (err) {
      console.warn('[HttpShareService] buildInviteCard 降级规则卡片:', err)
      return buildInviteCardCopy(plan, audience, constraints)
    }
  }
}
