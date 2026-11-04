/* =====================================================================
   "Estudio fotográfico" 3D: genera las fotos de producto de la página
   (galería, sabores, ingredientes, footer) renderizando escenas 3D.
   Si querés usar fotos reales, ponelas en PHOTOS dentro de main.js.
   ===================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";
import { FLAVORS, rng } from "./textures.js";
import {
  createJar, createChili, createGarlic, createTomato, createPepperPile, createPeppercorn,
  createLimeSlice, createHerbBunch, createLeaf, createBowl, createFlakes,
} from "./models.js";

const D = Math.PI / 180;

export class Studio {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
  }

  scene(bg, { floor = true, shadow = 0.3, key = [3, 6, 4], keyI = 2.4, rim = 0xff6a2e, rim2 = 0xa8ff6a } = {}) {
    const s = new THREE.Scene();
    s.environment = this.env;
    s.background = bg == null ? null : new THREE.Color(bg);
    const k = new THREE.DirectionalLight(0xfff1e0, keyI);
    k.position.set(...key);
    k.castShadow = true;
    k.shadow.mapSize.set(2048, 2048);
    k.shadow.camera.left = k.shadow.camera.bottom = -4; k.shadow.camera.right = k.shadow.camera.top = 4;
    k.shadow.camera.near = 0.5; k.shadow.camera.far = 30;
    k.shadow.bias = -0.0004; k.shadow.normalBias = 0.02; k.shadow.radius = 6;
    s.add(k);
    s.add(new THREE.HemisphereLight(0xfff4e8, 0x40140a, 0.5));
    const r1 = new THREE.PointLight(rim, 18, 20); r1.position.set(-3.5, 2.5, -2.5); s.add(r1);
    const r2 = new THREE.PointLight(rim2, 12, 20); r2.position.set(3.5, 0.5, -2.5); s.add(r2);
    if (floor) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: shadow, color: 0x2a0a00 }));
      f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
      s.add(f);
    }
    return s;
  }

  cam(fov, w, h, pos, look = [0, 0, 0]) {
    const c = new THREE.PerspectiveCamera(fov, w / h, 0.1, 100);
    c.position.set(...pos); c.lookAt(...look);
    return c;
  }

  async shoot(scene, camera, w, h, type = "image/jpeg") {
    this.renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.render(scene, camera);
    const blob = await new Promise((res) => this.canvas.toBlob(res, type, 0.9));
    return URL.createObjectURL(blob);
  }

  dispose() { this.renderer.dispose(); this.renderer.forceContextLoss?.(); }
}

/* ---------- utilidades de escena ---------- */
const put = (o, p, r = [0, 0, 0], s = 1) => { o.position.set(...p); o.rotation.set(...r); o.scale.setScalar(s); return o; };
// apoya un objeto en el piso (y = 0) según su caja
const ground = (o) => { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); o.position.y -= b.min.y; return o; };

/* ---------- LAS FOTOS ---------- */
export const SHOTS = {
  // Split: frasco rodeado de chiles volando, fondo magenta
  explosion: (st) => {
    const W = 1200, H = 1500, s = st.scene(0xFF4D1F, { floor: false, key: [2, 5, 6], keyI: 2.8, rim2: 0xffe08a });
    s.add(put(createJar(FLAVORS[0]), [0, -0.1, 0], [0.12, -0.5, -0.22], 1.25));
    const r = rng(42);
    const kinds = ["red", "red", "deep", "orange", "red", "green", "red", "deep"];
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + r() * 0.4, d = 1.45 + r() * 0.7;
      s.add(put(createChili(kinds[i % kinds.length], i + 3, 0.7 + r() * 0.5), [Math.cos(a) * d * 0.85, Math.sin(a) * d * 1.15, -0.6 + r() * 1.6], [r() * 6, r() * 6, r() * 6], 1));
    }
    s.add(put(createGarlic(), [-1.15, -1.55, 0.6], [0.4, 0.3, 0.5], 0.75));
    s.add(put(createTomato(), [1.25, 1.75, -0.5], [0.4, 0, -0.4], 0.75));
    s.add(put(createLimeSlice(), [1.2, -1.5, 0.8], [1.1, 0.2, 0.3], 0.7));
    s.add(createFlakes(160, 3, [4.5, 5.5, 2.5]));
    return st.shoot(s, st.cam(30, W, H, [0, 0, 9.5]), W, H);
  },

  // Tradición: tazón con salsa y guarnición, vista 3/4, fondo naranja
  bowl: (st) => {
    const W = 1200, H = 1500, s = st.scene(0x0F3D2E, { shadow: 0.45, key: [-3, 7, 3] });
    s.add(put(createBowl(FLAVORS[0]), [0, 0, 0], [0, 0, 0], 1.2));
    const herbs = createHerbBunch(4, 4); s.add(put(herbs, [0.15, 0.5, 0.1], [0, 0.6, 0], 0.55));
    s.add(put(createChili("red", 2, 0.9), [-0.25, 0.53, -0.15], [Math.PI / 2, 0, 0.9], 1));
    s.add(ground(put(createGarlic(), [-1.35, 0, 0.9], [0, 0.4, 0], 0.65)));
    s.add(put(createLimeSlice(), [1.3, 0.03, 1.0], [0, 0, 0], 0.65));
    s.add(put(createLimeSlice(), [1.6, 0.08, 0.55], [0.15, 0, -0.1], 0.6));
    s.add(put(createChili("green", 6, 1.1), [-1.2, 0.12, -0.6], [Math.PI / 2, 0, 2.2], 1));
    s.add(put(createChili("deep", 8, 1.0), [1.15, 0.12, -0.75], [Math.PI / 2, 0, -0.4], 1));
    s.add(put(createPepperPile(30, 2, 0.35), [0.1, 0, 1.55]));
    return st.shoot(s, st.cam(32, W, H, [0, 6.2, 5.2], [0, 0.2, 0.25]), W, H);
  },

  // Zoom: flat lay cenital de ingredientes, fondo café oscuro
  flatlay: (st) => {
    const W = 1800, H = 1100, s = st.scene(0x0E1A15, { shadow: 0.55, key: [-2, 8, 2.5], rim: 0xffb36b });
    s.add(put(createBowl(FLAVORS[0], 0xf4ead8), [-0.9, 0, 0.1], [0, 0, 0], 1.05));
    const jar = createJar(FLAVORS[0]); s.add(put(jar, [1.55, 0.53, -0.2], [0, 0, Math.PI / 2], 1)); jar.rotation.order = "ZYX"; jar.rotation.set(0, -0.5, Math.PI / 2);
    const r = rng(12);
    const kinds = ["red", "deep", "red", "green", "orange", "red"];
    [[-2.9, 0.9], [-2.6, -1.0], [0.3, 1.45], [0.6, -1.4], [-0.3, -1.6], [3.3, 1.0], [3.1, -1.25]].forEach(([x, z], i) =>
      s.add(put(createChili(kinds[i % kinds.length], 20 + i, 0.8 + r() * 0.4), [x, 0.12, z], [Math.PI / 2, 0, r() * 6.28], 1)));
    s.add(ground(put(createGarlic(), [-2.8, 0, 0.0], [0, 0, 0], 0.75)));
    s.add(ground(put(createTomato(), [0.5, 0, -0.35], [0, 0, 0], 0.8)));
    s.add(ground(put(createTomato(), [3.0, 0, 0.05], [0, 1, 0], 0.7)));
    s.add(put(createLimeSlice(), [0.75, 0.04, 0.75], [0, 0, 0], 0.6));
    s.add(put(createLimeSlice(), [-1.8, 0.04, -1.45], [0, 0, 0], 0.55));
    s.add(put(createPepperPile(40, 5, 0.45), [-1.75, 0, 1.35]));
    s.add(put(createHerbBunch(7, 5), [2.2, 0.03, 1.45], [0, 2.2, 0], 0.8));
    s.add(put(createHerbBunch(3, 4), [-0.9, 0.48, 0.2], [0, -0.6, 0], 0.5));
    return st.shoot(s, st.cam(30, W, H, [0, 10.2, 0.01], [0.15, 0, 0]), W, H);
  },

  // Galería 1: frasco de pie con chiles y ajo, fondo naranja
  g1: (st) => {
    const W = 1000, H = 1300, s = st.scene(0x0F3D2E, { shadow: 0.45, key: [3, 6, 4] });
    s.add(ground(put(createJar(FLAVORS[0]), [0, 0, 0], [0, -0.35, 0], 1.2)));
    s.add(put(createChili("red", 31, 1.1), [-0.7, 0.13, 0.95], [Math.PI / 2, 0, 0.5], 1));
    s.add(put(createChili("deep", 32, 0.9), [0.85, 0.13, 0.7], [Math.PI / 2, 0, -2.3], 1));
    s.add(ground(put(createGarlic(), [1.0, 0, -0.3], [0, 0.4, 0], 0.6)));
    s.add(put(createPepperPile(22, 9, 0.3), [-0.2, 0, 1.3]));
    return st.shoot(s, st.cam(30, W, H, [0, 1.6, 6.4], [0, 0.85, 0]), W, H);
  },

  // Galería 2: colección de 3 sabores
  g2: (st) => {
    const W = 1500, H = 900, s = st.scene(0x0b1511, { shadow: 0.6, key: [2, 6, 5], keyI: 2.2 });
    [[-1.45, 0.35, 0.4], [0, 0, -0.1], [1.45, 0.35, -0.6]].forEach(([x, z, ry], i) => s.add(ground(put(createJar(FLAVORS[i]), [x, 0, z], [0, ry, 0], 1))));
    s.add(put(createChili("red", 40, 0.9), [-2.4, 0.12, 0.9], [Math.PI / 2, 0, 0.8], 1));
    s.add(put(createChili("orange", 41, 0.8), [2.4, 0.12, 0.8], [Math.PI / 2, 0, -2.5], 1));
    return st.shoot(s, st.cam(28, W, H, [0, 1.8, 7.6], [0, 0.7, 0]), W, H);
  },

  // Galería 3: primer plano de la tapa, fondo magenta
  g3: (st) => {
    const W = 900, H = 900, s = st.scene(0xFF4D1F, { shadow: 0.35, key: [-2, 6, 3] });
    s.add(ground(put(createJar(FLAVORS[0]), [0, 0, 0], [0, 0.3, 0], 1)));
    s.add(put(createLeaf(3, 1), [0.55, 1.53, 0.1], [-Math.PI / 2 + 0.2, 0, 0.6], 0.6));
    return st.shoot(s, st.cam(26, W, H, [0, 4.6, 2.7], [0, 1.15, 0]), W, H);
  },

  // Galería 4: tazón cenital, fondo amarillo
  g4: (st) => {
    const W = 1100, H = 900, s = st.scene(0xD7F75B, { shadow: 0.4, key: [-3, 8, 2] });
    s.add(put(createBowl(FLAVORS[1], 0x15110e), [0, 0, 0], [0, 0, 0], 1.25));
    s.add(put(createHerbBunch(11, 5), [0.1, 0.5, 0.1], [0, 1.1, 0], 0.55));
    s.add(put(createChili("orange", 51, 1), [-1.7, 0.12, 0.5], [Math.PI / 2, 0, 1.0], 1));
    s.add(put(createLimeSlice(), [1.6, 0.04, 0.65], [0, 0, 0], 0.55));
    s.add(put(createPepperPile(20, 4, 0.3), [1.5, 0, -0.7]));
    return st.shoot(s, st.cam(30, W, H, [0, 8, 1.2], [0, 0, 0.1]), W, H);
  },

  // Producto: frasco 3/4 sobre magenta
  product: (st) => {
    const W = 1100, H = 1100, s = st.scene(0xFF4D1F, { shadow: 0.4, key: [3, 6, 5] });
    s.add(ground(put(createJar(FLAVORS[0]), [0, 0, 0], [0, -0.25, 0], 1.25)));
    s.add(put(createChili("red", 61, 1.1), [1.0, 0.13, 0.75], [Math.PI / 2, 0, -2.4], 1));
    s.add(put(createHerbBunch(5, 4), [-1.0, 0.03, 0.7], [0, 0.9, 0], 0.6));
    return st.shoot(s, st.cam(30, W, H, [0, 1.5, 6.6], [0, 0.85, 0]), W, H);
  },

  // Footer: frasco enorme inclinado sobre magenta
  footer: (st) => {
    const W = 1000, H = 1400, s = st.scene(0x0F3D2E, { floor: false, key: [3, 4, 6] });
    s.add(put(createJar(FLAVORS[0]), [0.2, -0.2, 0], [0.1, -0.6, 0.28], 2.1));
    s.add(createFlakes(90, 8, [4, 6, 2]));
    s.add(put(createChili("red", 71, 1.1), [-1.3, -1.9, 1.0], [0.4, 0.5, 2.4], 1));
    return st.shoot(s, st.cam(30, W, H, [0, 0, 9]), W, H);
  },
};

// Sabores: un frasco por sabor sobre su color
FLAVORS.forEach((f, i) => {
  SHOTS["flavor" + i] = (st) => {
    const W = 1000, H = 1200;
    const s = st.scene(f.bg, { shadow: 0.35, key: [3, 6, 5] });
    s.add(ground(put(createJar(f), [0, 0, 0], [0, -0.3, 0], 1.35)));
    const kinds = [["red", "deep"], ["green", "green"], ["orange", "orange"]][i];
    s.add(put(createChili(kinds[0], 80 + i, 1.1), [-1.0, 0.13, 0.8], [Math.PI / 2, 0, 0.6], 1));
    s.add(put(createChili(kinds[1], 90 + i, 0.9), [1.05, 0.13, 0.55], [Math.PI / 2, 0, -2.2], 1));
    return st.shoot(s, st.cam(30, W, H, [0, 1.6, 7], [0, 0.95, 0]), W, H);
  };
});

// Ingredientes: retratos con fondo transparente
const ING = {
  "ing-chili": () => { const g = new THREE.Group(); g.add(put(createChili("red", 1, 1.1), [-0.25, 0, 0], [0.2, 0, 0.5])); g.add(put(createChili("deep", 2, 1.0), [0.25, 0, 0.1], [-0.2, 0, -0.4])); return g; },
  "ing-garlic": () => { const g = new THREE.Group(); g.add(put(createGarlic(), [0, 0, 0], [0.25, 0, 0.15], 1.6)); return g; },
  "ing-tomato": () => { const g = new THREE.Group(); g.add(put(createTomato(), [0, 0, 0], [0.4, 0, 0.1], 1.7)); return g; },
  "ing-pepper": () => { const g = new THREE.Group(); g.add(put(createPepperPile(46, 6, 0.55), [0, -0.1, 0], [0.5, 0, 0])); for (let i = 0; i < 4; i++) g.add(put(createPeppercorn(), [0.6 - i * 0.35, 0.5 + (i % 2) * 0.2, 0.2], [i, i, i], 1.3)); return g; },
  "ing-lime": () => { const g = new THREE.Group(); g.add(put(createLimeSlice(), [-0.15, 0.1, 0], [1.2, 0, 0.3], 1.2)); g.add(put(createLimeSlice(), [0.3, -0.25, -0.3], [1.0, 0, -0.4], 1.1)); return g; },
  "ing-leaf": () => { const g = new THREE.Group(); g.add(put(createHerbBunch(13, 5), [0, 0.1, 0], [1.2, 0, 0], 1.3)); return g; },
};
Object.entries(ING).forEach(([k, make]) => {
  SHOTS[k] = (st) => {
    const W = 640, H = 640, s = st.scene(null, { floor: false, key: [2, 4, 5] });
    s.add(make());
    return st.shoot(s, st.cam(30, W, H, [0, 0, 4.2]), W, H, "image/png");
  };
});
