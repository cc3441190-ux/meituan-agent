import { formatTime } from './constants'
import type { Deliverable } from './deliverables'
import type { Constraints, Plan, PlanNode } from './types'

function hasKeyword(text: string, keywords: string[]) {
  return keywords.some((k) => text.includes(k))
}

function lastDiningIndex(plan: Plan): number {
  let last = -1
  plan.nodes.forEach((n, i) => {
    if (!n.fixed && n.category === 'dining') last = i
  })
  return last
}

function firstNonFixedIndex(plan: Plan): number {
  return plan.nodes.findIndex((n) => !n.fixed)
}

function makeBooking(node: PlanNode, idx: number): Deliverable {
  const name = node.poi?.name ?? node.name
  return {
    id: `booking-${idx}`,
    kind: 'booking',
    title: `${formatTime(node.startTime)} ${name} · 订位/取号`,
    detail: node.poi ? '美团预订 · 到店即入座' : '已为你预留时段',
    rationale: '方案核心站点，确认后自动下单',
    nodeIndex: idx,
    scheduledAt: node.startTime,
    estimatedPrice: node.category === 'dining' ? 0 : 88,
    recommendedByAI: false,
    selected: true,
    status: 'idle',
  }
}

function makeCake(node: PlanNode, idx: number, bookingId: string): Deliverable {
  const name = node.poi?.name ?? node.name
  const arrive = new Date(node.startTime ?? Date.now())
  arrive.setMinutes(arrive.getMinutes() - 5)
  return {
    id: `cake-${idx}`,
    kind: 'addon-cake',
    title: `6寸数字蛋糕送到 ${name}`,
    detail: `顺丰跑腿 · ${formatTime(arrive)} 送达包厢`,
    rationale: '你提到了纪念日/生日，AI 帮你想到了庆祝蛋糕',
    nodeIndex: idx,
    scheduledAt: arrive,
    dependsOn: [bookingId],
    estimatedPrice: 168,
    recommendedByAI: true,
    selected: true,
    status: 'idle',
  }
}

function makeFlower(
  node: PlanNode,
  idx: number,
  bookingId: string,
): Deliverable {
  const name = node.poi?.name ?? node.name
  const arrive = new Date(node.startTime ?? Date.now())
  arrive.setMinutes(arrive.getMinutes() - 10)
  return {
    id: `flower-${idx}`,
    kind: 'addon-flower',
    title: `粉雏菊送到 ${name} 包厢`,
    detail: `${formatTime(arrive)} 提前布置 · 花点时间花艺`,
    rationale: '送花到包厢，让气氛更温馨',
    nodeIndex: idx,
    scheduledAt: arrive,
    dependsOn: [bookingId],
    estimatedPrice: 98,
    recommendedByAI: true,
    selected: true,
    status: 'idle',
  }
}

function makeServiceNote(_node: PlanNode, idx: number, bookingId: string): Deliverable {
  return {
    id: `note-${idx}`,
    kind: 'service-note',
    title: '餐厅备注：儿童椅 + 不放香菜',
    detail: '下单后同步给餐厅前台',
    rationale: '检测到带娃出行，已自动加上常用备注',
    nodeIndex: idx,
    dependsOn: [bookingId],
    estimatedPrice: 0,
    recommendedByAI: true,
    selected: true,
    status: 'idle',
  }
}

function makeRide(plan: Plan, label: string): Deliverable {
  const last = plan.nodes[plan.nodes.length - 1]
  const depart = last?.startTime ? new Date(last.startTime) : new Date()
  depart.setMinutes(depart.getMinutes() - 15)
  return {
    id: 'ride-home',
    kind: 'logistics-ride',
    title: label,
    detail: `预计 ${formatTime(depart)} 司机到达 · 滴滴预约`,
    rationale: '行程结束自动叫车，不用现场等',
    scheduledAt: depart,
    estimatedPrice: 38,
    recommendedByAI: true,
    selected: true,
    status: 'idle',
  }
}

function makeParking(plan: Plan): Deliverable {
  const first = plan.nodes[firstNonFixedIndex(plan)]
  const arrive = first?.startTime ? new Date(first.startTime) : new Date()
  arrive.setMinutes(arrive.getMinutes() - 30)
  return {
    id: 'parking',
    kind: 'logistics-parking',
    title: '周边停车券 · 2 小时',
    detail: `${formatTime(arrive)} 起可用 · 5元/小时封顶`,
    rationale: '你提到开车前往，已找到最近停车场',
    nodeIndex: firstNonFixedIndex(plan),
    scheduledAt: arrive,
    estimatedPrice: 15,
    recommendedByAI: true,
    selected: false,
    status: 'idle',
  }
}

/** 从方案 + 约束 + 用户原话推断全部交付任务 */
export function inferAddOns(
  plan: Plan,
  constraints: Constraints,
  rawUserInput: string,
): Deliverable[] {
  const text = rawUserInput.toLowerCase()
  const items: Deliverable[] = []

  const celebration = hasKeyword(text, [
    '生日',
    '纪念日',
    '周年',
    '庆祝',
    'surprise',
    '惊喜',
  ])
  const driving = hasKeyword(text, ['开车', '自驾', '停车'])
  const isFamily = constraints.people.some((p) =>
    ['family', 'child_5', 'partner'].includes(p),
  )
  const isFriends = constraints.people.some((p) =>
    ['friends', 'group_4', 'mixed_gender'].includes(p),
  )
  const hasChild = constraints.people.includes('child_5')

  plan.nodes.forEach((node, idx) => {
    if (node.fixed || !node.poi) return
    const booking = makeBooking(node, idx)
    items.push(booking)

    if (node.category === 'dining') {
      if (hasChild || isFamily) {
        items.push(makeServiceNote(node, idx, booking.id))
      }
      if ((celebration || isFamily) && idx === lastDiningIndex(plan)) {
        items.push(makeCake(node, idx, booking.id))
        items.push(makeFlower(node, idx, booking.id))
      }
    }
  })

  const lastIdx = plan.nodes.length - 1
  const endsAtHome =
    plan.nodes[lastIdx]?.fixed || plan.nodes[lastIdx]?.type === 'home_back'

  if (!endsAtHome || isFamily || isFriends) {
    items.push(
      makeRide(
        plan,
        isFriends ? '22:00 代驾/网约车送大家回家' : '21:00 预约滴滴回家',
      ),
    )
  }

  if (driving) {
    items.push(makeParking(plan))
  }

  if (isFriends && celebration) {
    const diningIdx = lastDiningIndex(plan)
    if (diningIdx >= 0) {
      items.push({
        id: 'gift-friends',
        kind: 'addon-gift',
        title: '伴手礼打包（4 份）',
        detail: '晚餐后自取 · 人均约 ¥28',
        rationale: '朋友聚会常见需求，可带到下一场',
        nodeIndex: diningIdx,
        dependsOn: [`booking-${diningIdx}`],
        estimatedPrice: 112,
        recommendedByAI: true,
        selected: false,
        status: 'idle',
      })
    }
  }

  return items
}
