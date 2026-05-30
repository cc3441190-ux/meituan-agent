import type { IPOIService } from '../core/ports'
import {
  applyVagueDefaults,
  isVagueIntent,
  parseBudgetFromText,
  resolvePlanStartTime,
} from './intentRules'
import { availabilityConflictType, requiresTicketCheck } from './nodeAvailability'
import { syncNodeFromInventoryCheck, syncNodeFromTicketCheck } from './planGuards'
import { enforceTimeWindow, schedulePlanTimeline } from './timeline'
import type { Constraints, Plan, PlanNode } from './types'

export class LocalPlannerAgent {
  readonly poiService: IPOIService

  constructor(poiService: IPOIService) {
    this.poiService = poiService
  }
  constraints: Constraints = {
    timeWindow: 4,
    people: [],
    location: 'current',
    preferences: [],
    avoid: [],
    budget: 'medium',
  }

  toolLog: string[] = []
  onLog?: (msg: string) => void

  parseIntent(userInput: string): Constraints {
    const input = userInput.toLowerCase()
    const constraints: Constraints = {
      timeWindow: 4,
      people: [],
      location: 'current',
      preferences: [],
      avoid: [],
      budget: 'medium',
    }

    if (
      input.includes('老婆') ||
      input.includes('孩子') ||
      input.includes('家庭') ||
      input.includes('亲子')
    ) {
      constraints.people.push('family')
      if (input.includes('5岁') || input.includes('小孩')) constraints.people.push('child_5')
      if (input.includes('减肥') || input.includes('减脂') || input.includes('轻食')) {
        constraints.people.push('diet')
      }
    }
    if (input.includes('朋友') || input.includes('同学') || input.includes('聚会')) {
      constraints.people.push('friends')
      if (
        input.includes('4人') ||
        input.includes('四个') ||
        /4\s*个?(人|朋友|位)/.test(input)
      ) {
        constraints.people.push('group_4')
      }
      if (input.includes('男') && input.includes('女')) constraints.people.push('mixed_gender')
    }
    if (input.includes('情侣') || input.includes('约会')) constraints.people.push('couple')

    if (input.includes('下午') || input.includes('半天')) constraints.timeWindow = 4
    if (input.includes('晚上') || input.includes('夜')) constraints.timeWindow = 3
    if (input.includes('一整天') || input.includes('一天')) constraints.timeWindow = 8
    const hourMatch = input.match(/(\d+)\s*小时/)
    if (hourMatch) {
      const h = parseInt(hourMatch[1], 10)
      if (Number.isFinite(h) && h > 0) {
        constraints.timeWindow = Math.max(3, Math.min(8, h))
      }
    }

    if (input.includes('吃') || input.includes('餐') || input.includes('饭')) {
      constraints.preferences.push('dining')
    }
    if (input.includes('玩') || input.includes('乐') || input.includes('游')) {
      constraints.preferences.push('entertainment')
    }
    if (input.includes('走') || input.includes('逛') || input.includes('散步') || input.includes('citywalk')) {
      constraints.preferences.push('walking')
    }
    if (input.includes('安静') || input.includes('书') || input.includes('展')) {
      constraints.preferences.push('cultural')
    }
    if (input.includes('户外') || input.includes('公园') || input.includes('自然')) {
      constraints.preferences.push('outdoor')
    }

    if (input.includes('不吃辣') || input.includes('清淡')) constraints.avoid.push('spicy')
    if (input.includes('远') || input.includes('别太远') || input.includes('不要太远')) {
      constraints.location = 'nearby'
    }

    const parsedBudget = parseBudgetFromText(userInput)
    if (parsedBudget) constraints.budget = parsedBudget

    if (isVagueIntent(userInput)) applyVagueDefaults(constraints)

    let originName = '当前位置'
    let destinationName = '当前位置'

    const fromMatch = userInput.match(/从([^\s，,。！？；、]{1,12}?)(?:出发|去|玩|出门|开始)/)
    if (fromMatch?.[1]) originName = fromMatch[1].trim()

    const toMatch = userInput.match(/回([^\s，,。！？；、]{1,12}?)(?:$|，|。|后|去)/)
    if (toMatch?.[1]) destinationName = toMatch[1].trim()

    if (userInput.includes('公司') || userInput.includes('单位') || userInput.includes('写字楼')) {
      if (/回(公司|单位)/.test(userInput)) destinationName = '公司'
      if (/从(公司|单位)|公司出发|单位出发/.test(userInput)) originName = '公司'
    }
    if (userInput.includes('学校') || userInput.includes('校园')) {
      if (/回学校/.test(userInput)) destinationName = '学校'
      if (/从学校|学校出发/.test(userInput)) originName = '学校'
    }
    if (userInput.includes('酒店') || userInput.includes('宾馆')) {
      if (/回酒店/.test(userInput)) destinationName = '酒店'
      if (/从酒店|酒店出发/.test(userInput)) originName = '酒店'
    }
    if (/回家|回到家里|返回家/.test(userInput)) destinationName = '家'
    if (/从家|家里出发|在家出发|家门口/.test(userInput)) originName = '家'
    if (/在公司|在单位|在公司附近/.test(userInput) && originName === '当前位置') originName = '公司'
    if (/住酒店|在酒店/.test(userInput) && originName === '当前位置') originName = '酒店'

    constraints.originName = originName
    constraints.destinationName = destinationName
    constraints._userInput = userInput

    this.constraints = constraints
    this.log(`意图解析完成: ${JSON.stringify(constraints)}`)
    return constraints
  }

  async planSkeleton(constraints: Constraints): Promise<Plan> {
    this.log('Planner: 生成规划骨架...')
    const nodes: PlanNode[] = []
    const rawInput = constraints._userInput ?? ''
    const startTime = resolvePlanStartTime(constraints, rawInput)

    const originName = constraints.originName ?? '当前位置'
    const destinationName = constraints.destinationName ?? originName

    nodes.push({
      type: 'home',
      name: originName,
      sceneLabel: '起点',
      fixed: true,
      duration: 0,
    })

    const isLowBudget = constraints.budget === 'low'
    const isHighBudget = constraints.budget === 'high'

    if (constraints.people.includes('family')) {
      // 低预算优先免费户外；有 child_5 优先户外乐园
      if (isLowBudget || constraints.people.includes('child_5')) {
        nodes.push({ type: 'park', name: '公园/乐园', category: 'outdoor', duration: 90, _nodeName: '免费或低消费的亲子公园' } as typeof nodes[0])
      } else if (constraints.preferences.includes('outdoor') || constraints.preferences.length === 0) {
        nodes.push({ type: 'park', name: '公园/乐园', category: 'outdoor', duration: 90 })
      } else {
        nodes.push({ type: 'indoor_play', name: '室内游乐场', category: 'entertainment', duration: 90 })
      }
      // P1.6 亲子休息缓冲节点
      nodes.push({ type: 'rest', name: '休息补能', sceneLabel: '休息', category: 'rest', duration: 15, fixed: false })
      const diningType = constraints.people.includes('diet') ? 'light_meal' :
        isLowBudget ? 'light_meal' : 'family_restaurant'
      nodes.push({
        type: diningType,
        name: diningType === 'light_meal' ? '轻食餐厅' : '亲子餐厅',
        category: 'dining',
        duration: 60,
      })
      if (constraints.timeWindow >= 5) {
        nodes.push({ type: 'garden', name: '植物园/散步', category: 'outdoor', duration: 60 })
      }
    } else if (constraints.people.includes('friends')) {
      const wantsArcade = /电玩|桌游|密室|ktv/i.test(rawInput)
      if (constraints.preferences.includes('cultural')) {
        nodes.push({ type: 'exhibition', name: '展览/看展', category: 'cultural', duration: 90 })
      } else if (constraints.people.includes('mixed_gender') || constraints.preferences.includes('walking')) {
        nodes.push({ type: 'walk_street', name: '氛围感街区/打卡', category: 'walking', duration: 75, _nodeName: '有氛围感、可拍照的文艺街区' } as typeof nodes[0])
      } else if (constraints.preferences.includes('entertainment') && wantsArcade) {
        nodes.push({ type: 'arcade', name: '电玩/桌游', category: 'entertainment', duration: 90 })
      } else {
        nodes.push({ type: 'walk_street', name: '逛街/Citywalk', category: 'walking', duration: 60 })
      }
      // 低预算 → 避开高消费烧烤，改普通聚餐
      const diningType = isLowBudget ? 'family_restaurant' : 'bbq'
      nodes.push({ type: diningType, name: isLowBudget ? '实惠聚餐' : '烤肉/火锅', category: 'dining', duration: 90 })
      if (constraints.timeWindow >= 5 && !isLowBudget) {
        nodes.push({ type: 'night_market', name: isHighBudget ? '清吧/酒吧' : '夜市/酒吧', category: 'night', duration: 60 })
      }
    } else {
      nodes.push({ type: 'park', name: '公园散步', category: 'outdoor', duration: 60 })
      nodes.push({ type: isLowBudget ? 'cafe' : 'cafe', name: isLowBudget ? '性价比咖啡' : '下午茶', category: 'dining', duration: 60 })
    }

    nodes.push({
      type: 'home_back',
      name: destinationName,
      sceneLabel: '终点',
      fixed: true,
      duration: 0,
    })

    const plan: Plan = { nodes, startTime }
    schedulePlanTimeline(plan)
    this.log(`骨架规划完成: ${nodes.length} 个节点（已预留路程/等位/缓冲）`)
    return plan
  }

  detectConflicts(plan: Plan): number {
    this.log('ConflictDetector: 扫描冲突...')
    const { nodes } = plan
    let conflicts = 0

    for (let i = 1; i < nodes.length - 1; i++) {
      const prev = nodes[i - 1]
      const curr = nodes[i]

      if (curr.inventory && !curr.inventory.available) {
        curr.status = 'error'
        curr.conflict = availabilityConflictType(curr)
        conflicts++
        const label = curr.conflict === 'no_ticket' ? '无票' : '无座'
        this.log(`  ⚠️ [${curr.name}] ${curr.poi?.name ?? ''} ${label}`)
      }

      if (prev.poi && curr.poi) {
        const route = this.poiService.getRoute(prev.poi.location, curr.poi.location)
        const transitTime = route.duration
        const availableGap = ((curr.startTime?.getTime() ?? 0) - (prev.endTime?.getTime() ?? 0)) / 60000

        if (transitTime > availableGap + 5) {
          curr.status = curr.status === 'error' ? 'error' : 'warning'
          curr.conflict = curr.conflict ?? 'time_short'
          curr.suggestedDelay = transitTime - availableGap
          conflicts++
          this.log(`  ⚠️ [${curr.name}] 行程冲突：交通需${transitTime}分，但只空${Math.floor(availableGap)}分`)
        }
        curr.transit = route
      }

      if (curr.poi && curr.poi.distance > 15) {
        curr.status = 'warning'
        curr.conflict = 'too_far'
        conflicts++
        this.log(`  ⚠️ [${curr.name}] 距离${curr.poi.distance}km，超出舒适范围`)
      }
    }

    this.log(`冲突检测完成: ${conflicts} 个冲突`)
    return conflicts
  }

  async replanLocal(plan: Plan, nodeIndex: number, userCommand: string): Promise<Plan> {
    this.log(`LocalReplanner: 局部重规划节点[${nodeIndex}] "${userCommand}"...`)
    const node = plan.nodes[nodeIndex]
    const cmd = userCommand.toLowerCase()
    let newType = node.type

    if (cmd.includes('川菜') || cmd.includes('辣')) newType = 'sichuan'
    else if (cmd.includes('轻食') || cmd.includes('沙拉') || cmd.includes('减肥')) newType = 'light_meal'
    else if (cmd.includes('火锅')) newType = 'hotpot'
    else if (cmd.includes('烤肉') || cmd.includes('烧烤')) newType = 'bbq'
    else if (cmd.includes('换') && node.category === 'dining') newType = 'restaurant'
    else if (cmd.includes('乐园') || cmd.includes('摩天轮')) newType = 'park'
    else if (cmd.includes('展') || cmd.includes('馆')) newType = 'exhibition'
    else if (cmd.includes('删除') || cmd.includes('去掉')) {
      plan.nodes.splice(nodeIndex, 1)
      this.recalcTimes(plan)
      this.log('局部重规划完成: 删除节点')
      return plan
    }

    const extendMatch = cmd.match(/延长\s*(\d+)\s*分钟/)
    if (extendMatch) {
      const extra = parseInt(extendMatch[1], 10)
      if (Number.isFinite(extra) && extra > 0) {
        node.duration += extra
        this.recalcTimes(plan, nodeIndex)
        this.log(`局部重规划完成: 延长 ${extra} 分钟`)
        return plan
      }
    }

    if (newType !== node.type) {
      node.type = newType
      node.name = this.getTypeName(newType)
      node.category = this.getCategory(newType)
      node.poi = await this.poiService.searchPOI(newType, this.constraints)
      if (node.category === 'dining') {
        const inv = await this.poiService.checkInventory(node.poi.id, node.startTime)
        syncNodeFromInventoryCheck(node, inv)
      } else if (requiresTicketCheck(node)) {
        const inv = await this.poiService.checkTicketAvailability(node.poi.id, node.startTime)
        syncNodeFromTicketCheck(node, inv)
      } else {
        node.status = 'active'
        delete node.conflict
      }
    }

    this.recalcTimes(plan, nodeIndex)
    this.detectConflictsInRange(plan, Math.max(0, nodeIndex - 1), Math.min(plan.nodes.length - 1, nodeIndex + 2))
    this.log('局部重规划完成')
    return plan
  }

  recalcTimes(plan: Plan, _startIdx = 0) {
    void _startIdx
    schedulePlanTimeline(plan, (from, to) =>
      this.poiService.getRoute(from, to),
    )
  }

  detectConflictsInRange(plan: Plan, from: number, to: number) {
    for (let i = from; i <= to; i++) {
      if (i >= plan.nodes.length) break
      const node = plan.nodes[i]
      if (node.fixed) continue
      if (node.inventory && !node.inventory.available) {
        node.status = 'error'
        node.conflict = availabilityConflictType(node)
      }
    }
  }

  finalizePlan(plan: Plan, constraints: Constraints): void {
    schedulePlanTimeline(plan, (from, to) => this.poiService.getRoute(from, to))
    const { overflowMinutes } = enforceTimeWindow(
      plan,
      constraints.timeWindow,
      (from, to) => this.poiService.getRoute(from, to),
    )
    if (overflowMinutes > 0) {
      this.log(`TimeGuard: 压缩后仍超出时间窗 ${overflowMinutes} 分钟，已标注`)
    }
    this.detectConflicts(plan)
  }

  getTypeName(type: string): string {
    const map: Record<string, string> = {
      park: '公园/乐园',
      indoor_play: '室内游乐场',
      arcade: '电玩城',
      exhibition: '展览馆',
      walk_street: '步行街',
      garden: '植物园',
      light_meal: '轻食餐厅',
      family_restaurant: '亲子餐厅',
      bbq: '烤肉店',
      hotpot: '火锅店',
      sichuan: '川菜馆',
      cafe: '咖啡店',
      night_market: '夜市',
      home: '家',
      home_back: '回家',
    }
    return map[type] ?? type
  }

  getCategory(type: string): string {
    if (['park', 'indoor_play', 'arcade', 'exhibition'].includes(type)) return 'entertainment'
    if (['light_meal', 'family_restaurant', 'bbq', 'hotpot', 'sichuan', 'cafe', 'night_market'].includes(type)) {
      return 'dining'
    }
    if (['garden', 'walk_street'].includes(type)) return 'outdoor'
    return 'other'
  }

  log(msg: string) {
    this.toolLog.push(msg)
    this.onLog?.(msg)
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
