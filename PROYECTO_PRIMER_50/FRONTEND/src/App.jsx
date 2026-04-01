/**
 * App Root Component
 * 
 * Wraps the application with the AirportProvider context
 * and renders the main simulation page.
 */
import { AirportProvider } from './context/AirportContext';
import SimulationPage from './pages/SimulationPage';

function App() {
  return (
    <AirportProvider>
      <SimulationPage />
    </AirportProvider>
  );
}

export default App;
