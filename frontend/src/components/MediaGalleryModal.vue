<template>
  <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4">
      <div class="px-4 py-3 border-b flex justify-between items-center">
        <h2 class="font-semibold">
          Médias partagés
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
      
      <div class="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
        <div v-if="loading" class="text-center py-8 text-gray-500">
          Chargement...
        </div>
        <div v-else-if="medias.length === 0" class="text-center py-8 text-gray-500">
          Aucun média partagé
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          <div v-for="media in medias" :key="media._id" class="relative aspect-square group">
            <img 
              v-if="media.type === 'image'"
              :src="media.mediaUrl" 
              class="w-full h-full object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
              :alt="media.mediaName"
              @click="openMedia(media)"
            />
            <div v-else-if="media.type === 'video'" class="relative w-full h-full">
              <video 
                :src="media.mediaUrl"
                class="w-full h-full object-cover rounded cursor-pointer"
                @click="openMedia(media)"
              ></video>
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg class="w-12 h-12 text-white opacity-75" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {{ formatDate(media.createdAt) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../lib/api';

const props = defineProps({ conversationId: String, token: String });
defineEmits(['close']);

const medias = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await api(`/api/messages/conversation/${props.conversationId}?limit=1000`, {
      token: props.token
    });
    medias.value = data.messages.filter(m => m.type === 'image' || m.type === 'video');
    medias.value.reverse(); // Most recent first
  } catch (e) {
    console.error('Error loading medias:', e);
  } finally {
    loading.value = false;
  }
});

function openMedia(media) {
  window.open(media.mediaUrl, '_blank');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
</script>
