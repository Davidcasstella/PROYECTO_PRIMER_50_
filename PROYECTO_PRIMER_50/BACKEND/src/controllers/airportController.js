/**
 * Airport Controller
 * 
 * HTTP request handlers for the airport API.
 * Maps HTTP requests to service methods and formats responses.
 */
const airportService = require('../services/airportService');

const airportController = {
  /**
   * GET /api/airport/status
   * Returns complete airport status
   */
  getStatus(req, res) {
    try {
      const status = airportService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/airport/plane
   * Add a new plane to the queue
   */
  addPlane(req, res) {
    try {
      const { airline } = req.body || {};
      const plane = airportService.addPlane(airline);
      res.json({ success: true, data: plane.toJSON() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/airport/simulate
   * Start automatic simulation
   */
  startSimulation(req, res) {
    try {
      const result = airportService.startSimulation();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/airport/stop
   * Stop simulation
   */
  stopSimulation(req, res) {
    try {
      const result = airportService.stopSimulation();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/airport/race-condition
   * Simulate a race condition scenario
   */
  async simulateRaceCondition(req, res) {
    try {
      const result = await airportService.simulateRaceCondition();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/airport/deadlock
   * Simulate a deadlock scenario
   */
  async simulateDeadlock(req, res) {
    try {
      const result = await airportService.simulateDeadlock();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * GET /api/logs
   * Get event logs
   */
  getLogs(req, res) {
    try {
      const { level, limit } = req.query;
      const logs = airportService.getLogs(level, limit ? parseInt(limit) : undefined);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

module.exports = airportController;
