/* =====================================================================
   Texturas generadas por código (etiqueta, tapa, salsa, humo, patrones).
   Para cambiar el diseño de la etiqueta: editá labelTexture().
   ===================================================================== */
import * as THREE from "three";

export const BRAND = "MAGMA";

/* Sabores: accent = color de marca del sabor, bg = color de fondo de sus fotos,
   sauce/dark/light/fleck = colores de la salsa (realismo), heat = picor 1-5 */
export const FLAVORS = [
  { name: "Lava Ahumada",    short: "Ahumada",  accent: "#FF4D1F", bg: "#FF4D1F", sauce: "#5e1206", dark: "#320703", light: "#8a250c", fleck: "#a8361a", heat: 4 },
  { name: "Jalapeño Verde",  short: "Jalapeño", accent: "#D7F75B", bg: "#D7F75B", sauce: "#4d6418", dark: "#27360a", light: "#6f8a24", fleck: "#9db83a", heat: 3 },
  { name: "Habanero Dorado", short: "Habanero", accent: "#FFB020", bg: "#FFB020", sauce: "#b8510a", dark: "#6e2604", light: "#e07a14", fleck: "#ffab3a", heat: 5 },
];

const EMERALD = "#0F3D2E";
const LIME = "#D7F75B";
const CREAM = "#F5EFE3";
const INK = "#08100C";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}
function toTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}
// pseudo-random determinista (mismas texturas en cada carga)
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/* ---------------- íconos dibujados ---------------- */
export function drawFlame(ctx, x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.bezierCurveTo(28, -22, 40, 0, 32, 22);
  ctx.bezierCurveTo(26, 40, 10, 50, 0, 50);
  ctx.bezierCurveTo(-10, 50, -26, 40, -32, 22);
  ctx.bezierCurveTo(-38, 4, -26, -6, -18, -20);
  ctx.bezierCurveTo(-14, -6, -8, 0, -4, 2);
  ctx.bezierCurveTo(-8, -18, -6, -34, 0, -50);
  ctx.fill();
  ctx.restore();
}
export function drawChili(ctx, x, y, s, rot, color, stem = "#3c6a22") {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-8, -40);
  ctx.bezierCurveTo(10, -44, 14, -30, 12, -12);
  ctx.bezierCurveTo(10, 14, 4, 34, -10, 46);
  ctx.bezierCurveTo(-4, 26, -14, 0, -14, -20);
  ctx.bezierCurveTo(-14, -32, -12, -38, -8, -40);
  ctx.fill();
  ctx.strokeStyle = stem; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, -40); ctx.quadraticCurveTo(2, -52, 12, -56); ctx.stroke();
  ctx.restore();
}
// volcán con lava: (x, y) = centro de la base, w/h = tamaño
export function drawVolcano(ctx, x, y, w, h, mountain, lava, smoke) {
  ctx.save(); ctx.translate(x, y);
  if (smoke) {
    ctx.fillStyle = smoke;
    [[-0.05, -1.08, 0.13], [0.07, -1.2, 0.16], [-0.02, -1.36, 0.19], [0.1, -1.5, 0.15]].forEach(([dx, dy, r]) => {
      ctx.beginPath(); ctx.arc(dx * w, dy * h, r * w, 0, 7); ctx.fill();
    });
  }
  ctx.fillStyle = mountain;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.bezierCurveTo(-w * 0.32, -h * 0.25, -w * 0.18, -h * 0.75, -w * 0.12, -h);
  ctx.lineTo(w * 0.12, -h);
  ctx.bezierCurveTo(w * 0.18, -h * 0.75, w * 0.32, -h * 0.25, w / 2, 0);
  ctx.closePath(); ctx.fill();
  // lava que chorrea
  ctx.fillStyle = lava;
  ctx.beginPath();
  ctx.moveTo(-w * 0.12, -h);
  ctx.lineTo(w * 0.12, -h);
  ctx.lineTo(w * 0.13, -h * 0.86);
  ctx.quadraticCurveTo(w * 0.16, -h * 0.5, w * 0.1, -h * 0.42);
  ctx.quadraticCurveTo(w * 0.07, -h * 0.62, w * 0.04, -h * 0.8);
  ctx.quadraticCurveTo(w * 0.0, -h * 0.35, -w * 0.05, -h * 0.3);
  ctx.quadraticCurveTo(-w * 0.09, -h * 0.55, -w * 0.06, -h * 0.82);
  ctx.quadraticCurveTo(-w * 0.12, -h * 0.6, -w * 0.15, -h * 0.55);
  ctx.quadraticCurveTo(-w * 0.17, -h * 0.75, -w * 0.13, -h * 0.88);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function spaced(ctx, px) { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; }

/* ---------------- ETIQUETA (se enrolla en el frasco) ----------------
   u = 0.5 es el frente. El ancho total es la circunferencia. */
export function labelTexture(flavor) {
  const W = 3072, H = 780;
  const [c, ctx] = canvas(W, H);
  const r = rng(7);

  // papel crema con fibras
  ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = r() > 0.5 ? "#e6dccb" : "#fffaf0";
    ctx.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2);
  }

  // banda superior verde con texto que da toda la vuelta
  ctx.fillStyle = EMERALD; ctx.fillRect(0, 0, W, 92);
  ctx.fillStyle = flavor.accent; ctx.fillRect(0, 92, W, 8);
  ctx.fillStyle = LIME; ctx.font = "700 28px 'DM Sans'"; spaced(ctx, 9); ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const band = "SALSA VOLCÁNICA  ✦  HECHA A MANO  ✦  LOTES PEQUEÑOS  ✦  ";
  const bw = ctx.measureText(band).width;
  for (let x = -40; x < W; x += bw) ctx.fillText(band, x, 48);
  // banda inferior
  ctx.fillStyle = EMERALD; ctx.fillRect(0, H - 66, W, 66);
  ctx.fillStyle = flavor.accent; ctx.fillRect(0, H - 74, W, 8);
  ctx.fillStyle = CREAM; ctx.font = "500 22px 'DM Sans'"; spaced(ctx, 6);
  const band2 = "250 ML · 8.45 FL OZ  —  HECHO EN COSTA RICA  —  ";
  const bw2 = ctx.measureText(band2).width;
  for (let x = 0; x < W; x += bw2) ctx.fillText(band2, x, H - 32);
  spaced(ctx, 0);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "center";

  // ---- FRENTE ----
  const fx = W / 2;
  drawVolcano(ctx, fx, 300, 300, 170, EMERALD, flavor.accent, "#0F3D2E22");
  ctx.font = "250px Anton";
  ctx.fillStyle = flavor.accent; ctx.fillText(BRAND, fx + 9, 528 + 8);
  ctx.fillStyle = EMERALD; ctx.fillText(BRAND, fx, 528);
  // píldora del sabor
  ctx.font = "54px Anton";
  const label = flavor.name.toUpperCase();
  const lw = ctx.measureText(label).width + 80;
  ctx.fillStyle = EMERALD; roundRect(ctx, fx - lw / 2, 552, lw, 80, 40); ctx.fill();
  ctx.fillStyle = flavor.accent; ctx.fillText(label, fx, 612);
  // picor
  for (let i = 0; i < 5; i++) drawFlame(ctx, fx - 100 + i * 50, 672, 0.36, i < flavor.heat ? "#E2341D" : "#d8ccb8");
  ctx.fillStyle = EMERALD; ctx.font = "700 20px 'DM Sans'"; spaced(ctx, 5);
  ctx.textAlign = "right"; ctx.fillText("PICOR", fx - 140, 680);
  ctx.textAlign = "left"; ctx.fillText(flavor.heat + " / 5", fx + 140, 680);
  spaced(ctx, 0);
  // líneas finas que enmarcan el frente
  ctx.fillStyle = EMERALD;
  ctx.fillRect(fx - 560, 130, 3, 560); ctx.fillRect(fx + 557, 130, 3, 560);

  // ---- LATERAL IZQUIERDO: ingredientes ----
  const lx = fx - 1250;
  ctx.textAlign = "left";
  ctx.fillStyle = EMERALD; ctx.font = "60px Anton"; ctx.fillText("INGREDIENTES", lx, 190);
  ctx.fillStyle = "#2a3a33"; ctx.font = "400 27px 'DM Sans'";
  ["Chiles seleccionados, tomate asado,", "ajo tostado, vinagre de caña,", "limón mandarina, culantro,", "sal de mar, pimienta negra.", "", "Sin conservantes · Vegano", "Agitar antes de usar.", "Refrigerar después de abrir."]
    .forEach((t, i) => ctx.fillText(t, lx, 248 + i * 42));
  // ---- LATERAL DERECHO: código de barras ----
  const rx = fx + 690;
  ctx.fillStyle = EMERALD; ctx.font = "52px Anton"; ctx.fillText("NACIDA AL PIE DEL VOLCÁN", rx, 190);
  ctx.fillStyle = "#2a3a33"; ctx.font = "400 27px 'DM Sans'";
  ctx.fillText("Lote Nº 041 / 300 · Firmado a mano", rx, 238);
  ctx.fillStyle = "#fff"; ctx.fillRect(rx, 280, 400, 230);
  ctx.fillStyle = INK;
  let bx = rx + 22;
  while (bx < rx + 378) { const w = 2 + Math.floor(r() * 4) * 2; ctx.fillRect(bx, 298, w, 165); bx += w + 3 + Math.floor(r() * 3) * 2; }
  ctx.font = "500 24px 'DM Sans'"; ctx.fillText("7 44099 04101 8", rx + 40, 494);
  drawVolcano(ctx, rx + 560, 520, 170, 110, EMERALD, flavor.accent);

  // ---- ATRÁS (costura) ----
  ctx.save(); ctx.translate(70, H / 2 + 10); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center"; ctx.fillStyle = EMERALD; ctx.font = "80px Anton"; ctx.fillText(BRAND, 0, 28);
  ctx.restore();

  return toTex(c);
}

/* ---------------- TAPA ---------------- */
export function lidTexture(flavor) {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const m = S / 2;
  ctx.fillStyle = EMERALD; ctx.fillRect(0, 0, S, S);
  // anillos
  ctx.strokeStyle = LIME; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(m, m, 480, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(m, m, 352, 0, Math.PI * 2); ctx.stroke();
  // texto circular
  const text = "SALSA VOLCÁNICA · HECHA A MANO · COSTA RICA · ";
  ctx.font = "50px Anton"; ctx.fillStyle = LIME; ctx.textAlign = "center";
  const chars = [...text];
  chars.forEach((ch, i) => {
    const a = (i / chars.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save(); ctx.translate(m + Math.cos(a) * 400, m + Math.sin(a) * 400); ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 18); ctx.restore();
  });
  drawVolcano(ctx, m, m - 30, 330, 190, CREAM, flavor.accent, "#ffffff22");
  ctx.font = "150px Anton"; ctx.fillStyle = CREAM; ctx.fillText(BRAND, m, m + 140);
  ctx.font = "700 28px 'DM Sans'"; ctx.fillStyle = flavor.accent; spaced(ctx, 8);
  ctx.fillText(flavor.name.toUpperCase(), m, m + 194);
  return toTex(c);
}

/* ---------------- SALSA realista ----------------
   Ruido orgánico (pulpa), trocitos de chile, semillas pequeñas y burbujas.
   Devuelve { map, bump }: color + relieve para que la luz agarre los trozos. */
function valueNoise(seed, cells) {
  const r = rng(seed);
  const g = new Float32Array((cells + 1) * (cells + 1));
  for (let i = 0; i < g.length; i++) g[i] = r();
  // los bordes se repiten para que la textura sea continua
  for (let i = 0; i <= cells; i++) { g[i * (cells + 1) + cells] = g[i * (cells + 1)]; g[cells * (cells + 1) + i] = g[i]; }
  return (u, v) => {
    const x = u * cells, y = v * cells, xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const i0 = yi * (cells + 1) + xi, i1 = i0 + cells + 1;
    const a = g[i0] + (g[i0 + 1] - g[i0]) * sx, b = g[i1] + (g[i1 + 1] - g[i1]) * sx;
    return a + (b - a) * sy;
  };
}
export function sauceTextures(flavor, seed = 3) {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const [bc, bctx] = canvas(S, S);
  const n1 = valueNoise(seed, 8), n2 = valueNoise(seed + 1, 24), n3 = valueNoise(seed + 2, 64), n4 = valueNoise(seed + 3, 140);
  const D = hex(flavor.dark), B = hex(flavor.sauce), L = hex(flavor.light), F = hex(flavor.fleck);
  const img = ctx.createImageData(S, S), bimg = bctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S;
    const base = 0.5 * n1(u, v) + 0.3 * n2(u, v) + 0.2 * n3(u, v);
    const pulp = n4(u, v);
    // tono: oscuro → base → claro, con trozos de pulpa más claros
    let col;
    if (base < 0.5) { const t = base / 0.5; col = D.map((d, k) => d + (B[k] - d) * t); }
    else { const t = (base - 0.5) / 0.5; col = B.map((b, k) => b + (L[k] - b) * t); }
    if (pulp > 0.68) { const t = Math.min(1, (pulp - 0.68) * 3.2); col = col.map((cv, k) => cv + (F[k] - cv) * t * 0.55); }
    const i = (y * S + x) * 4;
    img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    const h = 90 + base * 80 + Math.max(0, pulp - 0.6) * 220;
    bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = Math.min(255, h); bimg.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); bctx.putImageData(bimg, 0, 0);

  const r = rng(seed * 13);
  // trocitos de chile/piel (polígonos irregulares)
  for (let i = 0; i < 520; i++) {
    const x = r() * S, y = r() * S, s = 2 + r() * 7, a = r() * 6.28, k = 5 + Math.floor(r() * 3);
    const dark = r() > 0.55;
    ctx.fillStyle = dark ? `rgba(${D.join()},0.9)` : `rgba(${F.join()},0.85)`;
    ctx.beginPath();
    for (let j = 0; j < k; j++) { const aa = a + (j / k) * 6.28, rr = s * (0.5 + r() * 0.8) * (j % 2 ? 1.7 : 1); ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr * 0.6); }
    ctx.fill();
    bctx.fillStyle = dark ? "#666" : "#ddd"; bctx.beginPath(); bctx.arc(x, y, s * 0.8, 0, 7); bctx.fill();
  }
  // semillas pequeñas, translúcidas
  for (let i = 0; i < 170; i++) {
    const x = r() * S, y = r() * S, w = 2.2 + r() * 1.6, h = 1.4 + r() * 0.9, a = r() * 6.28;
    ctx.fillStyle = `rgba(236,214,150,${0.55 + r() * 0.3})`;
    ctx.beginPath(); ctx.ellipse(x, y, w, h, a, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(90,40,10,0.35)"; ctx.lineWidth = 0.8; ctx.stroke();
    bctx.fillStyle = "#fff"; bctx.beginPath(); bctx.ellipse(x, y, w, h, a, 0, 7); bctx.fill();
  }
  // burbujas de aire pegadas al vidrio
  for (let i = 0; i < 40; i++) {
    const x = r() * S, y = r() * S, rad = 1.5 + r() * 3.5;
    ctx.fillStyle = "rgba(255,230,210,0.18)"; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.arc(x - rad * 0.35, y - rad * 0.35, rad * 0.3, 0, 7); ctx.fill();
  }
  const map = toTex(c), bump = toTex(bc, false);
  map.wrapS = map.wrapT = bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { map, bump };
}

/* ---------------- relieve de la tapa (estrías) ---------------- */
export function ridgeTexture() {
  const [c, ctx] = canvas(1024, 8);
  for (let x = 0; x < 1024; x += 8) {
    const g = ctx.createLinearGradient(x, 0, x + 8, 0);
    g.addColorStop(0, "#000"); g.addColorStop(0.5, "#fff"); g.addColorStop(1, "#000");
    ctx.fillStyle = g; ctx.fillRect(x, 0, 8, 8);
  }
  return toTex(c, false);
}

/* ---------------- sprite suave (humo) ---------------- */
export function smokeTexture() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  const r = rng(11);
  for (let i = 0; i < 14; i++) {
    const x = S / 2 + (r() - 0.5) * 80, y = S / 2 + (r() - 0.5) * 80, rad = 50 + r() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, "rgba(255,255,255,0.16)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }
  return toTex(c);
}
/* ---------------- brasa / chispa (partículas de lava) ---------------- */
export function emberTexture() {
  const S = 64;
  const [c, ctx] = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,240,200,1)"); g.addColorStop(0.2, "rgba(255,160,60,0.9)");
  g.addColorStop(0.5, "rgba(255,77,31,0.35)"); g.addColorStop(1, "rgba(255,77,31,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  return toTex(c);
}

/* ---------------- rodaja de limón ---------------- */
export function limeTexture() {
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const m = S / 2;
  ctx.fillStyle = "#3f8a1f"; ctx.beginPath(); ctx.arc(m, m, 256, 0, 7); ctx.fill();
  ctx.fillStyle = "#f4f7d8"; ctx.beginPath(); ctx.arc(m, m, 236, 0, 7); ctx.fill();
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.05, a1 = ((i + 1) / n) * Math.PI * 2 - 0.05;
    const g = ctx.createRadialGradient(m, m, 20, m, m, 220);
    g.addColorStop(0, "#d9ef8a"); g.addColorStop(1, "#9fd13c");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(m + Math.cos((a0 + a1) / 2) * 22, m + Math.sin((a0 + a1) / 2) * 22);
    ctx.arc(m, m, 214, a0, a1); ctx.closePath(); ctx.fill();
  }
  const r = rng(5);
  ctx.fillStyle = "#ffffff55";
  for (let i = 0; i < 260; i++) { const a = r() * 6.28, d = 30 + r() * 180; ctx.beginPath(); ctx.ellipse(m + Math.cos(a) * d, m + Math.sin(a) * d, 2 + r() * 4, 1 + r() * 2, a, 0, 7); ctx.fill(); }
  return toTex(c);
}

/* ---------------- patrones CSS (fondo verde + grano) ---------------- */
export function patternDataURL() {
  const S = 520;
  const [c, ctx] = canvas(S, S);
  const r = rng(21);
  const col = "rgba(0,0,0,0.16)";
  for (let i = 0; i < 16; i++) {
    const x = r() * S, y = r() * S, s = 0.5 + r() * 0.8, rot = r() * 6.28;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      if (i % 4 === 0) drawVolcano(ctx, x + dx, y + dy, 70 * s, 42 * s, col, col);
      else if (i % 4 === 1) drawFlame(ctx, x + dx, y + dy, s * 0.6, col);
      else drawChili(ctx, x + dx, y + dy, s, rot, col, col);
    }
  }
  ctx.fillStyle = col;
  for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc(r() * S, r() * S, 2 + r() * 3, 0, 7); ctx.fill(); }
  return c.toDataURL("image/png");
}
export function grainDataURL() {
  const S = 220;
  const [c, ctx] = canvas(S, S);
  const img = ctx.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}
