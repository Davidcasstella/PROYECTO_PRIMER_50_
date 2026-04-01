/**
 * REST API Client
 * 
 * HTTP client for communicating with the airport backend REST API.
 */
const API_URL = 'http://localhost:3001/api';

const api = {
  /**
   * Get current airport status
   */
  async getStatus() {
    const res = await fetch(`${API_URL}/airport/status`);
    return res.json();
  },

  /**
   * Add a new plane
   * @param {string} [airline]
   */
  async addPlane(airline) {
    const res = await fetch(`${API_URL}/airport/plane`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ airline }),
    });
    return res.json();
  },

  /**
   * Start automatic simulation
   */
  async startSimulation() {
    const res = await fetch(`${API_URL}/airport/simulate`, { method: 'POST' });
    return res.json();
  },

  /**
   * Stop simulation
   */
  async stopSimulation() {
    const res = await fetch(`${API_URL}/airport/stop`, { method: 'POST' });
    return res.json();
  },

  /**
   * Trigger race condition demo
   */
  async simulateRaceCondition() {
    const res = await fetch(`${API_URL}/airport/race-condition`, { method: 'POST' });
    return res.json();
  },

  /**
   * Trigger deadlock demo
   */
  async simulateDeadlock() {
    const res = await fetch(`${API_URL}/airport/deadlock`, { method: 'POST' });
    return res.json();
  },

  /**
   * Get logs
   * @param {number} [limit]
   */
  async getLogs(limit = 100) {
    const res = await fetch(`${API_URL}/logs?limit=${limit}`);
    return res.json();
  },
};

export default api;
