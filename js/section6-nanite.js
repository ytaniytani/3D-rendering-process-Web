import { THREE, makeScene, registerLoop } from "./three-common.js";
import { el, slider, meter } from "./ui.js";

export function initSection6() {
  const canvasHost = document.getElementById("sec6-canvas");
  const controlsHost = document.getElementById("sec6-controls");
  if (!canvasHost) return;

  const { scene, camera, renderer } = makeScene(canvasHost, { camPos: [0, 0, 5], grid: false });
  scene.add(new THREE.GridHelper(20, 20, 0x262b36, 0x1a1e26));

  const group = new THREE.Group();
  scene.add(group);

  // three discrete LOD detail levels standing in for Nanite's continuous cluster LOD
  const lodDetails = [1, 2, 4];
  const lodGeoms = lodDetails.map((d) => {
    const g = new THREE.IcosahedronGeometry(1.3, d);
    return g.index ? g.toNonIndexed() : g;
  });

  const TRIS_PER_CLUSTER = 20;
  const lodMeshlets = lodGeoms.map((geo) => buildMeshlets(geo, TRIS_PER_CLUSTER));

  const materialNormal = new THREE.MeshStandardMaterial({ color: 0xb9bdc7, flatShading: true });
  const matHW = new THREE.MeshStandardMaterial({ color: 0x5fb4ff, flatShading: true });
  const matSW = new THREE.MeshStandardMaterial({ color: 0x5fe0a0, flatShading: true });

  const lodMeshGroups = lodMeshlets.map((clusters) => {
    const g = new THREE.Group();
    clusters.forEach((c) => {
      const m = new THREE.Mesh(c.geo, materialNormal);
      m.visible = false;
      g.add(m);
      c.mesh = m;
    });
    group.add(g);
    return g;
  });

  let radius = 5;
  let yaw = 0.6, pitch = 0.25;
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
    camera.position.set(radius * Math.cos(pitch) * Math.sin(yaw), radius * Math.sin(pitch), radius * Math.cos(pitch) * Math.cos(yaw));
    camera.lookAt(0, 0, 0);
  }

  let vizMode = false;
  const hwMeter = meter(0);
  const swMeter = meter(0);
  const infoLabel = el("div", { style: "font-size:0.78rem;color:var(--muted);" }, "");

  function pickLod(dist) {
    if (dist < 3.2) return 2;
    if (dist < 4.4) return 1;
    return 0;
  }

  function frameUpdate() {
    const dist = radius;
    const lodIdx = pickLod(dist);
    lodMeshGroups.forEach((g, i) => (g.visible = i === lodIdx));

    let hwTris = 0, swTris = 0, total = 0;
    const camPos = camera.position;
    for (const c of lodMeshlets[lodIdx]) {
      total += c.triCount;
      const worldCentroid = c.centroid.clone().applyMatrix4(group.matrixWorld);
      const d = camPos.distanceTo(worldCentroid);
      const screenSize = c.radius / d;
      const isSW = screenSize < 0.05;
      c.mesh.visible = true;
      if (vizMode) {
        c.mesh.material = isSW ? matSW : matHW;
      } else {
        c.mesh.material = materialNormal;
      }
      if (isSW) swTris += c.triCount; else hwTris += c.triCount;
    }
    hwMeter.setValue((hwTris / total) * 100);
    // Nanite's software path stays flat/cheap no matter how dense — represent as a low constant load
    swMeter.setValue(swTris > 0 ? 12 : 0);
    infoLabel.textContent = `LOD ${lodIdx + 1}/3（"1ピクセル=1ポリゴン"付近に自動調整） ｜ HWパス:${hwTris}三角形 / SWパス:${swTris}三角形`;
  }

  controlsHost.appendChild(slider({ label: "カメラ距離（近づけたり離したり）", min: 2, max: 8, step: 0.05, value: radius, onInput: (v) => (radius = v) }));
  const checkboxWrap = el("label", { class: "field inline" }, []);
  const checkbox = el("input", { type: "checkbox" });
  checkbox.addEventListener("change", () => (vizMode = checkbox.checked));
  checkboxWrap.append(checkbox, el("span", {}, "Nanite描画ルート可視化モード"));
  controlsHost.appendChild(checkboxWrap);
  controlsHost.appendChild(
    el("div", { class: "vgroup" }, [
      el("div", { class: "vgroup-title" }, "負荷メーター"),
      el("div", { style: "font-size:0.72rem;color:var(--muted);" }, "青: ハードウェア・ラスタライザー"),
      hwMeter,
      el("div", { style: "font-size:0.72rem;color:var(--muted);margin-top:0.3rem;" }, "緑: Naniteソフトウェア・ラスタライザー（常に軽い）"),
      swMeter,
      infoLabel,
    ])
  );

  registerLoop(canvasHost, () => {
    updateCamera();
    frameUpdate();
    renderer.render(scene, camera);
  });
}

function buildMeshlets(nonIndexedGeo, trisPerCluster) {
  const posAttr = nonIndexedGeo.getAttribute("position");
  const triCountTotal = posAttr.count / 3;
  const clusters = [];
  for (let t = 0; t < triCountTotal; t += trisPerCluster) {
    const triEnd = Math.min(t + trisPerCluster, triCountTotal);
    const start = t * 3, end = triEnd * 3;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(posAttr.array.slice(start * 3, end * 3), 3));
    geo.computeVertexNormals();
    const box = new THREE.Box3().setFromBufferAttribute(geo.getAttribute("position"));
    const centroid = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    clusters.push({ geo, centroid, radius, triCount: triEnd - t });
  }
  return clusters;
}
