// Member axes for drawing symbols and line-result diagrams.
import * as THREE from 'three';

/* Local member axes: x along the member, z towards global Z (global X for vertical members). */
export function localAxes(a, b) {
  const x = new THREE.Vector3().subVectors(b, a).normalize();
  const ref = Math.abs(x.z) > 0.999 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const z = ref.clone().sub(x.clone().multiplyScalar(ref.dot(x))).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return { x, y, z };
}

/* The solver's member axes (awatif getTransformationMatrix): x along the member, y horizontal, z = x × y;
 * a vertical member takes y = global Y. Internal forces are reported in these axes. */
export function solverAxes(a, b) {
  const x = new THREE.Vector3().subVectors(b, a);
  if (x.length() < 1e-9) return null;
  x.normalize();
  const D = Math.hypot(x.x, x.y);
  if (D < 1e-9) return { x, y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(-Math.sign(x.z), 0, 0) };
  return { x, y: new THREE.Vector3(-x.y / D, x.x / D, 0), z: new THREE.Vector3((-x.x * x.z) / D, (-x.y * x.z) / D, D) };
}
