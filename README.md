# SUBMARINER — Product showcase (GSAP + ScrollTrigger)

Abre `index.html` en el navegador (o `python3 -m http.server` y entra a `localhost:8000`).

- **Tu imagen:** reemplaza `assets/product.png` (PNG transparente, reloj vertical con correa). Si no existe, se muestra `assets/product-placeholder.svg`.
- **Ajustes rápidos** (arriba de `script.js`): `SCRUB`, `SCROLL_LENGTH` (más largo = scroll más lento), `DEPTH_LAYERS`.
- **Pasos:** intro con título que se desarma, bisel, corona, vista explotada (tema oscuro), corazón mecánico con listones, correa y cierre. Si la vista explotada no calza con tu imagen, ajusta `PARTS` en `script.js`.
- **Poses de cada ángulo:** array `STEPS` en `script.js` (rotación 3D, escala, enfoque).
- **Tamaño del reloj:** variable `--watch-h` en `style.css`.
- Para grabar: ventana/dispositivo en 9:16 (ej. 390×844) y scroll lento y continuo.
