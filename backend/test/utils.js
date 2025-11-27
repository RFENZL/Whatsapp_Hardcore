const http = require('http');
const { io: Client } = require('socket.io-client');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const chai = require('chai');
const request = require('supertest');
let app;
const initSocket = require('../src/socket/handlers');
const { setIO } = require('../src/socket/io');

const expect = chai.expect;

let mongo, httpServer, ioServer, superAgent, portCached;

async function setupServer() {
  process.env.JWT_SECRET = 'testsecret';
  process.env.NODE_ENV = 'test';
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGODB_URI = uri;
  if (mongoose.connection.readyState) await mongoose.connection.close();
  await mongoose.connect(uri);
  if (require.cache[require.resolve('../src/app')]) delete require.cache[require.resolve('../src/app')];
  app = require('../src/app');
  httpServer = http.createServer(app);
  const { Server } = require('socket.io');
  ioServer = new Server(httpServer, { cors: { origin: true, credentials: true } });
  initSocket(ioServer);
  setIO(ioServer);
  await new Promise(res => httpServer.listen(0, res));
  const addr = httpServer.address();
  const port = typeof addr === 'string' ? 80 : addr.port;
  portCached = port;
  superAgent = request(`http://127.0.0.1:${port}`);
  return { port };
}

async function teardownServer() {
  if (ioServer) ioServer.close();
  if (httpServer) await new Promise(res => httpServer.close(res));
  if (mongoose.connection.readyState) {
    try { await mongoose.connection.dropDatabase(); } catch (_) { /* ignored */ }
    try { await mongoose.connection.close(); } catch { /* ignored */ }
  }
  if (mongo) await mongo.stop();
  app = undefined;
  superAgent = undefined;
  portCached = undefined;
}

function uniqEmail(prefix='user') {
  const rnd = Math.random().toString(36).slice(2);
  return `${prefix}_${Date.now()}_${rnd}@x.com`;
}

async function createUser(email, username, password='secret123') {
  await superAgent.post('/api/auth/register').send({ email, password, username });
  const login = await superAgent.post('/api/auth/login').send({ email, password });
  return { token: `Bearer ${login.body.token}`, user: login.body.user };
}

function wsConnect(token) {
  return new Promise((resolve, reject) => {
    const socket = Client(`http://127.0.0.1:${portCached}`, { auth: { token: token.replace(/^Bearer\s+/, '') }, transports: ['websocket'] });
    const to = setTimeout(() => reject(new Error('ws timeout')), 8000);
    socket.on('connect', () => { clearTimeout(to); resolve(socket); });
    socket.on('connect_error', (e) => { clearTimeout(to); reject(e); });
  });
}

function getPort() {
  return portCached;
}

module.exports = { expect, setupServer, teardownServer, agent: () => superAgent, createUser, wsConnect, uniqEmail, getPort };
