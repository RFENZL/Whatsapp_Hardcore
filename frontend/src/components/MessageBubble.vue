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
        <!-- Reply preview -->
        <div v-if="m.replyTo" class="mb-2 p-2 bg-black bg-opacity-5 rounded border-l-2 border-emerald-500 text-xs">
          <div class="font-medium text-emerald-700">En réponse à:</div>
          <div class="text-gray-600 truncate">{{ m.replyTo.content }}</div>
        </div>

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
              <span v-html="renderContentWithMentions(m.content)"></span>
            </div>
        <div v-else-if="kind === 'image'" class="space-y-1">
          <a :href="fullMediaUrl || '#'" target="_blank" rel="noopener" class="block">
            <img
              v-if="fullMediaUrl"
              :src="fullMediaUrl"
              :alt="m.mediaName || 'Image'"
              class="max-h-64 max-w-full rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
              @error="handleImageError"
            />
            <div v-else class="text-xs text-gray-400 italic p-4 bg-gray-100 rounded">
              Chargement de l'image...
            </div>
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

          <!-- Menu button (visible on hover) -->
          <div v-if="!m.deleted && !editing" class="relative flex-shrink-0">
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
            <div v-if="showMenu" class="absolute right-0 top-8 bg-white rounded-lg shadow-lg border z-50 min-w-[140px]">
              <button 
                @click="handleReply"
                class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
              >
                💬 Répondre
              </button>
              <button 
                v-if="kind === 'text'"
                @click="handleCopy"
                class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
              >
                📋 Copier
              </button>
              <button 
                v-if="isMe && kind === 'text'"
                @click="startEdit"
                class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
              >
                ✏️ Modifier
              </button>
              <button 
                v-if="isMe"
                @click="$emit('delete', m._id)"
                class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600"
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        </div>

        <!-- Reactions -->
        <div v-if="!m.deleted" class="flex items-center gap-2 mt-2">
          <!-- Show existing reactions -->
          <div v-if="m.reactions && m.reactions.length > 0" class="flex gap-1">
            <button
              v-for="(reaction, idx) in groupedReactions"
              :key="idx"
              @click="handleReactionClick(reaction.emoji)"
              :class="[
                'text-xs px-2 py-0.5 rounded-full border transition-all',
                reaction.hasUserReacted ? 'bg-emerald-100 border-emerald-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              ]"
            >
              {{ reaction.emoji }} {{ reaction.count }}
            </button>
          </div>
          
          <!-- Add reaction button -->
          <div class="relative">
            <button
              @click.stop="toggleReactionPicker"
              class="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded-full hover:bg-gray-100"
              title="Réagir"
            >
              😊
            </button>
            
            <!-- Quick reactions picker -->
            <div
              v-if="showReactionPicker"
              class="absolute bottom-full mb-1 left-0 bg-white rounded-lg shadow-lg border p-2 z-50 flex gap-1"
            >
              <button
                v-for="emoji in quickReactions"
                :key="emoji"
                @click="addReaction(emoji)"
                class="text-xl hover:scale-125 transition-transform"
              >
                {{ emoji }}
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
import { computed, ref, nextTick, onMounted, onUnmounted } from "vue";
import { useToast } from "../lib/toast.js";

const props = defineProps({ me: Object, m: Object });
const emit = defineEmits(['edit', 'delete', 'reply', 'react']);

const showMenu = ref(false);
const editing = ref(false);
const editContent = ref('');
const editTextarea = ref(null);
const showReactionPicker = ref(false);
const toast = useToast();

// Use the same logic as api.js to get API_BASE
const API_BASE = import.meta?.env?.VITE_API_BASE || "";

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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

const groupedReactions = computed(() => {
  if (!props.m.reactions || props.m.reactions.length === 0) return [];
  
  const groups = {};
  props.m.reactions.forEach(reaction => {
    const emoji = reaction.emoji || reaction;
    if (!groups[emoji]) {
      groups[emoji] = {
        emoji,
        count: 0,
        users: []
      };
    }
    groups[emoji].count++;
    if (reaction.user) {
      groups[emoji].users.push(reaction.user);
    }
  });
  
  return Object.values(groups).map(group => ({
    ...group,
    hasUserReacted: group.users.some(u => String(u) === String(props.me._id))
  }));
});

const fullMediaUrl = computed(() => {
  const url = props.m.mediaUrl;
  if (!url) return null;
  
  // Si c'est une URL blob (temporaire), retourner telle quelle
  if (url.startsWith('blob:')) {
    return url;
  }
  
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

const toggleReactionPicker = () => {
  showReactionPicker.value = !showReactionPicker.value;
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

const handleCopy = async () => {
  showMenu.value = false;
  try {
    await navigator.clipboard.writeText(props.m.content);
    toast.success('Message copié dans le presse-papiers');
  } catch (e) {
    toast.error('Impossible de copier le message');
  }
};

const handleReply = () => {
  showMenu.value = false;
  emit('reply', props.m);
};

const addReaction = (emoji) => {
  showReactionPicker.value = false;
  emit('react', { messageId: props.m._id, emoji });
};

const handleReactionClick = (emoji) => {
  emit('react', { messageId: props.m._id, emoji });
};

function renderContentWithMentions(content) {
  if (!content) return ''
  // Replace @username with highlighted version
  return content.replace(/@(\w+)/g, '<span class="bg-emerald-200 text-emerald-900 px-1 rounded font-medium">@$1</span>')
}

// Close menus when clicking outside
let closeMenus;

onMounted(() => {
  closeMenus = (e) => {
    if (showMenu.value && !e.target.closest('button')) {
      showMenu.value = false;
    }
    if (showReactionPicker.value && !e.target.closest('.relative')) {
      showReactionPicker.value = false;
    }
  };
  document.addEventListener('click', closeMenus);
});

onUnmounted(() => {
  if (closeMenus) {
    document.removeEventListener('click', closeMenus);
  }
});
</script>
