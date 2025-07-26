import type { DAGNode, DAGEdge } from './dag/type';
import { Label, InnerLabel, icons, display } from './dag/label';
import {KIND_CONTAINERS} from "../../types/simplecontainer/static"
import {ReloadContainer} from "../stores/containers";
import { type Connection, fetchWithTimeout } from '../../types/context/connection';

export function createNode({ id, def, label, className = "" }: { id: string, def: any, label: string, className?: string }): DAGNode {
    return {
        id,
        label,
        class: className,
        data: def
    };
}

export function getStatusInfo(state: any): { statusKey: string, nodeClass: string } {
    if (state?.notOwner) return { statusKey: "owner", nodeClass: "show-owner" };
    if (state?.missing) return { statusKey: "missing", nodeClass: "show-missing" };
    if (state?.synced) return { statusKey: "synced", nodeClass: "show-synced" };
    if (state?.drifted) return { statusKey: "drifted", nodeClass: "show-drifted" };

    return { statusKey: "error", nodeClass: "show-error" };
}
