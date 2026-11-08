/* Awatif viewer: the default, required three.js viewport for structural viewer apps.
 *
 * ES module. Needs an import map that maps "three" and "three/addons/" (the starter pins three@0.183.2):
 *   <script type="importmap">{ "imports": {
 *     "three": "https://cdn.jsdelivr.net/npm/three@0.183.2/build/three.module.js",
 *     "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.183.2/examples/jsm/" } }</script>
 *
 * Exposes window.AwatifViewer = { createViewer } and exports createViewer.
 *
 *   const viewer = AwatifViewer.createViewer(element, model, { onSelect: (id) => ..., onHover: (id) => ... });
 *   viewer.select('line-2' | 'supports-0' | null);   // highlight, same ids as AwatifUI.buildTree
 *   viewer.setLoadSelection('Dead' | 'ULS' | null);  // which loads to draw (null: all)
 *   viewer.setModel(model);                          // redraw after the model changes
 *   viewer.fit();                                    // frame the model
 *   viewer.dispose();
 *
 * Interaction: left-drag orbits, right-drag pans, wheel zooms, click a point or line to select it,
 * click empty space to clear, double-click to frame the model. Z is up. Colors come from the elem-*
 * and viewport tokens and follow data-theme on <html>.
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

function entries(ided) {
  if (!ided) return [];
  if (ided instanceof Map) return [...ided.entries()];
  const pairs = ided.length > 0 && ided.every((e) => Array.isArray(e) && e.length === 2 && typeof e[0] === 'number' && Array.isArray(e[1]));
  return pairs ? ided.slice() : ided.map((e, i) => [i + 1, e]);
}

function geometryKind(entry) {
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

export function createViewer(element, model, options = {}) {
  const onSelect = options.onSelect || (() => {});
  const onHover = options.onHover || (() => {});

  element.textContent = '';
  if (getComputedStyle(element).position === 'static') element.style.position = 'relative';

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.domElement.style.display = 'block';
  element.appendChild(renderer.domElement);

  const labels = new CSS2DRenderer();
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  element.appendChild(labels.domElement);

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

  let state = { model, loadSelection: null, selected: null, hovered: null };
  let draw = null; // { points: Map<id, Vector3>, lines: Map<id, [a,b]>, extent, objects }
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
      if (entry) (entry.geometry || []).forEach((g) => ids[geometryKind(entry)].add(g));
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

  function rebuild() {
    clearGroup(root);
    const mdl = state.model;
    const pts = new Map(entries(mdl.points).map(([id, p]) => [id, new THREE.Vector3(p[0], p[1], p[2] || 0)]));
    const lines = new Map();
    entries(mdl.lines).forEach(([id, l]) => { if (pts.has(l[0]) && pts.has(l[1])) lines.set(id, [pts.get(l[0]), pts.get(l[1])]); });

    const box = new THREE.Box3();
    pts.forEach((p) => box.expandByPoint(p));
    if (box.isEmpty()) box.set(new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, 1, 1));
    const extent = Math.max(box.getSize(new THREE.Vector3()).length(), 1);
    const s = extent * 0.03; // symbol size
    draw = { points: pts, lines, box, extent };

    const sel = selectedGeometry();
    const C = (n) => new THREE.Color(token(n));
    renderer.setClearColor(C('viewport'));

    // Ground grid on the XY workplane
    const span = Math.ceil(extent * 1.5);
    const grid = new THREE.GridHelper(span * 2, span * 2, C('viewport-grid'), C('viewport-grid'));
    grid.rotation.x = Math.PI / 2;
    grid.position.set(Math.round(box.getCenter(new THREE.Vector3()).x), Math.round(box.getCenter(new THREE.Vector3()).y), box.min.z);
    root.add(grid);

    // Grid lines (dash-dot) with bubbles
    (mdl.gridLines || []).forEach((entry) => {
      const p = entry.params || {};
      const pad = s * 3;
      const add = (from, to, label, at) => {
        const g = new LineSegmentsGeometry().setPositions([...from.toArray(), ...to.toArray()]);
        const seg = new LineSegments2(g, lineMat(C('elem-gridline'), 1, true));
        seg.computeLineDistances();
        root.add(seg);
        const div = document.createElement('div');
        div.className = 'data';
        div.textContent = label;
        Object.assign(div.style, { color: 'var(--ink)', background: 'var(--surface-raised)', border: '1px solid var(--elem-gridline)', borderRadius: 'var(--radius-pill)', padding: '0 var(--space-2)' });
        const o = new CSS2DObject(div);
        o.position.copy(at);
        root.add(o);
      };
      const z0 = box.min.z;
      (p.x || []).filter((g) => g.visible !== false).forEach((g) => {
        const a = new THREE.Vector3(g.ordinate, box.min.y - pad, z0), b = new THREE.Vector3(g.ordinate, box.max.y + pad, z0);
        add(a, b, g.id, g.bubble === 'start' ? a : b);
      });
      (p.y || []).filter((g) => g.visible !== false).forEach((g) => {
        const a = new THREE.Vector3(box.min.x - pad, g.ordinate, z0), b = new THREE.Vector3(box.max.x + pad, g.ordinate, z0);
        add(a, b, g.id, g.bubble === 'start' ? a : b);
      });
    });

    // Polygons: outline + 20% face
    entries(mdl.polygons).forEach(([id, ids]) => {
      const ring = ids.map((n) => pts.get(n)).filter(Boolean);
      if (ring.length < 3) return;
      const on = sel.polygon.has(id);
      const color = C(on ? 'elem-selected' : 'elem-polygon');
      const shapeGeom = new THREE.BufferGeometry().setFromPoints(ring);
      const idx = [];
      for (let i = 1; i < ring.length - 1; i++) idx.push(0, i, i + 1);
      shapeGeom.setIndex(idx);
      root.add(new THREE.Mesh(shapeGeom, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })));
      const lg = new LineGeometry().setPositions([...ring, ring[0]].flatMap((v) => v.toArray()));
      root.add(new Line2(lg, lineMat(color, on ? 3 : 1.5)));
    });

    // Lines: solid, heaviest
    lines.forEach(([a, b], id) => {
      const on = sel.line.has(id), hov = state.hovered === 'line-' + id;
      const g = new LineGeometry().setPositions([...a.toArray(), ...b.toArray()]);
      root.add(new Line2(g, lineMat(C(on ? 'elem-selected' : hov ? 'elem-hover' : 'elem-line'), on ? 5 : 3)));
    });

    // Mesh: dots at division nodes
    (mdl.mesh || []).forEach((entry) => {
      if (geometryKind(entry) !== 'line') return;
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
      const on = sel.point.has(id), hov = state.hovered === 'point-' + id;
      const m = new THREE.Mesh(dot, new THREE.MeshBasicMaterial({ color: C(on ? 'elem-selected' : hov ? 'elem-hover' : 'elem-point') }));
      m.scale.setScalar(on || hov ? 1.5 : 1);
      m.position.copy(p);
      root.add(m);
    });

    // Supports: fixed = block, pinned = cone, roller = cone on a plate
    (mdl.supports || []).forEach((entry) => {
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
    (mdl.loads || []).filter(loadVisible).forEach((entry) => {
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

  // Screen-space picking: nearest point, then nearest line, within PICK_PX
  function pick(ev) {
    if (!draw) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
    const toScreen = (v) => {
      const p = v.clone().project(camera);
      return { x: (p.x + 1) / 2 * rect.width, y: (1 - p.y) / 2 * rect.height, behind: p.z > 1 };
    };
    let best = null, bestD = PICK_PX;
    draw.points.forEach((v, id) => {
      const p = toScreen(v);
      const d = Math.hypot(p.x - mx, p.y - my);
      if (!p.behind && d < bestD) { bestD = d; best = 'point-' + id; }
    });
    if (best) return best;
    bestD = PICK_PX;
    draw.lines.forEach(([a, b], id) => {
      const p = toScreen(a), q = toScreen(b);
      if (p.behind || q.behind) return;
      const dx = q.x - p.x, dy = q.y - p.y, len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((mx - p.x) * dx + (my - p.y) * dy) / len2));
      const d = Math.hypot(p.x + t * dx - mx, p.y + t * dy - my);
      if (d < bestD) { bestD = d; best = 'line-' + id; }
    });
    return best;
  }

  let down = null;
  const onDown = (ev) => { down = { x: ev.clientX, y: ev.clientY, button: ev.button }; };
  const onUp = (ev) => {
    if (!down || down.button !== 0) return;
    const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 4;
    down = null;
    if (moved) return; // that was an orbit
    const id = pick(ev);
    state.selected = id;
    rebuild();
    onSelect(id);
  };
  const onMove = (ev) => {
    if (ev.buttons) return;
    const id = pick(ev);
    renderer.domElement.style.cursor = id ? 'pointer' : 'default';
    if (id !== state.hovered) { state.hovered = id; rebuild(); onHover(id); }
  };
  const onLeave = () => { if (state.hovered) { state.hovered = null; rebuild(); onHover(null); } };
  const onDbl = () => fit();
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerleave', onLeave);
  renderer.domElement.addEventListener('dblclick', onDbl);

  const ro = new ResizeObserver(resize);
  ro.observe(element);
  const themeWatch = new MutationObserver(rebuild);
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', rebuild);

  resize();
  rebuild();
  fit();

  return {
    three: { THREE, scene, camera, renderer, controls, root },
    select(id) { if (id !== state.selected) { state.selected = id || null; rebuild(); } },
    setLoadSelection(name) { state.loadSelection = name || null; rebuild(); },
    setModel(next) { state.model = next; rebuild(); },
    fit,
    render,
    dispose() {
      ro.disconnect();
      themeWatch.disconnect();
      media.removeEventListener('change', rebuild);
      controls.dispose();
      clearGroup(root);
      renderer.dispose();
      element.textContent = '';
    },
  };
}

if (typeof window !== 'undefined') window.AwatifViewer = { createViewer };
