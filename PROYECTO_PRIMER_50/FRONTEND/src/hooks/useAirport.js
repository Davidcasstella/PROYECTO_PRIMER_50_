/**
 * useAirport Hook
 * 
 * Provides access to airline context and actions.
 */
import { useContext } from 'react';
import { AirportContext } from '../context/AirportContext';

export default function useAirport() {
  const context = useContext(AirportContext);
  if (!context) {
    throw new Error('useAirport must be used within an AirportProvider');
  }
  return context;
}
