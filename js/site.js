// 共通サイト機能: 章ナビ / 前後ページャー / クイズ / ガイド付きツアー / チェックリスト

export const PAGES = [
  { file: "ch1-coordinates.html", no: "第1章", title: "座標とは何か", time: "10分" },
  { file: "ch1b-vertex-polygon.html", no: "第1章b", title: "頂点とポリゴン", time: "10分" },
  { file: "ch2a-local-world.html", no: "第2章a", title: "ローカル空間とワールド空間", time: "12分" },
  { file: "ch2b-view.html", no: "第2章b", title: "ビュー空間", time: "12分" },
  { file: "ch2c-projection.html", no: "第2章c", title: "投影とクリップ", time: "12分" },
  { file: "ch2d-rasterize.html", no: "第2章d", title: "ラスタライズ", time: "10分" },
  { file: "ch3a-gbuffer.html", no: "第3章a", title: "G-Buffer", time: "12分" },
  { file: "ch3b-lighting.html", no: "第3章b", title: "ライティングパス", time: "10分" },
  { file: "ch3c-transparent-post.html", no: "第3章c", title: "半透明とポストプロセス", time: "10分" },
  { file: "ch4-quad-overdraw.html", no: "第4章", title: "クアッドの罠", time: "15分" },
  { file: "ch5-meshlet.html", no: "第5章", title: "Meshlet", time: "12分" },
  { file: "ch6-nanite.html", no: "第6章", title: "Nanite", time: "15分" },
  { file: "ch7-summary.html", no: "第7章", title: "まとめ", time: "10分" },
];

function currentIndex() {
  const f = location.pathname.split("/").pop();
  return PAGES.findIndex((p) => p.file === f);
}

export function renderChrome() {
  const idx = currentIndex();

  // header
  const header = document.createElement("header");
  header.className = "site-header";
  const nav = PAGES.map((p, i) => {
    const label = p.no.replace("第", "").replace("章", "");
    return `<a href="${p.file}" class="${i === idx ? "current" : ""}" title="${p.title}">${label}. ${p.title}</a>`;
  }).join("");
  header.innerHTML = `
    <div class="site-header-inner">
      <a class="home-link" href="../index.html">🏠 3DCG描画のしくみ</a>
      <nav class="chapter-nav">${nav}<a href="../glossary.html">用語集</a></nav>
    </div>`;
  document.body.prepend(header);

  // pager
  if (idx >= 0) {
    const pager = document.createElement("nav");
    pager.className = "pager";
    const prev = PAGES[idx - 1];
    const next = PAGES[idx + 1];
    pager.innerHTML = `
      ${prev
        ? `<a href="${prev.file}"><span class="dir">← 前のページ</span>${prev.no}: ${prev.title}</a>`
        : `<a class="disabled" href="#"></a>`}
      ${next
        ? `<a class="next" href="${next.file}"><span class="dir">次のページ →</span>${next.no}: ${next.title}</a>`
        : `<a class="next" href="../index.html"><span class="dir">読了！</span>表紙に戻る</a>`}
    `;
    const lesson = document.querySelector(".lesson");
    if (lesson) lesson.appendChild(pager);
  }
}

// ---------------- クイズ ----------------
// questions: [{ q, choices: [..], a: 正解index, exp: 解説 }]
export function renderQuiz(container, questions) {
  const wrap = typeof container === "string" ? document.querySelector(container) : container;
  if (!wrap) return;
  const h = document.createElement("h2");
  h.textContent = "理解度チェック";
  wrap.appendChild(h);

  questions.forEach((item, qi) => {
    const div = document.createElement("div");
    div.className = "quiz-item";
    div.innerHTML = `<p class="q">Q${qi + 1}. ${item.q}</p>`;
    const choices = document.createElement("div");
    choices.className = "choices";
    const explain = document.createElement("div");
    explain.className = "explain";

    item.choices.forEach((c, ci) => {
      const b = document.createElement("button");
      b.textContent = c;
      b.addEventListener("click", () => {
        if (div.dataset.done) return;
        div.dataset.done = "1";
        choices.querySelectorAll("button").forEach((x, xi) => {
          if (xi === item.a) x.classList.add("correct");
          else if (x === b) x.classList.add("wrong");
          x.disabled = true;
        });
        explain.textContent = (ci === item.a ? "⭕ 正解！ " : "❌ ざんねん。 ") + item.exp;
        explain.classList.add("show");
      });
      choices.appendChild(b);
    });
    div.appendChild(choices);
    div.appendChild(explain);
    wrap.appendChild(div);
  });
}

// ---------------- ガイド付きツアー ----------------
// steps: [{ sel: 対象セレクタ, text: 吹き出し文, set?: {sel, value} スライダー自動操作, click?: sel }]
let tourState = null;

export function startTour(steps) {
  endTour();
  tourState = { steps, i: -1, bubble: null, highlighted: null };
  const bubble = document.createElement("div");
  bubble.className = "tour-bubble";
  document.body.appendChild(bubble);
  tourState.bubble = bubble;
  nextStep();
}

function endTour() {
  if (!tourState) return;
  tourState.bubble?.remove();
  tourState.highlighted?.classList.remove("tour-highlight");
  tourState = null;
}

function nextStep() {
  if (!tourState) return;
  tourState.i++;
  const { steps, i, bubble } = tourState;
  if (i >= steps.length) { endTour(); return; }
  const step = steps[i];

  tourState.highlighted?.classList.remove("tour-highlight");
  const target = document.querySelector(step.sel);
  if (target) {
    target.classList.add("tour-highlight");
    tourState.highlighted = target;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // 自動操作
  if (step.set) {
    const input = document.querySelector(step.set.sel);
    if (input) animateSlider(input, step.set.value);
  }
  if (step.click) document.querySelector(step.click)?.click();

  bubble.innerHTML = `
    <div class="tour-step-no">ステップ ${i + 1} / ${steps.length}</div>
    <div>${step.text}</div>
    <div class="tour-actions">
      <button data-tour-end>やめる</button>
      <button data-tour-next>${i + 1 === steps.length ? "おわり" : "次へ"}</button>
    </div>`;
  bubble.querySelector("[data-tour-next]").addEventListener("click", nextStep);
  bubble.querySelector("[data-tour-end]").addEventListener("click", endTour);

  positionBubble(target);
}

function positionBubble(target) {
  const bubble = tourState?.bubble;
  if (!bubble) return;
  setTimeout(() => {
    const r = target ? target.getBoundingClientRect() : { top: innerHeight / 2, bottom: innerHeight / 2, left: innerWidth / 2, width: 0 };
    let top = r.bottom + 12;
    if (top + 160 > innerHeight) top = Math.max(12, r.top - 170);
    let left = Math.min(Math.max(12, r.left), innerWidth - 340);
    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
  }, 450); // scrollIntoView後に配置
}

function animateSlider(input, targetValue) {
  const from = parseFloat(input.value);
  const to = targetValue;
  const dur = 1200;
  const t0 = performance.now();
  function frame(t) {
    const k = Math.min(1, (t - t0) / dur);
    input.value = String(from + (to - from) * k);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (k < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function tourButton(container, steps, label = "▶ ガイド付きツアーを開始") {
  const host = typeof container === "string" ? document.querySelector(container) : container;
  if (!host) return;
  const b = document.createElement("button");
  b.className = "primary";
  b.textContent = label;
  b.addEventListener("click", () => startTour(steps));
  host.prepend(b);
}

// ---------------- チェックリスト ----------------
export function renderChecklist(container, items) {
  const host = typeof container === "string" ? document.querySelector(container) : container;
  if (!host) return;
  const div = document.createElement("div");
  div.className = "checklist";
  div.innerHTML = `<h4>✅ ここで確認してほしいこと</h4>`;
  items.forEach((text) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox"><span>${text}</span>`;
    div.appendChild(label);
  });
  host.appendChild(div);
}
