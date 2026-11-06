# Industrias Equinox Colombia · sitio web (prototipo)

Prototipo del sitio web de Industrias Equinox Colombia: catálogo de equipos en acero inoxidable para la industria láctea, fichas técnicas, constructor de planta en 3D y cotización por WhatsApp con PDF.

Sitio estático (HTML, CSS y JavaScript, sin compilación). Librerías incluidas en `vendor/`: Three.js, GSAP, jsPDF y qrcode-generator.

## Páginas

- `index.html`: portada, asistente de WhatsApp y formulario de cotización.
- `equipos.html`: catálogo de equipos por línea.
- `equipo.html?e=<id>`: ficha técnica de cada equipo, con visor 3D y PDF.
- `planta.html`: constructor de planta en 3D.

## Probar en el computador

```bash
python -m http.server 8090
```

Luego abrir http://localhost:8090.

## Publicar en Vercel

- Importar este repositorio en Vercel con el preset **Other**, sin comando de compilación y con la raíz como carpeta de salida.
- `vercel.json` deja el sitio fuera de los buscadores (`noindex`) mientras sea prototipo. Lo mismo hace la etiqueta `robots` de cada página.

## Número de WhatsApp

- Todo lo de la web apunta a un solo número: `WHATSAPP` en `js/data.js`.
- Para probar con otro celular, abrir la web con `?wa=57XXXXXXXXXX`, con un número real.

## Más detalle

Más detalle en `LEEME.md`: decisiones, datos de muestra y qué falta confirmar con Equinox.
