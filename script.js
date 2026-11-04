/* ==========================================================================
   AURA X — smartphone 3D procedural + scroll (Three.js + GSAP ScrollTrigger)
   ==========================================================================
   El teléfono se modela por completo aquí (marco de titanio, vidrio frontal,
   pantalla, batería, placa lógica con chips, vidrio trasero, cámara, botones),
   así que la vista explotada separa piezas REALES. No hace falta ninguna imagen.
   Toda la animación es UN timeline con scrub ligado al scroll y pin.
   ========================================================================== */

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------ AJUSTES RÁPIDOS ------------------------------ */
const SCRUB         = true;      // true = pegado al scroll. 0.8 = un poco de inercia suave.
const SCROLL_LENGTH = "+=1300%"; // largo del scroll pineado (más = más lento, mejor para grabar)
const EASE          = "power2.inOut";
const THEME_LIGHT = { "--bg": "#f5f4f0", "--ink": "#0a0a0a", "--muted": "#8a8984" };
const THEME_DARK  = { "--bg": "#0b0b0c", "--ink": "#f5f4f0", "--muted": "#8b8b88" };
/* ----------------------------------------------------------------------------- */

ScrollTrigger.config({ ignoreMobileResize: true });

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const stage       = $("#stage");
const titleEl     = $("#title");
const titleWord   = $("#titleWord");
const glCanvas    = $("#gl");
const orbit       = $("#orbit");
const orbitCircle = $("#orbit circle");
const canvas      = $("#ribbons");
const scrim       = $(".scrim");
const label       = $("#label");
const hint        = $("#hint");
const counter     = $("#counter");
const counterNow  = $("#counterNow");
const callouts    = $$(".callout");

/* ==========================================================================
   1) TÍTULO EN LETRAS
   ========================================================================== */
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

/* ==========================================================================
   2) ESCENA THREE.JS
   ========================================================================== */
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const FOV_T = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

/* ---- Entorno tipo estudio (softboxes) para reflejos ---- */
(function buildEnvironment() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x3c3c40, side: THREE.BackSide })));
  const panel = (w, h, pos, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    m.material.color.multiplyScalar(k);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(14, 6, [0, 12, 4], 7);     // softbox superior
  panel(3, 14, [-12, 2, 5], 6);    // tira izquierda
  panel(3, 14, [12, 1, 6], 5);     // tira derecha
  panel(10, 3, [0, -10, 8], 2.2);  // relleno inferior
  panel(8, 8, [0, 3, 14], 2.5);    // frente suave
  panel(8, 8, [0, 3, -14], 2.5);   // trasera suave
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
})();

const key = new THREE.DirectionalLight(0xffffff, 0.8);
key.position.set(3, 5, 8);
scene.add(key);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

/* ---- Utilidades ---- */
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = maxAniso;
  return t;
}
function rrPath(p, w, h, r) {
  const x = -w / 2, y = -h / 2;
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);         p.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  p.lineTo(x + w, y + h - r);     p.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  p.lineTo(x + r, y + h);         p.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  p.lineTo(x, y + r);             p.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return p;
}
function rrSlab(w, h, r, depth, bevel = 0.008) {
  const g = new THREE.ExtrudeGeometry(rrPath(new THREE.Shape(), w, h, r), {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 28,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/* ---- Materiales ---- */
const M = {
  titanium: new THREE.MeshStandardMaterial({ color: 0xc9c3b8, metalness: 1, roughness: 0.34 }),
  titaniumDark: new THREE.MeshStandardMaterial({ color: 0x8e8a82, metalness: 1, roughness: 0.5 }),
  glass:    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, transparent: true, opacity: 0.1, envMapIntensity: 2.4 }),
  black:    new THREE.MeshStandardMaterial({ color: 0x050506, metalness: 0.1, roughness: 0.35 }),
  back:     new THREE.MeshPhysicalMaterial({ color: 0x2b3150, metalness: 0.15, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12 }),
  plateGlass: new THREE.MeshPhysicalMaterial({ color: 0x14171f, metalness: 0.3, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
  chrome:   new THREE.MeshStandardMaterial({ color: 0xe6e8ec, metalness: 1, roughness: 0.15 }),
  lens:     new THREE.MeshPhysicalMaterial({ color: 0x07090f, metalness: 0.2, roughness: 0.03, clearcoat: 1 }),
  lensIn:   new THREE.MeshStandardMaterial({ color: 0x1a2a66, metalness: 0.6, roughness: 0.08, emissive: 0x0b1740 }),
  flash:    new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffe9a8, emissiveIntensity: 0.6, roughness: 0.4 }),
  gold:     new THREE.MeshStandardMaterial({ color: 0xe3b865, metalness: 1, roughness: 0.28 }),
  silver:   new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.3 }),
  chip:     new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.6, roughness: 0.35 }),
};

/* ---- Pantalla (bloqueo) dibujada en canvas ---- */
const screenTex = canvasTex(1024, 2283, (g, W, H) => {
  g.save();
  g.beginPath();
  g.roundRect ? g.roundRect(0, 0, W, H, 105) : g.rect(0, 0, W, H);
  g.clip();
  // fondo aurora
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#150f5c"); bg.addColorStop(0.45, "#6a2bff"); bg.addColorStop(0.8, "#ff4f93"); bg.addColorStop(1, "#ffb06b");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const blob = (x, y, r, c) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H); };
  blob(W * 0.2, H * 0.3, 700, "rgba(0,225,255,.55)");
  blob(W * 0.85, H * 0.65, 760, "rgba(255,120,200,.5)");
  blob(W * 0.5, H * 0.95, 700, "rgba(255,200,90,.5)");
  g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, 0, W, H);

  g.fillStyle = "#fff"; g.textAlign = "center";
  // barra de estado
  g.font = "500 44px Inter, Helvetica, Arial, sans-serif"; g.textAlign = "left"; g.fillText("9:41", 110, 112);
  g.textAlign = "right";
  g.fillRect(W - 210, 80, 6, 18); g.fillRect(W - 192, 72, 6, 26); g.fillRect(W - 174, 62, 6, 36);
  g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(W - 140, 70, 62, 30); g.fillRect(W - 134, 76, 46, 18); g.fillRect(W - 76, 80, 6, 10);
  // isla
  g.fillStyle = "#000"; g.beginPath(); g.roundRect ? g.roundRect(W / 2 - 150, 62, 300, 86, 43) : g.rect(W / 2 - 150, 62, 300, 86); g.fill();
  g.fillStyle = "#0a1030"; g.beginPath(); g.arc(W / 2 + 100, 105, 15, 0, Math.PI * 2); g.fill();

  // fecha + reloj
  g.fillStyle = "rgba(255,255,255,.92)"; g.textAlign = "center";
  g.font = "500 54px Inter, Helvetica, Arial, sans-serif"; g.fillText("Martes, 4 de noviembre", W / 2, 430);
  g.fillStyle = "#fff";
  g.font = "300 400px Inter, Helvetica, Arial, sans-serif"; g.fillText("9:41", W / 2, 800);

  // widgets
  const widget = (x, y, w, h, fn) => {
    g.fillStyle = "rgba(255,255,255,.2)"; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 60) : g.rect(x, y, w, h); g.fill();
    g.fillStyle = "#fff"; fn(x, y, w, h);
  };
  widget(86, 1000, 420, 420, (x, y) => {
    g.textAlign = "left"; g.font = "500 40px Inter, Arial, sans-serif"; g.fillText("Santiago", x + 40, y + 80);
    g.font = "300 170px Inter, Arial, sans-serif"; g.fillText("22°", x + 40, y + 260);
    g.font = "500 38px Inter, Arial, sans-serif"; g.fillText("Despejado", x + 40, y + 340); g.fillText("Máx 27°  Mín 12°", x + 40, y + 390);
  });
  widget(528, 1000, 410, 420, (x, y) => {
    g.textAlign = "left"; g.font = "500 40px Inter, Arial, sans-serif"; g.fillText("HOY", x + 40, y + 80);
    g.font = "500 52px Inter, Arial, sans-serif"; g.fillText("Reunión", x + 40, y + 190); g.fillText("Almuerzo", x + 40, y + 300);
    g.font = "400 38px Inter, Arial, sans-serif"; g.fillText("10:30", x + 40, y + 236); g.fillText("13:00", x + 40, y + 346);
  });
  widget(86, 1460, 852, 190, (x, y, w) => {
    g.textAlign = "left"; g.font = "500 44px Inter, Arial, sans-serif"; g.fillText("Ahora suena", x + 50, y + 82);
    g.font = "400 38px Inter, Arial, sans-serif"; g.fillStyle = "rgba(255,255,255,.8)"; g.fillText("Aurora — Night Drive", x + 50, y + 140);
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(w - 130, y + 62); g.lineTo(w - 130, y + 128); g.lineTo(w - 76, y + 95); g.closePath(); g.fill();
  });

  // dock
  [["#ff5f6d", "#ffc371"], ["#43e97b", "#38f9d7"], ["#4facfe", "#00f2fe"], ["#a18cd1", "#fbc2eb"]].forEach(([c1, c2], i) => {
    const x = 105 + i * 200, y = 1830, gr = g.createLinearGradient(x, y, x + 150, y + 150);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr;
    g.beginPath(); g.roundRect ? g.roundRect(x, y, 150, 150, 38) : g.rect(x, y, 150, 150); g.fill();
  });
  // indicador de inicio
  g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.roundRect ? g.roundRect(W / 2 - 170, H - 56, 340, 14, 7) : g.rect(W / 2 - 170, H - 56, 340, 14); g.fill();
  g.restore();
});

/* ==========================================================================
   3) MODELADO DEL TELÉFONO
   Convención: pantalla hacia +Z, parte superior en +Y. Ancho 1, alto 2.1, grosor ~0.12.
   Cada "parte" es un Group con posición base y desplazamiento de explosión.
   ========================================================================== */
const phone = new THREE.Group();
scene.add(phone);
const P = {};
function part(name, off, base = [0, 0, 0]) {
  const g = new THREE.Group();
  g.userData = { base: new THREE.Vector3(...base), off: new THREE.Vector3(...off) };
  g.position.copy(g.userData.base);
  P[name] = g;
  phone.add(g);
  return g;
}
const mesh = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); parent.add(m); return m; };

const W_IN = 0.915, H_IN = 2.015, R_IN = 0.125;

/* ---- Marco de titanio + botones + puerto ---- */
{
  const g = part("frame", [0, 0, 0]);
  const shape = rrPath(new THREE.Shape(), 1.0, 2.1, 0.17);
  const hole = rrPath(new THREE.Path(), 0.92, 2.02, 0.125);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 5, curveSegments: 32 });
  geo.translate(0, 0, -0.05);
  mesh(geo, M.titanium, g);
  // botones laterales
  const btn = (x, y, h) => {
    const b = mesh(new THREE.BoxGeometry(0.02, h, 0.045), M.titaniumDark, g);
    b.position.set(x, y, 0);
  };
  btn(-0.512, 0.72, 0.07);  // acción
  btn(-0.512, 0.52, 0.12);  // volumen +
  btn(-0.512, 0.34, 0.12);  // volumen -
  btn(0.512, 0.46, 0.22);   // encendido
  // USB-C + rejillas
  const usb = mesh(new THREE.BoxGeometry(0.15, 0.014, 0.034), M.black, g);
  usb.position.set(0, -1.057, 0);
  for (let i = 0; i < 6; i++) {
    [-1, 1].forEach((s) => {
      const d = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 12), M.black, g);
      d.position.set(s * (0.2 + i * 0.04), -1.057, 0);
    });
  }
}

/* ---- Vidrio frontal ---- */
{
  const g = part("frontGlass", [0, 0, 1.15], [0, 0, 0.066]);
  mesh(rrSlab(W_IN, H_IN, R_IN, 0.004, 0.003), M.glass, g);
}

/* ---- Módulo de pantalla ---- */
{
  const g = part("display", [0, 0, 0.55], [0, 0, 0.04]);
  mesh(rrSlab(W_IN, H_IN, R_IN, 0.014, 0.004), M.black, g);
  const scr = mesh(
    new THREE.PlaneGeometry(0.895, 1.995),
    new THREE.MeshBasicMaterial({ map: screenTex, transparent: true, alphaTest: 0.5, toneMapped: false }),
    g
  );
  scr.position.z = 0.022;
}

/* ---- Batería ---- */
{
  const g = part("battery", [0, 0, -0.5], [0, -0.47, -0.02]);
  const tex = canvasTex(1024, 1024, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#d9dde2"); gr.addColorStop(1, "#aeb4bc");
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 3;
    for (let y = 0; y < h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = "#2a2e35"; c.textAlign = "center";
    c.font = "800 120px Inter, Arial, sans-serif"; c.fillText("AURA X", w / 2, 340);
    c.font = "600 70px Inter, Arial, sans-serif"; c.fillText("Li-Ion  4 200 mAh", w / 2, 460);
    c.font = "500 54px Inter, Arial, sans-serif"; c.fillText("3.88 V  16.3 Wh", w / 2, 550);
    c.fillStyle = "#c0392b"; c.fillRect(w / 2 - 140, 640, 120, 22); c.fillStyle = "#1c1c1c"; c.fillRect(w / 2 + 20, 640, 120, 22);
  });
  const body = mesh(rrSlab(0.8, 0.98, 0.04, 0.04, 0.004), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.7, roughness: 0.4 }), g);
}

/* ---- Placa lógica ---- */
{
  const g = part("board", [0, 0, -0.9], [0, 0.46, -0.012]);
  const pcb = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = "#0e3a33"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#1f7a66"; c.lineWidth = 3;
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 180; i++) {
      let x = rnd() * w, y = rnd() * h; c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 4; k++) { if (rnd() > 0.5) x += (rnd() - 0.5) * 300; else y += (rnd() - 0.5) * 300; c.lineTo(x, y); }
      c.stroke();
    }
    c.fillStyle = "#e3b865";
    for (let i = 0; i < 160; i++) { c.beginPath(); c.arc(rnd() * w, rnd() * h, 5 + rnd() * 5, 0, Math.PI * 2); c.fill(); }
  });
  const base = mesh(rrSlab(0.82, 0.8, 0.07, 0.012, 0.002), new THREE.MeshStandardMaterial({ map: pcb, roughness: 0.5, metalness: 0.2 }), g);
  const socTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = "#16171c"; c.fillRect(0, 0, w, h);
    const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#d8dce2"); gr.addColorStop(1, "#9aa0a8");
    c.fillStyle = gr; c.fillRect(12, 12, w - 24, h - 24);
    c.fillStyle = "#1b1d23"; c.textAlign = "center"; c.font = "800 60px Inter, Arial, sans-serif"; c.fillText("AURA", w / 2, 120);
    c.font = "800 70px Inter, Arial, sans-serif"; c.fillText("A1", w / 2, 190);
  });
  const soc = mesh(new THREE.BoxGeometry(0.26, 0.26, 0.04), new THREE.MeshStandardMaterial({ map: socTex, metalness: 0.9, roughness: 0.3 }), g);
  soc.position.set(-0.12, 0.08, 0.026);
  const can = (w, h, x, y, m = M.silver) => { const b = mesh(new THREE.BoxGeometry(w, h, 0.028), m, g); b.position.set(x, y, 0.02); return b; };
  can(0.2, 0.14, 0.22, 0.2); can(0.14, 0.18, 0.26, -0.05); can(0.22, 0.12, -0.2, -0.22); can(0.12, 0.12, 0.24, -0.27, M.chip);
  can(0.16, 0.1, -0.3, 0.3, M.chip); can(0.1, 0.1, 0.02, 0.32, M.chip);
  // componentes pequeños
  let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const small = new THREE.InstancedMesh(new THREE.BoxGeometry(0.028, 0.016, 0.014), M.black, 70);
  const dm = new THREE.Object3D();
  for (let i = 0; i < 70; i++) {
    dm.position.set((rnd() - 0.5) * 0.74, (rnd() - 0.5) * 0.7, 0.012); dm.rotation.z = rnd() > 0.5 ? 0 : Math.PI / 2; dm.updateMatrix(); small.setMatrixAt(i, dm.matrix);
  }
  g.add(small);
}

/* ---- Vidrio trasero + logo ---- */
{
  const g = part("backGlass", [0, 0, -1.2], [0, 0, -0.062]);
  mesh(rrSlab(W_IN, H_IN, R_IN, 0.012, 0.004), M.back, g);
  const logo = mesh(new THREE.TorusGeometry(0.075, 0.008, 12, 48), M.chrome, g);
  logo.position.set(0, -0.15, -0.012);
}

/* ---- Módulo de cámara ---- */
{
  const g = part("camera", [0, 0, -1.9], [0.17, 0.74, -0.083]);
  mesh(rrSlab(0.56, 0.56, 0.13, 0.024, 0.006), M.plateGlass, g);
  [[-0.11, 0.115], [-0.11, -0.115], [0.115, 0]].forEach(([x, y]) => {
    const ring = mesh(new THREE.CylinderGeometry(0.098, 0.1, 0.03, 40).rotateX(Math.PI / 2), M.chrome, g);
    ring.position.set(x, y, -0.026);
    const l = mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.034, 40).rotateX(Math.PI / 2), M.lens, g);
    l.position.set(x, y, -0.03);
    const li = mesh(new THREE.SphereGeometry(0.045, 24, 16), M.lensIn, g);
    li.scale.z = 0.35; li.position.set(x, y, -0.048);
  });
  const fl = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 20).rotateX(Math.PI / 2), M.flash, g);
  fl.position.set(0.17, 0.2, -0.016);
  const mic = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12).rotateX(Math.PI / 2), M.black, g);
  mic.position.set(0.17, -0.2, -0.016);
}

/* ==========================================================================
   4) ESTADO ANIMABLE + RENDER
   ========================================================================== */
const S = {
  rx: 0, ry: 0, rz: 0,   // rotación (grados)
  zoom: 1,
  fx: 0, fy: 0, fz: 0,   // punto del teléfono que se centra en pantalla (coords locales)
  ox: 0, oy: 0,          // desplazamiento en pantalla (fracción de ancho / alto)
  explode: 0,            // 0 ensamblado → 1 vista explotada
  heart: 0,              // 1 = vidrio y pantalla desaparecen (se ve la electrónica)
  ent: 1,                // entrada de página (1 → 0)
};

const deg = THREE.MathUtils.degToRad;
const tmp = new THREE.Vector3(), eul = new THREE.Euler();

function setAlpha(obj, a) {
  obj.visible = a > 0.01;
  obj.traverse((o) => {
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      if (m.userData.bt === undefined) { m.userData.bt = m.transparent; m.userData.bo = m.opacity; }
      m.transparent = a < 1 || m.userData.bt;
      m.opacity = m.userData.bo * a;
    });
  });
}

let aspect = 1;
const baseDist = () => 3.6 / (2 * FOV_T);

function apply() {
  const zoom = S.zoom * (1 - 0.3 * S.ent);
  const dist = baseDist() / zoom;
  camera.position.set(0, 0, dist);
  const visH = 2 * FOV_T * dist, visW = visH * aspect;

  eul.set(deg(S.rx), deg(S.ry - 50 * S.ent), deg(S.rz), "XYZ");
  phone.rotation.copy(eul);
  tmp.set(S.fx, S.fy, S.fz).applyEuler(eul);
  phone.position.set(-tmp.x + S.ox * visW, -tmp.y - S.oy * visH, -tmp.z);

  for (const k in P) {
    const p = P[k];
    p.position.copy(p.userData.base).addScaledVector(p.userData.off, S.explode);
  }
  const a = 1 - S.heart;
  setAlpha(P.display, a);
  setAlpha(P.frontGlass, a);
}

function resize() {
  const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
  aspect = w / h;
  renderer.setSize(w, h, false);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  sizeCanvas();
  drawRibbons();
}

gsap.ticker.add(() => { apply(); renderer.render(scene, camera); });

/* ==========================================================================
   5) LISTONES (canvas 2D, paso "Neural engine")
   ========================================================================== */
const ctx2d = canvas.getContext("2d");
const ribbon = { t: 0, cx: 0, cy: 0 };
let cw = 0, ch = 0;

function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = canvas.clientWidth; ch = canvas.clientHeight;
  canvas.width = cw * dpr; canvas.height = ch * dpr;
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}

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

/* ==========================================================================
   6) PASOS (poses 3D). Rotación, zoom, punto de enfoque y hueco para el texto.
   ========================================================================== */
const STEPS = [
  { // 01 — TITANIUM FRAME (vista del canto)
    theme: "light",
    p: { rx: 14, ry: -66, rz: -6, zoom: 1.5, fx: 0.5, fy: 0.45, fz: 0, ox: 0, oy: -0.08, explode: 0, heart: 0 },
    landscape: { zoom: 1.35, ox: 0.2, oy: 0 },
  },
  { // 02 — PRO CAMERA (vista trasera)
    theme: "light",
    p: { rx: 8, ry: -168, rz: 0, zoom: 2.2, fx: 0.17, fy: 0.72, fz: -0.1, ox: 0, oy: -0.06, explode: 0, heart: 0 },
    landscape: { zoom: 1.9, ox: -0.2, oy: 0 },
  },
  { // 03 — LAYER BY LAYER (vista explotada)
    theme: "dark",
    p: { rx: 16, ry: -58, rz: 0, zoom: 0.8, fx: 0, fy: 0, fz: 0, ox: 0, oy: -0.1, explode: 1, heart: 0 },
    landscape: { zoom: 1.05, ox: 0.18, oy: 0 },
  },
  { // 04 — NEURAL ENGINE (electrónica + listones)
    theme: "dark", ribbons: true,
    p: { rx: 0, ry: 0, rz: 0, zoom: 0.95, fx: 0, fy: 0, fz: 0, ox: 0, oy: -0.1, explode: 0, heart: 1 },
    landscape: { zoom: 1.1, ox: -0.2, oy: 0 },
  },
  { // 05 — ALL-DAY DISPLAY (pantalla)
    theme: "light",
    p: { rx: -8, ry: 16, rz: 4, zoom: 1.55, fx: 0, fy: 0.3, fz: 0, ox: 0, oy: -0.08, explode: 0, heart: 0 },
    landscape: { zoom: 1.35, ox: 0.2, oy: 0 },
  },
  { // 06 — BUILT TO LAST (cierre)
    theme: "light", last: true,
    p: { rx: 6, ry: -22, rz: 0, zoom: 0.95, fx: 0, fy: 0, fz: 0, ox: 0, oy: -0.1, explode: 0, heart: 0 },
    landscape: { zoom: 1.0, ox: 0, oy: 0 },
  },
];
const INTRO = {
  portrait:  { rx: 10, ry: -28, rz: 0, zoom: 1.05 },
  landscape: { rx: 8,  ry: -28, rz: 0, zoom: 1.05 },
};
const poseFor = (step, mode) => ({ ...step.p, ...(mode === "landscape" ? step.landscape : step.portrait) });

/* ==========================================================================
   7) ENTRADA DE PÁGINA
   ========================================================================== */
function playIntro() {
  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from(chars, { yPercent: 40, opacity: 0, duration: 1.1, stagger: 0.05 }, 0.1)
    .to(S, { ent: 0, duration: 1.8, ease: "power3.out" }, 0.1)
    .from(glCanvas, { opacity: 0, duration: 1.2 }, 0.2)
    .from([label, hint], { opacity: 0, y: 12, duration: 1, stagger: 0.12 }, 0.9);
}

/* ==========================================================================
   8) TIMELINE PRINCIPAL LIGADO AL SCROLL
   ========================================================================== */
const mm = gsap.matchMedia();

mm.add(
  { portrait: "(orientation: portrait)", landscape: "(orientation: landscape)" },
  (ctx) => {
    const mode = ctx.conditions.portrait ? "portrait" : "landscape";
    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;
    const lineEls = $$(".callout__line");

    gsap.set(stage, THEME_LIGHT);
    Object.assign(S, { rx: 0, ry: 0, rz: 0, zoom: 1, fx: 0, fy: 0, fz: 0, ox: 0, oy: 0, explode: 0, heart: 0 });
    gsap.set(chars, { x: 0, yPercent: 0, rotation: 0, opacity: 1 });
    gsap.set(titleEl, { scale: 1, opacity: 1 });
    gsap.set(callouts, { autoAlpha: 0, y: 36 });
    gsap.set(lineEls, { scaleX: 0 });
    gsap.set([scrim, counter, canvas], { opacity: 0 });
    gsap.set(orbit, { rotation: -90, opacity: 1, scale: 1 });
    gsap.set(orbitCircle, { strokeDashoffset: 0.78 });
    ribbon.t = 0;
    resize();

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

    /* ---- PASO 0 · INTRO: el teléfono gira y el título se desarma ---- */
    tl.to(S, { ...INTRO[mode], duration: 1 }, 0)
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
    const START = 1, STRIDE = 2;
    let theme = "light";

    STEPS.forEach((step, i) => {
      const t = START + i * STRIDE;
      const pose = poseFor(step, mode);
      const el = callouts[i];
      const line = $(".callout__line", el);

      tl.to(S, { ...pose, duration: 1.1 }, t);

      if (i === 0) tl.to(orbit, { opacity: 0, scale: 1.25, duration: 0.8 }, t);

      if (step.theme !== theme) {
        tl.to(stage, { ...(step.theme === "dark" ? THEME_DARK : THEME_LIGHT), duration: 1.1, ease: "power1.inOut" }, t);
        theme = step.theme;
      }

      if (step.ribbons) {
        tl.call(() => { ribbon.cx = vw() / 2 + pose.ox * vw(); ribbon.cy = vh() / 2 + pose.oy * vh(); }, null, t)
          .to(ribbon, { t: 1, duration: 1.6, ease: "none", onUpdate: drawRibbons }, t)
          .to(canvas, { opacity: 1, duration: 0.8 }, t + 0.3);
      }
      if (STEPS[i - 1]?.ribbons) {
        tl.to(canvas, { opacity: 0, duration: 0.7 }, t)
          .to(ribbon, { t: 0, duration: 1, ease: "none", onUpdate: drawRibbons }, t);
      }

      if (step.last) {
        tl.to(chars, { x: 0, yPercent: 0, rotation: 0, opacity: 1, duration: 1.1 }, t)
          .to(titleEl, { scale: 1, duration: 1.1 }, t)
          .to(scrim, { opacity: 0, duration: 1.1 }, t);
      }

      tl.call(() => { counterNow.textContent = String(i + 1).padStart(2, "0"); }, null, t + 0.55);

      tl.to(el, { autoAlpha: 1, y: 0, duration: 0.5 }, t + 0.7)
        .to(line, { scaleX: 1, duration: 0.5 }, t + 0.8);
      if (!step.last) tl.to(el, { autoAlpha: 0, y: -24, duration: 0.35 }, t + 1.6);
    });

    tl.to({}, { duration: 0.6 }); // cola para sostener el final
  }
);

window.addEventListener("resize", resize);

/* ==========================================================================
   9) ARRANQUE
   ========================================================================== */
resize();
function start() {
  playIntro();
  ScrollTrigger.refresh();
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
else window.addEventListener("load", start);

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
