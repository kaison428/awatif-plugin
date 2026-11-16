// Mounts the three.js viewer once and keeps it in step with the app's state.
// The viewer reports picks and edits back through `latest`, so its callbacks
// always see the current render's model and actions.
import { createViewer } from "../../../../awatif-ui/src/viewer/index.js";
import { EMPTY_SELECTION } from "../constants.js";
import { ctx } from "../context.js";
import { hoverText } from "../format.js";
import { applyEdit, assignGeometry } from "../model/index.js";
import { UI, useEffect, useRef, useState } from "../ui.js";

function onAssign(latest, ids, add) {
  const { model, mode, commit } = latest.current;
  const p = mode.entry && UI.parseId(mode.entry);
  if (!p || p.kind !== "entry") return;
  commit(assignGeometry(model, p.field, p.index, ids, add));
}

function onEdit(latest, op) {
  const { model, commit, select } = latest.current;
  const { model: next, created } = applyEdit(model, op, ctx.kindOf);
  commit(next);
  if (created) select(created);
  else if (op.type === "move-point") select("point-" + op.id);
}

function mount(host, latest, { setHoverId, setMode, activeLoad }) {
  const viewer = createViewer(host, ctx.initialModel, {
    geometryKind: ctx.kindOf,
    workPlane: ctx.workPlane,
    workPlaneOffset: ctx.workPlaneOffset,
    onSelect: (id) => latest.current.select(id),
    onSelectionChange: (sel) => latest.current.changeSelection(sel),
    onHover: setHoverId,
    hoverInfo: (id) => hoverText(id, latest.current.summary),
    onModeExit: () => setMode({ mode: "view", entry: null }),
    onAssign: (ids, add) => onAssign(latest, ids, add),
    onEdit: (op) => onEdit(latest, op),
  });
  viewer.setLoadSelection(activeLoad);
  if (window.onViewerReady) window.onViewerReady(host, viewer);
  return viewer;
}

function resultsForViewer(results) {
  if (!results.status?.success) return null;
  const { nodes, elements, displacements, reactions, internalForces } = results;
  return { nodes, elements, displacements, reactions, internalForces, lineToElements: results.geometryMapping?.lineToElements };
}

function activeKind(model, mode) {
  const p = mode.entry && UI.parseId(mode.entry);
  const entry = p && p.kind === "entry" ? model[p.field]?.[p.index] : null;
  return entry ? ctx.kindOf(entry) : undefined;
}

// `app`: the state the viewer mirrors; returns { host, viewer, hoverId, diagram }
export function useViewer(app) {
  const host = useRef(null);
  const viewer = useRef(null);
  const latest = useRef({});
  const [hoverId, setHoverId] = useState(null);
  const [diagram, setDiagram] = useState(null); // the drawn line result's { key, min, max }
  latest.current = app;
  const { model, mode, selId, selection, filter, activeLoad, display, view, results } = app;
  const assigning = mode.mode === "assign";

  useEffect(() => {
    viewer.current = mount(host.current, latest, { setHoverId, setMode: app.setMode, activeLoad });
    return () => viewer.current.dispose();
  }, []);
  useEffect(() => viewer.current?.setModel(model), [model]);
  useEffect(() => viewer.current?.select(assigning ? mode.entry : selId), [selId, mode]);
  useEffect(() => viewer.current?.setSelection(assigning ? EMPTY_SELECTION : selection), [selection, mode]);
  useEffect(() => viewer.current?.setSelectionFilter(filter), [filter]);
  useEffect(() => viewer.current?.setMode(mode.mode, { kind: activeKind(model, mode) }), [mode]);
  useEffect(() => viewer.current?.setLoadSelection(activeLoad), [activeLoad]);
  useEffect(() => viewer.current?.setDisplay({ loads: display.loads, loadLabels: display.loadLabels }), [display.loads, display.loadLabels]);
  useEffect(() => viewer.current?.setView(view), [view?.plane, view?.offset]);
  useEffect(() => {
    const { deformed, reactions, scale, diagram: key, diagramScale, diagramLabels } = display;
    viewer.current?.setResults(resultsForViewer(results), { deformed, reactions, scale, diagram: key || null, diagramScale, diagramLabels });
    setDiagram(viewer.current?.diagramRange() ?? null);
  }, [results, display.deformed, display.reactions, display.scale, display.diagram, display.diagramScale, display.diagramLabels]);

  return { host, viewer, hoverId, diagram };
}
