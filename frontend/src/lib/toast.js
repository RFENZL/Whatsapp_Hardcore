import { ref } from 'vue';

const toastInstance = ref(null);

export function useToast() {
  function success(message, duration = 3000) {
    if (toastInstance.value) {
      toastInstance.value.addToast(message, 'success', duration);
    }
  }

  function error(message, duration = 4000) {
    if (toastInstance.value) {
      toastInstance.value.addToast(message, 'error', duration);
    }
  }

  function warning(message, duration = 3000) {
    if (toastInstance.value) {
      toastInstance.value.addToast(message, 'warning', duration);
    }
  }

  function info(message, duration = 3000) {
    if (toastInstance.value) {
      toastInstance.value.addToast(message, 'info', duration);
    }
  }

  return { success, error, warning, info };
}

export function setToastInstance(instance) {
  toastInstance.value = instance;
}
