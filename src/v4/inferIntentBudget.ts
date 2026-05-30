import { parseBudgetFromText } from '../agent/intentRules'

export type BudgetLevel = 'low' | 'medium' | 'high' | 'unknown'

export interface IntentBudgetPreview {
  level: BudgetLevel
  label: string
  display: string
  hint?: string
  active: boolean
}

/** 从意图文案推断预算展示（首屏预览用，与 Agent parseIntent 同源） */
export function inferIntentBudget(text: string): IntentBudgetPreview {
  const t = text.trim()
  const isFriends = /朋友|哥们|姐妹|同学|群/.test(t)
  const label = isFriends ? '预估人均' : '总预算'

  if (!t) {
    return {
      level: 'unknown',
      label,
      display: '待识别',
      hint: '可说「人均 200 以内」或「别太贵」',
      active: false,
    }
  }

  const perCapita = t.match(/人均\s*(\d+)\s*(以内|左右|以下|之内|内|块|元)?/)
  if (perCapita) {
    const amount = Number(perCapita[1])
    const capped = /以内|以下|之内|内/.test(perCapita[2] ?? '')
    const display = capped ? `¥${amount} 以内` : `约 ¥${amount}`
    const groupMatch = t.match(/(\d)\s*个?(人|位|朋友)|(\d)\s*人/)
    const groupSize = groupMatch
      ? Number(groupMatch[1] || groupMatch[3] || 0)
      : isFriends
        ? 4
        : 0
    const level = parseBudgetFromText(t) ?? 'medium'
    const hint =
      !isFriends && groupSize >= 2
        ? `按 ${groupSize} 人粗算约 ¥${amount * groupSize}`
        : isFriends && groupSize >= 2
          ? `${groupSize || 4} 人下午约 ¥${amount * (groupSize || 4)} 量级`
          : undefined
    return { level, label, display, hint, active: true }
  }

  const totalBudget = t.match(/(?:总)?预算\s*(\d+)\s*(以内|左右|以下|之内|内)?/)
  if (totalBudget) {
    const amount = Number(totalBudget[1])
    const capped = totalBudget[2]?.includes('内') || totalBudget[2]?.includes('下')
    const level = parseBudgetFromText(t) ?? 'medium'
    return {
      level,
      label: '总预算',
      display: capped ? `¥${amount} 以内` : `约 ¥${amount}`,
      hint: '会按总价控制各站消费',
      active: true,
    }
  }

  const parsed = parseBudgetFromText(t)
  if (parsed === 'low') {
    return {
      level: 'low',
      label: '预算倾向',
      display: '经济实惠',
      hint: '优先性价比与少排队',
      active: true,
    }
  }
  if (parsed === 'high') {
    return {
      level: 'high',
      label: '预算倾向',
      display: '品质优先',
      hint: '可安排评分更高的店',
      active: true,
    }
  }
  if (parsed === 'medium') {
    return {
      level: 'medium',
      label: '预算倾向',
      display: '适中 · 可控',
      hint: '方案里会标人均与总价',
      active: true,
    }
  }

  return {
    level: 'unknown',
    label,
    display: '未提及',
    hint: '补充预算，推荐会更准',
    active: false,
  }
}
