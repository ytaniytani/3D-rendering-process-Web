// 共通UI部品ヘルパー

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function slider({ label, min, max, step, value, format = (v) => v, onInput }) {
  const valSpan = el("span", { class: "val" }, format(value));
  const input = el("input", {
    type: "range",
    min: String(min),
    max: String(max),
    step: String(step),
    value: String(value),
  });
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    valSpan.textContent = format(v);
    onInput(v);
  });
  const field = el("label", { class: "field" }, [
    el("span", {}, label),
    el("div", { class: "field inline" }, [input, valSpan]),
  ]);
  field.input = input;
  return field;
}

export function numberField({ label, min, max, step, value, onInput }) {
  const input = el("input", { type: "number", min: String(min), max: String(max), step: String(step), value: String(value) });
  input.addEventListener("input", () => onInput(parseFloat(input.value) || 0));
  return el("label", { class: "field" }, [el("span", {}, label), input]);
}

export function button(label, onClick, primary = false) {
  return el("button", { class: primary ? "primary" : "", onclick: onClick }, label);
}

export function tabButton(label, onClick) {
  return el("button", { class: "tab", onclick: onClick }, label);
}

export function meter(initial = 0) {
  const bar = el("i", { style: `width:${100 - initial}%` });
  const wrap = el("div", { class: "meter" }, bar);
  wrap.setValue = (pct) => { bar.style.width = `${100 - Math.max(0, Math.min(100, pct))}%`; };
  return wrap;
}

export function overlayText(container) {
  const t = el("div", { class: "overlay-text" }, "");
  container.style.position = "relative";
  container.appendChild(t);
  return {
    show(msg) { t.textContent = msg; t.style.opacity = "1"; },
    hide() { t.style.opacity = "0"; },
  };
}
