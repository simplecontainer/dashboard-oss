import toastStore from "../../toasts";
import { writable, type Writable } from 'svelte/store';
import type {Connection} from "../../types/context/connection";

export let configurationsMap: Writable<Record<string, { [key: string]: any }>> = writable({});

export function AddConfiguration(configuration: any) {
    configurationsMap.update(configurations => {
        const existingId = Object.keys(configurations).find(
            key => `${configurations[key].meta.group}-${configurations[key].meta.name}` === `${configuration.meta.group}-${configuration.meta.name}`
        );

        if (existingId) {
            return { ...configurations, [existingId]: configuration };
        } else {
            return { ...configurations, [`${configuration.meta.group}-${configuration.meta.name}`]: configuration };
        }
    });
}

export function RemoveConfiguration(id: string) {
    configurationsMap.update(configurations => {
        const newconfigurations = { ...configurations };
        delete newconfigurations[id];
        return newconfigurations;
    });
}

export async function ReloadConfiguration(c: Connection, group: string, name: string) {
    try {
        const resp = await fetch(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/kind/configuration/${group}/${name}`, {
            method: 'GET',
        });

        if (resp.status == 200) {
            const state = await resp.json();

            if (state.HttpStatus === 200) {
                AddConfiguration(state.Data);
            } else {
                RemoveConfiguration(name);
            }
        } else {
            RemoveConfiguration(name);
        }
    } catch (error) {
        toastStore.addToast({ message: error, type: 'error' });
    }
}