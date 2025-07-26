import { writable, type Writable } from 'svelte/store';
import { type Connection, fetchWithTimeout } from '../../types/context/connection';

export let gitopsIds: Writable<string[]> = writable([]);
export let gitopsMap: Writable<Record<string, { [key: string]: any }>> = writable({});

export function AddGitops(gitops: any) {
    gitopsMap.update(gitopses => {
        const existingId = Object.keys(gitopses).find(
            key => `${gitopses[key].Definition.meta.group}-${gitopses[key].Definition.meta.name}` === `${gitops.Definition.meta.group}-${gitops.Definition.meta.name}`
        );

        if (existingId) {
            return { ...gitopses, [existingId]: gitops };
        } else {
            gitopsIds.update(ids => {
                const newIds = [...ids, `${gitops.Definition.meta.group}-${gitops.Definition.meta.name}`];

                return newIds.sort((a, b) => {
                    const [groupA, nameA] = a.split(new RegExp("-")).splice(0, 2);
                    const [groupB, nameB] = b.split(new RegExp("-")).splice(0, 2);

                    return groupA.localeCompare(groupB) || nameA.localeCompare(nameB);
                });
            });

            return { ...gitopses, [`${gitops.Definition.meta.group}-${gitops.Definition.meta.name}`]: gitops };
        }
    });
}

export function RemoveGitops(id: string) {
    gitopsMap.update(gitopses => {
        const newContainers = { ...gitopses };
        delete newContainers[id];
        return newContainers;
    });

    gitopsIds.update(ids => ids.filter(existingId => existingId !== id));
}

export async function ReloadGitops(c: Connection, group: string, name: string) {
    try {
        const resp = await fetchWithTimeout(`${c.GetProxyURL()}/api/v1/kind/simplecontainer.io/v1/state/gitops/${group}/${name}/${name}`, {
            method: 'GET',
            headers: {
        Upstream: btoa(c.Context.API).replace(/=+$/,''),
      },
        });

        if (resp.status == 200) {
            const state = await resp.json();

            if (state.HttpStatus === 200) {
                AddGitops(state.Data);
            } else {
                RemoveGitops(`${state.Data.Definition.meta.group}-${state.Data.Definition.meta.name}`);
            }
        } else {
            RemoveGitops(`${group}-${name}`);
        }
    } catch (error) {
        console.error("Error during fetch or processing response:", error);
        RemoveGitops(`${group}-${name}`);
    }
}

export function ClearGitops() {
    gitopsIds.set([])
    gitopsMap.set({})
}