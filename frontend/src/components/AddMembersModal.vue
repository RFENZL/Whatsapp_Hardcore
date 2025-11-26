<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" @click.self="$emit('close')">
    <div class="bg-white rounded-lg w-full max-w-lg mx-4 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">
          Ajouter des personnes
        </h3>
        <button class="text-gray-500" @click="close">
          Fermer
        </button>
      </div>

      <div class="mb-4">
        <input
          v-model="q"
          placeholder="Rechercher un utilisateur..."
          class="w-full rounded-lg border px-3 py-2"
          @input="onInput"
        />
      </div>

      <div v-if="searching" class="py-4 text-center text-gray-500">
        Recherche...
      </div>
      <ul v-else class="space-y-2 max-h-64 overflow-y-auto">
        <li v-for="u in results" :key="u._id" class="flex items-center justify-between p-2 border rounded-lg">
          <div class="flex items-center gap-3">
            <img v-if="u.avatar" :src="u.avatar" class="w-8 h-8 rounded-full" />
            <div class="min-w-0">
              <div class="font-medium truncate">
                {{ u.username || u.email || u._id }}
              </div>
              <div class="text-xs text-gray-500">
                {{ u.status || '' }}
              </div>
            </div>
          </div>
          <button :disabled="addingIds[u._id]" class="px-3 py-1 bg-emerald-500 text-white rounded text-sm" @click="add(u)">
            {{ addingIds[u._id] ? 'Ajout...' : 'Ajouter' }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api, addGroupMembers } from '../lib/api.js';

const props = defineProps({ conversationId: String, token: String });
const emit = defineEmits(['close','added']);

const q = ref('');
const results = ref([]);
const searching = ref(false);
const addingIds = ref({});
let timeout = null;

function close(){ emit('close'); }

function onInput(){
  clearTimeout(timeout);
  if (!q.value.trim()) { results.value = []; return; }
  timeout = setTimeout(search, 300);
}

async function search(){
  searching.value = true;
  try{
    const res = await api(`/api/users/search?q=${encodeURIComponent(q.value)}`, { token: props.token });
    results.value = res || [];
  }catch(e){ results.value = []; }
  searching.value = false;
}

async function add(user){
  if (!user || !user._id) return;
  addingIds.value = { ...addingIds.value, [user._id]: true };
  try{
    // Need group id: get conversation to extract group id
    const conv = await api(`/api/conversations/${props.conversationId}`, { token: props.token });
    const groupId = conv && conv.group ? conv.group._id || conv.group : null;
    if (!groupId) throw new Error('Conversation n\'est pas un groupe');
    await addGroupMembers(props.token, groupId, [user._id]);
    emit('added', user);
    // remove from results
    results.value = results.value.filter(r => r._id !== user._id);
  }catch(e){ console.error('add member failed', e); }
  addingIds.value = { ...addingIds.value, [user._id]: false };
}
</script>

<style scoped>
</style>
