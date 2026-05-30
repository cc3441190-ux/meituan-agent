import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findNextPendingIndex } from '../../agent/planGuards'
import type { Constraints } from '../../agent/types'
import { DEFAULT_SCENARIO } from '../../config/scenarios'
import { useAgentPlanner } from '../../hooks/useAgentPlanner'
import {
  buildInsertFeedback,
  buildInsertSuggestion,
  buildReorderFeedback,
  reorderPlanNodes,
} from '../../v3/planMutations'
import type { InsertSuggestion, JourneyPhase, MapInterestPoi } from '../../v3/types'
import { buildDeliveryException, buildScheduleConflictException, buildWeatherException } from '../../v4/exceptionNegotiation'
import { planToProposalVM, PLANNING_PLACEHOLDER_VM } from '../../v4/planToProposalVM'
import { DetailPanel } from '../DetailPanel'
import { ShareInviteSheet } from '../ShareInviteSheet'
import { InsertSuggestionSheet } from '../v3/InsertSuggestionSheet'
import { SpatialMapCanvas } from '../v3/SpatialMapCanvas'
import { DeliveryTrackerSheet } from './DeliveryTrackerSheet'
import { ExecutionSummaryBar } from './ExecutionSummaryBar'
import { IntentInputScreen } from './IntentInputScreen'
import { PreflightChecklistSheet } from './PreflightChecklistSheet'
import { NegotiationDock } from './NegotiationDock'
import { ExceptionAlertBar } from './ExceptionAlertBar'
import { InventoryNegotiationSheet } from './InventoryNegotiationSheet'
import { NodeTimeAdjustSheet } from './NodeTimeAdjustSheet'
import { NegotiationPanel } from './NegotiationPanel'
import { PlanDiffBanner } from './PlanDiffBanner'
import { PlanReviewSheet } from './PlanReviewSheet'
import { PlanSummaryHeader } from './PlanSummaryHeader'
import { ProposalCardList } from './ProposalCardList'
import '../../styles/planner.css'
import '../../styles/v3.css'
import '../../styles/v4.css'

export function PlannerAppV4() {
  const planner = useAgentPlanner()
  const {
    currentPlan,
    updatePlan,
    isPlanning,
    isExecuting,
    swappingNodeIdx,
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
    bookNode,
    deliverables,
    deliverablesTotal,
    deliverablesDoneCount,
    deliverablesSelectedCount,
    deliverablesByNode,
    deliveryStarted,
    awaitingDispatch,
    deliveryComplete,
    preflightOpen,
    setPreflightOpen,
    trackerOpen,
    setTrackerOpen,
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
    clearActionToast,
    shareSheetOpen,
    setShareSheetOpen,
    inviteCard,
    inviteAudience,
    inviteLoading,
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
    scheduleConflictIndex,
    resolveScheduleConflict,
    pendingCount,
    readyToBook,
    lockedCount,
    bookableCount,
    bookingEstimate,
    stampedNodeIdx,
    roadAnimate,
  } = planner

  const [focusIndex, setFocusIndex] = useState(1)
  const [mapFullscreen, setMapFullscreen] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [insertOpen, setInsertOpen] = useState(false)
  const [insertSuggestion, setInsertSuggestion] = useState<InsertSuggestion | null>(null)
  const [planDiff, setPlanDiff] = useState<string | null>(null)
  const [intentSubmitted, setIntentSubmitted] = useState(false)
  const [tripHintDismissed, setTripHintDismissed] = useState(false)
  const [scheduleConflictDismissed, setScheduleConflictDismissed] = useState(false)
  const [deliveryAlertDismissed, setDeliveryAlertDismissed] = useState(false)
  const booted = useRef(false)
  const diffTimer = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const vm = useMemo(
    () =>
      planToProposalVM({
        plan: currentPlan,
        constraints: planConstraints,
        focusNodeIndex: focusIndex,
        bookingEstimate,
        pendingCount,
        readyToBook,
        lockedCount,
        bookableCount,
        companionFeedbacks,
        isPlanning,
      }),
    [
      currentPlan,
      planConstraints,
      focusIndex,
      bookingEstimate,
      pendingCount,
      readyToBook,
      lockedCount,
      bookableCount,
      companionFeedbacks,
      isPlanning,
    ],
  )

  const deliveryAlert = useMemo(
    () =>
      pendingDeliveryFallback && !deliveryAlertDismissed
        ? buildDeliveryException(pendingDeliveryFallback)
        : null,
    [pendingDeliveryFallback, deliveryAlertDismissed],
  )

  const scheduleConflictAlert = useMemo(() => {
    if (scheduleConflictIndex === null || scheduleConflictDismissed || !currentPlan) return null
    const node = currentPlan.nodes[scheduleConflictIndex]
    const prev = currentPlan.nodes[scheduleConflictIndex - 1]
    if (!node) return null
    return buildScheduleConflictException(
      scheduleConflictIndex,
      node,
      prev?.poi?.name ?? prev?.name,
    )
  }, [currentPlan, scheduleConflictDismissed, scheduleConflictIndex])

  const tripHintAlert = useMemo(() => {
    if (!readyToBook || tripHintDismissed || mapFullscreen) return null
    return buildWeatherException()
  }, [readyToBook, tripHintDismissed, mapFullscreen])

  useEffect(() => {
    if (!pendingDeliveryFallback || mapFullscreen) return
    setDeliveryAlertDismissed(false)
  }, [pendingDeliveryFallback, mapFullscreen])

  const mapPhases: JourneyPhase[] = useMemo(
    () =>
      vm?.proposals.map((p) => ({
        id: p.id,
        phaseIndex: p.phaseIndex,
        intent: p.intent,
        timeRange: p.timeRange,
        nodeIndex: p.nodeIndex,
        title: p.poiName,
        badge:
          p.visualState === 'locked'
            ? '已锁定'
            : p.visualState === 'unavailable'
              ? '需调整'
              : '待确认',
        status:
          p.visualState === 'locked'
            ? 'locked'
            : p.visualState === 'unavailable'
              ? 'error'
              : 'pending',
        summary: p.qualitySignals.join(' · '),
        inventoryLabel: p.inventoryLabel,
        isCurrent: p.isFocused,
      })) ?? [],
    [vm?.proposals],
  )

  const showPlanDiff = useCallback((message: string) => {
    setPlanDiff(message)
    if (diffTimer.current) window.clearTimeout(diffTimer.current)
    diffTimer.current = window.setTimeout(() => setPlanDiff(null), 4500)
  }, [])

  useEffect(() => {
    if (!actionToast) return
    showPlanDiff(actionToast)
    clearActionToast()
  }, [actionToast, clearActionToast, showPlanDiff])

  useEffect(() => {
    if (booted.current || !intentSubmitted) return
    booted.current = true
    startPlanning(DEFAULT_SCENARIO.prompt)
  }, [intentSubmitted, startPlanning])

  useEffect(() => {
    if (!currentPlan || isPlanning) return
    const next = findNextPendingIndex(currentPlan)
    if (next !== -1) setFocusIndex(next)
    setScheduleConflictDismissed(false)
  }, [currentPlan, isPlanning, lockedCount])

  useEffect(
    () => () => {
      if (diffTimer.current) window.clearTimeout(diffTimer.current)
    },
    [],
  )

  useEffect(() => {
    document.body.style.overflow = mapFullscreen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mapFullscreen])

  const runRecalculate = useCallback(
    async (mutate: () => void, feedback: string) => {
      setIsRecalculating(true)
      await new Promise((r) => window.setTimeout(r, 900))
      mutate()
      setIsRecalculating(false)
      showPlanDiff(feedback)
    },
    [showPlanDiff],
  )

  const handleReorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (!currentPlan) return
      const next = reorderPlanNodes(currentPlan, fromIdx, toIdx)
      void runRecalculate(() => {
        updatePlan(next)
        setFocusIndex(toIdx)
      }, buildReorderFeedback(currentPlan, next))
    },
    [currentPlan, runRecalculate, updatePlan],
  )

  const openInsertForPoi = (poi: MapInterestPoi) => {
    if (!currentPlan) return
    setMapFullscreen(true)
    const afterIdx = poi.afterNodeIndex
    const afterNode = currentPlan.nodes[afterIdx]
    const beforeNode = currentPlan.nodes[afterIdx + 1]
    const meta = buildInsertSuggestion(poi.name, {
      afterNodeIndex: afterIdx,
      afterLabel: afterNode?.poi?.name ?? afterNode?.name ?? '上一站',
      beforeLabel: beforeNode?.poi?.name ?? beforeNode?.name ?? '下一站',
    })
    setInsertSuggestion({ poi, ...meta })
    setInsertOpen(true)
  }

  const handleInterestSelect = (poi: MapInterestPoi) => openInsertForPoi(poi)

  const handleInsertJoin = () => {
    if (!insertSuggestion) {
      setInsertOpen(false)
      return
    }
    const feedback = buildInsertFeedback(insertSuggestion)
    const afterIdx = insertSuggestion.afterNodeIndex
    setInsertOpen(false)
    setInsertSuggestion(null)
    void (async () => {
      setIsRecalculating(true)
      const newIdx = await insertNodeAfter(afterIdx, insertSuggestion.poi)
      setIsRecalculating(false)
      if (newIdx != null) {
        setFocusIndex(newIdx)
        showPlanDiff(`已插入 ${insertSuggestion.poi.name} · ${feedback}`)
      }
    })()
  }

  const closeInsertSheet = () => {
    setInsertOpen(false)
    setInsertSuggestion(null)
  }

  const handleConfirmStop = useCallback(
    (idx: number) => {
      const result = confirmNode(idx)
      if (result) {
        finishConfirmAnimation(result.plan, result.idx, (i) => setFocusIndex(i))
      }
    },
    [confirmNode, finishConfirmAnimation],
  )

  const focusNode = (idx: number) => {
    setFocusIndex(idx)
    setSelectedNodeIdx(idx)
    if (!mapFullscreen && scrollRef.current) {
      const card = cardRefs.current[idx]
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const handleDeliveryAlertAction = (actionId: string) => {
    if (!pendingDeliveryFallback) return
    const id = pendingDeliveryFallback.id
    if (actionId === 'accept') {
      acceptFallback(id)
      setTrackerOpen(true)
      showPlanDiff('已接受替代方案，继续交付中…')
    } else if (actionId === 'skip') {
      rejectFallback(id)
      showPlanDiff('已跳过该项，其余任务继续')
    } else if (actionId === 'tracker') {
      openTracker()
    }
  }

  const handleScheduleConflictAction = (actionId: string) => {
    if (scheduleConflictIndex === null) return
    if (actionId === 'dismiss') {
      setScheduleConflictDismissed(true)
      resolveScheduleConflict(scheduleConflictIndex, 'dismiss')
      return
    }
    if (actionId === 'replan-time') {
      resolveScheduleConflict(scheduleConflictIndex, 'replan-time')
      setScheduleConflictDismissed(true)
      showPlanDiff('已顺延后续站点，行程冲突已解除')
      return
    }
    if (actionId === 'call-car') {
      resolveScheduleConflict(scheduleConflictIndex, 'call-car')
      setScheduleConflictDismissed(true)
      showPlanDiff('已代叫车缩短路程')
    }
  }

  const handleTripHintAction = (actionId: string) => {
    if (actionId === 'dismiss') {
      setTripHintDismissed(true)
      return
    }
    if (actionId === 'view-indoor') {
      const playIdx =
        currentPlan?.nodes.findIndex(
          (n) => !n.fixed && (n.category === 'entertainment' || n.type === 'indoor_play'),
        ) ?? -1
      if (playIdx >= 0) void replanNode(playIdx, '换成室内备选')
      showPlanDiff('已切换室内备选动线')
      setTripHintDismissed(true)
    }
  }

  const handleNegotiationAction = (itemId: string, actionId: string) => {
    const fb = companionFeedbacks.find((f) => f.id === itemId)
    if (!fb) return

    if (actionId === 'ignore') {
      dismissCompanionFeedback(itemId)
      showPlanDiff('已忽略这条同伴留言')
      return
    }

    if (actionId === 'adopt') {
      if (fb.vote === 'reject' && fb.nodeIndex != null) {
        void replanNode(fb.nodeIndex, '按同伴建议调整这一站')
        showPlanDiff('已按同伴建议调整方案')
      } else if (fb.nodeIndex != null) {
        focusNode(fb.nodeIndex)
        showPlanDiff('已查看同伴提到的站点')
      } else {
        showPlanDiff('已记录同伴建议')
      }
      dismissCompanionFeedback(itemId)
    }
  }

  const handleShare = () => {
    if (!currentPlan || !vm) return
    const audience = vm.shareButtonLabel.includes('朋友') ? 'friends' : 'partner'
    setShareSheetOpen(true)
    void changeInviteAudience(audience)
  }

  const onSubmit = (text: string) => {
    if (!currentPlan || text.includes('重新')) {
      startPlanning(text)
      return
    }
    handleUserCommand(text)
  }

  const handleGenerateFromIntent = (prompt: string, constraints?: Constraints) => {
    booted.current = true
    setIntentSubmitted(true)
    startPlanning(prompt, constraints)
  }

  const handleBack = () => {
    if (selectedNodeIdx !== null) {
      setSelectedNodeIdx(null)
      return
    }
    if (shareSheetOpen) {
      setShareSheetOpen(false)
      return
    }
    if (insertOpen) {
      closeInsertSheet()
      return
    }
    if (trackerOpen) {
      setTrackerOpen(false)
      return
    }
    if (reviewOpen) {
      setReviewOpen(false)
      return
    }
    if (preflightOpen) {
      setPreflightOpen(false)
      return
    }
    if (inventorySheet) {
      setInventorySheet(null)
      return
    }
    if (mapFullscreen) {
      setMapFullscreen(false)
      return
    }
    if ((deliveryStarted || isExecuting) && !deliveryComplete) {
      const shouldLeave = window.confirm(
        '已有代办事项正在执行。返回输入页不会取消订单，如需取消请先进入代办进度处理。确定返回吗？',
      )
      if (!shouldLeave) return
    }
    setIntentSubmitted(false)
  }

  return (
    <div className="planner-root v4-root">
      <div className={`v4-phone ${mapFullscreen ? 'v4-phone--map-open' : ''}`}>
        {!intentSubmitted && (
          <a href="/" className="v4-site-link">
            官网
          </a>
        )}
        {intentSubmitted && (
          <button className="v4-universal-back" type="button" onClick={handleBack}>
            <span className="v4-universal-back-icon" aria-hidden>
              ‹
            </span>
            <span>返回</span>
          </button>
        )}
        {!intentSubmitted ? (
          <IntentInputScreen isPlanning={isPlanning} onGenerate={handleGenerateFromIntent} />
        ) : vm || isPlanning ? (
          <>
            {!mapFullscreen && (
              <div className={`v4-scroll ${isPlanning ? 'v4-scroll--planning' : ''}`} ref={scrollRef}>
                <PlanSummaryHeader
                  vm={vm ?? PLANNING_PLACEHOLDER_VM}
                  onShare={vm && !isPlanning ? handleShare : undefined}
                />

                <PlanDiffBanner message={planDiff} />

                {scheduleConflictAlert && (
                  <div className="v4-section v4-alerts-section">
                    <ExceptionAlertBar
                      alert={scheduleConflictAlert}
                      onAction={handleScheduleConflictAction}
                      onDismiss={() => setScheduleConflictDismissed(true)}
                    />
                  </div>
                )}

                {deliveryAlert && (
                  <div className="v4-section v4-alerts-section">
                    <ExceptionAlertBar
                      alert={deliveryAlert}
                      onAction={handleDeliveryAlertAction}
                      onDismiss={() => setDeliveryAlertDismissed(true)}
                    />
                  </div>
                )}

                {tripHintAlert && (
                  <div className="v4-section v4-alerts-section">
                    <ExceptionAlertBar
                      alert={tripHintAlert}
                      onAction={handleTripHintAction}
                      onDismiss={() => setTripHintDismissed(true)}
                    />
                  </div>
                )}

                {sharePendingFeedback && (
                  <div className="v4-share-pending" role="status" aria-live="polite">
                    <div className="v4-share-pending-avatars" aria-hidden>
                      <span>👩</span>
                      <span>👧</span>
                      <span>👨</span>
                    </div>
                    <div className="v4-share-pending-copy">
                      <strong>等待家人/朋友确认中…</strong>
                      <p>行程卡片已发出，同伴正在查看并留言</p>
                    </div>
                    <span className="v4-share-pending-spinner" aria-hidden />
                  </div>
                )}

                {!isPlanning && companionFeedbacks.length === 0 && !sharePendingFeedback && (
                  <p className="v4-share-hint">分享给家人后，留言会出现在这里</p>
                )}

                {!isPlanning && currentPlan && (
                  <section className="v4-section v4-map-hero">
                    <h2 className="v4-section-title">下午动线 · 点开可全屏编辑</h2>
                    <SpatialMapCanvas
                      plan={currentPlan}
                      focusIndex={focusIndex}
                      isRecalculating={isRecalculating}
                      variant="preview"
                      stampedNodeIdx={stampedNodeIdx}
                      roadAnimate={roadAnimate}
                      phases={mapPhases}
                      ghostPoi={null}
                      onToggleExpand={() => setMapFullscreen(true)}
                      onFocusNode={focusNode}
                      onReorder={handleReorder}
                      onSelectInterest={handleInterestSelect}
                    />
                  </section>
                )}

                {isPlanning && (
                  <section className="v4-section v4-plan-generating" aria-busy="true">
                    <div className="v4-plan-generating-inner">
                      <span className="v4-plan-generating-dot" aria-hidden />
                      <span className="v4-plan-generating-dot" aria-hidden />
                      <span className="v4-plan-generating-dot" aria-hidden />
                      <p>正在为你编排站点、路程与库存…</p>
                    </div>
                    <div className="v4-plan-skeleton-list" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="v4-plan-skeleton-card" />
                      ))}
                    </div>
                  </section>
                )}

                {!isPlanning && currentPlan && vm && (
                  <section className="v4-section">
                    <ProposalCardList
                      plan={currentPlan}
                      proposals={vm.proposals}
                      deliverablesByNode={deliverablesByNode}
                      onAddOnChipClick={openReview}
                      cardRefs={cardRefs}
                      onSelect={focusNode}
                      onSwap={(idx) => changeNode(idx)}
                      onAlternatives={(idx) => replanNode(idx, '看看替代方案')}
                      onAdjustTime={(idx) => {
                        focusNode(idx)
                        openTimeAdjust(idx)
                      }}
                      onConfirm={handleConfirmStop}
                      onInventoryIssue={openInventoryForNode}
                      swappingNodeIdx={swappingNodeIdx}
                      onRequestRide={(fromIdx, toIdx) => {
                        showPlanDiff(
                          `已为你预约 ${currentPlan.nodes[fromIdx]?.poi?.name ?? '上一站'} → ${currentPlan.nodes[toIdx]?.poi?.name ?? '下一站'} 用车（演示）`,
                        )
                      }}
                    />
                  </section>
                )}

                {!isPlanning && vm && vm.negotiations.length > 0 && (
                  <div className="v4-section">
                    <NegotiationPanel
                      items={vm.negotiations}
                      onAction={handleNegotiationAction}
                    />
                  </div>
                )}

                {!isPlanning && vm ? (
                <ExecutionSummaryBar
                  line={vm.executionLine}
                  ctaLabel={vm.executionCta}
                  readyToBook={readyToBook}
                  isExecuting={isExecuting}
                  disabled={isRecalculating}
                  deliveryStarted={deliveryStarted}
                  deliveryComplete={deliveryComplete}
                  deliverablesSelectedCount={deliverablesSelectedCount}
                  deliverablesDoneCount={deliverablesDoneCount}
                  onExecute={openPreflight}
                  onOpenTracker={() => {
                    if (deliveryComplete) handleShare()
                    else openTracker()
                  }}
                />
                ) : null}

                <NegotiationDock
                  disabled={isPlanning || isExecuting || isRecalculating}
                  diffMessage={planDiff}
                  onSubmit={onSubmit}
                />
              </div>
            )}

            {mapFullscreen && currentPlan && (
              <div className="v4-map-overlay">
                <PlanDiffBanner message={planDiff} />
                <SpatialMapCanvas
                  plan={currentPlan}
                  focusIndex={focusIndex}
                  isRecalculating={isRecalculating}
                  variant="fullscreen"
                  stampedNodeIdx={stampedNodeIdx}
                  roadAnimate={roadAnimate}
                  phases={mapPhases}
                  ghostPoi={insertOpen ? insertSuggestion?.poi ?? null : null}
                  onToggleExpand={() => setMapFullscreen(false)}
                  onFocusNode={focusNode}
                  onReorder={handleReorder}
                  onSelectInterest={handleInterestSelect}
                  onSwapNode={(idx) => changeNode(idx)}
                  onShowAlternatives={(idx) => replanNode(idx, '看看替代方案')}
                  onAdjustNodeTime={(idx) => {
                    focusNode(idx)
                    openTimeAdjust(idx)
                  }}
                  onConfirmNode={handleConfirmStop}
                />
              </div>
            )}
          </>
        ) : (
          <div className="v4-scroll v4-loading">
            <PlanSummaryHeader
              vm={{
                planTitle: isPlanning ? '正在生成你的下午方案…' : '等待规划',
                planSubtitle: 'AI 正在理解你的出行场景',
                sceneLabel: '—',
                detectedPeople: '—',
                planningIntent: '—',
                autoConsiderations: [],
                shareButtonLabel: '分享方案',
                budgetLabel: '总预算',
                budgetDisplay: '—',
                timeRange: '--:-- – --:--',
                totalBudget: 0,
                walkDistance: '—',
                stopCount: 0,
                constraintChips: [],
                schemeSummary: '方案生成中，请稍候…',
                proposals: [],
                negotiations: [],
                executionLine: '方案生成中…',
                executionCta: '一键安排',
                pendingCount: 0,
                readyToBook: false,
                lockedCount: 0,
                bookableCount: 0,
              }}
            />
          </div>
        )}

        <PlanReviewSheet
          open={reviewOpen}
          plan={currentPlan}
          proposals={vm?.proposals ?? []}
          bookingEstimate={bookingEstimate}
          onConfirm={proceedToPreflight}
          onClose={() => setReviewOpen(false)}
        />

        <InventoryNegotiationSheet
          open={inventorySheet !== null}
          alert={inventoryException}
          onAction={(actionId) => {
            if (inventorySheet === null) return
            void resolveInventoryConflict(
              inventorySheet.nodeIndex,
              actionId as 'use-alt' | 'wait' | 'dismiss',
            )
          }}
          onClose={() => setInventorySheet(null)}
        />

        <PreflightChecklistSheet
          open={preflightOpen}
          items={deliverables}
          totalPrice={deliverablesTotal}
          onToggle={toggleDeliverable}
          onConfirm={() => void commitAndDispatch()}
          onClose={() => setPreflightOpen(false)}
        />

        <DeliveryTrackerSheet
          open={trackerOpen}
          plan={currentPlan}
          items={deliverables}
          isExecuting={isExecuting}
          deliveryComplete={deliveryComplete}
          awaitingDispatch={awaitingDispatch}
          onClose={() => setTrackerOpen(false)}
          onStartDispatch={() => void commitAndDispatch()}
          onRetry={(id) => void retryDeliverable(id)}
          onAcceptFallback={acceptFallback}
          onRejectFallback={rejectFallback}
          onCancel={(id) => void cancelDeliverable(id)}
        />

        <InsertSuggestionSheet
          open={insertOpen}
          suggestion={insertSuggestion}
          onClose={closeInsertSheet}
          onJoin={handleInsertJoin}
        />

        <ShareInviteSheet
          open={shareSheetOpen}
          card={inviteCard}
          audience={inviteAudience}
          loading={inviteLoading}
          waitingFeedback={sharePendingFeedback}
          onClose={() => setShareSheetOpen(false)}
          onAudienceChange={changeInviteAudience}
          onShareCard={shareInviteCard}
        />

        <NodeTimeAdjustSheet
          open={timeAdjustNodeIdx !== null}
          node={
            timeAdjustNodeIdx !== null && currentPlan
              ? currentPlan.nodes[timeAdjustNodeIdx]
              : null
          }
          nodeIndex={timeAdjustNodeIdx}
          onClose={closeTimeAdjust}
          onApply={(patch) => {
            if (timeAdjustNodeIdx !== null) {
              applyNodeTimeAdjust(timeAdjustNodeIdx, patch)
              showPlanDiff('时间已更新 · 后续站点已自动顺延')
            }
          }}
          onNudge={(delta) => {
            if (timeAdjustNodeIdx !== null) nudgeNodeTime(timeAdjustNodeIdx, delta)
          }}
        />

        <DetailPanel
          open={selectedNodeIdx !== null}
          closing={detailClosing}
          node={selectedNode}
          nodeIndex={selectedNodeIdx}
          constraints={planConstraints}
          familyVote={selectedFamilyVote}
          consensusSnippet={consensusSummary}
          inventoryRefreshing={inventoryRefreshing}
          onClose={() => setSelectedNodeIdx(null)}
          onChange={() => selectedNodeIdx !== null && changeNode(selectedNodeIdx)}
          onDelete={() => selectedNodeIdx !== null && deleteNode(selectedNodeIdx)}
          onReplan={(cmd) => selectedNodeIdx !== null && replanNode(selectedNodeIdx, cmd)}
          onConfirm={() => selectedNodeIdx !== null && handleConfirmStop(selectedNodeIdx)}
          onBook={() => selectedNodeIdx !== null && bookNode(selectedNodeIdx)}
          onFamilyVote={handleFamilyVote}
        />

      </div>
    </div>
  )
}
