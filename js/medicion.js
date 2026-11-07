// Medición del embudo: Google Analytics 4 (cuántos pasan de un paso al siguiente) y Microsoft Clarity
// (mapas de calor y grabaciones: por qué no pasan). Nombres de eventos y UTM:
// .claude/skills/equinox-base/references/medicion.md. Detalle: .claude/skills/embudo-equinox/.
//
// - Con GA4_ID y CLARITY_ID vacíos (data.js) no se carga nada: el prototipo y las pruebas no ensucian datos.
// - Nunca se carga en localhost.
// - Modo de prueba: abrir el sitio con ?debug_medicion=1 (se recuerda en la pestaña; ?debug_medicion=0 lo apaga).
//   Cada evento se imprime en la consola y queda en window.eqxEventos.
// - A GA4 y a Clarity no se envían datos personales (nombre, celular, correo): solo producto, litros, equipos, folio.
import { GA4_ID, CLARITY_ID } from './data.js';

const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

// ---------- modo de prueba ----------
let depurar = false;
try {
  const p = new URLSearchParams(location.search).get('debug_medicion');
  if (p === '1') sessionStorage.setItem('eqx-debug-medicion', '1');
  if (p === '0') sessionStorage.removeItem('eqx-debug-medicion');
  depurar = sessionStorage.getItem('eqx-debug-medicion') === '1';
} catch { /* sin almacenamiento */ }
window.eqxEventos = window.eqxEventos || [];

// ---------- GA4 ----------
if (GA4_ID && !local) {
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`;
  document.head.append(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, depurar ? { debug_mode: true } : {});
}

// ---------- Microsoft Clarity (fragmento oficial; revisar en el panel de Clarity si cambia) ----------
if (CLARITY_ID && !local) {
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_ID);
}

// ---------- registrar un evento ----------
export function registrar(evento, parametros = {}) {
  const p = Object.fromEntries(Object.entries(parametros).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  if (depurar) { window.eqxEventos.push({ evento, ...p }); console.info('[medición]', evento, p); }
  try {
    if (window.gtag) window.gtag('event', evento, p);
    if (window.clarity) window.clarity('event', evento);
  } catch { /* la medición nunca debe romper el sitio */ }
}

// Equipos que entraron al carrito: un evento por equipo nuevo (no por los que ya estaban)
export function registrarAgregados(antes, despues, origen) {
  const ya = new Set(antes);
  [...new Set(despues)].filter((id) => !ya.has(id)).forEach((equipo) => registrar('agregar_cotizacion', { equipo, origen }));
}

// ---------- origen de la visita (primer contacto, 90 días) ----------
// Las compras de Equinox tardan meses: se guarda de dónde llegó la persona la primera vez para que la solicitud
// diga la fuente aunque cotice en otra visita.
const CLAVE_ORIGEN = 'eqx-origen';
const VIGENCIA_ORIGEN = 90 * 24 * 60 * 60 * 1000;
const CLAVE_REFERENTE = { google: 'google', bing: 'bing', yahoo: 'yahoo', duckduckgo: 'duckduckgo', facebook: 'facebook', instagram: 'instagram', linkedin: 'linkedin', youtube: 'youtube', 'whatsapp': 'whatsapp', 'wa.me': 'whatsapp', 't.co': 'x', twitter: 'x', tiktok: 'tiktok' };
const BUSCADORES = new Set(['google', 'bing', 'yahoo', 'duckduckgo']);

function origenDeEstaVisita() {
  const q = new URLSearchParams(location.search);
  const utm = (k) => (q.get(`utm_${k}`) || '').trim().toLowerCase().slice(0, 80);
  if (utm('source')) {
    return { fuente: utm('source'), medio: utm('medium') || '(sin medio)', campana: utm('campaign'), contenido: utm('content'), termino: utm('term') };
  }
  if (q.get('gclid')) return { fuente: 'google', medio: 'cpc' };
  if (q.get('fbclid')) return { fuente: 'facebook', medio: 'referido' };
  let host = '';
  try { host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch { /* referente inválido */ }
  if (!host || host === location.hostname.replace(/^www\./, '')) return null; // directo o navegación interna
  const clave = Object.keys(CLAVE_REFERENTE).find((k) => host.includes(k));
  if (clave) {
    const fuente = CLAVE_REFERENTE[clave];
    return { fuente, medio: BUSCADORES.has(fuente) ? 'organico' : 'referido' };
  }
  return { fuente: host, medio: 'referido' };
}

(function guardarOrigen() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_ORIGEN) || 'null');
    if (guardado && Date.now() - guardado.t < VIGENCIA_ORIGEN) return;
    const o = origenDeEstaVisita() || { fuente: 'directo', medio: '(ninguno)' };
    localStorage.setItem(CLAVE_ORIGEN, JSON.stringify({ ...o, entrada: location.pathname, t: Date.now() }));
  } catch { /* sin almacenamiento */ }
})();

// Fuente para la solicitud y el CRM: "google / cpc · 2026-12-tanques" o "directo"
export function origenVisita() {
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE_ORIGEN) || 'null');
    if (!o) return { texto: 'directo' };
    const texto = o.fuente === 'directo' ? 'directo' : `${o.fuente} / ${o.medio}${o.campana ? ` · ${o.campana}` : ''}`;
    return { ...o, texto, desde: new Date(o.t).toISOString().slice(0, 10) };
  } catch { return { texto: 'directo' }; }
}

// ---------- clics a WhatsApp (enlaces wa.me de todo el sitio) ----------
// El envío de una solicitud con PDF (botón del éxito del formulario y del asistente) lo registra enviarSolicitud()
// en solicitud.js, porque no siempre es un enlace: aquí se omite para no contarlo dos veces.
const UBICACIONES_WA = [
  ['.barra-movil', 'barra'], ['.pie', 'pie'], ['.asistente', 'asistente'],
  ['.carrito', 'carrito'], ['.ficha, .barra-ficha, [data-wa]', 'ficha'], ['[data-wa-planta]', 'planta'],
];
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="wa.me/"]');
  if (!a || a.matches('[data-wa-exito]')) return;
  const ubicacion = (UBICACIONES_WA.find(([sel]) => a.closest(sel)) || [, 'otro'])[1];
  registrar('clic_whatsapp', { ubicacion });
}, { capture: true });
