/**
 * Runway Resource
 * 
 * Represents a runway in the airport - a critical shared resource.
 * Protected by a binary semaphore (mutex) to ensure mutual exclusion:
 * only ONE plane can use a runway at any given time.
 * 
 * This is analogous to a printer in an OS - a resource that cannot be shared
 * simultaneously and requires exclusive access.
 */
const { BinarySemaphore } = require('./Semaphore');

class Runway {
  /**
   * @param {string} id - Runway identifier (e.g., 'A', 'B')
   */
  constructor(id) {
    this.id = id;
    this.name = `Runway ${id}`;
    // Binary semaphore ensures mutual exclusion on this runway
    this.mutex = new BinarySemaphore(`Runway-${id}-Mutex`);
    this.currentPlane = null;
    this.busy = false;
    this.totalOperations = 0;
  }

  /**
   * Request exclusive access to this runway
   * Blocks (via semaphore) until the runway is available
   * 
   * @param {Plane} plane - The plane requesting runway access
   * @returns {Promise<void>}
   */
  async requestAccess(plane) {
    // P operation - acquire the binary semaphore (wait if busy)
    await this.mutex.acquire();
    this.currentPlane = plane;
    this.busy = true;
    this.totalOperations++;
  }

  /**
   * Release exclusive access to this runway
   * Allows the next waiting plane to proceed
   */
  releaseAccess() {
    this.currentPlane = null;
    this.busy = false;
    // V operation - release the binary semaphore
    this.mutex.release();
  }

  /**
   * Try to acquire without blocking - for deadlock detection scenarios
   * @param {Plane} plane
   * @returns {boolean} true if acquired, false otherwise
   */
  tryAccess(plane) {
    const acquired = this.mutex.tryAcquire();
    if (acquired) {
      this.currentPlane = plane;
      this.busy = true;
      this.totalOperations++;
    }
    return acquired;
  }

  /**
   * Get current status for monitoring
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      busy: this.busy,
      currentPlane: this.currentPlane ? this.currentPlane.toJSON() : null,
      totalOperations: this.totalOperations,
      waitingCount: this.mutex.waitingCount,
    };
  }
}

module.exports = Runway;
