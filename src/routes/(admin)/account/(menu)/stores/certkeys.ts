import toastStore from "../../toasts";
import { writable, type Writable } from 'svelte/store';
import type {Connection} from "../../types/context/connection";

export let certkeysMap: Writable<Record<string, { [key: string]: any }>> = writable({});

export function AddCertKey(certkey: any) {
    certkeysMap.update(certkeys => {
        const existingId = Object.keys(certkeys).find(
            key => `${certkeys[key].meta.group}-${certkeys[key].meta.name}` === `${certkey.meta.group}-${certkey.meta.name}`
        );

        if (existingId) {
            return { ...certkeys, [existingId]: certkey };
        } else {
            return { ...certkeys, [`${certkey.meta.group}-${certkey.meta.name}`]: certkey };
        }
    });
}

export function RemoveCertKey(id: string) {
    certkeysMap.update(certkeys => {
        const newcertkeys = { ...certkeys };
        delete newcertkeys[id];
        return newcertkeys;
    });
}

export async function ReloadCertKeys(c: Connection, group: string, name: string) {
    try {
        const resp = await fetch(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/kind/certkey/${group}/${name}`, {
            method: 'GET',
        });

        if (resp.status == 200) {
            const state = await resp.json();

            if (state.HttpStatus === 200) {
                AddCertKey(state.Data);
            } else {
                RemoveCertKey(name);
            }
        } else {
            RemoveCertKey(name);
        }
    } catch (error) {
        toastStore.addToast({ message: error, type: 'error' });
    }
}