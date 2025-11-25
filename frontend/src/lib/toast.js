// Compatibilité avec window.$toast créé par le composant Toast
export function useToast() {
  function success(message, title) {
    if (window.$toast) {
      window.$toast.success(message, title);
    }
  }

  function error(message, title) {
    if (window.$toast) {
      window.$toast.error(message, title);
    }
  }

  function warning(message, title) {
    if (window.$toast) {
      window.$toast.warning(message, title);
    }
  }

  function info(message, title) {
    if (window.$toast) {
      window.$toast.info(message, title);
    }
  }

  return { success, error, warning, info };
}

// Fonction vide pour compatibilité
export function setToastInstance(instance) {
  // Non utilisé avec la nouvelle version mais gardé pour compatibilité
}
