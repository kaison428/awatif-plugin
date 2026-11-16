// Plane views: where a plane (XY, XZ, YZ) can sit on its normal axis. Pure.
import { AXIS, PLANE_NORMAL } from "./constants.js";

// Grid ordinates on the plane's normal axis, then the points' own coordinates
export function planeLocations(model, plane) {
  const axis = PLANE_NORMAL[plane];
  const out = new Map();
  model.gridLines.forEach((e) =>
    (e.params?.[axis] || []).forEach((g) => typeof g.ordinate === "number" && !out.has(g.ordinate) && out.set(g.ordinate, g.id)),
  );
  model.points.forEach(([, p]) => {
    const v = Math.round((p[AXIS[axis]] ?? 0) * 1e6) / 1e6;
    if (!out.has(v)) out.set(v, null);
  });
  return [...out.entries()].sort((a, b) => a[0] - b[0]).map(([value, id]) => ({ value, id }));
}

function linesOnPlane(model, axis, value) {
  const pts = new Map(model.points);
  return model.lines.filter(([, ends]) => ends.every((id) => Math.abs((pts.get(id)?.[axis] ?? NaN) - value) < 1e-6)).length;
}

// The location holding the most lines (the busiest level or frame); `fallback` when there is none
export function busiestOffset(model, plane, fallback) {
  const axis = AXIS[PLANE_NORMAL[plane]];
  let best = fallback;
  let bestCount = -1;
  planeLocations(model, plane).forEach(({ value }) => {
    const count = linesOnPlane(model, axis, value);
    if (count > bestCount) [best, bestCount] = [value, count];
  });
  return best;
}

// The next location up (dir > 0) or down from `offset`, or undefined at the end
export function steppedOffset(model, plane, offset, dir) {
  const locs = planeLocations(model, plane).map((l) => l.value);
  return dir > 0 ? locs.find((v) => v > offset + 1e-9) : [...locs].reverse().find((v) => v < offset - 1e-9);
}
