<!-- frontend/src/components/ChatPane.vue -->
<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 flex items-center justify-between border-b bg-white">
      <div class="flex items-center gap-3 min-w-0">
        <Avatar :user="peer" />
        <div class="min-w-0">
          <div class="font-medium truncate">{{ peer.username }}</div>
        </div>
      </div>
      <span :class="['px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap', peer.status==='online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600']">
        {{ peer.status }}
      </span>
    </div>

    <div ref="listRef" class="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-2 pb-28">
      <MessageBubble v-for="m in messages" :key="m._id" :me="me" :m="m" />
    </div>

    <div v-show="typing" class="px-4 py-2 text-xs text-emerald-700 bg-emerald-50 border-t">
      en train d’écrire...
    </div>

    <div class="sticky bottom-0 z-10 border-t bg-gray-50">
      <Composer :key="currentPeerId" @send="send" @send-file="sendFile" @typing="typingPing" :disabled="!socketReady || !peer" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch, computed, nextTick, watchEffect } from "vue"
import Avatar from "./Avatar.vue"
import Composer from "./Composer.vue"
import MessageBubble from "./MessageBubble.vue"
import { api, uploadFile } from "../lib/api.js"

const props = defineProps({ me: Object, peer: Object, token: String, socket: Object })

const messages = ref([])
const page = ref(1)
const hasMore = ref(true)
const typing = ref(false)
const listRef = ref(null)
const currentPeerId = ref(null)
const loadedFor = ref(null)
const socketReady = computed(() => !!(props.socket && props.socket.connected))

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
  const data = await api(`/api/messages/${props.peer._id}?page=${p}&limit=30`, { token: props.token })
  if (p===1) {
    messages.value = data.items.reverse()
    await nextTick()
    scrollBottom()
  } else {
    const el = listRef.value
    const prev = el ? el.scrollHeight : 0
    messages.value = [...data.items.reverse(), ...messages.value]
    await nextTick()
    if (el) el.scrollTop = el.scrollHeight - prev
  }
  if (data.items.length < 30) hasMore.value = false
}

watch(() => props.peer?._id, async (id) => {
  currentPeerId.value = id ? String(id) : null
  page.value = 1
  hasMore.value = true
  messages.value = []
  loadedFor.value = null
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
  const rId = String(message.recipient)
  if (sId === pid || rId === pid) {
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

watch(() => props.socket, (s) => {
  if (!s) return
  const hMsg = (m) => onMsg(m)
  const hTyping = (e) => onTyping(e)
  const hTypingStop = (e) => onTypingStopped(e)
  s.on('message:new', hMsg)
  s.on('typing', hTyping)
  s.on('typing-stopped', hTypingStop)
  return () => {
    s.off('message:new', hMsg)
    s.off('typing', hTyping)
    s.off('typing-stopped', hTypingStop)
  }
}, { immediate: true })

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
    await api(`/api/messages`, {
      method: 'POST',
      token: props.token,
      body: { recipient_id: props.peer._id, content, clientId }
    })
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
    const uploaded = await uploadFile("/api/upload", { token: props.token, file });
    const body = {
      recipient_id: props.peer._id,
      content: file.name,
      clientId,
      type,
      mediaUrl: uploaded.url,
      mediaName: uploaded.originalName || file.name,
      mediaSize: uploaded.size,
      mediaMimeType: uploaded.mimeType || mime
    };
    await api(`/api/messages`, {
      method: 'POST',
      token: props.token,
      body
    });
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
</script>
