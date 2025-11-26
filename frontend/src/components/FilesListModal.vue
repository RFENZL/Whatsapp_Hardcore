<template>
  <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
      <div class="px-4 py-3 border-b flex justify-between items-center">
        <h2 class="font-semibold">
          Fichiers partagés
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
        <div v-else-if="files.length === 0" class="text-center py-8 text-gray-500">
          Aucun fichier partagé
        </div>
        <div v-else class="space-y-2">
          <div v-for="file in files" :key="file._id" class="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div class="shrink-0">
              <svg
                v-if="file.type === 'audio'"
                class="w-10 h-10 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              <svg
                v-else
                class="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">
                {{ file.mediaName || 'Sans nom' }}
              </div>
              <div class="text-xs text-gray-500">
                {{ formatSize(file.mediaSize) }} • {{ formatDate(file.createdAt) }}
              </div>
            </div>
            <a 
              :href="file.mediaUrl" 
              :download="file.mediaName"
              class="shrink-0 text-emerald-600 hover:text-emerald-700 transition-colors"
              title="Télécharger"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </a>
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

const files = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await api(`/api/messages/conversation/${props.conversationId}?limit=1000`, {
      token: props.token
    });
    files.value = data.messages.filter(m => m.type === 'file' || m.type === 'audio');
    files.value.reverse(); // Most recent first
  } catch (e) {
    console.error('Error loading files:', e);
  } finally {
    loading.value = false;
  }
});

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
</script>
