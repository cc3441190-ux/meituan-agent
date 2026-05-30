import type { Constraints, PlanNode } from './types'
import type { Inventory } from './types'

export type InventoryLevel = 'green' | 'yellow' | 'red'

export interface InventoryDisplay {
  level: InventoryLevel
  label: string
  pulse: boolean
}

export function buildNodeRationale(node: PlanNode, constraints: Constraints): string {
  if (node.fixed) return ''
  const name = node.poi?.name ?? node.name

  if (node.type === 'indoor_play' || node.category === 'entertainment') {
    if (constraints.people.includes('child_5')) {
      return `考虑到 5 岁小朋友的精力，为您挑选了周边评价最高的「${name}」——室内凉快、设施全，少走冤枉路。`
    }
    return `这站动线顺、口碑稳，${name} 不用折腾，适合你们今天的节奏。`
  }

  if (node.type === 'park' || node.category === 'outdoor') {
    return `天气和距离都合适，${name} 能让孩子放风、大人也轻松。`
  }

  if (node.type === 'light_meal' || (node.category === 'dining' && constraints.people.includes('diet'))) {
    return `嫂子最近在控卡，${name} 轻负担、出餐快，吃得舒服也不罪恶。`
  }

  if (node.category === 'dining') {
    return `带娃行程里这顿最关键——${name} 省心不排队，饭菜稳、妈妈少操心。`
  }

  if (node.poi?.rating && node.poi.rating >= 4.5) {
    return `综合评分 ${node.poi.rating}、距离 ${node.poi.distance}km，${name} 是这类型里我最放心的一选。`
  }

  return `结合您刚才说的需求，${name} 是当前条件下最省心的安排。`
}

function crowdFromInventory(inv: Inventory | undefined, node: PlanNode): InventoryDisplay {
  if (!inv) {
    if (node.category === 'entertainment' || node.category === 'outdoor') {
      return { level: 'green', label: '当前即时入场', pulse: true }
    }
    return { level: 'green', label: '资源校验通过', pulse: false }
  }

  if (!inv.available) {
    return {
      level: 'red',
      label: inv.reason ? `${inv.reason} · 建议换一家` : '已无空位 · Agent 建议换点',
      pulse: true,
    }
  }

  const queue = inv.queue ?? 0
  if (queue >= 3) {
    return { level: 'yellow', label: '人流量适中，建议提前锁定资格', pulse: true }
  }
  if (queue > 0) {
    return { level: 'yellow', label: `排队约 ${queue} 桌，建议预留`, pulse: true }
  }

  return { level: 'green', label: '当前即时入场', pulse: true }
}

/** 地图节点外显短标签（蓝/绿语义） */
export function getMapInventoryChip(node: PlanNode): InventoryDisplay | null {
  if (node.fixed || node.status === 'loading') return null
  const d = getInventoryDisplay(node)
  if (d.level === 'red') {
    return { ...d, label: '已满 · 建议换点' }
  }
  if (d.level === 'yellow') {
    const q = node.inventory?.queue
    return {
      ...d,
      label: q && q > 0 ? `需等位 ${q} 桌` : '建议提前锁定',
    }
  }
  return { ...d, label: '当前免排队' }
}

export function getInventoryDisplay(node: PlanNode): InventoryDisplay {
  if (node.status === 'error' || node.conflict === 'no_seat') {
    return { level: 'red', label: '当前时段已满 · 建议换一家', pulse: true }
  }
  if (node.conflict === 'no_ticket') {
    return { level: 'red', label: '当前无票 · 建议换景点或改时段', pulse: true }
  }
  if (node.conflict === 'time_short') {
    return { level: 'yellow', label: '行程冲突 · 建议顺延或缩短上一站', pulse: true }
  }
  return crowdFromInventory(node.inventory, node)
}

export function buildFamilyConsensusCopy(
  node: PlanNode,
  vote: 'approve' | 'reject',
): string {
  const name = node.poi?.name ?? node.name
  if (vote === 'approve') {
    return `老婆/家人也点头了「${name}」这站，全家人都看行了，可以出发～`
  }
  return `家人觉得「${name}」不太合适，Agent 正在帮您换一家更顺眼的。`
}
