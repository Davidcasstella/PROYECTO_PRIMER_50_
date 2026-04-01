/**
 * SimulationPage
 * 
 * Main page that assembles all components into the simulation interface.
 * Uses a grid layout to organize the dashboard components.
 */
import AirportDashboard from '../components/AirportDashboard';
import RunwayView from '../components/RunwayView';
import GateView from '../components/GateView';
import PlaneQueue from '../components/PlaneQueue';
import LogsPanel from '../components/LogsPanel';
import './SimulationPage.css';

export default function SimulationPage() {
  return (
    <div className="simulation-page" id="simulation-page">
      <div className="simulation-container">
        {/* Dashboard header and controls */}
        <AirportDashboard />

        {/* Main content grid */}
        <div className="simulation-grid">
          {/* Left column: Runways + Gates */}
          <div className="simulation-left">
            <RunwayView />
            <GateView />
          </div>

          {/* Right column: Queue + Logs */}
          <div className="simulation-right">
            <PlaneQueue />
            <LogsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
