import { ref } from "vue"

// Fonction pour lire un cookie par son nom
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Fonction pour supprimer un cookie
function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function useCookieAuth(initial = { user: null }) {
  const auth = ref(initial);
  
  // Pas besoin de watcher car les cookies sont gérés côté serveur
  // La valeur auth contiendra seulement les infos user (pas le token)
  
  return {
    auth,
    clearAuth: () => {
      auth.value = { user: null };
      // Les cookies seront supprimés par le serveur au logout
    }
  };
}

// Garder pour compatibilité mais déprécié
export function useLocalStorage(key, initial) {
  console.warn('useLocalStorage is deprecated, use useCookieAuth instead');
  const s = ref(initial);
  try { 
    const raw = localStorage.getItem(key); 
    if (raw) s.value = JSON.parse(raw);
  } catch {}
  return s;
}
