/**
 * Socket.io Client Service
 * 
 * Manages WebSocket connection to the backend server.
 * Provides a singleton socket instance for the entire app.
 */
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3001';

// Create singleton socket connection
const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('🔌 Connected to airport server');
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from airport server');
});

socket.on('connect_error', (error) => {
  console.error('🔌 Connection error:', error.message);
});

export default socket;
