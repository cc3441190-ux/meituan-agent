import type { Constraints, Plan } from '../../../agent/types'
import type { IShareService, InviteCard } from '../../ports'
import {
  buildAgentSummaryCopy,
  buildInviteCardCopy,
  buildShareTextCopy,
  inferConstraintsFromPlan,
} from './shareCopy'

/** Mock 分享 —— 替换为 LLM 生成 */
export class MockShareService implements IShareService {
  readonly mode = 'mock' as const

  buildShareText(plan: Plan, audience: 'partner' | 'friends'): Promise<string> {
    return Promise.resolve(buildShareTextCopy(plan, audience, inferConstraintsFromPlan(plan)))
  }

  buildAgentSummary(plan: Plan, constraints: Constraints): Promise<string> {
    return Promise.resolve(buildAgentSummaryCopy(plan, constraints))
  }

  buildInviteCard(
    plan: Plan,
    audience: 'partner' | 'friends',
    constraints: Constraints,
  ): Promise<InviteCard> {
    return Promise.resolve(buildInviteCardCopy(plan, audience, constraints))
  }
}
