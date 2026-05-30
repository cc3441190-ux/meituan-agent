import { coerceTimeWindow } from '../agent/constraintNormalize'
import { isVagueIntent } from '../agent/intentRules'
import type { Constraints } from '../agent/types'

const PEOPLE_LABELS: Record<string, string> = {
  family: '家庭',
  child_5: '5岁孩子',
  diet: '减脂',
  friends: '朋友聚会',
  group_4: '4人',
  mixed_gender: '男女混合',
  couple: '情侣',
}

const PREFERENCE_LABELS: Record<string, string> = {
  dining: '用餐',
  entertainment: '玩乐',
  walking: '逛街散步',
  cultural: '看展文化',
  outdoor: '户外',
}

const AVOID_LABELS: Record<string, string> = {
  spicy: '不吃辣',
  crowd: '避开拥挤',
  far: '不要太远',
}

function formatTimePreview(c: Constraints, rawText: string): string {
  const hours = coerceTimeWindow(c.timeWindow, 4)
  const hints: string[] = []
  const t = rawText

  if (/下午/.test(t)) hints.push('下午')
  else if (/晚上|今晚|夜里/.test(t)) hints.push('晚上')
  else if (/上午|早上/.test(t)) hints.push('上午')
  else if (/一整天|一天|全天/.test(t)) hints.push('全天')

  if (/周末/.test(t)) hints.push('周末')

  const period = hints.length > 0 ? hints.join(' · ') : null
  return period ? `${period} · 约 ${hours} 小时` : `约 ${hours} 小时`
}

function inferPreferencesFromText(rawText: string): string[] {
  const out: string[] = []
  if (/吃|餐|饭|下午茶|咖啡/.test(rawText)) out.push('用餐')
  if (/玩|乐|游|乐园|游戏/.test(rawText)) out.push('玩乐')
  if (/逛|走|散步|citywalk/i.test(rawText)) out.push('逛街散步')
  if (/展|博物馆|文化|书/.test(rawText)) out.push('看展文化')
  if (/户外|公园|自然/.test(rawText)) out.push('户外')
  return out
}

function formatPreferences(c: Constraints, rawText: string): string {
  const mapped = c.preferences
    .map((p) => PREFERENCE_LABELS[p])
    .filter((label): label is string => Boolean(label))

  if (mapped.length > 0) return mapped.join('、')

  const inferred = inferPreferencesFromText(rawText)
  if (inferred.length > 0) return inferred.join('、')

  if (c.avoid.length > 0) {
    const avoidLabels = c.avoid.map((a) => AVOID_LABELS[a] ?? a)
    return `规避：${avoidLabels.join('、')}`
  }

  if (/轻松|不累|别太累|省心/.test(rawText)) return '轻松省心'
  if (/氛围|浪漫|约会/.test(rawText)) return '氛围感'

  return '未明确'
}

function formatOrigin(c: Constraints, rawText: string): string {
  const name = c.originName?.trim()
  if (name) return name
  if (/从(家|家里|家门口)/.test(rawText)) return '家'
  if (/从(公司|单位)|公司出发/.test(rawText)) return '公司'
  if (/从(学校|校园)|学校出发/.test(rawText)) return '学校'
  return '当前位置'
}

export function formatConstraintsPreview(
  c: Constraints | null,
  hasText: boolean,
  rawText = '',
) {
  if (!hasText || !c) {
    return [
      { label: '时间', value: '待识别' },
      { label: '出发地', value: '待识别' },
      { label: '同行人', value: '待识别' },
      { label: '场景', value: '待识别' },
      { label: '偏好', value: '待识别' },
    ]
  }

  const isVague = isVagueIntent(rawText)

  const people =
    c.people.length > 0
      ? c.people.map((p) => PEOPLE_LABELS[p] ?? p).join('、')
      : isVague
        ? '按热门路线推荐'
        : '未明确（说一下同行人会更准）'

  const scene =
    isVague
      ? '周边热门 · 综合推荐'
      : c.location === 'nearby'
        ? '离家不远'
        : '当前位置周边'

  const prefs =
    isVague
      ? '兼顾玩乐 + 用餐 · AI 自动配比'
      : formatPreferences(c, rawText)

  return [
    { label: '时间', value: formatTimePreview(c, rawText) },
    { label: '出发地', value: formatOrigin(c, rawText) },
    { label: '同行人', value: people },
    { label: '场景', value: scene },
    { label: '偏好', value: prefs },
  ]
}
