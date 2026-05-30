import { mergeConstraintsFromLlm } from '../../../agent/constraintNormalize'
import { LocalPlannerAgent } from '../../../agent/LocalPlannerAgent'
import { requiresSeatCheck, requiresTicketCheck } from '../../../agent/nodeAvailability'
import { AGENT_TYPE_TO_SCENE_LABEL } from '../../../config/nodeAssets'
import { fallbackSearchPOI } from '../fallback/poiFallback'
import type { Constraints, Plan, Route } from '../../../agent/types'
import type { IPlanningService, IPOIService } from '../../ports'
import { llmJson } from './llmClient'
import { postJson } from './httpClient'

type IntentResp = {
  timeWindow?: number
  people?: string[]
  location?: string
  originName?: string
  destinationName?: string
  preferences?: string[]
  avoid?: string[]
  budget?: string
}

/**
 * Live 规划：LLM 解析意图 + 规则骨架（避免 LLM 乱生成重复站点）+ 工具填充 POI
 */
export class HttpPlanningService implements IPlanningService {
  readonly mode = 'live' as const
  private readonly poiService: IPOIService
  private readonly agent: LocalPlannerAgent

  constructor(poiService: IPOIService) {
    this.poiService = poiService
    this.agent = new LocalPlannerAgent(poiService)
  }

  async createPlan(
    userInput: string,
    onLog?: (msg: string) => void,
    constraintsOverride?: Constraints,
  ): Promise<Plan> {
    if (onLog) this.agent.onLog = onLog

    onLog?.('LivePlanner: LLM 解析约束...')
    const constraints =
      constraintsOverride ?? (await this.parseIntentLive(userInput))
    onLog?.(`LivePlanner: 解析完成 ${JSON.stringify(constraints)}`)

    onLog?.('LivePlanner: 生成标准骨架（玩→吃→[加站]→返程）...')
    const plan = await this.agent.planSkeleton(constraints)

    for (let i = 0; i < plan.nodes.length; i++) {
      const node = plan.nodes[i]
      if (node.fixed) {
        node.status = 'confirmed'
        continue
      }

      // 休息/缓冲节点不需要 POI 搜索
      if (node.type === 'rest' || node.category === 'rest') {
        node.status = 'active'
        node.sceneLabel = node.sceneLabel ?? '休息'
        continue
      }

      const usedNames = plan.nodes
        .slice(0, i)
        .map((n) => n.poi?.name)
        .filter((n): n is string => Boolean(n))

      const fillConstraints: Constraints = {
        ...constraints,
        _nodeName: node.name,
        _usedPoiNames: usedNames,
        _userInput: userInput,
        _exclude: node.poi?.id,
      }

      onLog?.(`ToolCaller: 填充 [${node.name}]…`)
      await this.agent.delay(400)

      try {
        const poi = await this.poiService.searchPOI(node.type, fillConstraints)
        node.poi = poi
        node.sceneLabel = AGENT_TYPE_TO_SCENE_LABEL[node.type] ?? node.sceneLabel
        node.status = 'active'

        if (requiresSeatCheck(node)) {
          node.inventory = await this.poiService.checkInventory(poi.id, node.startTime)
          if (!node.inventory.available) {
            node.status = 'error'
            node.conflict = 'no_seat'
          }
        } else if (requiresTicketCheck(node)) {
          node.inventory = await this.poiService.checkTicketAvailability(poi.id, node.startTime)
          if (!node.inventory.available) {
            node.status = 'error'
            node.conflict = 'no_ticket'
          }
        } else {
          node.inventory = { available: true, queue: 0 }
        }

        onLog?.(`  → ${poi.name}`)
      } catch (err) {
        onLog?.(`  ⚠️ [${node.name}] 填充失败，使用 Plan B 兜底`)
        console.warn('[HttpPlanningService] 节点填充降级:', err)
        const fallbackPoi = await fallbackSearchPOI(node.type, fillConstraints)
        node.poi = fallbackPoi
        node.status = 'active'
        node.sceneLabel = AGENT_TYPE_TO_SCENE_LABEL[node.type] ?? node.sceneLabel
        node.inventory = { available: true, queue: 0 }
        onLog?.(`  → Plan B: ${fallbackPoi.name}`)
      }

      if (i > 0) {
        const prev = plan.nodes[i - 1]
        if (prev.poi && node.poi) {
          node.transit = await this.resolveRoute(prev.poi.location, node.poi.location)
        }
      }
    }

    this.agent.finalizePlan(plan, constraints)
    onLog?.('LivePlanner: 规划完成（含路程/等位/缓冲/时间窗校验）')
    return plan
  }

  async replanLocal(
    plan: Plan,
    nodeIndex: number,
    command: string,
    onLog?: (msg: string) => void,
  ): Promise<Plan> {
    if (onLog) this.agent.onLog = onLog
    return this.agent.replanLocal(plan, nodeIndex, command)
  }

  parseIntent(userInput: string): Constraints {
    return this.agent.parseIntent(userInput)
  }

  resolveConstraints(userInput: string): Promise<Constraints> {
    return this.parseIntentLive(userInput)
  }

  private async parseIntentLive(userInput: string): Promise<Constraints> {
    try {
      const result = await llmJson<IntentResp>([
        {
          role: 'system',
          content:
            '你是本地出行 Agent 意图解析器。只输出 JSON。timeWindow 必须是 3-8 的整数(小时)，不可用文字。people 从 family,child_5,diet,friends,group_4,mixed_gender,couple 中选。preferences 从 dining,entertainment,walking,cultural,outdoor 中选。budget 为 low|medium|high。location 为 current|nearby。originName/destinationName 为中文地名，无则省略。',
        },
        { role: 'user', content: userInput },
      ])
      const ruleFallback = this.agent.parseIntent(userInput)
      return mergeConstraintsFromLlm(result, ruleFallback)
    } catch {
      return this.agent.parseIntent(userInput)
    }
  }

  private async resolveRoute(from: [number, number], to: [number, number]): Promise<Route> {
    try {
      return await postJson<Route>('/poi/route', { from, to })
    } catch {
      return this.poiService.getRoute(from, to)
    }
  }
}
