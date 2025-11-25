<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <Transition
        v-for="toast in toasts"
        :key="toast.id"
        name="toast"
        appear
      >
        <div
          :class="[
            'pointer-events-auto rounded-lg shadow-lg px-4 py-3 min-w-[300px] max-w-md flex items-start gap-3',
            toast.type === 'success' && 'bg-emerald-500 text-white',
            toast.type === 'error' && 'bg-red-500 text-white',
            toast.type === 'warning' && 'bg-orange-500 text-white',
            toast.type === 'info' && 'bg-blue-500 text-white'
          ]"
        >
          <span class="text-xl flex-shrink-0">{{ getIcon(toast.type) }}</span>
          <div class="flex-1 text-sm">{{ toast.message }}</div>
          <button
            @click="removeToast(toast.id)"
            class="flex-shrink-0 opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';

const toasts = ref([]);
let idCounter = 0;

function addToast(message, type = 'info', duration = 3000) {
  const id = idCounter++;
  toasts.value.push({ id, message, type });
  
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
}

function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index !== -1) {
    toasts.value.splice(index, 1);
  }
}

function getIcon(type) {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✗';
    case 'warning': return '⚠';
    case 'info': return 'ℹ';
    default: return 'ℹ';
  }
}

defineExpose({ addToast });
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
