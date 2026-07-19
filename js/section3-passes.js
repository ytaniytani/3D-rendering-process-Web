import { THREE, makeScene, registerLoop } from "./three-common.js";
import { tabButton, el, slider } from "./ui.js";

// 共通シーンを作り、オプションでページごとの機能を有効化する
// options:
//   tabs: ["final","basecolor","normal","depth","lighting","shadowmap"] のうち使うもの
//   inspector: true でピクセルクリック検査
//   sunControl: true で太陽方向スライダー
//   stageSlider: true で工程ビフォーアフター（ch3c用）
export function initSection3(options = {}) {
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
  function addMesh(geo, color, roughness, metalness, pos, name) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.name = name;
    scene.add(mesh);
    items.push({ mesh, standard: mat, baseColor: color, name, roughness, metalness });
    return mesh;
  }
  addMesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), 0xd94f4f, 0.6, 0.1, [-1.4, 0.6, 0], "赤い箱");
  addMesh(new THREE.SphereGeometry(0.8, 32, 32), 0x4f8fd9, 0.15, 0.9, [1.2, 0.8, -0.5], "金属の球");
  addMesh(new THREE.ConeGeometry(0.7, 1.4, 24), 0x6fd98f, 0.8, 0.0, [0, 0.7, 1.6], "緑のコーン");
  addMesh(new THREE.CylinderGeometry(3, 3, 0.2, 40), 0x555a63, 0.9, 0.0, [0, -0.1, 0], "床");

  // 半透明ガラス球（ch3cで使用）
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 32, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0 })
  );
  glass.position.set(0.1, 0.55, 0.6);
  glass.visible = false;
  scene.add(glass);

  const normalMat = new THREE.MeshNormalMaterial();
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking });
  const litWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });

  // シャドウマップの中身ビュー用: 光源位置からのカメラ
  const lightCam = new THREE.PerspectiveCamera(60, 1, 1, 40);
  let renderFromLight = false;

  const modeDefs = {
    final: { label: "最終画面 (Final)", apply: () => { renderFromLight = false; items.forEach((i) => (i.mesh.material = i.standard)); } },
    basecolor: {
      label: "G-Buffer: 材質 (BaseColor)",
      apply: () => { renderFromLight = false; items.forEach((i) => (i.mesh.material = new THREE.MeshBasicMaterial({ color: i.baseColor }))); },
    },
    normal: { label: "G-Buffer: 法線 (Normal)", apply: () => { renderFromLight = false; items.forEach((i) => (i.mesh.material = normalMat)); } },
    depth: { label: "G-Buffer: 深度 (Depth)", apply: () => { renderFromLight = false; items.forEach((i) => (i.mesh.material = depthMat)); } },
    lighting: { label: "ライティングのみ (Lighting)", apply: () => { renderFromLight = false; items.forEach((i) => (i.mesh.material = litWhiteMat)); } },
    shadowmap: {
      label: "シャドウマップの中身（光源から見た深度）",
      apply: () => { renderFromLight = true; items.forEach((i) => (i.mesh.material = depthMat)); },
    },
  };

  const tabs = options.tabs || ["final", "basecolor", "normal", "depth", "lighting"];
  const buttons = {};
  function setMode(key) {
    modeDefs[key].apply();
    Object.entries(buttons).forEach(([k, b]) => b.classList.toggle("active", k === key));
  }
  if (!options.stageSlider) {
    tabs.forEach((key) => {
      const b = tabButton(modeDefs[key].label, () => setMode(key));
      b.id = `sec3-tab-${key}`;
      buttons[key] = b;
      controlsHost.appendChild(b);
    });
    setMode(tabs[0]);
  }

  // ---- 太陽方向コントロール（ch3b） ----
  if (options.sunControl) {
    let az = 40, elv = 55;
    function updateSun() {
      const a = (az * Math.PI) / 180, e = (elv * Math.PI) / 180;
      sun.position.set(8 * Math.cos(e) * Math.cos(a), 8 * Math.sin(e), 8 * Math.cos(e) * Math.sin(a));
      lightCam.position.copy(sun.position);
      lightCam.lookAt(0, 0, 0);
    }
    const sAz = slider({ label: "太陽の向き（方位）", min: 0, max: 360, step: 5, value: az, format: (v) => `${v}°`, onInput: (v) => { az = v; updateSun(); } });
    sAz.querySelector("input").id = "sec3-sun-az";
    const sEl = slider({ label: "太陽の高さ", min: 10, max: 85, step: 5, value: elv, format: (v) => `${v}°`, onInput: (v) => { elv = v; updateSun(); } });
    sEl.querySelector("input").id = "sec3-sun-el";
    controlsHost.append(sAz, sEl);
    updateSun();
  }

  // ---- ピクセル検査（ch3a） ----
  let infoCard = null;
  if (options.inspector) {
    infoCard = el("div", { class: "vgroup", style: "min-width:240px;" }, [
      el("div", { class: "vgroup-title" }, "🔍 クリックしたマスの素材袋の中身"),
      el("div", { style: "font-size:0.8rem;color:var(--muted);" }, "3D画面の物体をクリックしてください"),
    ]);
    controlsHost.appendChild(infoCard);

    const raycaster = new THREE.Raycaster();
    renderer.domElement.addEventListener("click", (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const p = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(p, camera);
      const hits = raycaster.intersectObjects(items.map((i) => i.mesh));
      const body = infoCard.lastChild;
      if (!hits.length) {
        body.innerHTML = `<span style="color:var(--muted)">背景でした。物体をクリックしてください。</span>`;
        return;
      }
      const hit = hits[0];
      const item = items.find((i) => i.mesh === hit.object);
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      const col = "#" + item.baseColor.toString(16).padStart(6, "0");
      body.innerHTML = `
        <div style="font-size:0.8rem;line-height:1.9;">
        <b>${item.name}</b> のマスでした<br>
        深度（カメラからの距離）: <b>${hit.distance.toFixed(2)} m</b><br>
        法線（表面の向き）: <b>x=${n.x.toFixed(2)} y=${n.y.toFixed(2)} z=${n.z.toFixed(2)}</b><br>
        ベースカラー: <span style="display:inline-block;width:12px;height:12px;background:${col};border-radius:3px;vertical-align:middle;"></span> <b>${col}</b><br>
        ラフネス: <b>${item.roughness}</b> ／ メタリック: <b>${item.metalness}</b>
        </div>`;
    });
  }

  // ---- 工程スライダー（ch3c） ----
  if (options.stageSlider) {
    const stageNames = [
      "0: G-Bufferのみ（素材の地の色だけ・光なし）",
      "1: ライティング済み（光と影が付いた）",
      "2: 半透明を合成（ガラス球が乗った）",
      "3: ポストプロセス適用（画面全体の仕上げ）",
    ];
    const label = el("div", { style: "font-size:0.85rem;color:var(--text);font-weight:700;" }, stageNames[3]);
    const vignette = el("div", {
      style: "position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 0.3s;" +
        "background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%);",
    });
    canvasHost.style.position = "relative";
    canvasHost.appendChild(vignette);

    function setStage(v) {
      const stage = Math.round(v);
      label.textContent = stageNames[stage];
      if (stage === 0) {
        items.forEach((i) => (i.mesh.material = new THREE.MeshBasicMaterial({ color: i.baseColor })));
      } else {
        items.forEach((i) => (i.mesh.material = i.standard));
      }
      glass.visible = stage >= 2;
      const post = stage >= 3;
      renderer.domElement.style.filter = post ? "saturate(1.25) contrast(1.08) brightness(1.05)" : "";
      vignette.style.opacity = post ? "1" : "0";
    }
    const s = slider({ label: "工程を進める（0→3）", min: 0, max: 3, step: 1, value: 3, onInput: setStage });
    s.querySelector("input").id = "sec3-stage";
    controlsHost.append(s, label);
    setStage(3);
  }

  registerLoop(canvasHost, () => {
    controls.update();
    renderer.render(scene, renderFromLight ? lightCam : camera);
  });
}
