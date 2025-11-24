<!-- frontend/src/components/Sidebar.vue -->
<template>
  <aside class="w-full h-full bg-white border-r">
    <div class="px-3 py-2 border-b">
      <div class="flex items-center gap-3">
        <Avatar :user="me" />
        <div class="flex-1 min-w-0">
          <div class="font-semibold truncate">{{ me.username }}</div>
          <div class="text-xs text-gray-500 truncate">{{ me.email || 'Compte' }}</div>
        </div>
        <button @click="showAddContact = true" class="text-emerald-600 hover:text-emerald-700" title="Ajouter un contact">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button @click="$emit('openSettings')" class="text-gray-600 hover:text-gray-900" title="Paramètres">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button @click="showCreateGroup = true" class="text-emerald-600 hover:text-emerald-700" title="Créer un groupe">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v8m0 0v8m0-8h8m-8 0H4" />
          </svg>
        </button>
      </div>
      <div class="mt-3">
        <input class="w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm" placeholder="Rechercher un contact" v-model="query" />
      </div>
      <div class="mt-2 text-right">
        <button @click="logout" class="text-xs text-gray-600 underline">Déconnexion</button>
      </div>
    </div>

    <ul class="divide-y max-h-[calc(100%-120px)] overflow-y-auto">
      <li v-if="allChats.length === 0" class="px-3 py-8 text-center text-gray-500">
        <p class="text-sm">Aucune conversation</p>
        <button @click="showAddContact = true" class="mt-2 text-emerald-600 hover:underline text-sm">
          Commencer un nouveau chat
        </button>
      </li>
      <li
        v-for="u in filtered"
        :key="u._id"
        @click="() => { clearUnreadFor(u._id); onSelectPeer(u) }"
        :class="[
          'px-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors',
          currentPeer?._id===u._id ? 'bg-emerald-100' : (unread(u._id) ? 'bg-emerald-50' : '')
        ]"
      >
        <div class="flex items-center gap-3">
          <Avatar :user="u" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span :class="['truncate', unread(u._id) ? 'font-semibold' : 'font-medium']">{{ u.username }}</span>
              <span
                :class="[
                  'ml-auto px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap',
                  u.status==='online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                ]"
              >
                {{ u.status }}
              </span>
            </div>
            <div class="text-xs truncate">
              <span v-if="isTyping(u._id)" class="text-emerald-600">en train d’écrire...</span>
              <span v-else class="text-gray-500">{{ u.lastSeen ? 'Vu ' + new Date(u.lastSeen).toLocaleString() : 'Jamais' }}</span>
            </div>
          </div>

          <div v-if="unread(u._id)" class="ml-2 shrink-0 text-xs text-white bg-emerald-500 rounded-full px-2 py-0.5">
            {{ unread(u._id) }}
          </div>
        </div>
      </li>
    </ul>

    <!-- Modal d'ajout de contact -->
    <div v-if="showAddContact" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeAddContact">
      <div class="bg-white rounded-lg w-full max-w-md mx-4 p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">Ajouter un contact</h2>
          <button @click="closeAddContact" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="mb-4">
          <input 
            v-model="searchQuery" 
            @input="searchUsers"
            class="w-full rounded-lg border px-3 py-2 text-sm" 
            placeholder="Rechercher un utilisateur..."
          />
        </div>

        <div v-if="searching" class="text-center py-4 text-gray-500">
          Recherche...
        </div>

        <div v-else-if="searchResults.length === 0 && searchQuery" class="text-center py-4 text-gray-500">
          Aucun utilisateur trouvé
        </div>

        <ul v-else class="space-y-2 max-h-64 overflow-y-auto">
          <li 
            v-for="user in searchResults" 
            :key="user._id"
            class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
          >
            <Avatar :user="user" />
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">{{ user.username }}</div>
              <div class="text-xs text-gray-500">{{ user.status || 'offline' }}</div>
            </div>
            <button 
              @click="addContact(user._id)"
              :disabled="addingContact === user._id"
              class="px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50"
            >
              {{ addingContact === user._id ? 'Ajout...' : 'Ajouter' }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </aside>
  <CreateGroup
    v-if="showCreateGroup"
    :contacts="contacts"
    :token="props.token"
    :me="props.me"
    @created="(g) => { refreshAll(); showCreateGroup = false }"
    @close="() => { showCreateGroup = false }"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue"
import Avatar from "./Avatar.vue"
import CreateGroup from "./CreateGroup.vue"
import { api } from "../lib/api.js"

const props = defineProps({ me: Object, token: String, onSelectPeer: Function, currentPeer: Object, socket: Object })

const contacts = ref([])
const conversations = ref([])
const query = ref("")
const typingMap = ref({})
const unreadMap = ref({})

// Modal d'ajout de contact
const showAddContact = ref(false)
const showCreateGroup = ref(false)
const searchQuery = ref("")
const searchResults = ref([])
const searching = ref(false)
const addingContact = ref(null)
let searchTimeout = null

function isTyping(id){ return !!typingMap.value[id] }
function unread(id){ return unreadMap.value[id] || 0 }
function clearUnreadFor(id){ unreadMap.value = { ...unreadMap.value, [id]: 0 } }

async function loadContacts() {
  try {
    const data = await api(`/api/contacts`, { token: props.token })
    contacts.value = data.map(c => c.contact).filter(u => u && u._id !== props.me._id)
  } catch (e) {
    console.error('Erreur chargement contacts:', e)
    contacts.value = []
  }
}

async function loadConversations() {
  try {
    // Use /api/conversations which returns both direct and group conversations
    const convos = await api(`/api/conversations`, { token: props.token })
    // Normalize to the previous shape: { otherUser, unread }
    const normalized = convos.map(c => {
      if (c.type === 'group' && c.group) {
        return {
          _id: String(c._id),
          otherUser: { _id: String(c._id), username: c.group.name, avatar: c.group.avatar, isGroup: true },
          unread: c.unreadCount || 0,
          conversationId: c._id,
          raw: c
        }
      } else {
        // direct: find the other participant
        const other = (c.participants || []).find(p => String(p._id) !== String(props.me._id))
        return {
          _id: other ? String(other._id) : String(c._id),
          otherUser: other ? { _id: String(other._id), username: other.username, avatar: other.avatar, status: other.status } : { _id: String(c._id), username: 'Conversation' },
          unread: c.unreadCount || 0,
          conversationId: c._id,
          raw: c
        }
      }
    })

    conversations.value = normalized
    const map = {}
    for (const c of normalized) {
      map[c.otherUser._id] = c.unread || 0
    }
    unreadMap.value = map
  } catch (e) {
    console.error('Erreur chargement conversations:', e)
    conversations.value = []
  }
}

async function loadUnread() {
  try {
    const convos = await api(`/api/conversations`, { token: props.token })
    const map = {}
    for (const c of convos) {
      if (c.type === 'group' && c.group) map[String(c._id)] = c.unreadCount || 0
      else {
        const other = (c.participants || []).find(p => String(p._id) !== String(props.me._id))
        if (other) map[String(other._id)] = c.unreadCount || 0
      }
    }
    unreadMap.value = map
  } catch {}
}

async function refreshAll(){ 
  await loadConversations()
  await loadContacts()
}

async function searchUsers() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const results = await api(`/api/users/search?q=${encodeURIComponent(searchQuery.value)}`, { token: props.token })
      // Filtrer l'utilisateur connecté et les contacts existants
      const contactIds = contacts.value.map(c => c._id)
      searchResults.value = results.filter(u => u._id !== props.me._id && !contactIds.includes(u._id))
    } catch (e) {
      console.error('Erreur recherche:', e)
      searchResults.value = []
    }
    searching.value = false
  }, 300)
}

async function addContact(userId) {
  addingContact.value = userId
  try {
    await api('/api/contacts', {
      method: 'POST',
      token: props.token,
      body: { contact_id: userId }
    })
    await loadContacts()
    await loadConversations()
    closeAddContact()
  } catch (e) {
    console.error('Erreur ajout contact:', e)
    alert('Erreur lors de l\'ajout du contact')
  }
  addingContact.value = null
}

function closeAddContact() {
  showAddContact.value = false
  searchQuery.value = ""
  searchResults.value = []
}

// Fusionner les conversations et les contacts pour afficher tous les chats disponibles
const allChats = computed(() => {
  const chatMap = new Map()
  
  // Ajouter toutes les conversations actives
  conversations.value.forEach(convo => {
    if (convo.otherUser && convo.otherUser._id) {
      chatMap.set(convo.otherUser._id, {
        ...convo.otherUser,
        hasConversation: true
      })
    }
  })
  
  // Ajouter les contacts qui n'ont pas encore de conversation
  contacts.value.forEach(contact => {
    if (contact && contact._id && !chatMap.has(contact._id)) {
      chatMap.set(contact._id, {
        ...contact,
        hasConversation: false
      })
    }
  })
  
  return Array.from(chatMap.values())
})

onMounted(refreshAll)

watch(() => props.currentPeer?._id, async (id) => {
  if (id) clearUnreadFor(String(id))
  await loadUnread()
})

watch(() => props.socket, (s) => {
  if (!s) return
  const onTyping = ({ from }) => { typingMap.value = { ...typingMap.value, [from]: true } }
  const onTypingStop = ({ from }) => { const m = { ...typingMap.value }; delete m[from]; typingMap.value = m }
  const onStatus = () => refreshAll()
  const onNew = (m) => {
    const from = String(m.sender)
    const meId = String(props.me._id)
    const activeId = String(props.currentPeer?._id || '')
    // If message belongs to a conversation (group), use conversation id as key
    if (m.conversation) {
      const convId = String(m.conversation)
      if (convId === activeId) clearUnreadFor(convId)
      else unreadMap.value = { ...unreadMap.value, [convId]: (unreadMap.value[convId] || 0) + 1 }
    } else {
      if (from !== meId) {
        if (from === activeId) clearUnreadFor(from)
        else unreadMap.value = { ...unreadMap.value, [from]: (unreadMap.value[from] || 0) + 1 }
      }
    }
    // Recharger les conversations pour afficher le nouveau chat
    loadConversations()
  }
  s.on('typing', onTyping)
  s.on('typing-stopped', onTypingStop)
  s.on('user-status', onStatus)
  s.on('message:new', onNew)
  return () => {
    s.off('typing', onTyping)
    s.off('typing-stopped', onTypingStop)
    s.off('user-status', onStatus)
    s.off('message:new', onNew)
  }
}, { immediate: true })

async function logout(){
  try { await api('/api/auth/logout', { method: 'POST', token: props.token }) } catch {}
  window.location.reload()
}

const filtered = computed(() => {
  if (!query.value) return allChats.value
  const q = query.value.toLowerCase()
  return allChats.value.filter(u => u.username.toLowerCase().includes(q))
})
</script>
