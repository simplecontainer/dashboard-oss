import { writable, derived, type Readable } from 'svelte/store';

const timestamps = writable<Record<string, number>>({}); // id -> start timestamp

const elapsedTimes: Readable<Record<string, number>> = derived(timestamps, ($timestamps, set) => {
  const update = () => {
    const now = Date.now();
    const result: Record<string, number> = {};
    for (const id in $timestamps) {
      result[id] = now - $timestamps[id];
    }
    set(result);
  };

  update(); // Initial
  const interval = setInterval(update, 1000);

  return () => clearInterval(interval);
});

export const elapsedTimerStore = {
  subscribe: elapsedTimes.subscribe,

  add(id: string, startTimestamp: number = Date.now()) {
    timestamps.update((t) => ({ ...t, [id]: startTimestamp }));
  },

  remove(id: string) {
    timestamps.update((t) => {
      const { [id]: _, ...rest } = t;
      return rest;
    });
  },

  reset(id: string) {
    timestamps.update((t) => ({ ...t, [id]: Date.now() }));
  },

  clear() {
    timestamps.set({});
  }
};
