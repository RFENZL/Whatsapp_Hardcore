<!-- frontend/src/App.vue (section v-else) -->
<template>
  <div v-if="!auth?.token" class="w-full h-screen grid place-items-center bg-gray-100">
    <div class="w-full max-w-md bg-white rounded-2xl shadow p-6">
      <div class="flex mb-6">
        <button :class="['flex-1 py-2 rounded-xl', tab==='login'?'bg-emerald-500 text-white':'bg-gray-100']" @click="tab='login'">Connexion</button>
        <button :class="['flex-1 py-2 rounded-xl ml-2', tab==='register'?'bg-emerald-500 text-white':'bg-gray-100']" @click="tab='register'">Inscription</button>
      </div>
      <form @submit.prevent="submit" class="space-y-3">
        <input class="w-full border rounded-xl px-3 py-2" placeholder="Email" v-model="email" />
        <input v-if="tab==='register'" class="w-full border rounded-xl px-3 py-2" placeholder="Nom d'utilisateur" v-model="username" />
        <input type="password" class="w-full border rounded-xl px-3 py-2" placeholder="Mot de passe" v-model="password" />
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button type="submit" :disabled="loading" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 font-medium">{{ loading ? '...' : tab==='register' ? 'Créer le compte' : 'Se connecter' }}</button>
      </form>
    </div>
  </div>
  <div v-else class="w-full h-screen overflow-hidden grid grid-cols-12">
    <div class="col-span-4 xl:col-span-3 bg-white border-r h-screen sticky top-0 overflow-y-auto">
      <Sidebar :me="auth.user" :token="auth.token" :onSelectPeer="setPeer" :currentPeer="peer" :socket="socket" @openSettings="showSettings = true" />
    </div>
    <div class="col-span-8 xl:col-span-9 bg-gray-100 h-screen overflow-hidden">
      <Settings v-if="showSettings" :me="auth.user" :token="auth.token" @close="showSettings = false" @accountDeleted="onAccountDeleted" @profileUpdated="onProfileUpdated" />
      <div v-else-if="!peer" class="h-full grid place-items-center text-gray-500">
        <div class="text-center">
          <div class="text-3xl font-semibold mb-2">WhatsApp-like Chat</div>
          <p>Choisissez un contact à gauche pour démarrer la conversation.</p>
          <button @click="logout" class="mt-4 text-sm text-gray-600 underline">Se déconnecter</button>
        </div>
      </div>
      <ChatPane v-else :me="auth.user" :peer="peer" :token="auth.token" :socket="socket" />
    </div>
  </div>
</template>
<script setup>
import { onMounted } from 'vue'
import { ref, watch } from "vue"
import Sidebar from "./components/Sidebar.vue"
import ChatPane from "./components/ChatPane.vue"
import Settings from "./components/Settings.vue"
import { useLocalStorage } from "./lib/storage.js"
import { api } from "./lib/api.js"
import { createSocket } from "./lib/socket.js"
const auth = useLocalStorage("tpchat_auth", null)
const peer = ref(null)
const socket = ref(null)
const showSettings = ref(false)
const tab = ref("login")
const email = ref("")
const username = ref("")
const password = ref("")
const loading = ref(false)
const error = ref("")
function setPeer(u){ peer.value = u }
async function submit(){
  error.value = ""; loading.value = true
  try {
    let data
    if (tab.value === "register") data = await api("/api/auth/register", { method: "POST", body: { email: email.value, username: username.value, password: password.value } })
    else data = await api("/api/auth/login", { method: "POST", body: { email: email.value, password: password.value } })
    auth.value = { token: data.token, user: data.user }
    socket.value = createSocket(auth.value.token)
  } catch (e) {
    error.value = e.message
  } finally { loading.value = false }
}
async function logout(){
  try { await api("/api/auth/logout", { method: "POST", token: auth.value?.token }) } catch {}
  auth.value = null
  socket.value && socket.value.close()
}
function onAccountDeleted(){
  alert('Votre compte a été supprimé')
  auth.value = null
  socket.value && socket.value.close()
  window.location.reload()
}
function onProfileUpdated(updatedUser){
  // Update the user object properties directly to maintain reactivity
  if (auth.value && auth.value.user) {
    auth.value.user.username = updatedUser.username
    auth.value.user.avatar = updatedUser.avatar
    auth.value.user.status = updatedUser.status
    auth.value.user.lastSeen = updatedUser.lastSeen
  }
}
watch(() => auth.value?.token, (t) => { if (t) socket.value = createSocket(t) })
onMounted(() => { const t = auth.value?.token; if (t) socket.value = createSocket(t) })
</script>
