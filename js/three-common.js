import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function makeScene(container, { bg = 0x05060a, camPos = [3, 2.5, 5], grid = true } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
  camera.position.set(...camPos);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  if (grid) {
    const g = new THREE.GridHelper(20, 20, 0x3a4256, 0x22262f);
    scene.add(g);
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(5, 8, 3);
  scene.add(dir);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  return { scene, camera, renderer, controls, resize };
}

export function axisArrow(color, dir, length = 3) {
  return new THREE.ArrowHelper(new THREE.Vector3(...dir).normalize(), new THREE.Vector3(0, 0, 0), length, color, 0.25, 0.15);
}

// IntersectionObserver-driven render loop so off-screen sections don't burn CPU
const loopRegistry = [];
let ticking = false;
function tick() {
  for (const item of loopRegistry) {
    if (item.active) item.fn();
  }
  requestAnimationFrame(tick);
}
export function registerLoop(container, fn) {
  const item = { fn, active: false };
  loopRegistry.push(item);
  const io = new IntersectionObserver((entries) => {
    item.active = entries[0].isIntersecting;
  }, { threshold: 0.05 });
  io.observe(container);
  if (!ticking) { ticking = true; requestAnimationFrame(tick); }
}

export { THREE };
