// Screen-space picking and box selection. Off-plane geometry is never picked.
import { PICK_PX } from './constants.js';
import { inRect, pointInPolygon, segDistance, segTouchesRect } from './screen.js';

export function screenOf(v, p3, rect) {
  const p = p3.clone().project(v.camera);
  return { x: (p.x + 1) / 2 * rect.width, y: (1 - p.y) / 2 * rect.height, behind: p.z > 1 || p.z < -1 };
}

export function mouseOf(v, ev) {
  const rect = v.renderer.domElement.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top, rect };
}

// The id of `items` nearest the mouse within PICK_PX, by `distance(item, m)` (null to skip)
function nearest(items, m, distance) {
  let best = null, bestD = PICK_PX;
  items.forEach((item, id) => {
    const d = distance(item, id, m);
    if (d !== null && d < bestD) { bestD = d; best = id; }
  });
  return best;
}

export function pickPoint(v, ev) {
  if (!v.draw) return null;
  return nearest(v.draw.points, mouseOf(v, ev), (p3, id, m) => {
    if (v.draw.ghost.point.has(id)) return null;
    const p = screenOf(v, p3, m.rect);
    return p.behind ? null : Math.hypot(p.x - m.x, p.y - m.y);
  });
}

export function pickLine(v, ev) {
  if (!v.draw) return null;
  return nearest(v.draw.lines, mouseOf(v, ev), ([a, b], id, m) => {
    if (v.draw.ghost.line.has(id)) return null;
    const p = screenOf(v, a, m.rect), q = screenOf(v, b, m.rect);
    return p.behind || q.behind ? null : segDistance(m, p, q).d;
  });
}

export function pickPolygon(v, ev) {
  if (!v.draw) return null;
  const m = mouseOf(v, ev);
  let best = null;
  v.draw.polygons.forEach((ring, id) => {
    if (v.draw.ghost.polygon.has(id)) return;
    const scr = ring.map((p) => screenOf(v, p, m.rect));
    if (!scr.some((p) => p.behind) && pointInPolygon(m, scr)) best = id;
  });
  return best;
}

// A load arrow's shaft (not its tip, which sits on the geometry): the load entry id
function pickLoad(v, ev) {
  if (!v.draw || !v.state.display.loads) return null;
  const m = mouseOf(v, ev);
  let best = null, bestD = PICK_PX;
  v.draw.loadArrows.forEach((a) => {
    const p = screenOf(v, a.tail, m.rect), q = screenOf(v, a.tip, m.rect);
    if (p.behind || q.behind) return;
    const { d, t } = segDistance(m, p, q);
    if (t < 0.8 && d < bestD) { bestD = d; best = a.id; }
  });
  return best;
}

// Nearest point, then a load arrow, then nearest line, then a polygon under the cursor
export function pick(v, ev, filter) {
  const f = filter || { point: true, line: true, polygon: true, load: true };
  const p = f.point ? pickPoint(v, ev) : null;
  if (p !== null) return 'point-' + p;
  const ld = f.load ? pickLoad(v, ev) : null;
  if (ld !== null) return ld;
  const l = f.line ? pickLine(v, ev) : null;
  if (l !== null) return 'line-' + l;
  const g = f.polygon ? pickPolygon(v, ev) : null;
  return g !== null ? 'polygon-' + g : null;
}

export function pickOfKind(v, ev, kind) {
  if (kind === 'point') return pickPoint(v, ev);
  if (kind === 'polygon') return pickPolygon(v, ev);
  return pickLine(v, ev);
}

function polygonTouches(scr, r) {
  return scr.some((p) => inRect(p, r)) ||
    scr.some((p, i) => segTouchesRect(p, scr[(i + 1) % scr.length], r)) ||
    pointInPolygon({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }, scr);
}

// Ids of `kind` the screen rectangle touches
export function boxSelect(v, r, kind, rect) {
  const out = [];
  const g = v.draw.ghost[kind];
  const at = (p3) => screenOf(v, p3, rect);
  if (kind === 'point') v.draw.points.forEach((p3, id) => { const p = at(p3); if (!g.has(id) && !p.behind && inRect(p, r)) out.push(id); });
  else if (kind === 'line') v.draw.lines.forEach(([a, b], id) => {
    const p = at(a), q = at(b);
    if (!g.has(id) && !p.behind && !q.behind && segTouchesRect(p, q, r)) out.push(id);
  });
  else v.draw.polygons.forEach((ring, id) => {
    const scr = ring.map(at);
    if (!g.has(id) && !scr.some((p) => p.behind) && polygonTouches(scr, r)) out.push(id);
  });
  return out;
}
