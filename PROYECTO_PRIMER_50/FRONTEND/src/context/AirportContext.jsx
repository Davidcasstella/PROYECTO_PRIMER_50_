/**
 * AirportContext - Global State Provider
 * 
 * Manages the global airport state using React Context API.
 * Subscribes to WebSocket events for real-time updates.
 * Provides actions (addPlane, startSimulation, etc.) to all children.
 */
import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import socket from '../services/socket';
import api from '../services/api';

export const AirportContext = createContext(null);

const MAX_LOGS = 200;

export function AirportProvider({ children }) {
  // Airport state
  const [status, setStatus] = useState({
    runways: [],
    gates: [],
    gateSemaphore: null,
    waitingQueue: [],
    activePlanes: [],
    completedPlanes: [],
    simulationActive: false,
    stats: { totalPlanesProcessed: 0, raceConditionsDetected: 0, deadlocksDetected: 0, deadlocksResolved: 0 },
  });

  // Real-time logs
  const [logs, setLogs] = useState([]);

  // Socket connection state
  const [connected, setConnected] = useState(socket.connected);

  // Loading states
  const [loading, setLoading] = useState(false);

  // Ref to avoid stale closures in socket handlers
  const logsRef = useRef(logs);
  logsRef.current = logs;

  /**
   * Add a log entry
   */
  const addLog = useCallback((level, message, data) => {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
    setLogs(prev => {
      const updated = [...prev, entry];
      return updated.length > MAX_LOGS ? updated.slice(-MAX_LOGS) : updated;
    });
  }, []);

  /**
   * Subscribe to all WebSocket events
   */
  useEffect(() => {
    // Connection events
    const onConnect = () => {
      setConnected(true);
      addLog('INFO', 'Connected to airport server');
    };
    const onDisconnect = () => {
      setConnected(false);
      addLog('WARN', 'Disconnected from server');
    };

    // Status update - full state refresh
    const onStatusUpdate = (data) => {
      setStatus(data);
    };

    // Individual events for logging
    const onPlaneQueued = (data) => {
      addLog('INFO', `[QUEUE] ${data.plane.flightNumber} (${data.plane.airline}) entered queue. Queue: ${data.queueLength}`);
    };
    const onPlaneLanding = (data) => {
      addLog('INFO', `[LANDING] ${data.plane.flightNumber} LANDING on ${data.runway.name}`);
    };
    const onPlaneLanded = (data) => {
      addLog('INFO', `[LANDED] ${data.plane.flightNumber} LANDED`);
    };
    const onPlaneGateAssigned = (data) => {
      addLog('INFO', `[GATE] ${data.plane.flightNumber} -> ${data.gate.name}`);
    };
    const onPlaneDeparting = (data) => {
      addLog('INFO', `[DEPART] ${data.plane?.flightNumber || 'Plane'} DEPARTING`);
    };
    const onPlaneDeparted = (data) => {
      addLog('INFO', `[DEPARTED] ${data.plane.flightNumber} DEPARTED`);
    };
    const onRunwayBusy = (data) => {
      addLog('WARN', `${data.runway.name} LOCKED [Binary Semaphore]`);
    };
    const onRunwayFree = (data) => {
      addLog('INFO', `${data.runway.name} FREE [Semaphore Released]`);
    };
    const onGateFree = (data) => {
      addLog('INFO', `${data.gate.name} FREE [Gate Semaphore Released]`);
    };
    const onRaceCondition = (data) => {
      addLog('ERROR', `RACE CONDITION: ${data.winner} won, ${data.loser} lost!`);
    };
    const onDeadlockDetected = (data) => {
      addLog('ERROR', `DEADLOCK DETECTED: Circular wait between planes`);
    };
    const onDeadlockResolved = (data) => {
      addLog('INFO', `DEADLOCK RESOLVED via Global Resource Ordering`);
    };
    const onSimulationStarted = () => {
      addLog('INFO', 'Automatic simulation STARTED');
    };
    const onSimulationStopped = () => {
      addLog('INFO', 'Simulation STOPPED');
    };

    // Register all listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('status:update', onStatusUpdate);
    socket.on('plane:queued', onPlaneQueued);
    socket.on('plane:landing', onPlaneLanding);
    socket.on('plane:landed', onPlaneLanded);
    socket.on('plane:gate_assigned', onPlaneGateAssigned);
    socket.on('plane:departing', onPlaneDeparting);
    socket.on('plane:departed', onPlaneDeparted);
    socket.on('runway:busy', onRunwayBusy);
    socket.on('runway:free', onRunwayFree);
    socket.on('gate:free', onGateFree);
    socket.on('race_condition:detected', onRaceCondition);
    socket.on('deadlock:detected', onDeadlockDetected);
    socket.on('deadlock:resolved', onDeadlockResolved);
    socket.on('simulation:started', onSimulationStarted);
    socket.on('simulation:stopped', onSimulationStopped);

    // Cleanup on unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('status:update', onStatusUpdate);
      socket.off('plane:queued', onPlaneQueued);
      socket.off('plane:landing', onPlaneLanding);
      socket.off('plane:landed', onPlaneLanded);
      socket.off('plane:gate_assigned', onPlaneGateAssigned);
      socket.off('plane:departing', onPlaneDeparting);
      socket.off('plane:departed', onPlaneDeparted);
      socket.off('runway:busy', onRunwayBusy);
      socket.off('runway:free', onRunwayFree);
      socket.off('gate:free', onGateFree);
      socket.off('race_condition:detected', onRaceCondition);
      socket.off('deadlock:detected', onDeadlockDetected);
      socket.off('deadlock:resolved', onDeadlockResolved);
      socket.off('simulation:started', onSimulationStarted);
      socket.off('simulation:stopped', onSimulationStopped);
    };
  }, [addLog]);

  // Fetch initial status
  useEffect(() => {
    api.getStatus().then(res => {
      if (res.success) setStatus(res.data);
    }).catch(() => {});
  }, []);

  // ===== ACTIONS =====

  const addPlane = useCallback(async (airline) => {
    setLoading(true);
    try {
      await api.addPlane(airline);
    } finally {
      setLoading(false);
    }
  }, []);

  const startSimulation = useCallback(async () => {
    await api.startSimulation();
  }, []);

  const stopSimulation = useCallback(async () => {
    await api.stopSimulation();
  }, []);

  const simulateRaceCondition = useCallback(async () => {
    setLoading(true);
    try {
      await api.simulateRaceCondition();
    } finally {
      setLoading(false);
    }
  }, []);

  const simulateDeadlock = useCallback(async () => {
    setLoading(true);
    try {
      await api.simulateDeadlock();
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const value = {
    status,
    logs,
    connected,
    loading,
    addPlane,
    startSimulation,
    stopSimulation,
    simulateRaceCondition,
    simulateDeadlock,
    clearLogs,
  };

  return (
    <AirportContext.Provider value={value}>
      {children}
    </AirportContext.Provider>
  );
}
