export type ProposalStatus = 'pending' | 'locked' | 'error' | 'fixed'

/** 卡片外显色：待确认 / 已锁定 / 不可订·已满 */
export type ProposalVisualState = 'pending' | 'locked' | 'unavailable'

export interface ConstraintChip {
  id: string
  label: string
}

export interface ProposalCardVM {
  id: string
  phaseIndex: number
  intent: string
  poiName: string
  sceneLabel: string
  timeRange: string
  nodeIndex: number
  status: ProposalStatus
  visualState: ProposalVisualState
  qualitySignals: string[]
  verifiedChecks: string[]
  transactionChecks: string[]
  rationaleBullets: string[]
  inventoryLabel?: string
  isFocused: boolean
  /** 到达本站的路程（分钟），0 表示无 */
  transitMinutes: number
  /** 预计等位时间（分钟），0 表示无需等 */
  waitMinutes: number
}

export interface NegotiationAction {
  id: string
  label: string
  variant: 'primary' | 'secondary' | 'ghost'
}

export interface NegotiationItemVM {
  id: string
  personName: string
  avatar: string
  request: string
  resolution: string
  impacts: string[]
  actions: NegotiationAction[]
}

export interface ProposalViewModel {
  planTitle: string
  planSubtitle: string
  sceneLabel: string
  detectedPeople: string
  planningIntent: string
  autoConsiderations: string[]
  shareButtonLabel: string
  budgetLabel: string
  budgetDisplay: string
  timeRange: string
  totalBudget: number
  walkDistance: string
  stopCount: number
  constraintChips: ConstraintChip[]
  schemeSummary: string
  proposals: ProposalCardVM[]
  negotiations: NegotiationItemVM[]
  executionLine: string
  executionCta: string
  pendingCount: number
  readyToBook: boolean
  lockedCount: number
  bookableCount: number
}
