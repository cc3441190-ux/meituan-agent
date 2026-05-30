import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findNextPendingIndex } from '../../agent/planGuards'
import { DEFAULT_SCENARIO } from '../../config/scenarios'
import { useAgentPlanner } from '../../hooks/useAgentPlanner'
import { planToTimelineVM } from '../../v2/planToTimelineVM'
import { DetailPanel } from '../DetailPanel'
import { ShareInviteSheet } from '../ShareInviteSheet'
import { AgentExecutionPanel } from './AgentExecutionPanel'
import { CollaborationStrip } from './CollaborationStrip'
import { ExecutionDockV2 } from './ExecutionDockV2'
import { MapRail } from './MapRail'
import { StatusHeader } from './StatusHeader'
import { TimelineColumn } from './TimelineColumn'
import '../../styles/planner.css'
import '../../styles/v2.css'

export function PlannerAppV2() {
  const planner = useAgentPlanner()
  const {
    currentPlan,
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
  } = planner

  const [focusedIndex, setFocusedIndex] = useState(1)
  const booted = useRef(false)

  const vm = useMemo(
    () =>
      planToTimelineVM({
        plan: currentPlan,
        constraints: planConstraints,
        agentSummary,
        isPlanning,
        isExecuting,
        inviteLoading,
        lockedCount,
        bookableCount,
        readyToBook,
        consensusSummary,
        focusedIndex,
      }),
    [
      currentPlan,
      planConstraints,
      agentSummary,
      isPlanning,
      isExecuting,
      inviteLoading,
      lockedCount,
      bookableCount,
      readyToBook,
      consensusSummary,
      focusedIndex,
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
    if (next !== -1) setFocusedIndex(next)
  }, [currentPlan, isPlanning, lockedCount])

  const handleConfirmStop = useCallback(
    (idx: number) => {
      const result = confirmNode(idx)
      if (result) {
        finishConfirmAnimation(result.plan, result.idx, (i) => setFocusedIndex(i))
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
      ? `已锁定 ${lockedCount}/${bookableCount} 站 · 确认后可授权执行`
      : pendingCount > 0
        ? `${pendingCount} 站待确认`
        : null

  return (
    <div className="planner-root v2-root">
      <div className="v2-phone">
        {vm ? (
          <>
            <StatusHeader
              title={vm.title}
              tags={vm.constraintTags}
              weatherNote={vm.weatherNote}
              onShare={openShareInvite}
            />

            <AgentExecutionPanel
              completed={vm.completedTasks}
              running={vm.runningTasks}
              pendingHint={vm.pendingAuthHint}
            />

            {vm.agentSummary && (
              <p className="v2-summary-line">{vm.agentSummary}</p>
            )}

            <div className="v2-main">
              <TimelineColumn
                items={vm.items}
                focusedIndex={focusedIndex}
                onSelectStop={(idx) => {
                  setFocusedIndex(idx)
                  setSelectedNodeIdx(idx)
                }}
                onConfirmStop={handleConfirmStop}
              />
              {currentPlan && <MapRail plan={currentPlan} focusIndex={focusedIndex} />}
            </div>

            <CollaborationStrip opinions={vm.collaborators} onShare={openShareInvite} />
          </>
        ) : (
          <div className="v2-empty">
            <StatusHeader
              title={isPlanning ? '正在生成下午计划…' : '等待规划'}
              tags={[]}
              weatherNote="16:00 后有小雨 · 已自动调整室内路线"
            />
            <AgentExecutionPanel
              completed={[]}
              running={
                isPlanning
                  ? [
                      { id: 'p1', label: 'POI 数据校验', state: 'running', progress: 40 },
                      { id: 'p2', label: 'API 工具调度', state: 'running', progress: 25 },
                    ]
                  : []
              }
              pendingHint={null}
            />
          </div>
        )}

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
          disabled={isPlanning || isExecuting}
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
