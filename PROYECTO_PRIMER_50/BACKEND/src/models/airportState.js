/**
 * Airport State Model
 * 
 * Singleton that holds the shared AirportManager instance.
 * This ensures all parts of the application access the same state.
 * 
 * In OS terms, this is the shared memory segment that all threads access.
 */
const AirportManager = require('../concurrency/AirportManager');

// Single instance of the airport manager (shared state)
const airportManager = new AirportManager();

module.exports = airportManager;
