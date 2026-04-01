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
const PlaneStatus = {
  WAITING: 'waiting',       // In queue - like a thread in the "ready" queue
  LANDING: 'landing',       // Using runway to land - "running" state
  LANDED: 'landed',         // Landed, waiting for gate - "waiting" state
  AT_GATE: 'at_gate',       // Parked at gate - "running" with gate resource
  DEPARTING: 'departing',   // Using runway to depart - "running" state
  DEPARTED: 'departed',     // Completed lifecycle - "terminated" state
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
    this.status = PlaneStatus.WAITING;
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
    if (newStatus === PlaneStatus.LANDED) {
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
    };
  }
}

module.exports = { Plane, PlaneStatus };
