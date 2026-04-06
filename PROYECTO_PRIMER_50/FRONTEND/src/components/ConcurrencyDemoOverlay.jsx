/**
 * ConcurrencyDemoOverlay — In-Place Airport Demo
 *
 * Renders INSIDE the AirportAerialView, NOT as a full-screen modal.
 * Demo planes animate directly on the actual runway strips while a
 * floating info banner explains each step.
 *
 * Navigation: MANUAL via ◀ / ▶ arrow buttons (no auto-advance).
 * User can go forward AND backward through steps at their own pace.
 */
import { useState, useEffect, useCallback } from 'react';
import PlaneIcon from './PlaneIcon';
import './ConcurrencyDemoOverlay.css';

/* ─── Step definitions ─── */

const RACE_STEPS = [
  {
    id: 'intro',
    title: 'Paso 1 — Sin Semáforo',
    text: 'Dos aviones (Thread A y Thread B) intentan acceder a la misma pista simultáneamente sin exclusión mutua.',
  },
  {
    id: 'move',
    title: 'Paso 2 — Acceso Concurrente',
    text: 'Ambos hilos leen el estado de la pista como "libre" y avanzan al mismo tiempo...',
  },
  {
    id: 'conflict',
    title: 'Paso 3 — ¡Conflicto de Datos!',
    text: 'Ambos escriben sobre el mismo recurso compartido. La última escritura sobrescribe la primera → corrupción de datos.',
  },
  {
    id: 'result',
    title: 'Paso 4 — Resultado de la Carrera',
    text: 'El ganador se queda con la pista. El perdedor fue sobrescrito y su asignación se PERDIÓ.',
  },
  {
    id: 'solution',
    title: 'Paso 5 — Solución: Semáforo Binario (Mutex)',
    text: 'Un mutex garantiza exclusión mutua: solo un hilo accede al recurso a la vez.',
  },
];

const DEADLOCK_STEPS = [
  {
    id: 'intro',
    title: 'Paso 1 — Asignación de Recursos',
    text: 'Avión A reserva la Pista. Avión B reserva la Puerta. Cada uno tiene un recurso.',
  },
  {
    id: 'wait',
    title: 'Paso 2 — Espera Cruzada',
    text: 'Avión A necesita la Puerta (la tiene B). Avión B necesita la Pista (la tiene A). Ninguno suelta su recurso.',
  },
  {
    id: 'coffman',
    title: 'Paso 3 — 4 Condiciones de Coffman',
    text: 'Se cumplen las cuatro condiciones necesarias para un deadlock: Exclusión Mutua + Retención y Espera + Sin Expropiación + Espera Circular.',
  },
  {
    id: 'deadlock',
    title: 'Paso 4 — ¡DEADLOCK! — Abrazo Mortal',
    text: 'Espera circular confirmada. Ambos procesos están bloqueados indefinidamente. El sistema se congeló.',
  },
  {
    id: 'solution',
    title: 'Paso 5 — Resolución: Ordenamiento Global',
    text: 'Regla: SIEMPRE adquirir Puerta ANTES que Pista. Esto rompe la espera circular (Coffman #4).',
  },
];

const COFFMAN_LABELS = [
  'Excl. Mutua',
  'Retención',
  'No Expropiación',
  'Espera Circular',
];

/* ─── Main Overlay (renders inside aerial-view) ─── */
export default function ConcurrencyDemoOverlay({ demoData, onClose }) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);

  const type = demoData?.type;
  const steps = type === 'race_condition' ? RACE_STEPS : DEADLOCK_STEPS;

  // Reset step when new demo opens
  useEffect(() => {
    if (demoData) {
      setStep(0);
      setClosing(false);
    }
  }, [demoData]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setStep(prev => Math.min(prev + 1, steps.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setStep(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [steps.length]);

  const goNext = useCallback(() => {
    setStep(prev => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const goPrev = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 0));
  }, []);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 500);
  }, [onClose]);

  if (!demoData) return null;

  const currentStep = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const closingClass = closing ? 'demo-closing' : '';

  // For coffman step, all chips visible when on coffman or after
  const coffmanVisible = [true, true, true, true]; // always show all when on that step

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className={`demo-backdrop ${closingClass}`} />

      {/* Floating info banner */}
      <div className={`demo-info-banner ${closingClass}`}>
        {/* Header row: badge + dots + close */}
        <div className="demo-banner-header">
          <span className={`demo-type-badge ${type === 'race_condition' ? 'demo-badge-race' : 'demo-badge-deadlock'}`}>
            {type === 'race_condition' ? 'Race Condition' : 'Deadlock'}
          </span>
          <div className="demo-steps">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className={`demo-step-dot ${i === step ? 'dot-active' : i < step ? 'dot-done' : ''}`}
              />
            ))}
          </div>
          <button className="demo-close-btn" onClick={handleClose} title="Cerrar (Esc)">✕</button>
        </div>

        {/* Step text */}
        <div className="demo-banner-body" key={currentStep.id}>
          <h3 className="demo-step-title">{currentStep.title}</h3>
          <p className="demo-step-text">{currentStep.text}</p>

          {currentStep.id === 'solution' && (
            <div className="demo-solution">
              <div className="demo-solution-title">
                <span>✅</span>
                <span>{type === 'race_condition' ? 'Prevención con Mutex' : 'Prevención con Ordenamiento Global'}</span>
              </div>
              <p className="demo-solution-text">
                {type === 'race_condition'
                  ? 'Cada pista está protegida por un semáforo binario. Solo un avión accede a la vez; el otro espera en la cola FIFO.'
                  : 'Todos los procesos adquieren recursos en el mismo orden (Gate → Runway). Esto hace imposible la espera circular.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        <div className="demo-nav">
          <button
            className="demo-nav-btn"
            onClick={goPrev}
            disabled={isFirst}
            title="Anterior (←)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Anterior</span>
          </button>

          <span className="demo-nav-counter">{step + 1} / {steps.length}</span>

          {isLast ? (
            <button
              className="demo-nav-btn demo-nav-finish"
              onClick={handleClose}
              title="Cerrar demo"
            >
              <span>Cerrar</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : (
            <button
              className="demo-nav-btn demo-nav-next"
              onClick={goNext}
              title="Siguiente (→)"
            >
              <span>Siguiente</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Demo planes on the actual runways */}
      {type === 'race_condition' ? (
        <RaceConditionPlanes step={currentStep.id} demoData={demoData} />
      ) : (
        <DeadlockPlanes step={currentStep.id} coffmanVisible={coffmanVisible} demoData={demoData} />
      )}
    </>
  );
}

/* ─── Race Condition: Two planes on Runway A ─── */
function RaceConditionPlanes({ step, demoData }) {
  const aIsWinner = demoData.winner === demoData.planeA?.flightNumber;

  const planeAPos =
    step === 'intro'    ? 'demo-rc-a-start' :
    step === 'move'     ? 'demo-rc-a-move' :
    step === 'conflict' ? 'demo-rc-a-conflict' :
    aIsWinner           ? 'demo-rc-winner' : 'demo-rc-loser';

  const planeBPos =
    step === 'intro'    ? 'demo-rc-b-start' :
    step === 'move'     ? 'demo-rc-b-move' :
    step === 'conflict' ? 'demo-rc-b-conflict' :
    !aIsWinner          ? 'demo-rc-winner' : 'demo-rc-loser';

  const showLock = step === 'solution';
  const showConflict = step === 'conflict';

  return (
    <>
      <div className={`demo-plane-overlay ${planeAPos}`}>
        <PlaneIcon size={30} color="#1565c0" direction="right" />
        <span className="demo-plane-tag demo-plane-tag-a">
          Thread A — {demoData.planeA?.flightNumber || '?'}
        </span>
      </div>

      <div className={`demo-plane-overlay ${planeBPos}`}>
        <PlaneIcon size={30} color="#c62828" direction="right" />
        <span className="demo-plane-tag demo-plane-tag-b">
          Thread B — {demoData.planeB?.flightNumber || '?'}
        </span>
      </div>

      {showLock && <div className="demo-rc-lock lock-visible">🔒</div>}
      {showConflict && <div className="demo-rw-conflict" style={{ position: 'absolute', inset: 0, borderRadius: '6px', pointerEvents: 'none', zIndex: 505 }} />}
    </>
  );
}

/* ─── Deadlock: Plane A on runway, Plane B on terminal ─── */
function DeadlockPlanes({ step, coffmanVisible, demoData }) {
  const showArrows = step === 'wait' || step === 'coffman' || step === 'deadlock';
  const isLocked = step === 'deadlock';
  const isResolved = step === 'solution';

  return (
    <>
      <div className={`demo-plane-overlay demo-dl-runway-plane`}>
        <PlaneIcon size={30} color="#1565c0" direction="right" />
        <span className="demo-plane-tag demo-plane-tag-a">
          Avión A: {demoData.planeA?.flightNumber || '?'} (tiene Pista)
        </span>
      </div>

      <div className={`demo-plane-overlay demo-dl-gate-plane`}>
        <PlaneIcon size={30} color="#c62828" direction="right" />
        <span className="demo-plane-tag demo-plane-tag-b">
          Avión B: {demoData.planeB?.flightNumber || '?'} (tiene Puerta)
        </span>
      </div>

      <div className={`demo-dl-arrows ${showArrows ? 'arrows-visible' : ''}`}>
        <div className="demo-dl-arrow demo-dl-arrow-down">
          A necesita Puerta ━━━▶
        </div>
        <div className="demo-dl-arrow demo-dl-arrow-up">
          ◀━━━ B necesita Pista
        </div>
      </div>

      {(step === 'coffman' || step === 'deadlock' || step === 'solution') && (
        <div className="demo-coffman-overlay">
          {COFFMAN_LABELS.map((label, i) => (
            <div key={i} className={`coffman-chip ${coffmanVisible[i] ? 'chip-visible' : ''}`}>
              <span className="coffman-chip-check">✓</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {isLocked && (
        <div className="demo-rw-locked" style={{ position: 'absolute', inset: 0, borderRadius: '6px', pointerEvents: 'none', zIndex: 505 }} />
      )}
      {isResolved && (
        <div className="demo-rw-resolved" style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-md)', pointerEvents: 'none', zIndex: 505 }} />
      )}
    </>
  );
}
