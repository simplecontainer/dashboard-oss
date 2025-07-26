import { writable } from 'svelte/store';
import type {Connection} from "../types/context/connection";

const SessionStore = (key: string, initialValue: Connection) => {
    const value = initialValue;

    const store = writable(value);

    store.subscribe(($store) => {
        sessionStorage.setItem(key, JSON.stringify($store));
    });

    return store;
};

const SessionRemove = (key: string) => {
    sessionStorage.removeItem(key)
}

export function AddConnectionSession(c: Connection) {
    SessionStore(c.Context.Name, c)
}

export function SetActiveConnectionSession(c: Connection) {
    SessionStore("active", c)
}

export function RemoveActiveConnectionSession(){
    SessionRemove("active")
}

export function GetActiveConnectionSession() {
    return GetConnectionSession("active")
}

export function GetConnectionSession(name: string)  {
    const storedValue = sessionStorage.getItem(name)

    if (storedValue != null) {
        return JSON.parse(storedValue)
    } else {
        return null
    }
}