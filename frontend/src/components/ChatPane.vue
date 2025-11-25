<!-- frontend/src/components/ChatPane.vue -->
<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 flex items-center justify-between border-b bg-white">
      <div class="flex items-center gap-3 min-w-0">
        <button type="button" @click="onAvatarClick" class="p-0 bg-transparent border-0 cursor-pointer">
          <Avatar :user="props.peer" />
        </button>
        <div class="min-w-0">
          <div class="font-medium truncate">{{ props.peer?.username }}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span :class="['px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap', props.peer?.status==='online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600']">
          <template v-if="props.peer && props.peer.isGroup">{{ props.peer?.status }} <span v-if="onlineCount">• {{ onlineCount }} en ligne</span></template>
          <template v-else>{{ props.peer?.status }}</template>
        </span>

        <template v-if="props.peer && props.peer.isGroup">
          <button @click="showAddMembersModal = true" class="text-gray-600 hover:text-gray-900" title="Ajouter des membres">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
            </svg>
          </button>
        </template>

        <template v-else>
          <div class="relative">
            <button @click="toggleMenu" class="text-gray-600 hover:text-gray-900" title="Actions">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            <div v-if="showMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
              <button @click="handleAddContact" class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">➕ Ajouter aux contacts</button>
              <button @click="handleChangeBackground" class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">🎨 Changer le fond</button>
              <button @click="handleBlockContact" class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-orange-600">🚫 Bloquer</button>
              <button @click="handleRemoveContact" class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600">🗑️ Supprimer</button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div ref="listRef" :style="{ 
      backgroundColor: bgColor,
      backgroundImage: bgImage ? `url(${bgImage})` : 'none',
      backgroundSize: '100% auto',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundAttachment: 'fixed'
    }" class="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 pb-28">
      <MessageBubble 
        v-for="m in messages" 
        :key="m._id" 
        :me="props.me" 
        :m="m" 
        @edit="handleEditMessage"
        @delete="handleDeleteMessage"
      />
    </div>

    <div v-show="typing" class="px-4 py-2 text-xs text-emerald-700 bg-emerald-50 border-t">en train d'écrire...</div>

    <div class="sticky bottom-0 z-10 border-t bg-white">
      <Composer :key="currentPeerId" @send="send" @send-file="sendFile" @typing="typingPing" :disabled="false" />
    </div>

    <GroupModal v-if="showGroupModal" :conversationId="props.peer._id" :token="props.token" :currentUser="props.me" @close="() => { showGroupModal = false }" @updated="onGroupUpdated" @left="onGroupLeft" />
    <AddMembersModal v-if="showAddMembersModal" :conversationId="props.peer._id" :token="props.token" @close="() => { showAddMembersModal = false }" @added="onMemberAdded" />
    
    <!-- Modal de sélection de couleur -->
    <div v-if="showColorPicker" @click.self="showColorPicker = false" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-[500px] max-w-[90vw]">
        <h3 class="text-lg font-semibold mb-4">Choisir une couleur de fond</h3>
        
        <!-- Images de fond -->
        <div class="mb-6">
          <h4 class="text-sm font-medium mb-2">Images:</h4>
          <div class="grid grid-cols-3 gap-3">
            <button v-for="img in availableImages" :key="img" @click="selectImage(img)" class="relative h-20 rounded-lg border-2 hover:border-emerald-500 transition-colors overflow-hidden">
              <img :src="img" alt="Background" class="w-full h-full object-cover" />
            </button>
          </div>
        </div>
        
        <!-- Couleurs -->
        <div class="mb-6">
          <h4 class="text-sm font-medium mb-2">Couleurs:</h4>
          <div class="grid grid-cols-4 gap-3">
            <button v-for="color in predefinedColors" :key="color.value" @click="selectColor(color.value)" :style="{ backgroundColor: color.value }" :title="color.name" class="w-full h-12 rounded-lg border-2 hover:border-emerald-500 transition-colors"></button>
          </div>
        </div>
        
        <!-- Couleur personnalisée -->
        <div class="flex items-center gap-2 mb-4">
          <label class="text-sm font-medium">Personnalisée:</label>
          <input type="color" v-model="customColor" class="w-16 h-10 rounded cursor-pointer" />
          <button @click="selectColor(customColor)" class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">Appliquer</button>
        </div>
        <button @click="showColorPicker = false" class="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch, computed, nextTick, watchEffect } from "vue"
import Avatar from "./Avatar.vue"
import GroupModal from "./GroupModal.vue"
import AddMembersModal from "./AddMembersModal.vue"
import Composer from "./Composer.vue"
import MessageBubble from "./MessageBubble.vue"
import { api, uploadFile, addContact, blockContact as apiBlockContact, removeContact as apiRemoveContact } from "../lib/api.js"

const props = defineProps({ me: Object, peer: Object, token: String, socket: Object })

const messages = ref([])
const page = ref(1)
const showMenu = ref(false)
const showGroupModal = ref(false)
const showAddMembersModal = ref(false)
const hasMore = ref(true)
const typing = ref(false)
const listRef = ref(null)
const currentPeerId = ref(null)
const loadedFor = ref(null)
const socketReady = computed(() => !!(props.socket && props.socket.connected))
const onlineCount = ref(0)
const showColorPicker = ref(false)
const customColor = ref('#ffffff')
const bgColor = ref('#f9fafb')
const bgImage = ref('')
const conversationId = ref(null)
const availableImages = ref([])

const predefinedColors = [
  { name: 'Gris clair', value: '#f9fafb' },
  { name: 'Bleu clair', value: '#dbeafe' },
  { name: 'Vert clair', value: '#dcfce7' },
  { name: 'Jaune clair', value: '#fef3c7' },
  { name: 'Rose clair', value: '#fce7f3' },
  { name: 'Violet clair', value: '#ede9fe' },
  { name: 'Orange clair', value: '#fed7aa' },
  { name: 'Beige', value: '#fef5e7' }
]

// Charger les images disponibles
function loadAvailableImages() {
  // Liste statique des images disponibles
  availableImages.value = [
    '/images/kamehouse.svg',
    '/images/kamehouse.jpg'
  ]
}

async function loadGroupStatus() {
  try {
    if (!props.peer || !props.peer.isGroup) { onlineCount.value = 0; return }
    const conv = await api(`/api/conversations/${props.peer._id}`, { token: props.token })
    const groupId = conv && conv.group ? (conv.group._id || conv.group) : null
    if (!groupId) { onlineCount.value = 0; return }
    const group = await api(`/api/groups/${groupId}`, { token: props.token })
    if (!group || !group.members) { onlineCount.value = 0; return }
    const count = group.members.reduce((acc, m) => {
      const u = m.user
      const status = (typeof u === 'object') ? u.status : null
      return acc + (status === 'online' ? 1 : 0)
    }, 0)
    onlineCount.value = count
  } catch (e) {
    onlineCount.value = 0
  }
}

function scrollBottom() {
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}
function atBottom() {
  const el = listRef.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

async function load(p=1){
  let data
  // If peer is a group, props.peer._id is the conversation id
  if (props.peer && props.peer.isGroup) {
    data = await api(`/api/messages/conversation/${props.peer._id}?page=${p}&limit=30`, { token: props.token })
    conversationId.value = props.peer._id
  } else {
    data = await api(`/api/messages/${props.peer?._id}?page=${p}&limit=30`, { token: props.token })
  }
  
  // Charger les infos de conversation pour obtenir la couleur de fond
  if (p === 1 && props.peer?._id) {
    try {
      let convId = conversationId.value
      if (!props.peer.isGroup) {
        const conv = await api('/api/conversations/direct', { method: 'POST', token: props.token, body: { participantId: props.peer._id } })
        convId = conv && conv._id ? conv._id : null
        conversationId.value = convId
      }
      
      if (convId) {
        const convData = await api(`/api/conversations/${convId}`, { token: props.token })
        if (convData && convData.backgroundImage) {
          bgImage.value = convData.backgroundImage
          bgColor.value = '#f9fafb'
        } else if (convData && convData.backgroundColor) {
          bgColor.value = convData.backgroundColor
          bgImage.value = ''
        } else {
          bgColor.value = '#f9fafb'
          bgImage.value = ''
        }
      }
    } catch (e) {
      bgColor.value = '#f9fafb'
      bgImage.value = ''
    }
  }
  
  const raw = data && (data.items || data.messages) ? (data.items || data.messages) : []
  const isConversationShape = !!(data && data.messages)
  const itemsAscending = isConversationShape ? raw : raw.slice().reverse()

  const normalize = (msg) => {
    const m = { ...msg }
    if (m.sender && typeof m.sender === 'object') m.sender = m.sender._id || m.sender.id || m.sender
    if (m.recipient && typeof m.recipient === 'object') m.recipient = m.recipient._id || m.recipient.id || m.recipient
    if (m.conversation && typeof m.conversation === 'object') m.conversation = m.conversation._id || m.conversation.id || m.conversation
    if (m.group && typeof m.group === 'object') m.group = m.group._id || m.group.id || m.group
    return m
  }

  const normalizedItems = itemsAscending.map(normalize)

  if (p === 1) {
    messages.value = normalizedItems
    await nextTick()
    scrollBottom()

    try {
      if (props.peer && props.peer._id) {
        let convId = null
        if (props.peer.isGroup) {
          convId = props.peer._id
        } else {
          try {
            const conv = await api('/api/conversations/direct', { method: 'POST', token: props.token, body: { participantId: props.peer._id } })
            convId = conv && conv._id ? conv._id : null
          } catch (err) {
            console.warn('could not ensure direct conversation id', err && err.message)
          }
        }

        if (convId) {
          await api(`/api/conversations/${convId}/mark-read`, { method: 'POST', token: props.token })
        }
      }
    } catch (e) {
      console.warn('mark-read failed', e && e.message)
    }
  } else {
    const el = listRef.value
    const prev = el ? el.scrollHeight : 0
    messages.value = [...normalizedItems, ...messages.value]
    await nextTick()
    if (el) el.scrollTop = el.scrollHeight - prev
  }

  if (raw.length < 30) hasMore.value = false
}

watch(() => props.peer?._id, async (id) => {
  currentPeerId.value = id ? String(id) : null
  page.value = 1
  hasMore.value = true
  messages.value = []
  loadedFor.value = null
  // refresh the online count for groups
  await loadGroupStatus()
})

watchEffect(async () => {
  if (currentPeerId.value && loadedFor.value !== currentPeerId.value) {
    await load(1)
    loadedFor.value = currentPeerId.value
  }
})

function onScroll(){
  const el = listRef.value
  if (!el) return
  if (el.scrollTop < 50 && hasMore.value){
    const next = page.value + 1
    page.value = next
    load(next)
  }
}

onMounted(() => {
  const el = listRef.value
  if (el) el.addEventListener('scroll', onScroll)
  if (props.peer?._id) {
    currentPeerId.value = String(props.peer._id)
    loadedFor.value = null
  }
  scrollBottom()
})
onUnmounted(() => {
  const el = listRef.value
  if (el) el.removeEventListener('scroll', onScroll)
})

function onMsg(message){
  const pid = currentPeerId.value
  if (!pid) return
  const sId = String(message.sender)
  const rId = message.recipient ? String(message.recipient) : null
  const convId = message.conversation ? String(message.conversation) : null

  const matches = sId === pid || rId === pid || convId === pid
  if (matches) {
    const stick = atBottom() || String(message.sender) === String(props.me._id)
    if (message.clientId) {
      const idx = messages.value.findIndex(x => x.clientId && x.clientId === message.clientId)
      if (idx !== -1) messages.value.splice(idx, 1)
    }
    if (!messages.value.find(x => String(x._id) === String(message._id))) {
      messages.value = [...messages.value, message]
      if (stick) scrollBottom()
    }
  }
}

function onTyping(evt){ if (evt.from === currentPeerId.value) typing.value = true }
function onTypingStopped(evt){ if (evt.from === currentPeerId.value) typing.value = false }

function onMessageUpdated(data) {
  const msg = messages.value.find(m => String(m._id) === String(data._id));
  if (msg) {
    msg.content = data.content;
    msg.edited = data.edited;
    msg.editedAt = data.editedAt;
  }
}

watch(() => props.socket, (s) => {
  if (!s) return
  const hMsg = (m) => onMsg(m)
  const hTyping = (e) => onTyping(e)
  const hTypingStop = (e) => onTypingStopped(e)
  const hMsgUpdated = (data) => onMessageUpdated(data)
  s.on('message:new', hMsg)
  s.on('message:updated', hMsgUpdated)
  s.on('typing', hTyping)
  s.on('typing-stopped', hTypingStop)
  const hStatus = (payload) => {
    // payload: { userId, status }
    if (props.peer && props.peer.isGroup) loadGroupStatus().catch(()=>{})
  }
  s.on('user-status', hStatus)
  return () => {
    s.off('message:new', hMsg)
    s.off('message:updated', hMsgUpdated)
    s.off('typing', hTyping)
    s.off('typing-stopped', hTypingStop)
    s.off('user-status', hStatus)
  }
}, { immediate: true })

// Group modal handlers
function onGroupUpdated(updated) {
  if (updated && updated._id && props.peer && props.peer._id && String(updated._id) === String(props.peer._id)) {
    props.peer.username = updated.name
  }
  showGroupModal.value = false
}

function onGroupLeft(groupId) {
  if (props.peer && props.peer._id && String(props.peer._id) === String(groupId)) {
    try { props.socket && props.socket.emit('left-group', { groupId }) } catch {}
  }
}

function onMemberAdded(user) {
  // close modal and optionally refresh group data
  showAddMembersModal.value = false
}

async function send(content){
  const clientId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now())
  const local = {
    _id: `local-${clientId}`,
    clientId,
    sender: String(props.me._id),
    recipient: String(props.peer._id),
    content,
    createdAt: new Date().toISOString(),
    status: 'sent',
    edited: false,
    deleted: false
  }
  messages.value = [...messages.value, local]
  await nextTick()
  scrollBottom()
  try {
    const body = props.peer.isGroup ? { conversation_id: props.peer._id, content, clientId } : { recipient_id: props.peer._id, content, clientId }
    await api(`/api/messages`, { method: 'POST', token: props.token, body })
  } catch(e) {}
}

async function sendFile(file){
  if (!file || !props.peer?._id) return;

  const baseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const clientId = baseId + '-file';

  const mime = file.type || '';
  let type = 'file';
  if (mime.startsWith('image/')) type = 'image';
  else if (mime.startsWith('video/')) type = 'video';

  const local = {
    _id: `local-${clientId}`,
    clientId,
    sender: String(props.me._id),
    recipient: String(props.peer._id),
    content: file.name,
    type,
    mediaUrl: null,
    mediaName: file.name,
    mediaSize: file.size,
    mediaMimeType: mime,
    createdAt: new Date().toISOString(),
    status: 'sent',
    edited: false,
    deleted: false
  };

  messages.value = [...messages.value, local];
  await nextTick();
  scrollBottom();

  try {
    const uploaded = await uploadFile(props.token, file);
    const common = {
      content: file.name,
      clientId,
      type,
      mediaUrl: uploaded.url,
      mediaName: uploaded.originalName || file.name,
      mediaSize: uploaded.size,
      mediaMimeType: uploaded.mimeType || mime
    };
    const body = props.peer.isGroup 
      ? { ...common, conversation_id: props.peer._id } 
      : { ...common, recipient_id: props.peer._id };
    await api(`/api/messages`, { method: 'POST', token: props.token, body });
  } catch (e) {
    const idx = messages.value.findIndex(x => x.clientId === clientId);
    if (idx !== -1) {
      messages.value.splice(idx, 1);
    }
    console.error(e);
  }
}

function typingPing(){
  if (props.socket && props.socket.connected) {
    props.socket.emit('typing', { to: props.peer._id })
  }
}

function toggleMenu() { showMenu.value = !showMenu.value }

function onAvatarClick() {
  if (props && props.peer && props.peer.isGroup) showGroupModal.value = true
}

async function handleAddContact() {
  showMenu.value = false
  try {
    await addContact(props.token, props.peer._id)
    alert('Contact ajouté avec succès')
  } catch (e) {
    alert('Erreur: ' + e.message)
  }
}

async function handleBlockContact() {
  showMenu.value = false
  if (!confirm(`Bloquer ${props.peer.username} ?`)) return
  try {
    await apiBlockContact(props.token, props.peer._id)
    alert('Contact bloqué')
  } catch (e) {
    alert('Erreur: ' + e.message)
  }
}

async function handleRemoveContact() {
  showMenu.value = false
  if (!confirm(`Supprimer ${props.peer.username} de vos contacts ?`)) return
  try {
    await apiRemoveContact(props.token, props.peer._id)
    alert('Contact supprimé')
  } catch (e) {
    alert('Erreur: ' + e.message)
  }
}

function handleChangeBackground() {
  showMenu.value = false
  loadAvailableImages()
  showColorPicker.value = true
}

async function selectColor(color) {
  if (!conversationId.value) {
    alert('Impossible de changer la couleur pour cette conversation')
    return
  }
  
  try {
    await api(`/api/conversations/${conversationId.value}/background-color`, {
      method: 'POST',
      token: props.token,
      body: { color }
    })
    bgColor.value = color
    bgImage.value = ''
    showColorPicker.value = false
  } catch (e) {
    alert('Erreur: ' + e.message)
  }
}

async function selectImage(image) {
  if (!conversationId.value) {
    alert('Impossible de changer l\'image pour cette conversation')
    return
  }
  
  try {
    await api(`/api/conversations/${conversationId.value}/background-color`, {
      method: 'POST',
      token: props.token,
      body: { image }
    })
    bgImage.value = image
    bgColor.value = '#f9fafb'
    showColorPicker.value = false
  } catch (e) {
    alert('Erreur: ' + e.message)
  }
}

async function handleEditMessage({ messageId, content }) {
  try {
    await api(`/api/messages/${messageId}`, {
      method: 'PUT',
      token: props.token,
      body: { content }
    });
    
    // Update local message
    const msg = messages.value.find(m => String(m._id) === String(messageId));
    if (msg) {
      msg.content = content;
      msg.edited = true;
    }
  } catch (e) {
    alert('Erreur lors de la modification: ' + e.message);
  }
}

async function handleDeleteMessage(messageId) {
  if (!confirm('Supprimer ce message ?')) return;
  
  try {
    await api(`/api/messages/${messageId}`, {
      method: 'DELETE',
      token: props.token
    });
    
    // Update local message
    const msg = messages.value.find(m => String(m._id) === String(messageId));
    if (msg) {
      msg.deleted = true;
    }
  } catch (e) {
    alert('Erreur lors de la suppression: ' + e.message);
  }
}

// Fermer le menu si on clique ailleurs
onMounted(() => {
  const closeMenu = (e) => {
    if (showMenu.value && !e.target.closest('button')) {
      showMenu.value = false
    }
  }
  document.addEventListener('click', closeMenu)
  return () => document.removeEventListener('click', closeMenu)
})
</script>
