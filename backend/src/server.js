require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = require('./app');
const initSocket = require('./socket/handlers');
const { setIO } = require('./socket/io');

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tpchat';

async function start() {
  await mongoose.connect(MONGODB_URI, { dbName: 'tpchat' });
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_ORIGIN || true, methods: ['GET','POST','PUT','DELETE'] }
  });
  initSocket(io);
  setIO(io);
  server.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
