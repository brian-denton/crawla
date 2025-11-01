export interface ScanLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export class ScanLogger {
  private static instance: ScanLogger;
  private logs: ScanLog[] = [];
  private maxLogs = 500; // Keep last 500 log entries

  private constructor() {}

  static getInstance(): ScanLogger {
    if (!ScanLogger.instance) {
      ScanLogger.instance = new ScanLogger();
    }
    return ScanLogger.instance;
  }

  log(level: ScanLog['level'], message: string) {
    const logEntry: ScanLog = {
      timestamp: new Date(),
      level,
      message,
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also log to console for debugging
    const prefix = `[${level.toUpperCase()}]`;
    switch (level) {
      case 'error':
        console.error(prefix, message);
        break;
      case 'warning':
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  info(message: string) {
    this.log('info', message);
  }

  warning(message: string) {
    this.log('warning', message);
  }

  error(message: string) {
    this.log('error', message);
  }

  success(message: string) {
    this.log('success', message);
  }

  getLogs(): ScanLog[] {
    return [...this.logs];
  }

  getRecentLogs(count: number = 100): ScanLog[] {
    return this.logs.slice(-count);
  }

  clear() {
    this.logs = [];
    this.info('Logs cleared');
  }
}

