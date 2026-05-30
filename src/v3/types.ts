export type StopVisualStatus = 'pending' | 'locked' | 'executing' | 'done' | 'error' | 'fixed'

export interface JourneyPhase {
  id: string
  phaseIndex: number
  intent: string
  timeRange: string
  nodeIndex: number
  title: string
  badge: string
  status: StopVisualStatus
  summary: string
  inventoryLabel?: string
  isCurrent: boolean
}

export interface CurrentPhaseInfo {
  phaseIndex: number
  intent: string
  title: string
  endTime: string
  nextLeg?: string
}

export interface MapInterestPoi {
  id: string
  name: string
  x: number
  y: number
  category: string
  /** 对应 nodeAssets 场景分类名 */
  sceneLabel: string
  /** 插入在该站点之后（与下一站之间） */
  afterNodeIndex: number
}

export interface InsertSuggestion {
  poi: MapInterestPoi
  addMinutes: number
  walkMinutes: number
  afterNodeIndex: number
  insertBetween: string
  dinnerDelay?: string
  warning?: string
}

export interface ExecutionTask {
  id: string
  label: string
  state: 'done' | 'running' | 'pending'
  progress?: number
}

export interface ConstraintTag {
  id: string
  label: string
}

export interface CollaboratorOpinion {
  id: string
  name: string
  avatar: string
  message: string
  role: 'partner' | 'friend' | 'agent'
  resolution?: string
}

export interface JourneyViewModel {
  title: string
  constraintTags: ConstraintTag[]
  weatherNote: string
  agentSummary: string | null
  phases: JourneyPhase[]
  currentPhase: CurrentPhaseInfo | null
  completedTasks: ExecutionTask[]
  runningTasks: ExecutionTask[]
  pendingAuthHint: string | null
  collaborators: CollaboratorOpinion[]
  focusNodeIndex: number
  totalDurationLabel: string
}
