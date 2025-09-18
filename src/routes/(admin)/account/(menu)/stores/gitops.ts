import { writable, type Writable } from 'svelte/store';
import { type Connection, fetchWithTimeout } from '../../types/context/connection';
import { elapsedTimerStore } from './time';

export let gitopsIds: Writable<string[]> = writable([]);
export let gitopsMap: Writable<Record<string, { [key: string]: any }>> = writable({});

export function AddGitops(gitops: any) {
    gitopsMap.update(gitopses => {
        const existingId = Object.keys(gitopses).find(
            key => `${gitopses[key].Definition.meta.group}-${gitopses[key].Definition.meta.name}` === `${gitops.Definition.meta.group}-${gitops.Definition.meta.name}`
        );

        if (existingId) {
            elapsedTimerStore.add(existingId, new Date(gitops.Gitops.Status.LastUpdate).getTime());
            return { ...gitopses, [existingId]: gitops };
        } else {
            UpdateState(gitops.Definition.meta.group, gitops.Definition.meta.name, "test", "test")

            gitopsIds.update(ids => {
                const newIds = [...ids, `${gitops.Definition.meta.group}-${gitops.Definition.meta.name}`];
                elapsedTimerStore.add(`${gitops.Definition.meta.group}-${gitops.Definition.meta.name}`, new Date(gitops.Gitops.Status.LastUpdate).getTime());

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

    elapsedTimerStore.remove(id);
    gitopsIds.update(ids => ids.filter(existingId => existingId !== id));
}

export function UpdateState(group: string, name: string, state: string, time: any) {
    gitopsMap.update(currentMap => {
        const key = `${group}-${name}`;

        const target = currentMap[key] || {
            Gitops: { Status: { state: { state: null }, LastUpdate: null } }
        };

        return {
            ...currentMap,
            [key]: {
                ...target,
                Gitops: {
                    ...target.Gitops,
                    Status: {
                        ...target.Gitops.Status,
                        state: {
                            ...target.Gitops.Status.state,
                            state: state
                        },
                        LastUpdate: time
                    }
                }
            }
        };
    });
}

export async function ReloadGitops(c: Connection, group: string, name: string) {
    try {
        const resp = await fetchWithTimeout(`${c.GetProxyURL()}/api/v1/state/simplecontainer.io/v1/state/gitops/${group}/${name}/${name}`, {
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
                RemoveGitops(`${group}-${name}`);
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