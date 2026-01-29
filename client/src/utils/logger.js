import { logsAPI } from '../services/api';

// Store errors in localStorage as backup
const STORAGE_KEY = 'frontend_errors';
const MAX_STORAGE_ITEMS = 100;

// Get stored errors from localStorage
const getStoredErrors = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

// Store error in localStorage
const storeError = (errorData) => {
  try {
    const errors = getStoredErrors();
    errors.push({
      ...errorData,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last MAX_STORAGE_ITEMS
    if (errors.length > MAX_STORAGE_ITEMS) {
      errors.splice(0, errors.length - MAX_STORAGE_ITEMS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
  } catch (error) {
    console.error('Failed to store error in localStorage:', error);
  }
};

// Send error to backend
const sendToBackend = async (level, message, details = {}) => {
  try {
    await logsAPI.logFrontend({
      level,
      message,
      details: {
        ...details,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to send error to backend:', error);
    // Store in localStorage as backup
    storeError({ level, message, details, backendError: error.message });
  }
};

// Frontend Logger
const logger = {
  error: (message, details = {}) => {
    const errorDetails = {
      ...details,
      stack: details.stack || (new Error().stack)
    };
    
    // Always log to console
    console.error(`[FRONTEND ERROR] ${message}`, errorDetails);
    
    // Send to backend
    sendToBackend('error', message, errorDetails);
    
    // Store locally as backup
    storeError({ level: 'error', message, details: errorDetails });
  },
  
  warn: (message, details = {}) => {
    console.warn(`[FRONTEND WARN] ${message}`, details);
    sendToBackend('warn', message, details);
    storeError({ level: 'warn', message, details });
  },
  
  info: (message, details = {}) => {
    console.log(`[FRONTEND INFO] ${message}`, details);
    sendToBackend('info', message, details);
  },
  
  // Get stored errors
  getStoredErrors: () => {
    return getStoredErrors();
  },
  
  // Clear stored errors
  clearStoredErrors: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear stored errors:', error);
    }
  },
  
  // Download errors as JSON
  downloadErrors: () => {
    const errors = getStoredErrors();
    const dataStr = JSON.stringify(errors, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `frontend-errors-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// Global error handler
window.addEventListener('error', (event) => {
  logger.error('Unhandled error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error ? {
      name: event.error.name,
      message: event.error.message,
      stack: event.error.stack
    } : null
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason,
    promise: event.promise?.toString(),
    error: event.reason instanceof Error ? {
      name: event.reason.name,
      message: event.reason.message,
      stack: event.reason.stack
    } : String(event.reason)
  });
});

export default logger;

