// 数学トラック共通: ナビ / 生きた数式 / 電卓タイム / Canvasヘルパー

export const MATH_PAGES = [
  { file: "index.html", no: "M0", title: "数学のとびら" },
  { file: "m1-negative-grid.html", no: "M1", title: "負の数と座標平面" },
  { file: "m2-trig.html", no: "M2", title: "三角比 sin / cos" },
  { file: "m3-vector.html", no: "M3", title: "ベクトル" },
  { file: "m4-matrix.html", no: "M4", title: "行列" },
  { file: "m5-dot-normal.html", no: "M5", title: "内積と光" },
  { file: "m6-projection-math.html", no: "M6", title: "投影の式" },
];

export function renderMathChrome() {
  const f = location.pathname.split("/").pop() || "index.html";
  const idx = MATH_PAGES.findIndex((p) => p.file === f);

  const header = document.createElement("header");
  header.className = "site-header";
  const nav = MATH_PAGES.map(
    (p, i) => `<a href="${p.file}" class="${i === idx ? "current" : ""}">${p.no}. ${p.title}</a>`
  ).join("");
  header.innerHTML = `
    <div class="site-header-inner">
      <a class="home-link" href="../index.html">🏠 3DCG描画のしくみ</a>
      <nav class="chapter-nav">${nav}<a href="../pages/ch7-summary.html">本編へ戻る</a></nav>
    </div>`;
  document.body.prepend(header);

  if (idx >= 0) {
    const pager = document.createElement("nav");
    pager.className = "pager";
    const prev = MATH_PAGES[idx - 1];
    const next = MATH_PAGES[idx + 1];
    pager.innerHTML = `
      ${prev
        ? `<a href="${prev.file}"><span class="dir">← 前へ</span>${prev.no}: ${prev.title}</a>`
        : `<a href="../index.html"><span class="dir">← 戻る</span>表紙（学習マップ）</a>`}
      ${next
        ? `<a class="next" href="${next.file}"><span class="dir">次へ →</span>${next.no}: ${next.title}</a>`
        : `<a class="next" href="../index.html"><span class="dir">完走！</span>表紙に戻る</a>`}
    `;
    document.querySelector(".lesson")?.appendChild(pager);
  }
}

// ---------------- 生きた数式 ----------------
// formulaEl 内の [data-t] 項の hover を widget.setHighlight(key|null) へ流す。
// 複数の数式を同じウィジェットへ束ねてよい。
export function bindFormula(formulaSel, widget) {
  const els = typeof formulaSel === "string" ? document.querySelectorAll(formulaSel) : [formulaSel];
  els.forEach((formulaEl) => {
    formulaEl.querySelectorAll("[data-t]").forEach((term) => {
      term.addEventListener("mouseenter", () => widget.setHighlight?.(term.dataset.t));
      term.addEventListener("mouseleave", () => widget.setHighlight?.(null));
      term.addEventListener("click", () => widget.setHighlight?.(term.dataset.t));
    });
  });
}

// ---------------- 電卓タイム ----------------
// { q: 問題文HTML, prefix, suffix, answer: 数値 or [数値,数値], tolerance, onCorrect }
export function calcTime(container, opts) {
  const host = typeof container === "string" ? document.querySelector(container) : container;
  if (!host) return;
  const answers = Array.isArray(opts.answer) ? opts.answer : [opts.answer];
  const tol = opts.tolerance ?? 0.05;

  const box = document.createElement("div");
  box.className = "calc-time";
  box.innerHTML = `<h4>🧮 電卓タイム ― 実際に数を入れてみる</h4><p class="calc-q">${opts.q}</p>`;
  const row = document.createElement("div");
  row.className = "calc-row";
  if (opts.prefix) row.insertAdjacentHTML("beforeend", `<span>${opts.prefix}</span>`);
  const inputs = answers.map((_, i) => {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.step = "any";
    inp.placeholder = "?";
    row.appendChild(inp);
    if (i < answers.length - 1) row.insertAdjacentHTML("beforeend", `<span>,</span>`);
    return inp;
  });
  if (opts.suffix) row.insertAdjacentHTML("beforeend", `<span>${opts.suffix}</span>`);
  const btn = document.createElement("button");
  btn.textContent = "答え合わせ";
  btn.className = "primary";
  row.appendChild(btn);
  const fb = document.createElement("div");
  fb.className = "calc-fb";
  box.appendChild(row);
  box.appendChild(fb);
  host.appendChild(box);

  btn.addEventListener("click", () => {
    const vals = inputs.map((i) => parseFloat(i.value));
    if (vals.some((v) => Number.isNaN(v))) {
      fb.className = "calc-fb ng";
      fb.textContent = "数字を入れてから押してください。";
      return;
    }
    const allOk = vals.every((v, i) => Math.abs(v - answers[i]) <= tol);
    if (allOk) {
      fb.className = "calc-fb ok";
      fb.textContent = "⭕ 正解！ " + (opts.okText || "式が言っている通りの結果です。");
      opts.onCorrect?.();
    } else {
      fb.className = "calc-fb ng";
      fb.textContent = "❌ 惜しい。" + (opts.hint || "読み下しの文をもう一度たどってみてください。");
    }
  });
}

// ---------------- Canvas ウィジェット土台 ----------------
// 数学トラックのウィジェットは全部 2D Canvas。ワールド座標(数学系: yは上がプラス)で描ける薄いラッパ。
export function mathCanvas(host, { range = 5, draw }) {
  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const state = { hover: null };

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    canvas.width = w * Math.min(devicePixelRatio, 2);
    canvas.height = h * Math.min(devicePixelRatio, 2);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    render();
  }
  new ResizeObserver(resize).observe(host);

  function unit() {
    return Math.min(canvas.width, canvas.height) / (range * 2);
  }
  function toPx(x, y) {
    return [canvas.width / 2 + x * unit(), canvas.height / 2 - y * unit()];
  }
  function toWorld(px, py) {
    const r = canvas.getBoundingClientRect();
    const cx = (px - r.left) * (canvas.width / r.width);
    const cy = (py - r.top) * (canvas.height / r.height);
    return [(cx - canvas.width / 2) / unit(), (canvas.height / 2 - cy) / unit()];
  }

  const api = {
    canvas, ctx, toPx, toWorld, unit,
    get hover() { return state.hover; },
    grid(step = 1) {
      const u = unit();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#05060a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#1c212b";
      for (let i = -Math.ceil(range * 2); i <= Math.ceil(range * 2); i += step) {
        const [x1] = toPx(i, 0); const [, y1] = toPx(0, i);
        ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(canvas.width, y1); ctx.stroke();
      }
      // axes
      ctx.strokeStyle = "#39404e";
      ctx.lineWidth = 2;
      const [ox, oy] = toPx(0, 0);
      ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(canvas.width, oy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, canvas.height); ctx.stroke();
      // ticks labels
      ctx.fillStyle = "#5b6473";
      ctx.font = `${Math.min(15, Math.round(u * 0.28))}px sans-serif`;
      for (let i = -Math.floor(range); i <= Math.floor(range); i++) {
        if (i === 0) continue;
        const [tx, ty] = toPx(i, 0);
        ctx.fillText(String(i), tx - 6, oy + u * 0.35);
        const [tx2, ty2] = toPx(0, i);
        ctx.fillText(String(i), ox + 8, ty2 + 4);
      }
    },
    arrow(x0, y0, x1, y1, color, width = 3, hl = false) {
      const [ax, ay] = toPx(x0, y0);
      const [bx, by] = toPx(x1, y1);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = hl ? width + 3 : width;
      if (hl) { ctx.shadowColor = color; ctx.shadowBlur = 16; }
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      const ang = Math.atan2(by - ay, bx - ax);
      const s = 12 + (hl ? 4 : 0);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - s * Math.cos(ang - 0.42), by - s * Math.sin(ang - 0.42));
      ctx.lineTo(bx - s * Math.cos(ang + 0.42), by - s * Math.sin(ang + 0.42));
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    },
    dot(x, y, color, r = 7, hl = false) {
      const [px, py] = toPx(x, y);
      if (hl) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(px, py, hl ? r + 3 : r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    },
    label(text, x, y, color = "#cfd6e4", dx = 10, dy = -10) {
      const [px, py] = toPx(x, y);
      ctx.fillStyle = color;
      ctx.font = `bold ${Math.min(19, Math.round(unit() * 0.32))}px sans-serif`;
      ctx.fillText(text, px + dx, py + dy);
    },
    dashed(x0, y0, x1, y1, color, hl = false) {
      const [ax, ay] = toPx(x0, y0);
      const [bx, by] = toPx(x1, y1);
      ctx.strokeStyle = color;
      ctx.lineWidth = hl ? 4 : 2;
      if (hl) { ctx.shadowColor = color; ctx.shadowBlur = 14; }
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    },
    render,
    setHighlight(key) { state.hover = key; render(); },
  };

  function render() {
    if (!canvas.width) return;
    draw(api);
  }
  setTimeout(resize, 30);
  return api;
}

// スライダー1本（数学トラック用・値表示付き）
export function mSlider(host, { label, min, max, step, value, format = (v) => String(v), onInput, id }) {
  const wrap = document.createElement("label");
  wrap.className = "field";
  const val = document.createElement("span");
  val.className = "val";
  val.textContent = format(value);
  const input = document.createElement("input");
  Object.assign(input, { type: "range", min, max, step, value });
  if (id) input.id = id;
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    val.textContent = format(v);
    onInput(v);
  });
  const row = document.createElement("div");
  row.className = "field inline";
  row.append(input, val);
  wrap.append(Object.assign(document.createElement("span"), { textContent: label }), row);
  (typeof host === "string" ? document.querySelector(host) : host).appendChild(wrap);
  return input;
}
