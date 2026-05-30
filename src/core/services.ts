import { env, hasBusinessApi } from '../config/env'
import type { PlannerServices } from './ports'
import { HttpBookingService } from './adapters/http/httpBookingService'
import { HttpPlanningService } from './adapters/http/httpPlanningService'
import { HttpPOIService } from './adapters/http/httpPoiService'
import { HttpShareService } from './adapters/http/httpShareService'
import { HttpVoiceService } from './adapters/http/httpVoiceService'
import { LlmPOIService } from './adapters/http/llmPoiService'
import { MockBookingService } from './adapters/mock/mockBookingService'
import { MockPlanningService } from './adapters/mock/mockPlanningService'
import { MockPOIService } from './adapters/mock/mockPoiService'
import { MockShareService } from './adapters/mock/mockShareService'
import { MockVoiceService } from './adapters/mock/mockVoiceService'

let cached: PlannerServices | null = null

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cached = null
  })
}

/** 服务工厂：mock / live 切换入口 */
export function createPlannerServices(): PlannerServices {
  if (cached) return cached

  if (env.plannerMode === 'live') {
    if (!env.llmApiKey.trim()) {
      console.warn('[Planner] live 模式需要 VITE_LLM_API_KEY，当前回退 mock')
    } else {
      const poi = hasBusinessApi() ? new HttpPOIService() : new LlmPOIService()
      cached = {
        planning: new HttpPlanningService(poi),
        voice: new HttpVoiceService(),
        poi,
        booking: hasBusinessApi() ? new HttpBookingService() : new MockBookingService(),
        share: new HttpShareService(),
      }
      return cached
    }
  }

  const poi = new MockPOIService()
  cached = {
    planning: new MockPlanningService(poi),
    voice: new MockVoiceService(),
    poi,
    booking: new MockBookingService(),
    share: new MockShareService(),
  }

  return cached
}

export function getServiceModeLabel(services: PlannerServices) {
  return services.planning.mode === 'mock' ? 'Mock 演示' : 'Live API'
}
