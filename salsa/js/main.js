/* =====================================================================
   MAGMA — escena 3D principal + coreografía de scroll + interacciones
   ===================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";
import { FLAVORS, smokeTexture, emberTexture, patternDataURL, grainDataURL } from "./textures.js";
import { createJar, createFlakes, setJarFlavor, flavorTextures } from "./models.js";
import { Studio, SHOTS } from "./studio.js";

/* ------------------------------ AJUSTES ------------------------------
   PHOTOS: si tenés fotos reales, poné aquí la ruta y reemplaza al render 3D.
   Ej: explosion: "images/manos-especias.jpg"                              */
const PHOTOS = {
  // explosion: "images/manos-especias.jpg",
  // bowl: "images/cocinando.jpg",
  // flatlay: "images/ingredientes.jpg",
};
const SCRUB = 1.2;          // inercia del frasco respecto al scroll
/* -------------------------------------------------------------------- */

gsap.registerPlugin(ScrollTrigger);
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const touch = matchMedia("(hover: none)").matches;

const loader = { count: $("#loaderCount"), bar: $("#loaderBar"), label: $("#loaderLabel"), v: 0 };
function progress(v, label) {
  loader.v = v;
  loader.count.textContent = Math.round(v * 100);
  loader.bar.style.width = v * 100 + "%";
  if (label) loader.label.textContent = label;
}
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

/* ===================== ESCENA PRINCIPAL ===================== */
const canvas = $("#gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.5 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0, 6.2);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const key = new THREE.DirectionalLight(0xfff1e0, 2.6); key.position.set(3, 4, 5); scene.add(key);
const rimA = new THREE.PointLight(0xff8a2e, 26, 20); rimA.position.set(-3.2, 2.2, -2.2); scene.add(rimA);
const rimB = new THREE.PointLight(0x9dff6a, 14, 20); rimB.position.set(3.4, -0.6, -2); scene.add(rimB);
const glow = new THREE.PointLight(0xff5a1f, 0, 6); glow.position.set(0, 1.4, 1.2); scene.add(glow);
scene.add(new THREE.HemisphereLight(0xfff4e8, 0x0f3d2e, 0.45));

let jar, flakes, embers, steam = [];
const pivot = new THREE.Group();   // posición/rotación de la coreografía
pivot.rotation.order = "ZXY";      // ry = gira sobre su propio eje, rx = inclina, rz = rueda en pantalla
const mouseG = new THREE.Group();  // parallax del mouse
mouseG.add(pivot); scene.add(mouseG);

/* Poses del frasco en cada sección de la historia (x, y, z, rx, ry, rz, s, lid, steam, glow) */
const POSES = [
  { x: 0,    y: -0.32, z: 0,   rx: 0.1,  ry: -0.45,               rz: 0,     s: 1,    lid: 0,    steam: 0.55, glow: 0 },   // hero
  { x: 0,    y: -0.05, z: 0.2, rx: 0.32, ry: -0.45 + Math.PI * 2, rz: -0.28, s: 1.06, lid: 0,    steam: 0.35, glow: 0.2 }, // nuevo ángulo
  { x: 0,    y: -0.25, z: 0.9, rx: 0.5,  ry: Math.PI * 2 + 0.25,  rz: 0.32,  s: 1.02, lid: 1,    steam: 1.4,  glow: 1 },   // destapá
  { x: 0,    y: 0,     z: 0.3, rx: 1.42, ry: Math.PI * 3.5,       rz: 0,     s: 1.12, lid: 0,    steam: 0.1,  glow: 0.2 }, // tapa
  { x: 0.95, y: -0.1,  z: 0,   rx: 0.3,  ry: Math.PI * 4 - 0.35,  rz: -1.2,  s: 1.05, lid: 0,    steam: 0.2,  glow: 0 },   // perspectiva
];
const state = { ...POSES[0], exit: 0, intro: 0 };
const extra = { spin: 0, pop: 0 };                             // giro del cambio de sabor
const drag = { on: false, x: 0, rot: 0, vel: 0, used: false }; // girar arrastrando
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
let running = true;

function layout() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
const fit = () => {
  const a = innerWidth / innerHeight;
  return { s: THREE.MathUtils.clamp(a / 1.25, 0.62, 1), x: a < 0.9 ? 0.15 : 1, y: a < 0.9 ? -0.05 : 0 };
};

function buildMain() {
  jar = createJar(FLAVORS[0]);
  pivot.add(jar);
  flakes = createFlakes(touch ? 50 : 90, 1, [7, 5, 4.5]);
  flakes.position.z = -0.4;
  scene.add(flakes);
  const tex = smokeTexture();
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, color: 0xfff3e2 }));
    m.userData = { life: i / 22, speed: 0.18 + Math.random() * 0.12, drift: (Math.random() - 0.5) * 0.5, rot: (Math.random() - 0.5) * 0.6 };
    scene.add(m);
    steam.push(m);
  }
  // chispas de lava que suben (brillan más al destapar el frasco)
  const N = touch ? 60 : 130;
  const pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 7; pos[i * 3 + 1] = (Math.random() - 0.5) * 5; pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    seeds.push({ sp: 0.15 + Math.random() * 0.35, ph: Math.random() * 6.28, amp: 0.05 + Math.random() * 0.15 });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  embers = new THREE.Points(g, new THREE.PointsMaterial({ map: emberTexture(), size: 0.11, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  embers.userData = { seeds };
  scene.add(embers);
}

const tmpV = new THREE.Vector3();
const clock = new THREE.Clock();
let scrollY = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (running && jar) {
    const f = fit();
    // mouse con suavizado
    mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06;
    mouseG.rotation.y = mouse.sx * 0.22; mouseG.rotation.x = mouse.sy * 0.12;

    const intro = state.intro;
    pivot.position.set(state.x * f.x, state.y - f.y + Math.sin(t * 1.3) * 0.04 + state.exit * 3.6 + (1 - intro) * -0.6, state.z);
    // arrastre con inercia; al soltar vuelve suave a mostrar el frente
    if (!drag.on) {
      drag.rot += drag.vel; drag.vel *= 0.94;
      if (Math.abs(drag.vel) < 0.002) drag.rot += (Math.round(drag.rot / (Math.PI * 2)) * Math.PI * 2 - drag.rot) * 0.03;
    }
    pivot.rotation.set(state.rx + Math.sin(t * 0.9) * 0.03, state.ry + extra.spin + drag.rot + Math.sin(t * 0.45) * 0.22 + (1 - intro) * -2.4, state.rz + Math.cos(t * 0.8) * 0.02);
    pivot.scale.setScalar(state.s * f.s * (0.6 + 0.4 * intro) * (1 - state.exit * 0.3) * (1 + extra.pop * 0.08));

    const { lid } = jar.userData;
    lid.position.set(state.lid * 0.12, state.lid * 0.5, 0);
    lid.rotation.z = -state.lid * 0.38;
    glow.intensity = state.glow * 14;

    // humo: nace en la boca del frasco y sube en el mundo
    jar.userData.body.localToWorld(tmpV.set(0, 1.45, 0));
    steam.forEach((m) => {
      const u = m.userData;
      u.life += dt * u.speed;
      if (u.life > 1) { u.life -= 1; u.drift = (Math.random() - 0.5) * 0.5; }
      const L = u.life;
      m.position.set(tmpV.x + u.drift * L + Math.sin(t + L * 6) * 0.08, tmpV.y + L * 1.3, tmpV.z + 0.05);
      m.scale.setScalar((0.35 + L * 1.1) * pivot.scale.x);
      m.material.rotation += u.rot * dt;
      m.material.opacity = Math.sin(L * Math.PI) * 0.26 * state.steam * intro * (1 - state.exit);
    });

    // especias flotando con parallax de scroll
    const { data, dummy, box } = flakes.userData;
    const sp = scrollY * 0.0012;
    data.forEach((d) => {
      const depth = 0.6 + (d.z + box[2] / 2) / box[2];
      let y = d.y - t * d.fall + sp * depth * 1.4;
      y = ((((y + box[1] / 2) % box[1]) + box[1]) % box[1]) - box[1] / 2;
      dummy.position.set(d.x + mouse.sx * depth * 0.15, y, d.z);
      dummy.rotation.set(d.rx + t * d.spin, d.ry + t * d.spin * 0.7, 0);
      dummy.scale.setScalar(d.s * intro * (1 - state.exit));
      dummy.updateMatrix();
      d.mesh.setMatrixAt(d.i, dummy.matrix);
    });
    flakes.children.forEach((m) => (m.instanceMatrix.needsUpdate = true));
    flakes.position.y = state.exit * 2;

    // chispas
    const ep = embers.geometry.attributes.position, es = embers.userData.seeds;
    for (let i = 0; i < es.length; i++) {
      let y = ep.getY(i) + dt * es[i].sp * (1 + state.glow * 1.5);
      if (y > 2.6) y = -2.6;
      ep.setY(i, y);
      ep.setX(i, ep.getX(i) + Math.sin(t * 1.5 + es[i].ph) * es[i].amp * dt);
    }
    ep.needsUpdate = true;
    embers.material.opacity = (0.35 + state.glow * 0.65) * intro * (1 - state.exit);

    renderer.render(scene, camera);
  }
}

/* ===================== FOTOS (render o reales) ===================== */
async function makePhotos() {
  const keys = [...new Set($$("img[data-render]").map((i) => i.dataset.render))];
  const studio = new Studio();
  let done = 0;
  for (const k of keys) {
    let url = PHOTOS[k];
    if (!url && SHOTS[k]) url = await SHOTS[k](studio);
    $$(`img[data-render="${k}"]`).forEach((img) => {
      img.onload = () => img.classList.add("is-ready");
      img.src = url;
    });
    done++;
    progress(0.3 + 0.68 * (done / keys.length), "Preparando la cocina… " + done + "/" + keys.length);
    await frame();
  }
  studio.dispose();
}

/* ===================== TEXTO DIVIDIDO EN LETRAS ===================== */
function splitChars() {
  $$(".split").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((w, wi) => {
      const word = document.createElement("span");
      word.className = "w"; // las palabras no se parten entre líneas
      [...w].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "ch";
        s.textContent = ch;
        word.appendChild(s);
      });
      el.appendChild(word);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });
}

/* ===================== SCROLL ===================== */
let lenis;
function initScroll() {
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on("scroll", (e) => { ScrollTrigger.update(); scrollY = e.scroll; navOnScroll(e.direction, e.scroll); });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    addEventListener("scroll", () => { scrollY = window.scrollY; });
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    e.preventDefault();
    const target = $(id);
    lenis ? lenis.scrollTo(target, { duration: 1.6 }) : target.scrollIntoView({ behavior: "smooth" });
  }));
}

const nav = $("#nav");
function navOnScroll(dir, y) {
  nav.classList.toggle("is-hidden", dir > 0 && y > 200);
}

function initTimelines() {
  // ---- coreografía del frasco a lo largo de la historia ----
  const tl = gsap.timeline({ scrollTrigger: { trigger: "#story", start: "top top", end: "bottom bottom", scrub: SCRUB } });
  POSES.slice(1).forEach((p) => tl.to(state, { ...p, duration: 1, ease: "power1.inOut" }));

  // salida del frasco cuando entra el split
  gsap.to(state, {
    exit: 1, ease: "none",
    scrollTrigger: {
      trigger: "#split", start: "top bottom", end: "top top", scrub: true,
      onLeave: () => { running = false; canvas.style.visibility = "hidden"; },
      onEnterBack: () => { running = true; canvas.style.visibility = "visible"; },
    },
  });

  // ---- títulos que suben letra por letra ----
  $$(".split").forEach((el) => {
    if (el.closest(".s--hero")) return;
    gsap.from(el.querySelectorAll(".ch"), {
      yPercent: 115, rotate: 6, stagger: 0.025, duration: 1.1, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" },
    });
  });

  // ---- marquesinas ----
  gsap.fromTo("#marquee1", { xPercent: 5 }, { xPercent: -45, ease: "none", scrollTrigger: { trigger: ".s--angle", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo("#marquee2", { xPercent: -50 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: ".s--angle", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo("#band", { xPercent: 0 }, { xPercent: -40, ease: "none", scrollTrigger: { trigger: ".jar-sec", start: "top bottom", end: "bottom top", scrub: true } });

  // ---- hero: el título se separa al salir ----
  gsap.to(".mega--hero .split:first-child", { xPercent: -18, ease: "none", scrollTrigger: { trigger: ".s--hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".mega--hero .split:last-child", { xPercent: 18, ease: "none", scrollTrigger: { trigger: ".s--hero", start: "top top", end: "bottom top", scrub: true } });

  // ---- contadores ----
  $$("[data-count]").forEach((b) => {
    const o = { v: 0 };
    gsap.to(o, { v: +b.dataset.count, duration: 1.6, ease: "power2.out", onUpdate: () => (b.textContent = Math.round(o.v)), scrollTrigger: { trigger: b, start: "top 85%" } });
  });
  gsap.from(".heat__chilis i", { scale: 0, rotate: -90, stagger: 0.08, duration: 0.7, ease: "back.out(2)", scrollTrigger: { trigger: ".heat", start: "top 88%" } });

  // ---- split: foto se revela + "SIN" ----
  const st = gsap.timeline({ scrollTrigger: { trigger: "#split", start: "top 70%", end: "top top", scrub: 1 } });
  st.to(".reveal-img", { clipPath: "inset(0% 0 0 0)", ease: "power2.out" }, 0).to(".reveal-img img", { scale: 1, ease: "power2.out" }, 0);
  gsap.from(".nos p", { yPercent: 100, opacity: 0, stagger: 0.12, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".nos", start: "top 85%" } });
  gsap.from(".checklist li", { x: -30, opacity: 0, stagger: 0.1, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".checklist", start: "top 85%" } });

  // ---- tradición ----
  gsap.fromTo(".tradition__img img", { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".tradition", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.from(".tradition__img", { rotate: 4, y: 80, scale: 0.92, ease: "power2.out", scrollTrigger: { trigger: ".tradition", start: "top 80%", end: "top 20%", scrub: 1 } });
  gsap.from(".stamp", { scale: 0, rotate: -120, duration: 1, ease: "back.out(1.8)", scrollTrigger: { trigger: ".tradition", start: "top 50%" } });

  // ---- zoom de foto a pantalla completa ----
  const z = gsap.timeline({ scrollTrigger: { trigger: "#zoom", start: "top top", end: "+=160%", pin: ".zoom__pin", scrub: 1 } });
  z.to("#zoomCard", { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power2.inOut", duration: 1 })
    .to("#zoomCard img", { scale: 1, ease: "power2.inOut", duration: 1 }, 0)
    .to(".zoom__title", { opacity: 1, duration: 0.4 }, 0.65)
    .from(".zoom__title span", { yPercent: 60, stagger: 0.1, duration: 0.4 }, 0.65);

  // ---- galería ----
  $$(".g").forEach((g, i) => gsap.from(g, { y: 100 + i * 30, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: g, start: "top 92%" } }));

  // ---- sabores: scroll horizontal + color de fondo ----
  const track = $("#flavorsTrack"), sec = $("#sabores");
  const panels = $$(".flavor[data-bg]", track);
  const dist = () => track.scrollWidth - innerWidth;
  gsap.to(track, {
    x: () => -dist(), ease: "none",
    scrollTrigger: {
      trigger: sec, start: "top top", end: () => "+=" + dist(), pin: true, scrub: 1, invalidateOnRefresh: true,
    },
  });
  panels.forEach((p) => {
    gsap.from(p.querySelector("img"), { scale: 1.25, xPercent: -10, ease: "power2.out", scrollTrigger: { trigger: p, containerAnimation: gsap.getTweensOf(track)[0], start: "left 90%", end: "center center", scrub: true } });
  });

  // ---- ingredientes ----
  gsap.from(".ing", { y: 80, opacity: 0, stagger: 0.08, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".ingredients__grid", start: "top 85%" } });

  // ---- producto / cocinar / footer ----
  gsap.from(".product__img", { clipPath: "inset(30% 30% 30% 30% round 26px)", duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".product", start: "top 75%" } });
  gsap.from(".product__info > *", { y: 40, opacity: 0, stagger: 0.07, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".product", start: "top 70%" } });
  gsap.fromTo(".footer__right img", { scale: 1.25, yPercent: -8 }, { scale: 1, yPercent: 0, ease: "none", scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true } });
  gsap.from(".footer__left h3", { y: 80, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".footer", start: "top 70%" } });
}

/* ===================== MICROINTERACCIONES ===================== */
function initInteractions() {
  addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = (e.clientY / innerHeight) * 2 - 1;
  });

  // cursor
  if (!touch) {
    const c = $("#cursor");
    const qx = gsap.quickTo(c, "x", { duration: 0.35, ease: "power3" }), qy = gsap.quickTo(c, "y", { duration: 0.35, ease: "power3" });
    addEventListener("pointermove", (e) => { qx(e.clientX); qy(e.clientY); });
    $$("a, button, .g, .ing, input").forEach((el) => {
      el.addEventListener("pointerenter", () => c.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => c.classList.remove("is-hover"));
    });
  }

  // botones magnéticos
  if (!touch) $$("[data-magnetic]").forEach((el) => {
    const qx = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1,0.4)" }), qy = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1,0.4)" });
    el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * 0.35); qy((e.clientY - r.top - r.height / 2) * 0.35); });
    el.addEventListener("pointerleave", () => { qx(0); qy(0); });
  });

  // ---- selector de sabor (cambia el frasco 3D en vivo) ----
  let current = 0, busy = false;
  const chips = $$(".fchip"), heroFlavor = $("#heroFlavor");
  chips.forEach((chip) => chip.addEventListener("click", () => {
    const i = +chip.dataset.flavor;
    if (i === current || busy) return;
    busy = true; current = i;
    chips.forEach((c) => c.classList.toggle("is-active", c === chip));
    const f = FLAVORS[i];
    document.documentElement.style.setProperty("--accent", f.accent);
    heroFlavor.textContent = f.name;
    glow.color.set(f.accent);
    gsap.timeline({ onComplete: () => { extra.spin = 0; busy = false; } })
      .to(extra, { spin: Math.PI * 2, duration: 1.3, ease: "power3.inOut" }, 0)
      .to(extra, { pop: 1, duration: 0.45, ease: "power2.out", yoyo: true, repeat: 1 }, 0.2)
      .call(() => setJarFlavor(jar, f), null, 0.55)
      .fromTo(".mega--hero .split:last-child .ch", { yPercent: 0 }, { yPercent: -110, duration: 0.35, stagger: 0.02, ease: "power2.in" }, 0)
      .fromTo(".mega--hero .split:last-child .ch", { yPercent: 110 }, { yPercent: 0, duration: 0.6, stagger: 0.02, ease: "expo.out", immediateRender: false }, 0.55);
  }));

  // ---- girar el frasco arrastrando (en el hero) ----
  const hero = $(".s--hero"), hint = $("#dragHint");
  hero.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button")) return;
    drag.on = true; drag.x = e.clientX; drag.vel = 0;
    hero.classList.add("is-dragging");
    if (!drag.used) { drag.used = true; hint.classList.remove("is-on"); }
  });
  addEventListener("pointermove", (e) => {
    if (!drag.on) return;
    const dx = (e.clientX - drag.x) / innerWidth * 7;
    drag.rot += dx; drag.vel = dx; drag.x = e.clientX;
  });
  addEventListener("pointerup", () => { drag.on = false; hero.classList.remove("is-dragging"); });
  addEventListener("pointercancel", () => { drag.on = false; hero.classList.remove("is-dragging"); });
  setTimeout(() => { if (!drag.used) hint.classList.add("is-on"); }, 3200);
  setTimeout(() => hint.classList.remove("is-on"), 8000);

  // carrito
  let qty = 1, cart = 0;
  const qVal = $("#qVal"), count = $("#cartCount"), cartBtn = $("#cartBtn"), add = $("#addCart");
  $("#qMinus").onclick = () => (qVal.textContent = qty = Math.max(1, qty - 1));
  $("#qPlus").onclick = () => (qVal.textContent = qty = Math.min(12, qty + 1));
  add.onclick = () => {
    cart += qty; count.textContent = cart;
    cartBtn.classList.remove("bump"); void cartBtn.offsetWidth; cartBtn.classList.add("bump");
    nav.classList.remove("is-hidden");
    const span = add.querySelector("span"); span.textContent = "¡Agregado! ✓";
    gsap.fromTo(span, { yPercent: 100 }, { yPercent: 0, duration: 0.5, ease: "expo.out" });
    setTimeout(() => (span.textContent = "Agregar al carrito"), 1600);
  };

  // newsletter
  $("#news").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    f.classList.add("is-sent");
    f.innerHTML = "<p>¡Listo! Tu 10% va en camino. 🔥</p>";
  });
}

/* ===================== INTRO ===================== */
function intro() {
  document.body.classList.remove("is-loading");
  $("#loader").classList.add("is-done");
  const tl = gsap.timeline({ delay: 0.35 });
  tl.to(state, { intro: 1, duration: 2.2, ease: "expo.out" }, 0)
    .from(".mega--hero .ch", { yPercent: 115, rotate: 8, stagger: 0.04, duration: 1.3, ease: "expo.out" }, 0.1)
    .from(".nav > *", { y: -40, opacity: 0, stagger: 0.08, duration: 0.9, ease: "expo.out" }, 0.4)
    .from(".hero__kicker, .hero__foot, .hero__scroll", { y: 30, opacity: 0, stagger: 0.1, duration: 1, ease: "expo.out" }, 0.6);
}

/* ===================== ARRANQUE ===================== */
(async function boot() {
  document.documentElement.style.setProperty("--pattern", `url(${patternDataURL()})`);
  document.documentElement.style.setProperty("--grain", `url(${grainDataURL()})`);
  progress(0.05, "Encendiendo el fuego…");
  await Promise.all([
    document.fonts.load("400 100px Anton"),
    document.fonts.load("700 30px 'DM Sans'"),
    document.fonts.load("400 30px 'DM Sans'"),
  ]).catch(() => {});
  progress(0.15, "Llenando el frasco…");
  await frame();
  layout();
  buildMain();
  splitChars();
  FLAVORS.forEach((f) => flavorTextures(f)); // precalienta los otros sabores
  renderer.compile(scene, camera);
  progress(0.3);
  await frame();
  await makePhotos();
  progress(1, "¡Listo!");

  addEventListener("resize", () => { layout(); ScrollTrigger.refresh(); });
  gsap.ticker.add(tick);
  initScroll();
  initInteractions();
  initTimelines();
  ScrollTrigger.refresh();
  setTimeout(intro, 250);
})();
