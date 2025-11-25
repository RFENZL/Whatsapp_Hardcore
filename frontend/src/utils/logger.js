// Logging structuré frontend
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

const currentLevel = import.meta.env.MODE === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG

function log(level, message, data = {}) {
  if (LOG_LEVELS[level] > currentLevel) return
  
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  }
  
  // Console avec couleurs
  const styles = {
    ERROR: 'color: #ef4444; font-weight: bold',
    WARN: 'color: #f59e0b; font-weight: bold',
    INFO: 'color: #3b82f6',
    DEBUG: 'color: #6b7280'
  }
  
  console.log(`%c[${level}] ${message}`, styles[level], data)
  
  // Envoyer à Sentry si erreur en production
  if (level === 'ERROR' && import.meta.env.MODE === 'production') {
    // Sentry.captureException sera configuré dans main.js
    if (window.Sentry) {
      window.Sentry.captureException(new Error(message), { extra: data })
    }
  }
}

export default {
  error: (message, data) => log('ERROR', message, data),
  warn: (message, data) => log('WARN', message, data),
  info: (message, data) => log('INFO', message, data),
  debug: (message, data) => log('DEBUG', message, data)
}
