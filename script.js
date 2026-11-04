/* ==========================================================================
   SUBMARINER — scroll-driven product showcase (GSAP + ScrollTrigger)
   ==========================================================================
   Imagen del producto:  /assets/product.png   (ver index.html, #watchImg)
   Toda la animación es UN solo timeline con scrub ligado al scroll y pin.
   Solo se animan transform + opacity (GPU). El tema claro/oscuro se hace
   animando 3 variables CSS (--bg, --ink, --muted) del stage.
   ========================================================================== */

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------ AJUSTES RÁPIDOS ------------------------------ */
const SCRUB         = true;     // true = pegado al scroll. 0.8 = un poco de inercia suave.
const SCROLL_LENGTH = "+=1300%"; // largo del scroll pineado (más = más lento, mejor para grabar)
const EASE          = "power2.inOut";
const DEPTH_LAYERS  = 7;        // capas traseras para simular grosor al rotar (0 = desactivar)

// Vista explotada: radios como fracción del ALTO de tu imagen (reloj centrado).
// Si tu PNG está recortado distinto, ajusta estos 3 números hasta que cada capa coincida.
const PARTS = { cx: 0.47, cy: 0.40, caseR: 0.252, dialR: 0.18, hubR: 0.045 }; // cx/cy = centro del reloj en la imagen (0–1)

const THEME_LIGHT = { "--bg": "#f5f4f0", "--ink": "#0a0a0a", "--muted": "#8a8984" };
const THEME_DARK  = { "--bg": "#0b0b0c", "--ink": "#f5f4f0", "--muted": "#8b8b88" };
/* ----------------------------------------------------------------------------- */

ScrollTrigger.config({ ignoreMobileResize: true });

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const stage       = $("#stage");
const titleEl     = $("#title");
const titleWord   = $("#titleWord");
const watchWrap   = $("#watchWrap");
const watchEl     = $("#watch");
const watchInner  = $("#watchInner");
const watchImg    = $("#watchImg");
const floorShadow = $("#floorShadow");
const orbit       = $("#orbit");
const orbitCircle = $("#orbit circle");
const canvas      = $("#ribbons");
const scrim       = $(".scrim");
const label       = $("#label");
const hint        = $("#hint");
const counter     = $("#counter");
const counterNow  = $("#counterNow");
const callouts    = $$(".callout");

/* ---------- 1) Título en letras ---------- */
const text = titleWord.textContent.trim();
titleWord.textContent = "";
titleWord.setAttribute("aria-hidden", "true");
const chars = [...text].map((ch) => {
  const s = document.createElement("span");
  s.className = "title__char";
  s.textContent = ch;
  titleWord.appendChild(s);
  return s;
});

/* ---------- 2) Grosor 3D + partes de la vista explotada ---------- */
const layers = [];
const parts = {};   // strap, bezel, dial, hub

function mkClone(cls) {
  const c = new Image();
  c.src = watchImg.currentSrc || watchImg.src;
  c.alt = "";
  c.className = cls;
  c.setAttribute("aria-hidden", "true");
  c.draggable = false;
  return c;
}

function buildClones() {
  layers.forEach((l) => l.remove());
  layers.length = 0;
  Object.values(parts).forEach((p) => p.remove());

  for (let i = 1; i <= DEPTH_LAYERS; i++) {
    const c = mkClone("watch__layer");
    c.style.transform = `translateZ(${-i * 2.2}px)`;
    watchInner.insertBefore(c, watchImg);
    layers.push(c);
  }
  // 4 capas que se separan en Z (cada una recorta una zona del MISMO png)
  parts.strap = mkClone("watch__part");
  parts.bezel = mkClone("watch__part");
  parts.dial  = mkClone("watch__part");
  parts.hub   = mkClone("watch__part");
  Object.values(parts).forEach((p) => watchInner.appendChild(p));
  sizeParts();
}

// Máscaras en px según el tamaño real del reloj en pantalla
function sizeParts() {
  if (!parts.strap) return;
  const H = watchEl.offsetHeight || 1;
  const rc = PARTS.caseR * H, rd = PARTS.dialR * H, rh = PARTS.hubR * H;
  const hole = (r) => `radial-gradient(circle at ${PARTS.cx * 100}% ${PARTS.cy * 100}%, transparent ${r}px, #000 ${r + 0.8}px)`;
  const ring = `radial-gradient(circle at ${PARTS.cx * 100}% ${PARTS.cy * 100}%, transparent ${rd}px, #000 ${rd + 0.8}px, #000 ${rc}px, transparent ${rc + 0.8}px)`;
  const disc = (r) => `radial-gradient(circle at ${PARTS.cx * 100}% ${PARTS.cy * 100}%, #000 ${r}px, transparent ${r + 0.8}px)`;
  const set = (el, m) => { el.style.webkitMaskImage = m; el.style.maskImage = m; };
  set(parts.strap, hole(rc));
  set(parts.bezel, ring);
  set(parts.dial,  disc(rd));
  set(parts.hub,   disc(rh));
}

function fitAspect() {
  if (watchImg.naturalWidth) {
    watchWrap.style.aspectRatio = `${watchImg.naturalWidth} / ${watchImg.naturalHeight}`;
  }
  sizeParts();
}
watchImg.complete ? fitAspect() : watchImg.addEventListener("load", fitAspect);
buildClones();
watchImg.addEventListener("fallback", () => {
  buildClones();
  watchImg.addEventListener("load", fitAspect, { once: true });
});
window.addEventListener("resize", sizeParts);

/* ---------- 3) Listones (canvas) ---------- */
const ctx2d = canvas.getContext("2d");
const ribbon = { t: 0, cx: 0, cy: 0 };
let cw = 0, ch = 0;

function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = canvas.clientWidth; ch = canvas.clientHeight;
  canvas.width = cw * dpr; canvas.height = ch * dpr;
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}
sizeCanvas();
window.addEventListener("resize", () => { sizeCanvas(); drawRibbons(); });

function drawRibbons() {
  ctx2d.clearRect(0, 0, cw, ch);
  if (ribbon.t <= 0) return;
  const t = ribbon.t;
  const R = Math.min(cw, ch) * 0.62;
  const N = 46;
  ctx2d.lineWidth = 1;
  for (let k = 0; k < N; k++) {
    const kk = k / N;
    ctx2d.beginPath();
    ctx2d.strokeStyle = `rgba(245,244,240,${0.16 + 0.45 * (1 - Math.abs(kk - 0.5) * 2)})`;
    const rot = kk * 1.4 + t * 1.2;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let s = 0; s <= 160; s++) {
      const th = (s / 160) * Math.PI * 2;
      const a = 0.55 + 0.45 * Math.sin(t * 5 + kk * 6);
      const x0 = R * (Math.cos(th) + 0.38 * Math.cos(2 * th + kk * 5 + t * 6) * a);
      const y0 = R * 0.55 * (Math.sin(th) + 0.55 * Math.sin(3 * th - kk * 4 + t * 4) * a);
      const x = ribbon.cx + x0 * cr - y0 * sr;
      const y = ribbon.cy + x0 * sr + y0 * cr;
      s ? ctx2d.lineTo(x, y) : ctx2d.moveTo(x, y);
    }
    ctx2d.closePath();
    ctx2d.stroke();
  }
}

/* ---------- 4) Pasos: pose 3D + callout + tema ---------- */
// xPercent / yPercent = enfoque relativo al tamaño del reloj; ox / oy = hueco para el texto (fracción de viewport)
const STEPS = [
  { // 01 — CERAMIC BEZEL
    theme: "light",
    portrait:  { rotationX: 34, rotationY: 14,  rotationZ: -16, scale: 1.6,  xPercent: 30,  yPercent: 18,  ox: 0,     oy: -0.07 },
    landscape: { rotationX: 30, rotationY: 18,  rotationZ: -14, scale: 1.5,  xPercent: 25,  yPercent: 13,  ox: 0.18,  oy: 0 },
  },
  { // 02 — 300M WATERPROOF (corona)
    theme: "light",
    portrait:  { rotationX: 8,  rotationY: -48, rotationZ: 7,   scale: 1.7,  xPercent: -55, yPercent: 0,   ox: 0,     oy: -0.07 },
    landscape: { rotationX: 6,  rotationY: -44, rotationZ: 6,   scale: 1.6,  xPercent: -45, yPercent: 0,   ox: -0.18, oy: 0 },
  },
  { // 03 — LAYER BY LAYER (vista explotada, tema oscuro)
    theme: "dark", explode: true,
    portrait:  { rotationX: 16, rotationY: -56, rotationZ: -6,  scale: 1.05, xPercent: 0,   yPercent: 0,   ox: 0,     oy: -0.1 },
    landscape: { rotationX: 14, rotationY: -56, rotationZ: -6,  scale: 1.1,  xPercent: 0,   yPercent: 0,   ox: 0.2,   oy: 0 },
  },
  { // 04 — MECHANICAL HEART (acercamiento a la esfera + listones)
    theme: "dark", ribbons: true,
    portrait:  { rotationX: 0,  rotationY: 0,   rotationZ: 0,   scale: 1.55, xPercent: 0,   yPercent: 0,   ox: 0,     oy: -0.1 },
    landscape: { rotationX: 0,  rotationY: 0,   rotationZ: 0,   scale: 1.6,  xPercent: 0,   yPercent: 0,   ox: -0.2,  oy: 0 },
  },
  { // 05 — OYSTER BRACELET
    theme: "light",
    portrait:  { rotationX: -38, rotationY: 10, rotationZ: 14,  scale: 1.5,  xPercent: -4,  yPercent: -44, ox: 0,     oy: -0.07 },
    landscape: { rotationX: -34, rotationY: 14, rotationZ: 12,  scale: 1.4,  xPercent: -3,  yPercent: -38, ox: 0.18,  oy: 0 },
  },
  { // 06 — SWISS MADE (frontal, cierre)
    theme: "light", last: true,
    portrait:  { rotationX: 0,  rotationY: 0,   rotationZ: 0,   scale: 0.92, xPercent: 0,   yPercent: 0,   ox: 0,     oy: -0.11 },
    landscape: { rotationX: 0,  rotationY: 0,   rotationZ: 0,   scale: 0.95, xPercent: 0,   yPercent: 0,   ox: 0,     oy: 0 },
  },
];

const INTRO = {
  portrait:  { rotationX: 12, rotationY: -22, rotationZ: -5, scale: 1.06, yPercent: -2 },
  landscape: { rotationX: 10, rotationY: -22, rotationZ: -4, scale: 1.06, yPercent: -2 },
};

/* ---------- 5) Entrada de carga ---------- */
function playIntro() {
  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from(chars, { yPercent: 40, opacity: 0, duration: 1.1, stagger: 0.04 }, 0.1)
    .from(watchWrap, { opacity: 0, y: 60, scale: 0.94, duration: 1.4 }, 0.25)
    .from(floorShadow, { opacity: 0, scaleX: 0.6, duration: 1.4 }, 0.35)
    .from([label, hint], { opacity: 0, y: 12, duration: 1, stagger: 0.12 }, 0.9);
}

/* ---------- 6) Timeline principal ---------- */
const mm = gsap.matchMedia();

mm.add(
  { portrait: "(orientation: portrait)", landscape: "(orientation: landscape)" },
  (ctx) => {
    const mode = ctx.conditions.portrait ? "portrait" : "landscape";
    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;
    const allParts = Object.values(parts);
    const lineEls = $$(".callout__line");

    gsap.set(stage, THEME_LIGHT);
    gsap.set(watchEl, { transformPerspective: 0, rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1, x: 0, y: 0, xPercent: 0, yPercent: 0 });
    gsap.set(chars, { x: 0, y: 0, rotation: 0, opacity: 1 });
    gsap.set(titleEl, { scale: 1, opacity: 1 });
    gsap.set(callouts, { autoAlpha: 0, y: 36 });
    gsap.set(lineEls, { scaleX: 0 });
    gsap.set([scrim, counter, canvas], { opacity: 0 });
    gsap.set(allParts, { z: 0, autoAlpha: 0 });
    gsap.set(orbit, { rotation: -90, opacity: 1 });
    gsap.set(orbitCircle, { strokeDashoffset: 0.78 });
    ribbon.t = 0;
    drawRibbons();

    const tl = gsap.timeline({
      defaults: { ease: EASE },
      scrollTrigger: {
        trigger: stage,
        start: "top top",
        end: SCROLL_LENGTH,
        pin: true,
        pinSpacing: true,
        scrub: SCRUB,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    /* ---- PASO 0 · INTRO: el reloj gira y el título se "desarma" ---- */
    tl.to(watchEl, { ...INTRO[mode], duration: 1 }, 0)
      .to(floorShadow, { scaleX: 0.85, opacity: 0.8, duration: 1 }, 0)
      .to(chars, {
        x: (i, el) => (i - (chars.length - 1) / 2) * el.offsetWidth * 0.6,
        yPercent: (i) => (i % 2 ? 1 : -1) * (10 + ((i * 17) % 25)),
        rotation: (i) => (i % 2 ? 1 : -1) * (6 + ((i * 11) % 16)),
        opacity: 0.12,
        duration: 1,
      }, 0)
      .to(titleEl, { scale: 1.12, duration: 1 }, 0)
      .to(orbitCircle, { strokeDashoffset: 0, duration: 1 }, 0)
      .to(orbit, { rotation: 90, duration: 1.1 }, 0)
      .to([label, hint], { opacity: 0, y: -10, duration: 0.4 }, 0)
      .to(counter, { opacity: 1, duration: 0.4 }, 0.6)
      .to(scrim, { opacity: 1, duration: 0.6 }, 1.1);

    /* ---- PASOS 1–6 ---- */
    const START = 1;
    const STRIDE = 2;
    let theme = "light";

    STEPS.forEach((step, i) => {
      const t = START + i * STRIDE;
      const { ox, oy, ...to } = step[mode];
      const el = callouts[i];
      const line = $(".callout__line", el);

      // 1. el reloj viaja a su pose
      tl.to(watchEl, { ...to, x: () => ox * vw(), y: () => oy * vh(), duration: 1.1 }, t);

      // 2. sombra de piso
      tl.to(floorShadow, {
        scaleX: 0.7 + Math.abs(to.rotationY || 0) / 120,
        opacity: step.theme === "dark" ? 0 : 0.55,
        duration: 1.1,
      }, t);

      // 3. anillo orbital se va tras el primer paso
      if (i === 0) tl.to(orbit, { opacity: 0, scale: 1.25, duration: 0.8 }, t);

      // 4. tema claro <-> oscuro
      if (step.theme !== theme) {
        tl.to(stage, { ...(step.theme === "dark" ? THEME_DARK : THEME_LIGHT), duration: 1.1, ease: "power1.inOut" }, t);
        theme = step.theme;
      }

      // 5. vista explotada: el reloj se abre en capas y luego se vuelve a ensamblar
      if (step.explode) {
        const H = () => watchEl.offsetHeight;
        tl.set(watchImg, { autoAlpha: 0 }, t)
          .set(layers, { autoAlpha: 0 }, t)
          .set(allParts, { autoAlpha: 1 }, t)
          .to(parts.bezel, { z: () => H() * 0.16, duration: 1.1 }, t)
          .to(parts.dial,  { z: () => H() * 0.34, duration: 1.1 }, t)
          .to(parts.hub,   { z: () => H() * 0.52, duration: 1.1 }, t)
          .to(parts.strap, { z: () => -H() * 0.1, duration: 1.1 }, t);
      }
      if (STEPS[i - 1]?.explode) {
        // se cierra la explosión mientras viaja hacia el acercamiento
        tl.to(allParts, { z: 0, duration: 0.6 }, t)
          .set(allParts, { autoAlpha: 0 }, t + 0.62)
          .set(watchImg, { autoAlpha: 1 }, t + 0.62)
          .set(layers, { autoAlpha: 1 }, t + 0.62);
      }

      // 6. listones
      if (step.ribbons) {
        tl.call(() => { ribbon.cx = vw() / 2 + ox * vw(); ribbon.cy = vh() / 2 + oy * vh(); }, null, t)
          .to(ribbon, { t: 1, duration: 1.6, ease: "none", onUpdate: drawRibbons }, t)
          .to(canvas, { opacity: 1, duration: 0.8 }, t + 0.3);
      }
      if (STEPS[i - 1]?.ribbons) {
        tl.to(canvas, { opacity: 0, duration: 0.7 }, t)
          .to(ribbon, { t: 0, duration: 1, ease: "none", onUpdate: drawRibbons }, t);
      }

      // 7. cierre: el título vuelve a su sitio detrás del reloj
      if (step.last) {
        tl.to(chars, { x: 0, y: 0, yPercent: 0, rotation: 0, opacity: 1, duration: 1.1 }, t)
          .to(titleEl, { scale: 1, duration: 1.1 }, t)
          .to(scrim, { opacity: 0, duration: 1.1 }, t)
          .to(floorShadow, { scaleX: 1, opacity: 1, duration: 1.1 }, t);
      }

      // 8. contador
      tl.call(() => { counterNow.textContent = String(i + 1).padStart(2, "0"); }, null, t + 0.55);

      // 9. callout entra / sale
      tl.to(el, { autoAlpha: 1, y: 0, duration: 0.5 }, t + 0.7)
        .to(line, { scaleX: 1, duration: 0.5 }, t + 0.8);
      if (!step.last) tl.to(el, { autoAlpha: 0, y: -24, duration: 0.35 }, t + 1.6);
    });

    tl.to({}, { duration: 0.6 }); // cola para sostener el final
  }
);

/* ---------- 7) Arranque ---------- */
function start() {
  playIntro();
  ScrollTrigger.refresh();
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
else window.addEventListener("load", start);

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
