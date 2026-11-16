// Results: deformed shape (elem-deformed over the dashed undeformed geometry), reaction arrows,
// and a line-result diagram (draw-diagram.js). They go in their own group on the scene.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { render } from './camera.js';
import { drawDiagram } from './draw-diagram.js';
import { clearGroup, fade, label, lineMat } from './materials.js';
import { nodeOnPlane } from './selection.js';
import { color } from './util.js';

function maxDisplacement(nodes, disp) {
  let max = 0;
  for (let i = 0; i < nodes.length; i++) max = Math.max(max, Math.hypot(disp[i * 3] || 0, disp[i * 3 + 1] || 0, disp[i * 3 + 2] || 0));
  return max;
}

// Element edges: a frame element is one edge, a shell element its outline
const edgesOf = (el) => (el.length === 2 ? [[el[0], el[1]]] : el.map((n, i) => [n, el[(i + 1) % el.length]]));

function drawDeformed(v, nodes, disp) {
  const max = maxDisplacement(nodes, disp);
  const k = max > 0 ? ((v.draw.extent * 0.05) / max) * (v.resultOptions.scale || 1) : 0;
  v.lastDeformationScale = k;
  const at = (n) => new THREE.Vector3(nodes[n][0] + k * (disp[n * 3] || 0), nodes[n][1] + k * (disp[n * 3 + 1] || 0), nodes[n][2] + k * (disp[n * 3 + 2] || 0));
  const pos = [], faint = [];
  (v.results.elements || []).forEach((el) => edgesOf(el).forEach(([a, b]) => {
    if (!nodes[a] || !nodes[b]) return;
    (nodeOnPlane(v, nodes, a) && nodeOnPlane(v, nodes, b) ? pos : faint).push(...at(a).toArray(), ...at(b).toArray());
  }));
  const segments = (list) => new LineSegments2(new LineSegmentsGeometry().setPositions(list), lineMat(v, color('elem-deformed'), 2.5));
  if (pos.length) v.resultsGroup.add(segments(pos));
  if (faint.length) v.resultsGroup.add(fade(segments(faint)));
}

// Reaction arrows sized by magnitude, labelled in kN
function drawReactions(v, nodes) {
  const s = v.draw.extent * 0.03;
  const c = color('elem-reaction');
  const forces = [];
  v.results.reactions.forEach((r, n) => {
    if (!r || !nodes[n] || !nodeOnPlane(v, nodes, n)) return;
    const f = new THREE.Vector3(r[0] || 0, r[1] || 0, r[2] || 0);
    if (f.length() > 1e-6) forces.push([n, f]);
  });
  const maxF = forces.reduce((m, [, f]) => Math.max(m, f.length()), 0);
  forces.forEach(([n, f]) => {
    const tip = new THREE.Vector3(...nodes[n]);
    const len = s * (1.5 + 2.5 * (f.length() / maxF));
    const d = f.clone().normalize();
    const tail = tip.clone().sub(d.clone().multiplyScalar(len + s * 0.6));
    v.resultsGroup.add(new THREE.ArrowHelper(d, tail, len, c, len * 0.3, len * 0.18));
    v.resultsGroup.add(label(f.length().toFixed(2) + ' kN', tail, 'var(--elem-reaction)'));
  });
}

export function drawResults(v) {
  clearGroup(v, v.resultsGroup);
  v.lastDeformationScale = 0;
  v.lastDiagram = null;
  const { results, resultOptions: opts } = v;
  if (!results || !v.draw) return render(v);
  const nodes = results.nodes || [];
  const disp = results.displacements || [];
  if (opts.deformed && disp.length) drawDeformed(v, nodes, disp);
  if (opts.reactions && results.reactions && results.reactions.length) drawReactions(v, nodes);
  if (opts.diagram && results.internalForces) drawDiagram(v, opts.diagram, nodes);
  render(v);
}
