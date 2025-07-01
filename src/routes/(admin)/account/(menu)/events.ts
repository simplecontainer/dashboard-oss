import {writable} from "svelte/store";

export type Event = {
    type: string;
    target: string;
    kind: string;
    group: string;
    name: string;
    data: Uint8Array;
};

export const eventsStore = writable([]);

export function popEvent() {
    let poppedEvent: any = null;

    eventsStore.update((evs) => {
        if (evs.length > 0) {
            poppedEvent = evs.shift();
        }
        return evs;
    });

    return poppedEvent;
}

export const EVENT_INSPECT = "inspect"
export const EVENT_CHANGED = "changed"
export const EVENT_CHANGE = "change"
export const EVENT_RESTART = "restart"
export const EVENT_DELETED = "deleted"
export const EVENT_STOP = "stop"
export const EVENT_RECREATE = "recreate"
export const EVENT_SYNC = "sync"
export const EVENT_REFRESH = "refresh"
export const EVENT_CONTROL_START = "upgrade_start"
export const EVENT_CONTROL_FAILED = "upgrade_failed"
export const EVENT_CONTROL_SUCCESS = "upgrade_success"
export const EVENT_CONTROL_REMOVED = "upgrade_success"

export function New(event: string, target: string, kind: string, group: string, name: string, data: Uint8Array): Event {
    return {
        type: event,
        target: target,
        kind: kind,
        group: group,
        name: name,
        data: data,
    };
}

export function ToJson(event: Event): string {
    return JSON.stringify(event);
}