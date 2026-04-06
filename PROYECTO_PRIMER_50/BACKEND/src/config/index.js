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

  // Simulation timing (milliseconds) - slowed for visible animations
  timing: {
    flyingMin: 1500,          // Minimum time visible in sky before landing
    flyingMax: 2500,          // Maximum time visible in sky
    landingMin: 5000,
    landingMax: 8000,
    taxiToGateMin: 3500,      // Time for taxi-in animation (must >= CSS animation)
    taxiToGateMax: 3500,
    gateMin: 8000,
    gateMax: 15000,
    taxiToRunwayMin: 3500,    // Time for taxi-out animation (must >= CSS animation)
    taxiToRunwayMax: 3500,
    departureMin: 5000,
    departureMax: 8000,
    spawnMin: 4000,
    spawnMax: 8000,
  },

  // Airline names for random plane generation
  airlines: [
    'Avianca', 'LATAM', 'Copa Airlines', 'Viva Air',
    'EasyFly', 'Satena', 'Wingo', 'JetSmart',
    'American Airlines', 'Delta', 'United', 'Emirates',
  ],
};

module.exports = config;
