const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Toutes les routes nécessitent une authentification
router.use(auth);

// GET /api/notifications - Obtenir toutes les notifications
router.get('/', notificationController.getAll);

// GET /api/notifications/unread-count - Obtenir le nombre de notifications non lues
router.get('/unread-count', notificationController.getUnreadCount);

// PUT /api/notifications/mark-all-read - Marquer toutes les notifications comme lues
router.put('/mark-all-read', notificationController.markAllAsRead);

// DELETE /api/notifications/clear-read - Supprimer toutes les notifications lues
router.delete('/clear-read', notificationController.clearRead);

// PUT /api/notifications/:id/read - Marquer une notification comme lue
router.put('/:id/read', notificationController.markAsRead);

// PUT /api/notifications/:id/archive - Archiver une notification
router.put('/:id/archive', notificationController.archive);

// DELETE /api/notifications/:id - Supprimer une notification
router.delete('/:id', notificationController.remove);

module.exports = router;
