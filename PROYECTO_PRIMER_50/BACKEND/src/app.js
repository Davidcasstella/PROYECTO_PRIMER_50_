/**
 * App Entry Point
 * 
 * Sets up Express server with Socket.io for real-time communication.
 * Connects the event system to WebSocket broadcasting.
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config');
const airportRoutes = require('./routes/airportRoutes');
const eventEmitter = require('./events/eventEmitter');
const logger = require('./utils/logger');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS for frontend connection
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
  },
});

// Connect event emitter to Socket.io for real-time broadcasting
eventEmitter.setSocketServer(io);

// Middleware
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());

// API Routes
app.use('/api', airportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.log('INFO', `🔌 Client connected: ${socket.id}`);

  // Send current status to newly connected client
  const airportManager = require('./models/airportState');
  socket.emit('status:update', airportManager.getStatus());

  socket.on('disconnect', () => {
    logger.log('INFO', `🔌 Client disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(config.port, () => {
  logger.log('INFO', `🛫 Airport Simulation Server running on http://localhost:${config.port}`);
  logger.log('INFO', `📡 WebSocket server ready`);
  logger.log('INFO', `🏗️  Airport configured: ${config.airport.numRunways} runways, ${config.airport.numGates} gates`);
});

module.exports = { app, server, io };
