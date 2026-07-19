import { el, slider, button, meter } from "./ui.js";

export function initSection4() {
  const host = document.getElementById("sec4-canvas");
  const controlsHost = document.getElementById("sec4-controls");
  if (!host) return;
  host.innerHTML = "";

  const canvas = el("canvas", {});
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let distance = 20; // 0 (near) - 100 (far)
  let triCount = 1;
  let running = false;
  let wastedTotal = 0;
  let usefulTotal = 0;

  function trisFromDistance(d) {
    return Math.max(1, Math.round((d / 100) * 140));
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    canvas.width = w; canvas.height = h;
    draw(-1);
  }
  new ResizeObserver(resize).observe(host);

  // 2x2 quad occupies a big central area; each of 4 cells subdivided visually
  function cellRects() {
    const pad = 40;
    const size = Math.min(canvas.width, canvas.height) - pad * 2;
    const ox = (canvas.width - size) / 2;
    const oy = (canvas.height - size) / 2;
    const half = size / 2;
    return [
      { x: ox, y: oy, w: half, h: half, painted: true },
      { x: ox + half, y: oy, w: half, h: half, painted: false },
      { x: ox, y: oy + half, w: half, h: half, painted: false },
      { x: ox + half, y: oy + half, w: half, h: half, painted: false },
    ];
  }

  function draw(activeStep) {
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cells = cellRects();

    cells.forEach((c, i) => {
      ctx.fillStyle = i === 0 ? "#1c3f57" : "rgba(255,95,95,0.08)";
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = "#3a4256";
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    });

    // draw micro-triangles piled in the top-left cell
    const tl = cells[0];
    const n = triCount;
    ctx.save();
    ctx.beginPath();
    ctx.rect(tl.x, tl.y, tl.w, tl.h);
    ctx.clip();
    for (let i = 0; i < n; i++) {
      const isActive = activeStep === i;
      const seed = i * 137.5;
      const cx = tl.x + tl.w * (0.25 + 0.5 * ((Math.sin(seed) + 1) / 2));
      const cy = tl.y + tl.h * (0.25 + 0.5 * ((Math.cos(seed * 1.3) + 1) / 2));
      const s = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy + s);
      ctx.lineTo(cx - s, cy + s);
      ctx.closePath();
      ctx.fillStyle = isActive ? "#ffd35f" : "rgba(255,255,255,0.5)";
      ctx.fill();
    }
    ctx.restore();

    if (activeStep >= 0) {
      // flash helper pixels (3 non-top-left cells) when active
      ctx.fillStyle = "rgba(255,95,95,0.45)";
      [cells[1], cells[2], cells[3]].forEach((c) => ctx.fillRect(c.x, c.y, c.w, c.h));
      ctx.strokeStyle = "#ff5f5f";
      ctx.lineWidth = 3;
      [cells[1], cells[2], cells[3]].forEach((c) => ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4));
    }

    ctx.fillStyle = "#cfd6e4";
    ctx.font = "13px sans-serif";
    ctx.fillText("塗られるのはここだけ (1ピクセル相当)", cells[0].x + 8, cells[0].y + cells[0].h + 22);
    ctx.fillStyle = "#ff9f9f";
    ctx.fillText("ヘルパーピクセル（計算するが破棄）", cells[3].x - 40, cells[3].y - 10);
  }

  const loadMeter = meter(0);
  const wastedLabel = el("div", { style: "font-size:0.85rem;" }, "無駄なピクセル計算: 0 回");
  const usefulLabel = el("div", { style: "font-size:0.78rem;color:var(--muted);" }, "有効な描画: 0 回");

  function updateMeter() {
    const pct = Math.min(100, (triCount / 140) * 100);
    loadMeter.setValue(pct);
  }

  controlsHost.appendChild(
    slider({
      label: "カメラ距離（近景 → 遠景）",
      min: 0,
      max: 100,
      step: 1,
      value: distance,
      onInput: (v) => {
        distance = v;
        triCount = trisFromDistance(distance);
        wastedTotal = 0; usefulTotal = 0;
        wastedLabel.textContent = "無駄なピクセル計算: 0 回";
        usefulLabel.textContent = "有効な描画: 0 回";
        updateMeter();
        draw(-1);
      },
    })
  );
  controlsHost.appendChild(button("描画開始（スロー再生）", () => play(), true));
  controlsHost.appendChild(el("div", { class: "vgroup" }, [
    el("div", { class: "vgroup-title" }, "GPU負荷メーター"),
    loadMeter,
    wastedLabel,
    usefulLabel,
  ]));

  function play() {
    if (running) return;
    running = true;
    wastedTotal = 0; usefulTotal = 0;
    let step = 0;
    const n = triCount;
    const tick = () => {
      draw(step);
      usefulTotal += 1;
      wastedTotal += 3;
      wastedLabel.textContent = `無駄なピクセル計算: ${wastedTotal} 回`;
      usefulLabel.textContent = `有効な描画: ${usefulTotal} 回`;
      step++;
      if (step < n) {
        setTimeout(tick, Math.max(8, 220 - n));
      } else {
        running = false;
        draw(-1);
      }
    };
    tick();
  }

  triCount = trisFromDistance(distance);
  updateMeter();
  resize();
}
