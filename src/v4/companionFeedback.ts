import type { Constraints, Plan } from '../agent/types'
import type { NegotiationItemVM } from './types'
import { buildSceneUnderstanding } from './sceneUnderstanding'

export interface CompanionFeedback {
  id: string
  personName: string
  avatar: string
  request: string
  nodeIndex?: number
  vote?: 'approve' | 'reject'
  createdAt: number
}

/** 分享后模拟同伴回流（路线 A：有分享动作才有反馈） */
export function simulateCompanionResponses(
  plan: Plan,
  constraints: Constraints,
  audience: 'partner' | 'friends',
): CompanionFeedback[] {
  const scene = buildSceneUnderstanding(constraints)
  const now = Date.now()
  const bookable = plan.nodes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => !n.fixed && n.category === 'dining')

  const diningIdx = bookable[0]?.i ?? 2
  const playIdx =
    plan.nodes.findIndex(
      (n) => !n.fixed && (n.category === 'entertainment' || n.type === 'indoor_play'),
    ) ?? 1

  if (scene.kind === 'family' || audience === 'partner') {
    return [
      {
        id: `fb-${now}-1`,
        personName: '老婆',
        avatar: '👩',
        request: '晚餐别太油',
        nodeIndex: diningIdx,
        vote: 'reject',
        createdAt: now,
      },
      {
        id: `fb-${now}-2`,
        personName: '孩子',
        avatar: '👧',
        request: '想多玩一会',
        nodeIndex: playIdx >= 0 ? playIdx : undefined,
        vote: 'approve',
        createdAt: now + 1,
      },
    ]
  }

  return [
    {
      id: `fb-${now}-1`,
      personName: '朋友 A',
      avatar: '📸',
      request: '留点拍照时间',
      createdAt: now,
    },
    {
      id: `fb-${now}-2`,
      personName: '朋友 B',
      avatar: '💰',
      request: '晚餐别太贵',
      nodeIndex: diningIdx,
      vote: 'reject',
      createdAt: now + 1,
    },
  ]
}

export function feedbacksToNegotiations(
  feedbacks: CompanionFeedback[],
  plan: Plan,
): NegotiationItemVM[] {
  return feedbacks.map((fb) => {
    const node = fb.nodeIndex != null ? plan.nodes[fb.nodeIndex] : undefined
    const stopName = node?.poi?.name ?? node?.name
    const impacts = stopName ? [stopName] : []

    return {
      id: fb.id,
      personName: fb.personName,
      avatar: fb.avatar,
      request: fb.request,
      resolution: '',
      impacts,
      actions:
        fb.vote === 'reject' && fb.nodeIndex != null
          ? [
              { id: 'adopt', label: '调整', variant: 'primary' as const },
              { id: 'ignore', label: '忽略', variant: 'ghost' as const },
            ]
          : fb.vote === 'approve'
            ? [{ id: 'adopt', label: '好的', variant: 'secondary' as const }]
            : [{ id: 'adopt', label: '采纳', variant: 'primary' as const }],
    }
  })
}
