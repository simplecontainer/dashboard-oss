import toastStore from "../../toasts";
import { writable, type Writable } from 'svelte/store';
import { type Connection, fetchWithTimeout } from '../../types/context/connection';

export const secretsMap: Writable<Record<string, { [key: string]: any }>> = writable({});

export function AddSecret(secret: any) {
    secretsMap.update(secrets => {
        const existingId = Object.keys(secrets).find(
            key => `${secrets[key].meta.group}-${secrets[key].meta.name}` === `${secret.meta.group}-${secret.meta.name}`
        );

        if (existingId) {
            return { ...secrets, [existingId]: secret };
        } else {
            return { ...secrets, [`${secret.meta.group}-${secret.meta.name}`]: secret };
        }
    });
}

export function RemoveSecret(id: string) {
    secretsMap.update(secrets => {
        const newsecrets = { ...secrets };
        delete newsecrets[id];
        return newsecrets;
    });
}

export async function ReloadSecret(c: Connection, group: string, name: string) {
    try {
        const resp = await fetchWithTimeout(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/kind/secret/${group}/${name}`, {
            method: 'GET',
        });

        if (resp.status == 200) {
            const state = await resp.json();

            if (state.HttpStatus === 200) {
                AddSecret(state.Data);
            } else {
                RemoveSecret(name);
            }
        } else {
            RemoveSecret(name);
        }
    } catch (error) {
        toastStore.addToast({ message: error, type: 'error' });
    }
}

export function ClearSecrets() {
    secretsMap.set({})
}