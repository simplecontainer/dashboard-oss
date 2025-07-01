interface Drain {
    node_id: number;
}

interface Upgrade {
    image: string;
    tag: string;
}

interface Start {
    node_api: string;
    overlay: string;
    backend: string;
}

interface IControl {
    drain?: Drain;
    upgrade?: Upgrade;
    start?: Start;
    timestamp?: string; // Use string for ISO 8601 date format
}

