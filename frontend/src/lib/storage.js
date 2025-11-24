import { ref, watch } from "vue"
export function useLocalStorage(key, initial) {
  const s = ref(initial)
  try { const raw = localStorage.getItem(key); if (raw) s.value = JSON.parse(raw) } catch {}
  watch(s, v => { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }, { deep: true })
  return s
}
