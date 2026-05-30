import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cloneDeliverables,
  estimateDeliverablesTotal,
  type Deliverable,
} from '../agent/deliverables'
import { inferAddOns } from '../agent/inferAddOns'
import { MockAPI } from '../agent/mockApi'
import { isMockMode } from '../config/env'
import { buildFamilyConsensusCopy } from '../agent/nodeCopy'
import {
  canExecuteBookings,
  estimateBookingTotal,
  findNextPendingIndex,
  getBookableCount,
  getLockedCount,
  getPendingCount,
  hasUnresolvedAvailability,
  refreshNodeAvailability,
  syncNodeFromInventoryCheck,
  syncNodeFromTicketCheck,
} from '../agent/planGuards'
import { requiresSeatCheck, requiresTicketCheck } from '../agent/nodeAvailability'
import { applyNodeTimePatch, nudgeNodeArrival } from '../agent/planTimeAdjust'
import { schedulePlanTimeline } from '../agent/timeline'
import { TaskRunner } from '../agent/taskRunner'
import type { Constraints, Plan, PlanNode } from '../agent/types'
import { usePlannerServices } from '../core/context'
import type { InviteCard } from '../core/ports'
import {
  simulateCompanionResponses,
  type CompanionFeedback,
} from '../v4/companionFeedback'
import { buildInventoryException } from '../v4/exceptionNegotiation'
import {
  createNodeFromInterest,
  insertNodeAfterIndex,
} from '../v3/planMutations'
import type { MapInterestPoi } from '../v3/types'

function inferAlternativeName(node: PlanNode): string {
  if (node.category === 'dining') return '禾绿轻食 · 同商圈'
  if (node.category === 'entertainment') return '室内亲子备选 · 同片区'
  return '同级备选地点'
}

function clonePlan(plan: Plan): Plan {
  return {
    ...plan,
    startTime: new Date(plan.startTime),
    timeWindowOverflowMinutes: plan.timeWindowOverflowMinutes,
    nodes: plan.nodes.map((n) => ({
      ...n,
      startTime: n.startTime ? new Date(n.startTime) : undefined,
      endTime: n.endTime ? new Date(n.endTime) : undefined,
      earliestStart: n.earliestStart ? new Date(n.earliestStart) : undefined,
      latestEnd: n.latestEnd ? new Date(n.latestEnd) : undefined,
      poi: n.poi ? { ...n.poi, location: [...n.poi.location] as [number, number] } : undefined,
      inventory: n.inventory ? { ...n.inventory } : undefined,
      transit: n.transit ? { ...n.transit } : undefined,
      suggestedAlternative: n.suggestedAlternative,
      inventoryResolved: n.inventoryResolved,
    })),
  }
}

export function useAgentPlanner() {
  const { planning, poi, booking, share } = usePlannerServices()
  const sessionRef = useRef(0)
  const lastInputRef = useRef('')
  const [confirmedConstraints, setConfirmedConstraints] = useState<Constraints | null>(null)

  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [, setLogs] = useState<string[]>(['Agent 就绪'])
  const [pageTitle, setPageTitle] = useState('下午行程')
  const [statusMessage, setStatusMessage] = useState('说句话或输入，帮你调整路线...')
  const [isPlanning, setIsPlanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [roadAnimate, setRoadAnimate] = useState(true)
  const [selectedNodeIdx, setSelectedNodeIdx] = useState<number | null>(null)
  const [agentSummary, setAgentSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [shareSheetOpen, setShareSheetOpen] = useState(false)
  const [inviteAudience, setInviteAudience] = useState<'partner' | 'friends'>('partner')
  const [inviteCard, setInviteCard] = useState<InviteCard | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [familyVotes, setFamilyVotes] = useState<Record<number, 'approve' | 'reject'>>({})
  const [consensusSummary, setConsensusSummary] = useState<string | null>(null)
  const [companionFeedbacks, setCompanionFeedbacks] = useState<CompanionFeedback[]>([])
  const [sharePendingFeedback, setSharePendingFeedback] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [inventorySheet, setInventorySheet] = useState<{
    nodeIndex: number
  } | null>(null)
  const [inventoryRefreshing, setInventoryRefreshing] = useState(false)
  const [detailClosing, setDetailClosing] = useState(false)
  const [stampedNodeIdx, setStampedNodeIdx] = useState<number | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [timeAdjustNodeIdx, setTimeAdjustNodeIdx] = useState<number | null>(null)
  const [actionToast, setActionToast] = useState<string | null>(null)
  const [preflightOpen, setPreflightOpen] = useState(false)
  const [trackerOpen, setTrackerOpen] = useState(false)
  const [deliveryComplete, setDeliveryComplete] = useState(false)
  const runnerRef = useRef<TaskRunner | null>(null)
  const autoShareOnDeliveryRef = useRef(false)
  /** 换店/局部重规划世代号，防止并发请求回写覆盖 */
  const nodeSwapGenRef = useRef<Map<number, number>>(new Map())
  const replanGenRef = useRef(0)
  const [swappingNodeIdx, setSwappingNodeIdx] = useState<number | null>(null)

  const appendLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setLogs((prev) => [...prev, `[${time}] ${msg}`])
  }, [])

  const updatePlan = useCallback((plan: Plan) => {
    setCurrentPlan(clonePlan(plan))
  }, [])

  const startPlanning = useCallback(
    async (userInput: string, constraintsOverride?: Constraints) => {
      const sessionId = ++sessionRef.current
      lastInputRef.current = userInput
      const resolved =
        constraintsOverride ?? planning.parseIntent(userInput)
      setConfirmedConstraints(resolved)
      setCurrentPlan(null)
      setIsPlanning(true)
      setRoadAnimate(true)
      setPageTitle('规划中...')
      setSelectedNodeIdx(null)
      setAgentSummary(null)
      setShareSheetOpen(false)
      setFamilyVotes({})
      setConsensusSummary(null)
      setCompanionFeedbacks([])
      setSharePendingFeedback(false)
      setReviewOpen(false)
      setInventorySheet(null)
      setDeliverables([])
      setPreflightOpen(false)
      setTrackerOpen(false)
      setDeliveryComplete(false)
      autoShareOnDeliveryRef.current = false
      runnerRef.current?.cancel()
      runnerRef.current = null
      if (isMockMode) MockAPI.resetDeliverableDemoFlags()

      try {
        let plan = await planning.createPlan(userInput, appendLog, resolved)
        if (sessionId !== sessionRef.current) return
        plan = clonePlan(plan)
        const diningIdx = plan.nodes.findIndex((n) => n.category === 'dining' && !n.fixed)
        const diningNode = diningIdx >= 0 ? plan.nodes[diningIdx] : null
        const playIdx = plan.nodes.findIndex(
          (n) => requiresTicketCheck(n) && !n.fixed && n.inventory?.available !== false,
        )
        const playNode = playIdx >= 0 ? plan.nodes[playIdx] : null

        if (
          diningNode &&
          diningNode.inventory?.available !== false &&
          Math.random() < 0.2
        ) {
          const dn = diningNode
          dn.status = 'error'
          dn.conflict = 'no_seat'
          dn.inventory = { available: false, reason: '该时段餐厅已满' }
          dn.suggestedAlternative = inferAlternativeName(dn)
          dn.inventoryResolved = false
          appendLog(`库存校验: [${dn.poi?.name ?? dn.name}] 已满 · 已备备选，等你决定`)
        } else if (
          playNode &&
          playNode.inventory?.available !== false &&
          Math.random() < 0.18
        ) {
          const pn = playNode
          pn.status = 'error'
          pn.conflict = 'no_ticket'
          pn.inventory = { available: false, reason: '该时段门票已售罄' }
          pn.suggestedAlternative = inferAlternativeName(pn)
          pn.inventoryResolved = false
          appendLog(`门票校验: [${pn.poi?.name ?? pn.name}] 无票 · 已备备选，等你决定`)
        }
        updatePlan(plan)
        setPageTitle('下午行程')
      } catch (err) {
        if (sessionId !== sessionRef.current) return
        const msg = err instanceof Error ? err.message : '未知错误'
        appendLog(`规划失败: ${msg}`)
        setStatusMessage('规划遇到问题，请稍后重试')
        setPageTitle('下午行程')
      } finally {
        if (sessionId === sessionRef.current) setIsPlanning(false)
      }
    },
    [appendLog, planning, updatePlan],
  )

  const resolveTargetIndex = useCallback((plan: Plan, command: string) => {
    let targetIdx = -1
    plan.nodes.forEach((n, i) => {
      if (command.includes(n.name) || (n.poi && command.includes(n.poi.name))) targetIdx = i
    })
    if (command.includes('第一家') || command.includes('第一个')) targetIdx = 1
    if (command.includes('最后') || command.includes('回家')) targetIdx = plan.nodes.length - 2
    if (command.includes('餐厅') || command.includes('吃')) {
      targetIdx = plan.nodes.findIndex((n) => n.category === 'dining')
    }
    return targetIdx
  }, [])

  const handleUserCommand = useCallback(
    async (command: string) => {
      if (!currentPlan) {
        await startPlanning(command)
        return
      }

      setStatusMessage(`执行：${command}...`)

      if (command.includes('重新规划') || command.includes('全部') || command.includes('重来')) {
        await startPlanning(command)
        return
      }

      const targetIdx = resolveTargetIndex(currentPlan, command)
      if (targetIdx === -1) {
        setStatusMessage('没听清要改哪里，可以说「把餐厅换成…」或「删除第二站」')
        return
      }

      const gen = ++replanGenRef.current
      const updated = await planning.replanLocal(clonePlan(currentPlan), targetIdx, command, appendLog)
      if (gen !== replanGenRef.current) return
      setRoadAnimate(false)
      updatePlan(updated)

      const node = updated.nodes[targetIdx]
      if (node) {
        setStatusMessage(`已调整：${node.name} → ${node.poi?.name ?? node.name}`)
        window.setTimeout(() => setStatusMessage('说句话或输入，帮你调整路线...'), 3000)
      }
    },
    [appendLog, currentPlan, planning, resolveTargetIndex, startPlanning, updatePlan],
  )

  const changeNode = useCallback(
    async (idx: number) => {
      if (!currentPlan) return
      const nextGen = (nodeSwapGenRef.current.get(idx) ?? 0) + 1
      nodeSwapGenRef.current.set(idx, nextGen)
      setSwappingNodeIdx(idx)

      try {
        const plan = clonePlan(currentPlan)
        const node = plan.nodes[idx]
        if (!node || node.fixed) return

        const constraints = planning.parseIntent(lastInputRef.current)
        const triedIds = new Set<string>()
        if (node.poi?.id) triedIds.add(node.poi.id)

        let newPoi = await poi.searchPOI(node.type, {
          ...constraints,
          _exclude: [...triedIds].join(','),
        })
        triedIds.add(newPoi.id)

        if (nodeSwapGenRef.current.get(idx) !== nextGen) return

        if (requiresSeatCheck(node)) {
          let inv = await poi.checkInventory(newPoi.id, node.startTime)
          let attempt = 0
          while (!inv.available && attempt < 3) {
            if (nodeSwapGenRef.current.get(idx) !== nextGen) return
            attempt++
            newPoi = await poi.searchPOI(node.type, {
              ...constraints,
              _exclude: [...triedIds].join(','),
            })
            triedIds.add(newPoi.id)
            inv = await poi.checkInventory(newPoi.id, node.startTime)
          }
          syncNodeFromInventoryCheck(node, inv, {
            suggestedAlternative: inferAlternativeName(node),
          })
        } else if (requiresTicketCheck(node)) {
          let inv = await poi.checkTicketAvailability(newPoi.id, node.startTime)
          let attempt = 0
          while (!inv.available && attempt < 3) {
            if (nodeSwapGenRef.current.get(idx) !== nextGen) return
            attempt++
            newPoi = await poi.searchPOI(node.type, {
              ...constraints,
              _exclude: [...triedIds].join(','),
            })
            triedIds.add(newPoi.id)
            inv = await poi.checkTicketAvailability(newPoi.id, node.startTime)
          }
          syncNodeFromTicketCheck(node, inv, {
            suggestedAlternative: inferAlternativeName(node),
          })
        } else {
          node.status = 'active'
          delete node.conflict
          node.inventory = { available: true, queue: 0 }
        }

        if (nodeSwapGenRef.current.get(idx) !== nextGen) return

        node.poi = newPoi
        node.name = newPoi.name

        const prev = plan.nodes[idx - 1]
        if (prev?.poi && node.poi) {
          node.transit = poi.getRoute(prev.poi.location, node.poi.location)
        }
        schedulePlanTimeline(plan, (from, to) => poi.getRoute(from, to))

        appendLog(
          `用户操作: 更换为 ${newPoi.name}${node.inventory?.available === false ? '（该时段仍紧张）' : ''}`,
        )
        setRoadAnimate(false)
        updatePlan(plan)
        setSelectedNodeIdx(idx)
        if (node.inventory?.available) {
          setActionToast(`已换为 ${newPoi.name} · 当前时段可订`)
        } else if (node.conflict === 'no_ticket') {
          setActionToast(`${newPoi.name} 仍无票，可再换一家或调整时间`)
        } else {
          setActionToast(`${newPoi.name} 仍无空位，可再换一家或调整时间`)
        }
      } catch (err) {
        if (nodeSwapGenRef.current.get(idx) !== nextGen) return
        const msg = err instanceof Error ? err.message : '网络异常'
        appendLog(`换店失败: ${msg}`)
        setActionToast('换店失败，请稍后重试')
      } finally {
        if (nodeSwapGenRef.current.get(idx) === nextGen) {
          setSwappingNodeIdx(null)
        }
      }
    },
    [appendLog, currentPlan, planning, poi, updatePlan],
  )

  const deleteNode = useCallback(
    async (idx: number) => {
      if (!currentPlan) return
      const updated = await planning.replanLocal(
        clonePlan(currentPlan),
        idx,
        '删除这一站',
        appendLog,
      )
      setRoadAnimate(false)
      updatePlan(updated)
      setSelectedNodeIdx(null)
    },
    [appendLog, currentPlan, planning, updatePlan],
  )

  const replanNode = useCallback(
    async (idx: number, command: string) => {
      if (!currentPlan) return
      const updated = await planning.replanLocal(clonePlan(currentPlan), idx, command, appendLog)
      setRoadAnimate(false)
      updatePlan(updated)
      setSelectedNodeIdx(idx)
    },
    [appendLog, currentPlan, planning, updatePlan],
  )

  const getRouteResolver = useCallback(
    (from: [number, number], to: [number, number]) => poi.getRoute(from, to),
    [poi],
  )

  const openTimeAdjust = useCallback(
    (idx: number) => {
      if (!currentPlan) return
      const node = currentPlan.nodes[idx]
      if (!node || node.fixed) return
      setTimeAdjustNodeIdx(idx)
      setSelectedNodeIdx(idx)
    },
    [currentPlan],
  )

  const closeTimeAdjust = useCallback(() => {
    setTimeAdjustNodeIdx(null)
  }, [])

  const applyNodeTimeAdjust = useCallback(
    (idx: number, patch: { durationMinutes: number; arrivalTime: string }) => {
      if (!currentPlan) return
      const updated = applyNodeTimePatch(
        clonePlan(currentPlan),
        idx,
        patch,
        getRouteResolver,
      )
      setRoadAnimate(false)
      updatePlan(updated)
      setTimeAdjustNodeIdx(null)
      const node = updated.nodes[idx]
      appendLog(
        `用户操作: 调节 [${node?.poi?.name ?? node?.name}] 停留${patch.durationMinutes}分 · 到达${patch.arrivalTime}`,
      )
    },
    [appendLog, currentPlan, getRouteResolver, updatePlan],
  )

  const nudgeNodeTime = useCallback(
    (idx: number, deltaMinutes: number) => {
      if (!currentPlan) return
      const updated = nudgeNodeArrival(clonePlan(currentPlan), idx, deltaMinutes, getRouteResolver)
      setRoadAnimate(false)
      updatePlan(updated)
      appendLog(`用户操作: ${deltaMinutes > 0 ? '延后' : '提前'} ${Math.abs(deltaMinutes)} 分钟`)
    },
    [appendLog, currentPlan, getRouteResolver, updatePlan],
  )

  const insertNodeAfter = useCallback(
    async (afterIndex: number, interest: MapInterestPoi) => {
      if (!currentPlan) return
      const constraints = planning.parseIntent(lastInputRef.current)
      const draft = createNodeFromInterest(interest)
      draft.poi = await poi.searchPOI(draft.type, constraints)
      draft.sceneLabel = interest.sceneLabel

      const insertAt = afterIndex + 1
      const slotTime =
        currentPlan.nodes[afterIndex]?.endTime ??
        currentPlan.nodes[insertAt]?.startTime ??
        currentPlan.startTime

      if (draft.category === 'dining') {
        const inv = await poi.checkInventory(draft.poi.id, slotTime)
        draft.inventory = inv
        draft.status = inv.available ? 'active' : 'error'
        if (!inv.available) draft.conflict = 'no_seat'
      } else if (requiresTicketCheck(draft)) {
        const inv = await poi.checkTicketAvailability(draft.poi.id, slotTime)
        draft.inventory = inv
        draft.status = inv.available ? 'active' : 'error'
        if (!inv.available) draft.conflict = 'no_ticket'
      }

      let plan = insertNodeAfterIndex(
        clonePlan(currentPlan),
        afterIndex,
        draft,
        (from, to) => poi.getRoute(from, to),
      )

      for (let i = Math.max(0, afterIndex); i <= insertAt + 1 && i < plan.nodes.length; i++) {
        const node = plan.nodes[i]
        if (node.fixed || node.status === 'confirmed') continue
        if (node.inventory && !node.inventory.available) {
          node.status = 'error'
          node.conflict = requiresSeatCheck(node) ? 'no_seat' : 'no_ticket'
        }
      }

      appendLog(`用户操作: 在段 ${afterIndex + 1} 插入 [${draft.poi.name}]`)
      setRoadAnimate(false)
      updatePlan(plan)
      setSelectedNodeIdx(insertAt)
      return insertAt
    },
    [appendLog, currentPlan, planning, poi, updatePlan],
  )

  const confirmNode = useCallback(
    (idx: number) => {
      if (!currentPlan) return
      const plan = clonePlan(currentPlan)
      plan.nodes[idx].status = 'confirmed'
      appendLog(`用户操作: 确认锁定 [${plan.nodes[idx].poi?.name ?? plan.nodes[idx].name}]`)
      setRoadAnimate(false)
      setDetailClosing(true)
      setStampedNodeIdx(idx)
      updatePlan(plan)

      return { plan, idx }
    },
    [appendLog, currentPlan, updatePlan],
  )

  const finishConfirmAnimation = useCallback(
    (plan: Plan, idx: number, scrollToNode: (index: number) => void) => {
      window.setTimeout(() => {
        setSelectedNodeIdx(null)
        setDetailClosing(false)
        const nextIdx = findNextPendingIndex(plan, idx)
        if (nextIdx !== -1) {
          window.setTimeout(() => scrollToNode(nextIdx), 120)
        }
        window.setTimeout(() => setStampedNodeIdx(null), 700)
      }, 420)
    },
    [],
  )

  const bookNode = useCallback(
    async (idx: number) => {
      if (!currentPlan) return
      const node = currentPlan.nodes[idx]
      if (!node.poi) return
      const res = await booking.book(node.poi.id, node.startTime)
      appendLog(`预订成功: ${res.orderId ?? ''}`)
      setActionToast(`${node.poi.name} 预订成功 · 订单 ${res.orderId}`)
    },
    [appendLog, booking, currentPlan],
  )

  const executeAllBookings = useCallback(async () => {
    if (!currentPlan) return
    if (!canExecuteBookings(currentPlan)) {
      const n = getPendingCount(currentPlan)
      setActionToast(n > 0 ? `还有 ${n} 站待确认，请先在方案卡片上确认各站` : '暂无可预订站点')
      return
    }
    setIsExecuting(true)
    appendLog('Executor: 一键执行已确认节点…')
    try {
      const results = await booking.executeAll(currentPlan)
      appendLog(`Executor: 完成 ${results.length} 笔订单`)
      setActionToast(
        results.length
          ? `已完成 ${results.length} 笔预订，详见交付追踪`
          : '请先确认各站点后再一键预订',
      )
    } finally {
      setIsExecuting(false)
    }
  }, [appendLog, booking, currentPlan])

  const unresolvedInventory = useMemo(() => {
    if (!currentPlan) return [] as number[]
    return currentPlan.nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => hasUnresolvedAvailability(n))
      .map(({ i }) => i)
  }, [currentPlan])

  const scheduleConflictIndex = useMemo(() => {
    if (!currentPlan) return null
    for (let i = 0; i < currentPlan.nodes.length; i++) {
      if (currentPlan.nodes[i].conflict === 'time_short') return i
    }
    return null
  }, [currentPlan])

  const openReview = useCallback(() => {
    if (!currentPlan) return
    if (!canExecuteBookings(currentPlan)) {
      const n = getPendingCount(currentPlan)
      setActionToast(n > 0 ? `还有 ${n} 站待确认，请先逐站点击「确认」` : '暂无可交付站点')
      return
    }
    if (unresolvedInventory.length > 0) {
      setInventorySheet({ nodeIndex: unresolvedInventory[0] })
      appendLog('有站点库存异常，请先处理再授权代办')
      return
    }
    setReviewOpen(true)
  }, [appendLog, currentPlan, unresolvedInventory])

  const openPreflight = openReview

  const toggleDeliverable = useCallback((id: string) => {
    setDeliverables((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)),
    )
  }, [])

  const openTracker = useCallback(() => {
    setTrackerOpen(true)
  }, [])

  const commitAndDispatch = useCallback(
    async (itemsOverride?: Deliverable[]) => {
    if (!currentPlan) return
    const list = itemsOverride ?? deliverables
    const selected = list.filter((d) => d.selected)
    if (selected.length === 0) {
      setActionToast('请至少选择一项要交付的任务')
      return
    }
    if (itemsOverride) setDeliverables(itemsOverride)
    setPreflightOpen(false)
    setReviewOpen(false)
    setTrackerOpen(true)
    setIsExecuting(true)
    setDeliveryComplete(false)
    appendLog(`TaskRunner: 开始交付 ${selected.length} 项…`)

    const runner = new TaskRunner(cloneDeliverables(list), booking, {
      onUpdate: (d) => {
        setDeliverables((prev) => prev.map((x) => (x.id === d.id ? { ...d } : x)))
        const items = runner.getItems()
        const needsAttention = items.some(
          (x) => x.selected && x.status === 'fallback_proposed',
        )
        const allDone = items.every(
          (x) =>
            !x.selected ||
            x.status === 'done' ||
            (!needsAttention && x.status === 'failed'),
        )
        if (allDone && !needsAttention) {
          setIsExecuting(false)
          setDeliveryComplete(true)
        }
      },
      onAllDone: () => {
        setIsExecuting(false)
        setDeliveryComplete(true)
        appendLog('TaskRunner: 全部交付完成')
      },
      onNeedsAttention: (d) => {
        setIsExecuting(false)
        setTrackerOpen(true)
        appendLog(`交付需确认: ${d.title}`)
      },
    })
    runnerRef.current = runner
    await runner.dispatch()
    const needsAttention = runner
      .getItems()
      .some((d) => d.selected && d.status === 'fallback_proposed')
    if (!needsAttention) {
      const allDone = runner.getItems().every(
        (d) => !d.selected || d.status === 'done' || d.status === 'failed',
      )
      if (allDone) {
        setIsExecuting(false)
        setDeliveryComplete(true)
      }
    }
  },
    [appendLog, booking, currentPlan, deliverables],
  )

  const proceedToPreflight = useCallback(() => {
    if (!currentPlan) return
    const constraints = planning.parseIntent(lastInputRef.current)
    const inferred = inferAddOns(currentPlan, constraints, lastInputRef.current)
    setDeliverables(inferred)
    setReviewOpen(false)
    appendLog(`交付清单: ${inferred.length} 项任务`)

    const quickMode = new URLSearchParams(window.location.search).get('quick') === '1'
    if (quickMode) {
      void commitAndDispatch(inferred)
    } else {
      setPreflightOpen(true)
    }
  }, [appendLog, commitAndDispatch, currentPlan, planning])

  const awaitingDispatch = useMemo(
    () =>
      deliverables.some((d) => d.selected) &&
      !deliverables.some((d) => d.selected && d.status !== 'idle') &&
      !isExecuting &&
      !deliveryComplete,
    [deliverables, isExecuting, deliveryComplete],
  )

  const retryDeliverable = useCallback(
    async (id: string) => {
      if (!runnerRef.current) return
      setIsExecuting(true)
      await runnerRef.current.retry(id)
      const items = runnerRef.current.getItems()
      const needsAttention = items.some((d) => d.status === 'fallback_proposed')
      const allDone = items.every(
        (d) => !d.selected || d.status === 'done' || (!needsAttention && d.status === 'failed'),
      )
      if (allDone && !needsAttention) {
        setIsExecuting(false)
        setDeliveryComplete(true)
      } else if (!needsAttention) {
        setIsExecuting(false)
      }
    },
    [],
  )

  const acceptFallback = useCallback((id: string) => {
    if (!runnerRef.current) return
    setIsExecuting(true)
    runnerRef.current.acceptFallback(id)
  }, [])

  const rejectFallback = useCallback((id: string) => {
    runnerRef.current?.rejectFallback(id)
    setDeliverables((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, selected: false, status: 'failed' as const } : x,
      ),
    )
    const items = runnerRef.current?.getItems() ?? []
    const needsAttention = items.some((d) => d.status === 'fallback_proposed')
    const allDone = items.every(
      (d) =>
        !d.selected ||
        d.status === 'done' ||
        (!needsAttention && d.status === 'failed'),
    )
    if (allDone && !needsAttention) {
      setDeliveryComplete(true)
    }
  }, [])

  const cancelDeliverable = useCallback(
    async (id: string) => {
      const d = deliverables.find((x) => x.id === id)
      if (!d?.orderId) return
      if (!d.cancellableUntil || Date.now() > d.cancellableUntil) {
        appendLog(`撤销超时: ${d.title}`)
        return
      }
      await booking.cancel(d.orderId)
      appendLog(`已撤销: ${d.title}`)
      setDeliverables((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                status: 'failed' as const,
                orderId: undefined,
                cancellableUntil: undefined,
                failureReason: '你已撤销此订单',
              }
            : x,
        ),
      )
    },
    [appendLog, booking, deliverables],
  )

  const pendingDeliveryFallback = useMemo(
    () => deliverables.find((d) => d.status === 'fallback_proposed' && d.fallback),
    [deliverables],
  )

  const deliverablesTotal = useMemo(
    () => estimateDeliverablesTotal(deliverables),
    [deliverables],
  )

  const deliverablesDoneCount = useMemo(
    () => deliverables.filter((d) => d.selected && d.status === 'done').length,
    [deliverables],
  )

  const deliverablesSelectedCount = useMemo(
    () => deliverables.filter((d) => d.selected).length,
    [deliverables],
  )

  const inferredDeliverables = useMemo(() => {
    if (!currentPlan) return []
    const constraints = planning.parseIntent(lastInputRef.current)
    return inferAddOns(currentPlan, constraints, lastInputRef.current)
  }, [currentPlan, planning])

  const deliverablesForDisplay = useMemo(
    () => (deliverables.length > 0 ? deliverables : inferredDeliverables),
    [deliverables, inferredDeliverables],
  )

  const deliveryStarted = useMemo(
    () => deliverables.some((d) => d.status !== 'idle'),
    [deliverables],
  )

  const deliverablesByNode = useMemo(() => {
    const map = new Map<number, Deliverable[]>()
    for (const d of deliverablesForDisplay) {
      if (d.nodeIndex == null) continue
      const list = map.get(d.nodeIndex) ?? []
      list.push(d)
      map.set(d.nodeIndex, list)
    }
    return map
  }, [deliverablesForDisplay])

  useEffect(() => {
    if (!currentPlan || isPlanning) return
    let cancelled = false
    setSummaryLoading(true)
    const constraints = planning.parseIntent(lastInputRef.current)
    share
      .buildAgentSummary(currentPlan, constraints)
      .then((text) => {
        if (!cancelled) setAgentSummary(text)
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentPlan, isPlanning, planning, share])

  const loadInviteCard = useCallback(
    async (audience: 'partner' | 'friends') => {
      if (!currentPlan) return
      setInviteLoading(true)
      try {
        const constraints = planning.parseIntent(lastInputRef.current)
        const card = await share.buildInviteCard(currentPlan, audience, constraints)
        if (consensusSummary) {
          card.body = `${card.body}\n\n💬 ${consensusSummary}`
        }
        setInviteCard(card)
      } catch (err) {
        console.warn('[useAgentPlanner] loadInviteCard 失败:', err)
        setInviteCard(null)
      } finally {
        setInviteLoading(false)
      }
    },
    [consensusSummary, currentPlan, planning, share],
  )

  const refreshSelectedInventory = useCallback(async () => {
    if (selectedNodeIdx === null || !currentPlan) return
    const plan = clonePlan(currentPlan)
    const node = plan.nodes[selectedNodeIdx]
    if (!node.poi || node.fixed) return

    setInventoryRefreshing(true)
    try {
      if (node.status !== 'confirmed') {
        await refreshNodeAvailability(node, poi, {
          suggestedAlternative: node.suggestedAlternative ?? inferAlternativeName(node),
        })
      }
      appendLog(`ToolCaller: 实时校验 [${node.poi.name}] 库存/门票`)
      updatePlan(plan)
    } finally {
      setInventoryRefreshing(false)
    }
  }, [appendLog, currentPlan, poi, selectedNodeIdx, updatePlan])

  useEffect(() => {
    if (selectedNodeIdx === null) return
    void refreshSelectedInventory()
    // 仅打开详情时校验，避免 plan 更新导致循环请求
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeIdx])

  const handleFamilyVote = useCallback(
    (vote: 'approve' | 'reject') => {
      if (selectedNodeIdx === null || !currentPlan) return
      const node = currentPlan.nodes[selectedNodeIdx]
      setFamilyVotes((prev) => ({ ...prev, [selectedNodeIdx]: vote }))
      const snippet = buildFamilyConsensusCopy(node, vote)
      setConsensusSummary(snippet)

      if (vote === 'reject') {
        appendLog(`家人反馈: 换一个 [${node.poi?.name ?? node.name}]`)
        void changeNode(selectedNodeIdx)
        return
      }
      appendLog(`家人反馈: 赞成 [${node.poi?.name ?? node.name}]`)
    },
    [appendLog, changeNode, currentPlan, selectedNodeIdx],
  )

  const openShareInvite = useCallback(async () => {
    if (!currentPlan) return
    setShareSheetOpen(true)
    const constraints = planning.parseIntent(lastInputRef.current)
    const isFriends = constraints.people.some((p) =>
      ['friends', 'group_4', 'mixed_gender'].includes(p),
    )
    const audience = isFriends ? 'friends' : 'partner'
    setInviteAudience(audience)
    await loadInviteCard(audience)
  }, [currentPlan, loadInviteCard, planning])

  useEffect(() => {
    if (!deliveryComplete || autoShareOnDeliveryRef.current) return
    autoShareOnDeliveryRef.current = true
    const timer = window.setTimeout(() => {
      void openShareInvite()
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [deliveryComplete, openShareInvite])

  const changeInviteAudience = useCallback(
    async (audience: 'partner' | 'friends') => {
      setInviteAudience(audience)
      await loadInviteCard(audience)
    },
    [loadInviteCard],
  )

  const shareInviteCard = useCallback(
    async (_card: InviteCard) => {
      appendLog('用户操作: 已分享行程卡片')
      if (!currentPlan) return
      setSharePendingFeedback(true)
      const constraints = planning.parseIntent(lastInputRef.current)
      window.setTimeout(() => {
        const feedbacks = simulateCompanionResponses(
          currentPlan,
          constraints,
          inviteAudience,
        )
        setCompanionFeedbacks(feedbacks)
        setSharePendingFeedback(false)
        appendLog(`同伴反馈: 收到 ${feedbacks.length} 条（来自分享卡片回流）`)
      }, 1200)
    },
    [appendLog, currentPlan, inviteAudience, planning],
  )

  const dismissCompanionFeedback = useCallback((id: string) => {
    setCompanionFeedbacks((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const resolveInventoryConflict = useCallback(
    async (nodeIndex: number, action: 'use-alt' | 'wait' | 'dismiss') => {
      if (!currentPlan) return
      const plan = clonePlan(currentPlan)
      const node = plan.nodes[nodeIndex]
      if (!node) return

      if (action === 'dismiss') {
        setInventorySheet(null)
        return
      }

      if (action === 'wait') {
        node.inventoryResolved = true
        node.conflict = undefined
        node.status = 'active'
        if (node.inventory) {
          node.inventory = { ...node.inventory, available: true, queue: node.inventory.queue ?? 2 }
        }
        appendLog(`你选择等位/改时：[${node.poi?.name ?? node.name}]`)
        updatePlan(plan)
        setInventorySheet(null)
        return
      }

      if (action === 'use-alt') {
        const alt = node.suggestedAlternative ?? inferAlternativeName(node)
        appendLog(`采纳备选：${alt}（替换 ${node.poi?.name ?? node.name}）`)
        setInventorySheet(null)
        const updated = await planning.replanLocal(plan, nodeIndex, `换成${alt}`, appendLog)
        const n = updated.nodes[nodeIndex]
        if (n) {
          n.inventoryResolved = true
          n.conflict = undefined
          n.status = 'active'
        }
        setRoadAnimate(false)
        updatePlan(updated)
        setSelectedNodeIdx(nodeIndex)
      }
    },
    [appendLog, currentPlan, planning, updatePlan],
  )

  const resolveScheduleConflict = useCallback(
    (nodeIndex: number, action: 'replan-time' | 'call-car' | 'dismiss') => {
      if (!currentPlan) return
      const plan = clonePlan(currentPlan)
      const node = plan.nodes[nodeIndex]
      if (!node || node.conflict !== 'time_short') return

      if (action === 'dismiss') {
        node.inventoryResolved = true
        appendLog(`行程冲突: 稍后处理 [${node.poi?.name ?? node.name}]`)
        updatePlan(plan)
        return
      }

      const delay = Math.ceil(node.suggestedDelay ?? 15)
      if (action === 'replan-time') {
        if (nodeIndex === 0) {
          plan.startTime = new Date(plan.startTime.getTime() + delay * 60000)
        } else {
          const prev = plan.nodes[nodeIndex - 1]
          if (prev && !prev.fixed) prev.duration = Math.max(15, prev.duration + delay)
        }
        schedulePlanTimeline(plan, (from, to) => poi.getRoute(from, to))
        delete node.conflict
        node.status = 'active'
        appendLog(`行程冲突: 已顺延 ${delay} 分钟`)
        setRoadAnimate(false)
        updatePlan(plan)
        setActionToast(`已顺延 ${delay} 分钟，行程冲突已解除`)
        return
      }

      if (action === 'call-car') {
        appendLog('行程冲突: 已代叫车缩短路程（演示）')
        delete node.conflict
        node.status = 'active'
        if (node.transit) node.transit = { ...node.transit, duration: Math.max(8, node.transit.duration - 6) }
        schedulePlanTimeline(plan, (from, to) => poi.getRoute(from, to))
        updatePlan(plan)
        setActionToast('已代叫车，预计缩短 6 分钟路程')
      }
    },
    [appendLog, currentPlan, poi, updatePlan],
  )

  const inventoryException = useMemo(() => {
    if (!currentPlan || inventorySheet === null) return null
    const node = currentPlan.nodes[inventorySheet.nodeIndex]
    if (!node) return null
    return buildInventoryException(
      inventorySheet.nodeIndex,
      node,
      node.suggestedAlternative,
    )
  }, [currentPlan, inventorySheet])

  const openInventoryForNode = useCallback((nodeIndex: number) => {
    setInventorySheet({ nodeIndex })
  }, [])

  const selectedNode: PlanNode | null = useMemo(
    () => (selectedNodeIdx !== null && currentPlan ? currentPlan.nodes[selectedNodeIdx] : null),
    [currentPlan, selectedNodeIdx],
  )

  const pendingCount = useMemo(
    () => (currentPlan ? getPendingCount(currentPlan) : 0),
    [currentPlan],
  )

  const readyToBook = useMemo(
    () => (currentPlan ? canExecuteBookings(currentPlan) : false),
    [currentPlan],
  )

  const lockedCount = useMemo(
    () => (currentPlan ? getLockedCount(currentPlan) : 0),
    [currentPlan],
  )

  const bookableCount = useMemo(
    () => (currentPlan ? getBookableCount(currentPlan) : 0),
    [currentPlan],
  )

  const bookingEstimate = useMemo(
    () => (currentPlan ? estimateBookingTotal(currentPlan) : 0),
    [currentPlan],
  )

  const planConstraints: Constraints = useMemo(
    () =>
      confirmedConstraints ??
      (currentPlan
        ? planning.parseIntent(lastInputRef.current)
        : {
            timeWindow: 4,
            people: [],
            location: 'nearby',
            preferences: [],
            avoid: [],
            budget: 'medium',
          }),
    [confirmedConstraints, currentPlan, planning],
  )

  const selectedFamilyVote =
    selectedNodeIdx !== null ? (familyVotes[selectedNodeIdx] ?? null) : null

  return {
    currentPlan,
    updatePlan,
    pageTitle,
    statusMessage,
    setStatusMessage,
    isPlanning,
    isExecuting,
    swappingNodeIdx,
    roadAnimate,
    selectedNodeIdx,
    selectedNode,
    setSelectedNodeIdx,
    startPlanning,
    handleUserCommand,
    changeNode,
    deleteNode,
    replanNode,
    openTimeAdjust,
    closeTimeAdjust,
    applyNodeTimeAdjust,
    nudgeNodeTime,
    timeAdjustNodeIdx,
    insertNodeAfter,
    confirmNode,
    finishConfirmAnimation,
    detailClosing,
    stampedNodeIdx,
    lockedCount,
    bookableCount,
    bookingEstimate,
    bookNode,
    executeAllBookings,
    agentSummary,
    summaryLoading,
    shareSheetOpen,
    setShareSheetOpen,
    inviteCard,
    inviteAudience,
    inviteLoading,
    openShareInvite,
    changeInviteAudience,
    shareInviteCard,
    planConstraints,
    selectedFamilyVote,
    consensusSummary,
    companionFeedbacks,
    sharePendingFeedback,
    inventoryRefreshing,
    handleFamilyVote,
    dismissCompanionFeedback,
    reviewOpen,
    setReviewOpen,
    proceedToPreflight,
    inventorySheet,
    setInventorySheet,
    inventoryException,
    resolveInventoryConflict,
    openInventoryForNode,
    unresolvedInventory,
    scheduleConflictIndex,
    resolveScheduleConflict,
    pendingCount,
    readyToBook,
    deliverables,
    deliverablesForDisplay,
    deliverablesTotal,
    deliverablesDoneCount,
    deliverablesSelectedCount,
    deliverablesByNode,
    deliveryStarted,
    awaitingDispatch,
    preflightOpen,
    setPreflightOpen,
    trackerOpen,
    setTrackerOpen,
    deliveryComplete,
    openPreflight,
    openReview,
    openTracker,
    toggleDeliverable,
    commitAndDispatch,
    retryDeliverable,
    acceptFallback,
    rejectFallback,
    cancelDeliverable,
    pendingDeliveryFallback,
    actionToast,
    clearActionToast: () => setActionToast(null),
  }
}
