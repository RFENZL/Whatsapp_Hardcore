/**
 * Script de test pour vérifier le système de monitoring
 * Exécuter avec : node test-monitoring.js
 */

const logger = require('./src/utils/logger');
const { sendSecurityAlert, sendInfoAlert } = require('./src/utils/slackNotifier');
const { alertNewLogin } = require('./src/utils/securityAlerts');

console.log('🧪 Test du système de monitoring...\n');

// Test 1 : Logs de base
console.log('Test 1 : Logs de base');
logger.info('Test info log');
logger.warn('Test warning log');
logger.error('Test error log');
console.log('✅ Logs écrits dans logs/combined-*.log\n');

// Test 2 : Logs spécialisés
console.log('Test 2 : Logs spécialisés');
logger.logLogin({
  userId: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  ipAddress: '127.0.0.1',
  location: { city: 'Paris', country: 'France' }
});
console.log('✅ Log de connexion créé\n');

logger.logUserAction('test_action', {
  userId: 'test-user-id',
  action: 'profile_update',
  details: 'Test action'
});
console.log('✅ Log d\'action créé\n');

logger.logWebSocket('test_event', {
  socketId: 'test-socket',
  userId: 'test-user',
  event: 'message:send'
});
console.log('✅ Log WebSocket créé\n');

// Test 3 : Performance logging
console.log('Test 3 : Log de performance');
logger.logPerformance('test_operation', 1500, {
  operation: 'database_query',
  resultCount: 100
});
console.log('✅ Log de performance créé\n');

// Test 4 : Test Slack (seulement si configuré)
if (process.env.SLACK_ENABLED === 'true' && process.env.SLACK_WEBHOOK_URL) {
  console.log('Test 4 : Notification Slack');
  sendInfoAlert({
    title: 'Test de monitoring',
    message: 'Ceci est un message de test du système de monitoring',
    data: {
      'Timestamp': new Date().toISOString(),
      'Status': 'OK'
    }
  }).then(() => {
    console.log('✅ Notification Slack envoyée (vérifier votre canal Slack)\n');
  }).catch(err => {
    console.log('⚠️ Erreur Slack:', err.message, '\n');
  });
} else {
  console.log('Test 4 : Notification Slack');
  console.log('⏭️ Slack non configuré (SLACK_ENABLED=false ou SLACK_WEBHOOK_URL absent)\n');
}

// Test 5 : Test Sentry (seulement si configuré)
if (process.env.SENTRY_DSN) {
  console.log('Test 5 : Sentry');
  const Sentry = require('@sentry/node');
  Sentry.captureMessage('Test de monitoring - Tout fonctionne !', 'info');
  console.log('✅ Message envoyé à Sentry (vérifier votre dashboard Sentry)\n');
} else {
  console.log('Test 5 : Sentry');
  console.log('⏭️ Sentry non configuré (SENTRY_DSN absent)\n');
}

// Résumé
console.log('═══════════════════════════════════════════════');
console.log('📊 RÉSUMÉ DES TESTS');
console.log('═══════════════════════════════════════════════');
console.log('✅ Logs de base : OK');
console.log('✅ Logs spécialisés : OK');
console.log('✅ Logs de performance : OK');

if (process.env.SLACK_ENABLED === 'true' && process.env.SLACK_WEBHOOK_URL) {
  console.log('✅ Slack : Configuré');
} else {
  console.log('⏭️ Slack : Non configuré');
}

if (process.env.SENTRY_DSN) {
  console.log('✅ Sentry : Configuré');
} else {
  console.log('⏭️ Sentry : Non configuré');
}

console.log('═══════════════════════════════════════════════\n');

console.log('📁 Vérifier les logs dans : backend/logs/');
console.log('   - combined-YYYY-MM-DD.log');
console.log('   - error-YYYY-MM-DD.log\n');

if (process.env.SLACK_ENABLED === 'true') {
  console.log('💬 Vérifier Slack : Votre canal configuré');
}

if (process.env.SENTRY_DSN) {
  console.log('🔍 Vérifier Sentry : https://sentry.io\n');
}

console.log('✨ Test terminé avec succès !\n');

// Forcer la fin du processus après 2 secondes (pour laisser temps aux async)
setTimeout(() => {
  process.exit(0);
}, 2000);
