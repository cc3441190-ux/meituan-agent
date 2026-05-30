import { useCallback, useEffect, useRef } from 'react'
import { DEFAULT_SCENARIO } from '../config/scenarios'
import { usePlannerServices } from '../core/context'
import { getServiceModeLabel } from '../core/services'
import { useAgentPlanner } from '../hooks/useAgentPlanner'
import { AgentSummaryStrip } from './AgentSummaryStrip'
import { BottomDock } from './BottomDock'
import { DetailPanel } from './DetailPanel'
import { PlannerMap, type PlannerMapHandle } from './PlannerMap'
import { ShareInviteSheet } from './ShareInviteSheet'
import '../styles/planner.css'
import '../styles/blueprint.css'

export function PlannerApp() {
  const services = usePlannerServices()
  const modeLabel = getServiceModeLabel(services)

  const {
    currentPlan,
    pageTitle,
    statusMessage,
    setStatusMessage,
    isPlanning,
    isExecuting,
    roadAnimate,
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
    inventoryRefreshing,
    handleFamilyVote,
    pendingCount,
    readyToBook,
  } = useAgentPlanner()

  const booted = useRef(false)
  const mapRef = useRef<PlannerMapHandle>(null)

  const handleConfirmNode = useCallback(() => {
    if (selectedNodeIdx === null) return
    const result = confirmNode(selectedNodeIdx)
    if (result && mapRef.current) {
      finishConfirmAnimation(result.plan, result.idx, (i) => mapRef.current?.scrollToNode(i))
    }
  }, [confirmNode, finishConfirmAnimation, selectedNodeIdx])

  useEffect(() => {
    if (booted.current) return
    booted.current = true
    startPlanning(DEFAULT_SCENARIO.prompt)
  }, [startPlanning])

  const onSubmit = (text: string) => {
    if (!currentPlan || text.includes('重新')) {
      startPlanning(text)
      return
    }
    handleUserCommand(text)
  }

  const showAgentChrome = Boolean(currentPlan) && !isPlanning

  return (
    <div className="planner-root">
      <div className={`phone ${showAgentChrome ? 'phone--planned' : ''}`}>
        <header className="header">
          <div className="header-main">
            <div className="header-sub">
              AI Agent · <span className="mode-badge">{modeLabel}</span>
            </div>
            <div className="header-title">{pageTitle}</div>
            {showAgentChrome && (
              <AgentSummaryStrip
                summary={agentSummary}
                loading={summaryLoading}
                onShare={openShareInvite}
                shareDisabled={inviteLoading}
              />
            )}
          </div>
          <div className="header-right">
            <div className="weather-block">
              <div className="weather">🌤️ 26°C</div>
              <span className="weather-veto">已适配降雨预报</span>
            </div>
          </div>
        </header>

        {currentPlan ? (
          <PlannerMap
            ref={mapRef}
            plan={currentPlan}
            roadAnimate={roadAnimate}
            playRoadVideo={isPlanning || roadAnimate}
            stampedNodeIdx={stampedNodeIdx}
            onNodeSelect={setSelectedNodeIdx}
          />
        ) : (
          <div className="map-scroll">
            <div className="map-bg map-empty">
              {isPlanning ? 'AI 正在规划路线…' : '等待规划'}
            </div>
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
          onConfirm={handleConfirmNode}
          onBook={() => selectedNodeIdx !== null && bookNode(selectedNodeIdx)}
          onFamilyVote={handleFamilyVote}
        />

        <BottomDock
          disabled={isPlanning || isExecuting}
          statusMessage={statusMessage}
          onStatusChange={setStatusMessage}
          onSubmit={onSubmit}
          showTripStatus={Boolean(currentPlan)}
          lockedCount={lockedCount}
          bookableCount={bookableCount}
          pendingCount={pendingCount}
          readyToBook={readyToBook}
          bookingEstimate={bookingEstimate}
          isExecuting={isExecuting}
          onExecute={executeAllBookings}
        />
      </div>
    </div>
  )
}
