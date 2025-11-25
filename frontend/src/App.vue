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
    <!-- Modal Mot de passe oublié -->
    <div v-if="showForgotPassword" class="fixed inset-0 bg-black bg-opacity-50 grid place-items-center z-[100]" @click.self="showForgotPassword = false">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mx-4">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Mot de passe oublié</h2>
        <p class="text-gray-600 text-sm mb-4">Entrez votre email pour recevoir un lien de réinitialisation.</p>
        
        <form v-if="!forgotSuccess" @submit.prevent="sendResetEmail" class="space-y-4">
          <input class="w-full border rounded-xl px-3 py-2" placeholder="Email" v-model="forgotEmail" />
          <p v-if="forgotError" class="text-sm text-red-600">{{ forgotError }}</p>
          <div class="flex gap-2">
            <button type="button" @click="showForgotPassword = false" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl py-2 font-medium">Annuler</button>
            <button type="submit" :disabled="forgotLoading" class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 font-medium">{{ forgotLoading ? '...' : 'Envoyer' }}</button>
          </div>
        </form>
        
        <div v-else class="text-center">
          <div class="text-green-600 text-5xl mb-4">✓</div>
          <p class="text-gray-700 mb-4">Email envoyé ! Vérifiez votre boîte de réception.</p>
          <button @click="showForgotPassword = false; forgotSuccess = false; forgotEmail = ''" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 font-medium">Fermer</button>
        </div>
      </div>
    </div>
    
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mx-4">
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">WhatsApp-like Chat</h1>
        <p class="text-gray-600 text-sm">Connectez-vous pour commencer à discuter</p>
      </div>
      
      <div class="flex mb-6">
        <button :class="['flex-1 py-2 rounded-xl', tab==='login'?'bg-emerald-500 text-white':'bg-gray-100']" @click="tab='login'">Connexion</button>
        <button :class="['flex-1 py-2 rounded-xl ml-2', tab==='register'?'bg-emerald-500 text-white':'bg-gray-100']" @click="tab='register'">Inscription</button>
      </div>
      <form @submit.prevent="submit" class="space-y-3">
        <div>
          <input class="w-full border rounded-xl px-3 py-2" :class="{'border-red-500': validationErrors.email}" placeholder="Email" v-model="email" />
          <p v-if="validationErrors.email" class="text-xs text-red-600 mt-1">{{ validationErrors.email }}</p>
        </div>
        
        <input v-if="tab==='register'" class="w-full border rounded-xl px-3 py-2" placeholder="Nom d'utilisateur" v-model="username" />
        
        <div>
          <input type="password" class="w-full border rounded-xl px-3 py-2" :class="{'border-red-500': validationErrors.password}" placeholder="Mot de passe" v-model="password" />
          <p v-if="validationErrors.password" class="text-xs text-red-600 mt-1">{{ validationErrors.password }}</p>
          
          <!-- Indicateur de force du mot de passe -->
          <div v-if="tab==='register' && passwordStrength" class="mt-2">
            <div class="flex items-center gap-2">
              <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full transition-all duration-300" :style="{ width: passwordStrength.level * 20 + '%', backgroundColor: passwordStrength.color }"></div>
              </div>
              <span class="text-xs font-medium" :style="{ color: passwordStrength.color }">{{ passwordStrength.label }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="tab==='register'">
          <input type="password" class="w-full border rounded-xl px-3 py-2" :class="{'border-red-500': validationErrors.confirmPassword}" placeholder="Confirmer le mot de passe" v-model="confirmPassword" />
          <p v-if="validationErrors.confirmPassword" class="text-xs text-red-600 mt-1">{{ validationErrors.confirmPassword }}</p>
        </div>
        
        <p v-if="error && !Object.keys(validationErrors).length" class="text-sm text-red-600">{{ error }}</p>
        
        <button type="submit" :disabled="loading" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 font-medium disabled:opacity-50">{{ loading ? '...' : tab==='register' ? 'Créer le compte' : 'Se connecter' }}</button>
        
        <button v-if="tab==='login'" type="button" @click="showForgotPassword = true" class="w-full text-sm text-emerald-600 hover:text-emerald-700 underline">Mot de passe oublié ?</button>
      </form>
    </div>
  </div>
  <div v-else class="w-full h-screen overflow-hidden grid grid-cols-12">
    <!-- Modal de warning de timeout -->
    <div v-if="showTimeoutWarning" class="fixed inset-0 bg-black bg-opacity-50 grid place-items-center z-[100]">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mx-4">
        <div class="text-center">
          <div class="text-5xl mb-4">⏰</div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Session expirée bientôt</h2>
          <p class="text-gray-600 mb-4">Vous serez déconnecté dans {{ timeoutCountdown }} secondes pour cause d'inactivité.</p>
          <div class="flex gap-2">
            <button @click="logout" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl py-2 font-medium">Se déconnecter</button>
            <button @click="keepSessionActive" class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 font-medium">Rester connecté</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="col-span-4 xl:col-span-3 bg-white border-r h-screen sticky top-0 overflow-y-auto">
      <Sidebar :me="auth.user" :onSelectPeer="setPeer" :currentPeer="peer" :socket="socket" @openSettings="showSettings = true" />
    </div>
    <div class="col-span-8 xl:col-span-9 bg-gray-100 h-screen overflow-hidden relative">
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
  
  <!-- Onboarding Wizard -->
  <OnboardingWizard 
    v-if="showOnboarding && auth?.user" 
    :userName="auth.user.username"
    @complete="handleOnboardingComplete"
    @skip="handleOnboardingSkip"
  />
  
  <!-- Toast notifications -->
  <Toast />
</template>
<script setup>
import { onMounted } from 'vue'
import { ref, watch } from "vue"
import Sidebar from "./components/Sidebar.vue"
import ChatPane from "./components/ChatPane.vue"
import Settings from "./components/Settings.vue"
import Toast from "./components/Toast.vue"
import OnboardingWizard from "./components/OnboardingWizard.vue"
import { useCookieAuth } from "./lib/storage.js"
import { api, setOn401Handler } from "./lib/api.js"
import { createSocket } from "./lib/socket.js"
import { validateEmail, validatePassword, validatePasswordMatch } from "./utils/validation.js"
import { useSessionTimeout, useMultiTabSync } from "./utils/session.js"
import logger from "./utils/logger.js"

const { auth, clearAuth } = useCookieAuth({ user: null })

// Configurer le handler pour les erreurs 401
setOn401Handler(() => {
  logger.warn('Session expirée - déconnexion automatique')
  if (socket.value) socket.value.close()
  clearAuth()
  window.$toast?.error('Votre session a expiré. Veuillez vous reconnecter.', 'Session expirée')
})
const peer = ref(null)
const socket = ref(null)
const showSettings = ref(false)
const tab = ref("login")
const email = ref("")
const username = ref("")
const password = ref("")
const confirmPassword = ref("")
const loading = ref(false)
const error = ref("")
const isCheckingAuth = ref(true) // État de vérification initiale
const showForgotPassword = ref(false)
const passwordStrength = ref(null)
const validationErrors = ref({})
const showTimeoutWarning = ref(false)
const timeoutCountdown = ref(120) // 2 minutes en secondes
const showOnboarding = ref(false)

// Session timeout - déconnecter après 30min d'inactivité
const sessionTimeout = useSessionTimeout({
  timeout: 30 * 60 * 1000, // 30 minutes
  warningTime: 2 * 60 * 1000, // Warning 2 minutes avant
  onWarning: () => {
    showTimeoutWarning.value = true
    // Countdown
    let secondsLeft = 120
    const countdownInterval = setInterval(() => {
      secondsLeft--
      timeoutCountdown.value = secondsLeft
      if (secondsLeft <= 0) {
        clearInterval(countdownInterval)
      }
    }, 1000)
  },
  onTimeout: () => {
    logout()
    window.$toast?.warning('Déconnecté pour inactivité', 'Session expirée')
  }
})

// Multi-tab sync
const multiTabSync = useMultiTabSync()
multiTabSync.init(
  () => {
    // Autre onglet s'est déconnecté
    if (auth.value?.user) {
      clearAuth()
      socket.value?.close()
      window.$toast?.info('Vous avez été déconnecté depuis un autre onglet')
    }
  },
  () => {
    // Autre onglet s'est connecté - recharger
    if (!auth.value?.user) {
      window.location.reload()
    }
  }
)

function keepSessionActive() {
  showTimeoutWarning.value = false
  sessionTimeout.updateActivity()
}

function handleOnboardingComplete(data) {
  showOnboarding.value = false
  // Optionnel: sauvegarder les données du wizard
  if (data.statusMessage) {
    // TODO: Update user status via API
  }
  window.$toast?.success('Bienvenue ! Votre profil est configuré.', 'Configuration terminée')
}

function handleOnboardingSkip() {
  showOnboarding.value = false
}

function setPeer(u){ peer.value = u }

async function submit(){
  error.value = ""; validationErrors.value = {}; loading.value = true
  
  // Validation côté client
  const emailValidation = validateEmail(email.value)
  if (!emailValidation.valid) {
    validationErrors.value.email = emailValidation.error
    error.value = emailValidation.error
    loading.value = false
    return
  }
  
  const passwordValidation = validatePassword(password.value)
  if (!passwordValidation.valid && tab.value === "register") {
    validationErrors.value.password = passwordValidation.errors.join(', ')
    error.value = passwordValidation.errors.join(', ')
    loading.value = false
    return
  }
  
  if (tab.value === "register") {
    const matchValidation = validatePasswordMatch(password.value, confirmPassword.value)
    if (!matchValidation.valid) {
      validationErrors.value.confirmPassword = matchValidation.error
      error.value = matchValidation.error
      loading.value = false
      return
    }
  }
  
  try {
    let data
    if (tab.value === "register") data = await api("/api/auth/register", { method: "POST", body: { email: email.value, username: username.value, password: password.value } })
    else data = await api("/api/auth/login", { method: "POST", body: { email: email.value, password: password.value } })
    auth.value = { user: data.user }
    socket.value = createSocket()
    logger.info('User logged in', { email: email.value })
    multiTabSync.broadcast('login')
    sessionTimeout.start()
    
    // Afficher l'onboarding si c'est le premier login
    if (tab.value === 'register' && !localStorage.getItem('onboarding_complete')) {
      showOnboarding.value = true
    }
  } catch (e) {
    error.value = e.message
    logger.error('Login/Register failed', { error: e.message, email: email.value })
    
    // Gestion erreur 401
    if (e.message.includes('401') || e.message.includes('Unauthorized')) {
      error.value = 'Email ou mot de passe incorrect'
    }
  } finally { loading.value = false }
}

async function logout(){
  try { 
    await api("/api/auth/logout", { method: "POST" }) 
    logger.info('User logged out')
  } catch (e) {
    logger.error('Logout failed', { error: e.message })
  }
  clearAuth()
  socket.value && socket.value.close()
  sessionTimeout.stop()
  multiTabSync.broadcast('logout')
}

const forgotEmail = ref('')
const forgotLoading = ref(false)
const forgotSuccess = ref(false)
const forgotError = ref('')

async function sendResetEmail() {
  forgotError.value = ''; forgotSuccess.value = false; forgotLoading.value = true
  
  const emailValidation = validateEmail(forgotEmail.value)
  if (!emailValidation.valid) {
    forgotError.value = emailValidation.error
    forgotLoading.value = false
    return
  }
  
  try {
    await api('/api/auth/forgot-password', { 
      method: 'POST', 
      body: { email: forgotEmail.value } 
    })
    forgotSuccess.value = true
    logger.info('Password reset email sent', { email: forgotEmail.value })
  } catch (e) {
    forgotError.value = e.message
    logger.error('Forgot password failed', { error: e.message })
  } finally {
    forgotLoading.value = false
  }
}

// Watcher pour la force du mot de passe
watch(password, (newPassword) => {
  if (tab.value === 'register' && newPassword) {
    const validation = validatePassword(newPassword)
    passwordStrength.value = validation.strength
  } else {
    passwordStrength.value = null
  }
})

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
