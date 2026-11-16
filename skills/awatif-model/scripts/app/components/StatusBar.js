// The status bar: analysis status (icon + word + color), warnings, view, selection, hints.
import { PLANE_NORMAL, dim } from "../constants.js";
import { num } from "../format.js";
import { F, SV, h } from "../ui.js";

function StatusBadge({ app }) {
  const status = app.results.status ?? {};
  if (app.engineError) return h(SV.StatusBadge, { status: "fail" }, "Failed: " + app.engineError);
  if (app.pending || status.loading) return h(SV.StatusBadge, { status: "info" }, "Running");
  if (!status.success) return h(SV.StatusBadge, { status: "fail" }, "Failed: " + (status.error ?? "analysis error"));
  return h(SV.StatusBadge, { status: "ok" }, "Analysed" + (status.iterations ? ` (${status.iterations} iterations)` : ""));
}

function hintOf({ mode, view }) {
  if (mode.mode === "assign") return "Box left to right adds, right to left removes; right-click or Esc to finish";
  if (mode.mode === "edit") return "Drag a point to move it, click to add a point, click a point then a target to draw a line, right-click to delete";
  if (view) return "Drag or right-drag to pan, scroll to zoom, Shift+drag to box-select, double-click to fit";
  return "Drag to orbit, right-drag to pan, scroll to zoom, Shift+drag to box-select, double-click to fit";
}

function viewText(view) {
  return view ? `View: ${view.plane} @ ${PLANE_NORMAL[view.plane].toUpperCase()} = ${num(view.offset)} m` : "View: 3D";
}

function selectionText({ selId, selCount }) {
  if (selId) return "Selected: " + selId;
  return selCount ? `Selected: ${selCount} items` : "Nothing selected";
}

export function StatusBar({ app }) {
  const unassigned = app.results.status?.unassignedLines;
  const maxU = app.summary?.maxDisplacement;
  return h(
    F,
    null,
    h(StatusBadge, { app }),
    unassigned?.length && !app.engineError ? h(SV.StatusBadge, { status: "warn" }, "No design entry: lines " + unassigned.join(", ")) : null,
    maxU && maxU.u > 0 ? h("span", { className: "data" }, "Max displacement " + num(maxU.u, 5) + " m") : null,
    h("span", null, viewText(app.view)),
    h("span", null, selectionText(app)),
    app.hoverId ? h("span", { style: dim }, "Hover: " + app.hoverId) : null,
    h("span", { style: { flex: 1 } }),
    h("span", { style: dim }, hintOf(app)),
    h("span", null, "Units: m, kN"),
  );
}
