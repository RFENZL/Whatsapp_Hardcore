<template>
  <div :class="['w-full flex', isSystem ? 'justify-center' : (isMe ? 'justify-end' : 'justify-start') ]">
    <div v-if="isSystem" class="text-center text-sm text-gray-500 my-2">
      {{ m.content }}
    </div>
    <div v-else :class="[base, isMe ? 'bg-emerald-100' : 'bg-white border', 'relative group']">
      <template v-if="m.deleted">
        <div>🗑️ Message supprimé</div>
      </template>
      <template v-else>
        <!-- Container with flex to separate content and menu button -->
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <!-- Edit mode -->
            <div v-if="editing" class="space-y-2">
              <textarea
                v-model="editContent"
                @keydown.enter.ctrl="saveEdit"
                @keydown.esc="cancelEdit"
                class="w-full border rounded px-2 py-1 text-sm resize-none"
                rows="3"
                ref="editTextarea"
              ></textarea>
              <div class="flex gap-2 text-xs">
                <button @click="saveEdit" class="bg-emerald-500 text-white px-3 py-1 rounded hover:bg-emerald-600">Enregistrer</button>
                <button @click="cancelEdit" class="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300">Annuler</button>
                <span class="text-gray-500 self-center">Ctrl+Enter</span>
              </div>
            </div>
            
            <!-- Display mode -->
            <div v-else-if="kind === 'text'">
              {{ m.content }}
            </div>
        <div v-else-if="kind === 'image' && fullMediaUrl" class="space-y-1">
          <a :href="fullMediaUrl" target="_blank" rel="noopener" class="block">
            <img
              :src="fullMediaUrl"
              :alt="m.mediaName || 'Image'"
              class="max-h-64 max-w-full rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
              @error="handleImageError"
            />
          </a>
          <div v-if="m.content && m.content !== m.mediaName" class="text-xs text-gray-600">
            {{ m.content }}
          </div>
        </div>
        <div v-else-if="kind === 'video' && fullMediaUrl" class="space-y-1">
          <video
            controls
            class="max-h-64 max-w-full rounded-lg"
            :src="fullMediaUrl"
          ></video>
          <div v-if="m.content && m.content !== m.mediaName" class="text-xs text-gray-600">
            {{ m.content }}
          </div>
        </div>
        <div v-else-if="kind === 'file' && fullMediaUrl" class="space-y-1">
          <a
            :href="fullMediaUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 text-sm text-emerald-700 underline"
          >
            📎 {{ m.mediaName || m.content || 'Fichier' }}
          </a>
        </div>
        <div v-else>
          <!-- Fallback si aucune condition n'est remplie -->
          <div class="text-sm text-gray-500">{{ m.content || '[Média]' }}</div>
        </div>
          </div>

          <!-- Menu button (visible on hover for own messages) -->
          <div v-if="isMe && !m.deleted && !editing" class="relative flex-shrink-0">
            <button 
              @click.stop="toggleMenu"
              class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/5 rounded"
              title="Options"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            <!-- Context menu -->
            <div v-if="showMenu" class="absolute right-0 top-8 bg-white rounded-lg shadow-lg border z-50 min-w-[120px]">
              <button 
                v-if="kind === 'text'"
                @click="startEdit"
                class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
              >
                Modifier
              </button>
              <button 
                @click="$emit('delete', m._id)"
                class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </template>

      <div class="mt-1 text-[10px] text-gray-500 text-right flex items-center justify-end gap-1">
        <span>{{ time }}</span>
        <span v-if="m.edited" class="italic" title="Message modifié">• modifié</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from "vue";

const props = defineProps({ me: Object, m: Object });
const emit = defineEmits(['edit', 'delete']);

const showMenu = ref(false);
const editing = ref(false);
const editContent = ref('');
const editTextarea = ref(null);

// Use the same logic as api.js to get API_BASE
const API_BASE = import.meta?.env?.VITE_API_BASE || "";

const isSystem = computed(() => (props.m && (props.m.type === 'system' || props.m.type === 'notification')));
const isMe = computed(() => String(props.m.sender) === String(props.me._id));
const base = "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm";

const time = computed(() => {
  try {
    return new Date(props.m.createdAt).toLocaleTimeString();
  } catch {
    return "";
  }
});

const kind = computed(() => {
  const t = props.m.type || "text";
  if (t === "image" || t === "video" || t === "file" || t === 'system') return t;
  return "text";
});

const fullMediaUrl = computed(() => {
  const url = props.m.mediaUrl;
  if (!url) return null;
  
  // Get API_BASE directly from import.meta.env
  const apiBase = import.meta?.env?.VITE_API_BASE || "http://localhost:4000";
  
  // If it's already a full URL (starts with http:// or https://), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a relative path (starts with /), prepend the API_BASE
  if (url.startsWith('/')) {
    return apiBase + url;
  }
  
  // Otherwise, return as is
  return url;
});

const handleImageError = (e) => {
  console.error('Failed to load image:', props.m.mediaUrl, 'Full URL:', fullMediaUrl.value);
  e.target.style.display = 'none';
};

const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};

const startEdit = async () => {
  showMenu.value = false;
  editing.value = true;
  editContent.value = props.m.content;
  await nextTick();
  editTextarea.value?.focus();
};

const cancelEdit = () => {
  editing.value = false;
  editContent.value = '';
};

const saveEdit = () => {
  if (editContent.value.trim() && editContent.value !== props.m.content) {
    emit('edit', { messageId: props.m._id, content: editContent.value.trim() });
  }
  editing.value = false;
};

// Close menu when clicking outside
if (typeof window !== 'undefined') {
  const closeMenu = (e) => {
    if (showMenu.value && !e.target.closest('button')) {
      showMenu.value = false;
    }
  };
  document.addEventListener('click', closeMenu);
}
</script>
