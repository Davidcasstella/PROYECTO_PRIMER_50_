/**
 * RunwayView Component - Enhanced with airplane animations
 * 
 * Visual runway with animated SVG planes landing and taking off.
 * All emojis replaced with SVG icons to prevent React DOM errors.
 */
import useAirport from '../hooks/useAirport';
import PlaneIcon from './PlaneIcon';
import './RunwayView.css';

export default function RunwayView() {
  const { status } = useAirport();
  const { runways = [] } = status;

  return (
    <div className="runway-view glass-card" id="runway-view">
      <div className="runway-header">
        <h2>
          <PlaneIcon size={22} color="var(--accent-cyan)" direction="down" />
          <span>Pistas de Aterrizaje</span>
        </h2>
        <span className="badge badge-info">{"Semáforo Binario (Mutex)"}</span>
      </div>
      <div className="runway-grid">
        {runways.map((runway) => {
          const planeLanding = runway.busy && runway.currentPlane?.status === 'landing';
          const planeDeparting = runway.busy && runway.currentPlane?.status === 'departing';

          return (
            <div
              key={runway.id}
              className={`runway-card ${runway.busy ? 'runway-busy' : 'runway-free'}`}
              id={`runway-${runway.id}`}
            >
              <div className="runway-top">
                <div className="runway-name">{runway.name}</div>
                <span className={`status-indicator ${runway.busy ? 'status-busy' : 'status-free'}`} />
              </div>

              {/* Animated runway strip */}
              <div className="runway-strip">
                <div className="runway-markings">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="runway-mark" />
                  ))}
                </div>

                {/* Runway lights */}
                <div className="runway-lights">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`runway-light ${runway.busy ? 'light-red' : 'light-green'}`} />
                  ))}
                </div>

                {/* Animated plane on runway */}
                {runway.busy && runway.currentPlane && (
                  <div className={`runway-plane-anim ${planeLanding ? 'anim-landing' : planeDeparting ? 'anim-takeoff' : 'anim-idle'}`}>
                    <PlaneIcon
                      size={40}
                      color={planeDeparting ? 'var(--accent-green)' : 'var(--accent-cyan)'}
                      className="runway-plane-svg"
                      direction="right"
                    />
                    <div className="plane-shadow" />
                  </div>
                )}

                {/* Idle runway indicator */}
                {!runway.busy && (
                  <div className="runway-idle">
                    <PlaneIcon size={28} color="rgba(255,255,255,0.08)" direction="right" />
                  </div>
                )}
              </div>

              <div className="runway-info">
                {runway.busy && runway.currentPlane ? (
                  <>
                    <div className="runway-plane-id">
                      {runway.currentPlane.flightNumber}
                    </div>
                    <div className="runway-plane-airline">
                      {runway.currentPlane.airline}
                    </div>
                    <span className="badge badge-busy">{"OCUPADA"}</span>
                  </>
                ) : (
                  <>
                    <div className="runway-plane-id empty-dash">{"—"}</div>
                    <span className="badge badge-free">{"LIBRE"}</span>
                  </>
                )}
              </div>

              <div className="runway-stats">
                <span>{"Operaciones: "}{runway.totalOperations}</span>
                <span>{"En espera: "}{runway.waitingCount}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
