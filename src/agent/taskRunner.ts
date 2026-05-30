import type { Deliverable, DeliverableStatus } from './deliverables'
import { DELIVERABLE_CANCEL_WINDOW_MS } from './deliverables'
import { cloneDeliverable } from './deliverables'
import type { IBookingService } from '../core/ports'

const STAGE_DELAYS = [600, 900, 1100]

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function topologicalLayers(items: Deliverable[]): Deliverable[][] {
  const selected = items.filter((d) => d.selected)
  const byId = new Map(selected.map((d) => [d.id, d]))
  const layers: Deliverable[][] = []
  const placed = new Set<string>()

  while (placed.size < selected.length) {
    const layer: Deliverable[] = []
    for (const d of selected) {
      if (placed.has(d.id)) continue
      const deps = d.dependsOn ?? []
      const ready = deps.every((depId) => {
        const dep = byId.get(depId)
        if (!dep) return true
        return placed.has(depId)
      })
      if (ready) layer.push(d)
    }
    if (layer.length === 0) {
      for (const d of selected) {
        if (!placed.has(d.id)) layer.push(d)
      }
    }
    layer.forEach((d) => placed.add(d.id))
    layers.push(layer)
  }

  return layers
}

export type TaskRunnerCallbacks = {
  onUpdate: (d: Deliverable) => void
  onAllDone?: () => void
  onNeedsAttention?: (d: Deliverable) => void
}

export class TaskRunner {
  private items: Deliverable[]
  private cancelled = false
  private booking: IBookingService
  private callbacks: TaskRunnerCallbacks

  constructor(items: Deliverable[], booking: IBookingService, callbacks: TaskRunnerCallbacks) {
    this.items = items.map(cloneDeliverable)
    this.booking = booking
    this.callbacks = callbacks
  }

  getItems(): Deliverable[] {
    return this.items
  }

  cancel() {
    this.cancelled = true
  }

  async dispatch(): Promise<void> {
    const layers = topologicalLayers(this.items)

    for (const layer of layers) {
      if (this.cancelled) return
      await Promise.all(layer.map((d) => this.runOne(d)))
    }

    const needsAttention = this.items.some(
      (d) => d.status === 'fallback_proposed' || d.status === 'failed',
    )
    if (!needsAttention) {
      this.callbacks.onAllDone?.()
    }
  }

  async retry(id: string): Promise<void> {
    const d = this.items.find((x) => x.id === id)
    if (!d) return
    d.status = 'idle'
    d.progress = 0
    d.failureReason = undefined
    this.callbacks.onUpdate(d)
    await this.runOne(d)
  }

  acceptFallback(id: string): void {
    const d = this.items.find((x) => x.id === id)
    if (!d?.fallback) return
    const fb = cloneDeliverable(d.fallback)
    fb.id = id
    fb.selected = true
    fb.status = 'idle'
    fb.progress = 0
    fb.fallback = undefined
    fb.failureReason = undefined
    const idx = this.items.findIndex((x) => x.id === id)
    this.items[idx] = fb
    this.callbacks.onUpdate(fb)
    void this.runOne(fb)
  }

  rejectFallback(id: string): void {
    const d = this.items.find((x) => x.id === id)
    if (!d) return
    d.status = 'failed'
    d.selected = false
    this.callbacks.onUpdate(d)
  }

  private patch(id: string, patch: Partial<Deliverable>) {
    const idx = this.items.findIndex((x) => x.id === id)
    if (idx === -1) return
    this.items[idx] = { ...this.items[idx], ...patch }
    this.callbacks.onUpdate(this.items[idx])
  }

  private async advanceStages(id: string) {
    const stages: DeliverableStatus[] = [
      'queued',
      'dispatching',
      'in_progress',
    ]
    for (let i = 0; i < stages.length; i++) {
      if (this.cancelled) return
      this.patch(id, {
        status: stages[i],
        progress: (i + 1) / (stages.length + 1),
      })
      await delay(STAGE_DELAYS[i] ?? 800)
    }
  }

  private async runOne(d: Deliverable): Promise<void> {
    if (!d.selected || d.status === 'done') return

    await this.advanceStages(d.id)

    const res = await this.booking.dispatchDeliverable(d)

    if (!res.success && res.fallback) {
      this.patch(d.id, {
        status: 'fallback_proposed',
        progress: 0.6,
        failureReason: res.message,
        fallback: res.fallback,
      })
      this.callbacks.onNeedsAttention?.(this.items.find((x) => x.id === d.id)!)
      return
    }

    if (!res.success) {
      this.patch(d.id, {
        status: 'failed',
        progress: 0,
        failureReason: res.message,
      })
      this.callbacks.onNeedsAttention?.(this.items.find((x) => x.id === d.id)!)
      return
    }

    this.patch(d.id, {
      status: 'done',
      progress: 1,
      orderId: res.orderId,
      failureReason: undefined,
      cancellableUntil: Date.now() + DELIVERABLE_CANCEL_WINDOW_MS,
    })
  }
}
