/* Awatif viewer: the default, required three.js viewport for structural viewer apps.
 *
 * ES module. Needs "three" and "three/addons/" to resolve: through a bundler (Vite resolves them from
 * node_modules), or an import map (the starter pins three@0.183.2):
 *   <script type="importmap">{ "imports": {
 *     "three": "https://cdn.jsdelivr.net/npm/three@0.183.2/build/three.module.js",
 *     "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.183.2/examples/jsm/" } }</script>
 *
 * Exposes window.AwatifViewer = { createViewer } and exports createViewer.
 *
 *   const viewer = AwatifViewer.createViewer(element, model, {
 *     onSelect: (id) => ..., onHover: (id) => ...,
 *     onAssign: (ids, add) => ...,      // assign mode: geometry ids of the active kind, add or remove
 *     onEdit: (op) => ...,              // edit mode: { type: 'move-point' | 'add-point' | 'add-line' | 'delete-point' | 'delete-line', ... }
 *     onModeExit: () => ...,            // right-click (no drag) in assign mode, or Escape
 *     geometryKind: (entry) => 'point' | 'line' | 'polygon' | null,  // which geometry an entry's ids refer to
 *     workPlane: 'XY' | 'XZ' | 'YZ', workPlaneOffset: 0,             // where new points go in edit mode (default XZ, 0)
 *     snap: 0.1,                        // edit mode grid step in m; grid-line ordinates snap first
 *   });
 *   viewer.select('line-2' | 'supports-0' | null);   // highlight, same ids as AwatifUI.buildTree
 *   viewer.setLoadSelection('Dead' | 'ULS' | null);  // which loads to draw (null: all)
 *   viewer.setModel(model);                          // redraw after the model changes
 *   viewer.setMode('view' | 'assign' | 'edit', { kind: 'point' | 'line' | 'polygon' });  // kind: assign only
 *   viewer.setResults({ nodes, elements, displacements, reactions } | null, { deformed, reactions, scale });
 *   viewer.setDisplay({ loads, supports, gridLines, mesh });                // toggle model layers (all on by default)
 *   viewer.fit();                                    // frame the model
 *   viewer.dispose();
 *
 * Interaction, every mode: left-drag orbits, right-drag pans, wheel zooms, double-click frames the model. Z is up.
 *   view:   click a point or line to select it, click empty space to clear.
 *   assign: drag a box left to right to add what it touches, right to left to remove; click toggles one item.
 *           Right-click (without dragging) or Escape leaves the mode.
 *   edit:   drag a point to move it, click empty space to add a point, click a point then a point or empty space
 *           to draw a line, right-click a point or line to delete it, Escape cancels a line in progress.
 *           New positions lie on the work plane (dragged points stay in their own plane parallel to it).
 *
 * Colors come from the elem-* and viewport tokens and follow data-theme on <html>. Results draw into their own
 * group on `three.scene`; `three.root` is cleared on every redraw, so app drawings belong in a group of their own
 * on `three.scene` (call `render()` after changing it).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/* Which geometry an entry's ids refer to, by template. Unknown templates default to lines. */
const POINT_TEMPLATES = new Set(['point-load', 'point-support']);
const POLYGON_TEMPLATES = new Set(['triangle-mesh', 'generic-shell']);
const COMPONENT_FIELDS = ['gridLines', 'loads', 'supports', 'releases', 'localAxes', 'imperfections', 'mesh', 'design'];
const PICK_PX = 8;
const DRAG_PX = 4;

function entries(ided) {
  if (!ided) return [];
  if (ided instanceof Map) return [...ided.entries()];
  const pairs = ided.length > 0 && ided.every((e) => Array.isArray(e) && e.length === 2 && typeof e[0] === 'number' && Array.isArray(e[1]));
  return pairs ? ided.slice() : ided.map((e, i) => [i + 1, e]);
}

function defaultGeometryKind(entry) {
  if (entry.templateId === 'grid-system') return null;
  if (POINT_TEMPLATES.has(entry.templateId)) return 'point';
  if (POLYGON_TEMPLATES.has(entry.templateId)) return 'polygon';
  return 'line';
}

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || '#808080';
}

/* Local member axes: x along the member, z towards global Z (global X for vertical members). */
function localAxes(a, b) {
  const x = new THREE.Vector3().subVectors(b, a).normalize();
  const ref = Math.abs(x.z) > 0.999 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const z = ref.clone().sub(x.clone().multiplyScalar(ref.dot(x))).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return { x, y, z };
}

/* 2D screen-space helpers for box selection */
function inRect(p, r) { return p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1; }
function cross(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
function segsCross(a, b, c, d) {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
function rectCorners(r) { return [{ x: r.x0, y: r.y0 }, { x: r.x1, y: r.y0 }, { x: r.x1, y: r.y1 }, { x: r.x0, y: r.y1 }]; }
function segTouchesRect(a, b, r) {
  if (inRect(a, r) || inRect(b, r)) return true;
  const c = rectCorners(r);
  for (let i = 0; i < 4; i++) if (segsCross(a, b, c[i], c[(i + 1) % 4])) return true;
  return false;
}
function pointInPolygon(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

const clean = (n) => (Math.abs(n) < 1e-9 ? 0 : Math.round(n * 1e6) / 1e6);

export function createViewer(element, model, options = {}) {
  const onSelect = options.onSelect || (() => {});
  const onHover = options.onHover || (() => {});
  const onAssign = options.onAssign || (() => {});
  const onEdit = options.onEdit || (() => {});
  const onModeExit = options.onModeExit || (() => {});
  const kindOf = (entry) => {
    const k = options.geometryKind ? options.geometryKind(entry) : undefined;
    return k === undefined ? defaultGeometryKind(entry) : k;
  };

  element.textContent = '';
  if (getComputedStyle(element).position === 'static') element.style.position = 'relative';

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  element.appendChild(renderer.domElement);

  const labels = new CSS2DRenderer();
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  element.appendChild(labels.domElement);

  // Selection box (assign mode): solid when adding (left to right), dashed when removing
  const box = document.createElement('div');
  Object.assign(box.style, { position: 'absolute', display: 'none', pointerEvents: 'none', borderWidth: '1px', borderColor: 'var(--elem-selected)' });
  element.appendChild(box);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
  camera.up.set(0, 0, 1);
  camera.position.set(10, -15, 10);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.addEventListener('change', render);

  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(1, -2, 3);
  scene.add(sun);

  const root = new THREE.Group();
  scene.add(root);
  const resultsGroup = new THREE.Group();
  scene.add(resultsGroup);
  const previewGroup = new THREE.Group();
  scene.add(previewGroup);

  let state = {
    model, loadSelection: null, selected: null, hovered: null,
    mode: 'view', assignKind: 'line',
    lineStart: null,   // edit mode: point id a new line starts from
    dragPoint: null,   // edit mode: { id, pos } while a point is dragged
    display: { loads: true, supports: true, gridLines: true, mesh: true },
    workPlane: options.workPlane || 'XZ',
    workPlaneOffset: options.workPlaneOffset || 0,
    snap: options.snap === undefined ? 0.1 : options.snap,
  };
  let results = null;
  let resultOptions = { deformed: true, reactions: true, scale: 1 };
  let draw = null; // { points: Map<id, Vector3>, lines: Map<id, [a,b]>, polygons: Map<id, Vector3[]>, box, extent }
  const lineMaterials = new Set();

  function resolutionFor(mat) {
    mat.resolution.set(element.clientWidth || 1, element.clientHeight || 1);
    lineMaterials.add(mat);
    return mat;
  }

  function lineMat(color, width, dashed) {
    const m = new LineMaterial({ color, linewidth: width, dashed: !!dashed, dashSize: 0.4, gapSize: 0.2 });
    return resolutionFor(m);
  }

  function clearGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { lineMaterials.delete(m); m.dispose(); });
      if (o.isCSS2DObject) o.element.remove();
    });
    g.clear();
  }

  function selectedGeometry() {
    const ids = { point: new Set(), line: new Set(), polygon: new Set() };
    const id = state.selected;
    if (!id) return ids;
    let m;
    if ((m = /^(point|line|polygon)-(\d+)$/.exec(id))) ids[m[1]].add(Number(m[2]));
    else if ((m = /^([A-Za-z]+)-(\d+)$/.exec(id)) && COMPONENT_FIELDS.includes(m[1])) {
      const entry = (state.model[m[1]] || [])[Number(m[2])];
      const kind = entry && kindOf(entry);
      if (kind) (entry.geometry || []).forEach((g) => ids[kind].add(g));
    }
    return ids;
  }

  function loadVisible(entry) {
    const sel = state.loadSelection;
    if (!sel) return true;
    const combo = (state.model.loadCombinations || []).find((c) => c.name === sel);
    if (combo) return !!(combo.factors && combo.factors[entry.loadCase]);
    return (entry.loadCase || (state.model.loadCases || [])[0]) === sel;
  }

  function label(text, at, border) {
    const div = document.createElement('div');
    div.className = 'data';
    div.textContent = text;
    Object.assign(div.style, { color: 'var(--ink)', background: 'var(--surface-raised)', border: '1px solid ' + border, borderRadius: 'var(--radius-pill)', padding: '0 var(--space-2)', whiteSpace: 'nowrap' });
    const o = new CSS2DObject(div);
    o.position.copy(at);
    return o;
  }

  function rebuild() {
    clearGroup(root);
    const mdl = state.model;
    const pts = new Map(entries(mdl.points).map(([id, p]) => [id, new THREE.Vector3(p[0], p[1], p[2] || 0)]));
    if (state.dragPoint && pts.has(state.dragPoint.id)) pts.set(state.dragPoint.id, state.dragPoint.pos.clone());
    const lines = new Map();
    entries(mdl.lines).forEach(([id, l]) => { if (pts.has(l[0]) && pts.has(l[1])) lines.set(id, [pts.get(l[0]), pts.get(l[1])]); });
    const polygons = new Map();
    entries(mdl.polygons).forEach(([id, ids]) => {
      const ring = ids.map((n) => pts.get(n)).filter(Boolean);
      if (ring.length >= 3) polygons.set(id, ring);
    });

    const bbox = new THREE.Box3();
    pts.forEach((p) => bbox.expandByPoint(p));
    if (bbox.isEmpty()) bbox.set(new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, 1, 1));
    const extent = Math.max(bbox.getSize(new THREE.Vector3()).length(), 1);
    const s = extent * 0.03; // symbol size
    draw = { points: pts, lines, polygons, box: bbox, extent };

    const sel = selectedGeometry();
    const C = (n) => new THREE.Color(token(n));
    renderer.setClearColor(C('viewport'));
    const deformedShown = !!(results && resultOptions.deformed && results.displacements && results.displacements.length);

    // Ground grid on the XY workplane
    const span = Math.ceil(extent * 1.5);
    const grid = new THREE.GridHelper(span * 2, span * 2, C('viewport-grid'), C('viewport-grid'));
    grid.rotation.x = Math.PI / 2;
    const center = bbox.getCenter(new THREE.Vector3());
    grid.position.set(Math.round(center.x), Math.round(center.y), bbox.min.z);
    root.add(grid);

    // Grid lines (dash-dot) with bubbles
    if (state.display.gridLines) (mdl.gridLines || []).forEach((entry) => {
      const p = entry.params || {};
      const pad = s * 3;
      const add = (from, to, text, at) => {
        const g = new LineSegmentsGeometry().setPositions([...from.toArray(), ...to.toArray()]);
        const seg = new LineSegments2(g, lineMat(C('elem-gridline'), 1, true));
        seg.computeLineDistances();
        root.add(seg);
        root.add(label(text, at, 'var(--elem-gridline)'));
      };
      const z0 = bbox.min.z;
      (p.x || []).filter((g) => g.visible !== false).forEach((g) => {
        const a = new THREE.Vector3(g.ordinate, bbox.min.y - pad, z0), b = new THREE.Vector3(g.ordinate, bbox.max.y + pad, z0);
        add(a, b, g.id, g.bubble === 'start' ? a : b);
      });
      (p.y || []).filter((g) => g.visible !== false).forEach((g) => {
        const a = new THREE.Vector3(bbox.min.x - pad, g.ordinate, z0), b = new THREE.Vector3(bbox.max.x + pad, g.ordinate, z0);
        add(a, b, g.id, g.bubble === 'start' ? a : b);
      });
    });

    // Polygons: outline + 20% face
    polygons.forEach((ring, id) => {
      const on = sel.polygon.has(id), hov = state.hovered === 'polygon-' + id;
      const color = C(on ? 'elem-selected' : hov ? 'elem-hover' : 'elem-polygon');
      const shapeGeom = new THREE.BufferGeometry().setFromPoints(ring);
      const idx = [];
      for (let i = 1; i < ring.length - 1; i++) idx.push(0, i, i + 1);
      shapeGeom.setIndex(idx);
      root.add(new THREE.Mesh(shapeGeom, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })));
      const lg = new LineGeometry().setPositions([...ring, ring[0]].flatMap((v) => v.toArray()));
      root.add(new Line2(lg, lineMat(color, on ? 3 : 1.5)));
    });

    // Lines: solid, heaviest; dashed in elem-undeformed under a deformed shape
    lines.forEach(([a, b], id) => {
      const on = sel.line.has(id), hov = state.hovered === 'line-' + id;
      const g = new LineGeometry().setPositions([...a.toArray(), ...b.toArray()]);
      const base = deformedShown ? 'elem-undeformed' : 'elem-line';
      const line = new Line2(g, lineMat(C(on ? 'elem-selected' : hov ? 'elem-hover' : base), on ? 5 : deformedShown ? 1.5 : 3, deformedShown && !on && !hov));
      if (deformedShown) line.computeLineDistances();
      root.add(line);
    });

    // Mesh: dots at division nodes
    if (state.display.mesh) (mdl.mesh || []).forEach((entry) => {
      if (kindOf(entry) !== 'line') return;
      const n = Math.max(1, Math.round((entry.params || {}).divisions || 1));
      const pos = [];
      (entry.geometry || []).forEach((lid) => {
        const l = lines.get(lid);
        if (l) for (let i = 1; i < n; i++) pos.push(...new THREE.Vector3().lerpVectors(l[0], l[1], i / n).toArray());
      });
      if (!pos.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: C('elem-mesh'), size: 4, sizeAttenuation: false })));
    });

    // Points: filled dots
    const dot = new THREE.SphereGeometry(s * 0.25, 16, 12);
    pts.forEach((p, id) => {
      const start = state.lineStart === id;
      const on = sel.point.has(id) || start, hov = state.hovered === 'point-' + id;
      const m = new THREE.Mesh(dot, new THREE.MeshBasicMaterial({ color: C(on ? 'elem-selected' : hov ? 'elem-hover' : 'elem-point') }));
      m.scale.setScalar(on || hov ? 1.5 : 1);
      m.position.copy(p);
      root.add(m);
    });

    // Supports: fixed = block, pinned = cone, roller = cone on a plate
    if (state.display.supports) (mdl.supports || []).forEach((entry) => {
      const type = (entry.params || {}).type || 'pinned';
      const mat = new THREE.MeshStandardMaterial({ color: C('elem-support') });
      (entry.geometry || []).forEach((pid) => {
        const p = pts.get(pid);
        if (!p) return;
        const g = new THREE.Group();
        if (type === 'fixed') {
          const b = new THREE.Mesh(new THREE.BoxGeometry(s * 1.4, s * 1.4, s * 0.5), mat);
          b.position.z = -s * 0.25;
          g.add(b);
        } else {
          const c = new THREE.Mesh(new THREE.ConeGeometry(s * 0.6, s, 4), mat);
          c.rotation.x = -Math.PI / 2; // tip up, at the point
          c.position.z = -s * 0.5;
          g.add(c);
          if (type.endsWith('roller')) {
            const plate = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.7, s * 0.7, s * 0.12, 24), mat);
            plate.rotation.x = Math.PI / 2;
            plate.position.z = -s * 1.2;
            g.add(plate);
          }
        }
        g.position.copy(p);
        root.add(g);
      });
    });

    // Releases: hinge ring near the released end
    (mdl.releases || []).forEach((entry) => {
      const type = (entry.params || {}).type || 'both-ends';
      const mat = new THREE.MeshBasicMaterial({ color: C('elem-release') });
      (entry.geometry || []).forEach((lid) => {
        const l = lines.get(lid);
        if (!l) return;
        const ends = type === 'start' ? [0.08] : type === 'end' ? [0.92] : [0.08, 0.92];
        ends.forEach((t) => {
          const m = new THREE.Mesh(new THREE.TorusGeometry(s * 0.3, s * 0.08, 8, 24), mat);
          m.position.lerpVectors(l[0], l[1], t);
          m.lookAt(m.position.clone().add(localAxes(l[0], l[1]).y));
          root.add(m);
        });
      });
    });

    // Loads: arrows, tips on the geometry
    const loadColor = C('elem-load');
    const arrow = (tip, dir, len) => {
      const d = dir.clone().normalize();
      root.add(new THREE.ArrowHelper(d, tip.clone().sub(d.clone().multiplyScalar(len)), len, loadColor, len * 0.3, len * 0.18));
    };
    if (state.display.loads) (mdl.loads || []).filter(loadVisible).forEach((entry) => {
      const p = entry.params || {};
      if (entry.templateId === 'point-load') {
        const f = new THREE.Vector3(p.Fx || 0, p.Fy || 0, p.Fz || 0);
        if (f.lengthSq() === 0) return;
        (entry.geometry || []).forEach((pid) => pts.get(pid) && arrow(pts.get(pid), f, s * 2.5));
      } else if (entry.templateId === 'distributed-load') {
        if (!p.w) return;
        const dir = p.direction || 'local-z';
        (entry.geometry || []).forEach((lid) => {
          const l = lines.get(lid);
          if (!l) return;
          let axis;
          if (dir.startsWith('global-')) axis = new THREE.Vector3(dir === 'global-x' ? 1 : 0, dir === 'global-y' ? 1 : 0, dir === 'global-z' ? 1 : 0);
          else axis = localAxes(l[0], l[1])[dir === 'local-y' ? 'y' : 'z'];
          const f = axis.multiplyScalar(Math.sign(p.w));
          const n = Math.max(3, Math.round(l[0].distanceTo(l[1]) / (s * 2)));
          for (let i = 0; i <= n; i++) arrow(new THREE.Vector3().lerpVectors(l[0], l[1], i / n), f, s * 1.5);
        });
      }
    });

    render();
  }

  /* Results: deformed shape (elem-deformed over the dashed undeformed geometry) and reaction arrows. */
  let lastDeformationScale = 0;
  function drawResults() {
    clearGroup(resultsGroup);
    lastDeformationScale = 0;
    if (!results || !draw) { render(); return; }
    const C = (n) => new THREE.Color(token(n));
    const nodes = results.nodes || [];
    const disp = results.displacements || [];
    const s = draw.extent * 0.03;

    if (resultOptions.deformed && disp.length) {
      let max = 0;
      for (let i = 0; i < nodes.length; i++) max = Math.max(max, Math.hypot(disp[i * 3] || 0, disp[i * 3 + 1] || 0, disp[i * 3 + 2] || 0));
      const k = max > 0 ? ((draw.extent * 0.05) / max) * (resultOptions.scale || 1) : 0;
      lastDeformationScale = k;
      const at = (n) => new THREE.Vector3(nodes[n][0] + k * (disp[n * 3] || 0), nodes[n][1] + k * (disp[n * 3 + 1] || 0), nodes[n][2] + k * (disp[n * 3 + 2] || 0));
      const pos = [];
      (results.elements || []).forEach((el) => {
        const edges = el.length === 2 ? [[el[0], el[1]]] : el.map((n, i) => [n, el[(i + 1) % el.length]]);
        edges.forEach(([a, b]) => { if (nodes[a] && nodes[b]) pos.push(...at(a).toArray(), ...at(b).toArray()); });
      });
      if (pos.length) resultsGroup.add(new LineSegments2(new LineSegmentsGeometry().setPositions(pos), lineMat(C('elem-deformed'), 2.5)));
    }

    if (resultOptions.reactions && results.reactions && results.reactions.length) {
      const color = C('elem-reaction');
      const forces = [];
      results.reactions.forEach((r, n) => {
        if (!r || !nodes[n]) return;
        const f = new THREE.Vector3(r[0] || 0, r[1] || 0, r[2] || 0);
        if (f.length() > 1e-6) forces.push([n, f]);
      });
      const maxF = forces.reduce((m, [, f]) => Math.max(m, f.length()), 0);
      forces.forEach(([n, f]) => {
        const tip = new THREE.Vector3(...nodes[n]);
        const len = s * (1.5 + 2.5 * (f.length() / maxF));
        const d = f.clone().normalize();
        const tail = tip.clone().sub(d.clone().multiplyScalar(len + s * 0.6));
        resultsGroup.add(new THREE.ArrowHelper(d, tail, len, color, len * 0.3, len * 0.18));
        resultsGroup.add(label(f.length().toFixed(2) + ' kN', tail, 'var(--elem-reaction)'));
      });
    }
    render();
  }

  function refresh() { rebuild(); drawResults(); }

  function fit() {
    if (!draw) return;
    const c = draw.box.getCenter(new THREE.Vector3());
    const r = draw.extent * 0.5;
    const dist = r / Math.sin((camera.fov * Math.PI) / 360) * 1.1;
    const dir = new THREE.Vector3(0.6, -1, 0.55).normalize();
    camera.near = dist / 1000;
    camera.far = dist * 100;
    camera.position.copy(c).add(dir.multiplyScalar(dist));
    camera.updateProjectionMatrix();
    controls.target.copy(c);
    controls.update();
    render();
  }

  function render() {
    renderer.render(scene, camera);
    labels.render(scene, camera);
  }

  function resize() {
    const w = element.clientWidth || 1, h = element.clientHeight || 1;
    renderer.setSize(w, h);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    lineMaterials.forEach((m) => m.resolution.set(w, h));
    render();
  }

  /* ---------- screen-space picking ---------- */
  function screenOf(v, rect) {
    const p = v.clone().project(camera);
    return { x: (p.x + 1) / 2 * rect.width, y: (1 - p.y) / 2 * rect.height, behind: p.z > 1 };
  }
  function mouseOf(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top, rect };
  }

  function pickPoint(ev) {
    if (!draw) return null;
    const m = mouseOf(ev);
    let best = null, bestD = PICK_PX;
    draw.points.forEach((v, id) => {
      const p = screenOf(v, m.rect);
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (!p.behind && d < bestD) { bestD = d; best = id; }
    });
    return best;
  }

  function pickLine(ev) {
    if (!draw) return null;
    const m = mouseOf(ev);
    let best = null, bestD = PICK_PX;
    draw.lines.forEach(([a, b], id) => {
      const p = screenOf(a, m.rect), q = screenOf(b, m.rect);
      if (p.behind || q.behind) return;
      const dx = q.x - p.x, dy = q.y - p.y, len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((m.x - p.x) * dx + (m.y - p.y) * dy) / len2));
      const d = Math.hypot(p.x + t * dx - m.x, p.y + t * dy - m.y);
      if (d < bestD) { bestD = d; best = id; }
    });
    return best;
  }

  function pickPolygon(ev) {
    if (!draw) return null;
    const m = mouseOf(ev);
    let best = null;
    draw.polygons.forEach((ring, id) => {
      const scr = ring.map((v) => screenOf(v, m.rect));
      if (scr.some((p) => p.behind)) return;
      if (pointInPolygon(m, scr)) best = id;
    });
    return best;
  }

  // Nearest point, then nearest line, then a polygon under the cursor
  function pick(ev) {
    const p = pickPoint(ev);
    if (p !== null) return 'point-' + p;
    const l = pickLine(ev);
    if (l !== null) return 'line-' + l;
    const g = pickPolygon(ev);
    return g !== null ? 'polygon-' + g : null;
  }

  function pickOfKind(ev, kind) {
    if (kind === 'point') return pickPoint(ev);
    if (kind === 'polygon') return pickPolygon(ev);
    return pickLine(ev);
  }

  // Ids of `kind` the screen rectangle touches
  function boxSelect(r, kind, rect) {
    const out = [];
    if (kind === 'point') draw.points.forEach((v, id) => { const p = screenOf(v, rect); if (!p.behind && inRect(p, r)) out.push(id); });
    else if (kind === 'line') draw.lines.forEach(([a, b], id) => {
      const p = screenOf(a, rect), q = screenOf(b, rect);
      if (!p.behind && !q.behind && segTouchesRect(p, q, r)) out.push(id);
    });
    else draw.polygons.forEach((ring, id) => {
      const scr = ring.map((v) => screenOf(v, rect));
      if (scr.some((p) => p.behind)) return;
      const touches = scr.some((p) => inRect(p, r)) ||
        scr.some((p, i) => segTouchesRect(p, scr[(i + 1) % scr.length], r)) ||
        pointInPolygon({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }, scr);
      if (touches) out.push(id);
    });
    return out;
  }

  /* ---------- work plane ---------- */
  const raycaster = new THREE.Raycaster();
  function planeNormal() {
    return state.workPlane === 'XY' ? new THREE.Vector3(0, 0, 1) : state.workPlane === 'YZ' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  }
  // Where the cursor ray meets the work plane, or the plane parallel to it through `through`
  function planeHit(ev, through) {
    const m = mouseOf(ev);
    const ndc = new THREE.Vector2((m.x / m.rect.width) * 2 - 1, -(m.y / m.rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const normal = planeNormal();
    const plane = new THREE.Plane(normal, through ? -normal.dot(through) : -state.workPlaneOffset);
    const hit = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, hit) ? hit : null;
  }
  function gridOrdinates() {
    const out = { x: [], y: [], z: [] };
    (state.model.gridLines || []).forEach((e) => ['x', 'y', 'z'].forEach((a) => ((e.params || {})[a] || []).forEach((g) => { if (typeof g.ordinate === 'number') out[a].push(g.ordinate); })));
    return out;
  }
  // Snap the in-plane coordinates to grid-line ordinates (within 2% of the model size), else to the snap step
  function snap(v) {
    const fixed = state.workPlane === 'XY' ? 'z' : state.workPlane === 'YZ' ? 'x' : 'y';
    const ords = gridOrdinates();
    const tol = (draw ? draw.extent : 10) * 0.02;
    ['x', 'y', 'z'].forEach((a) => {
      if (a === fixed) return;
      let near = null;
      ords[a].forEach((o) => { if (Math.abs(o - v[a]) <= tol && (near === null || Math.abs(o - v[a]) < Math.abs(near - v[a]))) near = o; });
      if (near !== null) v[a] = near;
      else if (state.snap > 0) v[a] = Math.round(v[a] / state.snap) * state.snap;
    });
    return [clean(v.x), clean(v.y), clean(v.z)];
  }

  function drawPreview(to) {
    clearGroup(previewGroup);
    if (state.lineStart !== null && to && draw && draw.points.has(state.lineStart)) {
      const a = draw.points.get(state.lineStart);
      const seg = new LineSegments2(new LineSegmentsGeometry().setPositions([...a.toArray(), ...to.toArray()]), lineMat(new THREE.Color(token('elem-selected')), 2, true));
      seg.computeLineDistances();
      previewGroup.add(seg);
    }
    render();
  }

  /* ---------- pointer handling ---------- */
  let down = null;   // { x, y, button, boxing, dragId }

  // Capture phase, so OrbitControls never sees a box drag or a point drag
  const onDownCapture = (ev) => {
    down = { x: ev.clientX, y: ev.clientY, button: ev.button, boxing: false, dragId: null };
    if (ev.button !== 0) return;
    if (state.mode === 'assign') {
      down.boxing = true;
      controls.enabled = false;
    } else if (state.mode === 'edit') {
      const id = pickPoint(ev);
      if (id !== null) { down.dragId = id; controls.enabled = false; }
    }
  };

  const onMove = (ev) => {
    if (down && down.boxing) {
      const m = mouseOf(ev);
      const x0 = down.x - m.rect.left, y0 = down.y - m.rect.top;
      if (Math.hypot(m.x - x0, m.y - y0) > DRAG_PX) {
        const removing = m.x < x0;
        Object.assign(box.style, {
          display: 'block', left: Math.min(x0, m.x) + 'px', top: Math.min(y0, m.y) + 'px',
          width: Math.abs(m.x - x0) + 'px', height: Math.abs(m.y - y0) + 'px', borderStyle: removing ? 'dashed' : 'solid',
        });
      }
      return;
    }
    if (down && down.dragId !== null) {
      if (Math.hypot(ev.clientX - down.x, ev.clientY - down.y) <= DRAG_PX && !state.dragPoint) return;
      const origin = entries(state.model.points).find(([id]) => id === down.dragId);
      if (!origin) return;
      const hit = planeHit(ev, new THREE.Vector3(...origin[1]));
      if (!hit) return;
      const p = snap(hit);
      state.dragPoint = { id: down.dragId, pos: new THREE.Vector3(p[0], p[1], p[2]) };
      rebuild();
      return;
    }
    if (ev.buttons) return;
    const id = state.mode === 'assign' ? (() => { const k = pickOfKind(ev, state.assignKind); return k === null ? null : state.assignKind + '-' + k; })() : pick(ev);
    renderer.domElement.style.cursor = state.mode === 'edit' ? (id && id.startsWith('point-') ? 'move' : 'crosshair') : id ? 'pointer' : 'default';
    if (id !== state.hovered) { state.hovered = id; rebuild(); onHover(id); }
    if (state.mode === 'edit' && state.lineStart !== null) {
      const pid = pickPoint(ev);
      const hit = pid !== null ? draw.points.get(pid) : planeHit(ev);
      drawPreview(hit && (pid !== null ? hit : new THREE.Vector3(...snap(hit))));
    }
  };

  const onUp = (ev) => {
    if (!down) return;
    const d = down;
    down = null;
    controls.enabled = true;
    const moved = Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > DRAG_PX;

    if (d.button === 2) {
      if (moved) return; // that was a pan
      if (state.mode === 'assign') { onModeExit(); return; }
      if (state.mode === 'edit') {
        if (state.lineStart !== null) { state.lineStart = null; drawPreview(null); rebuild(); return; }
        const pid = pickPoint(ev);
        if (pid !== null) { onEdit({ type: 'delete-point', id: pid }); return; }
        const lid = pickLine(ev);
        if (lid !== null) onEdit({ type: 'delete-line', id: lid });
      }
      return;
    }
    if (d.button !== 0) return;

    if (state.mode === 'assign') {
      box.style.display = 'none';
      if (moved) {
        const m = mouseOf(ev);
        const x0 = d.x - m.rect.left, y0 = d.y - m.rect.top;
        const r = { x0: Math.min(x0, m.x), y0: Math.min(y0, m.y), x1: Math.max(x0, m.x), y1: Math.max(y0, m.y) };
        const ids = boxSelect(r, state.assignKind, m.rect);
        if (ids.length) onAssign(ids, m.x >= x0);
      } else {
        const id = pickOfKind(ev, state.assignKind);
        if (id !== null) onAssign([id], !selectedGeometry()[state.assignKind].has(id));
      }
      return;
    }

    if (state.mode === 'edit') {
      if (d.dragId !== null && state.dragPoint) {
        const { id, pos } = state.dragPoint;
        state.dragPoint = null;
        onEdit({ type: 'move-point', id, xyz: [clean(pos.x), clean(pos.y), clean(pos.z)] });
        return;
      }
      if (moved) return; // orbit
      const pid = pickPoint(ev);
      if (state.lineStart !== null) {
        const from = state.lineStart;
        state.lineStart = null;
        drawPreview(null);
        if (pid === from) { rebuild(); return; }
        if (pid !== null) { onEdit({ type: 'add-line', from, to: pid }); return; }
        const hit = planeHit(ev);
        if (hit) onEdit({ type: 'add-line', from, xyz: snap(hit) });
        else rebuild();
        return;
      }
      if (pid !== null) {
        state.lineStart = pid;
        rebuild();
        onSelect('point-' + pid);
        return;
      }
      const hit = planeHit(ev);
      if (hit) onEdit({ type: 'add-point', xyz: snap(hit) });
      return;
    }

    if (moved) return; // that was an orbit
    const id = pick(ev);
    state.selected = id;
    rebuild();
    onSelect(id);
  };

  const onLeave = () => {
    if (state.hovered) { state.hovered = null; rebuild(); onHover(null); }
  };
  const onDbl = () => { if (state.mode === 'view') fit(); };
  const onKey = (ev) => {
    if (ev.key !== 'Escape') return;
    if (state.mode === 'edit' && state.lineStart !== null) { state.lineStart = null; drawPreview(null); rebuild(); }
    else if (state.mode === 'assign') onModeExit();
  };
  renderer.domElement.addEventListener('pointerdown', onDownCapture, true);
  renderer.domElement.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointerleave', onLeave);
  renderer.domElement.addEventListener('dblclick', onDbl);
  window.addEventListener('keydown', onKey);

  const ro = new ResizeObserver(resize);
  ro.observe(element);
  const themeWatch = new MutationObserver(refresh);
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', refresh);

  resize();
  rebuild();
  fit();

  return {
    three: { THREE, scene, camera, renderer, controls, root },
    select(id) { if (id !== state.selected) { state.selected = id || null; rebuild(); } },
    setLoadSelection(name) { state.loadSelection = name || null; rebuild(); },
    setModel(next) { state.model = next; state.dragPoint = null; refresh(); },
    setMode(mode, opts = {}) {
      state.mode = mode || 'view';
      if (opts.kind) state.assignKind = opts.kind;
      state.lineStart = null;
      state.dragPoint = null;
      box.style.display = 'none';
      clearGroup(previewGroup);
      renderer.domElement.style.cursor = state.mode === 'edit' ? 'crosshair' : 'default';
      rebuild();
    },
    setResults(next, opts) {
      results = next || null;
      if (opts) resultOptions = Object.assign({}, resultOptions, opts);
      refresh();
    },
    setDisplay(opts) { state.display = Object.assign({}, state.display, opts); rebuild(); },
    setWorkPlane(plane, offset) { state.workPlane = plane || 'XZ'; state.workPlaneOffset = offset || 0; },
    // Scale applied to the drawn displacements (0 when none are drawn)
    deformationScale() { return lastDeformationScale; },
    fit,
    render,
    dispose() {
      ro.disconnect();
      themeWatch.disconnect();
      media.removeEventListener('change', refresh);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
      controls.dispose();
      clearGroup(root);
      clearGroup(resultsGroup);
      clearGroup(previewGroup);
      renderer.dispose();
      element.textContent = '';
    },
  };
}

if (typeof window !== 'undefined') window.AwatifViewer = { createViewer };
