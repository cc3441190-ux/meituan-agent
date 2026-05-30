import { formatTime } from '../agent/constants'
import { getInventoryDisplay } from '../agent/nodeCopy'
import type { Constraints, Plan, PlanNode } from '../agent/types'
import { getTransitLabel } from '../config/transitAssets'
import type {
  ConstraintTag,
  CollaboratorOpinion,
  ExecutionTask,
  StopVisualStatus,
  TimelineItem,
  TimelineViewModel,
} from './types'

function resolveStopStatus(node: PlanNode, isExecuting: boolean): StopVisualStatus {
  if (node.fixed) return 'fixed'
  if (node.status === 'error') return 'error'
  if (isExecuting && node.status === 'confirmed') return 'executing'
  if (node.status === 'confirmed') return 'locked'
  if (node.status === 'loading') return 'executing'
  return 'pending'
}

function stopBadge(status: StopVisualStatus): string {
  switch (status) {
    case 'locked':
      return '已锁定'
    case 'executing':
      return '执行中'
    case 'done':
      return '已完成'
    case 'error':
      return '需调整'
    case 'fixed':
      return nodeFixedLabel()
    default:
      return '待确认'
  }
}

function nodeFixedLabel(): string {
  return '锚点'
}

function buildFacts(node: PlanNode, constraints: Constraints): string[] {
  const facts: string[] = []
  if (node.fixed) {
    facts.push(node.type === 'home' ? '行程起点' : '预计到达')
    return facts
  }

  if (node.duration > 0) {
    const h = Math.floor(node.duration / 60)
    const m = node.duration % 60
    facts.push(h > 0 ? `预计停留 ${h}h${m ? `${m}m` : ''}` : `预计停留 ${node.duration} 分钟`)
  }

  if (node.category === 'entertainment' || node.type === 'indoor_play') {
    facts.push(constraints.people.includes('child_5') ? '适合 3–6 岁 · 室内' : '室内活动')
  }
  if (node.category === 'dining') {
    if (constraints.people.includes('diet')) facts.push('低脂推荐')
    if (node.poi?.tags.includes('便宜')) facts.push('人均约 ¥98')
    else facts.push(`⭐ ${node.poi?.rating ?? 4.5} 分`)
    const q = node.inventory?.queue
    if (q && q > 0) facts.push(`剩余 ${q} 桌`)
  }
  if (node.category === 'outdoor') facts.push('日落时段最佳 · 步行可达')
  if (node.poi && node.poi.distance <= 3) facts.push(`距您 ${node.poi.distance}km`)

  return facts.slice(0, 4)
}

function buildConstraintTags(constraints: Constraints): ConstraintTag[] {
  const tags: ConstraintTag[] = []
  if (constraints.people.includes('child_5')) tags.push({ id: 'child', label: '适合 5 岁儿童' })
  if (constraints.people.includes('family')) tags.push({ id: 'family', label: '亲子出行' })
  tags.push({ id: 'indoor', label: '室内优先' })
  tags.push({ id: 'rain', label: '已规避降雨' })
  if (constraints.people.includes('diet')) tags.push({ id: 'diet', label: '低脂饮食' })
  const hours = constraints.timeWindow || 4
  tags.push({ id: 'duration', label: `总时长约 ${hours} 小时` })
  if (constraints.location === 'nearby') tags.push({ id: 'near', label: '离家不远' })
  return tags.slice(0, 5)
}

function buildExecutionTasks(
  plan: Plan,
  isPlanning: boolean,
  isExecuting: boolean,
  inviteLoading: boolean,
  lockedCount: number,
  bookableCount: number,
  readyToBook: boolean,
): { completed: ExecutionTask[]; running: ExecutionTask[]; pendingHint: string | null } {
  const completed: ExecutionTask[] = []
  const running: ExecutionTask[] = []

  if (!isPlanning && plan.nodes.length > 0) {
    completed.push({ id: 'route', label: '路线优化', state: 'done' })
    completed.push({ id: 'weather', label: '天气规避', state: 'done' })
  }

  const play = plan.nodes.find((n) => n.category === 'entertainment' || n.type === 'indoor_play')
  const meal = plan.nodes.find((n) => n.category === 'dining')

  if (play?.status === 'confirmed' || isExecuting) {
    completed.push({ id: 'play-book', label: '乐园预约', state: 'done' })
  } else if (play?.poi) {
    running.push({ id: 'play-book', label: '乐园预约校验', state: 'running', progress: 72 })
  }

  if (meal?.status === 'confirmed' || isExecuting) {
    completed.push({ id: 'meal-queue', label: '餐厅取号', state: 'done' })
  } else if (meal?.poi) {
    running.push({ id: 'meal-queue', label: '餐厅排队校验', state: 'running', progress: 58 })
  }

  if (isPlanning) {
    running.push({ id: 'plan', label: 'POI 数据校验', state: 'running', progress: 45 })
    running.push({ id: 'api', label: 'API 工具调度', state: 'running', progress: 30 })
  }

  if (inviteLoading) {
    running.push({ id: 'share', label: '生成共享行程', state: 'running', progress: 62 })
  }

  if (isExecuting) {
    running.push({ id: 'exec', label: '一键锁定席位', state: 'running', progress: 80 })
  }

  let pendingHint: string | null = null
  if (!isPlanning && !readyToBook && bookableCount > lockedCount) {
    pendingHint = `还有 ${bookableCount - lockedCount} 站待确认后可授权执行`
  } else if (readyToBook) {
    pendingHint = '全部站点已锁定 · 等待您授权扣款'
  }

  return { completed, running, pendingHint }
}

function buildCollaborators(consensusSummary: string | null): CollaboratorOpinion[] {
  const items: CollaboratorOpinion[] = [
    { id: 'wife', name: '老婆', avatar: '👩', message: '别吃太油', role: 'partner' },
    { id: 'friend', name: '朋友', avatar: '👤', message: '想加个小酒馆', role: 'friend' },
  ]
  if (consensusSummary) {
    items.push({
      id: 'agent',
      name: 'Agent',
      avatar: '🤖',
      message: consensusSummary.slice(0, 48),
      role: 'agent',
    })
  }
  return items
}

export function planToTimelineVM(input: {
  plan: Plan | null
  constraints: Constraints
  agentSummary: string | null
  isPlanning: boolean
  isExecuting: boolean
  inviteLoading: boolean
  lockedCount: number
  bookableCount: number
  readyToBook: boolean
  consensusSummary: string | null
  focusedIndex: number
}): TimelineViewModel | null {
  const { plan, constraints } = input
  if (!plan) return null

  const items: TimelineItem[] = []

  plan.nodes.forEach((node, idx) => {
    if (idx > 0 && node.transit) {
      items.push({
        kind: 'transit',
        nodeIndex: idx,
        time: formatTime(node.startTime),
        label: `前往 ${node.poi?.name ?? node.name}`,
        mode: getTransitLabel(node.transit.mode),
        duration: node.transit.duration,
        distance: node.transit.distance,
      })
    }

    const status = resolveStopStatus(node, input.isExecuting)
    const inv = !node.fixed ? getInventoryDisplay(node) : null

    items.push({
      kind: 'stop',
      nodeIndex: idx,
      time: formatTime(node.startTime),
      endTime: node.endTime ? formatTime(node.endTime) : undefined,
      title: node.poi?.name ?? node.name,
      category: node.category,
      status,
      badge: node.fixed ? (node.type === 'home' ? '出发' : '到达') : stopBadge(status),
      facts: buildFacts(node, constraints),
      inventoryLabel: inv?.label,
      apiFreshness: node.fixed ? '' : '美团 API · 30 秒前刷新',
      isBookable: !node.fixed,
    })
  })

  const { completed, running, pendingHint } = buildExecutionTasks(
    plan,
    input.isPlanning,
    input.isExecuting,
    input.inviteLoading,
    input.lockedCount,
    input.bookableCount,
    input.readyToBook,
  )

  return {
    title: input.isPlanning ? '正在生成下午计划…' : '下午计划已生成',
    constraintTags: buildConstraintTags(constraints),
    weatherNote: '16:00 后有小雨 · 已自动调整室内路线',
    agentSummary: input.agentSummary,
    items,
    completedTasks: completed,
    runningTasks: running,
    pendingAuthHint: pendingHint,
    collaborators: buildCollaborators(input.consensusSummary),
    mapFocusIndex: input.focusedIndex,
  }
}
