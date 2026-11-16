// Fat-line materials (tracked for resizes), labels, fading and disposal.
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { GHOST } from './constants.js';

// A line material sized to the viewport, resized with it
export function lineMat(v, color, width, dashed) {
  const m = new LineMaterial({ color, linewidth: width, dashed: !!dashed, dashSize: 0.4, gapSize: 0.2 });
  m.resolution.set(v.element.clientWidth || 1, v.element.clientHeight || 1);
  v.lineMaterials.add(m);
  return m;
}

export function clearGroup(v, g) {
  const seen = new Set();
  const disposeMaterial = (m) => {
    if (seen.has(m)) return;
    seen.add(m);
    v.lineMaterials.delete(m);
    m.dispose();
  };
  g.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(disposeMaterial);
    if (o.isCSS2DObject) o.element.remove();
  });
  g.clear();
}

/* Fade an object (and its children) for geometry off the viewed plane. Materials must not be shared. */
export function fade(obj) {
  obj.traverse((o) => {
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      m.transparent = true;
      m.opacity = (m.opacity ?? 1) * GHOST;
      m.depthWrite = false;
    });
  });
  if (obj.isCSS2DObject) obj.element.style.opacity = String(GHOST);
  return obj;
}

export const maybeFade = (obj, faded) => (faded ? fade(obj) : obj);

// A value label (pill) at a 3D position
export function label(text, at, border) {
  const div = document.createElement('div');
  div.className = 'data';
  div.textContent = text;
  Object.assign(div.style, { color: 'var(--ink)', background: 'var(--surface-raised)', border: '1px solid ' + border, borderRadius: 'var(--radius-pill)', padding: '0 var(--space-2)', whiteSpace: 'nowrap' });
  const o = new CSS2DObject(div);
  o.position.copy(at);
  return o;
}
