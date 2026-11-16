/* Awatif viewer: the default, required three.js viewport for structural viewer apps.
 *
 * Source: skills/awatif-ui/src/viewer/ (this file composes the modules). `npm run build` bundles it into
 * assets/awatif-viewer.js, the single ES module pages load; never edit that file by hand.
 *
 * ES module. Needs "three" and "three/addons/" to resolve: through a bundler (Vite resolves them from
 * node_modules), or an import map (the starter pins three@0.183.2):
 *   <script type="importmap">{ "imports": {
 *     "three": "https://cdn.jsdelivr.net/npm/three@0.183.2/build/three.module.js",
 *     "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.183.2/examples/jsm/" } }</script>
 *
 * Exposes window.AwatifViewer = { createViewer } and exports createViewer.
 *
 *   const viewer = AwatifViewer.createViewer(element, model, {
 *     onSelect: (id) => ..., onHover: (id) => ...,
 *     onSelectionChange: (sel) => ...,  // view mode, Shift+click / Shift+drag: { point: [], line: [], polygon: [] }
 *     onAssign: (ids, add) => ...,      // assign mode: geometry ids of the active kind, add or remove
 *     onEdit: (op) => ...,              // edit mode: { type: 'move-point' | 'add-point' | 'add-line' | 'delete-point' | 'delete-line', ... }
 *     onModeExit: () => ...,            // right-click (no drag) in assign mode, or Escape
 *     hoverInfo: (id) => string | null, // text of a tooltip at the cursor for the hovered id ('\n' breaks lines)
 *     geometryKind: (entry) => 'point' | 'line' | 'polygon' | null,  // which geometry an entry's ids refer to
 *     workPlane: 'XY' | 'XZ' | 'YZ', workPlaneOffset: 0,             // where new points go in edit mode (default XZ, 0)
 *     snap: 0.1,                        // edit mode grid step in m; grid-line ordinates snap first
 *   });
 *   viewer.select('line-2' | 'supports-0' | 'loads-1' | null);  // highlight, same ids as AwatifUI.buildTree
 *   viewer.setSelection({ point: [1, 2], line: [], polygon: [] }); // the multi-selection (geometry ids)
 *   viewer.setSelectionFilter({ point, line, polygon });           // kinds Shift+click / Shift+drag pick (all on)
 *   viewer.setLoadSelection('Dead' | 'ULS' | null);  // which loads to draw (null: all)
 *   viewer.setModel(model);                          // redraw after the model changes
 *   viewer.setMode('view' | 'assign' | 'edit', { kind: 'point' | 'line' | 'polygon' });  // kind: assign only
 *   viewer.setView(null | { plane: 'XY' | 'XZ' | 'YZ', offset });  // null: 3D; else a 2D view of that plane
 *   viewer.setResults({ nodes, elements, displacements, reactions, internalForces, lineToElements } | null,
 *                     { deformed, reactions, scale, diagram, diagramScale, diagramLabels });
 *     // diagram: null | 'N' | 'Vy' | 'Vz' | 'Mx' | 'My' | 'Mz', a line result drawn on the members
 *   viewer.setDisplay({ loads, loadLabels, supports, gridLines, mesh });  // toggle model layers (all on by default)
 *   viewer.setWorkPlane(plane, offset);              // where edit mode puts new points
 *   viewer.diagramRange();                           // { key, min, max, scale } of the drawn line result, or null
 *   viewer.fit();                                    // frame the model (or the plane, in a plane view)
 *   viewer.dispose();
 *
 * Interaction, every mode: left-drag orbits (pans in a plane view), right-drag pans, wheel zooms, double-click
 * frames the model. Z is up.
 *   view:   click a point, line, polygon or load arrow to select it, click empty space to clear. Shift+click
 *           toggles geometry in the multi-selection; Shift+drag a box left to right adds what it touches, right
 *           to left removes it. Escape clears.
 *   assign: drag a box left to right to add what it touches, right to left to remove; click toggles one item.
 *           Right-click (without dragging) or Escape leaves the mode.
 *   edit:   drag a point to move it, click empty space to add a point, click a point then a point or empty space
 *           to draw a line, right-click a point or line to delete it, Escape cancels a line in progress.
 *           New positions lie on the work plane (dragged points stay in their own plane parallel to it).
 *
 * Plane view: an orthographic camera looks straight at the plane. Geometry off the plane is drawn faint and
 * cannot be picked; the plane becomes the work plane. Grid lines are drawn at every level in 3D.
 *
 * Colors come from the elem-* and viewport tokens and follow data-theme on <html>. Results draw into their own
 * group on `three.scene`; `three.root` is cleared on every redraw, so app drawings belong in a group of their own
 * on `three.scene` (call `render()` after changing it).
 */
import * as THREE from 'three';
import { KINDS } from './constants.js';
import { fit, render, resize, setView } from './camera.js';
import { rebuild } from './draw-model.js';
import { drawResults } from './draw-results.js';
import { clearGroup } from './materials.js';
import { attachPointer } from './pointer.js';
import { createScene } from './scene.js';
import { defaultGeometryKind, emptySel } from './util.js';

const noop = () => {};

function callbacksOf(options) {
  return {
    select: options.onSelect || noop,
    hover: options.onHover || noop,
    selectionChange: options.onSelectionChange || noop,
    assign: options.onAssign || noop,
    edit: options.onEdit || noop,
    modeExit: options.onModeExit || noop,
    hoverInfo: options.hoverInfo || (() => null),
  };
}

function initialState(model, options) {
  return {
    model, loadSelection: null, selected: null, hovered: null,
    multi: emptySel(),
    filter: { point: true, line: true, polygon: true },
    mode: 'view', assignKind: 'line',
    view: null,        // null (3D) or { plane, offset }
    lineStart: null,   // edit mode: point id a new line starts from
    dragPoint: null,   // edit mode: { id, pos } while a point is dragged
    display: { loads: true, loadLabels: true, supports: true, gridLines: true, mesh: true },
    workPlane: options.workPlane || 'XZ',
    workPlaneOffset: options.workPlaneOffset || 0,
    snap: options.snap === undefined ? 0.1 : options.snap,
  };
}

// The viewer's shared state `v`: every module reads and writes it
function createViewerState(element, model, options) {
  const kindOf = (entry) => {
    const k = options.geometryKind ? options.geometryKind(entry) : undefined;
    return k === undefined ? defaultGeometryKind(entry) : k;
  };
  return {
    element, kindOf,
    on: callbacksOf(options),
    state: initialState(model, options),
    results: null,
    resultOptions: { deformed: true, reactions: true, scale: 1, diagram: null, diagramScale: 1, diagramLabels: true },
    draw: null,
    down: null, // { x, y, button, boxing, dragId, shift } while a pointer is down
    lineMaterials: new Set(),
    lastDeformationScale: 0,
    lastDiagram: null,
    ...createScene(element),
  };
}

function refresh(v) {
  rebuild(v);
  drawResults(v);
}

// Redraw on resize and on a theme change (data-theme or the system preference)
function watchEnvironment(v) {
  const onTheme = () => refresh(v);
  const ro = new ResizeObserver(() => resize(v));
  ro.observe(v.element);
  const themeWatch = new MutationObserver(onTheme);
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onTheme);
  return () => {
    ro.disconnect();
    themeWatch.disconnect();
    media.removeEventListener('change', onTheme);
  };
}

function sameSelection(a, b) {
  return KINDS.every((k) => a[k].size === b[k].size && [...a[k]].every((g) => b[k].has(g)));
}

function setSelection(v, sel) {
  const next = emptySel();
  KINDS.forEach((k) => ((sel && sel[k]) || []).forEach((g) => next[k].add(g)));
  if (sameSelection(next, v.state.multi)) return;
  v.state.multi = next;
  rebuild(v);
}

function setMode(v, mode, opts = {}) {
  const { state } = v;
  state.mode = mode || 'view';
  if (opts.kind) state.assignKind = opts.kind;
  state.lineStart = null;
  state.dragPoint = null;
  v.box.style.display = 'none';
  clearGroup(v, v.previewGroup);
  v.renderer.domElement.style.cursor = state.mode === 'edit' ? 'crosshair' : 'default';
  rebuild(v);
}

function dispose(v, detach) {
  detach.forEach((fn) => fn());
  v.controls.dispose();
  [v.root, v.resultsGroup, v.previewGroup].forEach((g) => clearGroup(v, g));
  v.renderer.dispose();
  v.element.textContent = '';
}

function api(v, detach) {
  const { state } = v;
  return {
    three: { THREE, scene: v.scene, get camera() { return v.camera; }, renderer: v.renderer, controls: v.controls, root: v.root },
    select(id) { if (id !== state.selected) { state.selected = id || null; rebuild(v); } },
    setSelection: (sel) => setSelection(v, sel),
    setSelectionFilter(f) { state.filter = Object.assign({}, state.filter, f); },
    setLoadSelection(name) { state.loadSelection = name || null; rebuild(v); },
    setModel(next) { state.model = next; state.dragPoint = null; refresh(v); },
    setMode: (mode, opts) => setMode(v, mode, opts),
    setView: (view) => setView(v, view),
    getView() { return state.view ? { ...state.view } : null; },
    setResults(next, opts) {
      v.results = next || null;
      if (opts) v.resultOptions = Object.assign({}, v.resultOptions, opts);
      refresh(v);
    },
    setDisplay(opts) { state.display = Object.assign({}, state.display, opts); rebuild(v); },
    setWorkPlane(plane, offset) { state.workPlane = plane || 'XZ'; state.workPlaneOffset = offset || 0; },
    // Scale applied to the drawn displacements (0 when none are drawn)
    deformationScale() { return v.lastDeformationScale; },
    // The drawn line result: { key, min, max, scale } (scale: m per unit of force), or null
    diagramRange() { return v.lastDiagram ? { ...v.lastDiagram } : null; },
    fit: () => fit(v),
    render: () => render(v),
    dispose: () => dispose(v, detach),
  };
}

export function createViewer(element, model, options = {}) {
  const v = createViewerState(element, model, options);
  v.controls.addEventListener('change', () => render(v));
  const detach = [attachPointer(v), watchEnvironment(v)];
  resize(v);
  rebuild(v);
  fit(v);
  return api(v, detach);
}

if (typeof window !== 'undefined') window.AwatifViewer = { createViewer };
