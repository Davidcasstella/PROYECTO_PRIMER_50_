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
 * The manager ensures:
 * - Only ONE plane uses a runway at a time (mutual exclusion via binary semaphore)
 * - At most N planes occupy gates simultaneously (counting semaphore with N = numGates)
 * - Planes follow the correct lifecycle: queue -> land -> gate -> depart
 * - Deadlocks are prevented via global resource ordering (always acquire runway BEFORE gate)
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

    // Trigger processing of the queue
    this._processQueue();

    return plane;
  }

  /**
   * Process the waiting queue - tries to land the next plane
   * 
   * This is the SCHEDULER of our simulation. It checks:
   * 1. Is there a plane waiting? (queue not empty)
   * 2. Is there a runway available? (binary semaphore not locked)
   * 3. Is there a gate available? (counting semaphore not at 0)
   * 
   * IMPORTANT: We use global resource ordering to prevent deadlocks.
   * The order is always: runway FIRST, then gate.
   * This prevents circular wait (Coffman condition #4).
   */
  async _processQueue() {
    if (this.waitingQueue.length === 0) return;

    // Find an available runway
    const availableRunway = this.runways.find(r => !r.busy);
    if (!availableRunway) {
      logger.log('WARN', `🚫 No runway available. ${this.waitingQueue.length} planes waiting.`);
      return;
    }

    // Check if any gate will be available (counting semaphore)
    if (this.gateSemaphore.isFull) {
      logger.log('WARN', `🚫 All gates occupied. ${this.waitingQueue.length} planes waiting.`);
      return;
    }

    // Dequeue the next plane (FIFO - First In, First Out)
    const plane = this.waitingQueue.shift();
    if (!plane) return;

    // Start the full landing -> gate -> departure cycle for this plane
    this._handlePlaneLifecycle(plane, availableRunway);
  }

  /**
   * Complete plane lifecycle: landing -> gate -> departure
   * 
   * This method represents the full "thread execution" for a plane.
   * Each step involves acquiring and releasing shared resources through semaphores.
   * 
   * Resource ordering (deadlock prevention):
   * 1. Acquire RUNWAY (binary semaphore - P operation)
   * 2. Land (critical section)
   * 3. Release RUNWAY (V operation)
   * 4. Acquire GATE (counting semaphore - P operation)
   * 5. Stay at gate (critical section)
   * 6. Acquire RUNWAY again for departure (P operation)
   * 7. Release GATE (V operation)
   * 8. Depart (critical section)
   * 9. Release RUNWAY (V operation)
   * 
   * @param {Plane} plane
   * @param {Runway} runway
   */
  async _handlePlaneLifecycle(plane, runway) {
    try {
      // ===== PHASE 1: LANDING (requires runway - binary semaphore) =====
      
      // Acquire runway mutex (P operation on binary semaphore)
      plane.setStatus(PlaneStatus.LANDING);
      plane.assignedRunway = runway.id;
      await runway.requestAccess(plane);

      eventEmitter.emit('plane:landing', {
        plane: plane.toJSON(),
        runway: runway.getStatus(),
      });
      eventEmitter.emit('runway:busy', { runway: runway.getStatus() });
      logger.log('INFO', `🛬 ${plane.flightNumber} LANDING on ${runway.name} [Runway LOCKED - Binary Semaphore]`);

      // Simulate landing time (critical section - plane has exclusive runway access)
      await this._delay(config.timing.landingMin, config.timing.landingMax);

      // Landing complete
      plane.setStatus(PlaneStatus.LANDED);

      // Release runway (V operation on binary semaphore)
      runway.releaseAccess();
      plane.assignedRunway = null;

      eventEmitter.emit('plane:landed', { plane: plane.toJSON() });
      eventEmitter.emit('runway:free', { runway: runway.getStatus() });
      logger.log('INFO', `✅ ${plane.flightNumber} LANDED. ${runway.name} FREE [Runway UNLOCKED]`);

      // Try to process next plane in queue now that runway is free
      this._processQueue();

      // ===== PHASE 2: GATE ASSIGNMENT (requires gate - counting semaphore) =====
      
      // Acquire gate slot (P operation on counting semaphore)
      await this.gateSemaphore.acquire();

      // Find and assign a free gate
      const gate = this.gates.find(g => g.isAvailable());
      if (gate) {
        gate.assign(plane);
        plane.setStatus(PlaneStatus.AT_GATE);
        plane.assignedGate = gate.id;

        eventEmitter.emit('plane:gate_assigned', {
          plane: plane.toJSON(),
          gate: gate.getStatus(),
        });
        logger.log('INFO', `🚪 ${plane.flightNumber} assigned to ${gate.name} [Gate Semaphore count: ${this.gateSemaphore.currentCount}/${this.gateSemaphore.capacity}]`);

        // Simulate time at gate (passengers boarding/deplaning)
        await this._delay(config.timing.gateMin, config.timing.gateMax);

        // ===== PHASE 3: DEPARTURE (requires runway again) =====
        
        // Find available runway for departure
        const departRunway = this.runways.find(r => !r.busy) || this.runways[0];

        plane.setStatus(PlaneStatus.DEPARTING);
        plane.assignedRunway = departRunway.id;

        // Acquire runway for departure (P operation on binary semaphore)
        await departRunway.requestAccess(plane);

        // Release gate AFTER acquiring runway (ordered release)
        gate.release();
        plane.assignedGate = null;
        this.gateSemaphore.release(); // V operation on counting semaphore

        eventEmitter.emit('gate:free', { gate: gate.getStatus() });
        eventEmitter.emit('runway:busy', { runway: departRunway.getStatus() });
        logger.log('INFO', `🛫 ${plane.flightNumber} DEPARTING on ${departRunway.name} [Runway LOCKED]`);

        // Simulate departure time
        await this._delay(config.timing.departureMin, config.timing.departureMax);

        // Departure complete
        plane.setStatus(PlaneStatus.DEPARTED);
        departRunway.releaseAccess();
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

        // Process next plane in queue
        this._processQueue();
      }
    } catch (error) {
      logger.log('ERROR', `❌ Error processing ${plane.flightNumber}: ${error.message}`);
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
   * Always acquire resources in the same order (runway before gate)
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
    logger.log('INFO', '🔧 Rule: ALWAYS acquire Runway BEFORE Gate');
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
      prevention: 'Global Resource Ordering: Always acquire Runway before Gate. This prevents circular wait.',
      coffmanConditions: [
        'Mutual Exclusion: Resources cannot be shared',
        'Hold and Wait: Process holds resource while waiting for another',
        'No Preemption: Resources cannot be forcibly taken',
        'Circular Wait: A→B→A dependency cycle',
      ],
      solution: [
        'Break Circular Wait by enforcing global resource ordering',
        'Always acquire Runway FIRST, then Gate',
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
