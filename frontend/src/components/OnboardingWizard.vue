<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 grid place-items-center z-[100]">
    <div class="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden mx-4">
      <!-- Progress bar -->
      <div class="h-2 bg-gray-200">
        <div class="h-full bg-emerald-500 transition-all duration-300" :style="{ width: (currentStep / totalSteps * 100) + '%' }"></div>
      </div>
      
      <!-- Step 1: Bienvenue -->
      <div v-if="currentStep === 1" class="p-8 text-center">
        <div class="text-6xl mb-4">
          👋
        </div>
        <h2 class="text-3xl font-bold text-gray-800 mb-4">
          Bienvenue {{ userName }} !
        </h2>
        <p class="text-gray-600 mb-6 text-lg">
          Nous sommes ravis de vous accueillir sur WhatsApp-like Chat. Prenons quelques secondes pour configurer votre profil.
        </p>
        <button class="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-lg" @click="nextStep">
          Commencer
        </button>
      </div>
      
      <!-- Step 2: Photo de profil -->
      <div v-if="currentStep === 2" class="p-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">
          Photo de profil
        </h2>
        <div class="text-center mb-6">
          <div class="w-32 h-32 rounded-full mx-auto mb-4 overflow-hidden bg-gray-200 grid place-items-center">
            <img
              v-if="profileImage"
              :src="profileImage"
              alt="Profile"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-5xl text-gray-400">👤</span>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          />
          <button class="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium" @click="$refs.fileInput.click()">
            Choisir une photo
          </button>
        </div>
        <div class="flex gap-3">
          <button class="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-medium" @click="prevStep">
            Retour
          </button>
          <button class="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium" @click="nextStep">
            Continuer
          </button>
        </div>
      </div>
      
      <!-- Step 3: Statut -->
      <div v-if="currentStep === 3" class="p-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">
          Message de statut
        </h2>
        <p class="text-gray-600 mb-4 text-center">
          Ajoutez un message qui sera visible par vos contacts
        </p>
        <textarea
          v-model="statusMessage"
          class="w-full border rounded-xl px-4 py-3 mb-4 resize-none"
          rows="3"
          maxlength="150"
          placeholder="Ex: Disponible pour discuter..."
        ></textarea>
        <p class="text-xs text-gray-500 text-right mb-4">
          {{ statusMessage.length }}/150
        </p>
        
        <div class="mb-6">
          <p class="text-sm font-medium text-gray-700 mb-2">
            Suggestions:
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="suggestion in statusSuggestions"
              :key="suggestion"
              class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full"
              @click="statusMessage = suggestion"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button class="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-medium" @click="prevStep">
            Retour
          </button>
          <button class="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium" @click="nextStep">
            Continuer
          </button>
        </div>
      </div>
      
      <!-- Step 4: Confidentialité -->
      <div v-if="currentStep === 4" class="p-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">
          Paramètres de confidentialité
        </h2>
        <div class="space-y-4 mb-6">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p class="font-medium text-gray-800">
                Photo de profil
              </p>
              <p class="text-sm text-gray-600">
                Qui peut voir votre photo
              </p>
            </div>
            <select v-model="privacy.profilePic" class="border rounded-lg px-3 py-2">
              <option value="everyone">
                Tout le monde
              </option>
              <option value="contacts">
                Contacts uniquement
              </option>
              <option value="nobody">
                Personne
              </option>
            </select>
          </div>
          
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p class="font-medium text-gray-800">
                Dernière connexion
              </p>
              <p class="text-sm text-gray-600">
                Afficher votre dernière activité
              </p>
            </div>
            <select v-model="privacy.lastSeen" class="border rounded-lg px-3 py-2">
              <option value="everyone">
                Tout le monde
              </option>
              <option value="contacts">
                Contacts uniquement
              </option>
              <option value="nobody">
                Personne
              </option>
            </select>
          </div>
          
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p class="font-medium text-gray-800">
                Statut
              </p>
              <p class="text-sm text-gray-600">
                Qui peut voir votre statut
              </p>
            </div>
            <select v-model="privacy.status" class="border rounded-lg px-3 py-2">
              <option value="everyone">
                Tout le monde
              </option>
              <option value="contacts">
                Contacts uniquement
              </option>
              <option value="nobody">
                Personne
              </option>
            </select>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button class="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-medium" @click="prevStep">
            Retour
          </button>
          <button class="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium" @click="nextStep">
            Continuer
          </button>
        </div>
      </div>
      
      <!-- Step 5: Terminé -->
      <div v-if="currentStep === 5" class="p-8 text-center">
        <div class="text-6xl mb-4">
          ✨
        </div>
        <h2 class="text-3xl font-bold text-gray-800 mb-4">
          Tout est prêt !
        </h2>
        <p class="text-gray-600 mb-6 text-lg">
          Votre profil est configuré. Vous pouvez maintenant commencer à discuter avec vos contacts.
        </p>
        <div class="space-y-3">
          <button class="w-full px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-lg" @click="finish">
            Commencer à discuter
          </button>
          <button class="w-full text-sm text-gray-600 hover:text-gray-800 underline" @click="skip">
            Passer le tutoriel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  userName: String
});

const emit = defineEmits(['complete', 'skip']);

const currentStep = ref(1);
const totalSteps = 5;

const profileImage = ref(null);
const statusMessage = ref('');
const privacy = ref({
  profilePic: 'contacts',
  lastSeen: 'contacts',
  status: 'contacts'
});

const statusSuggestions = [
  'Disponible pour discuter',
  'Occupé(e)',
  'Au travail',
  'En vacances 🌴',
  'Ne pas déranger',
  'Disponible'
];

function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      profileImage.value = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function finish() {
  // Sauvegarder les paramètres
  localStorage.setItem('onboarding_complete', 'true');
  
  emit('complete', {
    profileImage: profileImage.value,
    statusMessage: statusMessage.value,
    privacy: privacy.value
  });
}

function skip() {
  localStorage.setItem('onboarding_complete', 'true');
  emit('skip');
}
</script>
