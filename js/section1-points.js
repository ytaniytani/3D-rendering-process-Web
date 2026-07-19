import { THREE, makeScene, registerLoop } from "./three-common.js";
import { el, button, numberField } from "./ui.js";

export function initSection1() {
  const controlsHost = document.getElementById("sec1-controls");
  const canvasHost = document.getElementById("sec1-canvas");
  if (!controlsHost || !canvasHost) return;

  const { scene, camera, renderer, controls } = makeScene(canvasHost, { camPos: [4, 3, 6] });

  scene.add(axisLine(0xff5f5f, [1, 0, 0]));
  scene.add(axisLine(0x5fe0a0, [0, 1, 0]));
  scene.add(axisLine(0x5fb4ff, [0, 0, 1]));

  const colors = [0xff9f5f, 0x5fb4ff, 0x5fe0a0];
  const positions = [
    [1.5, 0.2, 0],
    [-1.2, 1.8, 0.5],
    [0.2, -0.8, -1.3],
  ];

  const spheres = positions.map((p, i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshStandardMaterial({ color: colors[i] })
    );
    m.position.set(...p);
    scene.add(m);
    return m;
  });

  let triangleMesh = null;
  let wireLines = null;

  function rebuildTriangle() {
    if (!triangleMesh) return;
    const geo = new THREE.BufferGeometry().setFromPoints(positions.map((p) => new THREE.Vector3(...p)));
    geo.setIndex([0, 1, 2]);
    geo.computeVertexNormals();
    triangleMesh.geometry.dispose();
    triangleMesh.geometry = geo;

    wireLines.geometry.dispose();
    const loop = [...positions, positions[0]].map((p) => new THREE.Vector3(...p));
    wireLines.geometry = new THREE.BufferGeometry().setFromPoints(loop);
  }

  function makeTriangle() {
    if (triangleMesh) return;
    const geo = new THREE.BufferGeometry().setFromPoints(positions.map((p) => new THREE.Vector3(...p)));
    geo.setIndex([0, 1, 2]);
    geo.computeVertexNormals();
    triangleMesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    scene.add(triangleMesh);

    const loop = [...positions, positions[0]].map((p) => new THREE.Vector3(...p));
    wireLines = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(loop),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    scene.add(wireLines);
  }

  // Controls: 3 vertices x 3 fields
  positions.forEach((p, i) => {
    const group = el("div", { class: "vgroup" }, [
      el("div", { class: "vgroup-title" }, `頂点 ${i + 1}`),
    ]);
    ["X", "Y", "Z"].forEach((axis, axisIdx) => {
      group.appendChild(
        numberField({
          label: axis,
          min: -5,
          max: 5,
          step: 0.1,
          value: p[axisIdx],
          onInput: (v) => {
            positions[i][axisIdx] = v;
            spheres[i].position.set(...positions[i]);
            rebuildTriangle();
          },
        })
      );
    });
    controlsHost.appendChild(group);
  });

  controlsHost.appendChild(button("点1・点2・点3を結んで三角形を作る", () => makeTriangle(), true));

  registerLoop(canvasHost, () => {
    controls.update();
    renderer.render(scene, camera);
  });
}

function axisLine(color, dir) {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(dir[0] * 4, dir[1] * 4, dir[2] * 4)];
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color }));
}
