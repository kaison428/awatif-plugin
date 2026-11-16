// Grid lines of the model's grid systems: in a plane view the lines in the plane, in 3D
// x and y lines on every level with level labels and vertical lines at the intersections.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { PLANE_AXES, PLANE_NORMAL_AXIS } from './constants.js';
import { fade, label, lineMat } from './materials.js';
import { color, fmt } from './util.js';

const AXES = ['x', 'y', 'z'];
const GRID_BORDER = 'var(--elem-gridline)';
const vec = (o) => new THREE.Vector3(o.x, o.y, o.z);

// Shown grid lines per axis, from every grid-system entry
function ordinatesOf(model) {
  const ords = { x: [], y: [], z: [] };
  (model.gridLines || []).forEach((entry) => {
    const p = entry.params || {};
    AXES.forEach((a) => (p[a] || []).forEach((g) => { if (g.visible !== false && typeof g.ordinate === 'number') ords[a].push(g); }));
  });
  return ords;
}

// The extent of each axis: the grid lines and the model, padded
function spansOf(ords, bbox, pad) {
  const span = {};
  AXES.forEach((a) => {
    const vals = ords[a].map((g) => g.ordinate).concat([bbox.min[a], bbox.max[a]]);
    span[a] = [Math.min(...vals) - pad, Math.max(...vals) + pad];
  });
  return span;
}

// Plane view: the grid lines that lie in the plane (along one in-plane axis at the other's ordinates)
function planeSegments(view, ords, span, add) {
  const n = PLANE_NORMAL_AXIS[view.plane];
  const [u, w] = PLANE_AXES[view.plane];
  [[u, w], [w, u]].forEach(([a, along]) => ords[a].forEach((g) => {
    const from = { [n]: view.offset, [a]: g.ordinate, [along]: span[along][0] };
    const to = { [n]: view.offset, [a]: g.ordinate, [along]: span[along][1] };
    add(vec(from), vec(to), g.id, g.bubble);
  }));
}

// 3D: x and y grid lines on every level (bubbles on the lowest), level labels, vertical lines between levels
function levelSegments(v, ords, span, bbox, add) {
  const levels = ords.z.length ? ords.z.slice().sort((a, b) => a.ordinate - b.ordinate) : [{ id: null, ordinate: bbox.min.z }];
  levels.forEach((lvl, li) => {
    const z = lvl.ordinate;
    const bubbles = li === 0;
    ords.x.forEach((g) => add(new THREE.Vector3(g.ordinate, span.y[0], z), new THREE.Vector3(g.ordinate, span.y[1], z), bubbles ? g.id : null, g.bubble, !bubbles));
    ords.y.forEach((g) => add(new THREE.Vector3(span.x[0], g.ordinate, z), new THREE.Vector3(span.x[1], g.ordinate, z), bubbles ? g.id : null, g.bubble, !bubbles));
    if (lvl.id != null) v.root.add(label(lvl.id + ' ' + (z >= 0 ? '+' : '') + fmt(z, 2), new THREE.Vector3(span.x[0], span.y[0], z), GRID_BORDER));
  });
  if (levels.length < 2) return;
  const z0 = levels[0].ordinate, z1 = levels[levels.length - 1].ordinate;
  const xs = ords.x.length ? ords.x.map((g) => g.ordinate) : [span.x[0]];
  const ys = ords.y.length ? ords.y.map((g) => g.ordinate) : [span.y[0]];
  xs.forEach((x) => ys.forEach((y) => add(new THREE.Vector3(x, y, z0), new THREE.Vector3(x, y, z1), null, null, true)));
}

// Dashed segments in two batches: strong, and faded for lines off the bubble level
function addSegments(v, segs) {
  const strong = segs.filter((g) => !g.faded), weak = segs.filter((g) => g.faded);
  [[strong, false], [weak, true]].forEach(([list, faded]) => {
    if (!list.length) return;
    const positions = list.flatMap((g) => [...g.from.toArray(), ...g.to.toArray()]);
    const seg = new LineSegments2(new LineSegmentsGeometry().setPositions(positions), lineMat(v, color('elem-gridline'), 1, true));
    seg.computeLineDistances();
    if (faded) { seg.material.transparent = true; seg.material.opacity = 0.45; }
    v.root.add(seg);
  });
}

export function drawGridLines(v, bbox, s) {
  const ords = ordinatesOf(v.state.model);
  if (!ords.x.length && !ords.y.length && !ords.z.length) return;
  const span = spansOf(ords, bbox, s * 3);
  const segs = [];
  const add = (from, to, text, bubble, faded) => {
    segs.push({ from, to, faded });
    if (text == null) return;
    const l = label(text, bubble === 'start' ? from : to, GRID_BORDER);
    v.root.add(faded ? fade(l) : l);
  };
  if (v.state.view) planeSegments(v.state.view, ords, span, add);
  else levelSegments(v, ords, span, bbox, add);
  addSegments(v, segs);
}
