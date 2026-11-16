// Rows of the inspector's PropertyGrid that come from results and assignments.
import { KIND_LABEL, POINT_LOAD_KEYS } from "../../constants.js";
import { ctx } from "../../context.js";
import { num } from "../../format.js";
import { utilizationStatus } from "../../model/index.js";
import { SV, UI, h } from "../../ui.js";

export const noneOption = { value: "", label: "None" };

// Number rows with units: forces in kN, moments in kN·m
export function forceRows(values, forces, moments) {
  return [
    ...forces.map((k) => ({ label: k, value: num(values[k]), unit: "kN", numeric: true })),
    ...moments.map((k) => ({ label: k, value: num(values[k]), unit: "kN·m", numeric: true })),
  ];
}

function loadKeys(entry, params) {
  if (entry.templateId === "point-load") return POINT_LOAD_KEYS.filter((k) => params[k]);
  if (entry.templateId === "distributed-load") return ["w"];
  return Object.keys(params).filter((k) => typeof params[k] === "number");
}

// The loads on one point or line, editable in place (keys __load:<index>:<param>)
export function loadRows(model, kind, id) {
  const rows = [];
  model.loads.forEach((e, i) => {
    if (ctx.kindOf(e) !== kind || !e.geometry.includes(id)) return;
    const params = ctx.paramsOf(e);
    const keys = loadKeys(e, params);
    const shared = e.geometry.length > 1 ? ` · ${e.geometry.length} ${KIND_LABEL[kind].toLowerCase()}` : "";
    const caseName = e.loadCase ?? model.loadCases[0] ?? "";
    (keys.length ? keys : ["Fz"]).forEach((k) =>
      rows.push({ label: `${e.name} (${caseName}${shared}) ${k}`, value: String(params[k] ?? 0), unit: UI.UNITS[k], numeric: true, control: "input", key: `__load:${i}:${k}` }),
    );
  });
  return rows;
}

// Member, governing line, utilization and status of a design check
export function designRows(design, entry, line) {
  const st = utilizationStatus(design);
  const rows = [];
  if (entry) rows.push({ label: "Member", value: entry.name });
  if (line != null) rows.push({ label: "Governing line", value: "Line " + line });
  rows.push({ label: "Utilization", value: st.u === null ? "–" : num(st.u), numeric: true });
  rows.push({ label: "Status", value: h(SV.StatusBadge, { status: st.status }, st.word) });
  return rows;
}

// A select of the design members for one kind of geometry
export function designMemberRow(model, kind, id) {
  const designIndex = model.design.findIndex((e) => ctx.kindOf(e) === kind && e.geometry.includes(id));
  const members = model.design.map((e, i) => (ctx.kindOf(e) === kind ? { value: String(i), label: e.name } : null)).filter(Boolean);
  return {
    designIndex,
    row: {
      label: "Design member",
      value: designIndex === -1 ? "" : String(designIndex),
      control: "select",
      key: "__design",
      options: [...(designIndex === -1 ? [noneOption] : []), ...members],
    },
  };
}
