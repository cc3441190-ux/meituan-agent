import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findNextPendingIndex } from '../../agent/planGuards'
import { DEFAULT_SCENARIO } from '../../config/scenarios'
import { useAgentPlanner } from '../../hooks/useAgentPlanner'
import { buildInsertSuggestion, buildInsertFeedback, buildReorderFeedback, reorderPlanNodes } from '../../v3/planMutations'
import { planToJourneyVM } from '../../v3/planToJourneyVM'
import type { InsertSuggestion, MapInterestPoi } from '../../v3/types'
import { DetailPanel } from '../DetailPanel'
import { ShareInviteSheet } from '../ShareInviteSheet'
import { AgentExecutionPanel } from '../v2/AgentExecutionPanel'
import { ExecutionDockV2 } from '../v2/ExecutionDockV2'
import { StatusHeader } from '../v2/StatusHeader'
import { CollaborationStripV3 } from './CollaborationStripV3'
import { CurrentPhaseBar } from './CurrentPhaseBar'
import { InsertSuggestionSheet } from './InsertSuggestionSheet'
import { JourneyColumn } from './JourneyColumn'
import { SpatialMapCanvas } from './SpatialMapCanvas'
import '../../styles/planner.css'
import '../../styles/v2.css'
import '../../styles/v3.css'

export function PlannerAppV3() {
  const planner = useAgentPlanner()
  const {
    currentPlan,
    updatePlan,
    statusMessage,
    setStatusMessage,
    isPlanning,
    isExecuting,
    selectedNodeIdx,
    selectedNode,
    setSelectedNodeIdx,
    startPlanning,
    handleUserCommand,
    changeNode,
    deleteNode,
    replanNode,
    confirmNode,
    finishConfirmAnimation,
    detailClosing,
    bookNode,
    executeAllBookings,
    agentSummary,
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
    inventoryRefreshing,
    handleFamilyVote,
    pendingCount,
    readyToBook,
    lockedCount,
    bookableCount,
    bookingEstimate,
    stampedNodeIdx,
    roadAnimate,
  } = planner

  const [focusIndex, setFocusIndex] = useState(1)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [insertOpen, setInsertOpen] = useState(false)
  const [insertSuggestion, setInsertSuggestion] = useState<InsertSuggestion | null>(null)
  const booted = useRef(false)
  const autoExpanded = useRef(false)

  const vm = useMemo(
    () =>
      planToJourneyVM({
        plan: currentPlan,
        constraints: planConstraints,
        agentSummary,
        isPlanning,
        isExecuting,
        isRecalculating,
        inviteLoading,
        lockedCount,
        bookableCount,
        readyToBook,
        consensusSummary,
        focusNodeIndex: focusIndex,
      }),
    [
      currentPlan,
      planConstraints,
      agentSummary,
      isPlanning,
      isExecuting,
      isRecalculating,
      inviteLoading,
      lockedCount,
      bookableCount,
      readyToBook,
      consensusSummary,
      focusIndex,
    ],
  )

  useEffect(() => {
    if (booted.current) return
    booted.current = true
    startPlanning(DEFAULT_SCENARIO.prompt)
  }, [startPlanning])

  useEffect(() => {
    if (!currentPlan || isPlanning) return
    const next = findNextPendingIndex(currentPlan)
    if (next !== -1) setFocusIndex(next)
  }, [currentPlan, isPlanning, lockedCount])

  useEffect(() => {
    if (!currentPlan || isPlanning || autoExpanded.current) return
    autoExpanded.current = true
    const t = window.setTimeout(() => setMapExpanded(true), 1500)
    return () => window.clearTimeout(t)
  }, [currentPlan, isPlanning])

  const runRecalculate = useCallback(
    async (mutate: () => void, feedback: string) => {
      setIsRecalculating(true)
      setStatusMessage('AI 正在重新计算下午动线…')
      await new Promise((r) => window.setTimeout(r, 900))
      mutate()
      setIsRecalculating(false)
      setStatusMessage(feedback)
      window.setTimeout(() => setStatusMessage('说句话或输入，帮你调整路线...'), 3500)
    },
    [setStatusMessage],
  )

  const handleReorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (!currentPlan) return
      void runRecalculate(() => {
        const next = reorderPlanNodes(currentPlan, fromIdx, toIdx)
        updatePlan(next)
        setFocusIndex(toIdx)
      }, buildReorderFeedback(currentPlan, reorderPlanNodes(currentPlan, fromIdx, toIdx)))
    },
    [currentPlan, runRecalculate, updatePlan],
  )

  const handleInterestSelect = (poi: MapInterestPoi) => {
    if (!mapExpanded || !currentPlan) return
    setMapExpanded(true)
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

  const handleInsertJoin = () => {
    if (!insertSuggestion) {
      setInsertOpen(false)
      return
    }
    const feedback = buildInsertFeedback(insertSuggestion)
    setInsertOpen(false)
    setInsertSuggestion(null)
    void (async () => {
      setIsRecalculating(true)
      setStatusMessage('AI 正在重新计算下午动线…')
      await replanNode(focusIndex, `加入${insertSuggestion.poi.name}`)
      setIsRecalculating(false)
      setStatusMessage(feedback)
      window.setTimeout(() => setStatusMessage('说句话或输入，帮你调整路线...'), 3500)
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

  const onSubmit = (text: string) => {
    if (!currentPlan || text.includes('重新')) {
      startPlanning(text)
      return
    }
    handleUserCommand(text)
  }

  const tripStatus =
    lockedCount > 0 && !readyToBook
      ? `已锁定 ${lockedCount}/${bookableCount} 站`
      : pendingCount > 0
        ? `${pendingCount} 站待确认`
        : null

  return (
    <div className="planner-root v2-root v3-root">
      <div className="v3-phone">
        {vm ? (
          <>
            <StatusHeader
              title={vm.title}
              tags={vm.constraintTags}
              weatherNote={vm.weatherNote}
              onShare={openShareInvite}
            />

            {!mapExpanded && <CurrentPhaseBar phase={vm.currentPhase} />}

            <div className={`v3-workspace ${mapExpanded ? 'v3-workspace--map-full' : ''}`}>
              {!mapExpanded && (
                <JourneyColumn
                  phases={vm.phases}
                  onSelectPhase={(idx) => {
                    setFocusIndex(idx)
                    setSelectedNodeIdx(idx)
                  }}
                  onConfirm={handleConfirmStop}
                />
              )}

              {currentPlan && (
                <SpatialMapCanvas
                  plan={currentPlan}
                  focusIndex={focusIndex}
                  isRecalculating={isRecalculating}
                  variant={mapExpanded ? 'fullscreen' : 'preview'}
                  stampedNodeIdx={stampedNodeIdx}
                  roadAnimate={roadAnimate}
                  phases={vm.phases}
                  ghostPoi={insertOpen ? insertSuggestion?.poi ?? null : null}
                  onToggleExpand={() => setMapExpanded((v) => !v)}
                  onFocusNode={(idx) => {
                    setFocusIndex(idx)
                    setSelectedNodeIdx(idx)
                  }}
                  onReorder={handleReorder}
                  onSelectInterest={handleInterestSelect}
                />
              )}

              {mapExpanded && vm.currentPhase && (
                <div className="v3-map-phase-float">
                  <CurrentPhaseBar phase={vm.currentPhase} />
                </div>
              )}
            </div>

            {!mapExpanded && (
              <>
                <AgentExecutionPanel
                  completed={vm.completedTasks}
                  running={vm.runningTasks}
                  pendingHint={vm.pendingAuthHint}
                />

                <CollaborationStripV3 opinions={vm.collaborators} onShare={openShareInvite} />
              </>
            )}
          </>
        ) : (
          <div className="v3-empty">
            <StatusHeader
              title={isPlanning ? '正在生成下午计划…' : '等待规划'}
              tags={[]}
              weatherNote="16:00 后有小雨 · 已切换室内路线"
            />
            <AgentExecutionPanel
              completed={[]}
              running={
                isPlanning
                  ? [{ id: 'p', label: 'POI 数据校验', state: 'running', progress: 40 }]
                  : []
              }
              pendingHint={null}
            />
          </div>
        )}

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
          onClose={() => setShareSheetOpen(false)}
          onAudienceChange={changeInviteAudience}
          onShareCard={shareInviteCard}
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

        <ExecutionDockV2
          disabled={isPlanning || isExecuting || isRecalculating}
          statusMessage={statusMessage}
          onStatusChange={setStatusMessage}
          onSubmit={onSubmit}
          tripStatus={tripStatus}
          readyToBook={readyToBook}
          bookingEstimate={bookingEstimate}
          isExecuting={isExecuting}
          onExecute={executeAllBookings}
        />
      </div>
    </div>
  )
}
