import toastStore from "../../toasts";
import { writable, type Writable } from 'svelte/store';
import { type Connection, fetchWithTimeout } from '../../types/context/connection';

export let httpauthsMap: Writable<Record<string, { [key: string]: any }>> = writable({});

export function AddHttpAuth(httpauth: any) {
    httpauthsMap.update(httpauths => {
        const existingId = Object.keys(httpauths).find(
            key => `${httpauths[key].meta.group}-${httpauths[key].meta.name}` === `${httpauth.meta.group}-${httpauth.meta.name}`
        );

        if (existingId) {
            return { ...httpauths, [existingId]: httpauth };
        } else {
            return { ...httpauths, [`${httpauth.meta.group}-${httpauth.meta.name}`]: httpauth };
        }
    });
}

export function RemoveHttpAuth(id: string) {
    httpauthsMap.update(httpauths => {
        const newhttpauths = { ...httpauths };
        delete newhttpauths[id];
        return newhttpauths;
    });
}

export async function ReloadHttpAuth(c: Connection, group: string, name: string) {
    try {
        const resp = await fetchWithTimeout(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/kind/httpauth/${group}/${name}`, {
            method: 'GET',
        });

        if (resp.status == 200) {
            const state = await resp.json();

            if (state.HttpStatus === 200) {
                AddHttpAuth(state.Data);
            } else {
                RemoveHttpAuth(name);
            }
        } else {
            RemoveHttpAuth(name);
        }
    } catch (error) {
        toastStore.addToast({ message: error, type: 'error' });
    }
}

export function ClearHttpAuths() {
    httpauthsMap.set({})
}