// デモB拡張: プリセット形状（立方体/球）のワイヤーフレームと三角形カウンター
import { THREE, makeScene, registerLoop } from "./three-common.js";
import { el, slider, button } from "./ui.js";

export function initDemoBShapes() {
  const controlsHost = document.getElementById("demoB-controls");
  const canvasHost = document.getElementById("demoB-canvas");
  if (!controlsHost || !canvasHost) return;

  const { scene, camera, renderer, controls } = makeScene(canvasHost, { camPos: [3, 2, 4], grid: false });
  scene.add(new THREE.GridHelper(10, 10, 0x262b36, 0x1a1e26));

  let mesh = null;
  let wire = null;
  let detail = 1;
  let shape = "box";

  const counter = el("div", { class: "vgroup" }, [
    el("div", { class: "vgroup-title" }, "三角形の枚数"),
    el("div", { style: "font-size:1.6rem;font-weight:800;color:var(--accent);" }, "0"),
  ]);
  const counterNum = counter.lastChild;

  function build() {
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    if (wire) { scene.remove(wire); wire.geometry.dispose(); }

    let geo;
    if (shape === "box") {
      const seg = Math.max(1, Math.round(detail * 2));
      geo = new THREE.BoxGeometry(1.6, 1.6, 1.6, seg, seg, seg);
    } else {
      geo = new THREE.SphereGeometry(1.1, 4 + detail * 4, 3 + detail * 3);
    }
    mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4f8fd9, flatShading: true, transparent: true, opacity: 0.85 }));
    scene.add(mesh);
    wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    scene.add(wire);

    const tris = (geo.index ? geo.index.count : geo.getAttribute("position").count) / 3;
    counterNum.textContent = `${Math.round(tris)} 枚`;
  }

  const bBox = button("立方体を見る", () => { shape = "box"; build(); });
  const bSphere = button("球を見る", () => { shape = "sphere"; build(); });
  bSphere.id = "demoB-sphere";
  const s = slider({
    label: "分割数（三角形をどれだけ細かくするか）",
    min: 1, max: 12, step: 1, value: 1,
    onInput: (v) => { detail = v; build(); },
  });
  s.querySelector("input").id = "demoB-detail";

  controlsHost.append(bBox, bSphere, s, counter,
    el("p", { style: "font-size:0.75rem;color:var(--muted);margin:0;max-width:320px;" },
      "ドラッグで回せます。「滑らかに見える球」も、近づいて見ればぜんぶ三角形の板の集まりです。"));

  build();
  registerLoop(canvasHost, () => { controls.update(); renderer.render(scene, camera); });
}
