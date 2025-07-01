export type DAGNode = {
    id: string;
    label?: string;
    data: any;
    class: string;
};

export type DAGEdge = {
    from: string;
    to: string;
};
