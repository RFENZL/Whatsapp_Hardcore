<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" @click.self="close">
    <div class="bg-white rounded-lg w-full max-w-2xl mx-4 p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <img v-if="group.avatar" :src="group.avatar" class="w-12 h-12 rounded-full" />
          <div>
            <div class="font-semibold">
              {{ group.name || 'Groupe' }}
            </div>
            <div class="text-xs text-gray-500">
              Créé par {{ group.creator?.username || '...' }}
            </div>
          </div>
        </div>
        <div>
          <button class="text-gray-500" @click="close">
            Fermer
          </button>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-sm text-gray-600 mb-1">Nom du groupe</label>
        <div class="flex gap-2">
          <input v-model="name" class="flex-1 rounded-lg border px-3 py-2" :disabled="!canEdit" />
          <button v-if="canEdit" class="px-3 py-2 bg-emerald-500 text-white rounded-lg" @click="saveName">
            Enregistrer
          </button>
        </div>
      </div>

      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <div class="font-medium">
            Participants
          </div>
          <div class="text-xs text-gray-500">
            Rôles affichées
          </div>
        </div>
        <ul class="space-y-2 max-h-64 overflow-y-auto">
          <li v-for="m in group.members" :key="m.user._id" class="flex items-center gap-3 p-2 border rounded-lg">
            <img v-if="m.user.avatar" :src="m.user.avatar" class="w-8 h-8 rounded-full" />
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">
                {{ m.user.username }}
              </div>
              <div class="text-xs text-gray-500">
                {{ m.user.username }}
              </div>
            </div>
            <div class="text-xs px-2 py-0.5 rounded-full bg-gray-100">
              {{ m.role }}
            </div>
            <div class="flex items-center gap-2">
              <button v-if="isAdmin && m.role !== 'admin'" class="text-xs px-2 py-1 bg-emerald-500 text-white rounded" @click="promote(m.user._id)">
                Promouvoir
              </button>
              <button v-if="isAdmin && String(m.user._id) !== String(currentUser._id)" class="text-xs px-2 py-1 bg-red-500 text-white rounded" @click="remove(m.user._id)">
                Retirer
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div class="flex justify-end gap-2">
        <button class="px-3 py-2 bg-gray-100 rounded" @click="leave">
          Quitter le groupe
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { getConversation, getGroup, updateGroup, promoteGroupMember, removeGroupMember, leaveGroup, api } from '../lib/api.js';

const props = defineProps({ conversationId: String, token: String, currentUser: Object });
const emit = defineEmits(['close','updated','left']);

const group = ref({ members: [], creator: {}, admins: [] });
const name = ref('');
const isAdmin = ref(false);
const currentUser = props.currentUser;
const canEdit = computed(() => isAdmin.value);

async function load() {
  try {
    // conversationId is provided from ChatPane (peer._id) which is a conversation id
    const conv = await getConversation(props.token, props.conversationId);
    const g = conv && conv.group ? conv.group : null;
    if (!g) throw new Error('Group info not found on conversation');
    // Fetch populated group (members.user etc.) to ensure usernames are available
    let populated = null;
    try {
      populated = await getGroup(props.token, g._id || g);
    } catch (e) {
      // fallback to using conv.group if getGroup fails
      populated = g;
    }

    // If members are not populated with user objects, fetch missing users
    if (populated && Array.isArray(populated.members)) {
      const toFetch = [];
      populated.members.forEach(m => {
        const u = m.user;
        if (!u) return;
        if (typeof u === 'string' || (typeof u === 'object' && !u.username)) {
          const id = typeof u === 'string' ? u : (u._id || u.id);
          if (id) toFetch.push(id);
        }
      });

      if (toFetch.length > 0) {
        const uniq = Array.from(new Set(toFetch));
        const users = await Promise.all(uniq.map(id => api(`/api/users/${id}`, { token: props.token }).catch(() => null)));
        const userMap = {};
        users.forEach(u => { if (u && u._id) userMap[String(u._id)] = u; });

        populated.members = populated.members.map(m => {
          const u = m.user;
          const id = typeof u === 'string' ? u : (u && (u._id || u.id));
          if (id && userMap[String(id)]) {
            return { ...m, user: userMap[String(id)] };
          }
          return m;
        });
      }
    }

    group.value = populated;
    name.value = populated.name;
    isAdmin.value = populated.admins && populated.admins.some(a => String(a._id || a) === String(props.currentUser._id));
  } catch (e) {
    console.error('Failed to load group', e);
  }
}

onMounted(load);

function close(){ emit('close'); }

async function saveName(){
  try{
    const updated = await updateGroup(props.token, group.value._id, { name: name.value });
    group.value = updated;
    emit('updated', updated);
  }catch(e){ console.error(e); alert('Erreur sauvegarde'); }
}

async function promote(memberId){
  try{
    await promoteGroupMember(props.token, group.value._id, memberId);
    await load();
    emit('updated', group.value);
  }catch(e){ console.error(e); alert('Erreur promotion'); }
}

async function remove(memberId){
  if (!confirm('Retirer ce membre ?')) return;
  try{
    await removeGroupMember(props.token, group.value._id, memberId);
    await load();
    emit('updated', group.value);
  }catch(e){ console.error(e); alert('Erreur suppression'); }
}

async function leave(){
  if (!confirm('Quitter le groupe ?')) return;
  try{
    await leaveGroup(props.token, group.value._id);
    emit('left', group.value._id);
    emit('close');
  }catch(e){ console.error(e); alert('Erreur quitter'); }
}
</script>

<style scoped>
</style>
