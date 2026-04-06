/**
 * GateView Component - Enhanced with plane icons and visual parking
 * 
 * All emojis replaced with SVG to prevent React DOM errors.
 */
import useAirport from '../hooks/useAirport';
import PlaneIcon, { GateIcon } from './PlaneIcon';
import './GateView.css';

export default function GateView() {
  const { status } = useAirport();
  const { gates = [], gateSemaphore } = status;

  const occupiedCount = gates.filter(g => g.occupied).length;
  const totalGates = gates.length || 1;

  return (
    <div className="gate-view glass-card" id="gate-view">
      <div className="gate-header">
        <div>
          <h2>
            <GateIcon size={20} color="var(--accent-cyan)" />
            <span>{"Puertas de Embarque"}</span>
          </h2>
          {gateSemaphore && (
            <div className="semaphore-info">
              <span>{"Semáforo de Conteo: "}</span>
              <span className="sem-values">{gateSemaphore.available}{"/"}{ gateSemaphore.capacity}</span>
              <span>{" disponibles"}</span>
              {gateSemaphore.waiting > 0 && (
                <span className="sem-waiting">{" | "}{gateSemaphore.waiting}{" en espera"}</span>
              )}
            </div>
          )}
        </div>
        <div className="gate-counter">
          <span className={occupiedCount === gates.length ? 'counter-full' : 'counter-ok'}>
            {occupiedCount}{"/"}{totalGates}
          </span>
        </div>
      </div>

      <div className="gate-grid">
        {gates.map((gate) => (
          <div
            key={gate.id}
            className={`gate-card ${gate.occupied ? 'gate-occupied' : 'gate-available'}`}
            id={`gate-${gate.id}`}
          >
            <div className="gate-card-top">
              <span className={`status-indicator ${gate.occupied ? 'status-busy' : 'status-free'}`} />
              <span className="gate-name">{gate.name}</span>
            </div>

            {/* Gate parking spot visualization */}
            <div className="gate-parking">
              {gate.occupied && gate.assignedPlane ? (
                <div className="gate-parked-plane">
                  <PlaneIcon size={32} color="var(--accent-yellow)" direction="right" className="gate-plane-icon" />
                </div>
              ) : (
                <div className="gate-parking-empty">
                  <PlaneIcon size={24} color="rgba(255,255,255,0.06)" direction="right" />
                </div>
              )}
            </div>

            {gate.occupied && gate.assignedPlane ? (
              <div className="gate-plane-info">
                <div className="gate-plane-flight">{gate.assignedPlane.flightNumber}</div>
                <div className="gate-plane-airline">{gate.assignedPlane.airline}</div>
              </div>
            ) : (
              <div className="gate-empty">{"Disponible"}</div>
            )}

            <div className="gate-assignments">
              {"Usos: "}{gate.totalAssignments}
            </div>
          </div>
        ))}
      </div>

      {/* Semaphore utilization bar */}
      <div className="semaphore-bar-container">
        <div className="semaphore-bar-label">{"Utilización del Semáforo"}</div>
        <div className="semaphore-bar-track">
          <div
            className="semaphore-bar-fill"
            style={{ width: `${(occupiedCount / totalGates) * 100}%` }}
          />
        </div>
        <div className="semaphore-bar-percent">
          {((occupiedCount / totalGates) * 100).toFixed(0)}{"%"}
        </div>
      </div>
    </div>
  );
}
