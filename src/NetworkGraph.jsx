import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const NetworkGraph = () => {
  const svgRef = useRef();

  useEffect(() => {
    const width = 600;
    const height = 400;

    // Clear old svg content if any
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Example network data
    const nodes = [
      { id: "Switch", type: "switch" },
      { id: "Host1", type: "host" },
      { id: "Host2", type: "host" },
      { id: "Host3", type: "host" },
    ];

    const links = [
      { source: "Switch", target: "Host1" },
      { source: "Switch", target: "Host2" },
      { source: "Switch", target: "Host3" },
    ];

    // D3 force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id).distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Links
    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-width", 2);

    // Nodes
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => (d.type === "switch" ? 20 : 15))
      .attr("fill", (d) => (d.type === "switch" ? "orange" : "lightblue"));

    // Labels
    const label = svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.id)
      .attr("font-size", 14)
      .attr("dx", 20)
      .attr("dy", 4);

    // Update positions
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

      label.attr("x", (d) => d.x).attr("y", (d) => d.y);
    });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center" }}>Network Topology</h2>
      <svg ref={svgRef} style={{ display: "block", margin: "auto" }}></svg>

      {/* Dummy content to show page scrolling works */}
      <div style={{ height: "1200px", background: "#f9f9f9", marginTop: "20px" }}>
        <p style={{ textAlign: "center", paddingTop: "20px" }}>
          Scroll down to see that graph stays fixed at top part of the page.
        </p>
      </div>
    </div>
  );
};

export default NetworkGraph;
