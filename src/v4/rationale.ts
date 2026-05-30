import type { Constraints, PlanNode } from '../agent/types'
import { getInventoryDisplay } from '../agent/nodeCopy'
import { getTransitLabel } from '../config/transitAssets'
import { AGENT_TYPE_TO_SCENE_LABEL } from '../config/nodeAssets'

export function buildVerifiedChecks(node: PlanNode, _nextNode?: PlanNode): string[] {
  const checks: string[] = []
  const inv = getInventoryDisplay(node)

  if (node.category === 'dining') {
    if (inv.level === 'green') checks.push('餐厅当前有余位')
    else if (inv.level === 'yellow') {
      const q = node.inventory?.queue
      checks.push(q && q > 0 ? `预计等位 ${q} 桌 · 可先取号` : '建议提前取号')
    } else {
      checks.push('当前时段较满 · 已备替代')
    }
  } else if (node.category === 'entertainment' || node.type === 'indoor_play') {
    checks.push(inv.level === 'green' ? '当前免排队 · 可即时入场' : inv.label)
    checks.push('已查实时人流')
  } else if (node.category === 'cultural' || node.type === 'exhibition') {
    checks.push('展览时段开放')
    checks.push('适合拍照打卡')
  } else {
    checks.push(inv.label)
  }

  if (node.transitMinutes && node.transitMinutes > 0) {
    const mode = node.transit?.mode ? getTransitLabel(node.transit.mode) : '路程'
    checks.push(`${mode}约 ${node.transitMinutes} 分钟 · 已计入行程`)
  }
  if (node.waitMinutes && node.waitMinutes > 0) {
    checks.push(`预计等位约 ${node.waitMinutes} 分钟`)
  }
  if (node.bufferMinutes && node.bufferMinutes > 0) {
    checks.push(`预留 ${node.bufferMinutes} 分钟给你调整节奏`)
  }
  if (node.flexMinutes && node.flexMinutes > 0) {
    checks.push(`活动时段可浮动 ±${node.flexMinutes} 分钟`)
  }

  if (node.poi?.rating && node.poi.rating >= 4.5) {
    checks.push(`评分 ${node.poi.rating} · 口碑稳定`)
  }

  return checks.slice(0, 4)
}

export function buildPhaseIntent(node: PlanNode, constraints: Constraints): string {
  if (node.category === 'entertainment' || node.type === 'indoor_play') {
    return constraints.people.includes('child_5') ? '释放孩子精力' : '先玩起来'
  }
  if (node.category === 'cultural' || node.type === 'exhibition') return '看展打卡'
  if (node.type === 'walk_street') return 'Citywalk 逛街'
  if (node.category === 'dining') {
    return constraints.people.includes('diet') ? '轻松晚餐' : '聚餐填肚'
  }
  if (node.category === 'outdoor' || node.type === 'garden') return '江边散步'
  if (node.type === 'night_market' || node.type === 'livehouse') return '夜宵小聚'
  return '行程段落'
}

export function buildStageRationale(node: PlanNode, constraints: Constraints): string[] {
  const bullets: string[] = []
  const name = node.poi?.name ?? node.name

  if (node.type === 'indoor_play' || node.category === 'entertainment') {
    if (constraints.people.includes('child_5')) bullets.push('适合 5 岁儿童')
    bullets.push('当前人流较少')
    bullets.push('可消耗孩子精力')
    bullets.push('顺路进入晚餐地点')
  } else if (node.category === 'dining') {
    if (constraints.people.includes('diet')) bullets.push('低脂菜单可选')
    bullets.push('出餐快、少排队')
    bullets.push('衔接上一站动线')
    if (node.poi?.rating) bullets.push(`评分 ${node.poi.rating}`)
  } else if (node.category === 'cultural' || node.type === 'exhibition') {
    bullets.push('适合 4 人同行拍照')
    bullets.push('展览时段开放')
    bullets.push('顺路衔接晚餐')
  } else if (node.type === 'walk_street') {
    bullets.push('适合边走边聊')
    bullets.push('小吃街选择多')
    bullets.push('衔接晚餐动线')
  } else if (node.category === 'outdoor' || node.type === 'garden') {
    bullets.push('天气窗口合适')
    bullets.push('轻松收尾下午')
    bullets.push('步行强度低')
  } else {
    bullets.push(`综合评分与距离优选 ${name}`)
    bullets.push('符合今日约束')
  }

  return bullets.slice(0, 4)
}

export function buildQualitySignals(node: PlanNode, nextNode?: PlanNode): string[] {
  const signals: string[] = []
  const inv = getInventoryDisplay(node)

  if (inv.level === 'green') {
    signals.push(node.category === 'dining' ? '当前有余位' : '当前免排队')
  } else if (inv.level === 'yellow') {
    signals.push(inv.label)
  } else {
    signals.push('建议更换地点')
  }

  if (node.status === 'confirmed') {
    signals.push('已预留入场')
  } else if (node.category === 'dining') {
    signals.push('可提前取号')
  }

  if (nextNode?.transit) {
    signals.push(`${getTransitLabel(nextNode.transit.mode)} ${nextNode.transit.duration} 分钟`)
  } else if (node.poi?.distance) {
    signals.push(`距离家 ${node.poi.distance} km`)
  }

  return signals.slice(0, 3)
}

export function resolveSceneLabel(node: PlanNode): string {
  return node.sceneLabel ?? AGENT_TYPE_TO_SCENE_LABEL[node.type] ?? node.name
}

export function inferPlanTitle(constraints: Constraints): string {
  if (constraints.people.includes('child_5') || constraints.people.includes('family')) {
    return '轻松亲子下午'
  }
  if (constraints.people.includes('friends')) return '朋友小聚下午'
  if (constraints.people.includes('couple')) return '情侣约会下午'
  if (constraints.preferences.includes('outdoor')) return '户外放风下午'
  return '本地探索下午'
}

export function inferSchemeSummary(constraints: Constraints): string {
  if (constraints.people.includes('friends')) {
    const parts = ['以社交节奏串联']
    if (constraints.preferences.includes('cultural')) parts.push('先看展再聚餐')
    else if (constraints.preferences.includes('walking')) parts.push('先逛街再吃饭')
    else parts.push('玩乐 + 聚餐')
    if (constraints.people.includes('group_4')) parts.push('4 人同行')
    if (constraints.budget === 'low' || constraints.budget === 'medium') parts.push('人均可控')
    return parts.join('，') + '。'
  }

  const parts: string[] = []
  if (constraints.people.includes('child_5')) parts.push('以亲子节奏串联')
  else parts.push('以轻松节奏串联')
  parts.push('室内为主')
  parts.push('16:00 后避雨')
  if (constraints.people.includes('diet')) parts.push('低脂饮食')
  return parts.join('，') + '。'
}
