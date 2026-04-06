/**
 * AirportAerialView - Bird's eye view of the entire airport
 *
 * Layout (top-to-bottom, like an aerial photo):
 *   1. Sky zone: waiting/flying planes circling above
 *   2. Runway A: top runway with landing/takeoff animations
 *   3. Terminal zone: boarding gates between the two runways
 *   4. Runway B: bottom runway with landing/takeoff animations
 *
 * Animation states are driven ENTIRELY by the backend plane.status:
 *   - 'taxiing_to_gate'   → CSS taxi-in animation (plane slides from runway to gate)
 *   - 'taxiing_to_runway' → CSS taxi-out animation (plane slides from gate to runway)
 *   - 'at_gate'           → idle bobbing animation
 * This eliminates the need for fragile diff-based transition detection.
 */
import { useMemo, memo } from 'react';
import useAirport from '../hooks/useAirport';
import PlaneIcon, { GateIcon } from './PlaneIcon';
import ConcurrencyDemoOverlay from './ConcurrencyDemoOverlay';
import './AirportAerialView.css';

/* ── Inline sub-components ── */

/** Single runway strip rendered horizontally */
const RunwayStrip = memo(function RunwayStrip({ runway }) {
  const planeLanding  = runway.busy && runway.currentPlane?.status === 'landing';
  const planeTakingOff = runway.busy && runway.currentPlane?.status === 'taking_off';

  return (
    <div className={`aerial-runway ${runway.busy ? 'rw-busy' : 'rw-free'}`} id={`runway-${runway.id}`}>
      {/* Runway label */}
      <div className="rw-label-side rw-label-left">
        <span className="rw-number">{runway.name}</span>
        <span className={`rw-status-badge ${runway.busy ? 'badge-busy' : 'badge-free'}`}>
          {runway.busy ? 'OCUPADA' : 'LIBRE'}
        </span>
      </div>

      {/* The actual runway strip */}
      <div className="rw-strip">
        {/* Center dashes */}
        <div className="rw-dashes">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="rw-dash" />
          ))}
        </div>

        {/* Edge lights top */}
        <div className="rw-edge-lights rw-edge-top">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`rw-light ${runway.busy ? 'light-red' : 'light-green'}`} />
          ))}
        </div>

        {/* Edge lights bottom */}
        <div className="rw-edge-lights rw-edge-bottom">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`rw-light ${runway.busy ? 'light-red' : 'light-green'}`} />
          ))}
        </div>

        {/*
          Plane container — keyed by the current plane's id.
          This means React only unmounts/remounts the element when a NEW plane
          arrives (id changes), NOT on every status:update re-render.
          Without key, conditional rendering would destroy + recreate the element
          on every WebSocket tick, resetting the CSS animation to frame 0
          and causing the double-flash / double-appearance bug.
          When no plane is on the runway, the hidden class keeps it invisible.
        */}
        <div
          key={runway.currentPlane?.id ?? `ghost-${runway.id}`}
          className={`rw-plane ${
            !runway.busy || !runway.currentPlane ? 'rw-plane-hidden' :
            runway.currentPlane.status === 'taxiing_to_runway' ? 'rw-plane-hidden' :
            runway.currentPlane.status === 'waiting_for_runway_departure' ? 'rw-plane-hidden' :
            planeLanding   ? 'rw-plane-landing'  :
            planeTakingOff ? 'rw-plane-takeoff'  :
                             'rw-plane-hidden'
          }`}
          style={{
            '--land-from-y': runway.id === 'A' ? '-180px' : '-500px',
            '--land-from-x': `${5 + ((runway.currentPlane?.lastQueueIndex ?? 0) % 6) * 16}%`,
          }}
        >
          <PlaneIcon
            size={28}
            color="#ffffff"
            stroke="#d32f2f"
            strokeWidth={1.5}
            direction="right"
            className="rw-plane-svg"
          />
          <div className="rw-plane-shadow" />
          {runway.currentPlane && (
            <div className="rw-plane-label">{runway.currentPlane.flightNumber}</div>
          )}
        </div>

        {/* Ghost plane when idle */}
        {!runway.busy && (
          <div className="rw-ghost">
            <PlaneIcon size={28} color="rgba(0,0,0,0.08)" direction="right" />
          </div>
        )}

        {/* Threshold marks at runway ends */}
        <div className="rw-threshold rw-threshold-left">
          {[...Array(4)].map((_, i) => <div key={i} className="rw-threshold-mark" />)}
        </div>
        <div className="rw-threshold rw-threshold-right">
          {[...Array(4)].map((_, i) => <div key={i} className="rw-threshold-mark" />)}
        </div>
      </div>

      {/* Runway info right side */}
      <div className="rw-label-side rw-label-right">
        {runway.busy && runway.currentPlane ? (
          <>
            <span className="rw-flight-id">{runway.currentPlane.flightNumber}</span>
            <span className="rw-airline">{runway.currentPlane.airline}</span>
          </>
        ) : (
          <span className="rw-flight-id rw-empty">—</span>
        )}
        <div className="rw-stats-mini">
          <span>Ops: {runway.totalOperations}</span>
          <span>Wait: {runway.waitingCount}</span>
        </div>
      </div>
    </div>
  );
});

/**
 * Gate card in terminal zone with taxi-in / taxi-out animations.
 *
 * Animation is driven by the assigned plane's status:
 *  - 'taxiing_to_gate'   → tg-taxi-in CSS class (slide down from runway)
 *  - 'at_gate'           → idle state
 *  - 'taxiing_to_runway' → tg-taxi-out CSS class (slide up toward runway)
 */
const GateSpot = memo(function GateSpot({ gate, index, total }) {
  // Determine animation class from the plane's status (driven by backend)
  const planeStatus = gate.assignedPlane?.status;
  const gateAnimClass = planeStatus === 'taxiing_to_gate'   ? 'tg-taxi-in' :
                        planeStatus === 'taxiing_to_runway' ? 'tg-taxi-out' : '';

  // Calculate horizontal offset for taxi diagonal animation
  // This makes the plane slide diagonally from runway center to gate position
  const offsetX = (0.5 - ((index + 0.5) / total)) * 90;
  
  // Read runway assignment for vertical CSS taxi mapping
  // Runway 1 (A) is at the top (-120px target). Runway 2 (B) is at the bottom (120px target).
  // Runway IDs are strings ('A', 'B', ...) — NOT numbers
  const runwayId = gate.assignedPlane?.assignedRunway;
  const taxiY = runwayId === 'A' ? '-120px' : '120px';

  return (
    <div className={`terminal-gate ${gate.occupied ? 'tg-occupied' : 'tg-available'} ${gateAnimClass}`} id={`gate-${gate.id}`}>
      <div className="tg-connector" />
      <div className="tg-body">
        <span className={`status-indicator ${gate.occupied ? 'status-busy' : 'status-free'}`} />
        <span className="tg-name">{gate.name}</span>
        {gate.occupied && gate.assignedPlane ? (
          <div className="tg-plane-dock" style={{ '--taxi-x': `${offsetX}vw`, '--taxi-y': taxiY }}>
            <PlaneIcon size={28} color="#ffffff" stroke="#d32f2f" strokeWidth={1.5} direction="right" className="tg-plane-icon" />
            <span className="tg-flight">{gate.assignedPlane.flightNumber}</span>
          </div>
        ) : (
          <div className="tg-plane-dock tg-empty-dock">
            <PlaneIcon size={28} color="rgba(0,0,0,0.08)" direction="right" />
            <span className="tg-empty-text">Libre</span>
          </div>
        )}
      </div>
    </div>
  );
});

/** Flying plane in the sky zone — always visible, orbiting in place */
const FlyingPlane = memo(function FlyingPlane({ plane, index }) {
  // Sequential queue layout: strictly fixed positions filling from top-left to right.
  const maxCols = 6; // Up to 6 planes per row before moving to next line
  const row = Math.floor(index / maxCols);
  const col = index % maxCols;

  // Calculate fixed spacing: start at 10% left, add 15% per plane.
  // Start at 20% top, add 35% per row.
  const leftPercent = 5 + (col * 16); 
  const topPercent = 15 + (row * 35);

  // Each plane gets a slightly different animation delay for organic feel
  const animDelay = index * 0.4;
  // Alternate orbit direction for visual variety
  const orbitClass = index % 2 === 0 ? 'sky-orbit-cw' : 'sky-orbit-ccw';

  return (
    <div
      className={`sky-plane ${orbitClass}`}
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        animationDelay: `${animDelay}s`,
        willChange: 'transform',
      }}
    >
      <PlaneIcon size={28} color="#ffffff" stroke="#d32f2f" strokeWidth={1.5} direction="right" className="sky-plane-icon" />
      <div className="sky-plane-trail" />
      <div className="sky-plane-label">{plane.flightNumber}</div>
    </div>
  );
});

/* ── Main Component ── */
export default function AirportAerialView() {
  const { status, demoData, closeDemoOverlay } = useAirport();
  const { runways = [], gates = [], waitingQueue = [], activePlanes = [], gateSemaphore } = status;

  // Active planes filtered for tracker (exclude terminal states)
  // Show all active planes except fully departed ones
  const inProgress = useMemo(
    () => activePlanes.filter(p => !['departed'].includes(p.status)),
    [activePlanes]
  );

  const occupiedGates = useMemo(() => gates.filter(g => g.occupied).length, [gates]);
  const totalGates = gates.length || 1;

  // Split runways — at least show two
  const runway1 = runways[0] || { id: 'A', name: 'Runway A', busy: false, currentPlane: null, totalOperations: 0, waitingCount: 0 };
  const runway2 = runways[1] || { id: 'B', name: 'Runway B', busy: false, currentPlane: null, totalOperations: 0, waitingCount: 0 };

  // Determine taxiway active states from gate plane statuses
  const gateTaxiStates = useMemo(() => {
    const states = {};
    gates.forEach(gate => {
      const ps = gate.assignedPlane?.status;
      states[gate.id] = ps === 'taxiing_to_gate' ? 'taxi-in' :
                        ps === 'taxiing_to_runway' ? 'taxi-out' : 'idle';
    });
    return states;
  }, [gates]);

  return (
    <div className="aerial-view glass-card" id="aerial-airport" style={{ position: 'relative' }}>
      {/* Section header */}
      <div className="aerial-header">
        <h2>
          <PlaneIcon size={22} color="var(--accent-cyan)" direction="right" />
          <span>Vista Aérea del Aeropuerto</span>
        </h2>
        <div className="aerial-badges">
          <span className="badge badge-info">Semáforo Binario (Pistas)</span>
          <span className="badge badge-waiting">Semáforo de Conteo (Puertas)</span>
        </div>
      </div>

      {/* ═══ SKY ZONE ═══ Flying/waiting planes */}
      <div className="sky-zone">
        <div className="sky-label">
          <span className="sky-label-icon">☁</span>
          <span>Espacio Aéreo — Cola FIFO ({waitingQueue.length} en espera)</span>
        </div>
        <div className="sky-area">
          {/* Clouds for ambience */}
          <div className="cloud cloud-1" />
          <div className="cloud cloud-2" />
          <div className="cloud cloud-3" />

          {waitingQueue.length === 0 && inProgress.length === 0 && (
            <div className="sky-empty">Sin aviones en espera</div>
          )}

          {/* Waiting planes fly in circles */}
          {waitingQueue.map((plane, i) => (
            <FlyingPlane key={plane.id} plane={plane} index={i} />
          ))}
        </div>
      </div>

      {/* ═══ RUNWAY A (Top) ═══ */}
      <RunwayStrip runway={runway1} />

      {/* ═══ TERMINAL — Gates between runways ═══ */}
      <div className="terminal-zone">
        <div className="terminal-label">
          <GateIcon size={18} color="var(--accent-cyan)" />
          <span>Terminal — Puertas de Embarque</span>
          <span className="terminal-counter">
            {gateSemaphore && (
              <span className="sem-chip">
                Semáforo: {gateSemaphore.available}/{gateSemaphore.capacity} disponibles
                {gateSemaphore.waiting > 0 && <span className="sem-wait"> | {gateSemaphore.waiting} esperando</span>}
              </span>
            )}
          </span>
          <span className={`terminal-count ${occupiedGates === gates.length ? 'tc-full' : 'tc-ok'}`}>
            {occupiedGates}/{totalGates}
          </span>
        </div>

        <div className="terminal-building">
          {/* Taxiway lines connecting to top runway */}
          <div className="taxiway taxiway-top">
            {gates.map((gate, i) => (
              <div
                key={i}
                className={`taxiway-line ${gateTaxiStates[gate.id] === 'taxi-in' ? 'taxiway-active-in' : gateTaxiStates[gate.id] === 'taxi-out' ? 'taxiway-active-out' : ''}`}
              />
            ))}
          </div>

          {/* Gate spots — animation driven by plane.status from backend */}
          <div className="terminal-gates">
            {gates.map((gate, i) => (
              <GateSpot key={gate.id} gate={gate} index={i} total={gates.length} />
            ))}
          </div>

          {/* Taxiway lines connecting to bottom runway */}
          <div className="taxiway taxiway-bottom">
            {gates.map((gate, i) => (
              <div
                key={i}
                className={`taxiway-line ${gateTaxiStates[gate.id] === 'taxi-out' ? 'taxiway-active-out' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Utilization bar */}
        <div className="terminal-utilization">
          <span className="tu-label">Utilización</span>
          <div className="tu-track">
            <div className="tu-fill" style={{ width: `${(occupiedGates / totalGates) * 100}%` }} />
          </div>
          <span className="tu-percent">{((occupiedGates / totalGates) * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* ═══ RUNWAY B (Bottom) ═══ */}
      <RunwayStrip runway={runway2} />

      {/* ═══ Active planes tracker ═══ */}
      {inProgress.length > 0 && (
        <div className="active-tracker">
          <div className="at-label">Aviones en Proceso ({inProgress.length})</div>
          <div className="at-list">
            {inProgress.map(plane => (
              <div key={plane.id} className={`at-chip at-${plane.status}`}>
                <PlaneIcon
                  size={16}
                  color={
                    plane.status === 'flying' ? 'var(--accent-cyan)' :
                    plane.status === 'waiting_for_runway' ? 'var(--accent-yellow)' :
                    plane.status === 'landing' ? 'var(--accent-red)' :
                    plane.status === 'taxiing_to_gate' ? 'var(--accent-yellow)' :
                    plane.status === 'at_gate' ? 'var(--accent-yellow)' :
                    plane.status === 'waiting_for_runway_departure' ? 'var(--accent-purple)' :
                    plane.status === 'taxiing_to_runway' ? 'var(--accent-green)' :
                    'var(--accent-cyan)'
                  }
                  direction={plane.status === 'taking_off' ? 'right' : 'down'}
                />
                <span className="at-flight">{plane.flightNumber}</span>
                <span className="at-status">
                  {plane.status === 'flying' && 'Volando'}
                  {plane.status === 'waiting_for_runway' && '⏳ Esperando Pista'}
                  {plane.status === 'landing' && 'Aterrizando'}
                  {plane.status === 'taxiing_to_gate' && 'Taxi → Puerta'}
                  {plane.status === 'at_gate' && `Puerta ${plane.assignedGate}`}
                  {plane.status === 'waiting_for_runway_departure' && '⏳ Esperando Pista'}
                  {plane.status === 'taxiing_to_runway' && 'Taxi → Pista'}
                  {plane.status === 'taking_off' && 'Despegando'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Concurrency demo overlay (in-place on runways) ═══ */}
      {demoData && (
        <ConcurrencyDemoOverlay demoData={demoData} onClose={closeDemoOverlay} />
      )}
    </div>
  );
}
