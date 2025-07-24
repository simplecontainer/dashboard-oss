import { writable, type Writable } from 'svelte/store';
import {
    AddConnectionSession,
    RemoveActiveConnectionSession,
    SetActiveConnectionSession
} from "../../session/session";

import type {Connection} from "../../types/context/connection";

export const connections: Writable<Map<string, Connection>> = writable(new Map());
export const connection: Writable<Connection> = writable({} as Connection);

export function AddOrUpdateConnection(c: Connection) {
    connections.update(map => {
        const updated = new Map(map);
        updated.set(c.Context.Name, c);
        return updated;
    });
}

export function RemoveConnection(key: string) {
    connections.update(map => {
        const updated = new Map(map);
        updated.delete(key);
        return updated;
    });
}

export function SetActiveConnection(c: Connection) {
    SetActiveConnectionSession(c);
    connection.set(c);
}

export function ClearActiveConnection() {
    RemoveActiveConnectionSession();
    connection.set({} as Connection);
}
