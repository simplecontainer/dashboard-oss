export class Control implements IControl {
    drain?: Drain;
    upgrade?: Upgrade;
    start?: Start;
    timestamp?: string;

    constructor(
        drain?: Drain,
        upgrade?: Upgrade,
        start?: Start,
        timestamp?: string
    ) {
        this.drain = drain;
        this.upgrade = upgrade;
        this.start = start;
        this.timestamp = timestamp;
    }
}
