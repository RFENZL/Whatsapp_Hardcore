// Migration guide for frontend Socket.IO changes
// This file demonstrates the changes needed in the frontend code

// ============================================
// 1. TYPING INDICATORS - Update socket events
// ============================================

// BEFORE (old API)
function handleTyping_OLD(recipientUserId) {
  socket.emit('typing', { to: recipientUserId });
}

// AFTER (new API)
function handleTyping_NEW(conversationId) {
  socket.emit('typing', { conversationId: conversationId });
}

// Update event listeners for typing
// BEFORE
socket.on('typing', ({ from }) => {
  console.log(`User ${from} is typing`);
  showTypingIndicator(from);
});

// AFTER
socket.on('typing', ({ from, conversationId }) => {
  // Only show typing indicator if in the same conversation
  if (conversationId === currentConversationId) {
    console.log(`User ${from} is typing in conversation ${conversationId}`);
    showTypingIndicator(from);
  }
});

// ============================================
// 2. MESSAGE DELETION - Add new event listener
// ============================================

socket.on('message:deleted', ({ _id, conversation, deletedBy }) => {
  console.log(`Message ${_id} deleted by ${deletedBy} in conversation ${conversation}`);
  
  // Remove message from UI
  const messageElement = document.querySelector(`[data-message-id="${_id}"]`);
  if (messageElement) {
    messageElement.remove();
  }
  
  // Update message cache/store
  if (window.messageStore) {
    window.messageStore.delete(_id);
  }
  
  // If using Vue/React, update state
  // For Vue:
  // this.messages = this.messages.filter(m => m._id !== _id);
  
  // For React:
  // setMessages(prev => prev.filter(m => m._id !== _id));
});

// ============================================
// 3. MISSED MESSAGES - Sync on reconnection
// ============================================

// Store last sync time
let lastSyncTime = localStorage.getItem('lastSync') || new Date().toISOString();

// Handle socket connection/reconnection
socket.on('connect', () => {
  console.log('Socket connected, retrieving missed messages...');
  
  // Request missed messages since last sync
  socket.emit('get-missed-messages', { lastSync: lastSyncTime }, (response) => {
    if (response.ok) {
      console.log(`Retrieved ${response.count} missed messages`);
      
      // Process and display missed messages
      if (response.messages && response.messages.length > 0) {
        response.messages.forEach(message => {
          // Add message to UI/store
          addMessageToUI(message);
          
          // Show notification for missed messages
          if (Notification.permission === 'granted') {
            new Notification('New messages', {
              body: `You have ${response.count} new messages`,
              icon: '/icon.png'
            });
          }
        });
      }
      
      // Update last sync time
      lastSyncTime = new Date().toISOString();
      localStorage.setItem('lastSync', lastSyncTime);
    } else {
      console.error('Failed to retrieve missed messages:', response.error);
    }
  });
});

// Update last sync time when receiving new messages
socket.on('message:new', (message) => {
  lastSyncTime = new Date().toISOString();
  localStorage.setItem('lastSync', lastSyncTime);
  // ... rest of message handling
});

// ============================================
// 4. CONVERSATION ROOMS - Join conversations
// ============================================

// When opening a conversation, explicitly join its room
function openConversation(conversationId) {
  socket.emit('join-conversation', { conversationId }, (response) => {
    if (response.ok) {
      console.log(`Joined conversation ${conversationId}`);
      // Load conversation messages
      loadConversationMessages(conversationId);
    } else {
      console.error('Failed to join conversation:', response.error);
    }
  });
}

// ============================================
// 5. COMPLETE EXAMPLE - Full integration
// ============================================

class ChatClient {
  constructor() {
    this.socket = null;
    this.currentConversationId = null;
    this.lastSyncTime = localStorage.getItem('lastSync') || new Date().toISOString();
    this.typingTimers = new Map();
  }

  connect(token) {
    this.socket = io('http://localhost:4000', {
      auth: { token }
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('disconnect', () => this.handleDisconnect());

    // Message events
    this.socket.on('message:new', (msg) => this.handleNewMessage(msg));
    this.socket.on('message:updated', (msg) => this.handleMessageUpdated(msg));
    this.socket.on('message:deleted', (data) => this.handleMessageDeleted(data));
    this.socket.on('message:read', (data) => this.handleMessageRead(data));

    // Typing events
    this.socket.on('typing', (data) => this.handleTyping(data));
    this.socket.on('typing-stopped', (data) => this.handleTypingStopped(data));

    // User status events
    this.socket.on('user-online', (data) => this.handleUserOnline(data));
    this.socket.on('user-offline', (data) => this.handleUserOffline(data));
  }

  handleConnect() {
    console.log('Connected to server');
    this.syncMissedMessages();
  }

  handleDisconnect() {
    console.log('Disconnected from server');
  }

  syncMissedMessages() {
    this.socket.emit('get-missed-messages', 
      { lastSync: this.lastSyncTime }, 
      (response) => {
        if (response.ok && response.messages.length > 0) {
          console.log(`Synced ${response.count} missed messages`);
          response.messages.forEach(msg => this.handleNewMessage(msg, true));
        }
        this.updateLastSync();
      }
    );
  }

  handleNewMessage(message, isMissed = false) {
    console.log('New message received:', message);
    // Add to UI
    this.addMessageToUI(message);
    
    // Update last sync if not a missed message
    if (!isMissed) {
      this.updateLastSync();
    }
  }

  handleMessageUpdated(data) {
    console.log('Message updated:', data);
    const messageEl = document.querySelector(`[data-message-id="${data._id}"]`);
    if (messageEl) {
      messageEl.querySelector('.message-content').textContent = data.content;
      messageEl.classList.add('edited');
    }
  }

  handleMessageDeleted(data) {
    console.log('Message deleted:', data);
    const messageEl = document.querySelector(`[data-message-id="${data._id}"]`);
    if (messageEl) {
      messageEl.remove();
    }
  }

  handleMessageRead(data) {
    console.log('Message read:', data);
    const messageEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageEl) {
      messageEl.classList.add('read');
    }
  }

  handleTyping({ from, conversationId }) {
    if (conversationId !== this.currentConversationId) return;
    
    console.log(`User ${from} is typing`);
    this.showTypingIndicator(from);
  }

  handleTypingStopped({ from, conversationId }) {
    if (conversationId !== this.currentConversationId) return;
    
    console.log(`User ${from} stopped typing`);
    this.hideTypingIndicator(from);
  }

  handleUserOnline({ userId }) {
    console.log(`User ${userId} is now online`);
    const userEl = document.querySelector(`[data-user-id="${userId}"]`);
    if (userEl) {
      userEl.classList.add('online');
    }
  }

  handleUserOffline({ userId, lastSeen }) {
    console.log(`User ${userId} is now offline (last seen: ${lastSeen})`);
    const userEl = document.querySelector(`[data-user-id="${userId}"]`);
    if (userEl) {
      userEl.classList.remove('online');
    }
  }

  openConversation(conversationId) {
    this.currentConversationId = conversationId;
    this.socket.emit('join-conversation', { conversationId }, (response) => {
      if (response.ok) {
        console.log(`Joined conversation ${conversationId}`);
      }
    });
  }

  sendTypingIndicator() {
    if (!this.currentConversationId) return;
    
    this.socket.emit('typing', { 
      conversationId: this.currentConversationId 
    });
  }

  updateLastSync() {
    this.lastSyncTime = new Date().toISOString();
    localStorage.setItem('lastSync', this.lastSyncTime);
  }

  // UI helper methods (to be implemented)
  addMessageToUI(message) {
    // Implementation depends on your UI framework
    console.log('Adding message to UI:', message);
  }

  showTypingIndicator(userId) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.textContent = `User ${userId} is typing...`;
      indicator.style.display = 'block';
    }
  }

  hideTypingIndicator(userId) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }
}

// Usage example
const chatClient = new ChatClient();
const token = localStorage.getItem('token');
chatClient.connect(token);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatClient;
}
