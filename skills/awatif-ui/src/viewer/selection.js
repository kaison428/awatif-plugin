// What is highlighted, which loads are shown, and what lies on the viewed plane.
import { COMPONENT_FIELDS, KINDS, PLANE_NORMAL_AXIS } from './constants.js';
import { emptySel } from './util.js';

// Geometry ids highlighted: the single selection (a geometry id or an entry's geometry) and the multi-selection
export function selectedGeometry(v) {
  const { state } = v;
  const ids = emptySel();
  KINDS.forEach((k) => state.multi[k].forEach((g) => ids[k].add(g)));
  const id = state.selected;
  if (!id) return ids;
  let m;
  if ((m = /^(point|line|polygon)-(\d+)$/.exec(id))) ids[m[1]].add(Number(m[2]));
  else if ((m = /^([A-Za-z]+)-(\d+)$/.exec(id)) && COMPONENT_FIELDS.includes(m[1])) {
    const entry = (state.model[m[1]] || [])[Number(m[2])];
    const kind = entry && v.kindOf(entry);
    if (kind) (entry.geometry || []).forEach((g) => ids[kind].add(g));
  }
  return ids;
}

// The multi-selection as sorted id lists, as onSelectionChange reports it
export function multiOut(v) {
  const out = {};
  KINDS.forEach((k) => { out[k] = [...v.state.multi[k]].sort((a, b) => a - b); });
  return out;
}

export function hasMulti(v) {
  return KINDS.some((k) => v.state.multi[k].size);
}

// Is a load entry in the shown load case or combination?
export function loadVisible(v, entry) {
  const { model, loadSelection: sel } = v.state;
  if (!sel) return true;
  const combo = (model.loadCombinations || []).find((c) => c.name === sel);
  if (combo) return !!(combo.factors && combo.factors[entry.loadCase]);
  return (entry.loadCase || (model.loadCases || [])[0]) === sel;
}

function planeTol(extent) { return 1e-3 * Math.max(1, extent || 1); }

// Is a position on the viewed plane? Always true in 3D.
export function onPlane(v, pos, extent) {
  const { view } = v.state;
  if (!view) return true;
  return Math.abs(pos[PLANE_NORMAL_AXIS[view.plane]] - view.offset) <= planeTol(extent);
}

// Is a mesh node (results) on the viewed plane?
export function nodeOnPlane(v, nodes, n) {
  return !!nodes[n] && onPlane(v, { x: nodes[n][0], y: nodes[n][1], z: nodes[n][2] }, v.draw.extent);
}
