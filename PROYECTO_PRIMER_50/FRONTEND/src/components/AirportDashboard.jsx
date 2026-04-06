/**
 * AirportDashboard Component - Fixed emoji issue
 * All emojis replaced with SVG to prevent React DOM removeChild errors.
 */
import useAirport from '../hooks/useAirport';
import PlaneIcon from './PlaneIcon';
import './AirportDashboard.css';

export default function AirportDashboard() {
  const {
    status,
    connected,
    loading,
    addPlane,
    startSimulation,
    stopSimulation,
    simulateRaceCondition,
    simulateDeadlock,
  } = useAirport();

  const { simulationActive, stats } = status;

  return (
    <div className="dashboard" id="airport-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="header-title">
            <PlaneIcon size={32} color="var(--accent-cyan)" className="title-plane-icon" />
            <span>{"Aeropuerto Inteligente"}</span>
          </h1>
          <p className="header-subtitle">
            {"Simulación de Concurrencia en Tiempo Real"}
          </p>
        </div>
        <div className="header-right">
          <div className={`connection-status ${connected ? 'conn-ok' : 'conn-err'}`}>
            <span className={`status-indicator ${connected ? 'status-free' : 'status-busy'}`} />
            <span>{connected ? 'Conectado' : 'Desconectado'}</span>
          </div>
        </div>
      </header>

      {/* Statistics */}
      <div className="dashboard-stats">
        <div className="stat-card glass-card">
          <div className="stat-icon">
            <PlaneIcon size={20} color="var(--accent-cyan)" />
          </div>
          <div className="stat-value">{stats.totalPlanesProcessed}</div>
          <div className="stat-label">{"Aviones Procesados"}</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-value">{status.waitingQueue?.length || 0}</div>
          <div className="stat-label">{"En Cola"}</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-value stat-warn">{stats.raceConditionsDetected}</div>
          <div className="stat-label">{"Race Conditions"}</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-value stat-error">{stats.deadlocksDetected}</div>
          <div className="stat-label">{"Deadlocks"}</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-value stat-success">{stats.deadlocksResolved}</div>
          <div className="stat-label">{"Resueltos"}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="dashboard-controls glass-card">
        <div className="controls-group">
          <span className="controls-label">{"Simulación"}</span>
          <div className="controls-buttons">
            {!simulationActive ? (
              <button
                className="btn btn-success btn-lg"
                onClick={startSimulation}
                disabled={loading}
                id="start-simulation-btn"
              >
                <PlaneIcon size={16} color="#fff" direction="right" />
                <span>{"Iniciar Simulación"}</span>
              </button>
            ) : (
              <button
                className="btn btn-danger btn-lg"
                onClick={stopSimulation}
                id="stop-simulation-btn"
              >
                <span>{"Detener"}</span>
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => addPlane()}
              disabled={loading}
              id="add-plane-btn"
            >
              <span>{"+ Agregar Avión"}</span>
            </button>
          </div>
        </div>

        <div className="controls-divider" />

        <div className="controls-group">
          <span className="controls-label">{"Demostraciones"}</span>
          <div className="controls-buttons">
            <button
              className="btn btn-warning"
              onClick={simulateRaceCondition}
              disabled={loading}
              id="race-condition-btn"
            >
              <span>{"Condición de Carrera"}</span>
            </button>
            <button
              className="btn btn-purple"
              onClick={simulateDeadlock}
              disabled={loading}
              id="deadlock-btn"
            >
              <span>{"Deadlock"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
