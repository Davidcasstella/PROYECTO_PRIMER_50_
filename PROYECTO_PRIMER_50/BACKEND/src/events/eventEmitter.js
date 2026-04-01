/**
 * Event Emitter - Real-time Event System
 * 
 * Bridge between the airport simulation logic and Socket.io.
 * All concurrency events are emitted here and forwarded to connected WebSocket clients.
 * 
 * This acts as a message bus / event bus - a common pattern in concurrent systems
 * where producers (simulation) and consumers (frontend) are decoupled.
 */
const EventEmitter = require('events');

class AirportEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.io = null; // Socket.io server reference (set in app.js)
    this.setMaxListeners(50);
  }

  /**
   * Set the Socket.io server instance
   * All events will be broadcast to all connected clients
   * @param {import('socket.io').Server} io
   */
  setSocketServer(io) {
    this.io = io;
  }

  /**
   * Override emit to also broadcast via Socket.io
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    // Emit locally (Node.js EventEmitter)
    super.emit(event, ...args);

    // Broadcast to all WebSocket clients
    if (this.io) {
      this.io.emit(event, ...args);
    }

    return true;
  }
}

// Singleton event emitter instance
module.exports = new AirportEventEmitter();
