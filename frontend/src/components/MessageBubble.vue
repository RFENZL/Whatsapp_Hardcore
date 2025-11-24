<template>
  <div :class="['w-full flex', isSystem ? 'justify-center' : (isMe ? 'justify-end' : 'justify-start') ]">
    <div v-if="isSystem" class="text-center text-sm text-gray-500 my-2">
      {{ m.content }}
    </div>
    <div v-else :class="[base, isMe ? 'bg-emerald-100' : 'bg-white border']">
      <template v-if="m.deleted">
        <div>🗑️ Message supprimé</div>
      </template>
      <template v-else>
        <div v-if="kind === 'text'">
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
      </template>

      <div class="mt-1 text-[10px] text-gray-500 text-right">
        {{ time }}
        <span v-if="m.edited"> • édité</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({ me: Object, m: Object });

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
</script>
