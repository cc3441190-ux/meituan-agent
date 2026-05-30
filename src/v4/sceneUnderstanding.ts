import type { Constraints } from '../agent/types'

export type SceneKind = 'family' | 'friends' | 'couple' | 'general'

export interface SceneUnderstanding {
  kind: SceneKind
  /** 用户语言：AI 识别到的场景名 */
  sceneLabel: string
  detectedPeople: string
  planningIntent: string
  autoConsiderations: string[]
  shareButtonLabel: string
  shareSheetDefault: 'partner' | 'friends'
  budgetLabel: string
}

export function buildSceneUnderstanding(constraints: Constraints): SceneUnderstanding {
  if (constraints.people.includes('family') || constraints.people.includes('child_5')) {
    const people: string[] = []
    if (constraints.people.includes('child_5')) people.push('5 岁孩子')
    people.push('老婆')
    const considerations: string[] = []
    if (constraints.people.includes('child_5')) considerations.push('5 岁儿童')
    if (constraints.people.includes('diet')) considerations.push('低脂饮食')
    considerations.push('离家不远')
    considerations.push('16:00 后避雨')
    if (constraints.location === 'nearby') considerations.push('室内优先')

    return {
      kind: 'family',
      sceneLabel: '亲子家庭下午',
      detectedPeople: people.join(' · '),
      planningIntent: '就近玩乐 + 轻食晚餐 + 轻松收尾',
      autoConsiderations: considerations,
      shareButtonLabel: '发给老婆确认',
      shareSheetDefault: 'partner',
      budgetLabel: '总预算',
    }
  }

  if (constraints.people.includes('friends')) {
    const considerations: string[] = []
    if (constraints.people.includes('group_4')) considerations.push('4 人同行')
    if (constraints.people.includes('mixed_gender')) considerations.push('男女搭配')
    if (constraints.budget === 'low' || constraints.budget === 'medium') {
      considerations.push('人均可控')
    }
    considerations.push('适合拍照聊天')
    considerations.push('晚餐不久等')

    return {
      kind: 'friends',
      sceneLabel: '朋友小聚下午',
      detectedPeople: constraints.people.includes('group_4') ? '2 男 2 女 · 4 人' : '朋友们',
      planningIntent: '看展 / 逛街 + 聚餐 + 可选夜宵',
      autoConsiderations: considerations,
      shareButtonLabel: '发到朋友群',
      shareSheetDefault: 'friends',
      budgetLabel: '预估人均',
    }
  }

  if (constraints.people.includes('couple')) {
    return {
      kind: 'couple',
      sceneLabel: '情侣约会下午',
      detectedPeople: '两人同行',
      planningIntent: '轻松逛吃 + 不赶时间',
      autoConsiderations: ['适合约会', '路程短', '餐厅有氛围'],
      shareButtonLabel: '发给 TA 确认',
      shareSheetDefault: 'partner',
      budgetLabel: '总预算',
    }
  }

  return {
    kind: 'general',
    sceneLabel: '本地探索下午',
    detectedPeople: '就近出行',
    planningIntent: '玩 + 吃 + 顺路串联',
    autoConsiderations: ['离家不远', '4-6 小时', '少排队'],
    shareButtonLabel: '分享方案',
    shareSheetDefault: 'partner',
    budgetLabel: '总预算',
  }
}
