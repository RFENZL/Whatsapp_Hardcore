<template>
  <div :class="['w-full flex', isMe ? 'justify-end' : 'justify-start']">
    <div :class="[base, isMe ? 'bg-emerald-100' : 'bg-white border']">
      <template v-if="m.deleted">
        <div>🗑️ Message supprimé</div>
      </template>
      <template v-else>
        <div v-if="kind === 'text'">
          {{ m.content }}
        </div>
        <div v-else class="space-y-1">
          <div v-if="kind === 'image'">
            <a :href="m.mediaUrl" target="_blank" rel="noopener" class="block">
              <img
                :src="m.mediaUrl"
                :alt="m.mediaName || 'Image'"
                class="max-h-64 rounded-lg object-cover"
              />
            </a>
          </div>
          <div v-else-if="kind === 'video'">
            <video
              controls
              class="max-h-64 rounded-lg"
              :src="m.mediaUrl"
            ></video>
          </div>
          <div v-else>
            <a
              :href="m.mediaUrl"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 text-sm text-emerald-700 underline"
            >
              📎 {{ m.mediaName || m.content || 'Fichier' }}
            </a>
          </div>
          <div v-if="m.content && m.content !== m.mediaName" class="text-sm">
            {{ m.content }}
          </div>
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
  if (t === "image" || t === "video" || t === "file") return t;
  return "text";
});
</script>
