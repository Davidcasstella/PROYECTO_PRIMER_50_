/**
 * Airport Routes
 * 
 * Express router defining all API endpoints for the airport simulation.
 */
const express = require('express');
const router = express.Router();
const airportController = require('../controllers/airportController');

// Airport status and management
router.get('/airport/status', airportController.getStatus);
router.post('/airport/plane', airportController.addPlane);

// Simulation control
router.post('/airport/simulate', airportController.startSimulation);
router.post('/airport/stop', airportController.stopSimulation);

// Concurrency demonstrations
router.post('/airport/race-condition', airportController.simulateRaceCondition);
router.post('/airport/deadlock', airportController.simulateDeadlock);

// Logs
router.get('/logs', airportController.getLogs);

module.exports = router;
