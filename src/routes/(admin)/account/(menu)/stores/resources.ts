import toastStore from "../../toasts";
import { writable, type Writable } from 'svelte/store';
import type {Connection} from "../../types/context/connection";

export let resourcesMap: Writable<Record<string, { [key: string]: any }>> = writable({});

export function AddResource(resource: any) {
    resourcesMap.update(resources => {
        const existingId = Object.keys(resources).find(
            key => `${resources[key].meta.group}-${resources[key].meta.name}` === `${resource.meta.group}-${resource.meta.name}`
        );

        if (existingId) {
            return { ...resources, [existingId]: resource };
        } else {
            return { ...resources, [`${resource.meta.group}-${resource.meta.name}`]: resource };
        }
    });
}

export function RemoveResource(id: string) {
    resourcesMap.update(resources => {
        const newResources = { ...resources };
        delete newResources[id];
        return newResources;
    });
}

export async function ReloadResource(c: Connection, group: string, name: string) {
    try {
        const resp = await fetch(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/kind/resource/${group}/${name}`, {
            method: 'GET',
        });

        if (resp.status == 200) {
            const state = await resp.json();

            if (state.HttpStatus === 200) {
                AddResource(state.Data);
            } else {
                RemoveResource(name);
            }
        } else {
            RemoveResource(name);
        }
    } catch (error) {
        toastStore.addToast({ message: error, type: 'error' });
    }
}

export function ClearResources() {
    resourcesMap.set({})
}