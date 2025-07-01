import toastStore from "../../toasts";
import { writable, type Writable } from 'svelte/store';
import type {Connection} from "../../types/context/connection";
import { elapsedTimerStore } from './time';

export let containerIds: Writable<string[]> = writable([]);
export let containersMap: Writable<Record<string, { [key: string]: any }>> = writable({});

export function AddContainer(container: any) {
    const id = container.Platform.GeneratedName;

    containersMap.update(containers => {
        const existingId = Object.keys(containers).find(
          key => containers[key].Platform.GeneratedName === id
        );

        if (existingId) {
            elapsedTimerStore.add(existingId, new Date(container.General.Status.LastUpdate).getTime());
            return { ...containers, [existingId]: container };
        } else {
            containerIds.update(ids => [...ids, id]);
            elapsedTimerStore.add(id, new Date(container.General.Status.LastUpdate).getTime());
            return { ...containers, [id]: container };
        }
    });
}

export function RemoveContainer(id: string) {
    containersMap.update(containers => {
        const newContainers = { ...containers };
        delete newContainers[id];
        return newContainers;
    });

    elapsedTimerStore.remove(id);
    containerIds.update(ids => ids.filter(existingId => existingId !== id));
}

export function ClearContainers() {
    containersMap.set({});
    containerIds.set([]);
}

export function SortContainers() {
    containerIds.update(ids => {
        return [...ids].sort((a, b) => a.localeCompare(b));
    });
}


export async function ReloadContainer(c: Connection, group: string, name: string) {
    try {
        const resp = await fetch(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/state/containers/${group}/${name}`, {
            method: 'GET',
            headers: {
                Upstream: btoa(c.Context.API).replace(/=+$/,''),
            },
        });

        if (resp.status == 200) {
            const state = await resp.json();

            if (state.HttpStatus === 200) {
                AddContainer(state.Data);
            } else {
                RemoveContainer(name);
            }
        } else {
            RemoveContainer(name);
        }
    } catch (error) {
        toastStore.addToast({ message: error, type: 'error' });
    }
}