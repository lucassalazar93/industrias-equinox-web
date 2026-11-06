// Solicitud de cotización: la misma para el formulario de la portada y para el asistente.
// Arma el folio, la guarda (en el prototipo, en este navegador: localStorage 'eqx-solicitudes'),
// el texto para WhatsApp y el PDF con el detalle técnico de cada equipo.
// WhatsApp no deja adjuntar archivos desde un enlace (wa.me solo lleva texto), y compartir desde el celular
// no puede elegir el destinatario. Para que la solicitud llegue directo al chat de Equinox:
// - el PDF se sube al servidor (POST api/solicitudes?folio=…; en la versión real, el servidor de Equinox;
//   en la prueba con el celular, servidor_https.py) y el mensaje de WhatsApp lleva su enlace: un toque abre
//   el chat de Equinox con todo listo y el asesor abre el PDF desde ahí;
// - si no hay dónde subirlo (sitio estático, como el panel de la app), queda el respaldo: en el celular se
//   comparte el PDF y en el computador se descarga y se abre WhatsApp con el mensaje.
// El número de WhatsApp (y la prueba con ?wa=57300…) está en data.js: numeroWhatsApp().
import { numeroWhatsApp, EQUIPOS, LINEAS, imagenEquipo } from './data.js';
import { FICHAS } from './fichas.js';
import { solicitudPDF } from './pdf.js';

export const TIPOS_CLIENTE = [
  ['Finca o ganadero', 'Acopio y enfriamiento'],
  ['Quesera artesanal', 'Hasta 3.000 L/día'],
  ['Procesadora', 'Planta con varias líneas'],
  ['Cooperativa o asociación', 'Centro de acopio'],
  ['Entidad pública', 'Alcaldía, gobernación, programa'],
];
export const PLAZOS = ['En menos de 1 mes', 'En 1 a 3 meses', 'En 3 a 6 meses', 'Más adelante, estoy averiguando'];
export const DEPARTAMENTOS = ['Antioquia', 'Boyacá', 'Caldas', 'Cesar', 'Córdoba', 'Cundinamarca', 'Nariño', 'Quindío', 'Risaralda', 'Santander', 'Sucre', 'Valle del Cauca', 'Otro'];

const fmt = (n) => Number(n).toLocaleString('es-CO');
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

export function nuevoFolio(d = new Date()) {
  return `EQX-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

// Guarda o actualiza (por folio) la solicitud en este navegador
export function registrarSolicitud(sol) {
  const lista = leer('eqx-solicitudes', []).filter((s) => s.folio !== sol.folio);
  guardar('eqx-solicitudes', [...lista, sol]);
}

// Equipos de la solicitud con su capacidad: [{ id, dato }]
const textoEquipos = (sol) => {
  if (!sol.equipos?.length) return 'Por proponer';
  const lista = sol.equipos.map((e) => `${EQUIPOS[e.id].nombre}${e.dato ? ` (${e.dato})` : ''}`).join(', ');
  return sol.alcance === 'linea' ? `Línea completa sugerida: ${lista}` : lista;
};

// Filas del resumen: las mismas en la pantalla de éxito, el mensaje de WhatsApp y el PDF
export function filasSolicitud(sol) {
  const lugar = [sol.municipio, sol.departamento].filter(Boolean).join(', ');
  const produccion = [sol.producto, sol.litros ? `${fmt(sol.litros)} L/día` : ''].filter(Boolean).join(' · ');
  const contacto = [sol.nombre, sol.empresa, sol.celular].filter(Boolean).join(' · ');
  return [['Tipo', sol.tipo], ['Producción', produccion], ['Equipos', textoEquipos(sol)], ['Lugar', lugar], ['Plazo', sol.plazo], ['Contacto', contacto], ['Correo', sol.correo], ['Nota', sol.nota]]
    .filter(([, v]) => v);
}

// enlace: dirección del PDF ya subido; sin enlace, el mensaje avisa que el PDF va adjunto
export function textoSolicitud(sol, enlace = enlaceGuardado(sol)) {
  const filas = filasSolicitud(sol);
  const pdf = enlace ? `PDF de la solicitud: ${enlace}` : 'Adjunto el PDF con el detalle técnico.';
  let texto = `Hola, Equinox. Envié la solicitud ${sol.folio} desde la web.\n${pdf}\n${filas.map(([k, v]) => `• ${k}: ${v}`).join('\n')}`;
  if (sol.temas?.length) texto += `\nTambién quiero saber: ${sol.temas.join(', ')}.`;
  if (sol.consulta) texto += `\nMi consulta: ${sol.consulta}`;
  return texto;
}
export const urlWhatsApp = (sol, enlace) => `https://wa.me/${numeroWhatsApp()}?text=${encodeURIComponent(textoSolicitud(sol, enlace))}`;
export const nombreArchivo = (sol) => `Solicitud-${sol.folio}-Equinox.pdf`;

// Capacidad numérica para la tabla de la ficha, a partir del dato elegido ("2.000 L", "4 pistones", "≈ 286 kg/día")
function capacidadDe(id, dato) {
  const caps = FICHAS[id]?.capacidades || [1];
  const m = String(dato || '').match(/\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?/);
  const n = m ? Number(m[0].replace(/\./g, '').replace(',', '.')) : null;
  if (!n) return caps[0];
  return caps.find((c) => c >= n) ?? caps[caps.length - 1];
}

// El PDF se arma una vez por versión de la solicitud y queda en caché: así, al tocar "Enviar", compartir
// sale de inmediato (el celular exige que compartir ocurra justo después del toque)
const cache = new Map();
export function pdfSolicitud(sol) {
  const clave = JSON.stringify(sol);
  if (!cache.has(clave)) cache.set(clave, armarPdf(sol).catch((e) => { cache.delete(clave); throw e; }));
  return cache.get(clave);
}
// Sube el PDF al servidor y devuelve su enlace (o null si el sitio no tiene dónde guardarlo). Una vez por versión.
const subidas = new Map(), enlaces = new Map();
export function subirSolicitud(sol) {
  const clave = JSON.stringify(sol);
  if (!subidas.has(clave)) subidas.set(clave, (async () => {
    const blob = await pdfSolicitud(sol);
    const ctrl = new AbortController(), espera = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(`api/solicitudes?folio=${encodeURIComponent(sol.folio)}`, { method: 'POST', body: blob, headers: { 'Content-Type': 'application/pdf' }, signal: ctrl.signal });
      if (!r.ok) return null;
      const { url } = await r.json();
      const enlace = new URL(url, location.href).href;
      enlaces.set(clave, enlace);
      return enlace;
    } catch { return null; } finally { clearTimeout(espera); }
  })().then((enlace) => {
    // Si no se pudo subir, no se recuerda el fallo: el siguiente intento (por ejemplo, al tocar Enviar) vuelve a probar
    if (!enlace) subidas.delete(clave);
    return enlace;
  }));
  return subidas.get(clave);
}
export const enlaceGuardado = (sol) => enlaces.get(JSON.stringify(sol)) || null;
// Qué va a pasar al tocar "Enviar a Equinox por WhatsApp"
export function pistaEnvio(enlace) {
  if (enlace) return 'Se abre el chat de Equinox con tu mensaje y el enlace al PDF de la solicitud: solo tocas enviar.';
  return puedeCompartirArchivos()
    ? 'Eliges WhatsApp y el chat de Equinox: el PDF va adjunto con el mensaje.'
    : 'Se descarga el PDF y se abre el chat de Equinox con el mensaje; arrastra el PDF al chat.';
}
// Al registrar la solicitud: se arma el PDF y se sube de una vez (queda registrada aunque no abra WhatsApp)
export const prepararSolicitud = (sol) => subirSolicitud(sol).catch(() => null);
async function armarPdf(sol) {
  const items = (sol.equipos || []).filter((e) => EQUIPOS[e.id]).map((e) => {
    const eq = EQUIPOS[e.id], f = FICHAS[e.id];
    const cap = capacidadDe(e.id, e.dato);
    const capTxt = f?.fija || `${fmt(cap)} ${f?.unidad || ''}`.trim();
    const datos = f ? [['Capacidad', e.dato || capTxt], ...f.comunes.slice(0, 1), ...f.tabla(cap)] : [['Capacidad', e.dato || eq.capacidad]];
    return { tag: `${eq.tag}-01`, nombre: eq.nombre, linea: LINEAS.find((l) => l.id === eq.linea)?.nombre || '', dato: e.dato, resumen: f?.resumen || '', datos, img: imagenEquipo(e.id).src };
  });
  return solicitudPDF({ sol, items, textoWhatsApp: textoSolicitud(sol) });
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export async function descargarSolicitud(sol) {
  descargar(await pdfSolicitud(sol), nombreArchivo(sol));
}
// ¿Este navegador puede compartir archivos (celular)? Entonces el PDF va directo con el mensaje
export function puedeCompartirArchivos() {
  try { return !!navigator.canShare && navigator.canShare({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] }); } catch { return false; }
}
// Envía la solicitud al chat de Equinox. Con el PDF subido: abre WhatsApp con el mensaje y el enlace al PDF.
// Respaldo sin servidor: comparte el PDF con el mensaje (celular) o lo descarga y abre WhatsApp (computador).
// ventana: la pestaña abierta en el mismo clic, para que el navegador no la bloquee mientras se arma el PDF.
export async function enviarSolicitud(sol, { ventana = null } = {}) {
  const enlace = await subirSolicitud(sol);
  if (enlace) {
    const url = urlWhatsApp(sol, enlace);
    if (ventana && !ventana.closed) ventana.location.href = url;
    else if (!window.open(url, '_blank')) location.href = url;
    return 'enlace';
  }
  const blob = await pdfSolicitud(sol);
  if (puedeCompartirArchivos()) {
    const archivo = new File([blob], nombreArchivo(sol), { type: 'application/pdf' });
    try {
      await navigator.share({ files: [archivo], text: textoSolicitud(sol), title: `Solicitud ${sol.folio}` });
      ventana?.close();
      return 'compartido';
    } catch (e) {
      if (e?.name === 'AbortError') { ventana?.close(); return 'cancelado'; }
    }
  }
  descargar(blob, nombreArchivo(sol));
  if (ventana && !ventana.closed) ventana.location.href = urlWhatsApp(sol);
  else window.open(urlWhatsApp(sol), '_blank', 'noopener');
  return 'descargado';
}
