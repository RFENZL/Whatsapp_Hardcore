const logger = require('./logger');

// Middleware de logging pour Socket.IO
function socketLogger(io) {
  // Logger pour la connexion
  io.on('connection', (socket) => {
    const userId = socket.user ? socket.user._id : 'unknown';
    const username = socket.user ? socket.user.username : 'unknown';
    
    logger.info('Socket connected', {
      event: 'socket:connect',
      socketId: socket.id,
      userId,
      username,
      transport: socket.conn.transport.name,
      address: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    });

    // Logger pour tous les événements émis par le client
    const originalEmit = socket.emit;
    socket.emit = function(event, ...args) {
      logger.debug('Socket emit to client', {
        event: `socket:emit:${event}`,
        socketId: socket.id,
        userId,
        dataSize: JSON.stringify(args).length
      });
      return originalEmit.apply(socket, [event, ...args]);
    };

    // Logger pour tous les événements reçus du client
    const originalOn = socket.on;
    socket.on = function(event, handler) {
      const wrappedHandler = function(...args) {
        const startTime = Date.now();
        
        logger.debug('Socket event received', {
          event: `socket:on:${event}`,
          socketId: socket.id,
          userId,
          dataSize: JSON.stringify(args).length
        });

        try {
          const result = handler.apply(this, args);
          
          // Si c'est une promesse, logger le succès/échec
          if (result && typeof result.then === 'function') {
            result
              .then(() => {
                const duration = Date.now() - startTime;
                logger.debug('Socket event completed', {
                  event: `socket:complete:${event}`,
                  socketId: socket.id,
                  userId,
                  duration: `${duration}ms`,
                  success: true
                });
              })
              .catch((err) => {
                const duration = Date.now() - startTime;
                logger.error('Socket event failed', {
                  event: `socket:error:${event}`,
                  socketId: socket.id,
                  userId,
                  duration: `${duration}ms`,
                  error: err.message,
                  stack: err.stack
                });
              });
          } else {
            const duration = Date.now() - startTime;
            logger.debug('Socket event completed', {
              event: `socket:complete:${event}`,
              socketId: socket.id,
              userId,
              duration: `${duration}ms`,
              success: true
            });
          }

          return result;
        } catch (err) {
          const duration = Date.now() - startTime;
          logger.error('Socket event error', {
            event: `socket:error:${event}`,
            socketId: socket.id,
            userId,
            duration: `${duration}ms`,
            error: err.message,
            stack: err.stack
          });
          throw err;
        }
      };

      return originalOn.call(socket, event, wrappedHandler);
    };

    // Logger pour la déconnexion
    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', {
        event: 'socket:disconnect',
        socketId: socket.id,
        userId,
        username,
        reason,
        transport: socket.conn.transport.name
      });
    });

    // Logger pour les erreurs de socket
    socket.on('error', (error) => {
      logger.error('Socket error', {
        event: 'socket:error',
        socketId: socket.id,
        userId,
        username,
        error: error.message,
        stack: error.stack
      });
    });

    // Logger pour les changements de transport
    socket.conn.on('upgrade', (transport) => {
      logger.info('Socket transport upgraded', {
        event: 'socket:transport:upgrade',
        socketId: socket.id,
        userId,
        from: socket.conn.transport.name,
        to: transport.name
      });
    });
  });

  // Logger pour les erreurs globales de connexion
  io.engine.on('connection_error', (err) => {
    logger.error('Socket.IO connection error', {
      event: 'socket:connection_error',
      error: err.message,
      code: err.code,
      context: err.context
    });
  });

  // Logger pour les statistiques périodiques
  if (process.env.SOCKET_STATS_INTERVAL) {
    const interval = parseInt(process.env.SOCKET_STATS_INTERVAL);
    setInterval(() => {
      const sockets = io.sockets.sockets;
      const stats = {
        totalConnections: sockets.size,
        transports: {},
        rooms: io.sockets.adapter.rooms.size
      };

      sockets.forEach((socket) => {
        const transport = socket.conn.transport.name;
        stats.transports[transport] = (stats.transports[transport] || 0) + 1;
      });

      logger.info('Socket.IO statistics', {
        event: 'socket:stats',
        ...stats
      });
    }, interval);
  }

  logger.info('Socket.IO logger middleware initialized');
}

module.exports = socketLogger;
