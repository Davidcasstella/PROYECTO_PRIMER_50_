/**
 * Plane Entity
 * 
 * Represents an airplane in the simulation. Each plane acts as a simulated thread
 * that goes through a lifecycle: WAITING -> LANDING -> LANDED -> AT_GATE -> DEPARTING -> DEPARTED
 * 
 * In a real OS, each plane would be a separate thread/process competing for shared resources.
 * Here we simulate this using async/await, where each plane's operations are non-blocking
 * and coordinated through semaphores managed by the AirportManager.
 */
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Possible plane states - mirrors thread states in an OS (ready, running, waiting, terminated)
// Includes BLOCKED states for when a thread waits on a semaphore (P operation)
const PlaneStatus = {
  FLYING: 'flying',                                     // In queue, circling in sky - "ready" queue
  WAITING_FOR_RUNWAY: 'waiting_for_runway',             // BLOCKED - waiting for runway semaphore (P)
  LANDING: 'landing',                                   // RUNNING - using runway (critical section)
  TAXIING_TO_GATE: 'taxiing_to_gate',                   // TRANSITIONING - runway→gate movement
  AT_GATE: 'at_gate',                                   // RUNNING - at gate (critical section)
  WAITING_FOR_RUNWAY_DEPARTURE: 'waiting_for_runway_departure', // BLOCKED - waiting for departure runway
  TAXIING_TO_RUNWAY: 'taxiing_to_runway',               // TRANSITIONING - gate→runway movement
  TAKING_OFF: 'taking_off',                             // RUNNING - using runway (critical section)
  DEPARTED: 'departed',                                 // TERMINATED - lifecycle complete
};

class Plane {
  /**
   * @param {string} [airline] - Airline name (random if not provided)
   * @param {string} [id] - Unique identifier (auto-generated if not provided)
   */
  constructor(airline, id) {
    this.id = id || uuidv4().substring(0, 8).toUpperCase();
    this.airline = airline || config.airlines[Math.floor(Math.random() * config.airlines.length)];
    this.flightNumber = `${this.airline.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`;
    this.status = PlaneStatus.FLYING;
    this.assignedRunway = null;
    this.assignedGate = null;
    this.createdAt = Date.now();
    this.landedAt = null;
    this.departedAt = null;
  }

  /**
   * Update plane status - represents a state transition in the thread lifecycle
   * @param {string} newStatus - Target status
   */
  setStatus(newStatus) {
    this.status = newStatus;
    if (newStatus === PlaneStatus.AT_GATE) {
      this.landedAt = Date.now();
    } else if (newStatus === PlaneStatus.DEPARTED) {
      this.departedAt = Date.now();
    }
  }

  /**
   * Serializable representation for API/WebSocket transmission
   */
  toJSON() {
    return {
      id: this.id,
      airline: this.airline,
      flightNumber: this.flightNumber,
      status: this.status,
      assignedRunway: this.assignedRunway,
      assignedGate: this.assignedGate,
      createdAt: this.createdAt,
      landedAt: this.landedAt,
      departedAt: this.departedAt,
      lastQueueIndex: this.lastQueueIndex ?? 0,
    };
  }
}

module.exports = { Plane, PlaneStatus };
