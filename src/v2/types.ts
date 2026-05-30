export type StopVisualStatus = 'pending' | 'locked' | 'executing' | 'done' | 'error' | 'fixed'

export interface TimelineTransitItem {
  kind: 'transit'
  nodeIndex: number
  time: string
  label: string
  mode: string
  duration: number
  distance?: string
}

export interface TimelineStopItem {
  kind: 'stop'
  nodeIndex: number
  time: string
  endTime?: string
  title: string
  category?: string
  status: StopVisualStatus
  badge: string
  facts: string[]
  inventoryLabel?: string
  apiFreshness: string
  isBookable: boolean
}

export type TimelineItem = TimelineTransitItem | TimelineStopItem

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
}

export interface TimelineViewModel {
  title: string
  constraintTags: ConstraintTag[]
  weatherNote: string
  agentSummary: string | null
  items: TimelineItem[]
  completedTasks: ExecutionTask[]
  runningTasks: ExecutionTask[]
  pendingAuthHint: string | null
  collaborators: CollaboratorOpinion[]
  mapFocusIndex: number
}
