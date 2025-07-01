// Create and export the WebSocket instance
import { writable } from 'svelte/store';

// Create a writable store to manage the WebSocket
export const socket = writable<WebSocket | null>(null);
