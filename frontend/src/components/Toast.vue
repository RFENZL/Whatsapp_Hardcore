<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] pointer-events-none">
      <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden',
            'transform transition-all duration-300 ease-in-out'
          ]"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <span v-if="toast.type === 'success'" class="text-2xl">✓</span>
                <span v-else-if="toast.type === 'error'" class="text-2xl">✗</span>
                <span v-else-if="toast.type === 'warning'" class="text-2xl">⚠</span>
                <span v-else class="text-2xl">ℹ</span>
              </div>
              <div class="ml-3 w-0 flex-1 pt-0.5">
                <p v-if="toast.title" class="text-sm font-medium text-gray-900">
                  {{ toast.title }}
                </p>
                <p class="text-sm text-gray-500" :class="{'mt-1': toast.title}">
                  {{ toast.message }}
                </p>
              </div>
              <div class="ml-4 flex-shrink-0 flex">
                <button
                  class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                  @click="remove(toast.id)"
                >
                  <span class="sr-only">Fermer</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="h-1 bg-gray-200">
            <div 
              class="h-full transition-all duration-100 ease-linear"
              :class="{
                'bg-green-500': toast.type === 'success',
                'bg-red-500': toast.type === 'error',
                'bg-yellow-500': toast.type === 'warning',
                'bg-blue-500': toast.type === 'info'
              }"
              :style="{ width: toast.progress + '%' }"
            ></div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';

const toasts = ref([]);
let nextId = 1;

function add({ message, title, type = 'info', duration = 5000 }) {
  const id = nextId++;
  const toast = { id, message, title, type, progress: 100 };
  toasts.value.push(toast);
  
  // Animer la progress bar
  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    toast.progress = Math.max(0, 100 - (elapsed / duration * 100));
    
    if (toast.progress <= 0) {
      clearInterval(interval);
    }
  }, 50);
  
  // Auto-remove après duration
  setTimeout(() => {
    clearInterval(interval);
    remove(id);
  }, duration);
  
  return id;
}

function remove(id) {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
}

// Exposer les méthodes pour utilisation externe
defineExpose({ add, remove });

// API globale pour faciliter l'utilisation
if (typeof window !== 'undefined') {
  window.$toast = {
    success: (message, title) => add({ message, title, type: 'success' }),
    error: (message, title) => add({ message, title, type: 'error' }),
    warning: (message, title) => add({ message, title, type: 'warning' }),
    info: (message, title) => add({ message, title, type: 'info' }),
  };
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(2rem);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(2rem) scale(0.95);
}
</style>
