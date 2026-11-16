// Small helpers: Ided lists, template kinds, theme tokens, number formatting.
import * as THREE from 'three';
import { POINT_TEMPLATES, POLYGON_TEMPLATES } from './constants.js';

// Ided<T> (Map, [id, T][] or a plain list with 1-based ids) -> [id, T][]
export function entries(ided) {
  if (!ided) return [];
  if (ided instanceof Map) return [...ided.entries()];
  const pairs = ided.length > 0 && ided.every((e) => Array.isArray(e) && e.length === 2 && typeof e[0] === 'number' && Array.isArray(e[1]));
  return pairs ? ided.slice() : ided.map((e, i) => [i + 1, e]);
}

export function defaultGeometryKind(entry) {
  if (entry.templateId === 'grid-system') return null;
  if (POINT_TEMPLATES.has(entry.templateId)) return 'point';
  if (POLYGON_TEMPLATES.has(entry.templateId)) return 'polygon';
  return 'line';
}

export function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || '#808080';
}

// A theme color token as a three.js color
export const color = (name) => new THREE.Color(token(name));

export const clean = (n) => (Math.abs(n) < 1e-9 ? 0 : Math.round(n * 1e6) / 1e6);
export const fmt = (v, d = 1) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d).replace('-', '−');
export const emptySel = () => ({ point: new Set(), line: new Set(), polygon: new Set() });
export const vec3 = (p) => new THREE.Vector3(p[0], p[1], p[2] || 0);
