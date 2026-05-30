import { PlannerServicesProvider } from './core/context'
import { PlannerAppV4 } from './components/v4/PlannerAppV4'

function App() {
  return (
    <PlannerServicesProvider>
      <PlannerAppV4 />
    </PlannerServicesProvider>
  )
}

export default App
