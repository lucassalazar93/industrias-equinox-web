# Mock web · Industrias Equinox Colombia

Prototipo de sitio para mostrar al cliente cómo se vería una web que convierte: configurador de línea en la portada, fichas técnicas, casos con cifras, videos y cotizador que guarda cada solicitud.

## Cómo abrirlo

Necesita un servidor local (los módulos de JavaScript no funcionan abriendo el archivo con doble clic).

```bash
python -m http.server 8090 --directory web-mock
```

Luego abrir <http://localhost:8090>. Funciona sin internet: tipografías, Three.js y GSAP están copiados en `vendor/` y `fonts/`.

## Páginas

- Modo claro / oscuro (`js/tema.js`): botón de sol y luna en el menú de las 4 páginas. La elección se guarda en el navegador (`eqx-tema`) y se aplica antes de pintar para que no parpadee; sin elección, el sitio arranca en claro. El modo oscuro usa los mismos tokens con tinta clara sobre azul noche (`:root[data-tema='oscuro']` en `css/main.css`); las fotos y renders conservan una placa clara porque vienen con fondo blanco, el logo del menú se aclara y las escenas 3D (sala de Arma tu planta, trazo del tanque de la portada) cambian de color en vivo. Los PDF y el video se generan siempre en claro. La entrada de la portada es oscura en ambos modos.
- Entrada de la portada (`js/intro.js`): la placa de identificación de Equinox. La placa de acero inoxidable cepillado llega a oscuras sobre fondo azul noche; un arco de soldadura se enciende con un destello, la ilumina y recorre la costura con chispas; el cordón se enfría con el tono de calor real del inoxidable (paja, dorado, morado, azul), el logo aparece grabado al paso del arco, la placa se pule y aparecen los campos grabados (fabricante, material, sector, origen). Luego el mensaje "Ingeniería que transforma tu producción." entra palabra por palabra con una cota roja bajo "tu producción", y queda el botón "Entrar" con una barra que avanza sola. Al salir, la pantalla sube como persiana y el plano se traza. Dura unos 12 s si no se toca nada; se salta con "Saltar", un clic, una tecla o al desplazarse; sale una vez por visita (para mostrarla de nuevo: `index.html?intro=1`) y no aparece si el equipo tiene activado "reducir movimiento".
- Robot soldador en la entrada (2026-11-05, pedido de Lucas):
  - El robot soldador (`assets/img/asistente/soldador.webp`) hace la soldadura. Su imagen se limpió: se quitaron la barra de acero y las chispas pintadas, porque las chispas las dibuja la animación.
  - Llega desde arriba antes de encender el arco. Recorre la costura con la punta de la antorcha justo en el arco (`PUNTA` en `intro.js`), con un leve temblor de mano, iluminado por el destello y con un brillo encima de la boquilla. Se retira al terminar.
  - Mientras se suelda, la placa queda centrada en la pantalla, porque antes la mitad de abajo quedaba vacía.
  - La placa sube primero a su sitio (`--bajar`, clase `sube`, a los 5,1 s) y el mensaje aparece palabra por palabra cuando ya llegó (6,25 s), así nunca se monta encima.
  - Capas: texto 0, placa con el robot 1, destello del arco 2.
  - Las chispas envejecen con el reloj real, para que en equipos lentos no queden pegadas sobre la placa pulida.
  - Probado en 1920 × 960 y en celular.
- Portada en computador: título y plano a la izquierda, cajetín a la derecha, y el plano se ajusta al alto disponible para que todo quepa en la primera pantalla (probado en 1920 × 870, 1440 × 800 y 1366 × 657). Sobre el plano hay una leyenda ("Línea sugerida · producto · litros · equipos") que se marca en rojo al cambiar de producto. En celular, al tocar otro producto la página baja al plano y lo muestra desde el primer equipo.
- `index.html`: portada con el plano interactivo (cada equipo dibujado abre su ficha), soluciones por producto, "Así trabaja una línea en planta" (4 tomas de video real de una línea de mozzarella, en fila deslizable en celular, con botón a esa línea en 3D), galería de fotos reales (con "Ver los 19 equipos"), tanque 3D en corte, fábrica, banda "Arma tu planta", casos (ocultos), dossier de entrega, cotizador en 5 pasos (con la opción de hacerlo conversando con el asistente), preguntas (con el gancho al asistente) y contacto.

Revisión para presentar (2026-11-06, pedida por Lucas: la página se sentía saturada y el robot también):

- Primera pantalla:
  - Sin el robot del tanque holográfico. El robot queda solo en el ícono del asistente de la esquina, que saluda al abrir.
  - El cajetín deja dos acciones: "Cotizar esta línea" (principal) y "Ver esta planta funcionando en 3D". Se quitaron los enlaces "Armar en 3D" y "WhatsApp" del cajetín: repetían el botón de 3D, la banda "Arma tu planta" y el ícono del asistente.
  - Mientras los litros sean de ejemplo, la celda ya no tiene marco rojo (parecía un error). Queda el subrayado rojo de cota en el número y la pista "Valor de ejemplo: escribe tus litros." en gris. Lo mismo en Arma tu planta.
- El saludo del asistente se recoge solo cuando la persona baja más de 160 px por la página y deja el "1" en el ícono. Antes seguía encima del contenido hasta 16 s; en celular tapaba casi media pantalla.
- Secciones retiradas de la portada (recuperables desde el commit d635a6e):
  - "Cotiza conversando": repetía el ícono del asistente. En su lugar, el cotizador tiene "¿Prefieres conversar?" con el botón "Hablar con el asistente".
  - "19 equipos en 6 líneas": repetía Soluciones y el menú Equipos. La galería de fotos reales lleva ahora el botón "Ver los 19 equipos".
- La galería de fotos reales subió justo después del video en planta: lo real (video y fotos) queda junto.
- Título del cotizador más corto: "Cuéntanos tu proyecto." y el resto pasa al texto de entrada.
- "Cotización" del menú ahora es un carrito (portada, Equipos y fichas). Sin equipos se ve el carrito y la palabra Cotización. Al agregar uno aparece el globo rojo con la cantidad y el carrito da un salto. En celular queda solo el carrito con su globo. Lo pinta `pintarContador()` en `js/data.js`, que también actualiza el nombre accesible ("Cotización: 5 equipos"). El carrito va dibujado en el HTML y no en `iconos.svg`, para que no dependa de una copia vieja del sprite en caché.
- Al tocar el carrito se abre el panel "Tu cotización" (`js/carrito.js`, en portada, Equipos y fichas).
  - Muestra cada equipo elegido con foto o render, código, nombre y capacidad; el nombre abre su ficha.
  - La X quita un equipo. "Vaciar" pide un segundo toque.
  - "Cotizar estos N equipos" lleva al formulario, que ya trae esos equipos marcados.
  - Sin equipos explica cómo agregarlos y ofrece "Ver los 19 equipos".
  - Al quitar equipos avisa con el evento `eqx:cotizacion`: la portada pone al día el formulario y Equipos sus botones +.
  - Al abrirse recoge el saludo del asistente para no taparlo. Se cierra con Esc, con la X o tocando fuera.
  - El número del carrito son los equipos guardados en este navegador (`eqx-cotizacion`). Se suman con el + del catálogo, con "Cotizar esta línea" (agrega los equipos de la línea sugerida) y desde Arma tu planta.
- Fábrica, tarjeta "01 Diseño": el dibujo simple se cambió por una hoja de plano completa de un tanque de enfriamiento. Lleva alzado en medio corte, planta, detalle de la pared doble, cotas en letras A–E, globos, lista de partes, notas, revisiones y cajetín de Equinox.
  - Las cotas van en letras, sin medidas: los valores reales se ponen cuando Equinox los entregue.
  - Las partes y notas repiten solo lo que ya dice el sitio (AISI 304, uniones lisas, patas regulables, etc.).
  - Se traza sola al aparecer la tarjeta. Con "menos movimiento" o al imprimir se ve completa de una vez.
  - En celular la tarjeta queda cuadrada (las de video siguen 4:3) para que la hoja se lea.
  - La genera `herramientas/hoja_plano.py`: para cambiarla, editar el script y correrlo con la ruta de `index.html`.
- Portada a 1.440 px de ancho: de 16.900 a 14.800 px. En celular (375 px): de 21.700 a 19.000 px.

Cambios del 2026-11-05, pedidos por Lucas:

- El video real en planta subió justo después de Soluciones. Antes estaba después de la galería; ahora arranca a unos 2.350 px de la parte superior en vez de 9.280.
- La tabla de 19 equipos con filtros, que repetía el catálogo, se cambió por un adelanto de las 6 líneas.
  - Cada línea muestra cuántos equipos tiene, miniaturas (foto real o render) y "Ver la línea", que lleva a `equipos.html#linea-<id>`.
  - En celular queda en 2 columnas.
  - La sección pasó de unos 1.845 a 1.130 px a 1.026 px de ancho; la portada completa, de 17.200 a 16.500 px.
- Desde la portada, las fichas ahora dicen "Volver al inicio". La lista completa con "Volver a equipos" es la de `equipos.html`.
- Tanque 3D en corte más corto.
  - Menos aire entre los 5 pasos: `.anatomia__pasos` pasó de gap 36vh a 20vh en escritorio y de 48vh a 34vh en celular.
  - Cada paso sigue activando su vista del modelo.
  - La sección pasó de unos 2.640 a 2.130 px a 1.026 px de ancho.
- Casos de muestra ocultos con el interruptor `MOSTRAR_CASOS = false` en `js/data.js`.
  - Ni la sección de la portada ni el bloque "Un equipo así, en uso" de las fichas aparecen.
  - En el menú y el pie de las 4 páginas, "Casos" se cambió por "En planta", que lleva al video real.
  - Para volver a mostrarlos: reemplazar `CASOS` por proyectos reales autorizados, poner el interruptor en `true` y volver a poner "Casos" (`#casos`) en el menú.
- Éxito del cotizador con el robot del OK (`assets/img/asistente/saludo.webp`) junto a "Recibimos tu solicitud".
  - Se corrigió de paso un error anterior: dentro de la banda noche, el título y el texto del éxito heredaban colores claros y casi no se leían sobre la tarjeta clara.
- Altura de la portada a 1.026 px de ancho: de 17.200 a 14.700 px. En celular (375 px), de 23.300 a unos 20.000 px.
- `equipos.html`: catálogo de los 19 equipos (enlace "Equipos" del menú en todas las páginas), una lámina por línea de proceso con índice fijo a la izquierda (en celular, barra de líneas deslizable). Cada equipo es una fila: miniatura pequeña (foto real cuando existe y, si no, el render del modelo 3D `assets/img/equipos/render-<id>.jpg`) al lado de código, nombre, capacidad, "Ver ficha" y botón + para la cotización. Las fotos de hiladora y prensa tienen el fondo de estudio llevado a blanco para que todas las imágenes compartan fondo (originales en `publicidad/`).
- Ida y vuelta entre Equipos y la ficha: la ficha tiene "Volver a equipos" arriba, una barra fija al bajar (volver, nombre, anterior y siguiente, posición 05 / 19) y el bloque "Sigue viendo equipos" al final. Volver regresa al listado de donde se entró (catálogo con su filtro o sección de la portada) y cae en la tarjeta del equipo que se estaba viendo. Los renders se regeneran con el mismo visor 3D si cambia un modelo.
- `equipo.html?e=<id>`: ficha técnica de cualquiera de los 19 equipos (por ejemplo `equipo.html?e=pasteurizador`). Modelo 3D que se gira con vista general, pieza por pieza (explosionada con etiquetas guía), en corte y en funcionamiento con lecturas en vivo; sección de scroll "Así trabaja, paso a paso"; tabla por capacidad; opciones; caso y video relacionados; descarga de ficha técnica en PDF.
- `planta.html`: constructor de planta en 3D. Producto y litros por día, plantilla con la línea sugerida, catálogo para tocar o arrastrar, mover, girar (R), duplicar y quitar (Supr), tuberías automáticas entre equipos de líquidos y flechas de flujo entre los de sólidos, validación (etapas faltantes, capacidad corta, equipos superpuestos o fuera de la sala), área ocupada, recorrido animado del proceso, plano en PDF, envío por WhatsApp y cotización de la planta completa. Se guarda sola en el navegador.
  - Los litros por día se piden sin obligar: en la portada el cajetín pregunta "¿Cuántos litros procesas al día?" (número editable y deslizador) y, mientras la persona no indique los suyos, la celda queda marcada en rojo con "Es un ejemplo: escribe tus litros…"; en Arma tu planta, la invitación ofrece 500 · 1.000 · 2.000 · 5.000 · 10.000 L u otra cantidad, el panel izquierdo hace la misma pregunta y el aviso de ejemplo trae "¿Procesas otra cantidad? Cambia los litros". La cantidad indicada se recuerda en el navegador (`eqx-litros`) y la usan ambas páginas.
  - Llamados a verla funcionando desde la portada: fila "Ver esta planta funcionando en 3D" en el cajetín del plano (con duración, equipos y litros de la línea elegida), "Verla funcionando en 3D" en Soluciones y "Ver una planta funcionando" en la banda de Arma tu planta. Todos abren `planta.html?apl=<producto>&L=<litros>&ver=recorrido`: la sala se arma con esa plantilla y aparece una invitación con el botón grande "Ver la planta funcionando", que lanza el recorrido en pantalla completa. Si en 9 s nadie ha visto el recorrido, el botón de recorrido pulsa (una vez por visita).
  - La primera visita abre con una planta de ejemplo (queso campesino, 2.000 L) y un aviso con sello "Ejemplo": "Vaciar y armar la mía" o "Ver otras plantillas". Vaciar o cambiar de plantilla muestra "Deshacer".
  - Pestaña "Plantillas": una planta de referencia por necesidad (7 productos), con sus equipos en miniatura, dimensionada con la leche por día. Mientras la sala sea el ejemplo sin tocar, cambiar producto o litros la recalcula; al mover, agregar o quitar algo pasa a ser "tu planta".
  - Proceso en vivo durante el recorrido: el equipo en marcha se abre en corte (se ve la leche, el agitador o las liras por dentro), lleva un anillo rojo que late en el piso y la etiqueta "En marcha", y los demás equipos se atenúan. La tubería del traslado se llena de azul con pulsos blancos de leche de punta a punta y las ya recorridas siguen fluyendo; los traslados por el piso muestran flechas rojas que avanzan y bloques de producto en fila. La cámara se aleja en cada traslado para ver de dónde sale y a dónde llega. Todo esto también queda en el video descargable.
  - Recorrido del proceso a pantalla completa (API del navegador; en iPhone, la escena ocupa la ventana) con pausa, anterior, siguiente, barra de etapas y salir. La cámara gira despacio en cada equipo.
  - "Video del recorrido": graba el recorrido en MP4 1280 × 720 (WebM si el navegador no graba MP4), con portada personalizada, rótulos de etapa, lecturas en vivo, avance y cierre con equipos y contacto. Dura lo que dura el recorrido (unos 45 s con 5 equipos, ~18 MB). Necesita Chrome o Edge en computador y que la pestaña quede visible mientras graba.
  - Antes de descargar el plano o el video se piden empresa, nombre, cargo, celular (obligatorios), correo (opcional) y la autorización de datos (Ley 1581 de 2012). En el prototipo quedan en este navegador (`localStorage` `eqx-interesados`); el plano y el video salen "Preparado para" esa empresa. En la versión real deben llegar al CRM o al correo de ventas.
- `ficha-tanque-enfriamiento.html`: redirige a `equipo.html?e=enfriamiento` (se conserva para enlaces viejos).

Ids de equipo: enfriamiento, almacenamiento, pasteurizador, marmitaMulti, marmitaVolcable, mezcla, fermentacion, tina, polivalente, hiladora, formadora, prensa, moldePrensa, moldeCosteno, moldeMozzarella, carro, mantequillera, meson, canastilla.

## PDF que genera el sitio

- Ficha técnica (A4, 2 páginas): logo, código y fecha, render del equipo, datos principales, vista por piezas numeradas, especificaciones por capacidad, funcionamiento, opciones y bloque de contacto con QR a WhatsApp con el equipo ya elegido.
- Plano preliminar de planta (A4): vista 3D y vista en planta, lista de equipos con capacidad, huella y etapa, avisos pendientes y página de siguiente paso con QR.
- Plano de disposición general por equipo (A3, botón "Plano en PDF" de cada ficha): alzado, planta y vista lateral o corte en primer diedro, cotas en letras con tabla de dimensiones por capacidad (resalta la elegida), conexiones, lista de materiales, notas y cajetín con logo. Lleva el sello "Preliminar · no apto para fabricación" hasta que un ingeniero con matrícula lo apruebe. Lo dibuja `js/planos.js`, el mismo módulo que usa el skill `planos-equinox` para generar el juego completo en la carpeta `planos/` del proyecto.
- Se generan en el navegador con jsPDF; no se envía nada a ningún servidor.

## Qué es real y qué es de muestra

| Contenido | Estado | Qué debe entregar Equinox |
| --- | --- | --- |
| Nombres y capacidades de los 19 equipos | Del catálogo PDF 2025 | Confirmar unidades de la marmita multiprocesos, del tanque de almacenamiento y del mesón |
| Teléfonos, correo, "12+ años", servicios | Del sitio actual | Dirección única de la planta (hoy hay dos) |
| Dimensionamiento del plano (litros → tamaños) | Regla orientativa de muestra | Sus reglas reales de dimensionamiento |
| Tres casos de éxito | Muestra, marcados con sello | Proyectos reales con permiso del cliente, fotos y una cifra |
| Especificaciones del tanque (diámetro, altura, peso) | Muestra, marcadas | Ficha técnica real por capacidad |
| Dossier de entrega | Propuesta, marcada | Qué documentos entrega de verdad |
| Respuestas de preguntas frecuentes | Muestra | Plazos, garantía, cobertura y forma de pago |
| Compromiso de respuesta en menos de 1 hora | Propuesta | Confirmar que lo puede cumplir |
| Fotos de equipos | Reales (7 equipos, recibidas por WhatsApp, ~1.000 px) | Archivos originales en alta, fotos de los demás equipos y confirmar nombre de tolva, mesa de desuerado y lavabotas |
| Videos | Referencia de Pexels, más un video de muestra del hilado | Videos propios de planta y equipos (30 a 90 s), sin marca de agua |
| Modelos 3D de los 19 equipos | Hechos por código, genéricos | Planos o fotos de cada equipo real para ajustarlos |
| Medidas, potencias y pesos de las fichas | Muestra (fórmulas orientativas) | Ficha técnica real por capacidad |
| Lecturas del funcionamiento (temperaturas, tiempos) | Valores típicos de muestra | Parámetros reales de sus equipos |
| Huellas y reglas del constructor de planta | Aproximadas | Medidas reales y criterios de distribución |

## Cotizador

En el prototipo, la solicitud se guarda solo en el navegador (`localStorage`, clave `eqx-solicitudes`) y genera el mensaje de WhatsApp con el resumen. En la versión real se envía a un servidor o servicio de formularios y llega al correo de ventas antes de abrir WhatsApp.

**Solicitud con PDF, igual desde el formulario y desde el asistente** (2026-11-05, pedido de Lucas)

`js/solicitud.js` arma una sola solicitud para los dos caminos:

- folio `EQX-AAMMDD-NNNN`;
- registro en `eqx-solicitudes`, por folio;
- filas del resumen y texto de WhatsApp: "Envié la solicitud EQX-… desde la web. Adjunto el PDF con el detalle técnico." y luego Tipo, Producción, Equipos con capacidad, Lugar, Plazo, Contacto, Correo y Nota;
- el PDF.

**El PDF** (`solicitudPDF` en `js/pdf.js`, comprimido, unos 190 KB con 3 equipos):

- **Página 1:** encabezado azul con logo, folio y fecha; título ("Planta de…" o "Equipos para…"); sello "PARA COTIZAR"; bloques Cliente y Proyecto; tabla de equipos con código, nombre y capacidad o cantidad; nota y consulta del cliente; aviso de capacidades orientativas; bloque "Cotiza con Equinox" con un QR que abre WhatsApp con el folio.
- **Página 2 en adelante:** resumen técnico de cada equipo, con foto real o render, código, línea, descripción y datos principales de su ficha (`FICHAS`) para la capacidad elegida.

**Cómo llega a Equinox** (llega directo a su chat, pedido de Lucas tras la prueba en el celular):

- **A qué número llega (pedido de Lucas, 2026-11-05):** todo lo de la web apunta a **un solo número**, `WHATSAPP` en `js/data.js`. Por ahora es el del dueño, +57 312 841 0099; cuando Equinox defina el número final, se cambia solo ahí.
  - Usan ese número: solicitudes del formulario y del asistente, demás mensajes del asistente, botón WhatsApp de las fichas, "Enviar por WhatsApp" del constructor 3D, código QR y fila WhatsApp de los PDF y de la propuesta de planta, botón del pie (muestra el número), "ayuda para elegir" en Equipos y barra del celular.
  - Los enlaces escritos en el HTML ya traen el número; `apuntarWhatsApp()` (al cargar `asistente.js`) los lleva al número vigente o al de prueba.
  - No cambian: los teléfonos para llamar del pie (310 725 0200 y 312 841 0099), la fila "Teléfono" de los PDF (310 725 0200) y el teléfono de los datos estructurados.
- WhatsApp no deja adjuntar archivos desde un enlace (`wa.me` solo lleva texto), y compartir desde el celular no puede elegir el destinatario: la persona tenía que buscar el chat.
- **Con servidor (la forma buena, la de la versión real):**
  - Al registrar la solicitud, el PDF se sube con `POST api/solicitudes?folio=EQX-…`.
  - El mensaje lleva la línea "PDF de la solicitud: https://…/solicitudes/EQX-….pdf".
  - "Enviar a Equinox por WhatsApp" abre directo el chat de Equinox con todo listo: un toque para enviar, sin descargas ni elegir contacto. El asesor abre el PDF desde el enlace.
  - El mensaje que se ve en la web se actualiza con el enlace apenas termina la subida. Si falla, se vuelve a intentar al tocar Enviar.
- **Sin servidor (sitio estático, como el panel de la app):** queda el respaldo.
  - En el celular se comparte el PDF con el mensaje.
  - En el computador se descarga el PDF y se abre WhatsApp con el mensaje; el aviso pide arrastrar el PDF al chat.
- **"Descargar PDF"** está siempre.
- **Número de prueba:** abrir cualquier página con `?wa=57` + el número real del celular de prueba (sin espacios ni +) hace que **todos** los enlaces de WhatsApp (y el QR de los PDF) apunten a ese celular.
  - Sigue al pasar a otras páginas del sitio en esa pestaña, y arriba aparece un aviso rojo "Prueba: WhatsApp va al …" con el botón "Usar +57 312 841 0099".
  - Al abrir la web directo sin `?wa=` (escribiendo la dirección, desde un enlace externo o el QR) vuelve sola al número de `data.js`. `?wa=0` también lo quita.
  - Ojo: si el número de prueba no tiene WhatsApp (por ejemplo, uno de ejemplo), WhatsApp dice que el número no es válido. Así pasó en la primera prueba de Lucas con 300 123 4567; por eso ahora se ve el aviso y abrir directo lo olvida.
- **Para la versión real:** el servidor de Equinox debe recibir `api/solicitudes`, guardar el PDF con una dirección pública difícil de adivinar y, a la vez, mandar la solicitud al correo de ventas o al CRM.
- **Servidor de prueba para el celular:** `servidor_https.py`, configuración `equinox-celular` en `.claude/launch.json`.
  - Corre en `https://192.168.1.19:8443`, con certificado propio de 7 días y los dos en la carpeta temporal de la sesión.
  - Hace de servidor de Equinox: recibe el PDF, lo guarda en `solicitudes/` y lo sirve. Valida el folio y solo acepta PDF de hasta 8 MB.
  - Quien recibe el enlace solo lo abre si está en la misma red Wi-Fi; en la versión real el enlace es público.
- Lecciones: la librería de PDF se carga una sola vez aunque la pidan dos llamadas a la vez (antes respondía "lista" antes de tiempo), y un intento de subida fallido no se recuerda.

**El asistente hace las mismas preguntas que el formulario** cuando se cotiza (planta o equipos) o se pide asesoría:

1. Quién eres (los 5 tipos).
2. Producto y litros (también para equipos sueltos).
3. Equipos (toda la línea, algunos o del catálogo).
4. Plazo, municipio y departamento. "Rionegro, Antioquia" llena los dos.
5. Nombre y empresa, celular (o "el mismo de mi WhatsApp"), correo opcional y nota opcional.

Lo que la persona ya dejó en el sitio no se vuelve a preguntar. Ver la planta y hablar con un asesor siguen siendo caminos cortos, sin solicitud.

Probado: asistente (quesera, costeño a 2.000 L, tanque y prensa de la línea más hiladora del catálogo, Rionegro, Antioquia; PDF de 2 páginas revisado) y formulario (procesadora, mozzarella a 3.000 L, hiladora y formadora). La descarga y WhatsApp se interceptaron en la prueba. Compartir en el celular no se pudo probar en el panel, que no tiene esa función.

## Videos de referencia (Pexels, uso gratuito)

| Archivo | Autor | Página |
| --- | --- | --- |
| `assets/video/tanques-5532872.mp4` y `tanques-5532872-vertical.mp4` | cottonbro studio | https://www.pexels.com/video/a-man-taking-samples-of-fermenteed-beer-5532872/ (banda de fábrica; recorte horizontal para escritorio y vertical para celular) |
| `assets/video/corte-13530502.mp4` | Maria Van | https://www.pexels.com/video/cutting-metal-with-diamond-disc-13530502/ (etapa 02, recorte 3:4) |
| `assets/video/pulido-4941370.mp4` | Tima Miroshnichenko | https://www.pexels.com/video/a-person-polishing-a-metal-tube-4941370/ (etapa 03, recorte 3:4) |
| `assets/video/ordeno-4911448.mp4` | cottonbro studio | https://www.pexels.com/video/a-cow-is-being-milked-by-a-machine-4911448/ (etapa 04, fichas de tanques de finca y acopio) |
| `assets/video/quesos-5930398.mp4` | Anna Shvets | https://www.pexels.com/video/a-person-wearing-blue-gloves-5930398/ (soluciones de queso campesino, caso destacado y fichas de quesos sin video propio) |
| `assets/video/tanques-38806069.mp4` | Kiwi and Camera | https://www.pexels.com/video/female-brewer-inspecting-large-steel-brewing-vats-38806069/ (fichas de pasteurizador, mezcla, fermentación y silo) |

Videos anteriores que ya no usa el sitio (se pueden borrar antes de entregar): `leche-8064136`, `pulido-35614237`, `soldadura-6046358`, `quesos-39019818` y `planta-35844883`, con sus pósters en `assets/img/posters/`.

Las imágenes fijas de `assets/img/posters/` son el primer cuadro de cada video.

## Material real de Equinox

Fotos y un video que entregó Equinox (carpeta `publicidad/` del proyecto, 2026-11-04). Los datos están en `js/data.js` (`FOTOS` y `GALERIA`) y en `js/fichas.js` (`proceso` de la hiladora).

| Archivo | Equipo | Dónde se usa |
| --- | --- | --- |
| `assets/img/equipos/pasteurizador.jpg` | Pasteurizador a placas (con logo) | Galería destacada, vista "Foto real" de su ficha y portada del PDF de ficha |
| `assets/img/equipos/hiladora-1.jpg`, `hiladora-2.jpg` | Hiladora, dos ángulos | Galería, ficha (con miniaturas) y PDF |
| `assets/img/equipos/prensa.jpg` | Prensa neumática vertical, 6 pistones | Galería, ficha y PDF |
| `assets/img/equipos/tina.jpg` | Tina rectangular con doble pared (se asumió tina de cuajado: confirmar) | Galería, ficha y PDF |
| `assets/img/equipos/tolva.jpg` | Tolva cónica con estructura (fuera del catálogo) | Solo galería, nombre por confirmar |
| `assets/img/equipos/mesa-desuerado.jpg` | Mesa de desuerado con ruedas (fuera del catálogo) | Solo galería, nombre por confirmar |
| `assets/img/equipos/lavabotas.jpg` | Lavabotas sanitario (fuera del catálogo) | Solo galería, nombre por confirmar |
| `assets/video/hilado-equinox.mp4` | Video de muestra del hilado (480 × 848, sin audio, trae marca de agua de TikTok) | Bloque "Así se ve el proceso" de la ficha de la hiladora y panel "Mozzarella y pasta hilada" de Soluciones |
| `assets/video/planta-tolva.mp4` | Cuajada desmenuzada en la tolva (5,5 s) | Sección "Así trabaja una línea en planta" de la portada, toma 01 |
| `assets/video/planta-llenado.mp4` | La pasta hilada sale de la máquina y llena un molde de bloque (11 s) | Portada, toma 02, y bloque "Así se ve el proceso" de la ficha del molde de queso mozzarella |
| `assets/video/planta-moldes.mp4` | Moldes de mozzarella en la mesa mientras un operario carga canastillas junto a la máquina (8 s) | Portada, toma 03 |
| `assets/video/planta-carros.mp4` | Carros escabiladeros cargados de moldes (5,5 s) | Portada, toma 04, y bloque "Así se ve el proceso" de la ficha del carro escabiladero |

### Videos de planta (2026-11-05)

Salen de dos videos de WhatsApp de una línea de mozzarella en operación (Lucas confirmó que el proceso es de mozzarella) (`publicidad/WhatsApp Video 2026-11-05 at 11.03.44 AM.mp4`, 73 s, y `… 11.03.51 AM.mp4`, 140 s; verticales de 478 × 850). Tramos usados:

- `planta-tolva`: video 1, 0:36 a 0:41,5.
- `planta-llenado`: video 1, 0:04 a 0:15.
- `planta-moldes`: video 2, 0:17 a 0:25.
- `planta-carros`: video 2, 1:37 a 1:42,5.

Proceso de los clips:

- sin audio;
- reducción leve de ruido y un poco más de contraste y color;
- H.264 CRF 24 con `+faststart`, en total unos 2,7 MB;
- pósters en `assets/img/posters/planta-*.jpg`, tomados del momento más claro de cada toma (no del primer cuadro).

Se dejaron por fuera los tramos con caras de operarios de frente y el ventilador tapando la toma.

Por confirmar con Equinox antes de publicar:

1. Que la máquina de las tomas 01 y 02 es suya y cómo se llama. Recibe la cuajada en una tolva, tiene dos cilindros verticales y llena moldes de bloque. No es la hiladora de las fotos (esa es de caja con tapa): puede ser una hiladora-moldeadora continua o la formadora. Si es otro equipo, conviene darle ficha propia.
   La línea de mozzarella del sitio (plano de portada, Soluciones, plantilla y recorrido de Arma tu planta, cotizador) quedó con 7 equipos, como en el video: tanque, pasteurización, tina, hiladora, formadora, molde de mozzarella (≈ moldes de 2,5 kg por día) y carro escabiladero (100 o 200 moldes). Confirmar con Equinox si una línea típica lleva formadora y moldes a la vez o solo uno de los dos.
2. Que la planta autoriza mostrar sus instalaciones y a su personal.
3. Que los moldes y carros de las tomas 03 y 04 son de Equinox.

Mientras tanto el sitio los presenta como "Video real" o "Video real de muestra", sin nombrar la planta ni decir que todo es de Equinox.

Las fichas con foto abren en la vista "Foto real"; las demás siguen abriendo en el modelo 3D. Para sumar un equipo: copiar la foto a `assets/img/equipos/` y agregarla en `FOTOS` (ficha y PDF) y en `GALERIA` (portada).

## 3D: acero inoxidable y piso (2026-11-05)

Pedido de Lucas: el piso se confundía con los equipos y el acero no parecía acero.

**Entorno de estudio** (`js/estudio.js`, `entornoAcero(renderer)`)

- Reemplaza al `RoomEnvironment` (un cuarto blanco parejo, que hacía ver el inox como plástico gris) en Arma tu planta, en el visor de las fichas y en el tanque de la portada.
- Es una sala de fotografía de producto: franjas de luz tipo softbox en el techo y los lados, un horizonte en las paredes (arriba claro, franja oscura, abajo gris medio) y paneles oscuros angostos para el contraste de bordes.
- El piso del entorno es gris medio a propósito. Las caras verticales vistas desde arriba lo reflejan; si es negro, el equipo se ve oscuro.

**Materiales** (`crearMateriales` en `js/modelos.js`)

- El acero es menos áspero (rugosidad de 0,3 a 0,2), para que se vean las franjas de luz.
- Tiene anisotropía, que da el brillo alargado del acero cepillado.

**Piso de Arma tu planta**

- Epóxico gris medio (`#7b8592`; en modo oscuro `#323c5c`) con un leve moteado y juntas claras cada 50 cm y 1 m, en lugar de la cuadrícula azul sobre casi blanco. Refleja poco el entorno (`envMapIntensity` 0,12) para no aclararse.
- Sombras reales de la luz principal (`PCFSoftShadowMap`, mapa de 2048, cámara de sombras ajustada al tamaño de la sala). Cada pieza opaca del equipo proyecta sombra, además de la sombra suave que ya tenía debajo.

Probado en el recorrido (tanque y pasteurizador de cerca), en la vista general en claro y oscuro, en la ficha del pasteurizador y en el tanque de la portada.

## Asistente de WhatsApp (robot de Equinox)

`js/asistente.js` está en la portada, en Equipos y en las fichas. Arma tu planta no lo lleva porque ya tiene su propio panel para cotizar.

**Cómo aparece**

- El robot redondo queda abajo a la derecha, con el sello de WhatsApp. En celular va encima de la barra WhatsApp / Cotizar.
- **El saludo sale desde el ícono.** La insignia redonda se desvanece y en su lugar aparece el robot completo saludando con la mano, con el sello de WhatsApp a sus pies (uno solo, no uno detrás del otro). Junto a él abre un globo que muestra "escribiendo…" y luego el mensaje con respuestas rápidas.
- **Dónde y cuántas veces:**
  - En la portada saluda **cada vez que se abre la página**, después de la entrada si la hay. Dice "¡Hola! Soy el asistente de Equinox. ¿Te ayudo a cotizar o a armar tu planta?" y ofrece: Cotizar mi planta, Ver una planta funcionando, Hablar con un asesor.
  - En Equipos y en las fichas saluda una vez por visita, para no interrumpir mientras se navega. En una ficha ofrece cotizar ese equipo.
- **Las respuestas rápidas** abren el asistente justo en ese punto de la conversación.
- **Si nadie lo toca:** el globo se recoge a los 16 s, o antes si la persona baja más de 160 px por la página (se queda mientras el cursor o el foco están encima). Vuelve la insignia y deja un "1" rojo con un pulso verde, que se borran al abrir el chat. Si se cierra con la X, no deja el "1".
- **Con "menos movimiento" activado** en el sistema, el robot aparece sin rebote ni saludo con la mano.

**El carrito de la cotización** (2026-11-06, pedido por Lucas: el asistente debe saber qué hay en el carrito)

- Si hay equipos en el carrito y no hay conversación guardada, el saludo dice "Tienes N equipos en tu cotización" y ofrece "Cotizar mis N equipos".
- Al empezar, el asistente muestra la lista del carrito y la primera opción es "Cotizar los N equipos de mi cotización". Un "sí" escrito también la elige.
- Con esa opción pregunta quién es, producto y litros, y arma la cotización con los equipos del carrito sin preguntar capacidad uno por uno: toma la de la línea sugerida si el equipo está en ella; si no, queda "por definir".
- Si elige otra cosa (por ejemplo, cotizar una planta), avisa que los equipos del carrito también van en la solicitud.
- Al retomar ("Sigamos donde íbamos"), y antes de mostrar "Tu cotización va así", compara el carrito con el que vio la última vez. Si la persona agregó o quitó equipos mientras navegaba, lo dice ("Vi que en tu cotización agregaste… y quitaste…") y pone la lista al día. Solo quita los equipos que habían entrado desde el carrito.
- Si la conversación ya terminó y el carrito cambia (o se vuelve a abrir el chat después del cambio), rehace el mensaje final con los equipos nuevos.
- La solicitud (folio, PDF y texto de WhatsApp) siempre incluye los equipos del carrito que no estén ya en ella.
- Va en los dos sentidos. Lo que se elige en el chat entra al carrito del menú: cada equipo que se suma y la línea completa si elige "Toda la línea". El contador salta y la portada y Equipos se ponen al día (botones + y formulario). El chat lo dice: "Tu cotización va así (también la ves en el carrito del menú)".
- Si eligió toda la línea y luego quita equipos de ella en el carrito, la cotización del chat deja de ser la línea completa y queda con los que siguen en el carrito.
- Agregar a la lista desde el chat:
  - Con equipos en el carrito, la primera pregunta también ofrece "Agregar otro equipo a la lista".
  - Se entienden frases escritas como "agregar otro", "añade una prensa", "súmale un molde", "uno más" o "incluir la marmita" (campo `agregar` en `asistente-texto.js`).
  - Primero pregunta el equipo nuevo (línea y equipo, o directo si lo nombró), con los del carrito ya en la lista. Después hace las preguntas de siempre, y los equipos que no tenían capacidad toman la de la línea sugerida.
  - Las mismas frases sirven en "¿Agregas otro equipo?", en "¿Qué quieres cotizar?" (va a otro equipo del catálogo) y con la solicitud ya lista: pregunta cuál, lo suma y rehace la solicitud.
  - Si eligió toda la línea y después suma otro, la solicitud lleva la línea más ese equipo.
  - Un equipo nombrado de pasada ("me interesa una prensa") también entra al carrito: "Lo sumo a tu cotización".
- El panel del carrito tiene "O por WhatsApp, con el asistente", que abre el chat directo con esos equipos.
- `pintarContador()` avisa con el evento `eqx:carrito-cambio` cada vez que cambia el carrito.

**La conversación**

Es un guion fijo con botones; no hay inteligencia artificial:

1. Qué necesita: cotizar, ver una planta funcionando, asesoría o hablar ya con un asesor. En una ficha aparece primero "Cotizar este equipo".
2. Qué produce.
3. Cuántos litros al día. No es obligatorio, y si la persona ya los puso en el sitio, aparecen marcados.
4. Muestra la línea sugerida, con enlaces a las fichas. Si la persona eligió "ver", da el botón al recorrido 3D.
5. Nombre y empresa. Si ya los dejó en el formulario de descargas, solo los confirma.
6. Municipio (se puede omitir).
7. Arma el mensaje y lo muestra antes de abrir WhatsApp (`wa.me/<WHATSAPP de data.js>`, hoy 573128410099).

**Qué se cotiza: toda la planta o equipos sueltos** (2026-11-05, pedido de Lucas)

- En la primera pregunta hay dos entradas para cotizar: "Cotizar una planta" y "Cotizar uno o varios equipos". En una ficha aparece además "Cotizar <ese equipo>".
- **Planta:** después de la línea sugerida pregunta "¿Qué quieres cotizar?" y ofrece tres opciones:
  - **Toda la línea (N equipos):** el mensaje lleva la línea sugerida completa.
  - **Solo algunos equipos:** los equipos de la línea aparecen como botones que se marcan y desmarcan (con ✓), más "Listo (n)" en verde.
  - **Otro equipo del catálogo.**
- **Equipos sueltos o del catálogo:** primero la línea, luego el equipo. Después pregunta la capacidad con las del catálogo (`FICHAS` en `js/fichas.js`) o "Aún no sé". A moldes, carros, mesones y canastillas también les pregunta "¿Cuántos necesitas?". Si el equipo ya está en la línea sugerida, toma su dato sin preguntar.
- Luego muestra "Tu cotización va así", con la lista y sus capacidades, y pregunta "¿Agregas otro equipo?" hasta que diga que no.
- **Producto que no está en la lista** ("Otro producto"): ofrece que un asesor proponga la línea o elegir equipos del catálogo.
- **Con sus palabras también funciona:**
  - "toda la planta" o "la línea completa" cotiza todo;
  - "solo el tanque y la prensa" marca esos equipos;
  - "quiero cotizar una prensa" entra directo a equipos sueltos;
  - "4 pistones", "20" o "veinte" responden capacidad o cantidad (`numeroDe` en `js/asistente-texto.js`).
- **El mensaje de WhatsApp** dice "Quiero cotizar estos equipos para mi planta de … (… L/día):" y la lista con capacidad y cantidad, o "capacidad por definir".
- El nombre se valida solo antes de la coma: "Pedro Ruiz, Quesos del Norte" se acepta aunque la empresa diga "Quesos".
- Probado con botones (costeño: tanque y prensa de la línea, más una hiladora del catálogo a 100 kg/h), escribiendo (prensa de 4 pistones más 20 moldes), con "toda la planta" (mozzarella a 3.000 L) y desde la ficha de la tina.

Detalles del mensaje y del texto libre:

- El mensaje suma los equipos que la persona marcó en la cotización.
- La persona puede escribir en vez de tocar botones, o escribir cualquier cosa. El asistente siempre contesta amable y vuelve a la pregunta pendiente; no avanza hasta tener una respuesta válida. Lo hace con `js/asistente-texto.js`, un intérprete por palabras clave, sin inteligencia artificial.

**Lo que reconoce y anota aunque no sea lo que se preguntó:**

- Producto: "costeño", "mozarela", "yogurt", "arequipe"…
- Litros: "2.000", "3 mil litros", "dos mil".
- Equipos: "prensa", "moldes", "tina polivalente"…; los responde con el enlace a su ficha.
- Nombre y empresa: "soy Ana Gómez de Lácteos La Cima".
- Intención: "quiero hablar con una persona" pasa de una vez a WhatsApp.

**Temas que contesta a grandes rasgos y anota para el asesor:** precio, plazo, garantía, mantenimiento y repuestos, ubicación o visita, formas de pago, instalación y envío, material y fabricación a la medida. Las respuestas salen de la sección Preguntas del sitio, que también es de muestra.

**Cómo responde a lo demás:**

| La persona escribe | El asistente |
| --- | --- |
| Saludos, "gracias", "¿cómo estás?", risas, emojis | Responde cordial |
| "¿Eres un robot?" | Explica que es el asistente automático y que por WhatsApp atiende una persona |
| Preguntas ajenas ("¿qué hora es?", "cuéntame un chiste") | Dice con amabilidad que solo sabe de plantas y equipos |
| Texto sin sentido ("asdfgh") | "Perdona, no te entendí bien" |
| Groserías | Contesta con calma y no repite nada |
| Una pregunta del tema que no sabe contestar | La pasa al asesor tal cual, en "Mi consulta" |

En los casos que no aporta nada, vuelve a hacer la pregunta pendiente. Tras dos tropiezos ofrece "Hablar con un asesor" como botón.

**Lo que nunca pasa:**

- Nada ofensivo, sin sentido ni fuera de tema llega al mensaje de WhatsApp.
- Un "hola" o un "¿cuánto cuesta?" no se guarda como nombre ni como municipio.

**Después de armar el mensaje**, lo nuevo que sea útil se agrega y el borrador se rehace; a lo demás contesta y recuerda que el mensaje sigue listo.

**Probar el intérprete en Node:**

```
node --input-type=module -e "import { entender } from './js/asistente-texto.js'; console.log(entender('¿cuánto cuesta un tanque de 2 mil litros?'))"
```

**Otras entradas**

- Cualquier botón con `data-asistente-abrir="cotizar|ver|asesoria|humano"` abre el asistente en ese punto. Así funciona "¿Tu pregunta no está aquí?" en Preguntas.

**Qué guarda**

- Lee `eqx-litros`, `eqx-cotizacion` y `eqx-interesado`, que la persona ya dejó en el sitio.
- **La conversación sobrevive a la navegación** (2026-11-05, pedido de Lucas). Se guarda en `sessionStorage` (`eqx-asistente-chat`) en cada mensaje y al salir de la página: el texto, los datos y qué pasos ya respondió (`datos.hecho`). Solo vive en esa pestaña, se borra al cerrarla y vence a los 45 minutos.
  - **Al volver a la página donde tenía el chat abierto** (por ejemplo, después de abrir una ficha o el recorrido 3D desde el chat): el chat se abre solo con toda la conversación y retoma con "Sigamos donde íbamos" y la pregunta pendiente. Esa pregunta y el "Sigamos" anterior se quitan del final antes de repetirlos, así no se acumulan con cada ida y vuelta.
  - **En otra página** (la ficha que abrió): el chat queda cerrado para dejar ver la página. El saludo dice "¿Seguimos con tu consulta?" (o "Tu mensaje para WhatsApp sigue listo" si ya terminó) y ofrece "Seguir la conversación" o "Empezar de nuevo". El botón del robot sigue la misma conversación.
  - El botón de reiniciar del chat empieza una conversación nueva.
  - Probado: portada → ficha de la prensa → atrás → ficha de la tina → atrás (una sola pregunta y un solo "Sigamos"), y conversación terminada → Equipos (mensaje listo).
- Guarda en `sessionStorage` (`eqx-asistente-saludo-equipos`, `eqx-asistente-saludo-equipo`) que el saludo ya salió en esas páginas. La portada no lo guarda porque saluda siempre.

**Imágenes**

Están en `assets/img/asistente/` y salen de los PNG de `publicidad/` (2026-11-05), pasados a WebP. Pesan unos 190 KB en total, frente a 9 MB de los originales.

| Archivo | Origen | Uso |
| --- | --- | --- |
| `avatar.webp` | Robot Equinox entre Acero y Chispas (insignia redonda), 192 px | Botón y cabecera del chat |
| `saludo.webp` | ok!.png | Globo de saludo y primer mensaje |
| `notas.webp` | Robot con portapapeles | Pregunta de nombre y empresa en el chat |
| `pulgar.webp` | constructor.png | Mensaje listo |
| `pensativo.webp` | Robot pensativo con tanque | Gancho en Preguntas |
| `holograma.webp` | Robot Equinox con Tanque Holográfico, 598 × 560 (74 KB) | Sin uso desde el 2026-11-06 (estaba en la primera pantalla; se quitó para despejarla) |
| `soldador.webp` | Robot soldador de Industrias Equinox, sin la barra ni las chispas pintadas, 605 × 520 (58 KB) | Entrada de la portada: hace la soldadura de la placa |

Sin usar todavía: los robots con laptop y de brazos cruzados (`aprobado.png`), y la hoja de 8 poses.

**Para la versión real**

- Ponerle nombre al robot si Equinox quiere.
- Del lado de WhatsApp, la app WhatsApp Business (gratis) ya permite mensaje de bienvenida, mensaje de ausencia, respuestas rápidas y catálogo.
- Un bot que conteste dentro de WhatsApp necesita la plataforma de WhatsApp Business (API) con un proveedor. Tiene costo por conversación, así que conviene medir primero cuántos mensajes llegan desde la web.

## Medición y mapas de calor (2026-11-06)

`js/medicion.js` mide el embudo con Google Analytics 4 y Microsoft Clarity (mapas de calor y grabaciones). Los nombres de eventos y las reglas están en `.claude/skills/equinox-base/references/medicion.md` y en la skill `embudo-equinox`.

- **Hoy está inactivo:** `GA4_ID` y `CLARITY_ID` están vacíos en `js/data.js`. Con ellos vacíos no se carga nada, y en localhost nunca se carga. Se llenan con las cuentas de Equinox cuando el sitio pase a su dominio.
- **Modo de prueba:** abrir con `?debug_medicion=1`. Se recuerda en la pestaña y `?debug_medicion=0` lo apaga. Cada evento sale en la consola (`[medición]`) y queda en `window.eqxEventos`.
- **Eventos:** `ver_ficha`, `agregar_cotizacion` (uno por equipo nuevo, con su origen), `abrir_carrito`, `abrir_asistente`, `iniciar_cotizacion`, `generate_lead` (una vez por folio), `clic_whatsapp` (con su ubicación), `descargar_pdf` y `ver_recorrido_3d`.
- **Origen de la visita:** se guarda la primera visita por 90 días en `localStorage` (`eqx-origen`), con UTM, gclid o fbclid, o el sitio de donde llegó. Cada solicitud registrada guarda la `fuente` ("linkedin / organico · campaña" o "directo"), que también va en `generate_lead`.
- **Datos personales:** a GA4 y a Clarity no se envían nombre, celular ni correo. En las grabaciones van ocultos el formulario (`data-clarity-mask` en `#formulario`), el panel del asistente y el diálogo de datos de las descargas.
- **Probado el 2026-11-06** con `?debug_medicion=1&utm_source=linkedin…`: portada, carrito, pie, asistente, formulario completo (`generate_lead` con su fuente y sin datos personales), catálogo, ficha y recorrido 3D.

## Librerías y licencias

- Three.js 0.170.0 (MIT) con RoomEnvironment y OrbitControls · `vendor/three/`
- GSAP 3.12.5 y ScrollTrigger · `vendor/gsap/`
- jsPDF 2.5.2 (MIT) y qrcode-generator 1.4.4 (MIT) · `vendor/pdf/`
- Archivo y Martian Mono (SIL OFL) · `fonts/`
- Íconos Phosphor Light (MIT) · `assets/img/iconos.svg`

## Estructura

```
web-mock/
  index.html, ficha-tanque-enfriamiento.html
  css/main.css          estilos y tokens
  equipo.html, planta.html
  js/data.js            catálogo, aplicaciones y casos
  js/fichas.js          contenido técnico de los 19 equipos
  js/modelos.js         modelos 3D por familia, piezas y animación de funcionamiento
  js/visor.js           visor de ficha (explosionada, corte, funcionamiento, capturas)
  js/drawing.js         plano de proceso en SVG (enlaces a fichas)
  js/tank3d.js          tanque 3D de la portada
  js/pdf.js             ficha técnica, plano de planta y plano por equipo en PDF
  js/planos.js          dibujante de planos de disposición general (compartido con el skill)
  js/main.js, equipo.js, planta.js   comportamiento de cada página
```
