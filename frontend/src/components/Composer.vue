<template>
  <div class="flex items-center gap-2 p-3">
    <input
      ref="inputEl"
      class="flex-1 bg-white border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      type="text"
      placeholder="Écrire un message"
      v-model="text"
      @keydown.enter.exact.prevent="send"
      :disabled="disabled"
      @input="ping"
      autofocus
    />
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      @change="onFileChange"
      :disabled="disabled"
    />
    <button
      type="button"
      class="rounded-full border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
      @click="triggerFile"
      :disabled="disabled"
    >
      📎
    </button>
    <button
      type="button"
      class="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      @click="send"
      :disabled="disabled"
    >
      Envoyer
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const emit = defineEmits(["send", "typing", "send-file"]);
const props = defineProps({ disabled: Boolean });

const text = ref("");
const inputEl = ref(null);
const fileInput = ref(null);

function send() {
  const t = text.value.trim();
  if (!t) return;
  emit("send", t);
  text.value = "";
}

function ping() {
  emit("typing");
}

function triggerFile() {
  if (fileInput.value && !props.disabled) {
    fileInput.value.click();
  }
}

function onFileChange(e) {
  const file = e.target.files && e.target.files[0];
  if (file) {
    emit("send-file", file);
  }
  e.target.value = "";
}

onMounted(() => {
  if (inputEl.value) inputEl.value.focus();
});
</script>
