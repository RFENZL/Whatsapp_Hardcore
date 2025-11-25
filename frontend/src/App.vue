<!-- frontend/src/App.vue (section v-else) -->
<template>
  <!-- Écran de chargement pendant la vérification de la session -->
  <div v-if="isCheckingAuth" class="w-full h-screen grid place-items-center bg-gray-100">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
      <p class="mt-4 text-gray-600">Chargement...</p>
    </div>
  </div>
  <div v-else-if="!auth || !auth.user" class="w-full h-screen grid place-items-center bg-gradient-to-br from-emerald-50 to-teal-100">
    <div class="flex flex-col md:flex-row items-center justify-center gap-8 px-4 w-full max-w-5xl">
      <!-- Image de collaboration -->
      <div class="hidden md:block flex-1 max-w-md">
        <img src="/images/kamehouse.svg" alt="Collaboration" class="w-full h-auto drop-shadow-lg" />
      </div>
      
      <!-- Formulaire de connexion -->
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold text-gray-800 mb-2">WhatsApp-like Chat</h1>
          <p class="text-gray-600 text-sm">Connectez-vous pour commencer à discuter</p>
        </div>
        
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
  </div>
  <div v-else class="w-full h-screen overflow-hidden grid grid-cols-12">
    <div class="col-span-4 xl:col-span-3 bg-white border-r h-screen sticky top-0 overflow-y-auto">
      <Sidebar :me="auth.user" :onSelectPeer="setPeer" :currentPeer="peer" :socket="socket" @openSettings="showSettings = true" />
    </div>
    <div class="col-span-8 xl:col-span-9 bg-gray-100 h-screen overflow-hidden">
      <Settings v-if="showSettings" :me="auth.user" @close="showSettings = false" @accountDeleted="onAccountDeleted" @profileUpdated="onProfileUpdated" />
      <div v-else-if="!peer" class="h-full grid place-items-center text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100">
        <div class="text-center px-4">
          <div class="text-3xl font-semibold mb-2 text-gray-700">WhatsApp-like Chat</div>
          <p class="text-gray-600 mb-6">Choisissez un contact à gauche pour démarrer la conversation.</p>
          <button @click="logout" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline">Se déconnecter</button>
        </div>
      </div>
      <ChatPane v-else :me="auth.user" :peer="peer" :socket="socket" />
    </div>
  </div>
</template>
<script setup>
import { onMounted } from 'vue'
import { ref, watch } from "vue"
import Sidebar from "./components/Sidebar.vue"
import ChatPane from "./components/ChatPane.vue"
import Settings from "./components/Settings.vue"
import { useCookieAuth } from "./lib/storage.js"
import { api } from "./lib/api.js"
import { createSocket } from "./lib/socket.js"

const { auth, clearAuth } = useCookieAuth({ user: null })
const peer = ref(null)
const socket = ref(null)
const showSettings = ref(false)
const tab = ref("login")
const email = ref("")
const username = ref("")
const password = ref("")
const loading = ref(false)
const error = ref("")
const isCheckingAuth = ref(true) // État de vérification initiale

function setPeer(u){ peer.value = u }

async function submit(){
  error.value = ""; loading.value = true
  try {
    let data
    if (tab.value === "register") data = await api("/api/auth/register", { method: "POST", body: { email: email.value, username: username.value, password: password.value } })
    else data = await api("/api/auth/login", { method: "POST", body: { email: email.value, password: password.value } })
    auth.value = { user: data.user }
    socket.value = createSocket() // Pas besoin de token, les cookies sont envoyés automatiquement
  } catch (e) {
    error.value = e.message
  } finally { loading.value = false }
}

async function logout(){
  try { await api("/api/auth/logout", { method: "POST" }) } catch {}
  clearAuth()
  socket.value && socket.value.close()
}

function onAccountDeleted(){
  alert('Votre compte a été supprimé')
  clearAuth()
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

// Vérifier si l'utilisateur est déjà connecté au démarrage
onMounted(async () => {
  try {
    // Essayer de récupérer l'utilisateur avec le token du cookie
    const data = await api("/api/auth/me", { method: "GET" })
    if (data && data.user) {
      auth.value = { user: data.user }
      socket.value = createSocket()
    } else {
      auth.value = { user: null }
    }
  } catch (e) {
    // Pas de token valide, rester sur login
    auth.value = { user: null }
  } finally {
    isCheckingAuth.value = false
  }
})
</script>
