import { THREE, makeScene, registerLoop } from "./three-common.js";
import { el, slider, meter } from "./ui.js";

const PALETTE = [0xff5f5f, 0x5fb4ff, 0xffcf5f, 0x5fe0a0, 0xd95fff, 0xff9f5f, 0x5fffe0, 0xc7ff5f];

export function initSection5() {
  const canvasHost = document.getElementById("sec5-canvas");
  const controlsHost = document.getElementById("sec5-controls");
  if (!canvasHost) return;

  const { scene, camera, renderer } = makeScene(canvasHost, { camPos: [0, 0, 5], grid: false });
  scene.add(new THREE.GridHelper(20, 20, 0x262b36, 0x1a1e26));

  const rockGroup = new THREE.Group();
  scene.add(rockGroup);

  const baseGeo = new THREE.IcosahedronGeometry(1.3, 4);
  const nonIndexed = baseGeo.index ? baseGeo.toNonIndexed() : baseGeo;
  const posAttr = nonIndexed.getAttribute("position");
  const triCountTotal = posAttr.count / 3;
  const TRIS_PER_MESHLET = 24;

  // Legacy: single solid mesh, always fully drawn
  const legacyMesh = new THREE.Mesh(nonIndexed.clone(), new THREE.MeshStandardMaterial({ color: 0x8d8f95, flatShading: true }));
  rockGroup.add(legacyMesh);

  // Meshlet mode: chunk into groups
  const meshlets = [];
  for (let t = 0; t < triCountTotal; t += TRIS_PER_MESHLET) {
    const triEnd = Math.min(t + TRIS_PER_MESHLET, triCountTotal);
    const start = t * 3, end = triEnd * 3;
    const sub = new THREE.BufferGeometry();
    sub.setAttribute("position", new THREE.BufferAttribute(posAttr.array.slice(start * 3, end * 3), 3));
    sub.computeVertexNormals();

    const color = PALETTE[meshlets.length % PALETTE.length];
    const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
    const mesh = new THREE.Mesh(sub, mat);
    mesh.visible = false;
    rockGroup.add(mesh);

    const box = new THREE.Box3().setFromBufferAttribute(sub.getAttribute("position"));
    const centroid = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const normal = centroid.clone().normalize();

    meshlets.push({ mesh, centroid, normal, radius, triCount: triEnd - t });
  }

  let mode = "legacy"; // legacy | meshlet
  let cullBackface = true;
  let cullDistance = true;

  function setMode(next) {
    mode = next;
    legacyMesh.visible = mode === "legacy";
    meshlets.forEach((m) => { if (mode === "meshlet") m.mesh.visible = true; else m.mesh.visible = false; });
  }
  setMode("legacy");

  // manual orbit (drag) + distance slider (dolly)
  let yaw = 0.6, pitch = 0.3, radius = 4.2;
  let dragging = false, lastX = 0, lastY = 0;
  canvasHost.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener("pointerup", () => (dragging = false));
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    yaw += (e.clientX - lastX) * 0.006;
    pitch += (e.clientY - lastY) * 0.006;
    pitch = Math.max(-1.4, Math.min(1.4, pitch));
    lastX = e.clientX; lastY = e.clientY;
  });

  function updateCamera() {
    camera.position.set(
      radius * Math.cos(pitch) * Math.sin(yaw),
      radius * Math.sin(pitch),
      radius * Math.cos(pitch) * Math.cos(yaw)
    );
    camera.lookAt(0, 0, 0);
  }

  const loadMeter = meter(0);
  const visibleLabel = el("div", { style: "font-size:0.78rem;color:var(--muted);" }, "");
  const legend = el("div", { class: "legend" }, [
    el("span", {}, [el("i", { style: "background:#8d8f95" }), "従来: 常に全ポリゴン処理"]),
    el("span", {}, [el("i", { style: "background:#5fb4ff" }), "Meshlet: 見えるパックだけ処理"]),
  ]);

  function frameUpdate() {
    if (mode !== "meshlet") {
      loadMeter.setValue(100);
      visibleLabel.textContent = `頂点処理: 全 ${triCountTotal} 三角形 (カリングなし)`;
      return;
    }
    const camPos = camera.position;
    let visibleCount = 0, visibleTris = 0;
    for (const m of meshlets) {
      const worldNormal = m.normal.clone().applyQuaternion(rockGroup.quaternion).normalize();
      const worldCentroid = m.centroid.clone().applyMatrix4(rockGroup.matrixWorld);
      const viewDir = camPos.clone().sub(worldCentroid).normalize();
      const facing = worldNormal.dot(viewDir) > -0.15;
      const dist = camPos.distanceTo(worldCentroid);
      const screenSize = m.radius / dist;
      const bigEnough = screenSize > 0.045;

      const visible = (!cullBackface || facing) && (!cullDistance || bigEnough);
      m.mesh.visible = visible;
      if (visible) { visibleCount++; visibleTris += m.triCount; }
    }
    const pct = (visibleTris / triCountTotal) * 100;
    loadMeter.setValue(pct);
    visibleLabel.textContent = `処理中のメッシュレット: ${visibleCount} / ${meshlets.length}（${visibleTris} / ${triCountTotal} 三角形）`;
  }

  const modeButtons = {};
  function tab(label, key) {
    const b = el("button", { class: "tab", onclick: () => { setMode(key); Object.values(modeButtons).forEach(x=>x.classList.remove("active")); modeButtons[key].classList.add("active"); } }, label);
    modeButtons[key] = b;
    return b;
  }
  const tabsRow = el("div", { style: "display:flex;gap:0.5rem;" }, [tab("従来の頂点パイプライン", "legacy"), tab("次世代 Meshletパイプライン", "meshlet")]);
  modeButtons.legacy.classList.add("active");

  controlsHost.appendChild(tabsRow);
  controlsHost.appendChild(slider({ label: "カメラ距離", min: 2, max: 14, step: 0.1, value: radius, onInput: (v) => (radius = v) }));
  controlsHost.appendChild(el("div", { class: "vgroup" }, [el("div", { class: "vgroup-title" }, "GPU負荷（頂点処理）"), loadMeter, visibleLabel]));
  controlsHost.appendChild(legend);
  controlsHost.appendChild(el("p", { style: "font-size:0.72rem;color:var(--muted);margin:0;" }, "ドラッグして回転させると、裏側に回ったカラーパックが消滅するのを確認できます。"));

  registerLoop(canvasHost, () => {
    updateCamera();
    frameUpdate();
    renderer.render(scene, camera);
  });
}
