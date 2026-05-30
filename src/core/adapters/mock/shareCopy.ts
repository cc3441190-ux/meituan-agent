import { formatTime } from '../../../agent/constants'
import type { Constraints, Plan } from '../../../agent/types'
import type { InviteCard } from '../../ports'

function getStops(plan: Plan) {
  return plan.nodes.filter((n) => !n.fixed)
}

export function inferConstraintsFromPlan(plan: Plan): Constraints {
  const nodes = plan.nodes
  const people: string[] = []
  if (nodes.some((n) => n.type === 'light_meal' || n.type === 'indoor_play' || n.type === 'park')) {
    people.push('family')
  }
  if (nodes.some((n) => n.type === 'light_meal')) people.push('diet')
  if (nodes.some((n) => n.type === 'indoor_play')) people.push('child_5')
  if (nodes.some((n) => n.type === 'bbq' || n.type === 'night_market')) people.push('friends')
  if (people.length === 0) people.push('family')

  return {
    timeWindow: 4,
    people,
    location: 'nearby',
    preferences: [],
    avoid: [],
    budget: 'medium',
  }
}

export function buildAgentSummaryCopy(plan: Plan, constraints: Constraints): string {
  const stops = getStops(plan)
  const play = stops.find((n) => n.category === 'entertainment' || n.category === 'outdoor')
  const meal = stops.find((n) => n.category === 'dining')
  const playName = play?.poi?.name ?? play?.name ?? '玩乐一站'
  const mealName = meal?.poi?.name ?? meal?.name ?? '用餐'

  if (constraints.people.includes('family')) {
    const bits: string[] = []
    if (constraints.people.includes('diet')) bits.push('嫂子最近在减脂')
    if (constraints.people.includes('child_5')) bits.push('小朋友精力有限')
    const concern = bits.length ? `考虑到${bits.join('、')}，` : '考虑到你们是亲子出行，'
    const mealHint = constraints.people.includes('diet') ? '轻食' : '省心餐食'
    const playHint =
      play?.category === 'entertainment' ? '室内乐园' : '户外放风'
    return `${concern}安排了${playHint}「${playName}」+ ${mealHint}「${mealName}」，路程短、少排队，全程不费妈。`
  }

  if (constraints.people.includes('friends')) {
    return `兄弟们下午见～${playName} 先热场，${mealName} 填饱肚子，路线我都串好了，看看行不行？`
  }

  return `已为您串好 ${stops.length} 站行程：${stops.map((s) => s.poi?.name ?? s.name).join(' → ')}，不远、不绕路，点开地图就能跟着走。`
}

export function buildShareTextCopy(
  plan: Plan,
  audience: 'partner' | 'friends',
  constraints: Constraints,
): string {
  const stops = getStops(plan)
  const first = stops[0]
  const meal = stops.find((n) => n.category === 'dining')
  const depart = formatTime(first?.startTime ?? plan.startTime)

  if (audience === 'partner') {
    const tail = constraints.people.includes('diet') ? '，轻食我也挑好了' : ''
    return `老婆，搞定了～${depart} 出发，先去 ${first?.poi?.name ?? first?.name}${meal ? `，${formatTime(meal.startTime)} 去 ${meal.poi?.name ?? meal.name} 吃饭` : ''}${tail}。路线在邀请卡里，你看看行不行？`
  }

  return `兄弟们集合！${depart} ${first?.poi?.name ?? first?.name} 见，${meal ? `吃完饭 ${meal.poi?.name ?? meal.name} 继续嗨，` : ''}路线我都安排好了，确认就来～`
}

export function buildInviteCardCopy(
  plan: Plan,
  audience: 'partner' | 'friends',
  constraints: Constraints,
): InviteCard {
  const stops = getStops(plan)
  const routeNames = stops.map((s) => s.poi?.name ?? s.name).join(' → ')
  const depart = formatTime(stops[0]?.startTime ?? plan.startTime)
  const play = stops.find((n) => n.category !== 'dining')
  const meal = stops.find((n) => n.category === 'dining')

  const headline =
    audience === 'partner' ? '周末家庭出游 · 行程卡' : '兄弟局下午场 · 行程卡'

  let body: string
  if (audience === 'partner') {
    const mealHint = constraints.people.includes('diet') ? '轻食已安排' : '省心不绕路'
    body = `${depart} 出发 · ${play?.poi?.name ?? play?.name ?? '玩乐'} + ${meal?.poi?.name ?? meal?.name ?? '用餐'} · ${mealHint}`
  } else {
    body = `${depart} 集合 · ${play?.poi?.name ?? '先玩'} → ${meal?.poi?.name ?? meal?.name ?? '聚餐'}，路线已串好`
  }

  return {
    headline,
    body,
    routeLine: `${depart} 出发 · ${routeNames}`,
    stops: stops.map((s) => ({
      time: `${formatTime(s.startTime)}-${formatTime(s.endTime)}`,
      name: s.poi?.name ?? s.name,
    })),
  }
}
