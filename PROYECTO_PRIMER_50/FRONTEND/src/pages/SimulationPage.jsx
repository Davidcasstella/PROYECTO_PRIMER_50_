/**
 * SimulationPage - Aerial Airport View Layout
 *
 * Layout (top-to-bottom):
 *   1. Dashboard (header + controls + stats)
 *   2. Aerial Airport View (includes concurrency demos)
 *   3. Logs Panel (bottom)
 */
import AirportDashboard from '../components/AirportDashboard';
import AirportAerialView from '../components/AirportAerialView';
import LogsPanel from '../components/LogsPanel';
import './SimulationPage.css';

export default function SimulationPage() {
  return (
    <div className="simulation-page" id="simulation-page">
      <div className="simulation-container">
        {/* Dashboard header and controls */}
        <AirportDashboard />

        {/* Aerial airport visualization */}
        <AirportAerialView />

        {/* Event logs */}
        <LogsPanel />
      </div>
    </div>
  );
}

