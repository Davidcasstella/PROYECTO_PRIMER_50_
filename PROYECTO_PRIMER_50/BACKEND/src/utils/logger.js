/**
 * Logger Utility
 * 
 * Centralized logging with timestamps and log levels.
 * Stores logs in memory for API retrieval and emits to console.
 */
class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 500; // Keep last 500 logs in memory
  }

  /**
   * Create a log entry
   * @param {'INFO'|'WARN'|'ERROR'|'DEBUG'} level
   * @param {string} message
   */
  log(level, message) {
    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    this.logs.push(entry);

    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with color
    const colors = {
      INFO: '\x1b[36m',   // Cyan
      WARN: '\x1b[33m',   // Yellow
      ERROR: '\x1b[31m',  // Red
      DEBUG: '\x1b[90m',  // Gray
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level] || ''}[${entry.timestamp}] [${level}] ${message}${reset}`);

    return entry;
  }

  /**
   * Get all logs or filter by level
   * @param {string} [level] - Optional filter
   * @param {number} [limit] - Max logs to return
   */
  getLogs(level, limit = 100) {
    let filtered = this.logs;
    if (level) {
      filtered = filtered.filter(l => l.level === level);
    }
    return filtered.slice(-limit);
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
  }
}

// Singleton instance
module.exports = new Logger();
