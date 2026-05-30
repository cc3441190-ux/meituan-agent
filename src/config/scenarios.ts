/** 比赛预设场景 —— 当前 Demo 聚焦「家庭线」，朋友线预留 */
export interface CompetitionScenario {
  id: string
  title: string
  subtitle: string
  prompt: string
  enabled: boolean
}

export const COMPETITION_SCENARIOS: CompetitionScenario[] = [
  {
    id: 'family',
    title: '家庭亲子 · 下午行程',
    subtitle: '5岁孩子 + 老婆减肥 + 离家不远',
    prompt:
      '今天下午是空的，想和老婆孩子出去玩几个小时，别离家太远。孩子5岁，老婆最近在减肥，帮我安排一下：去哪玩、去哪吃、还有什么可以做的。',
    enabled: true,
  },
  {
    id: 'friends',
    title: '朋友聚会 · 下午行程',
    subtitle: '4人（2男2女）· 社交向',
    prompt:
      '4个朋友下午想出去玩，2个男生2个女生，吃个好吃的，再安排点好玩的，预算人均200以内，别太远。',
    enabled: true,
  },
]

export const DEFAULT_SCENARIO = COMPETITION_SCENARIOS.find((s) => s.enabled) ?? COMPETITION_SCENARIOS[0]
