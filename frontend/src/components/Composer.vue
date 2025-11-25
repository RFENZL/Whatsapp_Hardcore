<template>
  <div class="flex flex-col gap-2">
    <!-- Réponse citée -->
    <div v-if="replyingTo" class="px-3 pt-3 pb-1 bg-emerald-50 border-l-4 border-emerald-500 flex items-center justify-between">
      <div class="text-sm">
        <div class="font-medium text-emerald-700">Répondre à:</div>
        <div class="text-gray-600 truncate">{{ replyingTo.content }}</div>
      </div>
      <button @click="cancelReply" class="text-gray-500 hover:text-gray-700">✕</button>
    </div>

    <!-- Mentions autocomplete -->
    <div 
      v-if="showMentions && filteredMembers.length > 0"
      class="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border max-h-48 overflow-y-auto z-50 w-64"
    >
      <button
        v-for="(member, idx) in filteredMembers"
        :key="member._id"
        @click="selectMention(member)"
        :class="[
          'w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2',
          idx === mentionIndex ? 'bg-emerald-50' : ''
        ]"
      >
        <div class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-medium">
          {{ member.username?.[0]?.toUpperCase() || '?' }}
        </div>
        <span class="text-sm">{{ member.username }}</span>
      </button>
    </div>

    <!-- Drag & drop overlay -->
    <div
      v-if="isDragging"
      class="absolute inset-0 bg-emerald-500 bg-opacity-90 flex items-center justify-center z-50 border-2 border-dashed border-white"
    >
      <div class="text-white text-center">
        <div class="text-4xl mb-2">📎</div>
        <div class="text-xl font-medium">Déposer le fichier ici</div>
      </div>
    </div>

    <div 
      class="flex items-center gap-2 p-3 relative"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <button
        type="button"
        class="rounded-full border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        @click="toggleEmojiPicker"
        :disabled="disabled"
        title="Émojis"
      >
        😀
      </button>
      
      <input
        ref="inputEl"
        class="flex-1 bg-white border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        type="text"
        placeholder="Écrire un message"
        v-model="text"
        @keydown.enter.exact.prevent="handleEnter"
        @keydown.up.prevent="navigateMentions(-1)"
        @keydown.down.prevent="navigateMentions(1)"
        @keydown.esc="closeMentions"
        :disabled="disabled"
        @input="handleInput"
        autofocus
      />
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        @change="onFileChange"
        :disabled="disabled"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
      />
      <button
        type="button"
        class="rounded-full border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        @click="triggerFile"
        :disabled="disabled"
        title="Joindre un fichier"
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

      <!-- Emoji Picker -->
      <div
        v-if="showEmojiPicker"
        class="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border p-3 z-50 w-80"
      >
        <div class="mb-2">
          <input
            v-model="emojiSearch"
            type="text"
            placeholder="Rechercher un emoji..."
            class="w-full px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div class="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          <button
            v-for="emoji in filteredEmojis"
            :key="emoji"
            @click="insertEmoji(emoji)"
            class="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
            type="button"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </div>

    <!-- Barre de progression upload -->
    <div v-if="uploadProgress > 0 && uploadProgress < 100" class="px-3 pb-2">
      <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          class="bg-emerald-500 h-full transition-all duration-300"
          :style="{ width: uploadProgress + '%' }"
        ></div>
      </div>
      <div class="text-xs text-gray-600 text-center mt-1">Upload: {{ uploadProgress }}%</div>
    </div>

    <!-- Media Preview Modal -->
    <MediaPreview 
      :show="showMediaPreview"
      :file="previewFile"
      :previewUrl="previewUrl"
      @cancel="cancelPreview"
      @confirm="confirmPreview"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import MediaPreview from "./MediaPreview.vue";

const emit = defineEmits(["send", "typing", "send-file", "reply"]);
const props = defineProps({ 
  disabled: Boolean,
  replyingTo: Object,
  groupMembers: Array  // Liste des membres du groupe pour les mentions
});

const text = ref("");
const inputEl = ref(null);
const fileInput = ref(null);
const showEmojiPicker = ref(false);
const emojiSearch = ref("");
const isDragging = ref(false);
const uploadProgress = ref(0);
const dragCounter = ref(0);
const showMediaPreview = ref(false);
const previewFile = ref(null);
const previewUrl = ref(null);
const showMentions = ref(false);
const mentionQuery = ref('');
const mentionIndex = ref(0);
const mentionStartPos = ref(0);

// Liste d'émojis populaires
const emojis = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
  "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
  "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪",
  "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨",
  "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥",
  "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
  "🤢", "🤮", "🤧", "🥵", "🥶", "😎", "🤓", "🧐",
  "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺",
  "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱",
  "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤",
  "😡", "😠", "🤬", "👍", "👎", "👏", "🙌", "👐",
  "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈",
  "👉", "👆", "👇", "☝️", "👋", "🤚", "🖐", "✋",
  "🖖", "💪", "🦵", "🦶", "👂", "🦻", "👃", "❤️",
  "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎",
  "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘",
  "💝", "🔥", "✨", "🌟", "⭐", "💫", "🎉", "🎊"
];

const filteredEmojis = computed(() => {
  if (!emojiSearch.value) return emojis;
  // Simple filter - in production you might want emoji names/keywords
  return emojis;
});

const filteredMembers = computed(() => {
  if (!props.groupMembers || !showMentions.value) return []
  const query = mentionQuery.value.toLowerCase()
  return props.groupMembers.filter(m => 
    m.username.toLowerCase().includes(query)
  ).slice(0, 10)
})

function handleInput(e) {
  const cursorPos = e.target.selectionStart
  const textBeforeCursor = text.value.slice(0, cursorPos)
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
  
  if (lastAtIndex !== -1 && props.groupMembers) {
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
    // Check if there's no space after @
    if (!textAfterAt.includes(' ')) {
      showMentions.value = true
      mentionQuery.value = textAfterAt
      mentionStartPos.value = lastAtIndex
      mentionIndex.value = 0
    } else {
      showMentions.value = false
    }
  } else {
    showMentions.value = false
  }
  
  emit("typing")
}

function navigateMentions(direction) {
  if (!showMentions.value || filteredMembers.value.length === 0) return
  mentionIndex.value = (mentionIndex.value + direction + filteredMembers.value.length) % filteredMembers.value.length
}

function selectMention(member) {
  if (!member) return
  const beforeMention = text.value.slice(0, mentionStartPos.value)
  const afterMention = text.value.slice(inputEl.value.selectionStart)
  text.value = beforeMention + '@' + member.username + ' ' + afterMention
  showMentions.value = false
  mentionQuery.value = ''
  nextTick(() => {
    inputEl.value?.focus()
  })
}

function closeMentions() {
  showMentions.value = false
  mentionQuery.value = ''
}

function handleEnter() {
  if (showMentions.value && filteredMembers.value.length > 0) {
    selectMention(filteredMembers.value[mentionIndex.value])
  } else {
    send()
  }
}

function send() {
  const t = text.value.trim();
  if (!t) return;
  emit("send", t);
  text.value = "";
  showMentions.value = false;
  mentionQuery.value = '';
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
    handleFileSelection(file);
  }
  e.target.value = "";
}

function handleFileSelection(file) {
  const mime = file.type || '';
  
  // Show preview for images and videos
  if (mime.startsWith('image/') || mime.startsWith('video/')) {
    previewFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
    showMediaPreview.value = true;
  } else {
    // Send directly for other files
    emit("send-file", file);
  }
}

function cancelPreview() {
  showMediaPreview.value = false;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
  previewFile.value = null;
}

function confirmPreview(caption) {
  showMediaPreview.value = false;
  if (previewFile.value) {
    // If there's a caption, we could send it somehow
    // For now, just send the file
    emit("send-file", previewFile.value);
  }
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
  previewFile.value = null;
}

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value;
}

function insertEmoji(emoji) {
  text.value += emoji;
  showEmojiPicker.value = false;
  inputEl.value?.focus();
}

function cancelReply() {
  emit("reply", null);
}

function onDragOver(e) {
  if (dragCounter.value === 0) {
    isDragging.value = true;
  }
  dragCounter.value++;
}

function onDragLeave(e) {
  dragCounter.value--;
  if (dragCounter.value === 0) {
    isDragging.value = false;
  }
}

function onDrop(e) {
  isDragging.value = false;
  dragCounter.value = 0;
  
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    handleFileSelection(file);
  }
}

// Fermer le sélecteur d'emoji au clic extérieur
let closeEmojiPicker;

onMounted(() => {
  closeEmojiPicker = (e) => {
    if (showEmojiPicker.value && !e.target.closest('.absolute')) {
      showEmojiPicker.value = false;
    }
  };
  document.addEventListener('click', closeEmojiPicker);
  
  if (inputEl.value) inputEl.value.focus();
});

onUnmounted(() => {
  if (closeEmojiPicker) {
    document.removeEventListener('click', closeEmojiPicker);
  }
});

// Exposer une fonction pour mettre à jour la progression
defineExpose({
  setUploadProgress: (progress) => {
    uploadProgress.value = progress;
  }
});
</script>
