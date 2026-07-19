// デモA: 2D座標 → 奥行きZを足して3D座標へ
import { THREE, makeScene, registerLoop } from "./three-common.js";
import { el, slider, button } from "./ui.js";

export function initDemoA() {
  const controlsHost = document.getElementById("demoA-controls");
  const canvasHost = document.getElementById("demoA-canvas");
  if (!controlsHost || !canvasHost) return;

  const state = { x: 2, y: 1, z: 0, mode3d: false };

  // ---- 2D view ----
  const canvas2d = el("canvas", { style: "width:100%;height:100%;" });
  canvasHost.appendChild(canvas2d);
  const ctx = canvas2d.getContext("2d");

  function draw2d() {
    const w = canvasHost.clientWidth, h = canvasHost.clientHeight;
    if (!w || !h) return;
    canvas2d.width = w; canvas2d.height = h;
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, unit = Math.min(w, h) / 12;

    // grid
    ctx.strokeStyle = "#22262f";
    for (let gx = -20; gx <= 20; gx++) {
      ctx.beginPath(); ctx.moveTo(cx + gx * unit, 0); ctx.lineTo(cx + gx * unit, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy + gx * unit); ctx.lineTo(w, cy + gx * unit); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = "#ff5f5f"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.strokeStyle = "#5fe0a0";
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = "#ff5f5f"; ctx.font = "13px sans-serif";
    ctx.fillText("X軸（右がプラス）", w - 150, cy - 8);
    ctx.fillStyle = "#5fe0a0";
    ctx.fillText("Y軸（上がプラス）", cx + 8, 18);

    // point
    const px = cx + state.x * unit, py = cy - state.y * unit;
    ctx.strokeStyle = "#5fb4ff"; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(px, py); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffcf5f";
    ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif";
    ctx.fillText(`(${state.x}, ${state.y})`, px + 12, py - 10);
    // origin
    ctx.fillStyle = "#cfd6e4";
    ctx.fillText("原点(0,0)", cx + 6, cy + 18);
  }
  new ResizeObserver(draw2d).observe(canvasHost);

  // ---- 3D view (作っておいて隠す) ----
  const host3d = el("div", { style: "position:absolute;inset:0;display:none;" });
  canvasHost.style.position = "relative";
  canvasHost.appendChild(host3d);

  const { scene, camera, renderer, controls } = makeScene(host3d, { camPos: [5, 4, 7] });
  const mkAxis = (color, to, label) => {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(...to)]),
      new THREE.LineBasicMaterial({ color })
    );
    scene.add(line);
  };
  mkAxis(0xff5f5f, [5, 0, 0]);
  mkAxis(0x5fe0a0, [0, 5, 0]);
  mkAxis(0x5fb4ff, [0, 0, 5]);

  const point = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), new THREE.MeshStandardMaterial({ color: 0xffcf5f }));
  scene.add(point);
  // ガイド線(点から各軸への垂線)
  const guideMat = new THREE.LineDashedMaterial({ color: 0x5fb4ff, dashSize: 0.15, gapSize: 0.12 });
  let guides = [];
  function updatePoint() {
    point.position.set(state.x, state.y, state.z);
    guides.forEach((g) => scene.remove(g));
    guides = [
      [[state.x, state.y, state.z], [state.x, 0, state.z]],
      [[state.x, 0, state.z], [state.x, 0, 0]],
      [[state.x, 0, state.z], [0, 0, state.z]],
    ].map(([a, b]) => {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]),
        guideMat
      );
      line.computeLineDistances();
      scene.add(line);
      return line;
    });
  }
  updatePoint();
  registerLoop(host3d, () => { controls.update(); renderer.render(scene, camera); });

  // ---- controls ----
  const sx = slider({ label: "X（左右）", min: -4, max: 4, step: 0.5, value: state.x, onInput: (v) => { state.x = v; refresh(); } });
  const sy = slider({ label: "Y（上下）", min: -4, max: 4, step: 0.5, value: state.y, onInput: (v) => { state.y = v; refresh(); } });
  const sz = slider({ label: "Z（奥行き・手前がプラス）", min: -4, max: 4, step: 0.5, value: state.z, onInput: (v) => { state.z = v; refresh(); } });
  sz.style.display = "none";
  sx.querySelector("input").id = "demoA-x";
  sy.querySelector("input").id = "demoA-y";
  sz.querySelector("input").id = "demoA-z";

  const toggle = button("＋ 奥行き（Z軸）を追加して3Dにする", () => {
    state.mode3d = true;
    canvas2d.style.display = "none";
    host3d.style.display = "block";
    sz.style.display = "";
    toggle.style.display = "none";
    backBtn.style.display = "";
    refresh();
  }, true);
  toggle.id = "demoA-to3d";
  const backBtn = button("2Dに戻る", () => {
    state.mode3d = false;
    canvas2d.style.display = "";
    host3d.style.display = "none";
    sz.style.display = "none";
    toggle.style.display = "";
    backBtn.style.display = "none";
    refresh();
  });
  backBtn.style.display = "none";

  const reset = button("リセット", () => {
    state.x = 2; state.y = 1; state.z = 0;
    [sx, sy, sz].forEach((s, i) => {
      const input = s.querySelector("input");
      input.value = String([2, 1, 0][i]);
      input.dispatchEvent(new Event("input"));
    });
  });

  controlsHost.append(sx, sy, sz, toggle, backBtn, reset);

  function refresh() {
    if (state.mode3d) updatePoint();
    else draw2d();
  }
  setTimeout(draw2d, 50);
}
