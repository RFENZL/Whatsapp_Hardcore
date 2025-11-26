import { ref, onMounted, onUnmounted } from 'vue';
import logger from './logger.js';

/**
 * Composable pour gérer le timeout de session avec détection d'activité
 * @param {Object} options - Options de configuration
 * @param {number} options.timeout - Durée d'inactivité avant timeout (ms), défaut 30min
 * @param {number} options.warningTime - Temps avant timeout pour afficher warning (ms), défaut 2min
 * @param {Function} options.onTimeout - Callback appelé au timeout
 * @param {Function} options.onWarning - Callback appelé avant timeout
 */
export function useSessionTimeout(options = {}) {
  const {
    timeout = 30 * 60 * 1000, // 30 minutes par défaut
    warningTime = 2 * 60 * 1000, // 2 minutes avant timeout
    onTimeout = () => {},
    onWarning = () => {}
  } = options;

  const lastActivity = ref(Date.now());
  const isWarningShown = ref(false);
  let activityTimer = null;
  let warningTimer = null;

  // Events qui comptent comme activité
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  function updateActivity() {
    lastActivity.value = Date.now();
    isWarningShown.value = false;
    resetTimers();
  }

  function resetTimers() {
    if (activityTimer) clearTimeout(activityTimer);
    if (warningTimer) clearTimeout(warningTimer);

    // Timer pour le warning
    warningTimer = setTimeout(() => {
      if (!isWarningShown.value) {
        isWarningShown.value = true;
        logger.warn('Session timeout warning');
        onWarning();
      }
    }, timeout - warningTime);

    // Timer pour le timeout
    activityTimer = setTimeout(() => {
      logger.warn('Session timeout - logging out');
      onTimeout();
    }, timeout);
  }

  function start() {
    logger.info('Session timeout monitoring started', { timeout: timeout / 1000 + 's' });
    
    // Attacher les listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Démarrer les timers
    resetTimers();
  }

  function stop() {
    logger.info('Session timeout monitoring stopped');
    
    // Retirer les listeners
    activityEvents.forEach(event => {
      window.removeEventListener(event, updateActivity);
    });

    // Clear timers
    if (activityTimer) clearTimeout(activityTimer);
    if (warningTimer) clearTimeout(warningTimer);
  }

  // Auto-start/stop avec le lifecycle
  onMounted(() => start());
  onUnmounted(() => stop());

  return {
    lastActivity,
    isWarningShown,
    start,
    stop,
    updateActivity
  };
}

/**
 * Composable pour synchroniser l'état de session entre onglets
 */
export function useMultiTabSync() {
  const channel = ref(null);

  function init(onLogout, onLogin) {
    if (typeof BroadcastChannel === 'undefined') {
      logger.warn('BroadcastChannel not supported');
      return;
    }

    channel.value = new BroadcastChannel('whatsapp_session');

    channel.value.onmessage = (event) => {
      logger.info('Received message from another tab', { type: event.data.type });
      
      if (event.data.type === 'logout') {
        onLogout();
      } else if (event.data.type === 'login') {
        onLogin();
      }
    };

    logger.info('Multi-tab sync initialized');
  }

  function broadcast(type, data = {}) {
    if (channel.value) {
      channel.value.postMessage({ type, ...data });
      logger.debug('Broadcasted message to other tabs', { type });
    }
  }

  function destroy() {
    if (channel.value) {
      channel.value.close();
      channel.value = null;
      logger.info('Multi-tab sync destroyed');
    }
  }

  onUnmounted(() => destroy());

  return {
    init,
    broadcast,
    destroy
  };
}
