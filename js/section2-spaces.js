import { THREE, registerLoop } from "./three-common.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { el, slider, button, overlayText } from "./ui.js";

function dualCanvas(hostId, leftLabel, rightLabel) {
  const host = document.getElementById(hostId);
  host.innerHTML = "";
  const left = el("div", { class: "sub-canvas" }, el("div", { class: "sub-label" }, leftLabel));
  const right = el("div", { class: "sub-canvas" }, el("div", { class: "sub-label" }, rightLabel));
  host.appendChild(left);
  host.appendChild(right);
  return { host, left, right };
}

function renderer(container) {
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(r.domElement);
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    r.setSize(w, h);
  }
  new ResizeObserver(resize).observe(container);
  resize();
  return r;
}

function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a3a }));
  trunk.position.y = 0.3;
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 10), new THREE.MeshStandardMaterial({ color: 0x4caf6e }));
  leaves.position.y = 1.15;
  g.add(trunk, leaves);
  return g;
}

function makeRock() {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: 0x8d8f95, flatShading: true }));
  m.position.y = 0.4;
  return m;
}

function baseLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const d = new THREE.DirectionalLight(0xffffff, 1.1);
  d.position.set(4, 6, 3);
  scene.add(d);
}

// ---------- ② a: local -> world ----------
export function initSection2a() {
  const { left, right } = dualCanvas("sec2a-canvas", "プレイヤー視点", "神の視点（ワールド原点）");
  const controlsHost = document.getElementById("sec2a-controls");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.add(new THREE.GridHelper(20, 20, 0x3a4256, 0x22262f));
  baseLights(scene);
  const originMarker = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  scene.add(originMarker);

  const tree = makeTree();
  const rock = makeRock();
  scene.add(tree, rock);

  const playerCam = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  playerCam.position.set(0, 3, 7);
  playerCam.lookAt(0, 0.5, 0);

  const godCam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  godCam.position.set(6, 5, 6);

  const rL = renderer(left);
  const rR = renderer(right);
  const godControls = new OrbitControls(godCam, rR.domElement);
  godControls.target.set(0, 0.5, 0);

  const status = overlayText(document.getElementById("sec2a-canvas"));

  const state = {
    tree: { x: 0, z: 0, ry: 0, s: 1 },
    rock: { x: 0, z: 0, ry: 0, s: 1 },
  };
  function apply() {
    tree.position.set(state.tree.x, 0, state.tree.z);
    tree.rotation.y = state.tree.ry;
    tree.scale.setScalar(state.tree.s);
    rock.position.set(state.rock.x, 0, state.rock.z);
    rock.rotation.y = state.rock.ry;
    rock.scale.setScalar(state.rock.s);
    const moved = state.tree.x || state.tree.z || state.rock.x || state.rock.z;
    status.show(moved
      ? "ワールド行列が適用され、各モデルが世界共通の座標を持ちました"
      : "木と岩はまだローカル原点(0,0,0)に重なっています");
  }
  apply();

  function objControls(name, obj, defaults) {
    const wrap = el("div", { class: "vgroup" }, [el("div", { class: "vgroup-title" }, name)]);
    wrap.appendChild(slider({ label: "Position X", min: -4, max: 4, step: 0.1, value: defaults.x, onInput: (v) => { obj.x = v; apply(); } }));
    wrap.appendChild(slider({ label: "Position Z", min: -4, max: 4, step: 0.1, value: defaults.z, onInput: (v) => { obj.z = v; apply(); } }));
    wrap.appendChild(slider({ label: "Rotation Y", min: -180, max: 180, step: 5, value: 0, format: (v) => `${v}°`, onInput: (v) => { obj.ry = (v * Math.PI) / 180; apply(); } }));
    wrap.appendChild(slider({ label: "Scale", min: 0.3, max: 2, step: 0.05, value: 1, onInput: (v) => { obj.s = v; apply(); } }));
    return wrap;
  }
  controlsHost.appendChild(objControls("木 (Tree)", state.tree, state.tree));
  controlsHost.appendChild(objControls("岩 (Rock)", state.rock, state.rock));

  registerLoop(document.getElementById("sec2a-canvas"), () => {
    godControls.update();
    const wl = left.clientWidth, hl = left.clientHeight;
    if (wl && hl) { playerCam.aspect = wl / hl; playerCam.updateProjectionMatrix(); rL.render(scene, playerCam); }
    const wr = right.clientWidth, hr = right.clientHeight;
    if (wr && hr) { godCam.aspect = wr / hr; godCam.updateProjectionMatrix(); rR.render(scene, godCam); }
  });
}

// ---------- ② b: world -> view ----------
export function initSection2b() {
  const { left, right } = dualCanvas("sec2b-canvas", "プレイヤー視点（ビュー空間）", "神の視点（ワールド空間）");
  const controlsHost = document.getElementById("sec2b-controls");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.add(new THREE.GridHelper(30, 30, 0x3a4256, 0x22262f));
  baseLights(scene);

  const tree = makeTree(); tree.position.set(4, 0, -3); scene.add(tree);
  const rock = makeRock(); rock.position.set(-3, 0, 2); scene.add(rock);

  const playerCam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  playerCam.position.set(0, 1.2, 6);

  const godCam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  godCam.position.set(10, 9, 12);

  const rL = renderer(left);
  const rR = renderer(right);
  const godControls = new OrbitControls(godCam, rR.domElement);
  godControls.target.set(0, 0, 0);

  const camHelper = new THREE.CameraHelper(playerCam);
  scene.add(camHelper);
  const forwardArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), playerCam.position, 3, 0xffcf5f);
  scene.add(forwardArrow);

  let yaw = 0; // camera default forward is -Z at yaw=0
  const move = { f: 0, r: 0, turn: 0 };

  const readout = el("pre", { style: "font-size:0.72rem;color:var(--muted);margin:0;max-width:260px;white-space:pre-wrap;" }, "");
  controlsHost.appendChild(el("div", { class: "vgroup" }, [el("div", { class: "vgroup-title" }, "カメラ移動"), buildDpad(move), readout]));

  function buildDpad(move) {
    const mk = (label, downFn) => {
      const b = button(label, () => {});
      b.addEventListener("pointerdown", downFn);
      b.addEventListener("pointerup", () => { move.f = 0; move.r = 0; move.turn = 0; });
      b.addEventListener("pointerleave", () => { move.f = 0; move.r = 0; move.turn = 0; });
      return b;
    };
    const grid = el("div", { style: "display:grid;grid-template-columns:repeat(3,42px);gap:4px;" });
    grid.append(
      mk("↺", () => (move.turn = 1)), mk("▲", () => (move.f = 1)), mk("↻", () => (move.turn = -1)),
      mk("◀", () => (move.r = -1)), mk("●", () => {}), mk("▶", () => (move.r = 1)),
      el("div", {}), mk("▼", () => (move.f = -1)), el("div", {})
    );
    return grid;
  }

  window.addEventListener("keydown", (e) => {
    if (!document.getElementById("sec2b-app").matches(":hover")) return;
    if (e.key === "ArrowUp") move.f = 1;
    if (e.key === "ArrowDown") move.f = -1;
    if (e.key === "ArrowLeft") move.turn = 1;
    if (e.key === "ArrowRight") move.turn = -1;
  });
  window.addEventListener("keyup", (e) => {
    if (["ArrowUp", "ArrowDown"].includes(e.key)) move.f = 0;
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) move.turn = 0;
  });

  registerLoop(document.getElementById("sec2b-canvas"), () => {
    yaw += move.turn * 0.02;
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const strafeDir = new THREE.Vector3(-forward.z, 0, forward.x);
    playerCam.position.addScaledVector(forward, move.f * 0.06);
    playerCam.position.addScaledVector(strafeDir, move.r * 0.06);
    playerCam.rotation.set(0, yaw, 0);
    camHelper.update();
    forwardArrow.position.copy(playerCam.position);
    forwardArrow.setDirection(forward);

    const treeView = tree.position.clone().applyMatrix4(playerCam.matrixWorldInverse);
    const rockView = rock.position.clone().applyMatrix4(playerCam.matrixWorldInverse);
    readout.textContent =
      `[ビュー空間座標: カメラ原点=(0,0,0)基準]\n` +
      `木  : x=${treeView.x.toFixed(2)} y=${treeView.y.toFixed(2)} z=${treeView.z.toFixed(2)}\n` +
      `岩  : x=${rockView.x.toFixed(2)} y=${rockView.y.toFixed(2)} z=${rockView.z.toFixed(2)}\n` +
      `(zが負に大きいほど前方、正なら後方)`;

    godControls.update();
    const wl = left.clientWidth, hl = left.clientHeight;
    if (wl && hl) { playerCam.aspect = wl / hl; playerCam.updateProjectionMatrix(); rL.render(scene, playerCam); }
    const wr = right.clientWidth, hr = right.clientHeight;
    if (wr && hr) { godCam.aspect = wr / hr; godCam.updateProjectionMatrix(); rR.render(scene, godCam); }
  });
}

// ---------- ② c: view -> clip (frustum culling) ----------
export function initSection2c() {
  const { left, right } = dualCanvas("sec2c-canvas", "プレイヤー視点（クリップ後）", "神の視点（視錐台）");
  const controlsHost = document.getElementById("sec2c-controls");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.add(new THREE.GridHelper(60, 30, 0x3a4256, 0x22262f));
  baseLights(scene);

  const playerCam = new THREE.PerspectiveCamera(50, 1, 1, 30);
  playerCam.position.set(0, 2, 8);
  playerCam.lookAt(0, 0, -10);

  const godCam = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
  godCam.position.set(20, 16, 24);

  const rL = renderer(left);
  const rR = renderer(right);
  const godControls = new OrbitControls(godCam, rR.domElement);
  godControls.target.set(0, 0, -8);

  const frustumHelper = new THREE.CameraHelper(playerCam);
  scene.add(frustumHelper);

  // scattered objects: some near, some far mountains/grass beyond typical far plane
  const objs = [];
  const rng = mulberry32(7);
  for (let i = 0; i < 60; i++) {
    const z = -rng() * 40 - 1;
    const x = (rng() - 0.5) * 30;
    const y = rng() * 1.5;
    const size = z < -25 ? 1.4 : 0.25;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 8),
      new THREE.MeshStandardMaterial({ color: z < -25 ? 0x6f8fae : 0x6fae7f })
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
    objs.push(mesh);
  }

  const stats = el("div", { style: "font-size:0.78rem;color:var(--muted);" }, "");
  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();

  function updateCulling() {
    projScreenMatrix.multiplyMatrices(playerCam.projectionMatrix, playerCam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);
    let culled = 0;
    for (const m of objs) {
      const inside = frustum.intersectsObject(m);
      m.visible = true;
      m.material.color.set(inside ? (m.userData.baseColor || m.material.color.getHex()) : 0xff5f5f);
      m.material.opacity = inside ? 1 : 0.35;
      m.material.transparent = !inside;
      if (!inside) culled++;
    }
    stats.textContent = `視錐台の外（赤くハイライト＝クリップ対象）: ${culled} / ${objs.length} 個`;
  }
  objs.forEach((m) => (m.userData.baseColor = m.material.color.getHex()));

  controlsHost.appendChild(slider({ label: "画角 FOV", min: 20, max: 110, step: 1, value: 50, format: (v) => `${v}°`, onInput: (v) => { playerCam.fov = v; playerCam.updateProjectionMatrix(); updateCulling(); } }));
  controlsHost.appendChild(slider({ label: "Near", min: 0.5, max: 10, step: 0.1, value: 1, onInput: (v) => { playerCam.near = v; playerCam.updateProjectionMatrix(); updateCulling(); } }));
  controlsHost.appendChild(slider({ label: "Far", min: 5, max: 60, step: 1, value: 30, onInput: (v) => { playerCam.far = v; playerCam.updateProjectionMatrix(); updateCulling(); } }));
  controlsHost.appendChild(stats);

  updateCulling();

  registerLoop(document.getElementById("sec2c-canvas"), () => {
    frustumHelper.update();
    godControls.update();
    const wl = left.clientWidth, hl = left.clientHeight;
    if (wl && hl) { playerCam.aspect = wl / hl; playerCam.updateProjectionMatrix(); rL.render(scene, playerCam); }
    const wr = right.clientWidth, hr = right.clientHeight;
    if (wr && hr) { godCam.aspect = wr / hr; godCam.updateProjectionMatrix(); rR.render(scene, godCam); }
  });
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- ② d: clip -> screen (rasterize onto pixel grid) ----------
export function initSection2d() {
  const host = document.getElementById("sec2d-canvas");
  const controlsHost = document.getElementById("sec2d-controls");
  host.innerHTML = "";
  const canvas = el("canvas", {});
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const COLS = 32, ROWS = 18;
  let tri = [
    { x: 6, y: 3 },
    { x: 24, y: 5 },
    { x: 13, y: 14 },
  ];
  let revealRow = -1;
  let playing = false;

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    canvas.width = w; canvas.height = h;
    draw();
  }
  new ResizeObserver(resize).observe(host);

  function cellSize() { return { cw: canvas.width / COLS, ch: canvas.height / ROWS }; }

  function pointInTri(px, py) {
    const [a, b, c] = tri;
    const sign = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = sign({ x: px, y: py }, a, b);
    const d2 = sign({ x: px, y: py }, b, c);
    const d3 = sign({ x: px, y: py }, c, a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }

  function draw() {
    const { cw, ch } = cellSize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = "#22262f";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * ch); ctx.lineTo(canvas.width, y * ch); ctx.stroke(); }

    // filled pixels (revealed rows only when playing, else all)
    for (let gy = 0; gy < ROWS; gy++) {
      if (playing && gy > revealRow) continue;
      for (let gx = 0; gx < COLS; gx++) {
        if (pointInTri(gx + 0.5, gy + 0.5)) {
          ctx.fillStyle = gy === revealRow && playing ? "#ffcf5f" : "#5fb4ff";
          ctx.fillRect(gx * cw + 1, gy * ch + 1, cw - 2, ch - 2);
        }
      }
    }

    // triangle outline (continuous coords)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tri[0].x * cw, tri[0].y * ch);
    ctx.lineTo(tri[1].x * cw, tri[1].y * ch);
    ctx.lineTo(tri[2].x * cw, tri[2].y * ch);
    ctx.closePath();
    ctx.stroke();
  }

  function play() {
    playing = true;
    revealRow = -1;
    const step = () => {
      revealRow++;
      draw();
      if (revealRow < ROWS) setTimeout(step, 90);
      else playing = false;
    };
    step();
  }

  controlsHost.appendChild(button("ラスタライズをスロー再生", play, true));
  controlsHost.appendChild(el("p", { style: "font-size:0.78rem;color:var(--muted);margin:0;max-width:340px;" },
    "各行を上から順にスキャンし、三角形の内側にあるマス目（ピクセル）だけを塗りつぶします。これが「スクリーン空間」への変換です。"));

  resize();
}
