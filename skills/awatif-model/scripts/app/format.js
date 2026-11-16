// Number formatting and parsing, and text derived from results.
import { LINE_RESULTS } from "./constants.js";
import { UI } from "./ui.js";

export const num = (v, d = 2) =>
  v == null || Number.isNaN(v) ? "" : (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d).replace("-", "−");

export const asNumber = (v) =>
  typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))
    ? Number(v)
    : typeof v === "number"
      ? v
      : null;

const forceUnit = (key) => (key.startsWith("F") ? "kN" : "kN·m");

// "key  value unit" lines, skipping values that round to zero
function valueRows(pairs) {
  return pairs.filter(([, v]) => Math.abs(v) >= 0.005).map(([k, v, unit]) => `${k}  ${num(v)} ${unit}`);
}

function lineHover(id, summary) {
  const r = summary.lines.find((x) => x.line === id);
  const out = r && valueRows(LINE_RESULTS.map((l) => [l.label, r[l.value], l.unit]));
  return out?.length ? [`Line ${id}`, ...out].join("\n") : null;
}

function pointHover(id, summary) {
  const d = summary.displacements.find((x) => x.point === id);
  const r = summary.reactions.find((x) => x.point === id);
  const reaction = r ? valueRows(["Fx", "Fy", "Fz", "Mx", "My", "Mz"].map((k) => [k, r[k], forceUnit(k)])) : [];
  const out = [`Point ${id}`];
  if (d) out.push(...["ux", "uy", "uz"].map((k) => `${k}  ${num(d[k], 5)} m`));
  if (reaction.length) out.push("Reaction", ...reaction);
  return out.length > 1 ? out.join("\n") : null;
}

// Hover tooltip from the results: a line's governing internal forces, a point's displacement and reactions
export function hoverText(id, summary) {
  const p = summary && UI.parseId(id);
  if (!p) return null;
  if (p.kind === "line") return lineHover(p.id, summary);
  if (p.kind === "point") return pointHover(p.id, summary);
  return null;
}

// Next grid line id after `id`: A -> B, 3 -> 4, Z2 -> Z3
export function nextGridId(id, taken) {
  let next = String(id ?? "A");
  const step = (s) => {
    const m = /^(.*?)(\d+)$/.exec(s);
    if (m) return m[1] + (Number(m[2]) + 1);
    if (/^[A-Y]$/i.test(s)) return String.fromCharCode(s.charCodeAt(0) + 1);
    return s + "'";
  };
  do next = step(next);
  while (taken.includes(next));
  return next;
}
