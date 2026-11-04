/* =====================================================================
   Modelos 3D procedurales: frasco, chiles, ajo, tomate, pimienta,
   limón, hojas, tazón y partículas de especias. Todo en código.
   ===================================================================== */
import * as THREE from "three";
import { labelTexture, lidTexture, sauceTextures, smearTexture, ridgeTexture, limeTexture, rng } from "./textures.js";

const V = (x, y) => new THREE.Vector2(x, y);
const cache = new Map();
const once = (k, fn) => (cache.has(k) ? cache.get(k) : (cache.set(k, fn()), cache.get(k)));

/* texturas por sabor (se generan una sola vez y se reutilizan) */
export function flavorTextures(flavor) {
  return once("fl:" + flavor.name, () => {
    const sauce = sauceTextures(flavor, flavor.name.length + 2);
    sauce.map.repeat.set(3, 1.5); sauce.bump.repeat.set(3, 1.5);
    return { label: labelTexture(flavor), lid: lidTexture(flavor), sauce, smear: smearTexture(flavor, flavor.name.length + 9) };
  });
}
/* cambia el sabor de un frasco ya creado (etiqueta, tapa y salsa) */
export function setJarFlavor(jar, flavor) {
  const t = flavorTextures(flavor), u = jar.userData;
  u.label.material.map = t.label;
  u.top.material.map = t.lid;
  u.sauce.material.map = t.sauce.map;
  u.sauce.material.bumpMap = t.sauce.bump;
  u.sauce.material.sheenColor.set(flavor.light);
  u.smear.material.map = t.smear;
  u.sauce.material.emissive.set(flavor.sauce);
  u.smear.material.emissive.set(flavor.light);
  [u.label, u.top, u.sauce, u.smear].forEach((m) => (m.material.needsUpdate = true));
}

/* ======================= FRASCO ======================= */
// Medidas (unidades de mundo): alto 1.5, radio 0.52. Pivote en el centro.
const GLASS_PROFILE = [
  V(0, 0), V(0.44, 0), V(0.5, 0.02), V(0.518, 0.07), V(0.52, 0.14), V(0.52, 1.1),
  V(0.512, 1.16), V(0.48, 1.22), V(0.42, 1.27), V(0.385, 1.3), V(0.38, 1.33), V(0.38, 1.42), V(0.372, 1.43),
  V(0.355, 1.43), V(0.35, 1.42), V(0.35, 1.32), V(0.37, 1.28), V(0.45, 1.22), V(0.488, 1.16),
  V(0.495, 1.1), V(0.495, 0.12), V(0.47, 0.05), V(0.42, 0.04), V(0, 0.04),
];
const SAUCE_PROFILE = [
  V(0, 0.045), V(0.43, 0.048), V(0.468, 0.06), V(0.488, 0.12), V(0.488, 1.0), V(0.49, 1.03), V(0.482, 1.045),
  V(0.45, 1.05), V(0.3, 1.044), V(0, 1.04),
];

export function glassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.04,
    transmission: 1, thickness: 0.12, ior: 1.5,
    clearcoat: 1, clearcoatRoughness: 0.03,
    specularIntensity: 1, envMapIntensity: 1.4,
  });
}

export function createJar(flavor, { lowPoly = false } = {}) {
  const seg = lowPoly ? 64 : 112;
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = -0.75;
  root.add(body);

  const glassGeo = once("glass" + seg, () => new THREE.LatheGeometry(GLASS_PROFILE, seg));
  const glass = new THREE.Mesh(glassGeo, glassMaterial());
  glass.castShadow = true;
  body.add(glass);

  const tx = flavorTextures(flavor);
  // salsa: color con pulpa + relieve; el brillo lo pone el vidrio
  const sauce = new THREE.Mesh(
    once("sauce" + seg, () => new THREE.LatheGeometry(SAUCE_PROFILE, seg)),
    new THREE.MeshPhysicalMaterial({
      map: tx.sauce.map, bumpMap: tx.sauce.bump, bumpScale: 2.2,
      roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.12,
      emissive: new THREE.Color(flavor.sauce), emissiveIntensity: 0.18, // luz que "atraviesa" la salsa
      sheen: 0.6, sheenRoughness: 0.4, sheenColor: new THREE.Color(flavor.light),
    }),
  );
  sauce.castShadow = true;
  body.add(sauce);

  // película de salsa pegada por dentro del vidrio (chorreones = se ve espesa)
  const SMEAR = [V(0.4905, 0.99), V(0.4905, 1.1), V(0.4845, 1.16), V(0.4475, 1.214), V(0.4, 1.248)];
  const smear = new THREE.Mesh(
    once("smear" + seg, () => new THREE.LatheGeometry(SMEAR, seg)),
    new THREE.MeshPhysicalMaterial({ map: tx.smear, alphaTest: 0.5, side: THREE.BackSide, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, emissive: new THREE.Color(flavor.light), emissiveIntensity: 0.35 }),
  );
  body.add(smear);

  // etiqueta: cilindro abierto, el frente (u = .5) mira a +Z
  const label = new THREE.Mesh(
    once("label" + seg, () => new THREE.CylinderGeometry(0.526, 0.526, 0.8, seg, 1, true, -Math.PI, Math.PI * 2)),
    new THREE.MeshPhysicalMaterial({ map: tx.label, roughness: 0.62, metalness: 0, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) }),
  );
  label.position.y = 0.6;
  label.castShadow = true;
  body.add(label);

  // tapa
  const lid = new THREE.Group();
  lid.position.y = 0;
  const ridges = once("ridge", ridgeTexture);
  ridges.wrapS = THREE.RepeatWrapping; ridges.repeat.set(1, 1);
  const lidSide = new THREE.Mesh(
    once("lidside" + seg, () => new THREE.CylinderGeometry(0.405, 0.405, 0.18, seg * 2, 1, true)),
    new THREE.MeshStandardMaterial({ color: 0x0f3d2e, metalness: 0.75, roughness: 0.3, bumpMap: ridges, bumpScale: 2.2 }),
  );
  lidSide.position.y = 1.415;
  const rim = new THREE.Mesh(
    once("rim" + seg, () => new THREE.TorusGeometry(0.39, 0.017, 16, seg)),
    new THREE.MeshStandardMaterial({ color: 0x0f3d2e, metalness: 0.75, roughness: 0.3 }),
  );
  rim.rotation.x = Math.PI / 2; rim.position.y = 1.505;
  const top = new THREE.Mesh(
    once("lidtop" + seg, () => new THREE.CircleGeometry(0.392, seg)),
    new THREE.MeshPhysicalMaterial({ map: tx.lid, metalness: 0.3, roughness: 0.38, clearcoat: 0.5 }),
  );
  top.rotation.x = -Math.PI / 2; top.position.y = 1.512;
  const under = new THREE.Mesh(once("lidunder", () => new THREE.CircleGeometry(0.4, 48)), new THREE.MeshStandardMaterial({ color: 0x0b0908, side: THREE.DoubleSide }));
  under.rotation.x = Math.PI / 2; under.position.y = 1.33;
  [lidSide, rim, top].forEach((m) => (m.castShadow = true));
  lid.add(lidSide, rim, top, under);
  body.add(lid);

  root.userData = { lid, body, glass, label, top, sauce, smear };
  return root;
}

/* ======================= CHILE ======================= */
const CHILI_COLORS = { red: 0xc8170b, deep: 0x8c0f08, orange: 0xe8420c, green: 0x3f8a1f, dried: 0x5a1a0e };
export function createChili(kind = "red", seed = 1, len = 1) {
  const r = rng(seed);
  const pts = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = i / N;               // 0 = punta, 1 = hombro
    const rad = t < 0.92 ? 0.12 * Math.pow(Math.sin(Math.min(1, t * 1.12) * Math.PI / 2), 0.75) : 0.12 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.92) / 0.09, 2)));
    pts.push(V(Math.max(rad, i === 0 ? 0 : 0.004), t * len));
  }
  pts.push(V(0, len * 1.005));
  const geo = new THREE.LatheGeometry(pts, 40);
  const bend = 0.25 + r() * 0.3, twist = (r() - 0.5) * 0.3;
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / len, k = (1 - y) * (1 - y);
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const wob = 1 + 0.06 * Math.sin(a * 3 + y * 6);
    p.setX(i, p.getX(i) * wob + bend * k * len);
    p.setZ(i, p.getZ(i) * wob + twist * k * len);
  }
  geo.computeVertexNormals();
  const dried = kind === "dried";
  const mat = new THREE.MeshPhysicalMaterial({
    color: CHILI_COLORS[kind] ?? kind, roughness: dried ? 0.65 : 0.22,
    clearcoat: dried ? 0.1 : 1, clearcoatRoughness: 0.12,
  });
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = true;
  g.add(body);
  const green = new THREE.MeshStandardMaterial({ color: dried ? 0x5d5a2a : 0x3b6b1f, roughness: 0.5 });
  const calyx = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.3), green);
  calyx.scale.set(1.05, 0.45, 1.05); calyx.position.y = len * 0.97;
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, len, 0), new THREE.Vector3(0.01, len + 0.12, 0), new THREE.Vector3(0.07, len + 0.2, 0.02)]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 12, 0.022, 8), green);
  calyx.castShadow = stem.castShadow = true;
  g.add(calyx, stem);
  // centrar
  const wrap = new THREE.Group();
  g.position.set(-bend * 0.3 * len, -len / 2, 0);
  wrap.add(g);
  return wrap;
}

/* ======================= AJO ======================= */
export function createGarlic(seed = 2) {
  const prof = [V(0, 0), V(0.16, 0.01), V(0.3, 0.07), V(0.38, 0.2), V(0.39, 0.32), V(0.34, 0.47), V(0.24, 0.6), V(0.13, 0.72), V(0.07, 0.82), V(0.045, 0.95), V(0.03, 1.02), V(0, 1.03)];
  const geo = new THREE.LatheGeometry(prof, 64);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const k = 1 - 0.08 * Math.pow(Math.abs(Math.sin(a * 4)), 0.35);
    p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xf1e6d0, roughness: 0.5, sheen: 1, sheenColor: new THREE.Color(0xc9a6c9), sheenRoughness: 0.5 }));
  m.castShadow = true;
  const g = new THREE.Group();
  m.position.y = -0.45;
  g.add(m);
  return g;
}

/* ======================= TOMATE ======================= */
export function createTomato(seed = 3) {
  const geo = new THREE.SphereGeometry(0.4, 64, 48);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), eq = 1 - Math.abs(y) / 0.4;
    const k = 1 + 0.035 * Math.cos(a * 5) * eq;
    p.setXYZ(i, x * k, y * 0.8 - (y > 0.3 ? 0.03 : 0), z * k);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xd8240f, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }));
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  // cáliz en estrella
  const s = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2, rr = i % 2 ? 0.05 : 0.17;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(rr, 0);
  }
  const green = new THREE.MeshStandardMaterial({ color: 0x3b6b1f, roughness: 0.5, side: THREE.DoubleSide });
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }), green);
  star.rotation.x = -Math.PI / 2; star.position.y = 0.315;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.09, 8), green);
  stem.position.y = 0.36;
  g.add(star, stem);
  return g;
}

/* ======================= PIMIENTA ======================= */
const pepperGeo = () => once("pepper", () => {
  const geo = new THREE.IcosahedronGeometry(0.055, 3);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.08 * Math.sin(x * 120) * Math.sin(y * 110) * Math.sin(z * 130);
    p.setXYZ(i, x * n, y * n, z * n);
  }
  geo.computeVertexNormals();
  return geo;
});
const pepperMat = () => once("pepperMat", () => new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.75 }));
export function createPepperPile(count = 40, seed = 4, spread = 0.5) {
  const r = rng(seed);
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(pepperGeo(), pepperMat());
    const a = r() * 6.28, d = Math.sqrt(r()) * spread;
    m.position.set(Math.cos(a) * d, 0.05 + (1 - d / spread) * 0.12 * r(), Math.sin(a) * d);
    m.rotation.set(r() * 6, r() * 6, r() * 6);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}
export function createPeppercorn() { const m = new THREE.Mesh(pepperGeo(), pepperMat()); m.castShadow = true; return m; }

/* ======================= LIMÓN (rodaja) ======================= */
export function createLimeSlice() {
  const tex = once("limeTex", limeTexture);
  const rind = new THREE.MeshPhysicalMaterial({ color: 0x3f8a1f, roughness: 0.35, clearcoat: 0.6 });
  const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, clearcoat: 1, transmission: 0 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.07, 64), [rind, face, face]);
  m.castShadow = true;
  const g = new THREE.Group(); g.add(m);
  return g;
}

/* ======================= HOJA (culantro) ======================= */
export function createLeaf(seed = 5, len = 1) {
  const r = rng(seed);
  const s = new THREE.Shape();
  const N = 30, w = 0.13 * len;
  s.moveTo(0, 0);
  for (let i = 1; i <= N; i++) { const t = i / N; const ww = Math.sin(t * Math.PI) * w * (1 - 0.3 * t) + (i % 2 ? 0.01 : 0); s.lineTo(ww, t * len); }
  for (let i = N - 1; i >= 0; i--) { const t = i / N; const ww = Math.sin(t * Math.PI) * w * (1 - 0.3 * t) + (i % 2 ? 0.01 : 0); s.lineTo(-ww, t * len); }
  const geo = new THREE.ShapeGeometry(s, 4);
  const p = geo.attributes.position;
  const c = 0.25 + r() * 0.25;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -Math.abs(x) * 0.9 + c * Math.pow(y / len, 2) * len * 0.5); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.28 + r() * 0.04, 0.6, 0.2 + r() * 0.05), roughness: 0.55, side: THREE.DoubleSide }));
  m.castShadow = true;
  const g = new THREE.Group(); m.position.y = -len / 2; g.add(m);
  return g;
}
export function createHerbBunch(seed = 9, n = 5) {
  const r = rng(seed);
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const l = createLeaf(seed + i, 0.8 + r() * 0.5);
    l.rotation.set(-Math.PI / 2 + 0.1, 0, (i / (n - 1) - 0.5) * 1.4 + (r() - 0.5) * 0.2);
    l.position.set((i - n / 2) * 0.03, 0.02 + i * 0.01, 0);
    g.add(l);
  }
  return g;
}

/* ======================= TAZÓN con salsa ======================= */
export function createBowl(flavor, color = 0x15110e) {
  const prof = [V(0, 0), V(0.42, 0), V(0.46, 0.04), V(0.68, 0.14), V(0.84, 0.32), V(0.9, 0.46), V(0.89, 0.48), V(0.86, 0.48), V(0.83, 0.44), V(0.77, 0.32), V(0.62, 0.17), V(0.4, 0.1), V(0, 0.09)];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }));
  bowl.castShadow = true; bowl.receiveShadow = true;
  const { map, bump } = flavorTextures(flavor).sauce;
  const surf = new THREE.Mesh(new THREE.CircleGeometry(0.79, 96), new THREE.MeshPhysicalMaterial({ map, bumpMap: bump, bumpScale: 4, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.6 }));
  surf.rotation.x = -Math.PI / 2; surf.position.y = 0.38;
  surf.receiveShadow = true;
  const g = new THREE.Group();
  g.add(bowl, surf);
  return g;
}

/* ======================= PARTÍCULAS de especias ======================= */
export function flakeGeometries() {
  return once("flakes", () => {
    const flake = new THREE.TetrahedronGeometry(0.045, 0); flake.scale(1.4, 0.35, 1);
    const seed = new THREE.SphereGeometry(0.03, 10, 6); seed.scale(1, 0.35, 0.75);
    return { flake, seed };
  });
}
export function createFlakes(count = 120, seedN = 7, box = [6, 4, 4]) {
  const r = rng(seedN);
  const { flake, seed } = flakeGeometries();
  const fm = new THREE.InstancedMesh(flake, new THREE.MeshStandardMaterial({ roughness: 0.6 }), count);
  const sm = new THREE.InstancedMesh(seed, new THREE.MeshStandardMaterial({ color: 0xf1d27a, roughness: 0.5 }), Math.floor(count * 0.5));
  const cols = [0xc8170b, 0x8c0f08, 0xe0541a, 0x5a1a0e];
  const data = [];
  const dummy = new THREE.Object3D();
  const add = (mesh, i, isSeed) => {
    const d = {
      x: (r() - 0.5) * box[0], y: (r() - 0.5) * box[1], z: (r() - 0.5) * box[2],
      rx: r() * 6, ry: r() * 6, s: 0.35 + r() * 0.75, spin: (r() - 0.5) * 2, fall: 0.05 + r() * 0.12, mesh, i,
    };
    data.push(d);
    if (!isSeed) mesh.setColorAt(i, new THREE.Color(cols[Math.floor(r() * cols.length)]));
    dummy.position.set(d.x, d.y, d.z); dummy.rotation.set(d.rx, d.ry, 0); dummy.scale.setScalar(d.s); dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };
  for (let i = 0; i < fm.count; i++) add(fm, i, false);
  for (let i = 0; i < sm.count; i++) add(sm, i, true);
  fm.castShadow = sm.castShadow = true;
  const g = new THREE.Group();
  g.add(fm, sm);
  g.userData = { data, dummy, box };
  return g;
}
