<script lang="ts">
    import {onDestroy, onMount} from "svelte"
    import {GetActiveConnectionSession, SetActiveConnectionSession} from "../../session/session";
    import {
        connection,
        connections,
        AddOrUpdateConnection,
        SetActiveConnection,
        ClearActiveConnection, RemoveConnection
    } from '../stores/connections';
    import { type IConnection, type IRContext } from '../../types/context/type';
    import {Connection } from "../../types/context/connection";
    import {State} from "../../types/context/state";
    import {Context} from "../../types/context/context";
    import {Node} from "../../types/node/type"

    import {KIND_CONTAINERS, KIND_GITOPS, KIND_NODE} from "../../types/simplecontainer/static";
    import {
        EVENT_CHANGED,
        EVENT_DELETED,
        EVENT_CONTROL_START,
        EVENT_CONTROL_SUCCESS,
        eventsStore,
        popEvent
    } from "../events";
    import { ClearGitops, ReloadGitops, RemoveGitops, UpdateState } from '../stores/gitops';
    import { ClearContainers, ReloadContainer, RemoveContainer } from '../stores/containers';
    import {socket} from "../sockets/wss"
    import {get, type Writable, writable} from "svelte/store";
    import toastStore from '../../toasts';
    import {Cluster} from "../../types/context/cluster";
    import {AddNode, ReloadNode} from "../stores/nodes";
    import {upgradeEvents, upgradingNode} from "../stores/control";
    import { ClearConfigurations } from '../stores/configurations';
    import { ClearSecrets } from '../stores/secrets';
    import { ClearHttpAuths } from '../stores/httpauths';
    import { ClearCertKeys } from '../stores/certkeys';
    import { ClearResources } from '../stores/resources';

    import { gitopsIds, gitopsMap } from '../stores/gitops';

    export let clusters: IRContext[] = [];
    export let proxyApiDomain : string = ""
    export let proxyDomain : string = ""

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

    async function ParseClusters() {
        let active = GetActiveConnectionSession()

        if (clusters !== null) {
            for (let cluster of clusters){
                let c: Connection

                c = new Connection({
                    State: new State({}),
                    Context: new Context({}),
                })

                c.Context.Parse(cluster as IRContext)

                try {
                    AddOrUpdateConnection(c)
                } catch(e) {
                    console.log(e)
                }
            }
        }

        if (active !== null) {
            active = new Connection(active)

            if (!$socket) {
                await ActivateConnection(active)
            } else {
                active.SetConnected()
                AddOrUpdateConnection(active)
            }
        }
    }

    async function ActivateConnection(c: Connection){
        try {
            await c.SetupProxy(proxyApiDomain, proxyDomain)
        } catch(err) {
            toastStore.addToast({ message:  (err instanceof Error ? err.message : String(err)), type: "error" })
            return
        }

        try {
            await c.Connect()
        } catch(err) {
            toastStore.addToast({ message: (err instanceof Error ? err.message : String(err)), type: "error" })
            AddOrUpdateConnection(c)
            return
        }

        AddOrUpdateConnection(c)
        SetActiveConnection(c)

        await WSSConnect(c)

        document.getElementById("context-switcher").removeAttribute("open")
    }
    async function DeactivateConnection(c: Connection){
        if (c !== undefined && Object.keys(c).length > 0) {
            if ($socket) {
                $socket.close();
                socket.set(null);
            }

            c.Clear()
            ClearActiveConnection()
        }
    }

    function WSSConnect(c: Connection): Promise<boolean> {
        console.log("Attempting to connect to WebSocket server");

        return new Promise((resolve) => {
            if ($socket?.readyState === WebSocket.OPEN) {
                console.log("Socket is already connected");
                c.SetConnected();
                AddOrUpdateConnection(c);
                SetActiveConnection(c);
                resolve(true);
                return;
            }

            if ($socket) {
                $socket.close();
                socket.set(null);
            }

            const WSSURL = new URL(c.Context.ProxyURL.toString());

            if (WSSURL.protocol === "https:"){
                WSSURL.protocol = "wss:";
            } else {
                WSSURL.protocol = "ws:";
            }

            const wsUrl = `${WSSURL.toString()}events`;

            try {
                const ws = new WebSocket(wsUrl, ["Upstream", btoa(c.Context.API).replace(/=+$/,'')]);
                socket.set(ws);

                const connectionTimeout = setTimeout(() => {
                    if (ws.readyState !== WebSocket.OPEN) {
                        console.error("WebSocket connection timeout");
                        ws.close();
                        toastStore.addToast({ message: 'Connection timeout', type: 'error' });
                        c.SetDisconnected();
                        AddOrUpdateConnection(c);
                        SetActiveConnection(c);
                        resolve(false);
                    }
                }, 10000);

                ws.onopen = () => {
                    clearTimeout(connectionTimeout);
                    console.log("WebSocket connection established");
                    c.SetConnected();
                    AddOrUpdateConnection(c);
                    SetActiveConnection(c);
                    toastStore.addToast({ message: 'Connected to the node', type: 'success' });

                    const heartbeatInterval = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'heartbeat' }));
                        } else {
                            clearInterval(heartbeatInterval);
                        }
                    }, 30000);

                    ws.heartbeatInterval = heartbeatInterval;

                    ws.send("testing string")

                    resolve(true);
                };

                ws.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    console.log(error)
                    toastStore.addToast({ message: 'Connection error', type: 'error' });
                    resolve(false);
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === 'upgrade_notification') {
                            upgradingNode.set({
                                NodeName: c.Context.Name,
                                State: {
                                    Control: {
                                        Upgrading: true,
                                        Draining: true
                                    }
                                }
                            });
                            toastStore.addToast({
                                message: 'Node is upgrading - waiting for reconnection',
                                type: 'info'
                            });
                        }

                        eventsStore.update((evs) => [...evs, event]);
                    } catch (e) {
                        console.error('Error processing WebSocket message:', e);
                        eventsStore.update((evs) => [...evs, event]);
                    }
                };

                ws.onclose = async (closeEvent) => {
                    clearTimeout(connectionTimeout);

                    if (ws.heartbeatInterval) {
                        clearInterval(ws.heartbeatInterval);
                    }

                    console.log(`WebSocket closed with code ${closeEvent.code}`, closeEvent.reason);

                    const wasConnected = c.IsConnected();
                    c.SetDisconnected();
                    AddOrUpdateConnection(c);

                    if (wasConnected) {
                        if ($upgradingNode?.NodeName === c.Context.Name) {
                            handleUpgradeReconnection(c, resolve);
                        } else {
                            toastStore.addToast({
                                message: 'Connection lost, attempting to reconnect',
                                type: 'info'
                            });

                            socket.set(null);
                            handleReconnection(c, resolve);
                        }
                    } else {
                        socket.set(null);
                        resolve(false);
                    }
                };
            } catch (error) {
                console.error('Failed to initialize WebSocket:', error);
                toastStore.addToast({ message: 'Failed to initialize connection', type: 'error' });
                c.SetDisconnected();
                AddOrUpdateConnection(c);
                SetActiveConnection(c);
                resolve(false);
            }
        });
    }
    async function handleUpgradeReconnection(c: Connection, resolve: (value: boolean) => void) {
        toastStore.addToast({
            message: 'Node is upgrading - will automatically reconnect when back online',
            type: 'info'
        });

        c.SetDisconnected();
        AddOrUpdateConnection(c);
        SetActiveConnection(c);

        socket.set(null);

        let attempts = 0;
        const maxAttempts = 5; // Try for about 5 minutes (30 x exponential backoff)

        while (attempts < maxAttempts) {
            console.log(`Upgrade reconnection attempt ${attempts + 1}/${maxAttempts}`);

            // Exponential backoff: 1s, 2s, 4s, etc. up to max 30s
            const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
            await new Promise(r => setTimeout(r, delay));

            const result = await ActivateConnection(c);

            if (c.IsConnected()) {
                if ($upgradingNode) {
                    $upgradingNode.State.Control.Upgrading = false;
                    $upgradingNode.State.Control.Draining = false;
                    AddNode($upgradingNode);
                    upgradingNode.set(null);
                }

                toastStore.addToast({
                    message: 'Node upgrade complete, reconnection successful',
                    type: 'success'
                });

                resolve(true);
                return;
            }

            attempts++;
        }

        toastStore.addToast({
            message: 'Failed to reconnect after upgrade, please try manually',
            type: 'error'
        });

        resolve(false);
    }
    async function handleReconnection(c: Connection, resolve: (value: boolean) => void) {
        let attempts = 0;
        const maxAttempts = 1;

        while (attempts < maxAttempts) {
            console.log(`Reconnection attempt ${attempts + 1}/${maxAttempts}`);

            const delay = 1000 * Math.pow(2, attempts);
            await new Promise(r => setTimeout(r, delay));

            const result = await ActivateConnection(c);

            if (c.IsConnected()) {
                toastStore.addToast({
                    message: 'Reconnection successful',
                    type: 'success'
                });
                resolve(true);
                return;
            }

            attempts++;
        }

        toastStore.addToast({
            message: 'Failed to reconnect after multiple attempts',
            type: 'error'
        });

        SetActiveConnection(c);
        resolve(false);
    }

    let unsubscribe: any

    onMount(async () => {
        await ParseClusters()

        unsubscribe = eventsStore.subscribe((evs) => {
            if (evs.length > 0) {
                let e = JSON.parse(popEvent().data);

                switch (e.Kind){
                    case KIND_NODE:
                        upgradeEvents.update((evs) => [...evs, JSON.stringify(e)]);
                    break
                    case KIND_GITOPS:
                    switch (e.Type){
                        case EVENT_CHANGED:
                            ReloadGitops($connection, e.Group, e.Name)
                            break
                        case EVENT_DELETED:
                            RemoveGitops(`${e.Group}-${e.Name}`)
                            break
                        default:
                            UpdateState(e.Group, e.Name, e.Type, Date.now())
                    }
                    break

                    case KIND_CONTAINERS:
                        switch (e.Type){
                            case EVENT_CHANGED:
                                ReloadContainer($connection, e.Group, e.Name)
                                break
                            case EVENT_DELETED:
                                RemoveContainer(e.Name)
                                break
                        }
                        break
                }
            }
        });

        const handleBeforeUnload = () => {
            if ($socket?.readyState === WebSocket.OPEN) {
                $socket.close(1000, "Page unloading");
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
    });

    onDestroy(() => {
        if (unsubscribe != null) {
            unsubscribe()
        }
    })

    let message = writable('');

    export async function ShowModal(c: Connection) {
        DeactivateConnection($connection)
        ActivateConnection(c)

        ClearGitops()
        ClearContainers()
        ClearConfigurations()
        ClearCertKeys()
        ClearSecrets()
        ClearHttpAuths()
        ClearResources()
    }
</script>

<li>
    <details
      id="context-switcher"
      use:clickOutside
      onoutclick={() => document.getElementById("context-switcher").removeAttribute("open")}
      class="relative"
    >
        <summary>
            {#if $connection?.Context?.Name}
                <div class="flex items-center">
                    {#if $connection.State.WSS}
                        <span class="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                    {/if}
                    <span class="truncate max-w-[10rem]">{$connection.Context.Name}</span>
                </div>
            {:else}
                {#if Array.from($connections.entries()).length === 0}
                    Context list empty
                {:else}
                    No active context
                {/if}
            {/if}
        </summary>

        <ul
          class="absolute bg-base-100 rounded-t-none p-2 right-0 z-50 w-max max-w-sm break-words shadow-md"
        >
            {#if Array.from($connections.entries()).length > 0}
                {#each Array.from($connections.entries()) as [key, c]}
                    <li class="whitespace-normal break-words max-w-full">
                        <a onclick={() => ShowModal(c)} class="block text-ellipsis overflow-hidden">
                            {c.Context.Name}
                        </a>
                    </li>
                {/each}
            {/if}
        </ul>
    </details>
</li>