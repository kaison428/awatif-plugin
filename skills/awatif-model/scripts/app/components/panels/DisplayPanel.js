// The Display panel (over the viewport): result layers, scales and line-result diagrams.
import { LINE_RESULTS, dim } from "../../constants.js";
import { num } from "../../format.js";
import { F, SV, h } from "../../ui.js";
import { Floating } from "../primitives.js";

export const DEFAULT_DISPLAY = { deformed: true, reactions: true, loads: true, loadLabels: true, scale: 1, diagram: "", diagramScale: 1, diagramLabels: true };

const column = (gap) => ({ display: "flex", flexDirection: "column", gap });
const scaleOptions = (values, prefix) => values.map((v) => ({ value: String(v), label: prefix + v }));

function DeformationControls({ display, set, scale }) {
  if (!display.deformed) return null;
  return h(
    F,
    null,
    h(SV.Select, { "aria-label": "Deformation scale", options: scaleOptions([0.5, 1, 2, 5, 10], "Scale ×"), value: String(display.scale), onChange: (v) => set("scale", Number(v)) }),
    scale ? h("span", { className: "caption", style: dim }, "Displacements drawn ×" + num(scale, 0)) : null,
  );
}

function DiagramControls({ display, set, toggle }) {
  const options = [{ value: "", label: "None" }, ...LINE_RESULTS.map((r) => ({ value: r.value, label: `${r.label} (${r.value})` }))];
  return h(
    F,
    null,
    h(
      "div",
      { style: column("var(--space-1)") },
      h("span", { className: "caption", style: dim }, "Line results"),
      h(SV.Select, { "aria-label": "Line results", options, value: display.diagram, onChange: (v) => set("diagram", v) }),
    ),
    display.diagram
      ? h(
          F,
          null,
          h(SV.Select, { "aria-label": "Diagram scale", options: scaleOptions([0.25, 0.5, 1, 2, 4], "Diagram ×"), value: String(display.diagramScale), onChange: (v) => set("diagramScale", Number(v)) }),
          toggle("diagramLabels", "Diagram values"),
        )
      : null,
  );
}

export function DisplayPanel({ app }) {
  const { display, setDisplay } = app;
  const set = (key, value) => setDisplay((d) => ({ ...d, [key]: value }));
  const toggle = (key, text) => h(SV.Checkbox, { checked: display[key], onChange: (v) => set(key, v) }, text);
  const scale = app.viewer.current?.deformationScale() ?? 0;
  return h(
    Floating,
    null,
    h(
      SV.Panel,
      { title: "Display", collapsible: true, open: app.layout.panels.display, onToggle: (v) => app.setPanel("display", v) },
      h(
        "div",
        { style: column("var(--space-2)") },
        toggle("deformed", "Deformed shape"),
        toggle("reactions", "Reactions"),
        toggle("loads", "Loads"),
        display.loads ? toggle("loadLabels", "Load values") : null,
        h(DeformationControls, { display, set, scale }),
        h(DiagramControls, { display, set, toggle }),
      ),
    ),
  );
}
