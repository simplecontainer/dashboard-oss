export class Health {
    Cluster!: boolean;
    Etcd!: boolean;
    Running!: boolean;
    MemoryPressure!: boolean;
    CpuPressure!: boolean;
}

export class Control {
    Upgrading!: boolean;
    Draining!: boolean;
    Recovering!: boolean;
}

export class State {
    Health!: Health;
    Control!: Control;
}

export class Node {
    NodeID!: number;
    NodeName!: string;
    API!: string;
    URL!: string;
    State!: State;
    Version!: Version;
}

export class Version {
    Image!: string;
    Node!: string;
}

export class Nodes {
    nodes!: Node[];
}

