import { writable } from 'svelte/store';

const toasts = writable([]);

function addToast({ message = '', type = 'info', duration = 1500 }) {
    const id = Date.now();

    toasts.update((currentToasts) => [
        ...currentToasts,
        { id, message, type }
    ]);

    setTimeout(() => {
        removeToast(id);
    }, duration);
}

function removeToast(id) {
    toasts.update((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
}

export default {
    subscribe: toasts.subscribe,
    addToast,
    removeToast
};

