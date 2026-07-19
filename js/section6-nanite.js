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

  // 網の目（ワイヤーフレーム）: 連続LODで密度が変わるのを見せる
  const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  const lodWires = lodGeoms.map((geo) => {
    const w = new THREE.LineSegments(new THREE.WireframeGeometry(geo), wireMat);
    w.visible = false;
    group.add(w);
    return w;
  });
  let showWire = true;

  // 従来LOD比較用の第2の球（2段階だけ・閾値でパッと切り替わる）
  const compareGroup = new THREE.Group();
  compareGroup.position.set(3.2, 0, 0);
  compareGroup.visible = false;
  scene.add(compareGroup);
  const cmpCoarse = new THREE.Mesh(lodGeoms[0].clone(), new THREE.MeshStandardMaterial({ color: 0xc7a15f, flatShading: true }));
  const cmpFine = new THREE.Mesh(lodGeoms[2].clone(), new THREE.MeshStandardMaterial({ color: 0xc7a15f, flatShading: true }));
  const cmpWireC = new THREE.LineSegments(new THREE.WireframeGeometry(lodGeoms[0]), wireMat);
  const cmpWireF = new THREE.LineSegments(new THREE.WireframeGeometry(lodGeoms[2]), wireMat);
  compareGroup.add(cmpCoarse, cmpFine, cmpWireC, cmpWireF);
  let cmpFlash = 0;
  let cmpPrevFine = true;

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
    lodWires.forEach((w, i) => (w.visible = showWire && i === lodIdx));

    // 従来LOD側: 2段階でパッと切り替え＋赤フラッシュ
    if (compareGroup.visible) {
      const useFine = dist < 4.0;
      if (useFine !== cmpPrevFine) { cmpFlash = 24; cmpPrevFine = useFine; }
      cmpFine.visible = useFine;
      cmpCoarse.visible = !useFine;
      cmpWireF.visible = showWire && useFine;
      cmpWireC.visible = showWire && !useFine;
      const flashOn = cmpFlash > 0 && (cmpFlash % 8) < 4;
      cmpFine.material.emissive = new THREE.Color(flashOn ? 0xaa0000 : 0x000000);
      cmpCoarse.material.emissive = new THREE.Color(flashOn ? 0xaa0000 : 0x000000);
      if (cmpFlash > 0) cmpFlash--;
    }
    if (pyramidRows) pyramidRows.forEach((row, i) => {
      row.style.background = i === lodIdx ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "transparent";
      row.style.color = i === lodIdx ? "var(--text)" : "var(--muted)";
    });

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

  const distS = slider({ label: "カメラ距離（近づけたり離したり）", min: 2, max: 8, step: 0.05, value: radius, onInput: (v) => (radius = v) });
  distS.querySelector("input").id = "sec6-distance";
  controlsHost.appendChild(distS);
  const checkboxWrap = el("label", { class: "field inline" }, []);
  const checkbox = el("input", { type: "checkbox", id: "sec6-viz" });
  checkbox.addEventListener("change", () => (vizMode = checkbox.checked));
  checkboxWrap.append(checkbox, el("span", {}, "Nanite描画ルート可視化モード"));
  controlsHost.appendChild(checkboxWrap);

  // 従来LOD比較
  const cmpWrap = el("label", { class: "field inline" }, []);
  const cmpBox = el("input", { type: "checkbox", id: "sec6-compare" });
  cmpBox.addEventListener("change", () => (compareGroup.visible = cmpBox.checked));
  cmpWrap.append(cmpBox, el("span", {}, "従来LOD比較（右側: 2段階LOD。切り替わる瞬間に赤く光る＝ポップイン）"));
  controlsHost.appendChild(cmpWrap);

  // ワイヤーフレーム表示
  const wireWrap = el("label", { class: "field inline" }, []);
  const wireBox = el("input", { type: "checkbox", id: "sec6-wire", checked: "" });
  wireBox.checked = true;
  wireBox.addEventListener("change", () => (showWire = wireBox.checked));
  wireWrap.append(wireBox, el("span", {}, "網の目（ワイヤーフレーム）を表示"));
  controlsHost.appendChild(wireWrap);

  // ストリーミング可視化ピラミッド
  const pyramidRows = [
    el("div", { style: "padding:2px 8px;border-radius:4px;font-size:0.72rem;" }, "▲ 超低精細クラスター群（遠距離用・容量小）"),
    el("div", { style: "padding:2px 8px;border-radius:4px;font-size:0.72rem;" }, "▲▲ 中精細クラスター群（中距離用）"),
    el("div", { style: "padding:2px 8px;border-radius:4px;font-size:0.72rem;" }, "▲▲▲ 高精細クラスター群（近距離用・容量大）"),
  ];
  controlsHost.appendChild(el("div", { class: "vgroup" }, [
    el("div", { class: "vgroup-title" }, "💾 SSD上のクラスター・ピラミッド（今VRAMに読まれている段）"),
    ...pyramidRows,
  ]));
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
