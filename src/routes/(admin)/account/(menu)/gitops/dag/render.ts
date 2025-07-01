import * as d3 from "d3";
import * as dagreD3 from "dagre-d3";

export function renderGraph(svgElement: SVGSVGElement, workflow) {
    const g = new dagreD3.graphlib.Graph().setGraph({});

    workflow.nodes.forEach((node) => {
        g.setNode(node.id, {
            label: node.label,
            labelType: "html",
            class: node.class || "node",
            padding: 0,
            shape: "rect"
        });
    });

    workflow.edges.forEach((edge) => {
        g.setEdge(edge.from, edge.to, { label: "" });
    });

    const svg = d3.select(svgElement);
    svg.selectAll("g").remove();

    const render = new dagreD3.render();
    const svgGroup = svg.append("g");

    const zoom = d3.zoom()
        .scaleExtent([0.5, 2])
        .on("zoom", (event) => svgGroup.attr("transform", event.transform));

    svg.call(zoom);
    render(svgGroup, g);

    const containerWidth = svgElement.clientWidth - 80;
    const containerHeight = svgElement.clientHeight - 80;
    const graphWidth = g.graph().width || 1;
    const graphHeight = g.graph().height || 1;

    const scale = graphWidth > containerWidth
        ? Math.min(containerWidth / graphWidth, containerHeight / graphHeight)
        : 1;

    const xOffset = (containerWidth - graphWidth * scale) / 2 + 40;
    const yOffset = (containerHeight - graphHeight * scale) / 2 + 40;

    const initialTransform = d3.zoomIdentity.translate(xOffset, yOffset).scale(scale);

    svg.transition().duration(400).call(zoom.transform, initialTransform);
    svg.attr("height", "100%");
}
