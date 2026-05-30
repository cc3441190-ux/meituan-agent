import { coerceBudget, coerceTimeWindow } from '../agent/constraintNormalize'
import { applyVagueDefaults, isVagueIntent } from '../agent/intentRules'
import type { Constraints } from '../agent/types'
import { formatConstraintsPreview } from './formatConstraintsPreview'

export type IntentSceneMode = 'current_nearby' | 'nearby_home' | 'hot_vague'
export type IntentBudgetChoice = '' | 'low' | 'medium' | 'high'

export interface IntentFormState {
  timeHours: number
  originName: string
  sceneMode: IntentSceneMode
  peopleText: string
  preferencesText: string
  budget: IntentBudgetChoice
}

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

export function defaultIntentFormState(): IntentFormState {
  return {
    timeHours: 4,
    originName: '',
    sceneMode: 'current_nearby',
    peopleText: '',
    preferencesText: '',
    budget: '',
  }
}

function isVagueInput(rawText: string): boolean {
  return isVagueIntent(rawText)
}

export function constraintsToFormState(
  c: Constraints,
  rawText: string,
): IntentFormState {
  const vague = isVagueInput(rawText)
  const preview = formatConstraintsPreview(c, true, rawText)
  const peopleRow = preview.find((p) => p.label === '同行人')
  const prefsRow = preview.find((p) => p.label === '偏好')
  const originRow = preview.find((p) => p.label === '出发地')

  let sceneMode: IntentSceneMode = 'current_nearby'
  if (vague) sceneMode = 'hot_vague'
  else if (c.location === 'nearby') sceneMode = 'nearby_home'

  const originDisplay = originRow?.value ?? ''
  const originName =
    c.originName?.trim() ||
    (originDisplay !== '当前位置' && !/待识别/.test(originDisplay) ? originDisplay : '')

  const budget: IntentBudgetChoice =
    c.budget === 'low' || c.budget === 'medium' || c.budget === 'high' ? c.budget : ''

  return {
    timeHours: coerceTimeWindow(c.timeWindow, 4),
    originName,
    sceneMode,
    peopleText: peopleRow?.value && !/待识别|未明确（/.test(peopleRow.value) ? peopleRow.value : '',
    preferencesText:
      prefsRow?.value && !/待识别|未明确/.test(prefsRow.value) ? prefsRow.value : '',
    budget,
  }
}

export function parsePeopleFromDisplay(text: string): string[] {
  const t = text.trim()
  if (!t || /未明确|待识别|按热门/.test(t)) return []

  const keys: string[] = []
  for (const [key, label] of Object.entries(PEOPLE_LABELS)) {
    if (t.includes(label)) keys.push(key)
  }
  if (/家庭|老婆|老公|孩子|亲子|儿子|女儿/.test(t) && !keys.includes('family')) keys.push('family')
  if (/5岁|五岁|小孩|宝宝/.test(t) && !keys.includes('child_5')) keys.push('child_5')
  if (/减脂|减肥|轻食|控卡/.test(t) && !keys.includes('diet')) keys.push('diet')
  if (/朋友|哥们|姐妹|同学|聚会/.test(t) && !keys.includes('friends')) keys.push('friends')
  if (/4人|四人|四个/.test(t) && !keys.includes('group_4')) keys.push('group_4')
  if (/男女|异性/.test(t) && !keys.includes('mixed_gender')) keys.push('mixed_gender')
  if (/情侣|女朋友|男朋友|约会|对象/.test(t) && !keys.includes('couple')) keys.push('couple')
  return [...new Set(keys)]
}

export function parsePreferencesFromDisplay(text: string): string[] {
  const t = text.trim()
  if (!t || /未明确|待识别|兼顾玩乐/.test(t)) return []

  const keys: string[] = []
  for (const [key, label] of Object.entries(PREFERENCE_LABELS)) {
    if (t.includes(label)) keys.push(key)
  }
  const parts = t.split(/[、,，/|]+/).map((s) => s.trim())
  for (const part of parts) {
    for (const [key, label] of Object.entries(PREFERENCE_LABELS)) {
      if (part.includes(label) || label.includes(part)) keys.push(key)
    }
  }
  if (/吃|餐|饭|下午茶/.test(t) && !keys.includes('dining')) keys.push('dining')
  if (/玩|乐|游/.test(t) && !keys.includes('entertainment')) keys.push('entertainment')
  if (/逛|走|散步|citywalk/i.test(t) && !keys.includes('walking')) keys.push('walking')
  if (/展|博物馆|文化|书/.test(t) && !keys.includes('cultural')) keys.push('cultural')
  if (/户外|公园|自然/.test(t) && !keys.includes('outdoor')) keys.push('outdoor')
  return [...new Set(keys)]
}

export function formStateToConstraints(
  form: IntentFormState,
  base: Constraints | null,
  rawText: string,
): Constraints {
  const vague = isVagueInput(rawText)
  const people = parsePeopleFromDisplay(form.peopleText)
  const preferences = parsePreferencesFromDisplay(form.preferencesText)

  const originTrim = form.originName.trim()
  const originName =
    originTrim && originTrim !== '当前位置' ? originTrim : base?.originName

  const location =
    form.sceneMode === 'nearby_home'
      ? 'nearby'
      : form.sceneMode === 'hot_vague'
        ? 'current'
        : 'current'

  const fallbackBudget = base?.budget ?? 'medium'
  const budget = form.budget ? coerceBudget(form.budget, fallbackBudget) : fallbackBudget

  const merged: Constraints = {
    timeWindow: coerceTimeWindow(form.timeHours, base?.timeWindow ?? 4),
    people: people.length > 0 ? people : vague ? ['family'] : (base?.people ?? []),
    location,
    originName: originName || undefined,
    destinationName: base?.destinationName,
    preferences:
      preferences.length > 0 ? preferences : vague ? [] : (base?.preferences ?? []),
    avoid: base?.avoid ?? [],
    budget,
    _userInput: rawText,
  }

  if (vague) applyVagueDefaults(merged)

  return merged
}

export const INTENT_SCENE_OPTIONS: { value: IntentSceneMode; label: string }[] = [
  { value: 'current_nearby', label: '当前周边' },
  { value: 'nearby_home', label: '离家不远' },
  { value: 'hot_vague', label: '周边热门' },
]

export const INTENT_BUDGET_OPTIONS: { value: IntentBudgetChoice; label: string }[] = [
  { value: '', label: '未提及' },
  { value: 'low', label: '经济实惠' },
  { value: 'medium', label: '适中 · 可控' },
  { value: 'high', label: '品质优先' },
]
