<template>
  <Teleport to="body">
    <div 
      v-if="show" 
      class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4"
      @click.self="cancel"
    >
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div class="p-4 border-b flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Prévisualisation
          </h3>
          <button class="text-gray-500 hover:text-gray-700" @click="cancel">
            ✕
          </button>
        </div>
        
        <div class="p-4 flex items-center justify-center bg-gray-50" style="max-height: 60vh;">
          <img 
            v-if="isImage" 
            :src="previewUrl" 
            :alt="file.name"
            class="max-w-full max-h-full object-contain rounded"
          />
          <video 
            v-else-if="isVideo" 
            :src="previewUrl" 
            controls
            class="max-w-full max-h-full rounded"
          ></video>
          <div v-else class="text-center">
            <div class="text-4xl mb-4">
              📎
            </div>
            <div class="font-medium">
              {{ file.name }}
            </div>
            <div class="text-sm text-gray-500">
              {{ formatSize(file.size) }}
            </div>
          </div>
        </div>
        
        <div class="p-4 border-t">
          <input 
            v-model="caption" 
            type="text" 
            placeholder="Ajouter une légende (optionnel)"
            class="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          
          <div class="flex gap-2 justify-end">
            <button 
              class="px-4 py-2 border rounded-lg hover:bg-gray-50"
              @click="cancel"
            >
              Annuler
            </button>
            <button 
              class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              @click="confirm"
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  show: Boolean,
  file: Object,
  previewUrl: String
});

const emit = defineEmits(['cancel', 'confirm']);

const caption = ref('');

const isImage = computed(() => {
  return props.file?.type?.startsWith('image/');
});

const isVideo = computed(() => {
  return props.file?.type?.startsWith('video/');
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function cancel() {
  caption.value = '';
  emit('cancel');
}

function confirm() {
  emit('confirm', caption.value);
  caption.value = '';
}

watch(() => props.show, (newVal) => {
  if (!newVal) {
    caption.value = '';
  }
});
</script>
