<template>
  <div :class="['w-full flex', isMe ? 'justify-end':'justify-start']">
    <div :class="[base, isMe ? 'bg-emerald-100':'bg-white border']">
      <div>{{ m.deleted ? '🗑️ Message supprimé' : m.content }}</div>
      <div class="mt-1 text-[10px] text-gray-500">{{ time }} <span v-if="m.edited"> • édité</span></div>
    </div>
  </div>
</template>
<script setup>
import { computed } from "vue"
const props = defineProps({ me: Object, m: Object })
const isMe = computed(() => props.m.sender === props.me._id)
const base = "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm"
const time = computed(() => new Date(props.m.createdAt).toLocaleTimeString())
</script>
