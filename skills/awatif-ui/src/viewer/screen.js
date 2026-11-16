// 2D screen-space geometry for picking and box selection. Pure.

export function inRect(p, r) { return p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1; }

function cross(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }

function segsCross(a, b, c, d) {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

function rectCorners(r) { return [{ x: r.x0, y: r.y0 }, { x: r.x1, y: r.y0 }, { x: r.x1, y: r.y1 }, { x: r.x0, y: r.y1 }]; }

export function segTouchesRect(a, b, r) {
  if (inRect(a, r) || inRect(b, r)) return true;
  const c = rectCorners(r);
  for (let i = 0; i < 4; i++) if (segsCross(a, b, c[i], c[(i + 1) % 4])) return true;
  return false;
}

export function pointInPolygon(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/* Screen distance from m to segment pq, and where along it (0..1) */
export function segDistance(m, p, q) {
  const dx = q.x - p.x, dy = q.y - p.y, len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((m.x - p.x) * dx + (m.y - p.y) * dy) / len2));
  return { d: Math.hypot(p.x + t * dx - m.x, p.y + t * dy - m.y), t };
}

// The rectangle between a drag's start (client coords) and the current mouse position
export function dragRect(down, m) {
  const x0 = down.x - m.rect.left, y0 = down.y - m.rect.top;
  return { x0: Math.min(x0, m.x), y0: Math.min(y0, m.y), x1: Math.max(x0, m.x), y1: Math.max(y0, m.y), adding: m.x >= x0 };
}
