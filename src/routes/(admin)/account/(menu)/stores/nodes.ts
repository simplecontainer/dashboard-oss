import toastStore from "../../toasts";
import type { Node } from "../../types/node/type";
import { writable, type Writable } from 'svelte/store';
import type {Connection} from "../../types/context/connection";

export const nodesMap: Writable<Record<string, Node>> = writable({});

export function AddNode(node: Node) {
    nodesMap.update(nodes => {
        const entry = Object.entries(nodes).find(
            ([, value]) => value.NodeID === node.NodeID
        );

        const key = entry ? entry[0] : `${node.NodeID}`;
        return { ...nodes, [key]: node };
    });
}

export function RemoveNode(id: string) {
    nodesMap.update(nodes => {
        const { [id]: _, ...rest } = nodes;
        return rest;
    });
}

export async function ReloadNode(c: Connection, NodeID: string) {
    try {
        const nodeRes = await fetch(`${c.GetProxyURL()}/api/v1/cluster/node/${NodeID}`, {
            headers: { Upstream: btoa(c.Context.API).replace(/=+$/,'') },
        });

        if (!nodeRes.ok) {
            RemoveNode(NodeID);
            return;
        }

        const nodeData = await nodeRes.json();
        if (nodeData.HttpStatus !== 200) {
            RemoveNode(NodeID);
            return;
        }

        const versionRes = await fetch(`${c.GetProxyURL()}/api/v1/node/version/${nodeData.Data.NodeID}`, {
            headers: { Upstream: btoa(c.Context.API).replace(/=+$/,'') },
        });

        if (!versionRes.ok) {
            toastStore.addToast({ message: 'Failed to fetch node version', type: 'error' });
            return;
        }

        const versionData = await versionRes.json();
        nodeData.Data.Version = versionData.Data;

        AddNode(nodeData.Data);
    } catch (err: unknown) {
        toastStore.addToast({ message: (err instanceof Error ? err.message : 'Unknown error'), type: 'error' });
    }
}