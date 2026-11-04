/* ==========================================================================
   SUBMARINER — scroll-driven product showcase (GSAP + ScrollTrigger)
   ==========================================================================
   Imagen del producto:  /assets/product.png   (ver index.html, #watchImg)
   Toda la animación es UN solo timeline con scrub ligado al scroll y pin.
   Solo se animan transform + opacity (GPU), nunca top/left.
   ========================================================================== */

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------ AJUSTES RÁPIDOS ------------------------------ */
const SCRUB        = true;   // true = pegado al scroll. Pon 0.8 si quieres un poco de "inercia" suave.
const SCROLL_LENGTH = "+=900%"; // largo del scroll pineado (más = más lento, mejor para grabar)
const EASE         = "power2.inOut";
const DEPTH_LAYERS = 7;      // capas traseras para simular grosor al rotar (0 = desactivar)
/* ----------------------------------------------------------------------------- */

ScrollTrigger.config({ ignoreMobileResize: true }); // la barra del navegador móvil no re-calcula todo

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
const scrim       = $(".scrim");
const label       = $("#label");
const hint        = $("#hint");
const counter     = $("#counter");
const counterNow  = $("#counterNow");
const callouts    = $$(".callout");

/* ---------- 1) Título: separar en letras (para poder "abrirlo" al scrollear) ---------- */
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

/* ---------- 2) Capas de grosor 3D (clones del <img> empujados en Z) ---------- */
const layers = [];
function buildDepth() {
  layers.forEach((l) => l.remove());
  layers.length = 0;
  for (let i = 1; i <= DEPTH_LAYERS; i++) {
    const c = new Image();
    c.src = watchImg.currentSrc || watchImg.src;
    c.alt = "";
    c.className = "watch__layer";
    c.setAttribute("aria-hidden", "true");
    c.draggable = false;
    c.style.transform = `translateZ(${-i * 2.2}px)`;
    watchInner.insertBefore(c, watchImg);
    layers.push(c);
  }
}
// la caja del reloj toma la proporción real de TU imagen (cualquier PNG funciona)
function fitAspect() {
  if (watchImg.naturalWidth) {
    watchWrap.style.aspectRatio = `${watchImg.naturalWidth} / ${watchImg.naturalHeight}`;
  }
}
watchImg.complete ? fitAspect() : watchImg.addEventListener("load", fitAspect);
buildDepth();
// si product.png no existe y se cambió al placeholder SVG, reconstruimos las capas
watchImg.addEventListener("fallback", () => { buildDepth(); watchImg.addEventListener("load", fitAspect, { once: true }); });

/* ---------- 3) Contenido de cada paso ---------- */
// Cada paso define una "pose" del reloj: rotación 3D, escala y el punto de enfoque.
// xPercent / yPercent = desplazamiento relativo al tamaño del reloj (para enfocar una zona).
// ox / oy             = desplazamiento de layout (fracción del viewport) para dejar sitio al texto.
const STEPS = [
  { // 01 — CERAMIC BEZEL (vista del bisel, arriba-izquierda)
    side: "left",
    portrait:  { rotationX: 34, rotationY: 14,  rotationZ: -16, scale: 1.6,  xPercent: 30,  yPercent: 18,  ox: 0,     oy: -0.07 },
    landscape: { rotationX: 30, rotationY: 18,  rotationZ: -14, scale: 1.5,  xPercent: 25,  yPercent: 13,  ox: 0.18,  oy: 0 },
  },
  { // 02 — 300M WATERPROOF (vista de la corona, lado derecho)
    side: "right",
    portrait:  { rotationX: 8,  rotationY: -48, rotationZ: 7,   scale: 1.7,  xPercent: -55, yPercent: 0,   ox: 0,     oy: -0.07 },
    landscape: { rotationX: 6,  rotationY: -44, rotationZ: 6,   scale: 1.6,  xPercent: -45, yPercent: 0,   ox: -0.18, oy: 0 },
  },
  { // 03 — OYSTER BRACELET (vista de la correa, parte inferior)
    side: "left",
    portrait:  { rotationX: -38, rotationY: 10, rotationZ: 14,  scale: 1.5,  xPercent: -4,  yPercent: -44, ox: 0,     oy: -0.07 },
    landscape: { rotationX: -34, rotationY: 14, rotationZ: 12,  scale: 1.4,  xPercent: -3,  yPercent: -38, ox: 0.18,  oy: 0 },
  },
  { // 04 — SWISS MADE (frontal, cierre)
    side: "center",
    portrait:  { rotationX: 0,  rotationY: 0,   rotationZ: 0,   scale: 0.92, xPercent: 0,   yPercent: 0,   ox: 0,     oy: -0.11 },
    landscape: { rotationX: 0,  rotationY: 0,   rotationZ: 0,   scale: 0.95, xPercent: 0,   yPercent: 0,   ox: 0,     oy: 0 },
  },
];

// Pose del primer paso del scroll (el reloj "se despierta" y gira un poco)
const INTRO = {
  portrait:  { rotationX: 12, rotationY: -22, rotationZ: -5, scale: 1.06, yPercent: -2 },
  landscape: { rotationX: 10, rotationY: -22, rotationZ: -4, scale: 1.06, yPercent: -2 },
};

/* ---------- 4) Entrada (carga de página, independiente del scroll) ---------- */
function playIntro() {
  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from(chars, { yPercent: 40, opacity: 0, duration: 1.1, stagger: 0.04 }, 0.1)
    .from(watchWrap, { opacity: 0, y: 60, scale: 0.94, duration: 1.4 }, 0.25)
    .from(floorShadow, { opacity: 0, scaleX: 0.6, duration: 1.4 }, 0.35)
    .from([label, hint], { opacity: 0, y: 12, duration: 1, stagger: 0.12 }, 0.9);
}

/* ---------- 5) Timeline principal ligado al scroll ---------- */
const mm = gsap.matchMedia();

mm.add(
  { portrait: "(orientation: portrait)", landscape: "(orientation: landscape)" },
  (ctx) => {
    const mode = ctx.conditions.portrait ? "portrait" : "landscape";
    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;

    // estado inicial de todo lo que se anima con scroll
    gsap.set(watchEl, { transformPerspective: 0, rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1, x: 0, y: 0, xPercent: 0, yPercent: 0 });
    gsap.set(chars, { x: 0, opacity: 1 });
    gsap.set(titleEl, { scale: 1, opacity: 1 });
    gsap.set(callouts, { autoAlpha: 0, y: 36 });
    gsap.set($$(".callout__line"), { scaleX: 0 });
    gsap.set(scrim, { opacity: 0 });
    gsap.set(counter, { opacity: 0 });

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
        invalidateOnRefresh: true, // recalcula valores en función de la pantalla (resize / rotación)
      },
    });

    /* ---- PASO 0 · INTRO: el reloj gira y el título se "abre" ---- */
    tl.to(watchEl, { ...INTRO[mode], duration: 1 }, 0)
      .to(floorShadow, { scaleX: 0.85, opacity: 0.8, duration: 1 }, 0)
      // las letras se separan desde el centro hacia afuera y se desvanecen
      .to(
        chars,
        {
          x: (i, el) => (i - (chars.length - 1) / 2) * el.offsetWidth * 0.55,
          opacity: 0.12,
          duration: 1,
        },
        0
      )
      .to(titleEl, { scale: 1.12, duration: 1 }, 0)
      .to([label, hint], { opacity: 0, y: -10, duration: 0.4 }, 0)
      .to(counter, { opacity: 1, duration: 0.4 }, 0.6)
      .to(scrim, { opacity: 1, duration: 0.6 }, 1.1);

    /* ---- PASOS 1–4 · features ---- */
    const START = 1;   // dónde empieza el primer feature (en unidades del timeline)
    const STRIDE = 2;  // duración de cada feature

    STEPS.forEach((step, i) => {
      const t = START + i * STRIDE;
      const pose = step[mode];
      const { ox, oy, ...to } = pose;
      const el = callouts[i];
      const line = $(".callout__line", el);
      const isLast = i === STEPS.length - 1;

      // 1. el reloj viaja a su nueva pose (rotación 3D + escala + enfoque)
      tl.to(
        watchEl,
        {
          ...to,
          x: () => ox * vw(),
          y: () => oy * vh(),
          duration: 1.1,
        },
        t
      );

      // 2. la sombra de piso acompaña la rotación
      tl.to(
        floorShadow,
        { scaleX: 0.7 + Math.abs(to.rotationY || 0) / 120, opacity: 0.55, duration: 1.1 },
        t
      );

      // 3. contador "01 / 04"
      tl.call(() => { counterNow.textContent = String(i + 1).padStart(2, "0"); }, null, t + 0.55);

      // 4. título: en el cierre vuelve a su sitio (detrás del reloj) como remate del hero
      if (isLast) {
        tl.to(chars, { x: 0, opacity: 1, duration: 1.1 }, t)
          .to(titleEl, { scale: 1, duration: 1.1 }, t)
          .to(scrim, { opacity: 0.0, duration: 1.1 }, t)
          .to(floorShadow, { scaleX: 1, opacity: 1, duration: 1.1 }, t);
      }

      // 5. callout entra (y su línea se dibuja)
      tl.to(el, { autoAlpha: 1, y: 0, duration: 0.5 }, t + 0.7)
        .to(line, { scaleX: 1, duration: 0.5 }, t + 0.8);

      // 6. callout sale antes del siguiente movimiento (el último se queda hasta el final)
      if (!isLast) {
        tl.to(el, { autoAlpha: 0, y: -24, duration: 0.35 }, t + 1.6);
      }
    });

    // pequeña cola para sostener el final antes de soltar el pin
    tl.to({}, { duration: 0.6 });

    return () => {
      // limpieza al cambiar de orientación (matchMedia revierte los tweens)
    };
  }
);

/* ---------- 6) Arranque ---------- */
function start() {
  playIntro();
  ScrollTrigger.refresh();
}
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(start);
} else {
  window.addEventListener("load", start);
}

// volver arriba al recargar (evita empezar a mitad del pin al grabar)
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
