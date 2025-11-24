<template>
  <div class="relative shrink-0 rounded-full overflow-hidden" :style="{ width: size+'px', height: size+'px' }">
    <!-- Image avatar if exists -->
    <img 
      v-if="avatarUrl" 
      :src="avatarUrl" 
      :alt="props.user?.username"
      class="w-full h-full object-cover bg-emerald-100"
      @error="handleImageError"
    />
    <!-- Fallback to initials -->
    <div 
      v-else
      class="w-full h-full grid place-items-center bg-emerald-100 text-emerald-800"
    >
      <span class="text-sm font-semibold">{{ initials }}</span>
    </div>
    <!-- Status indicator -->
    <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white" :class="user?.status==='online' ? 'bg-emerald-500':'bg-gray-400'"></span>
  </div>
</template>
<script setup>
import { computed, ref } from "vue"

const props = defineProps({ user: Object, size: { type: Number, default: 40 } })
const initials = computed(() => (props.user?.username || 'U').slice(0,2).toUpperCase())

// Compute full avatar URL
const avatarUrl = computed(() => {
  const avatar = props.user?.avatar
  if (!avatar) return null
  
  // Get API_BASE directly from import.meta.env with fallback
  const apiBase = import.meta?.env?.VITE_API_BASE || "http://localhost:4000"
  
  // If it's already a full URL (starts with http:// or https://), return as is
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar
  }
  
  // If it's a relative path (starts with /), prepend the API_BASE
  if (avatar.startsWith('/')) {
    return apiBase + avatar
  }
  
  // Otherwise, return as is
  return avatar
})

const showImage = ref(true)

// Handle image loading errors by hiding the image
const handleImageError = (e) => {
  showImage.value = false
  e.target.style.display = 'none'
}
</script>
