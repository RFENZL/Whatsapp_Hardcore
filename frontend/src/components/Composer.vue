<template>
  <div class="flex items-center gap-2 p-3">
    <input ref="inputEl" class="flex-1 bg-white border rounded-full px-4 py-2 text-sm" placeholder="Tapez un message" v-model="text" @keydown.enter="send" :disabled="disabled" @input="ping" autofocus />
    <button class="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm font-medium" @click="send" :disabled="disabled">Envoyer</button>
  </div>
</template>
<script setup>
import { ref, onMounted } from "vue"
const emit = defineEmits(["send","typing"])
const props = defineProps({ disabled: Boolean })
const text = ref("")
const inputEl = ref(null)
function send(){ const t = text.value.trim(); if (!t) return; emit("send", t); text.value = "" }
function ping(){ emit("typing") }
onMounted(() => { if (inputEl.value) inputEl.value.focus() })
</script>
