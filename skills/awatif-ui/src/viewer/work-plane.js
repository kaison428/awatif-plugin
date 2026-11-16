// Edit mode's work plane: where the cursor meets it, snapping, and the line preview.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { render } from './camera.js';
import { clearGroup, lineMat } from './materials.js';
import { mouseOf } from './picking.js';
import { clean, color } from './util.js';

const NORMAL = { XY: [0, 0, 1], YZ: [1, 0, 0], XZ: [0, 1, 0] };
const FIXED_AXIS = { XY: 'z', YZ: 'x', XZ: 'y' };

function planeNormal(v) {
  return new THREE.Vector3(...(NORMAL[v.state.workPlane] || NORMAL.XZ));
}

// Where the cursor ray meets the work plane, or the plane parallel to it through `through`
export function planeHit(v, ev, through) {
  const m = mouseOf(v, ev);
  const ndc = new THREE.Vector2((m.x / m.rect.width) * 2 - 1, -(m.y / m.rect.height) * 2 + 1);
  v.raycaster.setFromCamera(ndc, v.camera);
  const normal = planeNormal(v);
  const plane = new THREE.Plane(normal, through ? -normal.dot(through) : -v.state.workPlaneOffset);
  const hit = new THREE.Vector3();
  return v.raycaster.ray.intersectPlane(plane, hit) ? hit : null;
}

function gridOrdinates(model) {
  const out = { x: [], y: [], z: [] };
  (model.gridLines || []).forEach((e) => ['x', 'y', 'z'].forEach((a) => ((e.params || {})[a] || []).forEach((g) => { if (typeof g.ordinate === 'number') out[a].push(g.ordinate); })));
  return out;
}

function nearestWithin(values, x, tol) {
  let near = null;
  values.forEach((o) => { if (Math.abs(o - x) <= tol && (near === null || Math.abs(o - x) < Math.abs(near - x))) near = o; });
  return near;
}

// Snap the in-plane coordinates to grid-line ordinates (within 2% of the model size), else to the snap step
export function snap(v, p) {
  const fixed = FIXED_AXIS[v.state.workPlane] || 'y';
  const ords = gridOrdinates(v.state.model);
  const tol = (v.draw ? v.draw.extent : 10) * 0.02;
  ['x', 'y', 'z'].forEach((a) => {
    if (a === fixed) return;
    const near = nearestWithin(ords[a], p[a], tol);
    if (near !== null) p[a] = near;
    else if (v.state.snap > 0) p[a] = Math.round(p[a] / v.state.snap) * v.state.snap;
  });
  return [clean(p.x), clean(p.y), clean(p.z)];
}

// The dashed line from the edit mode's start point to `to` (null clears it)
export function drawPreview(v, to) {
  clearGroup(v, v.previewGroup);
  const { lineStart } = v.state;
  if (lineStart !== null && to && v.draw && v.draw.points.has(lineStart)) {
    const a = v.draw.points.get(lineStart);
    const seg = new LineSegments2(new LineSegmentsGeometry().setPositions([...a.toArray(), ...to.toArray()]), lineMat(v, color('elem-selected'), 2, true));
    seg.computeLineDistances();
    v.previewGroup.add(seg);
  }
  render(v);
}
