import type { Deliverable } from './deliverables'
import type { Constraints, Inventory, POI, Route } from './types'

let flowerFailedOnce = false

type PoiDb = Record<string, POI[]>

const POI_DB: PoiDb = {
  park: [
    { id: 'p1', name: '彩虹亲子乐园', rating: 4.8, distance: 3.2, location: [30.5, 114.3], tags: ['适合5岁', '有停车场'] },
    { id: 'p2', name: '城市动物园', rating: 4.6, distance: 5.1, location: [30.6, 114.4], tags: ['亲子', '户外'] },
    { id: 'p3', name: '滨江公园', rating: 4.5, distance: 2.1, location: [30.4, 114.2], tags: ['免费', '骑行'] },
  ],
  indoor_play: [
    { id: 'i1', name: 'Meland Club', rating: 4.9, distance: 4.0, location: [30.5, 114.35], tags: ['淘气堡', '母婴室'] },
    { id: 'i2', name: '奈尔宝家庭中心', rating: 4.7, distance: 3.8, location: [30.52, 114.32], tags: ['高端', '预约制'] },
  ],
  light_meal: [
    { id: 'l1', name: 'Wagas 轻食', rating: 4.5, distance: 1.5, location: [30.48, 114.25], tags: ['减脂', '沙拉'] },
    { id: 'l2', name: 'Gaga 鲜语', rating: 4.6, distance: 2.2, location: [30.49, 114.28], tags: ['brunch', '拍照'] },
    { id: 'l3', name: '薄荷健康餐厅', rating: 4.3, distance: 3.0, location: [30.51, 114.3], tags: ['低卡', '亲子'] },
  ],
  family_restaurant: [
    { id: 'f1', name: '西贝莜面村', rating: 4.6, distance: 2.5, location: [30.5, 114.29], tags: ['儿童餐', '不辣'] },
    { id: 'f2', name: '亲子主题餐厅', rating: 4.4, distance: 3.3, location: [30.53, 114.31], tags: ['游乐角', '生日派对'] },
  ],
  bbq: [
    { id: 'b1', name: '很久以前羊肉串', rating: 4.8, distance: 2.8, location: [30.51, 114.27], tags: ['网红', '排队'] },
    { id: 'b2', name: '姜虎东白丁', rating: 4.7, distance: 3.5, location: [30.54, 114.33], tags: ['韩式', '聚会'] },
  ],
  hotpot: [
    { id: 'h1', name: '海底捞火锅', rating: 4.9, distance: 2.0, location: [30.49, 114.26], tags: ['服务', '美甲', '包间'] },
    { id: 'h2', name: '巴奴毛肚火锅', rating: 4.6, distance: 4.2, location: [30.55, 114.36], tags: ['毛肚', '排队'] },
  ],
  sichuan: [
    { id: 's1', name: '蜀大侠', rating: 4.5, distance: 3.1, location: [30.5, 114.3], tags: ['辣', '排队'] },
    { id: 's2', name: '马旺子', rating: 4.7, distance: 4.5, location: [30.56, 114.38], tags: ['精致', '贵'] },
  ],
  garden: [
    { id: 'g1', name: '武汉植物园', rating: 4.7, distance: 6.0, location: [30.58, 114.4], tags: ['温室', '拍照'] },
    { id: 'g2', name: '解放公园', rating: 4.5, distance: 2.3, location: [30.47, 114.24], tags: ['免费', '划船'] },
  ],
  exhibition: [
    { id: 'e1', name: '省博物馆', rating: 4.8, distance: 4.5, location: [30.55, 114.35], tags: ['编钟', '免费'] },
    { id: 'e2', name: '合美术馆', rating: 4.6, distance: 5.0, location: [30.57, 114.39], tags: ['当代', '小众'] },
  ],
  arcade: [
    { id: 'a1', name: '城市英雄电玩城', rating: 4.4, distance: 2.8, location: [30.52, 114.28], tags: ['跳舞机', '抓娃娃'] },
    { id: 'a2', name: 'X11潮玩集合', rating: 4.5, distance: 3.0, location: [30.53, 114.29], tags: ['盲盒', '拍照'] },
  ],
  night_market: [
    { id: 'n1', name: '保成路夜市', rating: 4.3, distance: 3.2, location: [30.51, 114.27], tags: ['小吃', '便宜'] },
    { id: 'n2', name: '花园道酒吧街', rating: 4.6, distance: 2.9, location: [30.5, 114.28], tags: ['清吧', '氛围'] },
  ],
  cafe: [
    { id: 'c1', name: '星巴克臻选', rating: 4.5, distance: 1.2, location: [30.48, 114.24], tags: ['安静', '办公'] },
    { id: 'c2', name: '茶颜悦色', rating: 4.8, distance: 0.8, location: [30.47, 114.23], tags: ['网红', '排队'] },
  ],
  walk_street: [
    { id: 'w1', name: '江汉路步行街', rating: 4.4, distance: 3.5, location: [30.52, 114.27], tags: ['历史', '购物'] },
    { id: 'w2', name: '昙华林', rating: 4.5, distance: 4.0, location: [30.54, 114.32], tags: ['文艺', '拍照'] },
  ],
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseExcludeIds(exclude?: string): Set<string> {
  if (!exclude?.trim()) return new Set()
  return new Set(
    exclude
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

function computeRoute(
  from: [number, number],
  to: [number, number],
  mode?: 'drive' | 'walk' | 'subway',
): Route {
  const dx = from[0] - to[0]
  const dy = from[1] - to[1]
  const distKm = Math.sqrt(dx * dx + dy * dy) * 100

  let resolved = mode
  if (!resolved) {
    if (distKm < 1.2) resolved = 'walk'
    else if (distKm > 5) resolved = 'subway'
    else resolved = 'drive'
  }

  const speed = { walk: 5, drive: 30, subway: 40 }[resolved]
  const duration = Math.max(resolved === 'walk' ? 5 : 8, Math.ceil((distKm / speed) * 60))
  return { distance: distKm.toFixed(1), duration, mode: resolved }
}

export const MockAPI = {
  async searchPOI(type: string, constraints: Constraints): Promise<POI> {
    const list = POI_DB[type] ?? POI_DB.cafe
    const excludeIds = parseExcludeIds(constraints._exclude)
    const scored = list
      .filter((p) => !excludeIds.has(p.id))
      .filter((p) => {
        if (constraints.budget !== 'low') return true
        return !p.tags.some((t) => t === '贵' || t === '高端' || t === '网红')
      })
      .map((p) => {
        let score = p.rating * 10
        if (constraints.location === 'nearby') score -= p.distance * 2
        if (constraints.budget === 'low' && p.tags.includes('便宜')) score += 20
        if (constraints.people.includes('child_5') && p.tags.includes('适合5岁')) score += 30
        // 多人聚会（如朋友 4 人）偏好聚会属性/包间/卡座
        if (
          constraints.people.includes('group_4') ||
          constraints.people.includes('friends')
        ) {
          if (['聚会', '包间', '卡座', '适合多人'].some((t) => p.tags.includes(t))) {
            score += 25
          }
        }
        // 男女混合聚会偏好氛围/拍照属性
        if (
          constraints.people.includes('mixed_gender') &&
          ['氛围', '拍照', '清吧'].some((t) => p.tags.includes(t))
        ) {
          score += 12
        }
        return { ...p, score }
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const pool = scored.length > 0 ? scored : list.filter((p) => !excludeIds.has(p.id))
    return pool[0] ?? list[0]
  },

  async checkInventory(poiId: string, _timeSlot?: Date): Promise<Inventory> {
    let hash = 0
    for (let i = 0; i < poiId.length; i++) hash = (hash * 31 + poiId.charCodeAt(i)) | 0
    const bucket = Math.abs(hash) % 100
    if (bucket < 8) return { available: false, reason: '已满座' }
    const queue = bucket % 6
    if (queue > 2) return { available: true, queue }
    return { available: true, queue: 0 }
  },

  async checkTicketAvailability(poiId: string, _timeSlot?: Date): Promise<Inventory> {
    let hash = 0
    for (let i = 0; i < poiId.length; i++) hash = (hash * 37 + poiId.charCodeAt(i)) | 0
    const bucket = Math.abs(hash) % 100
    if (bucket < 10) return { available: false, reason: '该时段门票已售罄' }
    if (bucket < 18) return { available: false, reason: '当日场次已满' }
    const queue = bucket % 5
    if (queue > 2) return { available: true, queue }
    return { available: true, queue: 0 }
  },

  async getRoute(
    from: [number, number],
    to: [number, number],
    mode?: 'drive' | 'walk' | 'subway',
  ): Promise<Route> {
    return Promise.resolve(computeRoute(from, to, mode))
  },

  /** 同步路由计算（供 schedulePlanTimeline 等本地重算使用） */
  getRouteSync(
    from: [number, number],
    to: [number, number],
    mode?: 'drive' | 'walk' | 'subway',
  ): Route {
    return computeRoute(from, to, mode)
  },

  async bookPOI(_poiId: string, _timeSlot?: Date) {
    await delay(400)
    return { success: true, orderId: `ORD${Date.now()}`, message: '预订成功' }
  },

  async bookDeliverable(d: Deliverable) {
    const wait = 800 + Math.floor(Math.random() * 1200)
    await delay(wait)

    if (d.kind === 'addon-flower' && !flowerFailedOnce) {
      flowerFailedOnce = true
      const fallback: Deliverable = {
        ...d,
        id: `${d.id}-fallback`,
        title: d.title.replace('花点时间', '花时间花艺').replace('粉雏菊', '混搭花束'),
        detail: '同价位替代 · 预计 25 分钟送达',
        estimatedPrice: 108,
        recommendedByAI: true,
        selected: true,
        status: 'idle',
        failureReason: undefined,
        fallback: undefined,
      }
      return {
        success: false,
        message: '店内当日鲜花已售罄',
        fallback,
      }
    }

    const eta =
      d.scheduledAt != null
        ? new Date(d.scheduledAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : undefined

    const orderId = `ORD${Date.now().toString(36).toUpperCase()}`
    const labels: Record<string, string> = {
      booking: '订位成功',
      'addon-cake': '蛋糕已下单',
      'addon-flower': '鲜花配送中',
      'addon-gift': '伴手礼已下单',
      'logistics-ride': '用车已预约',
      'logistics-parking': '停车券已发放',
      'service-note': '备注已同步',
      ticket: '门票已出',
    }

    return {
      success: true,
      orderId,
      message: labels[d.kind] ?? '已完成',
      eta,
    }
  },

  /** 演示重置：鲜花失败剧本只触发一次 */
  resetDeliverableDemoFlags() {
    flowerFailedOnce = false
  },
}
