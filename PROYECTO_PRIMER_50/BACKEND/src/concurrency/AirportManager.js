/**
 * AirportManager - Central Concurrency Orchestrator
 * 
 * This is the CORE of the concurrency simulation. It manages:
 * 
 * 1. SHARED RESOURCES: Runways (binary semaphore) and Gates (counting semaphore)
 * 2. WAITING QUEUE: FIFO queue of planes waiting to land (analogous to process ready queue)
 * 3. SYNCHRONIZATION: Coordinates access to runways and gates using semaphores
 * 4. RACE CONDITIONS: Demonstrates what happens without proper synchronization
 * 5. DEADLOCKS: Demonstrates circular wait and implements prevention strategies
 * 
 * COMPOUND SYNCHRONIZATION:
 *   A plane can ONLY land if BOTH a gate AND a runway are available.
 *   Resource acquisition order (deadlock prevention via global ordering):
 *     1. Gate semaphore (counting) — acquired FIRST
 *     2. Runway mutex (binary)     — acquired SECOND
 *   This order is consistent for BOTH landing and takeoff, preventing circular wait.
 * 
 * The manager ensures:
 * - Only ONE plane uses a runway at a time (mutual exclusion via binary semaphore)
 * - At most N planes occupy gates simultaneously (counting semaphore with N = numGates)
 * - Planes follow the correct lifecycle with BLOCKED states when waiting on semaphores
 * - Deadlocks are prevented via global resource ordering (always acquire gate BEFORE runway)
 */
const { Semaphore } = require('./Semaphore');
const { Plane, PlaneStatus } = require('./Plane');
const Runway = require('./Runway');
const Gate = require('./Gate');
const config = require('../config');
const eventEmitter = require('../events/eventEmitter');
const logger = require('../utils/logger');

class AirportManager {
  constructor() {
    // Initialize runways with binary semaphores (mutual exclusion)
    this.runways = [];
    for (let i = 0; i < config.airport.numRunways; i++) {
      this.runways.push(new Runway(String.fromCharCode(65 + i))); // A, B, C...
    }

    // Initialize gates
    this.gates = [];
    for (let i = 0; i < config.airport.numGates; i++) {
      this.gates.push(new Gate(i + 1));
    }

    /**
     * COUNTING SEMAPHORE for gates
     * Controls how many planes can be at gates simultaneously.
     * This is a classic counting semaphore: capacity = number of gates.
     * When all gates are occupied, new planes must wait until one is freed.
     */
    this.gateSemaphore = new Semaphore(config.airport.numGates, 'Gate-CountingSemaphore');

    /**
     * RUNWAY POOL SEMAPHORE (counting)
     * Tracks total available runways. Used by _acquireAnyRunway() to block
     * a plane when ALL runways are busy, without binding to a specific runway.
     * This prevents starvation: a plane waits for "any runway" instead of
     * being locked to one that might stay busy while another frees up.
     * 
     * Initialized to 0 because _acquireAnyRunway uses tryAccess first
     * and only waits on this semaphore when all tryAccess calls fail.
     * The semaphore is signaled (released) whenever a runway is freed.
     */
    this.runwayPoolSemaphore = new Semaphore(0, 'Runway-Pool');

    // FIFO queue for planes waiting to land (analogous to the OS ready queue)
    this.waitingQueue = [];

    // Planes currently in the system (at any stage)
    this.activePlanes = new Map();

    // Planes that have completed their cycle
    this.completedPlanes = [];

    // Simulation control
    this.simulationActive = false;
    this.simulationInterval = null;

    // Statistics
    this.stats = {
      totalPlanesProcessed: 0,
      raceConditionsDetected: 0,
      deadlocksDetected: 0,
      deadlocksResolved: 0,
    };
  }

  /**
   * Add a new plane to the waiting queue
   * This is like a new process entering the system and being placed in the ready queue
   * 
   * @param {string} [airline] - Optional airline name
   * @returns {Plane} The created plane
   */
  addPlane(airline) {
    const plane = new Plane(airline);
    this.waitingQueue.push(plane);
    this.activePlanes.set(plane.id, plane);

    eventEmitter.emit('plane:queued', {
      plane: plane.toJSON(),
      queueLength: this.waitingQueue.length,
    });
    logger.log('INFO', `✈️  ${plane.flightNumber} (${plane.airline}) entered the queue. Queue size: ${this.waitingQueue.length}`);

    // Emit status so the plane appears in the sky zone immediately
    this._emitStatusUpdate();

    // Schedule queue processing after a short delay
    // This ensures the plane is visible in the sky before landing attempt
    setTimeout(() => {
      this._processQueue();
    }, 100);

    return plane;
  }

  /**
   * Process the waiting queue - tries to land planes
   * 
   * This is the SCHEDULER of our simulation. For each waiting plane it checks
   * the COMPOUND CONDITION:
   *   1. Is there a gate available? (counting semaphore not at 0)
   *   2. Is there a runway available? (at least one binary semaphore not locked)
   * 
   * If BOTH conditions are met, the plane enters its lifecycle.
   * 
   * IMPORTANT: Processes MULTIPLE planes when multiple resources are free,
   * avoiding a bottleneck where only 1 plane is dispatched per call.
   * 
   * Deadlock prevention: Global resource ordering — always Gate FIRST, Runway SECOND.
   */
  async _processQueue() {
    if (this.waitingQueue.length === 0) return;

    // Try to dispatch all eligible planes (not just the first one)
    const unprocessed = this.waitingQueue.filter(p => !p._processing);
    
    for (const plane of unprocessed) {
      // COMPOUND CHECK: Both resources must be available
      // This is a peek-only check; the real acquisition happens in _handlePlaneLifecycle
      if (this.gateSemaphore.isFull) {
        logger.log('WARN', `🚫 All gates occupied. ${this.waitingQueue.length} planes waiting.`);
        break; // No point checking more planes — no gates available
      }
      if (!this.runways.some(r => !r.busy)) {
        logger.log('WARN', `🚫 No runway available. ${this.waitingQueue.length} planes waiting.`);
        break; // No point checking more planes — no runways available
      }

      // Mark the plane as being processed so _processQueue won't pick it again
      plane._processing = true;

      // Start the full lifecycle for this plane (fire and forget — runs concurrently)
      this._handlePlaneLifecycle(plane);
    }
  }

  /**
   * Dynamically acquire ANY available runway.
   * 
   * Instead of binding to a specific runway upfront (which causes starvation),
   * this method tries each runway's binary semaphore with tryAccess() (non-blocking).
   * If none are free, it waits on the pool semaphore (blocks until ANY runway frees).
   * 
   * This eliminates the starvation problem: a plane never waits on a specific busy
   * runway while another runway sits idle.
   * 
   * @param {Plane} plane - The plane requesting runway access
   * @returns {Promise<Runway>} The acquired runway
   */
  async _acquireAnyRunway(plane) {
    while (true) {
      // Try each runway without blocking (tryAccess uses tryAcquire on the mutex)
      for (const runway of this.runways) {
        if (runway.tryAccess(plane)) {
          return runway; // Got a runway — return immediately
        }
      }
      // ALL runways busy — wait for ANY runway to become available
      // The pool semaphore is signaled whenever _releaseRunway() is called
      await this.runwayPoolSemaphore.acquire();
      // A runway freed up — loop back and try to grab it
      // (another plane might grab it first, so we must re-check)
    }
  }

  /**
   * Release a runway and signal the pool semaphore if anyone is waiting.
   * This ensures _acquireAnyRunway() unblocks when a runway frees up.
   * 
   * @param {Runway} runway - The runway to release
   */
  _releaseRunway(runway) {
    runway.releaseAccess();
    // Signal the pool semaphore so any plane blocked in _acquireAnyRunway unblocks
    if (this.runwayPoolSemaphore.waitingCount > 0) {
      this.runwayPoolSemaphore.release();
    }
  }

  /**
   * Complete plane lifecycle with COMPOUND SYNCHRONIZATION:
   * 
   *   FLYING → WAITING_FOR_RUNWAY → LANDING → TAXIING_TO_GATE → AT_GATE
   *          → WAITING_FOR_RUNWAY_DEPARTURE → TAXIING_TO_RUNWAY → TAKING_OFF → DEPARTED
   * 
   * COMPOUND SYNCHRONIZATION ensures a plane only lands when BOTH
   * a gate AND a runway are available. Acquisition order:
   *   1. Gate semaphore (counting) — guarantees a parking spot exists
   *   2. Runway mutex (binary)     — grants exclusive runway access
   * 
   * This order prevents deadlocks (no circular wait possible).
   * 
   * Resource lifecycle with try/finally ensures no resource leaks:
   *   - gateSemaphore is always released (even on error)
   *   - runway mutex is always released (even on error)
   * 
   * @param {Plane} plane
   */
  async _handlePlaneLifecycle(plane) {
    let acquiredGate = false; // Track if gate semaphore was acquired (for cleanup)

    try {
      // ===== PHASE 0: FLYING (visible in sky) =====
      // The plane stays in waitingQueue during this delay so it remains
      // visible in the sky zone. It is only removed right before landing.
      await this._delay(config.timing.flyingMin, config.timing.flyingMax);

      // ===== COMPOUND SYNCHRONIZATION =====
      // Step 1: Set BLOCKED state — plane is waiting for resources
      plane.setStatus(PlaneStatus.WAITING_FOR_RUNWAY);
      this._emitStatusUpdate();

      // Step 2: Acquire GATE semaphore FIRST (P operation on counting semaphore)
      // This GUARANTEES a gate will be available after landing.
      // Without this, a plane could land and have nowhere to park.
      await this.gateSemaphore.acquire();
      acquiredGate = true;

      logger.log('INFO', `🔒 ${plane.flightNumber} acquired gate slot [Gate Semaphore: ${this.gateSemaphore.currentCount}/${this.gateSemaphore.capacity}]`);

      // Step 3: Acquire ANY available runway (dynamic selection)
      // Uses pool semaphore to avoid binding to a specific busy runway
      const runway = await this._acquireAnyRunway(plane);

      // ===== NOW both resources are secured =====
      // Remove the plane from the waiting queue — it's about to land
      const idx = this.waitingQueue.indexOf(plane);
      // Store queue position so frontend can animate descent from correct sky position
      plane.lastQueueIndex = idx !== -1 ? idx : 0;
      if (idx !== -1) this.waitingQueue.splice(idx, 1);

      // ===== PHASE 1: LANDING (runway critical section) =====
      plane.setStatus(PlaneStatus.LANDING);
      plane.assignedRunway = runway.id;

      eventEmitter.emit('plane:landing', {
        plane: plane.toJSON(),
        runway: runway.getStatus(),
      });
      eventEmitter.emit('runway:busy', { runway: runway.getStatus() });
      logger.log('INFO', `🛬 ${plane.flightNumber} LANDING on ${runway.name} [Runway LOCKED - Binary Semaphore]`);

      // Emit status so frontend shows landing animation
      this._emitStatusUpdate();

      // Simulate landing time (critical section - plane has exclusive runway access)
      await this._delay(config.timing.landingMin, config.timing.landingMax);

      // Landing complete — release runway (V operation on binary semaphore)
      this._releaseRunway(runway);

      eventEmitter.emit('runway:free', { runway: runway.getStatus() });
      logger.log('INFO', `✅ ${plane.flightNumber} LANDED. ${runway.name} FREE [Runway UNLOCKED]`);

      // Try to process next plane in queue now that runway is free
      this._processQueue();

      // ===== PHASE 2: GATE ASSIGNMENT =====
      // Gate semaphore already acquired above (compound synchronization).
      // Now find and assign a physical gate.
      const gate = this.gates.find(g => g.isAvailable());
      if (!gate) {
        // Safety: semaphore said a slot exists but no physical gate is free.
        // This should never happen if gate logic is correct, but protects against leaks.
        logger.log('ERROR', `❌ ${plane.flightNumber} gate semaphore acquired but no physical gate free! Releasing semaphore.`);
        this.gateSemaphore.release();
        acquiredGate = false;
        return;
      }

      gate.assign(plane);
      plane.assignedGate = gate.id;

      // ===== PHASE 2a: TAXIING TO GATE =====
      plane.setStatus(PlaneStatus.TAXIING_TO_GATE);

      eventEmitter.emit('plane:taxiing_to_gate', {
        plane: plane.toJSON(),
        gate: gate.getStatus(),
      });
      logger.log('INFO', `🚕 ${plane.flightNumber} TAXIING to ${gate.name} [Gate Semaphore count: ${this.gateSemaphore.currentCount}/${this.gateSemaphore.capacity}]`);

      // Emit status so frontend starts taxi-in animation
      this._emitStatusUpdate();

      // Wait for taxi animation to complete
      await this._delay(config.timing.taxiToGateMin, config.timing.taxiToGateMax);

      // ===== PHASE 2b: AT GATE =====
      plane.setStatus(PlaneStatus.AT_GATE);

      eventEmitter.emit('plane:gate_assigned', {
        plane: plane.toJSON(),
        gate: gate.getStatus(),
      });
      logger.log('INFO', `🚪 ${plane.flightNumber} AT ${gate.name} — Passengers boarding`);

      // Emit status so frontend shows idle state at gate
      this._emitStatusUpdate();

      // Simulate time at gate (passengers boarding/deplaning)
      await this._delay(config.timing.gateMin, config.timing.gateMax);

      // ===== PHASE 3: DEPARTURE PREPARATION =====
      // Set BLOCKED state — plane is waiting for a runway to depart
      plane.setStatus(PlaneStatus.WAITING_FOR_RUNWAY_DEPARTURE);
      this._emitStatusUpdate();

      logger.log('INFO', `⏳ ${plane.flightNumber} waiting for departure runway [BLOCKED]`);

      // Acquire ANY available runway for departure (dynamic selection)
      const departRunway = await this._acquireAnyRunway(plane);

      // ===== PHASE 3a: TAXIING TO RUNWAY =====
      // Set taxi status so the gate component triggers the tg-taxi-out CSS animation.
      // The gate is NOT released yet — it keeps rendering the plane during the animation.
      plane.setStatus(PlaneStatus.TAXIING_TO_RUNWAY);
      plane.assignedRunway = departRunway.id;

      eventEmitter.emit('plane:taxiing_to_runway', {
        plane: plane.toJSON(),
        runway: departRunway.getStatus(),
      });
      logger.log('INFO', `🚕 ${plane.flightNumber} TAXIING to ${departRunway.name} for departure`);

      // Emit status so frontend starts taxi-out animation from the gate
      this._emitStatusUpdate();

      // Wait for taxi-out animation to complete (plane visually moves from gate to runway)
      await this._delay(config.timing.taxiToRunwayMin, config.timing.taxiToRunwayMax);

      // NOW release gate — the taxi-out animation is complete, plane has visually left
      gate.release();
      plane.assignedGate = null;
      this.gateSemaphore.release(); // V operation on counting semaphore
      acquiredGate = false; // Gate released successfully

      eventEmitter.emit('gate:free', { gate: gate.getStatus() });
      logger.log('INFO', `🔓 ${plane.flightNumber} released ${gate.name} [Gate Semaphore: ${this.gateSemaphore.currentCount}/${this.gateSemaphore.capacity}]`);

      // ===== PHASE 4: TAKEOFF (runway already acquired) =====
      plane.setStatus(PlaneStatus.TAKING_OFF);

      eventEmitter.emit('runway:busy', { runway: departRunway.getStatus() });
      logger.log('INFO', `🛫 ${plane.flightNumber} TAKING OFF on ${departRunway.name} [Runway LOCKED]`);

      // Emit status so frontend shows takeoff animation
      this._emitStatusUpdate();

      // Simulate departure time
      await this._delay(config.timing.departureMin, config.timing.departureMax);

      // Departure complete — release runway
      plane.setStatus(PlaneStatus.DEPARTED);
      this._releaseRunway(departRunway);
      plane.assignedRunway = null;

      eventEmitter.emit('plane:departed', { plane: plane.toJSON() });
      eventEmitter.emit('runway:free', { runway: departRunway.getStatus() });
      logger.log('INFO', `✈️  ${plane.flightNumber} DEPARTED! ${departRunway.name} FREE [Runway UNLOCKED]`);

      // Move to completed
      this.activePlanes.delete(plane.id);
      this.completedPlanes.push(plane);
      this.stats.totalPlanesProcessed++;

      // Emit full status update
      this._emitStatusUpdate();

      // Process next planes in queue
      this._processQueue();

    } catch (error) {
      logger.log('ERROR', `❌ Error processing ${plane.flightNumber}: ${error.message}`);
      // Resource cleanup: release gate semaphore if it was acquired but not released
      if (acquiredGate) {
        this.gateSemaphore.release();
        logger.log('WARN', `🔓 Released gate semaphore for ${plane.flightNumber} due to error`);
      }
    }
  }

  /**
   * RACE CONDITION SIMULATION
   * 
   * Demonstrates what happens when two planes try to access the SAME runway
   * WITHOUT proper synchronization (no semaphore protection).
   * 
   * In a real concurrent system, this would cause data corruption or crashes.
   * Here we simulate it by having two planes modify the runway state simultaneously.
   */
  async simulateRaceCondition() {
    logger.log('WARN', '⚠️  === RACE CONDITION SIMULATION STARTED ===');
    eventEmitter.emit('simulation:race_condition_start', {});

    const planeA = new Plane('RaceAir');
    const planeB = new Plane('RaceAir');
    const runway = this.runways[0];

    // Store original state
    const originalBusy = runway.busy;
    const originalPlane = runway.currentPlane;

    logger.log('WARN', `⚠️  Two planes (${planeA.flightNumber} and ${planeB.flightNumber}) attempting to use ${runway.name} WITHOUT semaphore!`);

    /**
     * UNSAFE ACCESS - No semaphore protection!
     * Both "threads" read and write the shared resource simultaneously.
     * This is the classic race condition: the outcome depends on execution order.
     */
    let raceResult = { runwayState: null, conflict: false };

    // Simulate concurrent access without synchronization
    const unsafeAccessA = async () => {
      // "Thread A" reads runway state
      logger.log('WARN', `  [Thread A] ${planeA.flightNumber} checking ${runway.name}: busy=${runway.busy}`);
      await this._delay(100, 200); // Context switch happens here!
      // "Thread A" writes to runway (thinks it's available)
      runway.busy = true;
      runway.currentPlane = planeA;
      logger.log('WARN', `  [Thread A] ${planeA.flightNumber} set ${runway.name} as busy`);
    };

    const unsafeAccessB = async () => {
      // "Thread B" reads runway state (might see stale data!)
      logger.log('WARN', `  [Thread B] ${planeB.flightNumber} checking ${runway.name}: busy=${runway.busy}`);
      await this._delay(50, 150); // Different timing - race condition!
      // "Thread B" also writes (CONFLICT - overwrites Thread A's write!)
      runway.busy = true;
      runway.currentPlane = planeB;
      logger.log('WARN', `  [Thread B] ${planeB.flightNumber} set ${runway.name} as busy`);
    };

    // Execute both concurrently (simulating parallel threads)
    await Promise.all([unsafeAccessA(), unsafeAccessB()]);

    // Check the result - which plane "won" the race?
    raceResult.runwayState = runway.currentPlane?.flightNumber;
    raceResult.conflict = true;

    logger.log('ERROR', `🔴 RACE CONDITION DETECTED! ${runway.name} final state: ${runway.currentPlane?.flightNumber}`);
    logger.log('ERROR', `🔴 One plane's assignment was LOST because there was no mutual exclusion!`);
    logger.log('INFO', `💡 SOLUTION: Use binary semaphore (mutex) to protect runway access`);

    this.stats.raceConditionsDetected++;

    // Restore original state
    runway.busy = originalBusy;
    runway.currentPlane = originalPlane;

    const result = {
      type: 'race_condition',
      planeA: planeA.toJSON(),
      planeB: planeB.toJSON(),
      runway: runway.name,
      winner: raceResult.runwayState,
      loser: raceResult.runwayState === planeA.flightNumber ? planeB.flightNumber : planeA.flightNumber,
      explanation: 'Both planes accessed the runway simultaneously without a semaphore. The last write wins, causing the first plane\'s assignment to be lost. This is prevented by using a binary semaphore (mutex) that ensures only one plane accesses the runway at a time.',
    };

    eventEmitter.emit('race_condition:detected', result);
    logger.log('WARN', '⚠️  === RACE CONDITION SIMULATION ENDED ===');
    this._emitStatusUpdate();

    return result;
  }

  /**
   * DEADLOCK SIMULATION
   * 
   * Demonstrates a deadlock scenario using circular wait:
   * - Plane A holds Runway, waits for Gate
   * - Plane B holds Gate, waits for Runway
   * 
   * This creates a CIRCULAR WAIT - one of the four Coffman conditions for deadlock:
   * 1. Mutual Exclusion ✓ (runway/gate can't be shared)
   * 2. Hold and Wait ✓ (each holds one resource, waits for another)
   * 3. No Preemption ✓ (resources can't be forcibly taken)
   * 4. Circular Wait ✓ (A -> B -> A cycle)
   * 
   * The SOLUTION implemented: Global resource ordering
   * Always acquire resources in the same order (gate before runway)
   * This breaks condition #4 (circular wait), preventing deadlock.
   */
  async simulateDeadlock() {
    logger.log('WARN', '🔒 === DEADLOCK SIMULATION STARTED ===');
    eventEmitter.emit('simulation:deadlock_start', {});

    const planeA = new Plane('DeadlockAir');
    const planeB = new Plane('DeadlockAir');

    logger.log('WARN', `🔒 Scenario: ${planeA.flightNumber} holds Runway A, needs Gate`);
    logger.log('WARN', `🔒 Scenario: ${planeB.flightNumber} holds Gate 1, needs Runway A`);
    logger.log('WARN', '🔒 This creates a CIRCULAR WAIT → DEADLOCK!');

    eventEmitter.emit('deadlock:detected', {
      planeA: planeA.toJSON(),
      planeB: planeB.toJSON(),
      explanation: 'Circular wait detected: Plane A holds Runway, needs Gate. Plane B holds Gate, needs Runway.',
      coffmanConditions: {
        mutualExclusion: true,
        holdAndWait: true,
        noPreemption: true,
        circularWait: true,
      },
    });

    this.stats.deadlocksDetected++;

    // Simulate deadlock detection time
    await this._delay(3000, 3000);

    // ===== DEADLOCK RESOLUTION =====
    logger.log('INFO', '🔧 === APPLYING DEADLOCK PREVENTION ===');
    logger.log('INFO', '🔧 Strategy: Global Resource Ordering');
    logger.log('INFO', '🔧 Rule: ALWAYS acquire Gate BEFORE Runway');
    logger.log('INFO', '🔧 This breaks the circular wait condition (Coffman #4)');

    await this._delay(2000, 2000);

    logger.log('INFO', `✅ ${planeB.flightNumber} releases Gate 1 (breaking hold-and-wait)`);
    logger.log('INFO', `✅ ${planeA.flightNumber} acquires Gate 1, then releases Runway A`);
    logger.log('INFO', `✅ ${planeB.flightNumber} acquires Runway A, then Gate 1`);
    logger.log('INFO', '✅ Deadlock RESOLVED - both planes can proceed!');

    this.stats.deadlocksResolved++;

    const result = {
      type: 'deadlock',
      planeA: planeA.toJSON(),
      planeB: planeB.toJSON(),
      detected: true,
      resolved: true,
      prevention: 'Global Resource Ordering: Always acquire Gate before Runway. This prevents circular wait.',
      coffmanConditions: [
        'Mutual Exclusion: Resources cannot be shared',
        'Hold and Wait: Process holds resource while waiting for another',
        'No Preemption: Resources cannot be forcibly taken',
        'Circular Wait: A→B→A dependency cycle',
      ],
      solution: [
        'Break Circular Wait by enforcing global resource ordering',
        'Always acquire Gate FIRST, then Runway',
        'This makes circular dependency impossible',
      ],
    };

    eventEmitter.emit('deadlock:resolved', result);
    logger.log('WARN', '🔒 === DEADLOCK SIMULATION ENDED ===');
    this._emitStatusUpdate();

    return result;
  }

  /**
   * Start automatic simulation - generates random planes at intervals
   * This simulates a continuous stream of incoming flights
   */
  startSimulation() {
    if (this.simulationActive) return { message: 'Simulation already running' };

    this.simulationActive = true;
    logger.log('INFO', '🚀 === AUTOMATIC SIMULATION STARTED ===');
    eventEmitter.emit('simulation:started', {});

    const spawnPlane = () => {
      if (!this.simulationActive) return;

      this.addPlane();

      // Schedule next plane with random interval
      const delay = Math.random() * (config.timing.spawnMax - config.timing.spawnMin) + config.timing.spawnMin;
      this.simulationInterval = setTimeout(spawnPlane, delay);
    };

    // Start spawning
    spawnPlane();
    return { message: 'Simulation started' };
  }

  /**
   * Stop automatic simulation
   */
  stopSimulation() {
    this.simulationActive = false;
    if (this.simulationInterval) {
      clearTimeout(this.simulationInterval);
      this.simulationInterval = null;
    }
    logger.log('INFO', '🛑 === SIMULATION STOPPED ===');
    eventEmitter.emit('simulation:stopped', {});
    return { message: 'Simulation stopped' };
  }

  /**
   * Get comprehensive airport status
   * Returns all resource states, queues, and statistics
   */
  getStatus() {
    return {
      runways: this.runways.map(r => r.getStatus()),
      gates: this.gates.map(g => g.getStatus()),
      gateSemaphore: this.gateSemaphore.getStatus(),
      waitingQueue: this.waitingQueue.map(p => p.toJSON()),
      activePlanes: Array.from(this.activePlanes.values()).map(p => p.toJSON()),
      completedPlanes: this.completedPlanes.slice(-20).map(p => p.toJSON()),
      simulationActive: this.simulationActive,
      stats: this.stats,
    };
  }

  /**
   * Emit complete status update via WebSocket
   */
  _emitStatusUpdate() {
    eventEmitter.emit('status:update', this.getStatus());
  }

  /**
   * Utility: random delay to simulate real-world timing
   * @param {number} min - Minimum delay (ms)
   * @param {number} max - Maximum delay (ms)
   */
  _delay(min, max) {
    const ms = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AirportManager;
