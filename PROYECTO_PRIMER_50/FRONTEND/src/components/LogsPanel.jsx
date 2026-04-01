/**
 * LogsPanel Component
 * 
 * Displays real-time event logs from the simulation.
 * Smart auto-scroll: only scrolls when user is already at bottom.
 * Pauses auto-scroll when user scrolls up to read history.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import useAirport from '../hooks/useAirport';
import { LogIcon } from './PlaneIcon';
import './LogsPanel.css';

export default function LogsPanel() {
  const { logs, clearLogs } = useAirport();
  const containerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Detect if user has scrolled away from bottom
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // Consider "at bottom" if within 40px of the end
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setIsAtBottom(atBottom);
  }, []);

  // Only auto-scroll if user is at the bottom
  useEffect(() => {
    if (isAtBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, isAtBottom]);

  // Jump to bottom manually
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  }, []);

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '--:--:--';
    }
  };

  const getLevelClass = (level) => {
    switch (level) {
      case 'ERROR': return 'log-error';
      case 'WARN': return 'log-warn';
      case 'INFO': return 'log-info';
      default: return 'log-debug';
    }
  };

  // Strip emojis from log messages to prevent React DOM errors
  const cleanMessage = (msg) => {
    if (typeof msg !== 'string') return String(msg);
    return msg.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();
  };

  return (
    <div className="logs-panel glass-card" id="logs-panel">
      <div className="logs-header">
        <h2>
          <LogIcon size={20} color="var(--accent-cyan)" />
          <span>{"Registro de Eventos"}</span>
        </h2>
        <div className="logs-actions">
          <span className="logs-count">{logs.length}{" eventos"}</span>
          <button className="btn btn-sm" onClick={clearLogs} id="clear-logs-btn">
            {"Limpiar"}
          </button>
        </div>
      </div>

      <div
        className="logs-container"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <div className="logs-empty">
            {"No hay eventos registrados. Inicia la simulación para ver los logs."}
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`log-entry ${getLevelClass(log.level)}`}>
              <span className="log-time">{formatTime(log.timestamp)}</span>
              <span className={`log-level log-level-${log.level.toLowerCase()}`}>
                {log.level}
              </span>
              <span className="log-message">{cleanMessage(log.message)}</span>
            </div>
          ))
        )}
      </div>

      {/* Floating "scroll to bottom" button when user scrolled up */}
      {!isAtBottom && logs.length > 0 && (
        <button className="scroll-bottom-btn" onClick={scrollToBottom}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>{"Nuevos logs"}</span>
        </button>
      )}
    </div>
  );
}
