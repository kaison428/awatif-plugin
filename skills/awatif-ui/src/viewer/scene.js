// The viewer's three.js scene, cameras, controls and DOM layers (labels, selection box, tooltip).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

function createRenderer(element) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  element.appendChild(renderer.domElement);
  return renderer;
}

function createLabelLayer(element) {
  const labels = new CSS2DRenderer();
  // zIndex 0 makes a stacking context: CSS2DRenderer's per-label z-index sorting stays below the viewport's panes
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '0' });
  element.appendChild(labels.domElement);
  return labels;
}

// Selection box (assign mode, Shift+drag in view mode): solid when adding (left to right), dashed when removing
function createBox(element) {
  const box = document.createElement('div');
  Object.assign(box.style, { position: 'absolute', display: 'none', pointerEvents: 'none', borderWidth: '1px', borderColor: 'var(--elem-selected)' });
  element.appendChild(box);
  return box;
}

// Hover tooltip: above the labels, below the viewport's panes (zIndex 0, after the labels layer)
function createTip(element) {
  const tip = document.createElement('div');
  tip.className = 'caption data';
  Object.assign(tip.style, {
    position: 'absolute', display: 'none', pointerEvents: 'none', zIndex: '0', whiteSpace: 'pre', color: 'var(--ink)',
    background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-float)', padding: 'var(--space-1) var(--space-2)',
  });
  element.appendChild(tip);
  return tip;
}

function createCameras() {
  const perspective = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
  perspective.up.set(0, 0, 1);
  perspective.position.set(10, -15, 10);
  const ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.01, 10000);
  ortho.up.set(0, 0, 1);
  return { perspective, ortho };
}

function addLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(1, -2, 3);
  scene.add(sun);
}

function addGroup(scene) {
  const g = new THREE.Group();
  scene.add(g);
  return g;
}

// Everything three.js and DOM the viewer draws into, mounted in `element`
export function createScene(element) {
  element.textContent = '';
  if (getComputedStyle(element).position === 'static') element.style.position = 'relative';
  const renderer = createRenderer(element);
  const labels = createLabelLayer(element);
  const box = createBox(element);
  const tip = createTip(element);
  const scene = new THREE.Scene();
  const { perspective, ortho } = createCameras();
  const controls = new OrbitControls(perspective, renderer.domElement);
  controls.enableDamping = false;
  addLights(scene);
  return {
    renderer, labels, box, tip, scene, perspective, ortho, controls,
    camera: perspective,
    orthoHalfHeight: 10,
    savedPerspective: null, // { position, target } to restore when leaving a plane view
    root: addGroup(scene),
    resultsGroup: addGroup(scene),
    previewGroup: addGroup(scene),
    raycaster: new THREE.Raycaster(),
  };
}
