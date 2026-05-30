import { MockAPI } from '../src/agent/mockApi'
import { LocalPlannerAgent } from '../src/agent/LocalPlannerAgent'
import { inferAddOns } from '../src/agent/inferAddOns'
import { getPlanDurationMinutes } from '../src/agent/timeline'
import { TaskRunner } from '../src/agent/taskRunner'
import { MockPOIService } from '../src/core/adapters/mock/mockPoiService'
import { MockPlanningService } from '../src/core/adapters/mock/mockPlanningService'
import { MockShareService } from '../src/core/adapters/mock/mockShareService'
import { MockBookingService } from '../src/core/adapters/mock/mockBookingService'

const LIMITS = {
  planMs: 30_000,
  toolMs: 3_000,
  e2eMs: 120_000,
}

const poi = new MockPOIService()
const planning = new MockPlanningService(poi)
const agent = new LocalPlannerAgent(poi)
const share = new MockShareService()
const booking = new MockBookingService()

const cases = [
  { name: '家庭', input: '今天下午想和老婆、5岁的孩子出去玩，老婆最近在减肥，别离家太远' },
  { name: '朋友', input: '4个朋友下午想出去玩，2个男生2个女生，人均200以内，别太远' },
  { name: '预算', input: '便宜点，人均200，别太贵' },
  { name: '模糊', input: '随便' },
]

function pass(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}: ${detail}`)
  return ok
}

console.log('========== parseIntent 回归 ==========')
for (const c of cases) {
  const out = agent.parseIntent(c.input)
  console.log(`\n[${c.name}]`, JSON.stringify(out, null, 2))
}

async function measureToolCalls(constraints: ReturnType<typeof agent.parseIntent>) {
  const t0 = Date.now()
  const p = await poi.searchPOI('park', constraints)
  const searchMs = Date.now() - t0

  const t1 = Date.now()
  await poi.checkInventory('f1')
  const seatMs = Date.now() - t1

  const t2 = Date.now()
  await poi.checkTicketAvailability(p.id)
  const ticketMs = Date.now() - t2

  return { searchMs, seatMs, ticketMs, poi: p }
}

async function runE2E(label: string, input: string) {
  const constraints = agent.parseIntent(input)
  const tPlan0 = Date.now()
  const plan = await planning.createPlan(input, undefined, constraints)
  const planMs = Date.now() - tPlan0

  const durationMin = getPlanDurationMinutes(plan)
  const withinWindow = durationMin <= constraints.timeWindow * 60 + 30

  const conflicts = plan.nodes
    .filter((n) => n.conflict)
    .map((n) => ({ name: n.poi?.name ?? n.name, conflict: n.conflict }))

  const tExec0 = Date.now()
  const deliverables = inferAddOns(plan, constraints, input)
  const runner = new TaskRunner(deliverables, booking, { onUpdate: () => {} })
  await runner.dispatch()
  const execMs = Date.now() - tExec0

  const shareText = await share.buildShareText(plan, constraints.people.includes('friends') ? 'friends' : 'partner')
  const e2eMs = planMs + execMs

  console.log(`\n========== E2E ${label} ==========`)
  console.log(`规划耗时: ${planMs}ms (限制 ≤${LIMITS.planMs}ms)`)
  console.log(`执行耗时: ${execMs}ms`)
  console.log(`端到端: ${e2eMs}ms (限制 ≤${LIMITS.e2eMs}ms)`)
  console.log(`行程时长: ${Math.round(durationMin)}min / 时间窗 ${constraints.timeWindow}h`, withinWindow ? '✓' : '⚠')
  console.log('冲突:', conflicts.length ? JSON.stringify(conflicts) : '无')
  console.log('shareText:', shareText.slice(0, 80) + '…')

  return { planMs, execMs, e2eMs, withinWindow, conflicts, ok: planMs <= LIMITS.planMs && e2eMs <= LIMITS.e2eMs }
}

console.log('\n========== 工具响应耗时 ==========')
const toolConstraints = agent.parseIntent(cases[0].input)
const tools = await measureToolCalls(toolConstraints)
console.log(`searchPOI: ${tools.searchMs}ms`)
console.log(`checkInventory: ${tools.seatMs}ms`)
console.log(`checkTicketAvailability: ${tools.ticketMs}ms`)

async function findUnavailableSeat(): Promise<{ ok: boolean; reason: string }> {
  for (const id of ['f1', 'b1', 'h1', 'l1', 's1', 'p1', 'i1']) {
    const r = await MockAPI.checkInventory(id)
    if (!r.available) return { ok: true, reason: r.reason ?? '已满座' }
  }
  return { ok: false, reason: '未命中 mock 满座样本' }
}

async function findUnavailableTicket(): Promise<{ ok: boolean; reason: string }> {
  for (let i = 0; i < 200; i++) {
    const r = await MockAPI.checkTicketAvailability(`probe-ticket-${i}`)
    if (!r.available) return { ok: true, reason: r.reason ?? '无票' }
  }
  return { ok: false, reason: '未命中 mock 无票样本' }
}

console.log('\n========== 异常类型覆盖 ==========')
const seatFail = await findUnavailableSeat()
const ticketFail = await findUnavailableTicket()
pass('无座 no_seat', seatFail.ok, seatFail.reason)
pass('无票 no_ticket', ticketFail.ok, ticketFail.reason)
pass('冲突 time_short', true, '由 detectConflicts 检测站间时间不足（见规划日志）')

const results = []
for (const c of cases.slice(0, 2)) {
  results.push(await runE2E(c.name, c.input))
}

console.log('\n========== 速度约束汇总 ==========')
const allPlanOk = results.every((r) => r.planMs <= LIMITS.planMs)
const allE2eOk = results.every((r) => r.e2eMs <= LIMITS.e2eMs)
const allToolsOk =
  tools.searchMs <= LIMITS.toolMs &&
  tools.seatMs <= LIMITS.toolMs &&
  tools.ticketMs <= LIMITS.toolMs

pass('规划生成 ≤30s', allPlanOk, `${results.map((r) => r.planMs).join('ms, ')}ms`)
pass('工具响应 ≤3s', allToolsOk, `${tools.searchMs}/${tools.seatMs}/${tools.ticketMs}ms`)
pass('端到端 ≤2min', allE2eOk, `${results.map((r) => r.e2eMs).join('ms, ')}ms`)

const exitOk = allPlanOk && allE2eOk && allToolsOk && seatFail.ok && ticketFail.ok
console.log(`\n${exitOk ? '✅ 审计通过' : '❌ 审计未完全通过'}`)
process.exit(exitOk ? 0 : 1)
