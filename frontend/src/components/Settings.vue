<template>
  <div class="w-full h-full bg-white overflow-hidden flex flex-col relative z-10">
    <!-- Header -->
    <div class="px-4 py-3 border-b bg-white flex items-center justify-between">
      <h2 class="text-xl font-semibold">
        Paramètres
      </h2>
      <button class="text-gray-500 hover:text-gray-700" @click="$emit('close')">
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b bg-gray-50 px-4">
      <button 
        v-for="t in tabs" 
        :key="t.id"
        :class="['px-4 py-3 text-sm font-medium transition-colors border-b-2', 
                 activeTab === t.id 
                   ? 'text-emerald-600 border-emerald-600' 
                   : 'text-gray-600 border-transparent hover:text-gray-900']"
        @click="activeTab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Profil Tab -->
      <div v-if="activeTab === 'profile'" class="max-w-xl space-y-4">
        <h3 class="text-lg font-medium mb-4">
          Modifier le profil
        </h3>
        
        <!-- Avatar preview and upload -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Photo de profil</label>
          <div class="flex items-center gap-4">
            <!-- Avatar preview -->
            <div class="w-20 h-20 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center">
              <img 
                v-if="avatarPreviewUrl" 
                :src="avatarPreviewUrl" 
                class="w-full h-full object-cover"
                @error="handlePreviewError"
              />
              <span v-else class="text-2xl font-semibold text-emerald-800">
                {{ (profileForm.username || 'U').slice(0,2).toUpperCase() }}
              </span>
            </div>
            
            <!-- Upload buttons -->
            <div class="flex-1 space-y-2">
              <!-- File input -->
              <div class="flex gap-2">
                <input 
                  ref="fileInput" 
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileSelect"
                />
                <button 
                  :disabled="uploadLoading"
                  class="text-sm bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  @click="$refs.fileInput.click()"
                >
                  {{ uploadLoading ? 'Upload...' : 'Choisir une image' }}
                </button>
                <button 
                  :disabled="uploadLoading"
                  class="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  @click="showCamera = true"
                >
                  📷 Caméra
                </button>
              </div>
              
              <!-- Drag and drop zone -->
              <div 
                :class="[
                  'border-2 border-dashed rounded-lg p-3 text-center text-sm transition-colors',
                  isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400'
                ]"
                @drop.prevent="handleDrop"
                @dragover.prevent="isDragging = true"
                @dragleave="isDragging = false"
              >
                <span class="text-gray-600">Ou glissez une image ici</span>
              </div>
              
              <p v-if="uploadError" class="text-sm text-red-600">
                {{ uploadError }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Username input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
          <input 
            v-model="profileForm.username" 
            class="w-full border rounded-lg px-3 py-2"
            placeholder="Votre nom d'utilisateur"
          />
        </div>
        
        <!-- URL input (optional) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ou URL de l'avatar</label>
          <input 
            v-model="profileForm.avatar" 
            class="w-full border rounded-lg px-3 py-2"
            placeholder="https://..."
          />
        </div>
        
        <div class="flex gap-2">
          <button 
            :disabled="profileLoading" 
            class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            @click="updateProfile"
          >
            {{ profileLoading ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
          <p v-if="profileSuccess" class="text-sm text-emerald-600 self-center">
            ✓ Profil mis à jour
          </p>
          <p v-if="profileError" class="text-sm text-red-600 self-center">
            {{ profileError }}
          </p>
        </div>
      </div>

      <!-- Contacts Tab -->
      <div v-if="activeTab === 'contacts'" class="max-w-2xl space-y-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium">
            Mes contacts
          </h3>
          <button class="text-sm text-emerald-600 hover:underline" @click="loadContacts">
            Actualiser
          </button>
        </div>
        
        <div v-if="contactsLoading" class="text-center py-8 text-gray-500">
          Chargement...
        </div>
        <div v-else-if="contacts.length === 0" class="text-center py-8 text-gray-500">
          Aucun contact pour le moment
        </div>
        <div v-else class="space-y-2">
          <div 
            v-for="c in contacts" 
            :key="c._id"
            class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-medium">
                {{ c.contact.username.charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="font-medium">
                  {{ c.contact.username }}
                </div>
                <div class="text-xs text-gray-500">
                  <span :class="c.blocked ? 'text-red-600' : ''">
                    {{ c.blocked ? '🚫 Bloqué' : '✓ Actif' }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button 
                v-if="!c.blocked"
                class="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded hover:bg-orange-200"
                @click="blockContact(c.contact._id)"
              >
                Bloquer
              </button>
              <button 
                v-else
                class="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded hover:bg-emerald-200"
                @click="unblockContact(c.contact._id)"
              >
                Débloquer
              </button>
              <button 
                class="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                @click="removeContact(c.contact._id)"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sessions Tab -->
      <div v-if="activeTab === 'sessions'" class="max-w-2xl space-y-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium">
            Historique des connexions
          </h3>
          <button class="text-sm text-emerald-600 hover:underline" @click="loadSessions">
            Actualiser
          </button>
        </div>
        
        <div v-if="sessionsLoading" class="text-center py-8 text-gray-500">
          Chargement...
        </div>
        <div v-else-if="sessions.length === 0" class="text-center py-8 text-gray-500">
          Aucune session enregistrée
        </div>
        <div v-else class="space-y-2">
          <div 
            v-for="s in sessions" 
            :key="s._id"
            class="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span :class="['text-xs px-2 py-0.5 rounded-full', s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600']">
                  {{ s.isActive ? 'Active' : 'Terminée' }}
                </span>
                <span class="text-sm font-medium">{{ formatDate(s.loginTime) }}</span>
              </div>
              <div class="text-xs text-gray-600 space-y-1">
                <div>📍 IP: {{ s.ipAddress || 'N/A' }}</div>
                <div>💻 {{ truncate(s.userAgent, 60) || 'N/A' }}</div>
                <div v-if="s.logoutTime">
                  🚪 Déconnexion: {{ formatDate(s.logoutTime) }}
                </div>
              </div>
            </div>
            <button 
              class="ml-2 text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 shrink-0"
              @click="deleteSessionItem(s._id)"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>

      <!-- Account Tab -->
      <div v-if="activeTab === 'account'" class="max-w-xl space-y-4">
        <h3 class="text-lg font-medium mb-4 text-red-600">
          Zone de danger
        </h3>
        <div class="border border-red-200 rounded-lg p-4 bg-red-50">
          <h4 class="font-medium text-red-800 mb-2">
            Supprimer mon compte
          </h4>
          <p class="text-sm text-red-700 mb-4">
            Cette action est irréversible. Toutes vos données (messages, contacts, sessions) seront définitivement supprimées.
          </p>
          <div v-if="!confirmDelete">
            <button 
              class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
              @click="confirmDelete = true"
            >
              Supprimer mon compte
            </button>
          </div>
          <div v-else class="space-y-3">
            <p class="text-sm font-medium text-red-800">
              Êtes-vous absolument sûr ?
            </p>
            <div class="flex gap-2">
              <button 
                :disabled="deleteLoading"
                class="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                @click="deleteAccountConfirmed"
              >
                {{ deleteLoading ? 'Suppression...' : 'Oui, supprimer définitivement' }}
              </button>
              <button 
                class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
                @click="confirmDelete = false"
              >
                Annuler
              </button>
            </div>
            <p v-if="deleteError" class="text-sm text-red-700">
              {{ deleteError }}
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Camera Modal -->
    <CameraModal 
      v-if="showCamera" 
      @close="showCamera = false"
      @captured="handleCameraCapture"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { api, getSessions, deleteSession, getContacts, blockContact as apiBlockContact, unblockContact as apiUnblockContact, removeContact as apiRemoveContact, deleteAccount as apiDeleteAccount, uploadFile } from '../lib/api.js';
import CameraModal from './CameraModal.vue';

const props = defineProps({ me: Object, token: String });
const emit = defineEmits(['close', 'accountDeleted', 'profileUpdated']);

const tabs = [
  { id: 'profile', label: 'Profil' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'sessions', label: 'Sécurité' },
  { id: 'account', label: 'Compte' }
];

const activeTab = ref('profile');

// Profile
const profileForm = ref({ username: '', avatar: '' });
const profileLoading = ref(false);
const profileSuccess = ref(false);
const profileError = ref('');
const uploadLoading = ref(false);
const uploadError = ref('');
const isDragging = ref(false);
const fileInput = ref(null);
const showPreview = ref(true);
const showCamera = ref(false);

// Computed property for avatar preview URL
const avatarPreviewUrl = computed(() => {
  const avatar = profileForm.value.avatar;
  if (!avatar || !showPreview.value) return null;
  
  const apiBase = import.meta?.env?.VITE_API_BASE || 'http://localhost:4000';
  
  // If it's already a full URL, return as is
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  
  // If it's a relative path, prepend API_BASE
  if (avatar.startsWith('/')) {
    return apiBase + avatar;
  }
  
  return avatar;
});

// Contacts
const contacts = ref([]);
const contactsLoading = ref(false);

// Sessions
const sessions = ref([]);
const sessionsLoading = ref(false);

// Account deletion
const confirmDelete = ref(false);
const deleteLoading = ref(false);
const deleteError = ref('');

onMounted(() => {
  profileForm.value.username = props.me.username || '';
  profileForm.value.avatar = props.me.avatar || '';
  showPreview.value = true;
});

function handlePreviewError() {
  console.error('Failed to load avatar preview:', profileForm.value.avatar);
  showPreview.value = false;
}

async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    await uploadAvatar(file);
  }
}

async function handleCameraCapture(file) {
  await uploadAvatar(file);
}

async function handleDrop(event) {
  isDragging.value = false;
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    await uploadAvatar(file);
  } else {
    uploadError.value = 'Veuillez déposer une image valide';
  }
}

async function uploadAvatar(file) {
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = 'L\'image est trop volumineuse (max 5MB)';
    return;
  }
  
  uploadLoading.value = true;
  uploadError.value = '';
  showPreview.value = true;
  
  try {
    const result = await uploadFile(props.token, file);
    profileForm.value.avatar = result.url;
    uploadError.value = '';
  } catch (e) {
    uploadError.value = e.message;
  } finally {
    uploadLoading.value = false;
  }
}

async function updateProfile() {
  profileLoading.value = true;
  profileSuccess.value = false;
  profileError.value = '';
  try {
    const data = await api('/api/users/profile', {
      method: 'PUT',
      token: props.token,
      body: {
        username: profileForm.value.username,
        avatar: profileForm.value.avatar
      }
    });
    profileSuccess.value = true;
    emit('profileUpdated', data);
    setTimeout(() => { profileSuccess.value = false; }, 3000);
  } catch (e) {
    profileError.value = e.message;
  } finally {
    profileLoading.value = false;
  }
}

async function loadContacts() {
  contactsLoading.value = true;
  try {
    contacts.value = await getContacts(props.token);
  } catch (e) {
    console.error(e);
  } finally {
    contactsLoading.value = false;
  }
}

async function blockContact(contactId) {
  try {
    await apiBlockContact(props.token, contactId);
    await loadContacts();
  } catch (e) {
    alert('Erreur: ' + e.message);
  }
}

async function unblockContact(contactId) {
  try {
    await apiUnblockContact(props.token, contactId);
    await loadContacts();
  } catch (e) {
    alert('Erreur: ' + e.message);
  }
}

async function removeContact(contactId) {
  if (!confirm('Supprimer ce contact ?')) return;
  try {
    await apiRemoveContact(props.token, contactId);
    await loadContacts();
  } catch (e) {
    alert('Erreur: ' + e.message);
  }
}

async function loadSessions() {
  sessionsLoading.value = true;
  try {
    sessions.value = await getSessions(props.token);
  } catch (e) {
    console.error(e);
  } finally {
    sessionsLoading.value = false;
  }
}

async function deleteSessionItem(sessionId) {
  if (!confirm('Supprimer cette session de l\'historique ?')) return;
  try {
    await deleteSession(props.token, sessionId);
    await loadSessions();
  } catch (e) {
    alert('Erreur: ' + e.message);
  }
}

async function deleteAccountConfirmed() {
  deleteLoading.value = true;
  deleteError.value = '';
  try {
    await apiDeleteAccount(props.token);
    emit('accountDeleted');
  } catch (e) {
    deleteError.value = e.message;
  } finally {
    deleteLoading.value = false;
  }
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

// Auto-load on tab change
import { watch } from 'vue';
watch(activeTab, (tab) => {
  if (tab === 'contacts' && contacts.value.length === 0) loadContacts();
  if (tab === 'sessions' && sessions.value.length === 0) loadSessions();
});
</script>
