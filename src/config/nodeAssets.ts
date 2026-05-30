/**
 * 节点场景资源表
 * 文件名（不含扩展名）= 你的分类名；Agent 通过 label / agentType 查找对应图片
 */

export type NodeAssetGroup = '交通' | '餐饮' | '娱乐' | '休闲' | '购物' | '地标' | '其他'

export interface NodeAssetEntry {
  /** 与 PNG 文件名一致（不含 .png） */
  label: string
  /** public 下相对路径 */
  file: string
  group: NodeAssetGroup
  /** 对应 Agent 内部 type，便于 Mock/真 API 映射 */
  agentTypes: string[]
  note?: string
}

const NODES_BASE = '/assets/nodes'

function assetFile(name: string) {
  return `${NODES_BASE}/${encodeURIComponent(name)}.png`
}

/** 40+ 场景分类完整表 */
export const NODE_ASSET_REGISTRY: NodeAssetEntry[] = [
  { label: '起点', file: assetFile('起点'), group: '地标', agentTypes: ['home'] },
  { label: '终点', file: assetFile('终点'), group: '地标', agentTypes: ['home_back'] },

  { label: '地铁', file: assetFile('地铁'), group: '交通', agentTypes: ['transit_subway'] },
  { label: '步行', file: assetFile('步行'), group: '交通', agentTypes: ['transit_walk'] },
  { label: '网约车', file: assetFile('网约车'), group: '交通', agentTypes: ['transit_ride'] },
  { label: '自驾', file: assetFile('自驾'), group: '交通', agentTypes: ['transit_drive'] },
  { label: '城市骑行', file: assetFile('城市骑行'), group: '交通', agentTypes: ['transit_bike'] },

  { label: '轻食店', file: assetFile('轻食店'), group: '餐饮', agentTypes: ['light_meal'] },
  { label: '亲子餐厅', file: assetFile('亲子餐厅'), group: '餐饮', agentTypes: ['family_restaurant'] },
  { label: '烤肉店', file: assetFile('烤肉店'), group: '餐饮', agentTypes: ['bbq'] },
  { label: '火锅店', file: assetFile('火锅店'), group: '餐饮', agentTypes: ['hotpot'] },
  { label: '汤锅', file: assetFile('汤锅'), group: '餐饮', agentTypes: ['soup_pot'] },
  { label: '川菜馆', file: assetFile('川菜馆'), group: '餐饮', agentTypes: ['sichuan'] },
  { label: '日料店', file: assetFile('日料店'), group: '餐饮', agentTypes: ['japanese'] },
  { label: '茶餐厅', file: assetFile('茶餐厅'), group: '餐饮', agentTypes: ['tea_restaurant', 'cafe'] },
  { label: '甜品店', file: assetFile('甜品店'), group: '餐饮', agentTypes: ['dessert'] },
  { label: '缓冲咖啡', file: assetFile('缓冲咖啡'), group: '餐饮', agentTypes: ['coffee_break'] },

  { label: '亲子乐园', file: assetFile('亲子乐园'), group: '娱乐', agentTypes: ['park', 'theme_park'] },
  { label: '室内游乐场', file: assetFile('室内游乐场'), group: '娱乐', agentTypes: ['indoor_play'] },
  { label: '动物园', file: assetFile('动物园'), group: '娱乐', agentTypes: ['zoo'] },
  { label: '电玩城', file: assetFile('电玩城'), group: '娱乐', agentTypes: ['arcade'] },
  { label: '桌游馆', file: assetFile('桌游馆'), group: '娱乐', agentTypes: ['board_game'] },
  { label: 'KTV', file: assetFile('KTV'), group: '娱乐', agentTypes: ['ktv'] },
  { label: 'Livehouse', file: assetFile('Livehouse'), group: '娱乐', agentTypes: ['livehouse'] },

  { label: '展览馆', file: assetFile('展览馆'), group: '休闲', agentTypes: ['exhibition'] },
  { label: '博物馆', file: assetFile('博物馆'), group: '休闲', agentTypes: ['museum'] },
  { label: '画廊', file: assetFile('画廊'), group: '休闲', agentTypes: ['gallery'] },
  { label: '书店', file: assetFile('书店'), group: '休闲', agentTypes: ['bookstore'] },
  { label: '手工坊', file: assetFile('手工坊'), group: '休闲', agentTypes: ['craft'] },
  { label: '烘焙教室', file: assetFile('烘焙教室'), group: '休闲', agentTypes: ['baking'] },
  { label: '运动馆', file: assetFile('运动馆'), group: '休闲', agentTypes: ['sports'] },

  { label: '公园散步', file: assetFile('公园散步'), group: '休闲', agentTypes: ['park_walk'] },
  { label: '植物园', file: assetFile('植物园'), group: '休闲', agentTypes: ['garden'] },
  { label: '步行街', file: assetFile('步行街'), group: '休闲', agentTypes: ['walk_street'] },
  { label: '湖边漫步', file: assetFile('湖边漫步'), group: '休闲', agentTypes: ['lakeside'] },
  { label: '滨江步道', file: assetFile('滨江步道'), group: '休闲', agentTypes: ['riverside'] },
  { label: '郊外野餐', file: assetFile('郊外野餐'), group: '休闲', agentTypes: ['picnic'] },
  { label: '夜市', file: assetFile('夜市'), group: '休闲', agentTypes: ['night_market'] },

  {
    label: '文创市集',
    file: `${NODES_BASE}/${encodeURIComponent('文创市集 ')}.png`,
    group: '购物',
    agentTypes: ['creative_market'],
    note: '原文件名：文创市集 .png（末尾有空格）',
  },
  { label: '花市', file: assetFile('花市'), group: '购物', agentTypes: ['flower_market'] },
  { label: '超市', file: assetFile('超市'), group: '购物', agentTypes: ['supermarket'] },
  { label: '商场', file: assetFile('商场'), group: '购物', agentTypes: ['mall'] },
]

const MAP_BASE = '/assets/map'

export const MAP_ASSETS = {
  background: `${MAP_BASE}/${encodeURIComponent('新背景')}.jpeg`,
  roadGrowthVideo: `${MAP_BASE}/Clay_model_growth_animation_202605241937.mp4`,
  /** 道路生长视频默认倍速，可按 Agent 节奏调节 */
  defaultPlaybackRate: 1.25,
} as const

const byLabel = new Map(NODE_ASSET_REGISTRY.map((e) => [e.label, e]))
const byAgentType = new Map<string, NodeAssetEntry>()

for (const entry of NODE_ASSET_REGISTRY) {
  for (const t of entry.agentTypes) {
    if (!byAgentType.has(t)) byAgentType.set(t, entry)
  }
}

const FALLBACK = assetFile('亲子乐园')

/** Agent internal type → 你的场景分类名 */
export const AGENT_TYPE_TO_SCENE_LABEL: Record<string, string> = {
  home: '起点',
  home_back: '终点',
  park: '亲子乐园',
  theme_park: '亲子乐园',
  indoor_play: '室内游乐场',
  zoo: '动物园',
  light_meal: '轻食店',
  family_restaurant: '亲子餐厅',
  bbq: '烤肉店',
  hotpot: '火锅店',
  soup_pot: '汤锅',
  sichuan: '川菜馆',
  japanese: '日料店',
  cafe: '缓冲咖啡',
  coffee_break: '缓冲咖啡',
  tea_restaurant: '茶餐厅',
  dessert: '甜品店',
  garden: '植物园',
  park_walk: '公园散步',
  walk_street: '步行街',
  exhibition: '展览馆',
  museum: '博物馆',
  gallery: '画廊',
  arcade: '电玩城',
  board_game: '桌游馆',
  night_market: '夜市',
  picnic: '郊外野餐',
  lakeside: '湖边漫步',
  riverside: '滨江步道',
  sports: '运动馆',
  ktv: 'KTV',
  livehouse: 'Livehouse',
  transit_subway: '地铁',
  transit_walk: '步行',
  transit_ride: '网约车',
  transit_drive: '自驾',
  transit_bike: '城市骑行',
  creative_market: '文创市集',
  flower_market: '花市',
  supermarket: '超市',
  mall: '商场',
  bookstore: '书店',
  craft: '手工坊',
  baking: '烘焙教室',
  restaurant: '茶餐厅',
}

/** 按中文分类名（= 文件名）取图 */
export function getNodeAssetByLabel(label: string): string {
  return byLabel.get(label)?.file ?? FALLBACK
}

/** 按 Agent type 取图 */
export function getNodeAssetByAgentType(agentType: string): string {
  return byAgentType.get(agentType)?.file ?? FALLBACK
}

/** 节点展示：优先 poi 标签名，其次 type */
export function resolveNodeImage(options: {
  label?: string
  agentType?: string
  poiName?: string
}): string {
  if (options.label && byLabel.has(options.label)) {
    return getNodeAssetByLabel(options.label)
  }
  if (options.agentType) {
    const mapped = AGENT_TYPE_TO_SCENE_LABEL[options.agentType]
    if (mapped) return getNodeAssetByLabel(mapped)
    return getNodeAssetByAgentType(options.agentType)
  }
  return FALLBACK
}

/** 导出纯表格数据（文档/调试） */
export function listNodeAssetTable() {
  return NODE_ASSET_REGISTRY.map((e) => ({
    分类名: e.label,
    分组: e.group,
    Agent类型: e.agentTypes.join(', ') || '—',
    资源路径: e.file,
    备注: e.note ?? '',
  }))
}
