import { MockAPI } from './mockApi'
import type { Route } from './types'

/** 时间轴重算用同步路由（与 MockAPI.getRouteSync 等价） */
export function getRouteSync(
  from: [number, number],
  to: [number, number],
  mode?: 'drive' | 'walk' | 'subway',
): Route {
  return MockAPI.getRouteSync(from, to, mode)
}
