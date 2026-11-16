// Symbols on the geometry: supports, releases and load arrows with their values.
import * as THREE from 'three';
import { localAxes } from './axes.js';
import { label, maybeFade } from './materials.js';
import { loadVisible } from './selection.js';
import { color, fmt } from './util.js';

const LOAD_BORDER = 'var(--elem-load)';

// fixed = block, pinned = cone, roller = cone on a plate
function supportSymbol(type, s, mat) {
  const g = new THREE.Group();
  if (type === 'fixed') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(s * 1.4, s * 1.4, s * 0.5), mat);
    b.position.z = -s * 0.25;
    g.add(b);
    return g;
  }
  const c = new THREE.Mesh(new THREE.ConeGeometry(s * 0.6, s, 4), mat);
  c.rotation.x = -Math.PI / 2; // tip up, at the point
  c.position.z = -s * 0.5;
  g.add(c);
  if (type.endsWith('roller')) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.7, s * 0.7, s * 0.12, 24), mat);
    plate.rotation.x = Math.PI / 2;
    plate.position.z = -s * 1.2;
    g.add(plate);
  }
  return g;
}

export function drawSupports(v, s) {
  (v.state.model.supports || []).forEach((entry) => {
    const type = (entry.params || {}).type || 'pinned';
    (entry.geometry || []).forEach((pid) => {
      const p = v.draw.points.get(pid);
      if (!p) return;
      const g = supportSymbol(type, s, new THREE.MeshStandardMaterial({ color: color('elem-support') }));
      g.position.copy(p);
      v.root.add(maybeFade(g, v.draw.ghost.point.has(pid)));
    });
  });
}

// Releases: a hinge ring near each released end
export function drawReleases(v, s) {
  (v.state.model.releases || []).forEach((entry) => {
    const type = (entry.params || {}).type || 'both-ends';
    const ends = type === 'start' ? [0.08] : type === 'end' ? [0.92] : [0.08, 0.92];
    (entry.geometry || []).forEach((lid) => {
      const l = v.draw.lines.get(lid);
      if (!l) return;
      ends.forEach((t) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(s * 0.3, s * 0.08, 8, 24), new THREE.MeshBasicMaterial({ color: color('elem-release') }));
        m.position.lerpVectors(l[0], l[1], t);
        m.lookAt(m.position.clone().add(localAxes(l[0], l[1]).y));
        v.root.add(maybeFade(m, v.draw.ghost.line.has(lid)));
      });
    });
  });
}

// One arrow with its tip on the geometry; returns its tail. Unfaded arrows can be picked.
function arrow(v, entryId, tip, dir, len, c, faded) {
  const d = dir.clone().normalize();
  const tail = tip.clone().sub(d.clone().multiplyScalar(len));
  v.root.add(maybeFade(new THREE.ArrowHelper(d, tail, len, c, len * 0.3, len * 0.18), faded));
  if (!faded) v.draw.loadArrows.push({ id: entryId, tail, tip: tip.clone() });
  return tail;
}

function pointLoadText(p) {
  const parts = [];
  ['Fx', 'Fy', 'Fz'].forEach((k) => { if (p[k]) parts.push(k + ' ' + fmt(p[k]) + ' kN'); });
  ['Mx', 'My', 'Mz'].forEach((k) => { if (p[k]) parts.push(k + ' ' + fmt(p[k]) + ' kN·m'); });
  return parts.join(', ');
}

function drawPointLoad(v, entry, entryId, c, s) {
  const p = entry.params || {};
  const text = pointLoadText(p);
  if (!text) return;
  const f = new THREE.Vector3(p.Fx || 0, p.Fy || 0, p.Fz || 0);
  (entry.geometry || []).forEach((pid) => {
    const at = v.draw.points.get(pid);
    if (!at) return;
    const faded = v.draw.ghost.point.has(pid);
    const tail = f.lengthSq() > 0 ? arrow(v, entryId, at, f, s * 2.5, c, faded) : at;
    if (v.state.display.loadLabels) v.root.add(maybeFade(label(text, tail, LOAD_BORDER), faded));
  });
}

function loadAxis(dir, a, b) {
  if (dir.startsWith('global-')) return new THREE.Vector3(dir === 'global-x' ? 1 : 0, dir === 'global-y' ? 1 : 0, dir === 'global-z' ? 1 : 0);
  return localAxes(a, b)[dir === 'local-y' ? 'y' : 'z'];
}

// A row of arrows along each line, the value labelled at midspan
function drawDistributedLoad(v, entry, entryId, c, s) {
  const p = entry.params || {};
  if (!p.w) return;
  (entry.geometry || []).forEach((lid) => {
    const l = v.draw.lines.get(lid);
    if (!l) return;
    const faded = v.draw.ghost.line.has(lid);
    const f = loadAxis(p.direction || 'local-z', l[0], l[1]).multiplyScalar(Math.sign(p.w));
    const n = Math.max(3, Math.round(l[0].distanceTo(l[1]) / (s * 2)));
    let mid = null;
    for (let i = 0; i <= n; i++) {
      const tail = arrow(v, entryId, new THREE.Vector3().lerpVectors(l[0], l[1], i / n), f, s * 1.5, c, faded);
      if (i === Math.round(n / 2)) mid = tail;
    }
    if (v.state.display.loadLabels && mid) v.root.add(maybeFade(label('w ' + fmt(p.w) + ' kN/m', mid, LOAD_BORDER), faded));
  });
}

// Loads of the shown load case: arrows of the selected load entry are highlighted
export function drawLoads(v, s) {
  const { state } = v;
  (state.model.loads || []).forEach((entry, index) => {
    if (!loadVisible(v, entry)) return;
    const entryId = 'loads-' + index;
    const c = color(state.selected === entryId ? 'elem-selected' : state.hovered === entryId ? 'elem-hover' : 'elem-load');
    if (entry.templateId === 'point-load') drawPointLoad(v, entry, entryId, c, s);
    else if (entry.templateId === 'distributed-load') drawDistributedLoad(v, entry, entryId, c, s);
  });
}
