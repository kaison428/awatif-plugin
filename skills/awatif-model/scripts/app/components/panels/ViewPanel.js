// The View panel (over the viewport): 3D or a plane at a location on its normal axis.
import { PLANE_NORMAL, dim } from "../../constants.js";
import { ctx } from "../../context.js";
import { asNumber, num } from "../../format.js";
import { busiestOffset, planeLocations, steppedOffset } from "../../planes.js";
import { F, SV, h } from "../../ui.js";
import { Chevron, Floating } from "../primitives.js";

const column = { display: "flex", flexDirection: "column", gap: "var(--space-2)" };
const rowStyle = { display: "flex", alignItems: "center", gap: "var(--space-1)" };
const sameOffset = (a, b) => Math.abs(a - b) < 1e-9;

// Open a plane at the location holding the most lines
function choosePlane(app, plane) {
  if (!plane) return app.setView(null);
  if (app.view?.plane === plane) return;
  const fallback = plane === ctx.workPlane ? ctx.workPlaneOffset : planeLocations(app.model, plane)[0]?.value ?? 0;
  app.setView({ plane, offset: busiestOffset(app.model, plane, fallback) });
}

function stepPlane(app, dir) {
  const { view } = app;
  const next = view && steppedOffset(app.model, view.plane, view.offset, dir);
  if (next !== undefined && next !== null) app.setView({ ...view, offset: next });
}

function PlaneButtons({ app }) {
  return h(
    "div",
    { style: { display: "flex", gap: "var(--space-1)" } },
    h(SV.Button, { size: "sm", variant: "ghost", pressed: !app.view, onClick: () => choosePlane(app, null) }, "3D"),
    ["XY", "XZ", "YZ"].map((pl) => h(SV.Button, { key: pl, size: "sm", variant: "ghost", pressed: app.view?.plane === pl, title: pl + " plane", onClick: () => choosePlane(app, pl) }, pl)),
  );
}

function locationOptions(locs, offset) {
  const known = locs.some((l) => sameOffset(l.value, offset));
  return [
    ...(known ? [] : [{ value: String(offset), label: num(offset) + " m" }]),
    ...locs.map((l) => ({ value: String(l.value), label: num(l.value) + " m" + (l.id ? " (" + l.id + ")" : "") })),
  ];
}

function LocationPicker({ app, axisName }) {
  const { view } = app;
  const locs = planeLocations(app.model, view.plane);
  const value = String(locs.find((l) => sameOffset(l.value, view.offset))?.value ?? view.offset);
  const arrow = (dir, label) => h(SV.Button, { size: "sm", variant: "ghost", title: label, "aria-label": label, onClick: () => stepPlane(app, dir) }, h(Chevron, { dir: dir > 0 ? "up" : "down" }));
  return h(
    "div",
    { style: rowStyle },
    h("span", { className: "ui", style: dim }, axisName + " ="),
    h(SV.Select, { "aria-label": axisName + " location", options: locationOptions(locs, view.offset), value, onChange: (v) => app.setView({ ...view, offset: Number(v) }) }),
    arrow(-1, "Previous location"),
    arrow(1, "Next location"),
  );
}

function OffsetInput({ app, axisName }) {
  const { view } = app;
  const commit = (text, onlyIfChanged) => {
    const v = asNumber(text);
    if (v !== null && (!onlyIfChanged || v !== view.offset)) app.setView({ ...view, offset: v });
  };
  return h(
    "div",
    { style: rowStyle },
    h("span", { className: "caption", style: dim }, "At"),
    h("input", {
      key: String(view.offset),
      className: "sv-input data is-num",
      defaultValue: String(view.offset),
      "aria-label": axisName + " location in m",
      onKeyDown: (e) => e.key === "Enter" && commit(e.target.value, false),
      onBlur: (e) => commit(e.target.value, true),
    }),
    h("span", { className: "caption", style: dim }, "m"),
  );
}

export function ViewPanel({ app }) {
  const axisName = app.view ? PLANE_NORMAL[app.view.plane].toUpperCase() : "";
  const planeControls = app.view
    ? h(
        F,
        null,
        h(LocationPicker, { app, axisName }),
        h(OffsetInput, { app, axisName }),
        h("span", { className: "caption", style: dim }, "Off-plane items are faint and not picked. Edit geometry draws on this plane."),
      )
    : null;
  return h(
    Floating,
    null,
    h(
      SV.Panel,
      { title: "View", collapsible: true, open: app.layout.panels.view, onToggle: (v) => app.setPanel("view", v) },
      h("div", { style: column }, h(PlaneButtons, { app }), planeControls),
    ),
  );
}
