import * as dagreD3 from "dagre-d3";
import * as d3 from "d3";
import type { DAGNode, DAGEdge } from "./type";

export function createGraph(nodes: DAGNode[], edges: DAGEdge[]) {
    const graph = new dagreD3.graphlib.Graph().setGraph({});

    graph.setGraph({ rankdir: "LR", nodesep: 50, edgesep: 10 });
    graph.setDefaultEdgeLabel(() => ({}));

    for (const node of nodes) {
        graph.setNode(node.id, {
            label: node.label,
            labelType: "html",
            class: node.class || "node",
            padding: 0,
            shape: "rect",
            data: node.data,
        });
    }

    for (const edge of edges) {
        graph.setEdge(edge.from, edge.to, {label: ""});
    }

    return graph
}

export function updateGraph(graph: any, nodes: DAGNode[], edges: DAGEdge[]) {
    graph.setGraph({ rankdir: "LR", nodesep: 50, edgesep: 10 });
    graph.setDefaultEdgeLabel(() => ({}));

    for (const node of nodes) {
        graph.setNode(node.id, {
            label: node.label,
            labelType: "html",
            class: node.class || "node",
            padding: 0,
            shape: "rect",
            data: node.data,
        });
    }

    for (const edge of edges) {
        graph.setEdge(edge.from, edge.to, {label: ""});
    }

    return graph
}

