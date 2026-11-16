// The results drawer (bottom region): reactions, displacements, line forces and design, as tables.
import { ctx } from "../context.js";
import { num } from "../format.js";
import { utilizationStatus } from "../model/index.js";
import { F, SV, h } from "../ui.js";
import { CollapseButton, Message } from "./primitives.js";

const kN = (key) => ({ key, label: key, unit: "kN", numeric: true, render: (v) => num(v) });
const kNm = (key) => ({ key, label: key, unit: "kN·m", numeric: true, render: (v) => num(v) });
const m = (key) => ({ key, label: key, unit: "m", numeric: true, render: (v) => num(v, 5) });
const pointRow = (r) => ({ ...r, id: "point-" + r.point, label: "Point " + r.point });
const lineRow = (r) => ({ ...r, id: "line-" + r.line, label: "Line " + r.line });

function designRow(model, { line, design }) {
  const e = model.design.find((d) => ctx.kindOf(d) === "line" && d.geometry.includes(line));
  const st = utilizationStatus(design);
  return { id: "line-" + line, label: "Line " + line, member: e?.name ?? "", template: e ? ctx.templateLabel(e.templateId) : "", u: st.u, st };
}

const DESIGN_COLUMNS = [
  { key: "label", label: "Line" },
  { key: "member", label: "Member" },
  { key: "template", label: "Template" },
  { key: "u", label: "Utilization", numeric: true, render: (v) => (v === null ? "–" : num(v)) },
  { key: "status", label: "Status", render: (_, r) => h(SV.StatusBadge, { status: r.st.status }, r.st.word) },
];

// columns and rows of each tab
const TABLES = {
  reactions: (s) => ({ columns: [{ key: "label", label: "Point" }, kN("Fx"), kN("Fy"), kN("Fz"), kNm("Mx"), kNm("My"), kNm("Mz")], rows: s.reactions.map(pointRow) }),
  displacements: (s) => ({ columns: [{ key: "label", label: "Point" }, m("ux"), m("uy"), m("uz")], rows: s.displacements.map(pointRow) }),
  forces: (s) => ({ columns: [{ key: "label", label: "Line" }, kN("N"), kN("Vy"), kN("Vz"), kNm("Mx"), kNm("My"), kNm("Mz")], rows: s.lines.map(lineRow) }),
  design: (s, model) => ({ columns: DESIGN_COLUMNS, rows: s.designs.map((d) => designRow(model, d)) }),
};

function ResultsTable({ app }) {
  const { summary, results, tab } = app;
  if (!summary) return h(Message, null, results.status?.error ? "No results: " + results.status.error : "No results yet.");
  const table = (TABLES[tab] ?? TABLES.design)(summary, app.model);
  return h(SV.DataTable, { density: "compact", ...table, selectedId: app.selId, onSelect: app.select });
}

function tabsOf(summary) {
  return [
    { id: "reactions", label: "Reactions", meta: summary?.reactions.length ?? 0 },
    { id: "displacements", label: "Displacements", meta: summary?.displacements.length ?? 0 },
    { id: "forces", label: "Line forces", meta: summary?.lines.length ?? 0 },
    { id: "design", label: "Design", meta: summary?.designs.length ?? 0 },
  ];
}

export function ResultsDrawer({ app }) {
  return h(
    F,
    null,
    h(
      "div",
      { style: { display: "flex", alignItems: "stretch", flex: "none", background: "var(--surface-panel)" } },
      h("div", { style: { flex: 1, minWidth: 0 } }, h(SV.Tabs, { tabs: tabsOf(app.summary), value: app.tab, onChange: app.setTab })),
      h(
        "div",
        { style: { display: "flex", alignItems: "center", padding: "0 var(--space-2)", borderBottom: "1px solid var(--border)" } },
        h(CollapseButton, { dir: "down", label: "Hide results", onClick: () => app.setCollapsed("bottom", true) }),
      ),
    ),
    h("div", { style: { flex: 1, minHeight: 0, overflow: "auto" } }, h(ResultsTable, { app })),
  );
}
