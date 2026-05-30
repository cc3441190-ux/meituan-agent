import { LocalPlannerAgent } from '../../../agent/LocalPlannerAgent'
import { requiresSeatCheck, requiresTicketCheck } from '../../../agent/nodeAvailability'
import type { Constraints, Plan } from '../../../agent/types'
import { AGENT_TYPE_TO_SCENE_LABEL } from '../../../config/nodeAssets'
import type { IPlanningService, IPOIService } from '../../ports'

/** Mock 规划 —— 替换为 HttpPlanningService（调 LLM + 工具链） */
export class MockPlanningService implements IPlanningService {
  readonly mode = 'mock' as const
  private agent: LocalPlannerAgent

  constructor(poiService: IPOIService) {
    this.agent = new LocalPlannerAgent(poiService)
  }

  parseIntent(userInput: string) {
    return this.agent.parseIntent(userInput)
  }

  resolveConstraints(userInput: string) {
    return Promise.resolve(this.agent.parseIntent(userInput))
  }

  async createPlan(
    userInput: string,
    onLog?: (msg: string) => void,
    constraintsOverride?: Constraints,
  ): Promise<Plan> {
    if (onLog) this.agent.onLog = onLog

    onLog?.('========== 新规划任务 ==========')
    const constraints = constraintsOverride ?? this.agent.parseIntent(userInput)
    const skeleton = await this.agent.planSkeleton(constraints)

    for (let i = 0; i < skeleton.nodes.length; i++) {
      const node = skeleton.nodes[i]
      if (node.fixed) {
        node.status = 'confirmed'
        continue
      }

      // 休息/缓冲节点不需要 POI 搜索，直接标记 active
      if (node.type === 'rest' || node.category === 'rest') {
        node.status = 'active'
        node.sceneLabel = node.sceneLabel ?? '休息'
        continue
      }

      await this.agent.delay(600 + Math.random() * 400)
      node.status = 'loading'
      onLog?.(`ToolCaller: 填充节点 [${node.name}]…`)

      const poi = await this.agent.poiService.searchPOI(node.type, constraints)
      const inventory = requiresSeatCheck(node)
        ? await this.agent.poiService.checkInventory(poi.id, node.startTime)
        : requiresTicketCheck(node)
          ? await this.agent.poiService.checkTicketAvailability(poi.id, node.startTime)
          : { available: true, queue: 0 }

        node.poi = poi
        node.inventory = inventory
        node.status = inventory.available ? 'active' : 'error'
        if (!inventory.available) {
          node.conflict = requiresSeatCheck(node) ? 'no_seat' : 'no_ticket'
        }
        node.sceneLabel = AGENT_TYPE_TO_SCENE_LABEL[node.type]
      onLog?.(`  [${node.name}] ${poi.name} | 库存: ${inventory.available ? '有' : '无'}`)

      if (i > 0) {
        const prev = skeleton.nodes[i - 1]
        if (prev.poi && node.poi) {
          node.transit = await this.agent.poiService.getRoute(prev.poi.location, node.poi.location)
        }
      }
    }

    this.agent.finalizePlan(skeleton, constraints)
    onLog?.('========== 规划完成（含路程/等位/缓冲/时间窗校验） ==========')
    return skeleton
  }

  async replanLocal(plan: Plan, nodeIndex: number, command: string, onLog?: (msg: string) => void) {
    if (onLog) this.agent.onLog = onLog
    return this.agent.replanLocal(plan, nodeIndex, command)
  }
}
