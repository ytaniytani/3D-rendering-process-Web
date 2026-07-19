import { THREE, makeScene, registerLoop } from "./three-common.js";
import { tabButton } from "./ui.js";

export function initSection3() {
  const canvasHost = document.getElementById("sec3-canvas");
  const controlsHost = document.getElementById("sec3-controls");
  if (!canvasHost) return;

  const { scene, camera, renderer, controls } = makeScene(canvasHost, { camPos: [4, 2.6, 5], grid: false });
  scene.add(new THREE.GridHelper(20, 20, 0x3a4256, 0x22262f));

  scene.children.filter((c) => c.isLight).forEach((l) => scene.remove(l));
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(5, 6, 2);
  scene.add(ambient, sun);

  const items = [];
  function addMesh(geo, color, roughness, metalness, pos) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    scene.add(mesh);
    items.push({ mesh, standard: mat, baseColor: color });
    return mesh;
  }
  addMesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), 0xd94f4f, 0.6, 0.1, [-1.4, 0.6, 0]);
  addMesh(new THREE.SphereGeometry(0.8, 32, 32), 0x4f8fd9, 0.15, 0.9, [1.2, 0.8, -0.5]);
  addMesh(new THREE.ConeGeometry(0.7, 1.4, 24), 0x6fd98f, 0.8, 0.0, [0, 0.7, 1.6]);
  const floor = addMesh(new THREE.CylinderGeometry(3, 3, 0.2, 40), 0x555a63, 0.9, 0.0, [0, -0.1, 0]);

  const normalMat = new THREE.MeshNormalMaterial();
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking });
  const litWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });

  const modes = {
    final: { label: "最終画面 (Final)", apply: () => items.forEach((i) => (i.mesh.material = i.standard)) },
    basecolor: {
      label: "G-Buffer: 材質 (BaseColor)",
      apply: () => items.forEach((i) => (i.mesh.material = new THREE.MeshBasicMaterial({ color: i.baseColor }))),
    },
    normal: { label: "G-Buffer: 法線 (Normal)", apply: () => items.forEach((i) => (i.mesh.material = normalMat)) },
    depth: { label: "G-Buffer: 深度 (Depth)", apply: () => items.forEach((i) => (i.mesh.material = depthMat)) },
    lighting: { label: "ライティングのみ (Lighting)", apply: () => items.forEach((i) => (i.mesh.material = litWhiteMat)) },
  };

  let current = "final";
  const buttons = {};
  function setMode(key) {
    current = key;
    modes[key].apply();
    Object.entries(buttons).forEach(([k, b]) => b.classList.toggle("active", k === key));
  }
  Object.entries(modes).forEach(([key, m]) => {
    const b = tabButton(m.label, () => setMode(key));
    buttons[key] = b;
    controlsHost.appendChild(b);
  });
  setMode("final");

  registerLoop(canvasHost, () => {
    controls.update();
    renderer.render(scene, camera);
  });
}
