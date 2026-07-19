import { initSection1 } from "./section1-points.js";
import { initSection2a, initSection2b, initSection2c, initSection2d } from "./section2-spaces.js";
import { initSection3 } from "./section3-passes.js";
import { initSection4 } from "./section4-quadoverdraw.js";
import { initSection5 } from "./section5-meshlet.js";
import { initSection6 } from "./section6-nanite.js";

function initAll() {
  initSection1();
  initSection2a();
  initSection2b();
  initSection2c();
  initSection2d();
  initSection3();
  initSection4();
  initSection5();
  initSection6();
}

initAll();

// TOC active-state highlighting
const navLinks = Array.from(document.querySelectorAll("[data-nav]"));
const sections = navLinks
  .map((a) => document.querySelector(a.getAttribute("href")))
  .filter(Boolean);

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = `#${entry.target.id}`;
      navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === id));
    });
  },
  { rootMargin: "-40% 0px -55% 0px" }
);
sections.forEach((s) => io.observe(s));
