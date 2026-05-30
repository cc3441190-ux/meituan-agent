import type { Deliverable } from '../../agent/deliverables'
import type { Constraints, InventoryResult, Plan, POI, Route } from '../../agent/types'

export type { InventoryResult }

/** 规划服务：自然语言 → 可执行行程（接入 LLM / 美团规划 API 时替换实现） */
export interface IPlanningService {
  readonly mode: 'mock' | 'live'
  createPlan(
    userInput: string,
    onLog?: (msg: string) => void,
    constraintsOverride?: Constraints,
  ): Promise<Plan>
  replanLocal(plan: Plan, nodeIndex: number, command: string, onLog?: (msg: string) => void): Promise<Plan>
  parseIntent(userInput: string): Constraints
  /** 异步意图解析（live 模式走 LLM） */
  resolveConstraints(userInput: string): Promise<Constraints>
}

/** 语音服务：录音 → 文本（接入讯飞 / 阿里云 ASR 时替换实现） */
export interface IVoiceService {
  readonly mode: 'mock' | 'live'
  isSupported(): boolean
  startListening(onPartial?: (text: string) => void): Promise<string>
  stopListening(): void
}

/** POI 服务：搜索、库存、路线（接入美团开放平台时替换实现） */
export interface IPOIService {
  readonly mode: 'mock' | 'live'
  searchPOI(type: string, constraints: Constraints): Promise<POI>
  checkInventory(poiId: string, timeSlot?: Date): Promise<InventoryResult>
  checkTicketAvailability(poiId: string, timeSlot?: Date): Promise<InventoryResult>
  getRoute(
    from: [number, number],
    to: [number, number],
    mode?: 'drive' | 'walk' | 'subway',
  ): Promise<Route>
}

/** 预订服务：下单 / 取消（接入美团预订 API 时替换实现） */
export interface IBookingService {
  readonly mode: 'mock' | 'live'
  book(poiId: string, timeSlot?: Date, meta?: Record<string, unknown>): Promise<BookingResult>
  cancel(orderId: string): Promise<{ ok: boolean }>
  executeAll(plan: Plan): Promise<BookingResult[]>
  dispatchDeliverable(d: Deliverable): Promise<BookingResult>
}

export interface BookingResult {
  success: boolean
  orderId?: string
  message: string
  eta?: string
  fallback?: Deliverable
}

export interface InviteCardStop {
  time: string
  name: string
}

/** 精美邀请卡：话术 + 路线摘要（可接 LLM / 分享 SDK） */
export interface InviteCard {
  headline: string
  body: string
  routeLine: string
  stops: InviteCardStop[]
}

/** 分享服务：生成发给家人/朋友的话术（接入 LLM 文案 API 时替换实现） */
export interface IShareService {
  readonly mode: 'mock' | 'live'
  buildShareText(plan: Plan, audience: 'partner' | 'friends'): Promise<string>
  buildAgentSummary(plan: Plan, constraints: Constraints): Promise<string>
  buildInviteCard(
    plan: Plan,
    audience: 'partner' | 'friends',
    constraints: Constraints,
  ): Promise<InviteCard>
}

export interface PlannerServices {
  planning: IPlanningService
  voice: IVoiceService
  poi: IPOIService
  booking: IBookingService
  share: IShareService
}
