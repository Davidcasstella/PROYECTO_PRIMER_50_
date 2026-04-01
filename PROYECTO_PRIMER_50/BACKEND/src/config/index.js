// Airport simulation configuration constants
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT) || 3001,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Airport resource configuration
  airport: {
    numRunways: parseInt(process.env.NUM_RUNWAYS) || 2,
    numGates: parseInt(process.env.NUM_GATES) || 5,
  },

  // Simulation timing (milliseconds)
  timing: {
    landingMin: 3000,
    landingMax: 5000,
    gateMin: 5000,
    gateMax: 10000,
    departureMin: 3000,
    departureMax: 5000,
    spawnMin: 2000,
    spawnMax: 5000,
  },

  // Airline names for random plane generation
  airlines: [
    'Avianca', 'LATAM', 'Copa Airlines', 'Viva Air',
    'EasyFly', 'Satena', 'Wingo', 'JetSmart',
    'American Airlines', 'Delta', 'United', 'Emirates',
  ],
};

module.exports = config;
