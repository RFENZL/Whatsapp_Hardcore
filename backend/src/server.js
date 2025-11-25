require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = require('./app');
const initSocket = require('./socket/handlers');
const { setIO } = require('./socket/io');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tpchat';

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'tpchat' });
    logger.info('Connected to MongoDB', { uri: MONGODB_URI.replace(/\/\/.*@/, '//*****@') });
    
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: { origin: process.env.CLIENT_ORIGIN || true, methods: ['GET','POST','PUT','DELETE'] }
    });
    initSocket(io);
    setIO(io);
    
    server.listen(PORT, () => {
      logger.info(`Server started on http://localhost:${PORT}`, { port: PORT, env: process.env.NODE_ENV || 'development' });
    });
  } catch (err) {
    logger.error('Server startup failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

start();
