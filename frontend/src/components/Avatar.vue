<template>
  <div class="relative shrink-0 grid place-items-center rounded-full bg-emerald-100 text-emerald-800" :style="{ width: size+'px', height: size+'px' }">
    <span class="text-sm font-semibold">{{ initials }}</span>
    <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white" :class="user?.status==='online' ? 'bg-emerald-500':'bg-gray-400'"></span>
  </div>
</template>
<script setup>
import { computed } from "vue"
const props = defineProps({ user: Object, size: { type: Number, default: 40 } })
const initials = computed(() => (props.user?.username || 'U').slice(0,2).toUpperCase())
</script>
