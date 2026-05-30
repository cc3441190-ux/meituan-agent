import {
  CATEGORY_ICONS,
  type PlanItemType,
  type PlannedStep,
} from '../types/planner'

const THINKING_DELAY_MS = 2000

interface CatalogEntry {
  type: PlanItemType
  name: string
  position: Position
}

interface Position {
  x: number
  y: number
}

const DEFAULT_ITINERARY: CatalogEntry[] = [
  { type: 'park', name: '上海迪士尼乐园', position: { x: 20, y: 30 } },
  { type: 'food', name: '美记老烧烤', position: { x: 50, y: 60 } },
]

const CATALOG: CatalogEntry[] = [
  { type: 'park', name: '上海迪士尼乐园', position: { x: 20, y: 30 } },
  { type: 'park', name: '北京环球度假区', position: { x: 25, y: 35 } },
  { type: 'activity', name: '798 艺术区 Citywalk', position: { x: 35, y: 45 } },
  { type: 'activity', name: '侏罗纪探险王国', position: { x: 30, y: 42 } },
  { type: 'food', name: '美记老烧烤', position: { x: 50, y: 60 } },
  { type: 'food', name: '海底捞火锅（蓝色港湾店）', position: { x: 55, y: 58 } },
  { type: 'food', name: '绿野仙踪轻食沙拉', position: { x: 48, y: 52 } },
  { type: 'food', name: '花舍下午茶咖啡', position: { x: 44, y: 48 } },
  { type: 'shopping', name: '蓝色港湾滨水步行街', position: { x: 40, y: 40 } },
  { type: 'shopping', name: '朝阳大悦城', position: { x: 62, y: 55 } },
]

const INTENT_RULES: {
  keywords: string[]
  picks: string[]
  slot: 'activity' | 'food' | 'any'
}[] = [
  {
    keywords: ['迪士尼', '乐园', '主题公园', '玩', '亲子', '孩子', '娃'],
    picks: ['上海迪士尼乐园', '侏罗纪探险王国', '798 艺术区 Citywalk'],
    slot: 'activity',
  },
  {
    keywords: ['环球', '哈利波特', 'citywalk', '艺术', '798', '展览'],
    picks: ['北京环球度假区', '798 艺术区 Citywalk', '侏罗纪探险王国'],
    slot: 'activity',
  },
  {
    keywords: ['烧烤', '烤肉', '撸串', '吃', '餐', '饭', '火锅', '海底捞'],
    picks: ['美记老烧烤', '海底捞火锅（蓝色港湾店）', '绿野仙踪轻食沙拉'],
    slot: 'food',
  },
  {
    keywords: ['轻食', '沙拉', '减肥', '健康', '下午茶', '咖啡'],
    picks: ['绿野仙踪轻食沙拉', '花舍下午茶咖啡'],
    slot: 'food',
  },
  {
    keywords: ['逛街', '购物', '滨水', '商场'],
    picks: ['蓝色港湾滨水步行街', '朝阳大悦城'],
    slot: 'any',
  },
]

const TIME_SLOTS = ['14:00', '15:30', '17:00', '17:30', '19:00', '20:30']

function toPlannedStep(entry: CatalogEntry, id: number, time: string): PlannedStep {
  return {
    id,
    type: entry.type,
    name: entry.name,
    icon: CATEGORY_ICONS[entry.type],
    time,
    position: entry.position,
  }
}

function pickByName(names: string[]): CatalogEntry[] {
  return names
    .map((name) => CATALOG.find((item) => item.name === name))
    .filter((item): item is CatalogEntry => Boolean(item))
}

function resolveItinerary(input: string): CatalogEntry[] {
  const text = input.trim()
  if (!text) return DEFAULT_ITINERARY

  const activityNames = new Set<string>()
  const foodNames = new Set<string>()
  const otherNames = new Set<string>()

  for (const rule of INTENT_RULES) {
    if (!rule.keywords.some((kw) => text.includes(kw))) continue

    const target =
      rule.slot === 'activity'
        ? activityNames
        : rule.slot === 'food'
          ? foodNames
          : otherNames

    rule.picks.forEach((name) => target.add(name))
  }

  const activity = pickByName([...activityNames])[0]
  const food = pickByName([...foodNames])[0]
  const extra = pickByName([...otherNames])[0]

  const itinerary: CatalogEntry[] = []
  if (activity) itinerary.push(activity)
  if (food) itinerary.push(food)
  if (extra && !itinerary.some((item) => item.name === extra.name)) {
    itinerary.push(extra)
  }

  if (itinerary.length === 0) return DEFAULT_ITINERARY
  if (itinerary.length === 1) {
    const fallbackFood = CATALOG.find((item) => item.type === 'food' && item.name !== itinerary[0].name)
    if (fallbackFood) itinerary.push(fallbackFood)
  }

  return itinerary.slice(0, 4)
}

/**
 * 模拟 AI 规划接口：解析用户意图，延迟 2 秒后返回行程清单。
 * 每项包含店名、分类图标、时间与地图坐标（百分比）。
 */
export async function fetchPlanFromAI(input: string): Promise<PlannedStep[]> {
  await new Promise((resolve) => setTimeout(resolve, THINKING_DELAY_MS))

  const entries = resolveItinerary(input)
  return entries.map((entry, index) =>
    toPlannedStep(entry, index + 1, TIME_SLOTS[index] ?? '18:00'),
  )
}
