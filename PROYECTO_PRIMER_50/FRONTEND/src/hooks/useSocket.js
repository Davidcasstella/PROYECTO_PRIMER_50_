/**
 * useSocket Hook
 * 
 * Custom hook to subscribe to Socket.io events.
 * Automatically handles cleanup on component unmount.
 */
import { useEffect, useState } from 'react';
import socket from '../services/socket';

export default function useSocket() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  /**
   * Subscribe to a socket event
   * @param {string} event
   * @param {Function} callback
   */
  const subscribe = (event, callback) => {
    socket.on(event, callback);
    return () => socket.off(event, callback);
  };

  return { socket, connected, subscribe };
}
