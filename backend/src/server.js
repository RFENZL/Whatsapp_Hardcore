require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = require('./app');
const initSocket = require('./socket/handlers');
const { setIO } = require('./socket/io');
const { startCleanupJob } = require('./jobs/cleanupExpiredMessages');
const { initRedis, getRedisPubClient, getRedisSubClient } = require('./utils/redis');
const messageQueue = require('./utils/messageQueue');
const socketLogger = require('./utils/socketLogger');
const logger = require('./utils/logger');
const initMessagesNamespace = require('./socket/messagesNamespace');
const initNotificationsNamespace = require('./socket/notificationsNamespace');

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tpchat';
const USE_REDIS = process.env.USE_REDIS === 'true';

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'tpchat' });
    logger.info('Connected to MongoDB', { uri: MONGODB_URI.replace(/\/\/.*@/, '//*****@') });
    
    const server = http.createServer(app);
    
    // Configuration avancée de Socket.IO
    const io = new Server(server, {
      cors: { 
        origin: process.env.CLIENT_ORIGIN || true, 
        methods: ['GET','POST','PUT','DELETE'],
        credentials: true
      },
      // Configuration des timeouts et intervalles
      pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '60000'), // 60s par défaut
      pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000'), // 25s par défaut
      // Taille maximale des messages
      maxHttpBufferSize: parseInt(process.env.SOCKET_MAX_BUFFER_SIZE || '1e6'), // 1MB par défaut
      // Autoriser les requêtes de secours (long-polling)
      allowEIO3: true,
      // Compression
      perMessageDeflate: {
        threshold: 1024 // Compresser seulement les messages > 1KB
      },
      // Configuration des transports
      transports: ['websocket', 'polling'],
      // Autoriser les upgrades
      allowUpgrades: true,
      // Cookie
      cookie: false
    });

    // Initialiser Redis et configurer l'adapter Socket.IO si activé
    if (USE_REDIS) {
      try {
        await initRedis();
        const pubClient = getRedisPubClient();
        const subClient = getRedisSubClient();
        
        if (pubClient && subClient) {
          io.adapter(createAdapter(pubClient, subClient));
          logger.info('Socket.IO Redis adapter configured for multi-instance support');
        }
        
        // Initialiser la queue de messages avec Redis
        await messageQueue.init();
      } catch (err) {
        logger.warn('Redis initialization failed, falling back to in-memory adapter', { error: err.message });
        // Initialiser la queue en mode mémoire
        await messageQueue.init();
      }
    } else {
      logger.info('Redis adapter disabled, using in-memory adapter');
      // Initialiser la queue en mode mémoire
      await messageQueue.init();
    }

    initSocket(io);
    setIO(io);
    logger.info('Main Socket.IO handlers initialized');
    
    // Initialiser les namespaces Socket.IO
    logger.info('Initializing Socket.IO namespaces...');
    try {
      initMessagesNamespace(io);
      logger.info('/messages namespace initialized');
    } catch (err) {
      console.error('ERROR IN MESSAGES NAMESPACE:', err);
      logger.error('Error initializing /messages namespace', { 
        error: err.message, 
        stack: err.stack,
        name: err.name 
      });
      throw err;
    }
    
    try {
      initNotificationsNamespace(io);
      logger.info('/notifications namespace initialized');
    } catch (err) {
      console.error('ERROR IN NOTIFICATIONS NAMESPACE:', err);
      logger.error('Error initializing /notifications namespace', { 
        error: err.message, 
        stack: err.stack,
        name: err.name 
      });
      throw err;
    }
    logger.info('Socket.IO namespaces initialized (/messages, /notifications)');
    
    // Activer le logging détaillé des événements Socket.IO
    if (process.env.SOCKET_LOGGING === 'true') {
      socketLogger(io);
      logger.info('Socket.IO detailed logging enabled');
    }
    
    // Démarrer le job de nettoyage des messages expirés (toutes les heures)
    startCleanupJob(60 * 60 * 1000);
    
    server.listen(PORT, () => {
      logger.info(`Server started on http://localhost:${PORT}`, { 
        port: PORT, 
        env: process.env.NODE_ENV || 'development',
        redis: USE_REDIS ? 'enabled' : 'disabled'
      });
    });
  } catch (err) {
    logger.error('Server startup failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

start();
