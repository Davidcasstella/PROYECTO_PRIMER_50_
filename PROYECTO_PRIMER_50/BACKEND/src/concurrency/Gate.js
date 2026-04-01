/**
 * Gate Resource
 * 
 * Represents a boarding gate at the airport.
 * Unlike runways (binary semaphore), gates are managed by a COUNTING semaphore
 * in the AirportManager - allowing up to N planes at gates simultaneously.
 * 
 * Each individual gate still only holds one plane at a time,
 * but the counting semaphore controls the total number of occupied gates.
 */
class Gate {
  /**
   * @param {number} number - Gate number (1-based)
   */
  constructor(number) {
    this.id = number;
    this.name = `Gate ${number}`;
    this.occupied = false;
    this.assignedPlane = null;
    this.totalAssignments = 0;
  }

  /**
   * Assign a plane to this gate
   * @param {Plane} plane - The plane to assign
   */
  assign(plane) {
    this.occupied = true;
    this.assignedPlane = plane;
    this.totalAssignments++;
  }

  /**
   * Release this gate (plane is departing)
   */
  release() {
    this.assignedPlane = null;
    this.occupied = false;
  }

  /**
   * Check if gate is available
   * @returns {boolean}
   */
  isAvailable() {
    return !this.occupied;
  }

  /**
   * Get current status for monitoring
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      occupied: this.occupied,
      assignedPlane: this.assignedPlane ? this.assignedPlane.toJSON() : null,
      totalAssignments: this.totalAssignments,
    };
  }
}

module.exports = Gate;
