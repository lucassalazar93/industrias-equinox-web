// Datos del mock. Capacidades tomadas del catálogo PDF de Equinox (2025).
// Todo lo marcado como muestra debe reemplazarse con información real de Equinox.

// WhatsApp: UN solo número para todo lo de la web (solicitudes del formulario y del asistente, mensajes del
// asistente, fichas, línea, planta, código QR de los PDF, pie de página, barra del celular y ayuda para elegir).
// Por ahora, el del dueño (+57 312 841 0099). Cuando Equinox defina el número final, se cambia solo aquí.
export const WHATSAPP = '573128410099';

// Prueba con otro celular sin tocar el código: abrir la web con ?wa=57 + el número (sin espacios) y todo apunta
// a ese celular. Sigue al pasar a otras páginas del sitio en esa pestaña; al abrir la web directo sin ?wa=
// (escribiendo la dirección, desde un enlace externo o un QR) vuelve al número de arriba. ?wa=0 también lo quita.
try {
  const p = new URLSearchParams(location.search).get('wa');
  const desdeElSitio = !!document.referrer && new URL(document.referrer).origin === location.origin;
  if (p && /^\d{10,13}$/.test(p)) sessionStorage.setItem('eqx-wa-prueba', p);
  else if (p === '0' || !desdeElSitio) sessionStorage.removeItem('eqx-wa-prueba');
} catch { /* fuera del navegador o sin almacenamiento */ }
export function numeroWhatsApp() {
  try { return sessionStorage.getItem('eqx-wa-prueba') || WHATSAPP; } catch { return WHATSAPP; }
}
// 573128410099 → +57 312 841 0099
export const textoWhatsApp = (n = numeroWhatsApp()) => n.length === 12 && n.startsWith('57') ? `+57 ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}` : `+${n}`;
// Lleva al número vigente los enlaces de WhatsApp escritos en el HTML y el número que se muestra ([data-wa-numero])
// Carrito de la cotización en el menú: cantidad de equipos y un salto cuando se agrega uno
let conteoAnterior = null;
export function pintarContador(n) {
  document.querySelectorAll('[data-contador]').forEach((el) => {
    const num = el.querySelector('.mono');
    if (num) num.textContent = n;
    el.classList.toggle('con-items', n > 0);
    el.setAttribute('aria-label', n ? `Ver la cotización: ${n} ${n === 1 ? 'equipo' : 'equipos'}` : 'Ver la cotización: sin equipos');
    if (conteoAnterior !== null && n > conteoAnterior) { el.classList.remove('salta'); void el.offsetWidth; el.classList.add('salta'); }
  });
  // Aviso para quien lo necesite (el asistente pone al día su mensaje si la conversación ya terminó)
  if (conteoAnterior !== null) document.dispatchEvent(new CustomEvent('eqx:carrito-cambio', { detail: n }));
  conteoAnterior = n;
}
export function apuntarWhatsApp(raiz = document) {
  const n = numeroWhatsApp();
  raiz.querySelectorAll('a[href^="https://wa.me/"]').forEach((a) => { a.href = a.href.replace(/wa\.me\/\d+/, `wa.me/${n}`); });
  raiz.querySelectorAll('[data-wa-numero]').forEach((el) => { el.textContent = textoWhatsApp(n).replace(/^\+57 /, ''); });
  avisoPrueba(n);
}
// Con número de prueba, un aviso arriba lo deja claro (y permite volver al número de la web)
function avisoPrueba(n) {
  document.querySelector('.aviso-wa-prueba')?.remove();
  if (n === WHATSAPP) return;
  const aviso = document.createElement('div');
  aviso.className = 'aviso-wa-prueba';
  aviso.setAttribute('role', 'status');
  aviso.innerHTML = `<span>Prueba: WhatsApp va al <strong>${textoWhatsApp(n)}</strong></span><button type="button">Usar ${textoWhatsApp(WHATSAPP)}</button>`;
  aviso.querySelector('button').addEventListener('click', () => {
    try { sessionStorage.removeItem('eqx-wa-prueba'); } catch { /* sin almacenamiento */ }
    const url = new URL(location.href); url.searchParams.delete('wa');
    location.replace(url.href);
  });
  document.body.append(aviso);
}

export const LINEAS = [
  { id: 'quesos', nombre: 'Quesos' },
  { id: 'proceso', nombre: 'Pasteurización y proceso' },
  { id: 'frio', nombre: 'Almacenamiento y frío' },
  { id: 'fermentados', nombre: 'Fermentados' },
  { id: 'mantequilla', nombre: 'Mantequilla y dulces' },
  { id: 'implementos', nombre: 'Implementos' },
];

// simbolo: forma del dibujo técnico en la línea de proceso
export const EQUIPOS = {
  enfriamiento: { nombre: 'Tanque de enfriamiento', linea: 'frio', capacidad: '300 – 2.000 L', simbolo: 'tanque', tag: 'TE', ficha: 'ficha-tanque-enfriamiento.html' },
  almacenamiento: { nombre: 'Tanque de almacenamiento y conservación', linea: 'frio', capacidad: '3.000 – 20.000 L', simbolo: 'silo', tag: 'TA' },
  pasteurizador: { nombre: 'Pasteurizador a placas', linea: 'proceso', capacidad: '100 – 10.000 L/h', simbolo: 'placas', tag: 'PP' },
  marmitaMulti: { nombre: 'Marmita multiprocesos', linea: 'proceso', capacidad: 'Por confirmar', simbolo: 'marmita', tag: 'MM' },
  marmitaVolcable: { nombre: 'Marmita volcable', linea: 'mantequilla', capacidad: '50 – 300 L', simbolo: 'marmita', tag: 'MV' },
  mezcla: { nombre: 'Tanque de mezcla', linea: 'proceso', capacidad: '100 – 3.000 L', simbolo: 'tanque', tag: 'TM' },
  fermentacion: { nombre: 'Tanque de fermentación yogur – kumis', linea: 'fermentados', capacidad: '100 – 10.000 L', simbolo: 'conico', tag: 'TF' },
  tina: { nombre: 'Tina de cuajado con calentamiento', linea: 'quesos', capacidad: '100 – 5.000 L', simbolo: 'tina', tag: 'TC' },
  polivalente: { nombre: 'Tina polivalente', linea: 'quesos', capacidad: '2.000 – 6.000 L', simbolo: 'tina', tag: 'TP' },
  hiladora: { nombre: 'Hiladora de quesos a gas o vapor', linea: 'quesos', capacidad: '50 – 300 kg', simbolo: 'hiladora', tag: 'HI' },
  formadora: { nombre: 'Formadora de queso', linea: 'quesos', capacidad: '500 – 2.500 g', simbolo: 'formadora', tag: 'FQ' },
  prensa: { nombre: 'Prensa neumática vertical', linea: 'quesos', capacidad: '1 – 8 pistones', simbolo: 'prensa', tag: 'PN' },
  moldePrensa: { nombre: 'Molde prensa de quesos', linea: 'quesos', capacidad: '20 – 40 kg', simbolo: 'moldes', tag: 'MP' },
  moldeCosteno: { nombre: 'Molde queso costeño', linea: 'quesos', capacidad: '10 – 20 kg', simbolo: 'moldes', tag: 'MC' },
  moldeMozzarella: { nombre: 'Molde queso mozzarella', linea: 'quesos', capacidad: '2.500 g', simbolo: 'moldes', tag: 'MZ' },
  carro: { nombre: 'Carro escabiladero para moldes', linea: 'quesos', capacidad: '100 – 200 moldes', simbolo: 'carro', tag: 'CE' },
  mantequillera: { nombre: 'Mantequillera', linea: 'mantequilla', capacidad: '30 – 300 L', simbolo: 'tambor', tag: 'MT' },
  meson: { nombre: 'Mesón con doble entrepaño', linea: 'implementos', capacidad: '100 × 200 × 90 *', simbolo: 'meson', tag: 'ME' },
  canastilla: { nombre: 'Canastilla inoxidable', linea: 'implementos', capacidad: '60 × 40 × 25 *', simbolo: 'meson', tag: 'CA' },
};

// Orden del catálogo (por línea): lo usan la lista de la portada, la página Equipos y el anterior/siguiente de la ficha
export const ORDEN_EQUIPOS = Object.keys(EQUIPOS).sort((a, b) => LINEAS.findIndex((l) => l.id === EQUIPOS[a].linea) - LINEAS.findIndex((l) => l.id === EQUIPOS[b].linea));

// Imagen de catálogo: foto real si existe; si no, render del modelo 3D (assets/img/equipos/render-<id>.jpg)
export const imagenEquipo = (id) => (FOTOS[id] ? { src: FOTOS[id][0].src, real: true } : { src: `assets/img/equipos/render-${id}.jpg`, real: false });

const redondear = (v, paso) => Math.max(paso, Math.round(v / paso) * paso);
const fmt = (n) => n.toLocaleString('es-CO');
const tanqueFrio = (L) => {
  const tallas = [300, 500, 1000, 1500, 2000];
  const t = tallas.find((x) => x >= L);
  return t ? { id: 'enfriamiento', dato: `${fmt(t)} L` } : { id: 'almacenamiento', dato: `${fmt(redondear(L, 1000))} L` };
};
const pasteurizacion = (L) => (L <= 1000
  ? { id: 'marmitaMulti', dato: `${fmt(redondear(L / 2, 50))} L por lote` }
  : { id: 'pasteurizador', dato: `${fmt(redondear(L / 4, 250))} L/h` });
const kgQueso = (L, rendimiento) => Math.round(L / rendimiento);

// Cada aplicación devuelve la línea sugerida según los litros diarios (orientativo).
export const APLICACIONES = [
  {
    id: 'campesino', nombre: 'Queso fresco y campesino', corto: 'Queso campesino',
    resumen: 'Del ordeño al molde: enfriar, pasteurizar, cuajar y prensar con control de temperatura en cada paso.',
    video: 'quesos-5930398', rendimiento: 8,
    linea: (L) => [tanqueFrio(L), pasteurizacion(L),
      { id: 'tina', dato: `${fmt(Math.min(5000, redondear(L / 2, 100)))} L` },
      { id: 'moldePrensa', dato: `≈ ${fmt(kgQueso(L, 8))} kg/día` },
      { id: 'prensa', dato: `${Math.min(8, Math.max(1, Math.ceil(L / 800)))} pistones` }],
  },
  {
    id: 'costeno', nombre: 'Queso costeño', corto: 'Queso costeño',
    resumen: 'Cuajado, salado y prensado en bloque para un queso firme y parejo, lote tras lote.',
    video: 'quesos-5930398', rendimiento: 7,
    linea: (L) => [tanqueFrio(L),
      { id: 'tina', dato: `${fmt(Math.min(5000, redondear(L / 2, 100)))} L` },
      { id: 'moldeCosteno', dato: `≈ ${fmt(kgQueso(L, 7))} kg/día` },
      { id: 'prensa', dato: `${Math.min(8, Math.max(1, Math.ceil(L / 700)))} pistones` },
      { id: 'carro', dato: `${L > 2000 ? 200 : 100} moldes` }],
  },
  {
    id: 'mozzarella', nombre: 'Mozzarella y pasta hilada', corto: 'Mozzarella',
    resumen: 'Cuajada lista para hilar a la temperatura justa, formado del peso que vende y bloques en molde que se enfrían en carro.',
    video: 'hilado-equinox', credito: 'Video de muestra del proceso de hilado', rendimiento: 9,
    linea: (L) => [tanqueFrio(L), pasteurizacion(L),
      { id: 'tina', dato: `${fmt(Math.min(5000, redondear(L / 2, 100)))} L` },
      { id: 'hiladora', dato: `${fmt(Math.min(300, Math.max(50, redondear(kgQueso(L, 9) / 4, 50))))} kg/h` },
      { id: 'formadora', dato: '500 – 2.500 g' },
      // Bloque de 2,5 kg en molde y carro a enfriar, como en el video real de planta
      { id: 'moldeMozzarella', dato: `≈ ${fmt(Math.ceil(kgQueso(L, 9) / 2.5))} moldes/día` },
      { id: 'carro', dato: `${kgQueso(L, 9) / 2.5 > 100 ? 200 : 100} moldes` }],
  },
  {
    id: 'fermentados', nombre: 'Yogur y kumis', corto: 'Yogur y kumis',
    resumen: 'Pasteurización, mezcla e incubación en tanques con chaqueta para un fermentado estable.',
    video: 'tanques-38806069',
    linea: (L) => [pasteurizacion(L),
      { id: 'mezcla', dato: `${fmt(Math.min(3000, redondear(L / 2, 100)))} L` },
      { id: 'fermentacion', dato: L > 2000 ? `2 × ${fmt(redondear(L / 2, 500))} L` : `${fmt(redondear(L, 100))} L` }],
  },
  {
    id: 'pasteurizada', nombre: 'Leche pasteurizada', corto: 'Leche pasteurizada',
    resumen: 'Recibo, pasteurización continua y almacenamiento en frío listo para envasar.',
    video: 'tanques-38806069',
    linea: (L) => [tanqueFrio(L),
      { id: 'pasteurizador', dato: `${fmt(redondear(L / 4, 250))} L/h` },
      { id: 'almacenamiento', dato: `${fmt(Math.max(3000, redondear(L, 1000)))} L` }],
  },
  {
    id: 'acopio', nombre: 'Acopio y enfriamiento en finca', corto: 'Acopio en finca',
    resumen: 'La leche se enfría apenas sale del ordeño y llega en mejores condiciones a la planta.',
    video: 'ordeno-4911448',
    linea: (L) => [tanqueFrio(L)],
  },
  {
    id: 'mantequilla', nombre: 'Mantequilla y arequipe', corto: 'Mantequilla',
    resumen: 'Batido de crema y cocción con volteo para dulces de leche sin pegarse.',
    video: 'ordeno-4911448',
    linea: (L) => [{ id: 'mantequillera', dato: `${fmt(Math.min(300, Math.max(30, redondear(L / 10, 10))))} L` },
      { id: 'marmitaVolcable', dato: `${fmt(Math.min(300, Math.max(50, redondear(L / 8, 50))))} L` }],
  },
];

// Casos de muestra: estructura propuesta. Reemplazar con proyectos reales autorizados por los clientes.
// Los casos de abajo son de muestra: mientras MOSTRAR_CASOS sea false no aparecen en la portada ni en las fichas.
// Cuando Equinox tenga proyectos reales autorizados por sus clientes, se reemplazan y se pone en true
// (y se vuelve a poner "Casos" en el menú de las 4 páginas).
export const MOSTRAR_CASOS = false;
export const CASOS = [
  {
    id: 'quesera', destacado: true,
    proyecto: 'Proyecto de muestra 01', lugar: 'Norte de Antioquia', producto: 'Queso campesino',
    titulo: 'Una quesera familiar pasa de ollas a una línea de 2.000 litros diarios',
    reto: 'Procesaba 800 L al día en ollas, sin control de temperatura y con pérdidas por acidez.',
    solucion: 'Tanque de enfriamiento de 2.000 L, pasteurización por lotes, tina de cuajado de 1.000 L, moldes y prensa neumática.',
    cifra: '2.000 L', cifraTexto: 'procesados al día en dos turnos',
    video: 'quesos-5930398',
  },
  {
    id: 'acopio',
    proyecto: 'Proyecto de muestra 02', lugar: 'Oriente antioqueño', producto: 'Acopio',
    titulo: 'Asociación de productores entrega su leche fría a la planta',
    reto: 'La leche llegaba caliente al camión y la asociación recibía descuentos por calidad.',
    solucion: 'Dos tanques de enfriamiento de 2.000 L en el centro de acopio, con lavado y tablero de temperatura.',
    cifra: '4 °C', cifraTexto: 'temperatura de entrega',
    video: 'ordeno-4911448',
  },
  {
    id: 'yogur',
    proyecto: 'Proyecto de muestra 03', lugar: 'Valle de Aburrá', producto: 'Yogur y kumis',
    titulo: 'Una procesadora duplica su producción de yogur sin ampliar la planta',
    reto: 'Un solo tanque de incubación limitaba los despachos de fin de semana.',
    solucion: 'Dos tanques de fermentación de 1.000 L con chaqueta y un tanque de mezcla de 500 L.',
    cifra: '2×', cifraTexto: 'capacidad de fermentación',
    video: 'tanques-38806069',
  },
];

// Fotos reales de Equinox (carpeta publicidad/, recibidas por WhatsApp el 2026-11-04).
// Pedir los archivos originales para el sitio final: estas vienen comprimidas (~1.000 px).
export const FOTOS = {
  pasteurizador: [{ src: 'assets/img/equipos/pasteurizador.jpg', alt: 'Pasteurizador a placas Equinox con tablero de control, bomba e intercambiador de placas sobre bastidor inoxidable' }],
  hiladora: [
    { src: 'assets/img/equipos/hiladora-1.jpg', alt: 'Hiladora Equinox con motor, tablero de control y mangueras de agua caliente' },
    { src: 'assets/img/equipos/hiladora-2.jpg', alt: 'Hiladora Equinox vista de costado, con la compuerta de descarga' },
  ],
  prensa: [{ src: 'assets/img/equipos/prensa.jpg', alt: 'Prensa neumática vertical Equinox de seis pistones con los moldes cargados' }],
  tina: [{ src: 'assets/img/equipos/tina.jpg', alt: 'Tina rectangular Equinox con doble pared y válvula de salida' }],
};

// Galería "Hecho por Equinox" de la portada. Los equipos sin id no están entre los 19 del catálogo:
// su nombre es provisional hasta que Equinox lo confirme.
export const GALERIA = [
  { id: 'pasteurizador', foto: 'assets/img/equipos/pasteurizador.jpg' },
  { id: 'hiladora', foto: 'assets/img/equipos/hiladora-1.jpg' },
  { id: 'prensa', foto: 'assets/img/equipos/prensa.jpg' },
  { id: 'tina', foto: 'assets/img/equipos/tina.jpg' },
  { nombre: 'Tolva cónica con estructura', foto: 'assets/img/equipos/tolva.jpg' },
  { nombre: 'Mesa de desuerado con ruedas', foto: 'assets/img/equipos/mesa-desuerado.jpg' },
  { nombre: 'Lavabotas sanitario', foto: 'assets/img/equipos/lavabotas.jpg' },
];
