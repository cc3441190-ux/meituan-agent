import { createContext, useContext, type ReactNode } from 'react'
import { createPlannerServices } from './services'
import type { PlannerServices } from './ports'

const PlannerServicesContext = createContext<PlannerServices | null>(null)

export function PlannerServicesProvider({ children }: { children: ReactNode }) {
  const services = createPlannerServices()
  return (
    <PlannerServicesContext.Provider value={services}>{children}</PlannerServicesContext.Provider>
  )
}

export function usePlannerServices(): PlannerServices {
  const ctx = useContext(PlannerServicesContext)
  if (!ctx) throw new Error('usePlannerServices 必须在 PlannerServicesProvider 内使用')
  return ctx
}
