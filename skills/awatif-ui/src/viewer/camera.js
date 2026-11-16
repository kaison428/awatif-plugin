// Cameras: framing the model, plane views (orthographic), rendering and resizing.
import * as THREE from 'three';
import { PLANE_AXES, PLANE_NORMAL_AXIS } from './constants.js';
import { drawResults } from './draw-results.js';
import { rebuild } from './draw-model.js';

export function render(v) {
  v.renderer.render(v.scene, v.camera);
  v.labels.render(v.scene, v.camera);
}

function useCamera(v, next) {
  if (v.camera === next) return;
  v.camera = next;
  v.controls.object = next;
}

const aspectOf = (element) => (element.clientWidth || 1) / (element.clientHeight || 1);

export function updateOrtho(v) {
  const aspect = aspectOf(v.element);
  Object.assign(v.ortho, { left: -v.orthoHalfHeight * aspect, right: v.orthoHalfHeight * aspect, top: v.orthoHalfHeight, bottom: -v.orthoHalfHeight });
  v.ortho.updateProjectionMatrix();
}

export function resize(v) {
  const w = v.element.clientWidth || 1, h = v.element.clientHeight || 1;
  v.renderer.setSize(w, h);
  v.labels.setSize(w, h);
  v.perspective.aspect = w / h;
  v.perspective.updateProjectionMatrix();
  updateOrtho(v);
  v.lineMaterials.forEach((m) => m.resolution.set(w, h));
  render(v);
}

// Frame the model (or the plane, in a plane view)
export function fit(v) {
  const { draw, perspective, controls } = v;
  if (!draw) return;
  if (v.state.view) return fitPlane(v);
  const c = draw.box.getCenter(new THREE.Vector3());
  const dist = (draw.extent * 0.5) / Math.sin((perspective.fov * Math.PI) / 360) * 1.1;
  const dir = new THREE.Vector3(0.6, -1, 0.55).normalize();
  perspective.near = dist / 1000;
  perspective.far = dist * 100;
  perspective.position.copy(c).add(dir.multiplyScalar(dist));
  perspective.updateProjectionMatrix();
  controls.target.copy(c);
  controls.update();
  render(v);
}

// The geometry on the viewed plane, else the whole model
function planeBox(draw) {
  const onIt = new THREE.Box3();
  draw.points.forEach((p, id) => { if (!draw.ghost.point.has(id)) onIt.expandByPoint(p); });
  return onIt.isEmpty() ? draw.box : onIt;
}

const LOOK_FROM = { XY: [0, 0, 1], XZ: [0, -1, 0], YZ: [1, 0, 0] };

// Frame the viewed plane: look along its normal, size the frustum to the geometry on it
function fitPlane(v) {
  const { draw, ortho, controls } = v;
  const { plane, offset } = v.state.view;
  const [u, w] = PLANE_AXES[plane];
  const b = planeBox(draw);
  const c = b.getCenter(new THREE.Vector3());
  c[PLANE_NORMAL_AXIS[plane]] = offset;
  const size = b.getSize(new THREE.Vector3());
  v.orthoHalfHeight = Math.max(1, Math.max(size[w], size[u] / aspectOf(v.element)) / 2 * 1.2 + draw.extent * 0.05);
  const dist = draw.extent * 2 + 10;
  ortho.up.set(0, plane === 'XY' ? 1 : 0, plane === 'XY' ? 0 : 1);
  ortho.position.copy(c).add(new THREE.Vector3(...LOOK_FROM[plane]).multiplyScalar(dist));
  Object.assign(ortho, { near: 0.01, far: dist + draw.extent * 4, zoom: 1 });
  ortho.lookAt(c);
  updateOrtho(v);
  controls.target.copy(c);
  controls.update();
  ortho.lookAt(c);
  render(v);
}

function enterPlane(v, next) {
  if (!v.state.view) v.savedPerspective = { position: v.perspective.position.clone(), target: v.controls.target.clone() };
  Object.assign(v.state, { view: next, workPlane: next.plane, workPlaneOffset: next.offset });
  useCamera(v, v.ortho);
  v.controls.enableRotate = false;
  v.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  rebuild(v);
  drawResults(v);
  fitPlane(v);
}

function leavePlane(v) {
  const was = v.state.view;
  v.state.view = null;
  useCamera(v, v.perspective);
  v.controls.enableRotate = true;
  v.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  rebuild(v);
  drawResults(v);
  if (!was || !v.savedPerspective) return fit(v);
  v.perspective.position.copy(v.savedPerspective.position);
  v.controls.target.copy(v.savedPerspective.target);
  v.controls.update();
  render(v);
}

// null: 3D; else { plane: 'XY' | 'XZ' | 'YZ', offset }
export function setView(v, view) {
  const next = view && PLANE_AXES[view.plane] ? { plane: view.plane, offset: Number(view.offset) || 0 } : null;
  if (next) enterPlane(v, next);
  else leavePlane(v);
}
