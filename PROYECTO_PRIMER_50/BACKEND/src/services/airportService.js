/**
 * Airport Service
 * 
 * Business logic layer - sits between controllers and the concurrency model.
 * Provides a clean API for airport operations.
 */
const airportManager = require('../models/airportState');
const logger = require('../utils/logger');

class AirportService {
  /**
   * Get current airport status
   */
  getStatus() {
    return airportManager.getStatus();
  }

  /**
   * Add a new plane to the queue
   * @param {string} [airline]
   */
  addPlane(airline) {
    return airportManager.addPlane(airline);
  }

  /**
   * Start automatic simulation
   */
  startSimulation() {
    return airportManager.startSimulation();
  }

  /**
   * Stop simulation
   */
  stopSimulation() {
    return airportManager.stopSimulation();
  }

  /**
   * Simulate a race condition
   */
  simulateRaceCondition() {
    return airportManager.simulateRaceCondition();
  }

  /**
   * Simulate a deadlock
   */
  simulateDeadlock() {
    return airportManager.simulateDeadlock();
  }

  /**
   * Get logs
   * @param {string} [level]
   * @param {number} [limit]
   */
  getLogs(level, limit) {
    return logger.getLogs(level, limit);
  }
}

module.exports = new AirportService();
