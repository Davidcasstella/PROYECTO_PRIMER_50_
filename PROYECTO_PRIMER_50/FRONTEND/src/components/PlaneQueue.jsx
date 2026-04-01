/**
 * PlaneQueue Component - Enhanced with SVG icons
 * All emojis replaced with SVG to prevent React DOM errors.
 */
import useAirport from '../hooks/useAirport';
import PlaneIcon, { QueueIcon } from './PlaneIcon';
import './PlaneQueue.css';

// Status icon map - returns SVG-based indicators instead of emojis
function StatusIcon({ status }) {
  const iconMap = {
    landing: { color: 'var(--accent-red)', dir: 'down', label: 'Aterrizando' },
    landed: { color: 'var(--accent-green)', dir: 'down', label: 'Aterrizó' },
    at_gate: { color: 'var(--accent-yellow)', dir: 'up', label: 'En puerta' },
    departing: { color: 'var(--accent-cyan)', dir: 'up', label: 'Despegando' },
  };
  const cfg = iconMap[status] || { color: 'var(--text-muted)', dir: 'right', label: status };
  return <PlaneIcon size={18} color={cfg.color} direction={cfg.dir} />;
}

export default function PlaneQueue() {
  const { status } = useAirport();
  const { waitingQueue = [], activePlanes = [] } = status;

  const inProgress = activePlanes.filter(p => p.status !== 'waiting');

  return (
    <div className="plane-queue glass-card" id="plane-queue">
      <div className="queue-header">
        <h2>
          <QueueIcon size={20} color="var(--accent-cyan)" />
          <span>{"Cola de Aviones"}</span>
        </h2>
        <div className="queue-count">
          <span className="badge badge-waiting">{waitingQueue.length}{" en espera"}</span>
          <span className="badge badge-info">{inProgress.length}{" en proceso"}</span>
        </div>
      </div>

      {/* Waiting planes */}
      <div className="queue-section">
        <div className="queue-section-title">
          <PlaneIcon size={14} color="var(--accent-yellow)" direction="down" />
          <span>{" En Espera (Cola FIFO)"}</span>
        </div>
        {waitingQueue.length === 0 ? (
          <div className="queue-empty">{"No hay aviones esperando"}</div>
        ) : (
          <div className="queue-list">
            {waitingQueue.map((plane, index) => (
              <div key={plane.id} className="queue-item queue-item-waiting" style={{ animationDelay: `${index * 80}ms` }}>
                <div className="qi-position">{"#"}{index + 1}</div>
                <div className="qi-icon-wrap">
                  <PlaneIcon size={16} color="var(--accent-yellow)" direction="down" className="qi-plane-spinning" />
                </div>
                <div className="qi-info">
                  <div className="qi-flight">{plane.flightNumber}</div>
                  <div className="qi-airline">{plane.airline}</div>
                </div>
                <span className="badge badge-waiting">{"Esperando"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In progress planes */}
      {inProgress.length > 0 && (
        <div className="queue-section">
          <div className="queue-section-title">
            <PlaneIcon size={14} color="var(--accent-cyan)" direction="right" />
            <span>{" En Proceso"}</span>
          </div>
          <div className="queue-list">
            {inProgress.map((plane) => (
              <div key={plane.id} className="queue-item queue-item-active">
                <div className="qi-status-icon">
                  <StatusIcon status={plane.status} />
                </div>
                <div className="qi-info">
                  <div className="qi-flight">{plane.flightNumber}</div>
                  <div className="qi-airline">{plane.airline}</div>
                </div>
                <span className={`badge ${
                  plane.status === 'landing' ? 'badge-busy' :
                  plane.status === 'at_gate' ? 'badge-info' :
                  plane.status === 'departing' ? 'badge-warning' : 'badge-free'
                }`}>
                  {plane.status === 'landing' && 'Aterrizando'}
                  {plane.status === 'landed' && 'Aterrizó'}
                  {plane.status === 'at_gate' && `Puerta ${plane.assignedGate}`}
                  {plane.status === 'departing' && 'Despegando'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
