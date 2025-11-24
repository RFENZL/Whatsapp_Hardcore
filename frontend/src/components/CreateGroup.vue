<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="close">
    <div class="bg-white rounded-lg w-full max-w-lg mx-4 p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold">Créer un groupe</h2>
        <button @click="close" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="mb-3">
        <label class="block text-sm font-medium mb-1">Nom du groupe</label>
        <input v-model="name" class="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Nom du groupe" />
      </div>

      <div class="mb-3">
        <label class="block text-sm font-medium mb-1">Membres</label>
        <div class="text-xs text-gray-500 mb-2">Choisir parmi vos contacts</div>
        <div class="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
          <div v-if="contacts.length === 0" class="text-gray-500 text-sm p-2">Aucun contact disponible</div>
          <label v-for="c in contacts" :key="c._id" class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
            <input type="checkbox" :value="c._id" v-model="selected" class="w-4 h-4" />
            <img :src="c.avatar || ''" class="w-8 h-8 rounded-full object-cover" v-if="c.avatar" />
            <div class="flex-1 min-w-0">
              <div class="truncate font-medium">{{ c.username }}</div>
              <div class="text-xs text-gray-500">{{ c.status || 'offline' }}</div>
            </div>
          </label>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3">
        <button @click="close" class="px-3 py-1 text-sm text-gray-600">Annuler</button>
        <button @click="createGroup" :disabled="creating || !canCreate" class="px-3 py-1 bg-emerald-500 text-white rounded-lg disabled:opacity-50 text-sm">
          {{ creating ? 'Création...' : 'Créer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { api } from '../lib/api.js'

const props = defineProps({ contacts: Array, token: String, me: Object })
const emit = defineEmits(['created','close'])

const name = ref('')
const selected = ref([])
const creating = ref(false)

const canCreate = computed(() => name.value.trim().length > 0 && selected.value.length > 0)

function close(){ emit('close') }

async function createGroup(){
  if (!canCreate.value) return
  creating.value = true
  try{
    const body = { name: name.value.trim(), memberIds: selected.value }
    const group = await api('/api/groups', { method: 'POST', token: props.token, body })
    emit('created', group)
    close()
  }catch(e){
    console.error('Erreur création groupe', e)
    alert('Impossible de créer le groupe: ' + (e.message || e))
  }finally{ creating.value = false }
}
</script>

<style scoped>
</style>
