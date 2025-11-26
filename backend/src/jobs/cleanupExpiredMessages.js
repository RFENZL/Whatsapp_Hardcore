const Message = require('../models/Message');

/**
 * Job pour nettoyer les messages expirés
 * À exécuter périodiquement (ex: toutes les heures)
 */
async function cleanupExpiredMessages() {
  try {
    const now = new Date();
    
    // Trouver tous les messages expirés
    const result = await Message.updateMany(
      {
        expiresAt: { $lte: now },
        deleted: false
      },
      {
        $set: {
          deleted: true,
          deletedAt: now,
          content: '[Message expiré]'
        }
      }
    );

    console.log(`[CleanupJob] ${result.modifiedCount} messages expirés supprimés`);
    return result.modifiedCount;
  } catch (error) {
    console.error('[CleanupJob] Erreur lors du nettoyage des messages expirés:', error);
    throw error;
  }
}

/**
 * Démarrer le job avec un intervalle en millisecondes
 * @param {number} intervalMs - Intervalle en millisecondes (défaut: 1 heure)
 */
function startCleanupJob(intervalMs = 60 * 60 * 1000) {
  console.log(`[CleanupJob] Démarrage du job de nettoyage (intervalle: ${intervalMs}ms)`);
  
  // Exécuter immédiatement une fois au démarrage
  cleanupExpiredMessages().catch(err => {
    console.error('[CleanupJob] Erreur lors de l exécution initiale:', err);
  });
  
  // Puis exécuter périodiquement
  const interval = setInterval(() => {
    cleanupExpiredMessages().catch(err => {
      console.error('[CleanupJob] Erreur lors de l exécution périodique:', err);
    });
  }, intervalMs);

  return interval;
}

module.exports = {
  cleanupExpiredMessages,
  startCleanupJob
};
