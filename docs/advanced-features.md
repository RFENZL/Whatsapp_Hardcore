# Advanced Socket.IO Features Documentation

This document describes all the advanced real-time features implemented in the WhatsApp Hardcore application.

## Table of Contents
1. [Core Real-Time Features](#core-real-time-features)
2. [Persistent Notifications System](#persistent-notifications-system)
3. [Message Queue & Offline Support](#message-queue--offline-support)
4. [Socket.IO Architecture](#socketio-architecture)
5. [Security & Rate Limiting](#security--rate-limiting)
6. [Monitoring & Metrics](#monitoring--metrics)
7. [Conflict Management](#conflict-management)
8. [Advanced Status Features](#advanced-status-features)
9. [Configuration Guide](#configuration-guide)

---

## Core Real-Time Features

### 1. Message Deletion Notifications
- **Event**: `message:deleted`
- **Description**: Real-time notification when a message is deleted
- **Payload**: `{ messageId, conversationId, deletedBy }`
- **Broadcast**: Sent to all conversation participants

### 2. Conversation Rooms
- **Pattern**: `conversation:{conversationId}`
- **Description**: Each conversation has its own Socket.IO room
- **Auto-join**: Users automatically join their conversation rooms on connection
- **Benefits**: Efficient targeted message delivery

### 3. Missed Messages Recovery
- **Handler**: `get-missed-messages`
- **Description**: Retrieve messages sent while user was offline
- **Usage**: Client emits on reconnection with `lastSyncDate`
- **Response**: Array of messages created after `lastSyncDate`

### 4. Advanced Typing Indicators
- **Event**: `user:typing`
- **Description**: Real-time typing indicators for conversations and groups
- **Debounced**: Includes debouncing to reduce server load
- **Broadcast**: Only to conversation participants (excludes sender)

### 5. Redis Adapter for Multi-Instance
- **Package**: `@socket.io/redis-adapter`
- **Purpose**: Synchronize events across multiple server instances
- **Configuration**: Set `USE_REDIS=true` in `.env`
- **Online Users**: Distributed tracking with `RedisOnlineUsersManager`

---

## Persistent Notifications System

### Notification Types
```javascript
{
  message: 'New message received',
  mention: 'You were mentioned',
  reaction: 'Someone reacted to your message',
  group_invite: 'Group invitation',
  group_update: 'Group was updated',
  contact_request: 'New contact request',
  contact_accept: 'Contact request accepted',
  call: 'Incoming call',
  forward: 'Message forwarded to you',
  system: 'System notification'
}
```

### Schema Features
- **TTL Index**: Auto-delete read notifications after 7 days
- **Priority Levels**: `low`, `normal`, `high`, `urgent`
- **Rich Data**: Supports arbitrary JSON data for custom payloads
- **Action URLs**: Deep links for notification actions

### API Endpoints
```
GET    /api/notifications              - Get all notifications
GET    /api/notifications/unread       - Get unread count
GET    /api/notifications/:id          - Get specific notification
POST   /api/notifications/:id/read     - Mark as read
POST   /api/notifications/mark-all-read - Mark all as read
DELETE /api/notifications/:id          - Delete notification
DELETE /api/notifications              - Delete all notifications
```

### Real-Time Events (via /notifications namespace)
- `notifications:unread` - Get unread count
- `notification:read` - Mark notification as read
- `notifications:mark-all-read` - Mark all as read
- `notification:delete` - Delete notification
- `notifications:subscribe` - Subscribe to specific types
- `notifications:unsubscribe` - Unsubscribe from types

---

## Message Queue & Offline Support

### Features
- **Dual Storage**: Redis-backed with in-memory fallback
- **Auto-delivery**: Messages delivered on user reconnection
- **Expiration**: 7-day TTL on queued messages
- **Queue Management**: `enqueue`, `dequeue`, `getQueueSize` methods

### How It Works
1. When user is offline, messages are added to their queue
2. On reconnection, queue is automatically flushed
3. Client receives all queued messages via `message:new` events
4. Queue is cleared after successful delivery

### Configuration
```bash
USE_REDIS=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
MESSAGE_QUEUE_EXPIRY=604800  # 7 days in seconds
```

---

## Socket.IO Architecture

### Namespace Design
```
Default Namespace (/)
├── Authentication
├── Connection handling
├── Conversation rooms
└── Legacy handlers

/messages Namespace
├── heartbeat (latency tracking)
├── typing (rate-limited)
├── message:read
├── message:lock/unlock (conflict management)
├── conversation:view (last seen tracking)
└── metrics:get

/notifications Namespace
├── notifications:unread
├── notification:read
├── notifications:mark-all-read
├── notification:delete
├── notifications:subscribe
└── notifications:unsubscribe
```

### Client Connection Examples
```javascript
// Default namespace (legacy)
const socket = io('http://localhost:4000', {
  auth: { token: 'your-jwt-token' }
});

// Messages namespace
const messagesSocket = io('http://localhost:4000/messages', {
  auth: { token: 'your-jwt-token' }
});

// Notifications namespace
const notificationsSocket = io('http://localhost:4000/notifications', {
  auth: { token: 'your-jwt-token' }
});
```

### Advanced Socket.IO Configuration
```javascript
{
  pingTimeout: 60000,        // 60 seconds
  pingInterval: 25000,       // 25 seconds
  maxHttpBufferSize: 1e6,    // 1MB
  allowEIO3: true,           // Legacy client support
  perMessageDeflate: {
    threshold: 1024          // Compress messages > 1KB
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  cookie: false
}
```

---

## Security & Rate Limiting

### WebSocket Rate Limiting
- **Implementation**: Token bucket algorithm per user
- **Default Limits**: 
  - 30 events per 10 seconds
  - Configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW`
- **Response**: Emits `rate-limit-exceeded` event to offending client
- **Per-Event Override**: Can configure specific limits per event type

### JWT Authentication
- **Middleware**: `authenticateSocket` verifies JWT on connection
- **User Attachment**: Adds `socket.user` object with user details
- **Rejection**: Closes socket if token is invalid or expired

### Configuration
```bash
RATE_LIMIT_MAX=30           # Max events per window
RATE_LIMIT_WINDOW=10000     # Window in milliseconds
```

---

## Monitoring & Metrics

### Heartbeat System
- **Event**: `heartbeat` in `/messages` namespace
- **Purpose**: Track connection latency and user activity
- **Metrics**:
  - `avgLatency`: Average round-trip time
  - `lastHeartbeat`: Timestamp of last heartbeat
  - `missedHeartbeats`: Counter of missed heartbeats
  - `consecutiveMissed`: Current streak of missed heartbeats

### Getting Metrics
```javascript
// Client requests metrics
socket.emit('metrics:get');

// Server responds with
{
  userId: 'user123',
  socketId: 'socket456',
  avgLatency: 45,           // milliseconds
  lastHeartbeat: 1234567890,
  missedHeartbeats: 2,
  consecutiveMissed: 0
}
```

### WebSocket Logging
- **Activation**: Set `SOCKET_LOGGING=true` in `.env`
- **Logger**: Winston-based structured logging
- **Events Tracked**:
  - All connections/disconnections
  - Event emissions and receptions
  - Error events
  - Namespace activity
- **Log Rotation**: Daily rotation with 14-day retention

### Log Example
```json
{
  "level": "info",
  "message": "Socket event received",
  "eventName": "message:send",
  "namespace": "/messages",
  "socketId": "abc123",
  "userId": "user456",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Conflict Management

### Message Locking Mechanism
- **Purpose**: Prevent concurrent message edits
- **Lock Duration**: 5 minutes (configurable)
- **Auto-release**: Locks expire automatically

### How It Works
1. User A starts editing message
2. Client emits `message:lock` with messageId
3. Server locks the message for user A
4. User B tries to edit same message
5. Server rejects with `lock-failed` (locked by user A)
6. User A finishes, emits `message:unlock`
7. Message is now available for editing

### Client Integration
```javascript
// Lock before editing
socket.emit('message:lock', { messageId: 'msg123' });

socket.on('message:locked', ({ messageId, lockedBy }) => {
  // Start editing
});

socket.on('lock-failed', ({ messageId, lockedBy, reason }) => {
  alert(`Message is being edited by ${lockedBy}`);
});

// Unlock after editing
socket.emit('message:unlock', { messageId: 'msg123' });
```

### Configuration
```bash
LOCK_TIMEOUT=300000  # 5 minutes in milliseconds
```

---

## Advanced Status Features

### Custom User Statuses
- **Available Statuses**: `online`, `offline`, `away`, `busy`, `dnd` (do not disturb)
- **Custom Status Object**:
  ```javascript
  {
    message: "In a meeting",
    emoji: "📞",
    expiresAt: Date // Optional expiration
  }
  ```
- **Auto-expiry**: Custom statuses can expire automatically

### Last Seen Per Conversation
- **Feature**: Track when user last viewed each conversation
- **Storage**: Map structure in User model
- **Event**: `conversation:view` in `/messages` namespace
- **Update**: Automatic on message read

### Client Usage
```javascript
// Set custom status
socket.emit('status:set', {
  status: 'busy',
  customStatus: {
    message: 'In a meeting',
    emoji: '📞',
    expiresAt: new Date(Date.now() + 3600000) // 1 hour
  }
});

// Track conversation view
socket.emit('conversation:view', {
  conversationId: 'conv123'
});

// Server updates lastSeenPerConversation Map
// Frontend can display "Last seen in this chat: 2 minutes ago"
```

---

## Configuration Guide

### Environment Variables

#### Socket.IO Core
```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

#### Socket.IO Advanced
```bash
SOCKET_PING_TIMEOUT=60000      # Ping timeout in ms
SOCKET_PING_INTERVAL=25000     # Ping interval in ms
SOCKET_MAX_BUFFER_SIZE=1000000 # Max message size in bytes
SOCKET_LOGGING=true            # Enable detailed logging
```

#### Redis Configuration
```bash
USE_REDIS=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

#### Security
```bash
JWT_SECRET=your_secret_key
RATE_LIMIT_MAX=30              # Max events per window
RATE_LIMIT_WINDOW=10000        # Window in milliseconds
```

#### Message Queue
```bash
MESSAGE_QUEUE_EXPIRY=604800    # Queue expiry in seconds (7 days)
```

#### Conflict Management
```bash
LOCK_TIMEOUT=300000            # Lock timeout in milliseconds (5 minutes)
```

### Recommended Production Settings
```bash
NODE_ENV=production
USE_REDIS=true
SOCKET_LOGGING=false
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW=10000
```

---

## Performance Tips

### 1. Enable Redis in Production
- Required for multi-instance deployments
- Improves online user tracking
- Enables distributed message queue

### 2. Optimize Socket.IO Settings
- Increase `pingTimeout` for mobile clients (unstable networks)
- Enable compression for large messages
- Use WebSocket transport only if possible (disable polling)

### 3. Rate Limiting
- Adjust limits based on your user base
- Monitor `rate-limit-exceeded` events
- Consider per-user limits for premium users

### 4. Monitoring
- Enable `SOCKET_LOGGING` during development
- Use metrics endpoint to track latency
- Monitor heartbeat data for connection quality

### 5. Message Queue
- Tune `MESSAGE_QUEUE_EXPIRY` based on user behavior
- Monitor queue sizes to detect issues
- Consider separate Redis instance for queue in high-traffic scenarios

---

## Troubleshooting

### Connection Issues
**Problem**: Clients can't connect to namespaces
**Solution**: Ensure frontend is connecting to correct namespace URLs
```javascript
// Correct
const socket = io('http://localhost:4000/messages', { auth: { token } });

// Incorrect
const socket = io('http://localhost:4000', { path: '/messages' });
```

### Rate Limiting Too Aggressive
**Problem**: Users getting rate-limited frequently
**Solution**: Increase `RATE_LIMIT_MAX` or `RATE_LIMIT_WINDOW`

### Redis Connection Errors
**Problem**: "Redis initialization failed" in logs
**Solution**: 
1. Verify Redis is running: `redis-cli ping`
2. Check `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
3. Fallback to in-memory mode if Redis is not critical

### High Latency
**Problem**: Heartbeat shows high average latency
**Solution**:
1. Check network conditions
2. Verify server resources (CPU, memory)
3. Consider using WebSocket-only transport
4. Enable message compression

### Conflict Locks Not Releasing
**Problem**: Messages remain locked after user disconnects
**Solution**: Locks auto-expire after `LOCK_TIMEOUT`. Reduce timeout or implement explicit cleanup on disconnect.

---

## Migration Guide

### From Legacy to Namespace Architecture

**Step 1**: Update client connections
```javascript
// Old
const socket = io('http://localhost:4000');

// New
const messagesSocket = io('http://localhost:4000/messages');
const notificationsSocket = io('http://localhost:4000/notifications');
```

**Step 2**: Update event handlers
```javascript
// Old
socket.on('message:new', handler);

// New
messagesSocket.on('message:new', handler);
```

**Step 3**: Add authentication to all namespaces
```javascript
const messagesSocket = io('http://localhost:4000/messages', {
  auth: { token: localStorage.getItem('token') }
});
```

**Step 4**: Handle new events
- Add handlers for `message:locked` and `lock-failed`
- Subscribe to notification types in `/notifications` namespace
- Implement heartbeat responses in `/messages` namespace

---

## Future Enhancements

Potential features for future releases:
- Voice/video call signaling via Socket.IO
- Screen sharing support
- File transfer with progress tracking
- Message reactions with animations
- Presence indicators (typing, recording audio, etc.)
- End-to-end encryption key exchange
- Push notification integration
- Analytics dashboard for admin monitoring

---

## Support

For questions or issues:
1. Check the logs: `backend/logs/`
2. Review Socket.IO events in browser DevTools
3. Monitor Redis with `redis-cli monitor`
4. Check GitHub issues/discussions
