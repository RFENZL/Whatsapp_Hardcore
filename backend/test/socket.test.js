const { expect, agent, createUser, uniqEmail, getPort } = require('./utils.js');
const { io: Client } = require('socket.io-client');

describe('WebSocket handlers', function () {
  this.timeout(20000);
  let t1, u1, t2, u2, port;

  before(async () => {
    // Server is already set up in 00.setup.test.js
    port = getPort();
    const e1 = uniqEmail('ws1');
    const e2 = uniqEmail('ws2')
    ;({ token: t1, user: u1 } = await createUser(e1, 'wsUser01'))
    ;({ token: t2, user: u2 } = await createUser(e2, 'wsUser02'));
  });

  it('should reject connection without token', function (done) {
    const client = Client(`http://127.0.0.1:${port}`, { 
      reconnection: false,
      timeout: 5000
    });
    
    client.on('connect_error', (err) => {
      expect(err.message).to.include('Unauthorized');
      client.close();
      done();
    });
    
    client.on('connect', () => {
      client.close();
      done(new Error('Should not connect without token'));
    });
  });

  it('should connect with valid token', function (done) {
    // Extract token without Bearer prefix
    const tokenOnly = t1.replace('Bearer ', '');
    const client = Client(`http://127.0.0.1:${port}`, {
      auth: { token: tokenOnly },
      reconnection: false,
      timeout: 5000
    });
    
    client.on('connect', () => {
      expect(client.connected).to.equal(true);
      client.close();
      done();
    });
    
    client.on('connect_error', (err) => {
      client.close();
      done(err);
    });
  });

  it('should send and receive message via WebSocket', function (done) {
    this.timeout(15000);
    const tokenOnly1 = t1.replace('Bearer ', '');
    const tokenOnly2 = t2.replace('Bearer ', '');
    
    let senderConnected = false;
    let receiverConnected = false;
    
    const sender = Client(`http://127.0.0.1:${port}`, {
      auth: { token: tokenOnly1 },
      reconnection: false,
      timeout: 10000
    });
    
    const receiver = Client(`http://127.0.0.1:${port}`, {
      auth: { token: tokenOnly2 },
      reconnection: false,
      timeout: 10000
    });
    
    function checkBothConnected() {
      if (senderConnected && receiverConnected) {
        // Both connected, now send message
        setTimeout(() => {
          sender.emit('send-message', {
            to: u2._id.toString(),
            content: 'Test WebSocket message'
          });
        }, 300);
      }
    }
    
    receiver.on('connect', () => {
      receiverConnected = true;
      receiver.on('message:new', (data) => {
        try {
          expect(data.content).to.equal('Test WebSocket message');
          expect(data.sender).to.equal(u1._id.toString());
          sender.close();
          receiver.close();
          done();
        } catch (err) {
          sender.close();
          receiver.close();
          done(err);
        }
      });
      checkBothConnected();
    });
    
    sender.on('connect', () => {
      senderConnected = true;
      checkBothConnected();
    });
    
    receiver.on('connect_error', (err) => {
      sender.close();
      receiver.close();
      done(err);
    });
    
    sender.on('connect_error', (err) => {
      sender.close();
      receiver.close();
      done(err);
    });
  });

  it('should receive message:read acknowledgment', function (done) {
    this.timeout(15000);
    const tokenOnly1 = t1.replace('Bearer ', '');
    const tokenOnly2 = t2.replace('Bearer ', '');
    
    let senderConnected = false;
    let receiverConnected = false;
    let messageId = null;
    
    const sender = Client(`http://127.0.0.1:${port}`, {
      auth: { token: tokenOnly1 },
      reconnection: false,
      timeout: 10000
    });
    
    const receiver = Client(`http://127.0.0.1:${port}`, {
      auth: { token: tokenOnly2 },
      reconnection: false,
      timeout: 10000
    });
    
    function checkBothConnected() {
      if (senderConnected && receiverConnected) {
        // Both connected, send message
        setTimeout(() => {
          sender.emit('send-message', {
            to: u2._id.toString(),
            content: 'Please mark as read'
          });
        }, 300);
      }
    }
    
    // Sender listens for message:read event
    sender.on('connect', () => {
      senderConnected = true;
      sender.on('message:read', (data) => {
        try {
          expect(data.messageId).to.equal(messageId);
          sender.close();
          receiver.close();
          done();
        } catch (err) {
          sender.close();
          receiver.close();
          done(err);
        }
      });
      checkBothConnected();
    });
    
    // Receiver marks it as read
    receiver.on('connect', () => {
      receiverConnected = true;
      receiver.on('message:new', (data) => {
        if (data.content === 'Please mark as read') {
          messageId = data._id;
          // Mark as read
          setTimeout(() => {
            receiver.emit('message-read', { messageId });
          }, 300);
        }
      });
      checkBothConnected();
    });
  });
});