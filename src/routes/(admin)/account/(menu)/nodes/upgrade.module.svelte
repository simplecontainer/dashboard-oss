<script lang="ts">
    import {onDestroy, onMount} from "svelte"
    import {connection} from "../stores/connections"
    import {type Connection, fetchWithTimeout} from "../../types/context/connection";
    import {writable} from "svelte/store";
    import ConfirmationModal from "../shared/confirm.svelte";
    import {AddNode, nodesMap, RemoveNode} from "../stores/nodes"
    import {Control} from "../../types/control/control";
    import toastStore from "../../toasts";
    import {AddControl, PopControl, popUpgradeEvent, upgradeEvents} from "../stores/control"
    import {Node} from "../../types/node/type";
    import {EVENT_CONTROL_START, EVENT_CONTROL_SUCCESS, popEvent} from "../events";
    import {upgradingNode} from "../stores/control";
    import {controlList} from "../stores/control";
    import {get} from "svelte/store";

    let confirmRef: ConfirmationModal

    export let currentImage: any
    export let currentTag: any

    export const tags = writable<string[]>([]);

    function clickOutside(node) {
        const handleClick = (event) => {
            if (!node.contains(event.target)) {
                node.dispatchEvent(new CustomEvent('outclick'));
            }
        };

        onMount(() => {
            document.addEventListener('click', handleClick);
        });

        return {
            destroy() {
                document.removeEventListener('click', handleClick);
            },
        };
    }

    async function FetchCurrentTag(){
        fetchWithTimeout(`${$connection.Context.ProxyURL}/version`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }, 10000)
            .then(async (resp) => {
                const data = await resp.json();

                currentImage.set(data.Data.Image)
                currentTag.set(data.Data.Node)
            })
            .catch((err) => {
                console.log(err)
            });
    }
    async function FetchLatestTags(){
        fetch(`https://quay.io/api/v1/repository/simplecontainer/smr/tag/?limit=5&onlyActiveTags=true`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(async (resp) => {
            const data = await resp.json();

            const sorted = data.tags
                .filter((tag: any) => tag.name !== "latest")
                .sort((a, b) => b.start_ts - a.start_ts)
                .map((tag: any) => tag.name);

            tags.set(sorted);
        })
        .catch((err) => {
            tags.set([]);
        });
    }

    onMount(async () => {
        await FetchCurrentTag()
        await FetchLatestTags()
    });
    onDestroy(() => {
        unsubscribeEvents()
        unsubscribeControls()
    })

    const unsubscribeEvents = upgradeEvents.subscribe((evs) => {
        if (evs.length > 0) {
            let e = JSON.parse(popUpgradeEvent());
            let n = JSON.parse(atob(e.Data)) as unknown as Node;

            switch (e.Type){
                case EVENT_CONTROL_SUCCESS:
                    processing = false
                    AddNode(n)
                    break
                case EVENT_CONTROL_START:
                    if (n.State.Control.Draining == true && n.State.Control.Upgrading == false) {
                        RemoveNode(n.NodeID.toString())
                    } else {
                        AddNode(n)
                        upgradingNode.set(n)
                    }
                    break
            }
        }
    })

    let processing = false;

    const unsubscribeControls = controlList.subscribe(async (controls) => {
        if (!processing && controls.length > 0) {
            await processNextControl();
        }
    })

    async function processNextControl() {
        while (get(controlList).length > 0) {
            if (!processing) {
                processing = true;
                const control = PopControl();

                if (control) {
                    await SendControl($connection, control);
                    await waitForConfirmation();
                }
            }
        }
    }

    function waitForConfirmation(): Promise<void> {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (!processing) {
                    clearInterval(interval);
                    resolve();
                }
            }, 500);
        });
    }


    let confirm = writable(false);
    let selectedTag = writable("");

    const handleConfirm = async () => {
        let rootControl: Control | null = null;

        Object.values($nodesMap).forEach((node) => {
            const [image, tag] = node.Version.Image.split(":");
            const control = new Control(
                { node_id: node.NodeID } as Drain,
                { image, tag } as Upgrade,
                null,
                new Date().toISOString()
            );

            if ($connection.Context.Name !== node.NodeName) {
                AddControl(control);
            } else {
                rootControl = control;
            }
        });

        if (rootControl) {
            AddControl(rootControl);
        }

        document.getElementById('upgrade-modal')?.close();
    };

    const handleCancel = () => {
        document.getElementById('upgrade-modal').close()
    };

    function ShowModal(node: Node) {
        $confirm = true
        document.getElementById('upgrade-modal').showModal()
    }

    async function SendControl(c: Connection, control: Control) {
        const resp = await fetch(`${c.GetProxyURL()}/api/v1/cluster/control`, {
            method: 'POST',
            headers: {
                Upstream: btoa(c.Context.API).replace(/=+$/,''),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(control)
        });

        const result = await resp.json();

        if (resp.ok) {
            toastStore.addToast({ message: result.Explanation, type: 'success' })
        } else {
            toastStore.addToast({ message: result.ErrorExplanation, type: 'error' })
        }
    }
</script>

<li>
    <details id="upgrade-switcher" use:clickOutside onoutclick={() => document.getElementById("upgrade-switcher").removeAttribute("open")}>
        <summary>
           {#if $tags[0] == $currentTag}
           Upgrade cluster (latest)
           {:else}
           Upgrade cluster (available)
           {/if}
        </summary>
        <ul class="bg-base-100 dropdown-end rounded-t-none p-2 z-50">
            {#each $tags as tag }
                {#if tag == $currentTag}
                    <li><a>{tag} (current)</a></li>
                {:else}
                    <li><a onclick={() => ShowModal(tag)}>{tag}</a></li>
                {/if}
            {/each}
        </ul>
    </details>
</li>


<dialog id="upgrade-modal" class="modal">
    <div class="modal-box">
        <h3 class="text-lg font-bold">Please confirm action?</h3>
        <ConfirmationModal
                bind:this={confirmRef}
                open={confirm}
                message="Are you sure - this will drain ALL nodes and upgrade them?"
                type="error"
                onConfirm={handleConfirm}
                onCancel={handleCancel}
        />
    </div>
    <form method="dialog" class="modal-backdrop">
        <button>close</button>
    </form>
</dialog>