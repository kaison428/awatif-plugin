// Editable grid lines of a grid-system entry: id, ordinate, shown; add and remove per axis.
import { asNumber, nextGridId } from "../format.js";
import { F, SV, h } from "../ui.js";
import { Actions } from "./primitives.js";

const AXES = ["x", "y", "z"];
const FIRST_ID = { x: "A", y: "1", z: "Z1" };
const DEFAULT_SPACING = 5;

// A new line one spacing past the last, with the next id
function appendedLine(axis, lines, taken) {
  const last = lines[lines.length - 1];
  const prev = lines[lines.length - 2];
  const ordinate = last ? last.ordinate + (prev ? last.ordinate - prev.ordinate || DEFAULT_SPACING : DEFAULT_SPACING) : 0;
  const first = FIRST_ID[axis];
  const id = last ? nextGridId(last.id, taken) : taken.includes(first) ? nextGridId(first, taken) : first;
  return { id, ordinate, visible: true, bubble: last?.bubble ?? (axis === "y" ? "start" : "end") };
}

function GridLineRow({ axis, lines, index, update }) {
  const g = lines[index];
  const set = (patch, key) => update(axis, lines.map((x, j) => (j === index ? { ...x, ...patch } : x)), key);
  const onId = (e) => e.target.value.trim() && set({ id: e.target.value.trim() }, `${axis}${index}id`);
  const onOrdinate = (e) => {
    const v = asNumber(e.target.value);
    if (v !== null) set({ ordinate: v }, `${axis}${index}ord`);
  };
  return h(
    "div",
    { className: "sv-props__row", style: { gap: "var(--space-1)" } },
    h("input", { className: "sv-input ui", style: { maxWidth: 56 }, defaultValue: g.id, "aria-label": `${axis} grid line ${index + 1} id`, onChange: onId }),
    h("input", { className: "sv-input data is-num", defaultValue: String(g.ordinate), "aria-label": `${axis} grid line ${g.id} ordinate`, onChange: onOrdinate }),
    h("span", { className: "caption sv-props__unit" }, "m"),
    h(SV.Checkbox, { defaultChecked: g.visible !== false, onChange: (v) => set({ visible: v }) }),
    h(SV.Button, { size: "sm", variant: "ghost", "aria-label": `Remove grid line ${g.id}`, title: "Remove", onClick: () => update(axis, lines.filter((_, j) => j !== index)) }, "×"),
  );
}

function AxisGroup({ axis, params, taken, update }) {
  const lines = params[axis] || [];
  return h(
    "div",
    { className: "sv-props__group" },
    h("div", { className: "sv-props__title overline sv-caps" }, axis.toUpperCase() + " grid lines"),
    lines.map((_, i) => h(GridLineRow, { key: i, axis, lines, index: i, update })),
    h(Actions, null, h(SV.Button, { size: "sm", variant: "secondary", onClick: () => update(axis, [...lines, appendedLine(axis, lines, taken)]) }, "Add " + axis.toUpperCase() + " line")),
  );
}

export function GridEditor({ entry, onChange }) {
  const params = entry.params || {};
  const taken = AXES.flatMap((a) => (params[a] || []).map((g) => g.id));
  const update = (axis, list, key) => onChange({ ...params, [axis]: list }, key);
  return h(F, null, AXES.map((axis) => h(AxisGroup, { key: axis, axis, params, taken, update })));
}
