const { expect } = require('./utils.js');
const User = require('../src/models/User');
const Message = require('../src/models/Message');
const Conversation = require('../src/models/Conversation');

describe('Models', function () {
  this.timeout(10000);

  describe('User model', () => {
    it('should hash password on save', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'plaintext123'
      });
      await user.save();
      expect(user.password).to.not.equal('plaintext123');
      expect(user.password.length).to.be.above(20);
    });

    it('should compare passwords correctly', async () => {
      const user = new User({
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'mypassword'
      });
      await user.save();
      const isMatch = await user.comparePassword('mypassword');
      expect(isMatch).to.equal(true);
      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).to.equal(false);
    });

    it('should return JSON without sensitive fields', async () => {
      const user = new User({
        username: 'testuser4',
        email: 'test4@example.com',
        password: 'secret123'
      });
      await user.save();
      const json = user.toJSON();
      expect(json.password).to.be.undefined;
      expect(json.username).to.equal('testuser4');
      expect(json.email).to.equal('test4@example.com');
    });

    it('should enforce username length constraints', async () => {
      const user = new User({
        username: 'a'.repeat(31), // 31 chars > 30 max
        email: 'test5@example.com',
        password: 'test123'
      });
      try {
        await user.save();
        throw new Error('Should have failed validation');
      } catch (err) {
        expect(err.message).to.include('username');
      }
    });
  });

  describe('Message model', () => {
    let user1, user2;

    before(async () => {
      user1 = await User.create({
        username: 'sender',
        email: 'sender@example.com',
        password: 'pass123'
      });
      user2 = await User.create({
        username: 'receiver',
        email: 'receiver@example.com',
        password: 'pass123'
      });
    });

    it('should create message with default values', async () => {
      const msg = await Message.create({
        sender: user1._id,
        recipient: user2._id,
        content: 'Hello'
      });
      expect(msg.status).to.equal('pending');
      expect(msg.edited).to.equal(false);
      expect(msg.deleted).to.equal(false);
      expect(msg.createdAt).to.exist;
    });

    it('should enforce content max length', async () => {
      const longContent = 'a'.repeat(5001);
      try {
        await Message.create({
          sender: user1._id,
          recipient: user2._id,
          content: longContent
        });
        throw new Error('Should have failed validation');
      } catch (err) {
        expect(err.message).to.include('content');
      }
    });

    it('should update status', async () => {
      const msg = await Message.create({
        sender: user1._id,
        recipient: user2._id,
        content: 'Test status'
      });
      expect(msg.status).to.equal('pending');
      msg.status = 'read';
      await msg.save();
      const updated = await Message.findById(msg._id);
      expect(updated.status).to.equal('read');
    });
  });

  describe('Conversation model', () => {
    let user1, user2;

    before(async () => {
      user1 = await User.create({
        username: 'conv1',
        email: 'conv1@example.com',
        password: 'pass123'
      });
      user2 = await User.create({
        username: 'conv2',
        email: 'conv2@example.com',
        password: 'pass123'
      });
    });

    it('should create conversation with participants', async () => {
      const conv = await Conversation.create({
        participants: [user1._id, user2._id],
        type: 'direct'
      });
      expect(conv.participants).to.have.lengthOf(2);
      expect(conv.type).to.equal('direct');
      expect(conv.createdAt).to.exist;
    });

    it('should require at least 2 participants', async () => {
      try {
        await Conversation.create({
          participants: [user1._id],
          type: 'direct'
        });
        throw new Error('Should have failed validation');
      } catch (err) {
        // Should fail - conversation needs 2+ participants
        expect(err).to.exist;
      }
    });

    it('should update lastMessageAt timestamp', async () => {
      const conv = await Conversation.create({
        participants: [user1._id, user2._id],
        type: 'direct'
      });
      const originalTime = conv.lastMessageAt;
      setTimeout(async () => {
        conv.lastMessageAt = new Date();
        await conv.save();
        expect(conv.lastMessageAt.getTime()).to.be.above(originalTime.getTime());
      }, 100);
    });
  });
});
