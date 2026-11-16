// Pointer and keyboard input, by mode: view (select, Shift+click/drag multi-select),
// assign (box or click adds/removes geometry of the active kind), edit (move, add, draw, delete).
import * as THREE from 'three';
import { DRAG_PX, KINDS } from './constants.js';
import { fit } from './camera.js';
import { rebuild } from './draw-model.js';
import { boxSelect, mouseOf, pick, pickLine, pickOfKind, pickPoint } from './picking.js';
import { dragRect } from './screen.js';
import { hasMulti, multiOut, selectedGeometry } from './selection.js';
import { hideTip, showTip } from './tooltip.js';
import { clean, emptySel, entries } from './util.js';
import { drawPreview, planeHit, snap } from './work-plane.js';

const GEOMETRY_ID = /^(point|line|polygon)-(\d+)$/;

// Capture phase, so OrbitControls never sees a box drag or a point drag
function onDown(v, ev) {
  v.down = { x: ev.clientX, y: ev.clientY, button: ev.button, boxing: false, dragId: null, shift: ev.shiftKey || ev.ctrlKey || ev.metaKey };
  if (ev.button !== 0) return;
  const { mode } = v.state;
  if (mode === 'assign' || (mode === 'view' && ev.shiftKey)) {
    v.down.boxing = true;
    v.controls.enabled = false;
  } else if (mode === 'edit') {
    const id = pickPoint(v, ev);
    if (id !== null) { v.down.dragId = id; v.controls.enabled = false; }
  }
}

function moveBox(v, ev) {
  const m = mouseOf(v, ev);
  const x0 = v.down.x - m.rect.left, y0 = v.down.y - m.rect.top;
  if (Math.hypot(m.x - x0, m.y - y0) <= DRAG_PX) return;
  Object.assign(v.box.style, {
    display: 'block', left: Math.min(x0, m.x) + 'px', top: Math.min(y0, m.y) + 'px',
    width: Math.abs(m.x - x0) + 'px', height: Math.abs(m.y - y0) + 'px', borderStyle: m.x < x0 ? 'dashed' : 'solid',
  });
}

// Edit mode: drag a point in its own plane parallel to the work plane
function moveDraggedPoint(v, ev) {
  const { down, state } = v;
  if (Math.hypot(ev.clientX - down.x, ev.clientY - down.y) <= DRAG_PX && !state.dragPoint) return;
  const origin = entries(state.model.points).find(([id]) => id === down.dragId);
  const hit = origin && planeHit(v, ev, new THREE.Vector3(...origin[1]));
  if (!hit) return;
  state.dragPoint = { id: down.dragId, pos: new THREE.Vector3(...snap(v, hit)) };
  rebuild(v);
}

function hoveredId(v, ev) {
  const { mode, assignKind } = v.state;
  if (mode === 'assign') {
    const k = pickOfKind(v, ev, assignKind);
    return k === null ? null : assignKind + '-' + k;
  }
  return mode === 'edit' ? pick(v, ev, { point: true, line: true, polygon: true, load: false }) : pick(v, ev);
}

function hover(v, ev) {
  const id = hoveredId(v, ev);
  const editing = v.state.mode === 'edit';
  v.renderer.domElement.style.cursor = editing ? (id && id.startsWith('point-') ? 'move' : 'crosshair') : id ? 'pointer' : 'default';
  if (id !== v.state.hovered) { v.state.hovered = id; rebuild(v); v.on.hover(id); }
  showTip(v, id, ev);
  if (editing && v.state.lineStart !== null) {
    const pid = pickPoint(v, ev);
    const hit = pid !== null ? v.draw.points.get(pid) : planeHit(v, ev);
    drawPreview(v, hit && (pid !== null ? hit : new THREE.Vector3(...snap(v, hit))));
  }
}

function onMove(v, ev) {
  if (v.down && v.down.boxing) return moveBox(v, ev);
  if (v.down && v.down.dragId !== null) return moveDraggedPoint(v, ev);
  if (ev.buttons) return hideTip(v);
  hover(v, ev);
}

function cancelLine(v) {
  v.state.lineStart = null;
  drawPreview(v, null);
  rebuild(v);
}

// Right click (not a pan): leave assign mode; in edit mode cancel a line, or delete a point or line
function upRight(v, ev) {
  const { mode } = v.state;
  if (mode === 'assign') return v.on.modeExit();
  if (mode !== 'edit') return;
  if (v.state.lineStart !== null) return cancelLine(v);
  const pid = pickPoint(v, ev);
  if (pid !== null) return v.on.edit({ type: 'delete-point', id: pid });
  const lid = pickLine(v, ev);
  if (lid !== null) v.on.edit({ type: 'delete-line', id: lid });
}

function upAssign(v, ev, d, moved) {
  const kind = v.state.assignKind;
  v.box.style.display = 'none';
  if (moved) {
    const m = mouseOf(v, ev);
    const r = dragRect(d, m);
    const ids = boxSelect(v, r, kind, m.rect);
    if (ids.length) v.on.assign(ids, r.adding);
    return;
  }
  const id = pickOfKind(v, ev, kind);
  if (id !== null) v.on.assign([id], !selectedGeometry(v)[kind].has(id));
}

// Edit mode with a line started: end it at a point or at a new point on the work plane
function finishLine(v, ev, pid) {
  const from = v.state.lineStart;
  v.state.lineStart = null;
  drawPreview(v, null);
  if (pid === from) return rebuild(v);
  if (pid !== null) return v.on.edit({ type: 'add-line', from, to: pid });
  const hit = planeHit(v, ev);
  if (hit) v.on.edit({ type: 'add-line', from, xyz: snap(v, hit) });
  else rebuild(v);
}

function upEdit(v, ev, d, moved) {
  const { state } = v;
  if (d.dragId !== null && state.dragPoint) {
    const { id, pos } = state.dragPoint;
    state.dragPoint = null;
    return v.on.edit({ type: 'move-point', id, xyz: [clean(pos.x), clean(pos.y), clean(pos.z)] });
  }
  if (moved) return; // orbit
  const pid = pickPoint(v, ev);
  if (state.lineStart !== null) return finishLine(v, ev, pid);
  if (pid !== null) {
    state.lineStart = pid;
    rebuild(v);
    return v.on.select('point-' + pid);
  }
  const hit = planeHit(v, ev);
  if (hit) v.on.edit({ type: 'add-point', xyz: snap(v, hit) });
}

// Shift+drag: box into the multi-selection (kinds the filter allows)
function boxIntoMulti(v, ev, d) {
  const m = mouseOf(v, ev);
  const r = dragRect(d, m);
  KINDS.forEach((k) => {
    if (v.state.filter[k]) boxSelect(v, r, k, m.rect).forEach((id) => (r.adding ? v.state.multi[k].add(id) : v.state.multi[k].delete(id)));
  });
  rebuild(v);
  v.on.selectionChange(multiOut(v));
}

// Shift/Ctrl+click: toggle one item, starting from what is highlighted so it extends a single selection
function toggleInMulti(v, ev) {
  const { state } = v;
  const m = GEOMETRY_ID.exec(pick(v, ev, { ...state.filter, load: false }) || '');
  if (!m) return;
  if (!hasMulti(v)) {
    const cur = state.selected && GEOMETRY_ID.exec(state.selected);
    if (cur) state.multi[cur[1]].add(Number(cur[2]));
  }
  const set = state.multi[m[1]], gid = Number(m[2]);
  if (set.has(gid)) set.delete(gid); else set.add(gid);
  state.selected = null;
  rebuild(v);
  v.on.selectionChange(multiOut(v));
}

function upView(v, ev, d, moved) {
  if (d.boxing) {
    v.box.style.display = 'none';
    if (moved) return boxIntoMulti(v, ev, d);
  }
  if (moved) return; // that was an orbit (or a pan in a plane view)
  if (d.shift) return toggleInMulti(v, ev);
  const id = pick(v, ev);
  v.state.selected = id;
  v.state.multi = emptySel();
  rebuild(v);
  v.on.select(id);
}

function onUp(v, ev) {
  const d = v.down;
  if (!d) return;
  v.down = null;
  v.controls.enabled = true;
  const moved = Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > DRAG_PX;
  if (d.button === 2) return moved ? undefined : upRight(v, ev);
  if (d.button !== 0) return;
  if (v.state.mode === 'assign') return upAssign(v, ev, d, moved);
  if (v.state.mode === 'edit') return upEdit(v, ev, d, moved);
  upView(v, ev, d, moved);
}

function onLeave(v) {
  hideTip(v);
  if (!v.state.hovered) return;
  v.state.hovered = null;
  rebuild(v);
  v.on.hover(null);
}

function clearSelection(v) {
  v.state.selected = null;
  v.state.multi = emptySel();
  rebuild(v);
  v.on.selectionChange(multiOut(v));
  v.on.select(null);
}

// Escape: cancel a line, leave assign mode, or clear the selection
function onKey(v, ev) {
  if (ev.key !== 'Escape') return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test((ev.target && ev.target.tagName) || '')) return;
  const { mode } = v.state;
  if (mode === 'edit' && v.state.lineStart !== null) cancelLine(v);
  else if (mode === 'assign') v.on.modeExit();
  else if (mode === 'view' && (v.state.selected || hasMulti(v))) clearSelection(v);
}

// Attaches the listeners; returns the function that removes them
export function attachPointer(v) {
  const canvas = v.renderer.domElement;
  const handlers = {
    down: (ev) => onDown(v, ev),
    move: (ev) => onMove(v, ev),
    up: (ev) => onUp(v, ev),
    leave: () => onLeave(v),
    dbl: () => { if (v.state.mode === 'view') fit(v); },
    key: (ev) => onKey(v, ev),
  };
  canvas.addEventListener('pointerdown', handlers.down, true);
  canvas.addEventListener('pointermove', handlers.move);
  window.addEventListener('pointerup', handlers.up);
  canvas.addEventListener('pointerleave', handlers.leave);
  canvas.addEventListener('dblclick', handlers.dbl);
  window.addEventListener('keydown', handlers.key);
  return () => {
    window.removeEventListener('pointerup', handlers.up);
    window.removeEventListener('keydown', handlers.key);
  };
}
