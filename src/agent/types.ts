export interface POI {
  id: string
  name: string
  rating: number
  distance: number
  location: [number, number]
  tags: string[]
  score?: number
}

export interface Inventory {
  available: boolean
  queue?: number
  reason?: string
}

export interface Route {
  distance: string
  duration: number
  mode: string
}

export type NodeStatus = 'active' | 'loading' | 'confirmed' | 'error' | 'warning'

export interface PlanNode {
  type: string
  name: string
  /** 对应 nodeAssets 里的中文分类名（与 PNG 文件名一致） */
  sceneLabel?: string
  category?: string
  duration: number
  fixed?: boolean
  startTime?: Date
  endTime?: Date
  /** 建议最早开始（含弹性） */
  earliestStart?: Date
  /** 建议最晚结束（含弹性） */
  latestEnd?: Date
  /** 到站前路程（分钟） */
  transitMinutes?: number
  /** 等位/入场（分钟） */
  waitMinutes?: number
  /** 用户整理缓冲（分钟） */
  bufferMinutes?: number
  /** 活动时段弹性 ±分钟 */
  flexMinutes?: number
  poi?: POI
  inventory?: Inventory
  status?: NodeStatus
  conflict?: string
  suggestedDelay?: number
  /** 满员时 AI 预备的同级备选（不自动替换） */
  suggestedAlternative?: string
  /** 用户已处理满员/库存问题 */
  inventoryResolved?: boolean
  transit?: Route
}

export interface Plan {
  nodes: PlanNode[]
  startTime: Date
  /** 压缩后仍超出用户时间窗（分钟） */
  timeWindowOverflowMinutes?: number
}

export interface Constraints {
  timeWindow: number
  people: string[]
  location: string
  /** 出发地展示名（不一定是家） */
  originName?: string
  /** 返程终点展示名，默认同出发地 */
  destinationName?: string
  preferences: string[]
  avoid: string[]
  budget: string
  _exclude?: string
  /** 当前站点语义名（填充 POI 时用） */
  _nodeName?: string
  /** 已选 POI 名称，避免重复 */
  _usedPoiNames?: string[]
  /** 用户原始输入 */
  _userInput?: string
}
