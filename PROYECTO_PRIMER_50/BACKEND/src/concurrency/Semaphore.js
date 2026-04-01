/**
 * Semaphore Implementation
 * 
 * Simulates OS-level semaphores using JavaScript Promises.
 * Supports both counting semaphores (for gates) and binary semaphores / mutex (for runways).
 * 
 * A counting semaphore allows up to N concurrent accesses to a shared resource.
 * A binary semaphore (mutex) is a special case where N = 1, providing exclusive access.
 * 
 * How it works:
 * - `acquire()` decrements the internal counter. If counter > 0, access is granted immediately.
 *   If counter === 0, the caller is queued and waits (Promise blocks) until a slot is freed.
 * - `release()` increments the counter and resolves the next queued Promise (if any).
 * 
 * This mimics the P (wait/proberen) and V (signal/verhogen) operations from Dijkstra's semaphore.
 */
class Semaphore {
  /**
   * @param {number} capacity - Maximum concurrent accesses allowed (1 = binary/mutex)
   * @param {string} name - Identifier for logging purposes
   */
  constructor(capacity, name = 'Semaphore') {
    this._capacity = capacity;
    this._currentCount = capacity;
    this._queue = []; // Queue of waiting resolve functions (FIFO)
    this._name = name;
  }

  get name() {
    return this._name;
  }

  get currentCount() {
    return this._currentCount;
  }

  get capacity() {
    return this._capacity;
  }

  get waitingCount() {
    return this._queue.length;
  }

  get isFull() {
    return this._currentCount === 0;
  }

  /**
   * P operation (wait/proberen) - Acquire access to the resource
   * 
   * If the semaphore counter > 0, decrements and returns immediately.
   * If the counter === 0, the caller is enqueued and blocks (via Promise)
   * until another caller releases the semaphore.
   * 
   * @returns {Promise<void>} Resolves when access is granted
   */
  async acquire() {
    if (this._currentCount > 0) {
      // Resource available - grant access immediately
      this._currentCount--;
      return Promise.resolve();
    }

    // Resource not available - enqueue the request and wait
    // This simulates thread blocking in a traditional OS semaphore
    return new Promise((resolve) => {
      this._queue.push(resolve);
    });
  }

  /**
   * V operation (signal/verhogen) - Release access to the resource
   * 
   * If there are waiting callers in the queue, resolves the first one (FIFO).
   * Otherwise, increments the counter to make the slot available.
   */
  release() {
    if (this._queue.length > 0) {
      // There are waiting "threads" - wake up the first one (FIFO order)
      const nextResolve = this._queue.shift();
      // Note: we don't increment _currentCount because the slot goes
      // directly to the next waiter (hand-off pattern)
      nextResolve();
    } else {
      // No waiters - simply increment the counter
      this._currentCount++;
    }
  }

  /**
   * Try to acquire without blocking
   * Returns true if acquired, false if would block
   * Useful for detecting potential deadlocks
   */
  tryAcquire() {
    if (this._currentCount > 0) {
      this._currentCount--;
      return true;
    }
    return false;
  }

  /**
   * Acquire with timeout - prevents infinite waiting
   * @param {number} timeoutMs - Maximum wait time in milliseconds
   * @returns {Promise<boolean>} true if acquired, false if timed out
   */
  async acquireWithTimeout(timeoutMs) {
    if (this._currentCount > 0) {
      this._currentCount--;
      return true;
    }

    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Remove from queue
          const index = this._queue.indexOf(resolveAcquire);
          if (index > -1) this._queue.splice(index, 1);
          resolve(false); // Timeout - did not acquire
        }
      }, timeoutMs);

      const resolveAcquire = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(true); // Successfully acquired
        }
      };

      this._queue.push(resolveAcquire);
    });
  }

  /**
   * Returns current state for monitoring/display
   */
  getStatus() {
    return {
      name: this._name,
      capacity: this._capacity,
      available: this._currentCount,
      waiting: this._queue.length,
      utilization: ((this._capacity - this._currentCount) / this._capacity * 100).toFixed(1) + '%',
    };
  }
}

/**
 * BinarySemaphore (Mutex)
 * Special case of Semaphore with capacity = 1
 * Ensures exclusive access to a shared resource (e.g., a runway)
 */
class BinarySemaphore extends Semaphore {
  constructor(name = 'Mutex') {
    super(1, name);
  }
}

module.exports = { Semaphore, BinarySemaphore };
