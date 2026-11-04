# BRASA — Landing 3D de salsa gourmet

Web promocional estilo Awwwards con un frasco 3D fotorrealista que se mueve con el scroll.
**No necesita ninguna imagen ni modelo externo:** el frasco, la etiqueta, los ingredientes y
todas las "fotos" de producto se generan con código (Three.js) cuando carga la página.

## Cómo verla

```bash
cd salsa
python3 -m http.server 8000
```

Abrí `http://localhost:8000`. (Tiene que ser con servidor; abrir el `index.html` con doble clic no funciona por los módulos JS.)

Todo está incluido en el repo (Three.js, GSAP, ScrollTrigger, Lenis y las fuentes van en `vendor/` y `fonts/`), así que funciona sin internet.

## Qué hay en la página

1. **Hero:** "SABOR BRUTAL", el frasco 3D gira con humo y especias flotando.
2. **Un nuevo ángulo:** marquesinas gigantes y el frasco da una vuelta completa.
3. **Destapá la aventura:** el frasco se inclina delante del texto, la tapa se levanta y sale vapor.
4. **Vista de la tapa:** el frasco muestra el logo de la tapa dentro de un anillo de texto que gira.
5. **Perspectiva de sabor:** el frasco acostado, con contadores y nivel de picor.
6. **Sin rellenos / sin atajos:** sección dividida en café y fucsia con revelado de imagen.
7. **Tradición & fuego:** fondo amarillo con parallax.
8. **Zoom:** la foto cenital de ingredientes crece hasta llenar la pantalla.
9. **Galería** con hover.
10. **Sabores:** scroll horizontal; el fondo cambia de color en cada sabor.
11. **Ingredientes:** tarjetas con renders 3D.
12. **El frasco:** ficha de producto con carrito funcional y el CTA "A cocinar".
13. **Footer** con newsletter.

## Personalizar

| Qué | Dónde |
|---|---|
| Nombre de la marca | `BRAND` en `js/textures.js` + textos en `index.html` |
| Sabores (nombre, colores, picor) | `FLAVORS` en `js/textures.js` |
| Diseño de la etiqueta / tapa | `labelTexture()` y `lidTexture()` en `js/textures.js` |
| Poses del frasco en cada sección | `POSES` en `js/main.js` |
| Velocidad / inercia del scroll | `SCRUB` en `js/main.js` |
| Colores de la web | variables `:root` en `style.css` |
| **Usar fotos reales** | Poné las fotos en `images/` y agregalas en `PHOTOS` dentro de `js/main.js` (por ejemplo `explosion: "images/manos.jpg"`). Reemplazan al render 3D de ese espacio. |

Las claves de foto disponibles son `explosion`, `bowl`, `flatlay`, `g1` a `g4`, `flavor0` a `flavor2`, `ing-chili`, `ing-garlic`, `ing-tomato`, `ing-pepper`, `ing-lime`, `ing-leaf`, `product` y `footer`.

## Tips para grabar el reel

- Grabá la pantalla a 60 fps (OBS) o filmá la laptop con el celular en un cuarto oscuro con una lámpara de lado.
- Scroll lento y parejo con el trackpad. Lenis ya lo suaviza.
- Si querés que el frasco vaya más lento, subí la altura de las secciones `.s` en `style.css` (por ejemplo `min-height: 140vh`).
