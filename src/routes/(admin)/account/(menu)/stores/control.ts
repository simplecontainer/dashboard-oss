import {writable, type Writable} from "svelte/store";
import {Control, type Node} from "../../types/node/type";

export const controlList: Writable<Control[]> = writable([]);
export const controlMap: Writable<Record<string, Control>> = writable({});
export const upgradeEvents = writable([]); // Store for incoming events
export const upgradingNode: Writable<Node> = writable(null)

export function AddControl(control: Control) {
    controlList.update(controls => {
        return [...controls, control];
    });
}

export function PopControl(): (Control | undefined) {
    let removedControl: Control | undefined;

    controlList.update(controls => {
        removedControl = controls.shift();
        return [...controls];
    });

    return removedControl;
}

export function popUpgradeEvent() {
    let poppedEvent: any = null;

    upgradeEvents.update((evs) => {
        if (evs.length > 0) {
            poppedEvent = evs.shift();
        }
        return evs;
    });

    return poppedEvent;
}
