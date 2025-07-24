<script lang="ts">
    import { onMount } from "svelte";
    import * as d3 from "d3";
    import * as dagreD3 from "dagre-d3";
    import { createGraph } from "./dag/graph";
    import type {DAGEdge, DAGNode} from "./dag/type";
    import { createNode, getStatusInfo } from "./workflow";
    import type { Connection } from "../../types/context/connection";
    import {gitopsMap} from "../stores/gitops";
    import {containersMap, ReloadContainer} from "../stores/containers"
    import {display, InnerLabel, Label} from "./dag/label";
    import {KIND_CONTAINERS} from "../../types/simplecontainer/static";


    const { c, id, onNodeClick  } = $props();

    let container: HTMLDivElement;

    async function renderGraph() {
        const nodes: DAGNode[] = [];
        const edges: DAGEdge[] = [];

        const rootId = `${$gitopsMap[id].Definition.kind}-${$gitopsMap[id].Definition.meta.group}-${$gitopsMap[id].Definition.meta.name}`;
        nodes.push(createNode({
            id: rootId,
            def: $gitopsMap[id].Definition,
            label: Label("", "synced", display.gitops["synced"],
                `<div class="flex items-center justify-center">
                     <span class="indicator-item badge badge-neutral mr-2">${$gitopsMap[id].Definition.kind}</span>
                     ${$gitopsMap[id].Definition.meta.name}
                </div>`)
        }));

        for (let d of $gitopsMap[id].Gitops.Pack.Definitions) {
            let def = d.Definition.Definition.Definition

            const defId = `${def.kind}-${def.meta.group}-${def.meta.name}`;
            const metaId = `${def.meta.group}-${def.meta.name}`;
            const state = def.state.gitops;

            const { statusKey, nodeClass } = getStatusInfo(state);

            nodes.push(createNode({
                id: defId,
                def,
                label: Label(defId, statusKey, display.gitops[statusKey], InnerLabel(def.kind, metaId)),
                className: nodeClass
            }));

            edges.push({ from: rootId, to: defId });

            if (state?.synced && def.kind === KIND_CONTAINERS) {
                for (let i = 1; i <= def.spec.replicas; i++) {
                    const containerId = `${def.meta.group}-${def.meta.name}-${i}`;

                    if (!$containersMap[containerId]) {
                        await ReloadContainer(c, def.meta.group, containerId);
                    }

                    const container = $containersMap[containerId];
                    const containerState = container?.General?.Status?.state?.State ?? "unknown";

                    nodes.push(createNode({
                        id: containerId,
                        def: container,
                        label: Label(containerId, containerState, display.containers[containerState], InnerLabel(containerState, containerId)),
                        className: containerState
                    }));

                    edges.push({ from: defId, to: containerId });
                }
            }
        }

        let graph = createGraph(nodes, edges);
        d3.select(container).selectAll("*").remove();

        const svg = d3.select(container);
        const svgGroup = svg.append("g");

        const zoom = d3.zoom()
            .scaleExtent([0.5, 2])
            .on("zoom", (event) => {
                svgGroup.attr("transform", event.transform);
            });

        svg.call(zoom);

        const render = new dagreD3.render();
        render(svgGroup, graph);

        svgGroup.selectAll("g.node").each(function (nodeId) {
            const g = d3.select(this);
            const data = graph.node(nodeId);
            g.on("click", () => onNodeClick(data));
        });

        const containerWidth = container.clientWidth - 80;
        const containerHeight = container.clientHeight - 80;
        const graphWidth = graph.graph().width || 1;
        const graphHeight = graph.graph().height || 1;

        const needsZoom = graphWidth > containerWidth;
        const scale = needsZoom
            ? Math.min(containerWidth / graphWidth, containerHeight / graphHeight)
            : 1;

        const xOffset = (containerWidth - graphWidth * scale) / 2 + 40;
        const yOffset = (containerHeight - graphHeight * scale) / 2 + 40;

        const initialTransform = d3.zoomIdentity.translate(xOffset, yOffset).scale(scale);
        svg.transition().duration(0).call(zoom.transform, initialTransform);
        svg.attr("height", "600px");
    }

    onMount(renderGraph);

    $effect(() => {
        if ($gitopsMap[id] !== undefined) {
            renderGraph()
        }
    });
</script>

<div id="svg-container" style="height:600px; display: flex; align-items: center; justify-content: center;">
    <svg bind:this={container} style="width: 100%; height: 100%; border: 1px solid #ddd;"></svg>
</div>
