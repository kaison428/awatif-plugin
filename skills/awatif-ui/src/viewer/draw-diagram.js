/* One line result (N, Vy, Vz, Mx, My, Mz) as a filled diagram on the undeformed members: colored with the
 * diverging ramp (symmetric about zero), outlined in ink-muted, one value per geometry line labelled: at
 * midspan when the force is uniform along the line (equal to the shown 2 decimals), otherwise at the
 * governing (largest magnitude) location. Members off the viewed plane are faint and unlabelled. */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { solverAxes } from './axes.js';
import { DIAGRAM_AXIS, DIV_STOPS } from './constants.js';
import { fade, label, lineMat } from './materials.js';
import { nodeOnPlane } from './selection.js';
import { color } from './util.js';

function rangeOf(forces, key) {
  let maxAbs = 0, min = 0, max = 0;
  forces.forEach((f) => (f[key] || []).forEach((x) => {
    maxAbs = Math.max(maxAbs, Math.abs(x));
    min = Math.min(min, x);
    max = Math.max(max, x);
  }));
  return { maxAbs, min, max };
}

// value -> color on the diverging ramp, symmetric about zero
function colorRamp(maxAbs) {
  const stops = DIV_STOPS.map(color);
  return (x) => {
    const t = Math.max(0, Math.min(1, (x / maxAbs + 1) / 2)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(t));
    return stops[i].clone().lerp(stops[i + 1], t - i);
  };
}

// Every element of a geometry line, in order; mesh elements outside any line are drawn unlabelled
function lineGroups(lineToElements, forces) {
  const groups = [...lineToElements.entries()].map(([line, els]) => ({ line, els }));
  const inLine = new Set(groups.flatMap((g) => g.els));
  forces.forEach((_, e) => { if (!inLine.has(e)) groups.push({ line: null, els: [e] }); });
  return groups;
}

const emptySet = () => ({ fill: [], fillColor: [], edge: [] });

// Triangles and edges, accumulated per set (on the plane, off it)
function writer(colorOf) {
  return {
    tri: (set, ...pv) => pv.forEach(([p, x]) => { set.fill.push(p.x, p.y, p.z); const c = colorOf(x); set.fillColor.push(c.r, c.g, c.b); }),
    edge: (set, a, b) => set.edge.push(a.x, a.y, a.z, b.x, b.y, b.z),
  };
}

// One element's diagram: two triangles (split where it crosses the member, so each part keeps its side)
function elementShape(w, set, a, b, da, db, va, vb) {
  if (va * vb < 0) {
    const z = a.clone().lerp(b, va / (va - vb));
    w.tri(set, [a, va], [da, va], [z, 0]);
    w.tri(set, [z, 0], [db, vb], [b, vb]);
  } else {
    w.tri(set, [a, va], [da, va], [db, vb]);
    w.tri(set, [a, va], [db, vb], [b, vb]);
  }
  w.edge(set, da, db);
}

// Draws one geometry line's elements; returns { on, hi, lo, gov, first, last }
function lineDiagram(v, ctx, els) {
  const { key, k, nodes, sets, w } = ctx;
  const [axisName, sign] = DIAGRAM_AXIS[key];
  const out = { on: true, hi: null, lo: null, gov: null, first: null, last: null };
  els.forEach((e) => {
    const f = ctx.forces.get(e);
    const el = (v.results.elements || [])[e];
    if (!f || !f[key] || !el || el.length !== 2 || !nodes[el[0]] || !nodes[el[1]]) return;
    const a = new THREE.Vector3(...nodes[el[0]]), b = new THREE.Vector3(...nodes[el[1]]);
    const ax = solverAxes(a, b);
    if (!ax) return;
    const dir = ax[axisName].multiplyScalar(sign * k);
    const [va, vb] = f[key];
    const da = a.clone().addScaledVector(dir, va), db = b.clone().addScaledVector(dir, vb);
    const elOn = nodeOnPlane(v, nodes, el[0]) && nodeOnPlane(v, nodes, el[1]);
    out.on = out.on && elOn;
    const set = sets[elOn ? 'on' : 'off'];
    elementShape(w, set, a, b, da, db, va, vb);
    if (!out.first) out.first = { p: a, d: da, set };
    out.last = { p: b, d: db, set };
    [[da, va], [db, vb]].forEach(([p, x]) => {
      if (!out.hi || x > out.hi.v) out.hi = { p, v: x };
      if (!out.lo || x < out.lo.v) out.lo = { p, v: x };
      if (!out.gov || Math.abs(x) > Math.abs(out.gov.v)) out.gov = { p, v: x };
    });
  });
  // Close the diagram at the line's ends
  if (out.first) w.edge(out.first.set, out.first.p, out.first.d);
  if (out.last) w.edge(out.last.set, out.last.p, out.last.d);
  return out;
}

// The labelled value of a line: midspan when uniform, else the governing value
function lineLabel(d, maxAbs) {
  const shown = (x) => x.toFixed(2);
  if (Math.abs(d.gov.v) <= maxAbs * 1e-3) return null;
  return shown(d.hi.v) === shown(d.lo.v) ? { p: d.first.d.clone().lerp(d.last.d, 0.5), v: d.gov.v } : d.gov;
}

function addSets(v, sets) {
  const ink = color('ink-muted');
  ['on', 'off'].forEach((which) => {
    const s = sets[which];
    const objs = [];
    if (s.fill.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(s.fill, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(s.fillColor, 3));
      const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.75, depthWrite: false }));
      mesh.renderOrder = 1;
      objs.push(mesh);
    }
    if (s.edge.length) objs.push(new LineSegments2(new LineSegmentsGeometry().setPositions(s.edge), lineMat(v, ink, 1.25)));
    objs.forEach((o) => v.resultsGroup.add(which === 'on' ? o : fade(o)));
  });
}

export function drawDiagram(v, key, nodes) {
  const forces = v.results.internalForces;
  const { maxAbs, min, max } = rangeOf(forces, key);
  v.lastDiagram = { key, min, max, scale: 0 };
  if (maxAbs < 1e-9) return;
  const k = ((v.draw.extent * 0.08) / maxAbs) * (v.resultOptions.diagramScale || 1);
  v.lastDiagram.scale = k;
  const sets = { on: emptySet(), off: emptySet() };
  const ctx = { key, k, nodes, forces, sets, w: writer(colorRamp(maxAbs)) };
  const labelled = [];
  lineGroups(v.results.lineToElements || new Map(), forces).forEach(({ line, els }) => {
    const d = lineDiagram(v, ctx, els);
    if (line === null || !d.on || !d.hi || v.resultOptions.diagramLabels === false) return;
    const l = lineLabel(d, maxAbs);
    if (l) labelled.push(l);
  });
  addSets(v, sets);
  labelled.forEach(({ p, v: x }) => v.resultsGroup.add(label(x.toFixed(2).replace('-', '−'), p, 'var(--' + (x < 0 ? 'div-neg-2' : 'div-pos-2') + ')')));
}
