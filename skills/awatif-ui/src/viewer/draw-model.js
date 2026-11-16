// Draws the model into `three.root`: ground grid, grid lines, polygons, lines, mesh
// nodes and points, then supports, releases and loads (draw-symbols.js).
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { PLANE_NORMAL_AXIS } from './constants.js';
import { render } from './camera.js';
import { drawGridLines } from './draw-grid.js';
import { drawLoads, drawReleases, drawSupports } from './draw-symbols.js';
import { clearGroup, lineMat, maybeFade } from './materials.js';
import { onPlane, selectedGeometry } from './selection.js';
import { color, emptySel, entries, vec3 } from './util.js';

// Positions of points (with a dragged point moved), lines and polygons
function geometryOf(v) {
  const { model, dragPoint } = v.state;
  const points = new Map(entries(model.points).map(([id, p]) => [id, vec3(p)]));
  if (dragPoint && points.has(dragPoint.id)) points.set(dragPoint.id, dragPoint.pos.clone());
  const lines = new Map();
  entries(model.lines).forEach(([id, l]) => { if (points.has(l[0]) && points.has(l[1])) lines.set(id, [points.get(l[0]), points.get(l[1])]); });
  const polygons = new Map();
  entries(model.polygons).forEach(([id, ids]) => {
    const ring = ids.map((n) => points.get(n)).filter(Boolean);
    if (ring.length >= 3) polygons.set(id, ring);
  });
  return { points, lines, polygons };
}

function boundsOf(points) {
  const box = new THREE.Box3();
  points.forEach((p) => box.expandByPoint(p));
  if (box.isEmpty()) box.set(new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, 1, 1));
  return { box, extent: Math.max(box.getSize(new THREE.Vector3()).length(), 1) };
}

// Off-plane geometry (plane view only): drawn faint, never picked
function ghostsOf(v, { points, lines, polygons }, extent) {
  const ghost = emptySel();
  if (!v.state.view) return ghost;
  const off = (p) => !onPlane(v, p, extent);
  points.forEach((p, id) => { if (off(p)) ghost.point.add(id); });
  lines.forEach(([a, b], id) => { if (off(a) || off(b)) ghost.line.add(id); });
  polygons.forEach((ring, id) => { if (ring.some(off)) ghost.polygon.add(id); });
  return ghost;
}

// The highlight color of an item: selected, hovered, else its own
function itemColor(v, on, id, base) {
  return color(on ? 'elem-selected' : v.state.hovered === id ? 'elem-hover' : base);
}

// Ground grid: on the XY plane under the model in 3D, on the viewed plane in a plane view
function drawGround(v) {
  const { box, extent } = v.draw;
  const { view } = v.state;
  const gridSpan = Math.ceil(extent * 1.5);
  const grid = new THREE.GridHelper(gridSpan * 2, gridSpan * 2, color('viewport-grid'), color('viewport-grid'));
  const center = box.getCenter(new THREE.Vector3());
  const plane = view ? view.plane : 'XY';
  if (plane === 'XY') grid.rotation.x = Math.PI / 2;
  else if (plane === 'YZ') grid.rotation.z = Math.PI / 2;
  grid.position.set(Math.round(center.x), Math.round(center.y), view ? Math.round(center.z) : box.min.z);
  if (view) grid.position[PLANE_NORMAL_AXIS[plane]] = view.offset;
  v.root.add(grid);
}

// Polygons: outline + 20% face
function drawPolygons(v, sel) {
  v.draw.polygons.forEach((ring, id) => {
    const on = sel.polygon.has(id), faded = v.draw.ghost.polygon.has(id);
    const c = itemColor(v, on, 'polygon-' + id, 'elem-polygon');
    const shape = new THREE.BufferGeometry().setFromPoints(ring);
    const idx = [];
    for (let i = 1; i < ring.length - 1; i++) idx.push(0, i, i + 1);
    shape.setIndex(idx);
    v.root.add(maybeFade(new THREE.Mesh(shape, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })), faded));
    const outline = new LineGeometry().setPositions([...ring, ring[0]].flatMap((p) => p.toArray()));
    v.root.add(maybeFade(new Line2(outline, lineMat(v, c, on ? 3 : 1.5)), faded));
  });
}

// Lines: solid, heaviest; dashed in elem-undeformed under a deformed shape
function drawLines(v, sel, deformedShown) {
  v.draw.lines.forEach(([a, b], id) => {
    const on = sel.line.has(id), hov = v.state.hovered === 'line-' + id;
    const g = new LineGeometry().setPositions([...a.toArray(), ...b.toArray()]);
    const c = itemColor(v, on, 'line-' + id, deformedShown ? 'elem-undeformed' : 'elem-line');
    const line = new Line2(g, lineMat(v, c, on ? 5 : deformedShown ? 1.5 : 3, deformedShown && !on && !hov));
    if (deformedShown) line.computeLineDistances();
    v.root.add(maybeFade(line, v.draw.ghost.line.has(id)));
  });
}

// Mesh: dots at division nodes
function drawMesh(v) {
  (v.state.model.mesh || []).forEach((entry) => {
    if (v.kindOf(entry) !== 'line') return;
    const n = Math.max(1, Math.round((entry.params || {}).divisions || 1));
    const pos = [];
    (entry.geometry || []).forEach((lid) => {
      const l = v.draw.lines.get(lid);
      if (l && !v.draw.ghost.line.has(lid)) for (let i = 1; i < n; i++) pos.push(...new THREE.Vector3().lerpVectors(l[0], l[1], i / n).toArray());
    });
    if (!pos.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    v.root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: color('elem-mesh'), size: 4, sizeAttenuation: false })));
  });
}

// Points: filled dots
function drawPoints(v, sel, s) {
  const dot = new THREE.SphereGeometry(s * 0.25, 16, 12);
  v.draw.points.forEach((p, id) => {
    const on = sel.point.has(id) || v.state.lineStart === id, hov = v.state.hovered === 'point-' + id;
    const m = new THREE.Mesh(dot, new THREE.MeshBasicMaterial({ color: itemColor(v, on, 'point-' + id, 'elem-point') }));
    m.scale.setScalar(on || hov ? 1.5 : 1);
    m.position.copy(p);
    v.root.add(maybeFade(m, v.draw.ghost.point.has(id)));
  });
}

// Redraw the model from state. `v.draw` keeps what was drawn, for picking and framing:
// { points, lines, polygons, box, extent, ghost: {point,line,polygon: Set}, loadArrows: [{ id, tail, tip }] }
export function rebuild(v) {
  clearGroup(v, v.root);
  const geometry = geometryOf(v);
  const { box, extent } = boundsOf(geometry.points);
  v.draw = { ...geometry, box, extent, ghost: ghostsOf(v, geometry, extent), loadArrows: [] };
  const s = extent * 0.03; // symbol size
  const sel = selectedGeometry(v);
  const { results, resultOptions, state } = v;
  const deformedShown = !!(results && resultOptions.deformed && results.displacements && results.displacements.length);
  v.renderer.setClearColor(color('viewport'));
  drawGround(v);
  if (state.display.gridLines) drawGridLines(v, box, s);
  drawPolygons(v, sel);
  drawLines(v, sel, deformedShown);
  if (state.display.mesh) drawMesh(v);
  drawPoints(v, sel, s);
  if (state.display.supports) drawSupports(v, s);
  drawReleases(v, s);
  if (state.display.loads) drawLoads(v, s);
  render(v);
}
