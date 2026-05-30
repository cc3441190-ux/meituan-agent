import { useSyncExternalStore } from 'react'
import { PlannerServicesProvider } from './core/context'
import { PlannerAppV4 } from './components/v4/PlannerAppV4'
import { LandingPage } from './components/landing/LandingPage'
import { getAppRoute, subscribeRoute } from './lib/routes'

function useAppRoute() {
  return useSyncExternalStore(subscribeRoute, getAppRoute, getAppRoute)
}

function App() {
  const route = useAppRoute()

  if (route === 'demo') {
    return (
      <PlannerServicesProvider>
        <PlannerAppV4 />
      </PlannerServicesProvider>
    )
  }

  return <LandingPage />
}

export default App
