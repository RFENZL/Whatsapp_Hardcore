<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 grid place-items-center z-[100]" @click.self="$emit('close')">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 mx-4">
      <h2 class="text-2xl font-bold text-gray-800 mb-4">
        Prendre une photo
      </h2>
      
      <div v-if="!stream && !capturedImage" class="text-center">
        <div class="text-5xl mb-4">
          📷
        </div>
        <p class="text-gray-600 mb-4">
          Autoriser l'accès à la caméra pour prendre une photo
        </p>
        <button :disabled="loading" class="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50" @click="startCamera">
          {{ loading ? 'Chargement...' : 'Activer la caméra' }}
        </button>
        <p v-if="error" class="text-sm text-red-600 mt-2">
          {{ error }}
        </p>
      </div>
      
      <div v-else-if="stream && !capturedImage">
        <div class="relative aspect-square rounded-xl overflow-hidden bg-black mb-4">
          <video
            ref="videoElement"
            autoplay
            playsinline
            class="w-full h-full object-cover"
          ></video>
          
          <!-- Overlay pour le focus -->
          <div class="absolute inset-0 pointer-events-none">
            <div class="absolute inset-8 border-2 border-white rounded-full opacity-50"></div>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button class="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-medium" @click="stopCamera">
            Annuler
          </button>
          <button class="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium" @click="capturePhoto">
            📸 Capturer
          </button>
        </div>
      </div>
      
      <div v-else-if="capturedImage">
        <div class="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-4">
          <img :src="capturedImage" alt="Captured" class="w-full h-full object-cover" />
        </div>
        
        <div class="flex gap-2">
          <button class="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-medium" @click="retakePhoto">
            Reprendre
          </button>
          <button :disabled="uploading" class="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50" @click="confirmPhoto">
            {{ uploading ? 'Upload...' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import logger from '../utils/logger.js';

const emit = defineEmits(['close', 'captured']);

const videoElement = ref(null);
const stream = ref(null);
const capturedImage = ref(null);
const loading = ref(false);
const uploading = ref(false);
const error = ref('');

async function startCamera() {
  loading.value = true;
  error.value = '';
  
  try {
    // Demander l'accès à la caméra
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user', // Caméra frontale par défaut
        width: { ideal: 640 },
        height: { ideal: 640 }
      },
      audio: false
    });
    
    stream.value = mediaStream;
    
    // Attacher le stream au vidéo element
    setTimeout(() => {
      if (videoElement.value) {
        videoElement.value.srcObject = mediaStream;
      }
    }, 100);
    
    logger.info('Camera started');
  } catch (err) {
    logger.error('Camera access denied', { error: err.message });
    error.value = 'Impossible d\'accéder à la caméra. Vérifiez les permissions.';
  } finally {
    loading.value = false;
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
    stream.value = null;
    logger.info('Camera stopped');
  }
  emit('close');
}

function capturePhoto() {
  if (!videoElement.value || !stream.value) return;
  
  // Créer un canvas pour capturer l'image
  const canvas = document.createElement('canvas');
  const video = videoElement.value;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Convertir en data URL
  capturedImage.value = canvas.toDataURL('image/jpeg', 0.9);
  
  // Arrêter le stream
  stream.value.getTracks().forEach(track => track.stop());
  stream.value = null;
  
  logger.info('Photo captured');
}

function retakePhoto() {
  capturedImage.value = null;
  startCamera();
}

async function confirmPhoto() {
  uploading.value = true;
  
  try {
    // Convertir data URL en Blob
    const response = await fetch(capturedImage.value);
    const blob = await response.blob();
    
    // Créer un fichier
    const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
    
    emit('captured', file);
    emit('close');
    
    logger.info('Photo confirmed');
  } catch (err) {
    logger.error('Photo upload failed', { error: err.message });
    error.value = 'Erreur lors de l\'upload de la photo';
  } finally {
    uploading.value = false;
  }
}

// Cleanup au unmount
onUnmounted(() => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
  }
});
</script>
