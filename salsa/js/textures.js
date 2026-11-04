/* =====================================================================
   Texturas generadas por código (etiqueta, tapa, salsa, humo, patrones).
   Para cambiar el diseño de la etiqueta: editá drawLabel().
   ===================================================================== */
import * as THREE from "three";

export const BRAND = "BRASA";

export const FLAVORS = [
  { name: "Chile Ahumado",      accent: "#E8530E", pill: "#E5197F", sauce: "#7d1b07", fleck: "#e0541a", heat: 4 },
  { name: "Mango Habanero",     accent: "#F5B82E", pill: "#E8530E", sauce: "#c4560c", fleck: "#ffb627", heat: 5 },
  { name: "Tamarindo Chipotle", accent: "#E5197F", pill: "#F5B82E", sauce: "#4a1607", fleck: "#a3401a", heat: 3 },
];

const GOLD = "#F5B82E";
const CREAM = "#FFF3E2";
const INK = "#0E0B08";

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
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.moveTo(0, 6); ctx.bezierCurveTo(14, 18, 16, 32, 8, 42); ctx.bezierCurveTo(2, 46, -10, 44, -12, 34); ctx.bezierCurveTo(-14, 24, -4, 18, 0, 6);
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
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
function spaced(ctx, px) { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; }

/* ---------------- ETIQUETA (se enrolla en el frasco) ----------------
   u = 0.5 es el frente. El ancho total es la circunferencia. */
export function labelTexture(flavor) {
  const W = 3072, H = 780;
  const [c, ctx] = canvas(W, H);
  const r = rng(7);

  // base negra con textura sutil
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1c1611";
  for (let i = 0; i < 2600; i++) ctx.fillRect(r() * W, r() * H, 2 + r() * 3, 2 + r() * 3);
  // patrón de rombos
  ctx.strokeStyle = "#2a2018"; ctx.lineWidth = 2;
  for (let x = -H; x < W + H; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke();
  }
  // panel frontal oscuro para que lea limpio
  const fx = W / 2, fw = 1120;
  ctx.fillStyle = INK; ctx.fillRect(fx - fw / 2, 0, fw, H);

  // franjas superior e inferior
  ctx.fillStyle = flavor.accent;
  ctx.fillRect(0, 22, W, 22); ctx.fillRect(0, H - 44, W, 22);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 56, W, 3); ctx.fillRect(0, H - 59, W, 3);

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

  // ---- FRENTE ----
  ctx.fillStyle = GOLD; ctx.font = "700 32px 'DM Sans'"; spaced(ctx, 10);
  ctx.fillText("SALSA GOURMET · HECHA A MANO", fx, 128);
  spaced(ctx, 0);
  // marca con sombra desplazada
  ctx.font = "330px Anton";
  ctx.fillStyle = flavor.pill; ctx.fillText(BRAND, fx + 12, 470 + 10);
  ctx.fillStyle = flavor.accent; ctx.fillText(BRAND, fx, 470);
  // píldora con sabor
  ctx.font = "62px Anton";
  const label = flavor.name.toUpperCase();
  const lw = ctx.measureText(label).width + 90;
  ctx.fillStyle = CREAM; roundRect(ctx, fx - lw / 2, 506, lw, 92, 46); ctx.fill();
  ctx.fillStyle = INK; ctx.fillText(label, fx, 576);
  // picor
  for (let i = 0; i < 5; i++) drawChili(ctx, fx - 120 + i * 60, 654, 0.5, 0.5, i < flavor.heat ? flavor.accent : "#3a2c22");
  ctx.fillStyle = CREAM; ctx.font = "500 24px 'DM Sans'"; spaced(ctx, 4);
  ctx.fillText("250 ml · 8.45 fl oz", fx, 712);
  spaced(ctx, 0);
  drawFlame(ctx, fx - fw / 2 + 80, 140, 0.9, flavor.accent);
  drawFlame(ctx, fx + fw / 2 - 80, 140, 0.9, flavor.accent);

  // ---- LATERAL IZQUIERDO: ingredientes ----
  const lx = W / 2 - 1010;
  ctx.textAlign = "left";
  ctx.fillStyle = flavor.accent; ctx.font = "64px Anton"; ctx.fillText("INGREDIENTES", lx - 300, 170);
  ctx.fillStyle = CREAM; ctx.font = "400 28px 'DM Sans'";
  ["Chile chipotle ahumado, tomate,", "ajo asado, vinagre de caña,", "limón mandarina, culantro,", "sal de mar, pimienta negra.", "", "Sin conservantes · Vegano", "Agitar antes de usar.", "Refrigerar después de abrir."]
    .forEach((t, i) => ctx.fillText(t, lx - 300, 236 + i * 44));
  // ---- LATERAL DERECHO: código de barras ----
  const rx = W / 2 + 700;
  ctx.fillStyle = GOLD; ctx.font = "54px Anton"; ctx.fillText("HECHO EN COSTA RICA", rx, 170);
  ctx.fillStyle = CREAM; ctx.font = "400 28px 'DM Sans'";
  ctx.fillText("Lote Nº 027 / 200 · Firmado a mano", rx, 222);
  ctx.fillStyle = CREAM; ctx.fillRect(rx, 270, 420, 250);
  ctx.fillStyle = INK;
  let bx = rx + 24;
  while (bx < rx + 396) { const w = 2 + Math.floor(r() * 4) * 2; ctx.fillRect(bx, 290, w, 180); bx += w + 3 + Math.floor(r() * 3) * 2; }
  ctx.font = "500 26px 'DM Sans'"; ctx.fillText("7 44099 02701 6", rx + 30, 504);
  drawFlame(ctx, rx + 560, 400, 2.2, flavor.accent);

  // ---- ATRÁS (costura) ----
  ctx.save(); ctx.translate(60, H / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center"; ctx.fillStyle = flavor.accent; ctx.font = "84px Anton"; ctx.fillText(BRAND, 0, 30);
  ctx.restore();

  return toTex(c);
}

/* ---------------- TAPA ---------------- */
export function lidTexture(flavor) {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const m = S / 2;
  ctx.fillStyle = INK; ctx.fillRect(0, 0, S, S);
  // anillos
  ctx.strokeStyle = GOLD; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(m, m, 480, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(m, m, 360, 0, Math.PI * 2); ctx.stroke();
  // texto circular
  const text = "SALSA GOURMET · HECHA A MANO · LOTES PEQUEÑOS · ";
  ctx.font = "50px Anton"; ctx.fillStyle = GOLD; ctx.textAlign = "center";
  const chars = [...text];
  chars.forEach((ch, i) => {
    const a = (i / chars.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save(); ctx.translate(m + Math.cos(a) * 405, m + Math.sin(a) * 405); ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 18); ctx.restore();
  });
  drawFlame(ctx, m, m - 110, 1.8, flavor.accent);
  ctx.font = "170px Anton"; ctx.fillStyle = CREAM; ctx.fillText(BRAND, m, m + 140);
  ctx.font = "700 30px 'DM Sans'"; ctx.fillStyle = flavor.accent; spaced(ctx, 8);
  ctx.fillText("EST. 1987", m, m + 196);
  return toTex(c);
}

/* ---------------- SALSA (con semillas y trocitos) ---------------- */
export function sauceTexture(flavor, seed = 3) {
  const W = 1024, H = 1024;
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  ctx.fillStyle = flavor.sauce; ctx.fillRect(0, 0, W, H);
  // manchas
  for (let i = 0; i < 260; i++) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const x = r() * W, y = r() * H, rad = 20 + r() * 70;
    ctx.save(); ctx.translate(x, y); ctx.scale(rad, rad);
    g.addColorStop(0, r() > 0.5 ? "#00000030" : "#ffffff14"); g.addColorStop(1, "#0000");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // trocitos de chile
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = r() > 0.4 ? flavor.fleck : "#3a0b03";
    ctx.save(); ctx.translate(r() * W, r() * H); ctx.rotate(r() * 6.28);
    ctx.fillRect(-4, -2, 6 + r() * 14, 3 + r() * 6); ctx.restore();
  }
  // semillas
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = r() > 0.3 ? "#f2d27a" : "#fff0c0";
    ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 5 + r() * 3, 3 + r() * 2, r() * 6.28, 0, Math.PI * 2); ctx.fill();
  }
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
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

/* ---------------- patrones CSS (fondo naranja + grano) ---------------- */
export function patternDataURL() {
  const S = 520;
  const [c, ctx] = canvas(S, S);
  const r = rng(21);
  const col = "rgba(110,25,0,0.10)";
  for (let i = 0; i < 16; i++) {
    const x = r() * S, y = r() * S, s = 0.5 + r() * 0.8, rot = r() * 6.28;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      if (i % 3 === 0) drawFlame(ctx, x + dx, y + dy, s * 0.7, col);
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
