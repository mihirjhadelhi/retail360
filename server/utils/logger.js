const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const backendLogFile = path.join(logsDir, 'backend.log');
const frontendLogFile = path.join(logsDir, 'frontend.log');

// Helper function to format log entry
const formatLogEntry = (level, message, details = {}) => {
  const timestamp = new Date().toISOString();
  const detailsStr = Object.keys(details).length > 0 
    ? ` | Details: ${JSON.stringify(details)}` 
    : '';
  return `[${timestamp}] [${level}] ${message}${detailsStr}\n`;
};

// Backend Logger
const backendLogger = {
  error: (message, details = {}) => {
    const logEntry = formatLogEntry('ERROR', message, details);
    fs.appendFileSync(backendLogFile, logEntry);
    console.error(`[BACKEND ERROR] ${message}`, details);
  },
  
  warn: (message, details = {}) => {
    const logEntry = formatLogEntry('WARN', message, details);
    fs.appendFileSync(backendLogFile, logEntry);
    console.warn(`[BACKEND WARN] ${message}`, details);
  },
  
  info: (message, details = {}) => {
    const logEntry = formatLogEntry('INFO', message, details);
    fs.appendFileSync(backendLogFile, logEntry);
    console.log(`[BACKEND INFO] ${message}`, details);
  },
  
  debug: (message, details = {}) => {
    const logEntry = formatLogEntry('DEBUG', message, details);
    fs.appendFileSync(backendLogFile, logEntry);
    console.log(`[BACKEND DEBUG] ${message}`, details);
  }
};

// Frontend Logger
const frontendLogger = {
  error: (message, details = {}) => {
    const logEntry = formatLogEntry('ERROR', message, details);
    fs.appendFileSync(frontendLogFile, logEntry);
    console.error(`[FRONTEND ERROR] ${message}`, details);
  },
  
  warn: (message, details = {}) => {
    const logEntry = formatLogEntry('WARN', message, details);
    fs.appendFileSync(frontendLogFile, logEntry);
    console.warn(`[FRONTEND WARN] ${message}`, details);
  },
  
  info: (message, details = {}) => {
    const logEntry = formatLogEntry('INFO', message, details);
    fs.appendFileSync(frontendLogFile, logEntry);
    console.log(`[FRONTEND INFO] ${message}`, details);
  }
};

// Get log file contents
const getLogs = (type = 'backend', lines = 100) => {
  const logFile = type === 'frontend' ? frontendLogFile : backendLogFile;
  
  if (!fs.existsSync(logFile)) {
    return [];
  }
  
  const content = fs.readFileSync(logFile, 'utf8');
  const logLines = content.split('\n').filter(line => line.trim());
  
  // Return last N lines
  return logLines.slice(-lines);
};

// Clear log file
const clearLogs = (type = 'backend') => {
  const logFile = type === 'frontend' ? frontendLogFile : backendLogFile;
  if (fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '');
  }
};

module.exports = {
  backend: backendLogger,
  frontend: frontendLogger,
  getLogs,
  clearLogs
};

