// App.js — SDN Dashboard (super simple + commented)
// -------------------------------------------------
// What this file gives you:
// 1) A clean, readable React app that shows:
//    - Topology graph (switches + hosts) with link utilization
//    - Live throughput chart (dummy right now)
//    - KPIs + Top links table
// 2) CLEAR COMMENTS marking where DUMMY data is generated and
//    EXACTLY where to plug in REALTIME data via WebSocket later.
// 3) Minimal inline styles to keep things neat without extra CSS files.
//    (Optional CSS snippet for App.css is at the very bottom of this file.)

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

/*****************************************************
 * SECTION 1 — DUMMY DATA (Replace with realtime later)
 *****************************************************/
// This hook feeds the UI with FAKE data so you can see the dashboard working.
// Later, you'll replace this with the WebSocket hook (see SECTION 2 below).
function useDummySDNData() {
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [throughput, setThroughput] = useState([]); // [{t, rx, tx}]
  const [running, setRunning] = useState(true); // toggle animation

  // Build a tiny topology: 5 switches in a ring, 2 hosts per switch
  useEffect(() => {
    // switches
    const switches = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i + 1}`,
      type: "switch",
    }));
    // hosts
    const hosts = switches.flatMap((sw, i) => [
      { id: `h${i + 1}a`, type: "host", parent: sw.id },
      { id: `h${i + 1}b`, type: "host", parent: sw.id },
    ]);
    // links between switches (ring)
    const ring = switches.map((sw, i) => ({
      source: sw.id,
      target: switches[(i + 1) % switches.length].id,
      util: 0.2 + Math.random() * 0.6, // link utilization in [0..1]
    }));
    // host <-> switch access links
    const access = hosts.map((h) => ({
      source: h.id,
      target: h.parent,
      util: 0.05 + Math.random() * 0.3,
    }));

    setGraph({ nodes: [...switches, ...hosts], links: [...ring, ...access] });

    // initial throughput series (time vs RX/TX Mbps)
    setThroughput(
      Array.from({ length: 24 }, (_, i) => ({
        t: i,
        rx: 100 + Math.random() * 40,
        tx: 90 + Math.random() * 40,
      }))
    );
  }, []);

  // Update throughput and gently wiggle link utilization to look alive
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setThroughput((arr) => {
        const last = arr[arr.length - 1] || { t: 0, rx: 120, tx: 110 };
        const next = {
          t: last.t + 1,
          rx: Math.max(40, Math.min(240, last.rx + (Math.random() - 0.5) * 12)),
          tx: Math.max(40, Math.min(240, last.tx + (Math.random() - 0.5) * 12)),
        };
        return [...arr.slice(-23), next];
      });
      setGraph((g) => ({
        nodes: g.nodes,
        links: g.links.map((e) => {
          const drift = (Math.random() - 0.5) * 0.05;
          const util = Math.max(0.03, Math.min(0.95, e.util + drift));
          return { ...e, util };
        }),
      }));
    }, 1100);
    return () => clearInterval(id);
  }, [running]);

  // Small KPIs derived from current state
  const kpis = useMemo(() => {
    const avgUtil =
      graph.links.reduce((s, e) => s + (e.util || 0), 0) /
      Math.max(1, graph.links.length);
    const congested = graph.links.filter((e) => (e.util || 0) > 0.8).length;
    const last = throughput[throughput.length - 1] || { rx: 0, tx: 0 };
    return { avgUtil, congested, rx: last.rx, tx: last.tx };
  }, [graph.links, throughput]);

  return { graph, throughput, kpis, running, setRunning };
}

/************************************************************
 * SECTION 2 — REALTIME DATA (Use this later, not right now)
 ************************************************************/
// When you're ready to connect to the backend, swap useDummySDNData()
// with this WebSocket hook in the main App component.
// Example:
//   const { graph, throughput, kpis } = useSdnDataWS("ws://127.0.0.1:8765");
function useSdnDataWS(url = "ws://127.0.0.1:8765") {
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [throughput, setThroughput] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(url);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data || "{}");
      // EXPECTED SHAPE FROM BACKEND:
      // {
      //   nodes:[{id:"s1", type:"switch"}, {id:"h1", type:"host", parent:"s1"}],
      //   links:[{source:"s1", target:"s2", util:0.42}],
      //   series:[{t:1, rx:120, tx:100}]
      // }
      setGraph({
        nodes: Array.isArray(msg.nodes) ? msg.nodes : [],
        links: Array.isArray(msg.links) ? msg.links : [],
      });
      setThroughput(Array.isArray(msg.series) ? msg.series : []);
    };
    ws.onerror = () => console.warn("WebSocket error");
    return () => ws.close();
  }, [url]);

  const kpis = useMemo(() => {
    const avgUtil =
      graph.links.reduce((s, e) => s + (e.util || 0), 0) /
      Math.max(1, graph.links.length);
    const congested = graph.links.filter((e) => (e.util || 0) > 0.8).length;
    const last = throughput[throughput.length - 1] || { rx: 0, tx: 0 };
    return { avgUtil: avgUtil || 0, congested, rx: last.rx, tx: last.tx };
  }, [graph.links, throughput]);

  return { graph, throughput, kpis };
}

/*****************************************
 * SECTION 3 — Small UI helper components
 *****************************************/
// Simple visual mapping for link utilization → color
function colorForUtil(u = 0) {
  if (u > 0.8) return "#dc2626"; // red (congested)
  if (u > 0.4) return "#d97706"; // amber (moderate)
  return "#059669"; // green (healthy)
}

// KPI card (small stat box)
function KPI({ label, value, unit }) {
  return (
    <div style={styles.card}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>
        {value} {unit && <span style={styles.kpiUnit}>{unit}</span>}
      </div>
    </div>
  );
}

// Top links table (sorted by utilization)
function TableCard({ rows }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.h3}>Top Links by Utilization</h3>
      <table style={styles.table}>
        <thead>
          <tr style={{ color: "#6b7280" }}>
            <th style={styles.th}>Link</th>
            <th style={styles.th}>Utilization</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const color = colorForUtil(r.util);
            const label = r.util > 0.8 ? "Congested" : r.util > 0.4 ? "Moderate" : "Healthy";
            return (
              <tr key={r.key} style={styles.tr}>
                <td style={styles.td}>{r.key}</td>
                <td style={styles.td}>{(r.util * 100).toFixed(1)}%</td>
                <td style={{ ...styles.td, color }}>{label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Throughput chart (time vs RX/TX Mbps)
function ThroughputCard({ data }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.h3}>Throughput (Mbps)</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="rx" stroke="#3b82f6" dot={false} />
            <Line type="monotone" dataKey="tx" stroke="#10b981" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Topology SVG: draws switches (blue circles), hosts (gray squares), and links
function TopologyGraph({ graph }) {
  // Pre-calc simple positions: switches on a circle, hosts near their parent switch
  const layout = useMemo(() => {
    const width = 600,
      height = 360;
    const cx = width / 2,
      cy = height / 2,
      radius = 120;

    const switches = graph.nodes.filter((n) => n.type === "switch");
    const hosts = graph.nodes.filter((n) => n.type === "host");

    const pos = {};
    // Place switches around a circle
    switches.forEach((n, i) => {
      const angle = (i / Math.max(1, switches.length)) * 2 * Math.PI - Math.PI / 2;
      pos[n.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });
    // Place hosts close to their parent switch (slightly outward)
    hosts.forEach((h, i) => {
      const p = pos[h.parent];
      if (!p) return;
      const ang = Math.atan2(p.y - cy, p.x - cx);
      const off = 40 + (i % 2) * 18; // stagger a little
      pos[h.id] = { x: p.x + Math.cos(ang) * off, y: p.y + Math.sin(ang) * off };
    });

    return { width, height, pos };
  }, [graph.nodes]);

  return (
    <div style={styles.card}>
      <h3 style={styles.h3}>Network Topology</h3>
      <svg width="100%" viewBox={`0 0 ${layout.width} ${layout.height}`}>
        {/* Links */}
        {graph.links.map((e, idx) => {
          const s = layout.pos[e.source];
          const t = layout.pos[e.target];
          if (!s || !t) return null;
          return (
            <line
              key={idx}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={colorForUtil(e.util)}
              strokeWidth={1 + Math.round((e.util || 0) * 6)}
              strokeOpacity="0.85"
            />
          );
        })}

        {/* Nodes */}
        {graph.nodes.map((n) => {
          const p = layout.pos[n.id];
          if (!p) return null;
          if (n.type === "switch") {
            return (
              <g key={n.id}>
                <circle cx={p.x} cy={p.y} r="10" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1" />
                <text x={p.x} y={p.y + 18} textAnchor="middle" fontSize="11" fill="#111827">
                  {n.id}
                </text>
              </g>
            );
          }
          // host
          return (
            <g key={n.id}>
              <rect x={p.x - 7} y={p.y - 7} width="14" height="14" fill="#6b7280" stroke="#374151" strokeWidth="1" rx="2" />
              <text x={p.x} y={p.y + 18} textAnchor="middle" fontSize="10" fill="#374151">
                {n.id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tiny legend */}
      <div style={styles.legendRow}>
        <div style={styles.legendItem}><span style={styles.legendSwitch} /> Switch</div>
        <div style={styles.legendItem}><span style={styles.legendHost} /> Host</div>
        <div style={styles.legendItem}><span style={{ ...styles.legendBar, background: "#059669" }} /> Healthy</div>
        <div style={styles.legendItem}><span style={{ ...styles.legendBar, background: "#d97706" }} /> Moderate</div>
        <div style={styles.legendItem}><span style={{ ...styles.legendBar, background: "#dc2626" }} /> Congested</div>
      </div>
    </div>
  );
}

/************************
 * SECTION 4 — Main App
 ************************/
export default function App() {
  // RIGHT NOW (dummy data):
  const { graph, throughput, kpis } = useDummySDNData();

  // LATER (realtime data):
  // const { graph, throughput, kpis } = useSdnDataWS("ws://127.0.0.1:8765");

  // Precompute rows for the table (top 6 links by utilization)
  const topLinks = useMemo(
    () =>
      [...graph.links]
        .sort((a, b) => (b.util || 0) - (a.util || 0))
        .slice(0, 6)
        .map((e) => ({ key: `${e.source} ⇄ ${e.target}`, util: e.util || 0 })),
    [graph.links]
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <h1 style={{ margin: 0 }}>SDN Dashboard </h1>
      <p style={{ color: "#6b7280", marginTop: 6 }}>
        Currently using <strong>dummy data</strong>. Swap to <code>useSdnDataWS()</code> for realtime.
      </p>

      {/* KPI row */}
      <div style={styles.kpiGrid}>
        <KPI label="RX" value={kpis.rx?.toFixed(1) || 0} unit="Mbps" />
        <KPI label="TX" value={kpis.tx?.toFixed(1) || 0} unit="Mbps" />
        <KPI label="Avg Util" value={((kpis.avgUtil || 0) * 100).toFixed(1)} unit="%" />
        <KPI label="Hot Links" value={kpis.congested || 0} />
      </div>

      {/* Main grid: Topology + Throughput */}
      <div style={styles.mainGrid}>
        <TopologyGraph graph={graph} />
        <ThroughputCard data={throughput} />
      </div>

      {/* Table */}
      <div style={{ marginTop: 20 }}>
        <TableCard rows={topLinks} />
      </div>
    </div>
  );
}

/************************
 * SECTION 5 — Styles
 ************************/
const styles = {
  page: {
    padding: 20,
    fontFamily: "Inter, system-ui, Arial, sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
    color: "#111827",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
  h3: { fontSize: 14, margin: "0 0 10px" },
  table: { width: "100%", fontSize: 13, borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "6px 0" },
  tr: { borderTop: "1px solid #f3f4f6" },
  td: { padding: "8px 0" },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    margin: "16px 0 20px",
  },
  kpiLabel: { fontSize: 12, color: "#4b5563" },
  kpiValue: { fontSize: 22, fontWeight: 600 },
  kpiUnit: { fontSize: 12, color: "#6b7280" },
  mainGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  legendRow: { display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "#4b5563" },
  legendItem: { display: "flex", alignItems: "center", gap: 6 },
  legendSwitch: {
    width: 12,
    height: 12,
    background: "#3b82f6",
    borderRadius: 999,
    display: "inline-block",
  },
  legendHost: { width: 12, height: 12, background: "#6b7280", display: "inline-block" },
  legendBar: { width: 28, height: 4, background: "#059669", display: "inline-block" },
};

/***********************************************************
 * OPTIONAL — If you prefer external CSS, paste this in App.css
 ***********************************************************
 * body { background:#f8fafc; color:#111827; font-family: Inter, system-ui, Arial, sans-serif; }
 * .card { border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff; }
 * .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
 * .kpis { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:12px; margin:16px 0 20px; }
 */
