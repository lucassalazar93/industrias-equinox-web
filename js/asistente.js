// Asistente de WhatsApp: el robot de Equinox saluda, hace 3 o 4 preguntas con botones
// (qué produce, litros al día, quién escribe, dónde está la planta), muestra la línea sugerida
// y arma el mensaje listo para enviar por WhatsApp. Es un guion fijo, sin inteligencia artificial:
// lo que la persona escribe con sus palabras se pasa tal cual al asesor.
// En el prototipo no se guarda nada nuevo; solo lee lo que la persona ya dejó en el sitio
// (litros, equipos de la cotización y sus datos de contacto si los llenó antes).
import { APLICACIONES, EQUIPOS, LINEAS, ORDEN_EQUIPOS, numeroWhatsApp, apuntarWhatsApp, pintarContador } from './data.js';
import { FICHAS } from './fichas.js';
import { registrar, registrarAgregados } from './medicion.js';
import { entender, pareceNombre, TEMAS, normalizar } from './asistente-texto.js';
import { TIPOS_CLIENTE, PLAZOS, DEPARTAMENTOS, nuevoFolio, registrarSolicitud, textoSolicitud, enviarSolicitud, descargarSolicitud, prepararSolicitud, puedeCompartirArchivos, enlaceGuardado, pistaEnvio } from './solicitud.js';

const ICONOS = 'assets/img/iconos.svg';
const IMG = 'assets/img/asistente/';
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => n.toLocaleString('es-CO');
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const leerSesion = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const guardarSesion = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const esperar = (ms) => new Promise((r) => setTimeout(r, reducido ? Math.min(ms, 120) : ms));
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icono = (id) => `<svg aria-hidden="true"><use href="${ICONOS}#${id}"/></svg>`;
const minuscula = (t) => t.charAt(0).toLowerCase() + t.slice(1);
// Carrito de la cotización (el del menú, js/carrito.js): el asistente lo lee para ofrecer cotizarlo,
// lo pone al día al retomar la conversación y lo suma a la solicitud
const enCarrito = () => leer('eqx-cotizacion', []).filter((id) => EQUIPOS[id]);
const nombresDe = (ids) => { const n = ids.map((id) => minuscula(EQUIPOS[id].nombre)); return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n.at(-1)}` : n[0] || ''; };
const cuantosEquipos = (n) => (n === 1 ? 'un equipo' : `${n} equipos`);
const listaCarrito = (ids) => `<ol class="asistente__linea">${ids.map((id) => `<li><a href="equipo.html?e=${id}">${escapar(EQUIPOS[id].nombre)}</a><span>${escapar(EQUIPOS[id].capacidad)}</span></li>`).join('')}</ol>`;

// Contexto de la página: en la ficha de un equipo el asistente ofrece cotizar ese equipo
const idEquipo = new URLSearchParams(location.search).get('e');
const equipoActual = /equipo\.html$/.test(location.pathname) && EQUIPOS[idEquipo] ? { id: idEquipo, ...EQUIPOS[idEquipo] } : null;

const OPCIONES_LITROS = [500, 1000, 2000, 5000, 10000];
const INTENCIONES = {
  cotizar: 'Cotizar una planta',
  equipos: 'Cotizar uno o varios equipos',
  ver: 'Ver una planta funcionando',
  asesoria: 'Asesoría para mi proceso',
  humano: 'Hablar ya con un asesor',
};

// Saludo de cada página: texto y respuestas rápidas que abren el asistente en ese punto
const pagina = equipoActual ? 'equipo' : /equipos\.html$/.test(location.pathname) ? 'equipos' : 'inicio';
const SALUDOS = {
  inicio: { texto: '¡Hola! Soy el asistente de Equinox. ¿Te ayudo a cotizar o a armar tu planta?', opciones: [['cotizar', 'Cotizar mi planta'], ['ver', 'Ver una planta funcionando'], ['humano', 'Hablar con un asesor']] },
  equipos: { texto: '¡Hola! ¿Buscas un equipo en particular? Te ayudo a cotizarlo por WhatsApp.', opciones: [['cotizar', 'Cotizar equipos'], ['humano', 'Hablar con un asesor']] },
  equipo: { texto: '¡Hola! ¿Te ayudo a cotizar este equipo por WhatsApp?', opciones: [['equipo', 'Cotizar este equipo'], ['humano', 'Hablar con un asesor']] },
};
const saludoPagina = SALUDOS[pagina];

// ---------- marcado ----------
// Pie, barra del celular y demás enlaces de WhatsApp escritos en el HTML: al número vigente (o al de prueba ?wa=)
apuntarWhatsApp();

const raiz = document.createElement('div');
raiz.className = 'asistente';
raiz.innerHTML = `
  <div class="asistente__saludo" data-saludo role="status" hidden>
    <button type="button" class="asistente__saludo-cerrar" data-saludo-cerrar aria-label="Cerrar el saludo">${icono('i-x')}</button>
    <span class="asistente__saludo-quien"><i aria-hidden="true"></i>Asistente Equinox · responde al instante</span>
    <div class="asistente__saludo-escribiendo" data-saludo-escribiendo aria-label="El asistente está escribiendo"><span></span><span></span><span></span></div>
    <div class="asistente__saludo-cuerpo" data-saludo-cuerpo hidden>
      <p>${saludoPagina.texto}</p>
      <div class="asistente__saludo-opciones">${saludoPagina.opciones.map(([v, t]) => `<button type="button" data-saludo-ir="${v}">${t}</button>`).join('')}</div>
    </div>
  </div>
  <div class="asistente__base">
    <img class="asistente__asoma" src="${IMG}saludo.webp" alt="" width="436" height="420" aria-hidden="true">
    <button type="button" class="asistente__lanzador" data-lanzador aria-expanded="false" aria-controls="asistente-panel">
      <img src="${IMG}avatar.webp" alt="" width="64" height="64">
      <span class="asistente__wa">${icono('i-whatsapp-logo')}</span>
      <span class="asistente__aviso" data-aviso hidden>1</span>
      <span class="asistente__etiqueta">Asistente Equinox por WhatsApp</span>
    </button>
  </div>
  <section class="asistente__panel" id="asistente-panel" role="dialog" aria-labelledby="asistente-titulo" data-clarity-mask="true" hidden>
    <header class="asistente__cabeza">
      <img src="${IMG}avatar.webp" alt="" width="40" height="40">
      <div>
        <strong id="asistente-titulo">Asistente Equinox</strong>
        <span>Te pasa con un asesor por WhatsApp</span>
      </div>
      <button type="button" class="asistente__icono" data-reiniciar aria-label="Empezar de nuevo" title="Empezar de nuevo"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button type="button" class="asistente__icono" data-cerrar aria-label="Cerrar el asistente" title="Cerrar">${icono('i-x')}</button>
    </header>
    <div class="asistente__mensajes" data-mensajes aria-live="polite"></div>
    <div class="asistente__opciones" data-opciones></div>
    <form class="asistente__escribir" data-escribir autocomplete="off">
      <label for="asistente-texto" class="asistente__oculto">Escribe tu mensaje</label>
      <input id="asistente-texto" data-texto type="text" maxlength="400" placeholder="Escribe tu pregunta…" enterkeyhint="send">
      <button type="submit" aria-label="Enviar">${icono('i-arrow-right')}</button>
    </form>
    <p class="asistente__nota">Asistente automático del sitio: no envía nada por su cuenta. Tú decides si abres WhatsApp.</p>
  </section>`;
document.body.append(raiz);

const $ = (s) => raiz.querySelector(s);
const lanzador = $('[data-lanzador]'), panel = $('.asistente__panel'), mensajes = $('[data-mensajes]');
const zonaOpciones = $('[data-opciones]'), form = $('[data-escribir]'), entrada = $('[data-texto]'), saludo = $('[data-saludo]');
const aviso = $('[data-aviso]'), escribiendoSaludo = $('[data-saludo-escribiendo]'), cuerpoSaludo = $('[data-saludo-cuerpo]');

// ---------- aparición del lanzador y saludo desde el ícono ----------
// En la portada el robot saluda cada vez que se abre la página (después de la entrada, si la hay);
// en Equipos y en las fichas, una vez por visita para no interrumpir mientras se navega.
// El robot asoma por detrás de su ícono y saluda; el globo muestra "escribiendo…" y luego el mensaje
// con respuestas rápidas. Si nadie lo toca, se recoge solo y deja un "1" en el ícono.
const claveSaludo = `eqx-asistente-saludo-${pagina}`;
let temporizadorSaludo = null, saludoEnUso = false;
function mostrarLanzador() {
  raiz.classList.add('listo');
  if (pagina !== 'inicio' && leerSesion(claveSaludo)) return;
  setTimeout(saludar, reducido ? 300 : 900);
}
function saludar() {
  if (!panel.hidden) return;
  guardarSesion(claveSaludo, '1');
  aviso.hidden = true; raiz.classList.remove('avisando');
  // Sin conversación guardada y con equipos en el carrito: el saludo ofrece cotizarlos
  const n = enCarrito().length;
  if (!iniciado && n && pagina !== 'equipo') {
    cuerpoSaludo.querySelector('p').textContent = `Tienes ${cuantosEquipos(n)} en tu cotización. ¿Te ayudo a cotizar${n === 1 ? 'lo' : 'los'} por WhatsApp?`;
    cuerpoSaludo.querySelector('.asistente__saludo-opciones').innerHTML = `<button type="button" data-saludo-ir="carrito">Cotizar ${n === 1 ? 'mi equipo' : `mis ${n} equipos`}</button>${saludoPagina.opciones.map(([v, t]) => `<button type="button" data-saludo-ir="${v}">${t}</button>`).join('')}`;
  }
  raiz.classList.add('saludando');
  saludo.hidden = false; escribiendoSaludo.hidden = false; cuerpoSaludo.hidden = true;
  setTimeout(() => { escribiendoSaludo.hidden = true; cuerpoSaludo.hidden = false; }, reducido ? 0 : 1400);
  programarCierre(16000);
  // Si la persona se pone a leer (baja por la página), el globo se recoge y deja el "1" en el ícono: no la persigue
  const desde = scrollY;
  const alBajar = () => {
    if (saludo.hidden) return removeEventListener('scroll', alBajar);
    if (!saludoEnUso && Math.abs(scrollY - desde) > 160) { removeEventListener('scroll', alBajar); cerrarSaludo({ dejarAviso: true }); }
  };
  addEventListener('scroll', alBajar, { passive: true });
}
function programarCierre(ms) {
  clearTimeout(temporizadorSaludo);
  temporizadorSaludo = setTimeout(() => (saludoEnUso ? programarCierre(4000) : cerrarSaludo({ dejarAviso: true })), ms);
}
function cerrarSaludo({ dejarAviso = false } = {}) {
  clearTimeout(temporizadorSaludo);
  if (saludo.hidden) return;
  saludo.hidden = true; raiz.classList.remove('saludando');
  if (dejarAviso && panel.hidden) { aviso.hidden = false; raiz.classList.add('avisando'); }
}
if (document.documentElement.classList.contains('con-intro')) document.addEventListener('eqx:intro-fin', mostrarLanzador, { once: true });
else mostrarLanzador();
$('[data-saludo-cerrar]').addEventListener('click', (e) => { e.stopPropagation(); cerrarSaludo(); });
document.addEventListener('eqx:carrito-abierto', () => cerrarSaludo({ dejarAviso: true }));
// Si el carrito cambia con el chat abierto y la conversación ya terminada, el mensaje final se rehace con él
// (en medio de una pregunta no se interrumpe: se pone al día en la siguiente lista de equipos o al retomar)
document.addEventListener('eqx:carrito-cambio', () => { if (!panel.hidden && finalizado && !enCurso) revisarCarritoFinal(); });
saludo.addEventListener('click', (e) => {
  const ir = e.target.closest('[data-saludo-ir]')?.dataset.saludoIr;
  // Con una conversación guardada el saludo ofrece seguirla o empezar de nuevo
  if (ir === 'seguir') return abrir();
  if (ir === 'nueva') { abrir(); return conversar(); }
  abrir(ir || undefined);
});
saludo.addEventListener('pointerenter', () => { saludoEnUso = true; });
saludo.addEventListener('pointerleave', () => { saludoEnUso = false; });
saludo.addEventListener('focusin', () => { saludoEnUso = true; });
saludo.addEventListener('focusout', () => { saludoEnUso = false; });

// ---------- abrir y cerrar ----------
let iniciado = false, pendienteReanudar = false;
// Página donde la persona tuvo el chat abierto por última vez: al volver ahí se abre solo
const aquí = location.pathname + location.search;
let abiertoChat = false, paginaChat = aquí;
function abrir(intencion, { auto = false } = {}) {
  if (!auto && panel.hidden) registrar('abrir_asistente', { intencion: intencion || 'ninguna' });
  abiertoChat = true; paginaChat = aquí;
  cerrarSaludo();
  aviso.hidden = true; raiz.classList.remove('avisando');
  panel.hidden = false; raiz.classList.add('abierto');
  lanzador.setAttribute('aria-expanded', 'true');
  if (!iniciado || intencion) conversar(intencion);
  else if (pendienteReanudar) { pendienteReanudar = false; conversar(null, { reanudar: true }); }
  else if (finalizado && !enCurso) revisarCarritoFinal();
  guardarChat();
  requestAnimationFrame(() => (zonaOpciones.querySelector('button') || entrada).focus({ preventScroll: true }));
}
function cerrar() {
  abiertoChat = false; paginaChat = aquí;
  panel.hidden = true; raiz.classList.remove('abierto');
  lanzador.setAttribute('aria-expanded', 'false');
  lanzador.focus({ preventScroll: true });
  guardarChat();
}
lanzador.addEventListener('click', () => (panel.hidden ? abrir() : cerrar()));
$('[data-cerrar]').addEventListener('click', cerrar);
$('[data-reiniciar]').addEventListener('click', () => conversar());
panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
// Cualquier botón del sitio con data-asistente-abrir abre el asistente (con una intención opcional)
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-asistente-abrir]'); if (!b) return;
  e.preventDefault(); abrir(b.dataset.asistenteAbrir || undefined);
});

// ---------- piezas de la conversación ----------
let sesion = 0;
let esperaTexto = null; // cuando una pregunta espera texto, el formulario responde esa pregunta
let consultaLibre = '';

// Baja al último mensaje; se repite en el siguiente cuadro porque los botones de respuesta achican la zona de mensajes
const bajar = () => { mensajes.scrollTop = mensajes.scrollHeight; requestAnimationFrame(() => { mensajes.scrollTop = mensajes.scrollHeight; }); };
new ResizeObserver(() => { mensajes.scrollTop = mensajes.scrollHeight; }).observe(mensajes);
// marca: "pregunta" o "reanudar" (data-*), para quitarlas del final al restaurar y no repetirlas
async function bot(html, { pose, pausa = 0, marca } = {}) {
  const id = sesion;
  const escribiendo = document.createElement('div');
  escribiendo.className = 'asistente__msj asistente__msj--bot asistente__escribiendo';
  escribiendo.innerHTML = '<span></span><span></span><span></span>';
  escribiendo.setAttribute('aria-label', 'El asistente está escribiendo');
  mensajes.append(escribiendo); bajar();
  await esperar(pausa || Math.min(1300, 420 + html.replace(/<[^>]+>/g, '').length * 11));
  escribiendo.remove();
  if (id !== sesion) throw new Error('reiniciado');
  if (pose) { const img = document.createElement('img'); img.className = 'asistente__pose'; img.alt = ''; img.onload = bajar; img.src = `${IMG}${pose}.webp`; mensajes.append(img); }
  const m = document.createElement('div');
  m.className = 'asistente__msj asistente__msj--bot';
  m.innerHTML = html;
  if (marca) m.dataset[marca] = '1';
  mensajes.append(m); bajar();
  guardarChat();
  return m;
}
function persona(texto) {
  const m = document.createElement('div');
  m.className = 'asistente__msj asistente__msj--persona';
  m.textContent = texto;
  mensajes.append(m); bajar();
  guardarChat();
}
// Botones de respuesta; también resuelve si la persona escribe algo propio (devuelve { libre })
let cola = []; // texto escrito mientras el robot "escribe": responde la siguiente pregunta
function elegir(opciones) {
  return new Promise((resolver) => {
    zonaOpciones.innerHTML = opciones.map((o, i) => `<button type="button" data-i="${i}"${o.marcada ? ' class="marcada"' : ''}>${escapar(o.t)}</button>`).join('');
    bajar();
    const enPanel = panel.contains(document.activeElement);
    if (enPanel && document.activeElement !== entrada) zonaOpciones.querySelector('button')?.focus({ preventScroll: true });
    zonaOpciones.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const o = opciones[Number(b.dataset.i)];
      zonaOpciones.innerHTML = ''; zonaOpciones.onclick = null; esperaTexto = null;
      persona(o.t); resolver(o);
    };
    esperaTexto = (texto) => { zonaOpciones.innerHTML = ''; zonaOpciones.onclick = null; resolver({ libre: texto }); };
    if (cola.length) { const t = cola.shift(); setTimeout(() => { if (esperaTexto) { const f = esperaTexto; esperaTexto = null; f(t); } }, 0); }
  });
}
let enCurso = false, finalizado = false;
const sumarConsulta = (t) => { if (!consultaLibre.includes(t)) consultaLibre = consultaLibre ? `${consultaLibre} ${t}` : t; };
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const texto = entrada.value.trim(); if (!texto) return;
  entrada.value = '';
  persona(texto);
  if (esperaTexto) { const f = esperaTexto; esperaTexto = null; f(texto); return; }
  if (enCurso) { cola.push(texto); return; }
  atenderSuelto(texto);
});

// ---------- texto libre: contestar amable y volver a encaminar ----------
// La persona puede escribir lo que quiera. Lo que sirve (producto, litros, equipos, nombre, temas) se anota;
// a lo demás se le contesta con amabilidad y se vuelve a la pregunta pendiente. Tras dos tropiezos
// aparece la opción de hablar directo con un asesor. Nada ofensivo ni sin sentido pasa al mensaje.
class Salto extends Error { constructor() { super('salto'); } }
const app = (id) => APLICACIONES.find((x) => x.id === id);
let ultimaFrase = '';
const una = (lista) => { const ops = lista.filter((f) => f !== ultimaFrase); const f = ops[Math.floor(Math.random() * ops.length)] || lista[0]; ultimaFrase = f; return f; };
const RESPUESTA_TEMA = {
  precio: 'El precio depende de la capacidad, los accesorios y la instalación; por eso un asesor te envía la cotización formal. Ya lo anoté en tu mensaje.',
  plazo: 'El plazo depende del equipo y la capacidad, y cada cotización lo trae por escrito. Lo anoté para el asesor.',
  garantia: 'La garantía queda por escrito en la cotización, con su alcance y su vigencia. Lo anoté para el asesor.',
  servicio: 'Sí: Equinox da diagnóstico, mantenimiento, repuestos y soporte después de la entrega. Lo anoté para el asesor.',
  ubicacion: 'Diseñamos, fabricamos e instalamos desde Antioquia. El asesor te confirma la dirección y puede agendar una visita técnica.',
  pago: 'Cada cotización define anticipo y saldo. Si tienes financiación o recursos públicos, el asesor lo tiene en cuenta.',
  cobertura: 'La cotización incluye el lugar de instalación; Equinox confirma la cobertura y el costo del traslado.',
  material: 'Los equipos se fabrican en acero inoxidable con acabado sanitario; el asesor te confirma el tipo de acero y el calibre para tu caso.',
  medida: 'Sí: cada equipo se define según tu producto, tus litros diarios y el espacio de tu planta.',
};
// "moldes" depende del queso: costeño, mozzarella o el de prensa
const equipoDeTexto = (id, a) => {
  if (id !== 'moldes') return id;
  const apl = a.apl || datos.apl;
  return apl === 'costeno' ? 'moldeCosteno' : apl === 'mozzarella' ? 'moldeMozzarella' : 'moldePrensa';
};
const PASOS_EQUIPO = new Set(['alcance', 'elegir', 'linea-cat', 'equipo-cat', 'otro', 'capacidad', 'cantidad']);
// Anota lo útil del mensaje aunque no responda la pregunta actual; devuelve lo que el asistente dice al respecto
function anotar(a, paso) {
  const notas = [];
  if (a.ofensivo) return notas;
  if (a.presentacion && paso !== 'nombre' && paso !== 'confirmar' && !datos.nombre) {
    datos.nombre = a.presentacion.nombre; datos.empresa = a.presentacion.empresa || datos.empresa;
    notas.push(`¡Mucho gusto, ${escapar(datos.nombre.split(' ')[0])}!`);
  }
  if (a.apl && paso !== 'producto' && !datos.apl) { datos.apl = a.apl; notas.push(`Anotado: <strong>${escapar(minuscula(app(a.apl).nombre))}</strong>.`); }
  if (a.litros && paso !== 'litros' && !PASOS_EQUIPO.has(paso) && !datos.litros) { datos.litros = a.litros; datos.litrosRecien = true; notas.push(`Anotado: ${fmt(a.litros)} L/día.`); }
  // En los pasos donde se eligen equipos, nombrarlos es responder: no se anotan aparte
  const nuevos = PASOS_EQUIPO.has(paso) ? [] : [...new Set(a.equipos.map((id) => equipoDeTexto(id, a)))].filter((id) => EQUIPOS[id] && !datos.equipos.has(id) && id !== equipoActual?.id);
  nuevos.forEach((id) => datos.equipos.add(id));
  alCarrito(nuevos); // lo que nombra va en la solicitud, así que también al carrito del menú
  if (nuevos.length) notas.push(`${nuevos.length === 1 ? 'Ese equipo lo fabricamos' : 'Esos equipos los fabricamos'}: ${nuevos.map((id) => `<a href="equipo.html?e=${id}">${escapar(EQUIPOS[id].nombre)}</a> (${escapar(EQUIPOS[id].capacidad)})`).join(', ')}. Lo sumo a tu cotización.`);
  a.temas.filter((t) => !datos.temas.has(t)).forEach((t) => { datos.temas.add(t); notas.push(RESPUESTA_TEMA[t]); });
  return notas;
}
// Respuesta amable a lo que no responde la pregunta. falla: cuenta como tropiezo; asesor: pidió una persona
function desvio(a, notas) {
  if (a.ofensivo) return { html: una(['Entiendo que esto puede desesperar. Estoy aquí para ayudarte con tu planta o tus equipos.', 'Lamento si algo no salió bien. Sigamos con calma: te ayudo con lo que necesites para tu planta.']), falla: true };
  if (a.intencion === 'humano') return { html: 'Claro, te paso con un asesor de Equinox.', asesor: true };
  if (notas.length) return {};
  if (a.temas.length || a.equipos.length) return { html: una(['Eso ya lo anoté para el asesor.', 'Eso ya quedó en tu mensaje.']) };
  if (a.sobreBot) return { html: 'Soy el asistente automático del sitio de Equinox: preparo tu consulta y te paso con una persona del equipo por WhatsApp.' };
  if (a.comoEstas) return { html: una(['¡Muy bien, gracias por preguntar!', '¡Todo bien por aquí, gracias!']) };
  if (a.saludo) return { html: una(['¡Hola! Qué gusto saludarte.', '¡Hola! Aquí estoy para ayudarte.']) };
  if (a.gracias) return { html: una(['¡Con gusto!', '¡Con mucho gusto!']) };
  if (a.despedida) return { html: '¡Hasta pronto! Si quieres, terminamos tu consulta en un minuto.' };
  if (a.risa) return { html: '¡Me alegra el buen ánimo!' };
  if (a.vacio) return { html: '¡Recibido!' };
  if (a.afirma) return { html: 'Perfecto.' };
  if (a.niega) return { html: 'Entendido.' };
  if (a.fueraDeTema) return { html: una(['Eso se me escapa: solo sé de plantas lácteas y equipos de Equinox.', 'Ahí no te puedo ayudar, pero en plantas y equipos para lácteos sí.']), falla: true };
  if (a.sinSentido) return { html: una(['Perdona, no te entendí bien.', 'Creo que no capté eso.']), falla: true };
  if (a.quesoSinTipo) return { html: 'Tenemos líneas para queso campesino, costeño y mozzarella.' };
  if (a.pregunta && a.delTema) { sumarConsulta(a.original); return { html: 'Buena pregunta. Se la paso al asesor tal cual, para que te responda con precisión.' }; }
  if (a.pregunta) return { html: una(['Esa no la sé responder: solo sé de plantas y equipos de Equinox.', 'Esa se me escapa; en plantas y equipos para lácteos sí te ayudo.']), falla: true };
  if (a.delTema) { sumarConsulta(a.original); return { html: 'Anotado para el asesor.' }; }
  return { html: una(['No estoy seguro de haber entendido.', 'Perdona, no te seguí.']), falla: true };
}
// Hace una pregunta y no avanza hasta tener una respuesta válida (botón o texto que se entienda)
async function preguntar(html, opciones, { paso, interpretar = () => null, repregunta = html, pose } = {}) {
  await bot(html, { pose, marca: 'pregunta' });
  datos.litrosRecien = false;
  let fallos = 0;
  for (;;) {
    const ops = fallos >= 2 ? [...opciones, { v: '__asesor', t: 'Hablar con un asesor' }] : opciones;
    const r = await elegir(ops);
    if (r.v === '__asesor') { datos.pideAsesor = true; throw new Salto(); }
    if (!('libre' in r)) return r;
    const a = entender(r.libre);
    const valor = a.ofensivo ? null : interpretar(a);
    const notas = anotar(a, paso);
    for (const nota of notas) await bot(nota, { pausa: 650 });
    if (valor) return { ...valor, libre: r.libre };
    const d = desvio(a, notas);
    if (d.asesor) { datos.pideAsesor = true; await bot(d.html, { pausa: 500 }); throw new Salto(); }
    if (d.falla) fallos++;
    const extra = fallos >= 2 ? ' Si prefieres, te paso directo con un asesor.' : '';
    await bot(`${d.html ? `${d.html} ` : ''}${repregunta}${extra}`, { marca: 'pregunta' });
  }
}
// Texto que llega cuando no hay pregunta abierta (mensaje ya listo, o la persona dijo "por ahora no")
async function atenderSuelto(texto) {
  try {
    const a = entender(texto);
    // "Agregar otro" con la solicitud ya lista: pregunta cuál, lo suma (y al carrito) y rehace la solicitud
    if (a.agregar && !a.equipos.length && conSolicitud()) {
      enCurso = true;
      try { await agregarDelCatalogo(); } catch (err) { if (!(err instanceof Salto)) throw err; datos.pideAsesor = true; }
      enCurso = false;
      return cerrarConversacion();
    }
    const antes = consultaLibre;
    const notas = anotar(a, 'final');
    for (const nota of notas) await bot(nota, { pausa: 650 });
    const d = desvio(a, notas);
    if (d.asesor) { datos.pideAsesor = true; if (!datos.intencion) datos.intencion = 'humano'; return cerrarConversacion({ silencioso: !finalizado }); }
    if (notas.length || consultaLibre !== antes) return cerrarConversacion({ silencioso: notas.length > 0 });
    const cierre = finalizado ? 'Tu mensaje sigue listo arriba: toca «Abrir en WhatsApp» cuando quieras.' : 'Si quieres, cuéntame qué necesitas y te preparo el mensaje para un asesor.';
    await bot(`${d.html ? `${d.html} ` : ''}${cierre}`);
  } catch (err) {
    if (err.message !== 'reiniciado') throw err;
  }
}

// ---------- cotizar toda la línea, algunos equipos o equipos del catálogo ----------
// Botones que se marcan y desmarcan (varios a la vez) más uno para confirmar; también resuelve con texto propio
function elegirVarios(opciones, marcados) {
  return new Promise((resolver) => {
    const pintar = () => {
      zonaOpciones.innerHTML = opciones.map((o, i) => `<button type="button" data-i="${i}" aria-pressed="${marcados.has(o.v)}">${marcados.has(o.v) ? '✓ ' : ''}${escapar(o.t)}</button>`).join('')
        + `<button type="button" class="confirmar" data-listo${marcados.size ? '' : ' disabled'}>Listo${marcados.size ? ` (${marcados.size})` : ''}</button>`;
      bajar();
    };
    pintar();
    zonaOpciones.onclick = (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-listo')) {
        zonaOpciones.innerHTML = ''; zonaOpciones.onclick = null; esperaTexto = null;
        persona(opciones.filter((o) => marcados.has(o.v)).map((o) => o.t).join(', '));
        resolver({ vals: opciones.filter((o) => marcados.has(o.v)).map((o) => o.v) });
        return;
      }
      const i = b.dataset.i, o = opciones[Number(i)];
      if (marcados.has(o.v)) marcados.delete(o.v); else marcados.add(o.v);
      pintar();
      zonaOpciones.querySelector(`[data-i="${i}"]`)?.focus({ preventScroll: true });
    };
    esperaTexto = (texto) => { zonaOpciones.innerHTML = ''; zonaOpciones.onclick = null; resolver({ libre: texto }); };
    if (cola.length) { const t = cola.shift(); setTimeout(() => { if (esperaTexto) { const f = esperaTexto; esperaTexto = null; f(t); } }, 0); }
  });
}
const TANQUES = ['enfriamiento', 'almacenamiento', 'mezcla', 'fermentacion'];
async function preguntarVarios(html, opciones, { paso, repregunta }) {
  await bot(html, { marca: 'pregunta' });
  const marcados = new Set();
  for (;;) {
    const r = await elegirVarios(opciones, marcados);
    if (r.vals) return r.vals;
    const a = entender(r.libre);
    if (a.todo) return opciones.map((o) => o.v);
    const ids = a.equipos.map((id) => equipoDeTexto(id, a)).filter((id) => opciones.some((o) => o.v === id));
    // "el tanque" a secas: el tanque que haya en la lista
    if (/\btanques?\b/.test(a.n) && !ids.some((id) => TANQUES.includes(id))) { const t = opciones.find((o) => TANQUES.includes(o.v)); if (t) ids.push(t.v); }
    if (ids.length) {
      ids.forEach((id) => marcados.add(id));
      await bot(`Marqué ${ids.map((id) => `<strong>${escapar(EQUIPOS[id].nombre)}</strong>`).join(', ')}. Toca «Listo» o marca otros.`, { pausa: 500 });
      continue;
    }
    const notas = anotar(a, paso);
    for (const nota of notas) await bot(nota, { pausa: 650 });
    const d = desvio(a, notas);
    if (d.asesor) { datos.pideAsesor = true; await bot(d.html, { pausa: 500 }); throw new Salto(); }
    await bot(`${d.html ? `${d.html} ` : ''}${repregunta}`, { marca: 'pregunta' });
  }
}
// Capacidad del equipo (las del catálogo, en fichas.js) y cantidad para moldes, carros, mesones y canastillas
const POR_CANTIDAD = new Set(['moldePrensa', 'moldeCosteno', 'moldeMozzarella', 'carro', 'meson', 'canastilla']);
const capTexto = (id, c) => `${fmt(c)} ${FICHAS[id].unidad}`;
async function pedirCapacidad(id) {
  const f = FICHAS[id], partes = [];
  if (f && !f.fija && f.capacidades.length > 1) {
    const ejemplo = capTexto(id, f.capacidades[Math.min(1, f.capacidades.length - 1)]);
    const r = await preguntar(`¿Qué capacidad necesitas en ${escapar(minuscula(EQUIPOS[id].nombre))}?`, [...f.capacidades.map((c) => ({ v: capTexto(id, c), t: capTexto(id, c) })), { v: '', t: 'Aún no sé' }], {
      paso: 'capacidad',
      repregunta: `Toca una capacidad o escríbela (por ejemplo, ${ejemplo}).`,
      interpretar: (a) => (a.numero ? { v: capTexto(id, a.numero) } : a.noSe || a.omitir ? { v: '' } : null),
    });
    if (r.v) partes.push(r.v);
  } else if (f && !f.fija) partes.push(capTexto(id, f.capacidades[0]));
  if (POR_CANTIDAD.has(id)) {
    const r = await preguntar('¿Cuántos necesitas?', [1, 5, 10, 20, 50].map((n) => ({ v: n, t: String(n) })).concat({ v: 0, t: 'Aún no sé' }), {
      paso: 'cantidad',
      repregunta: 'Escríbeme la cantidad (por ejemplo, 12) o toca «Aún no sé».',
      interpretar: (a) => (a.numero ? { v: Math.round(a.numero) } : a.noSe || a.omitir ? { v: 0 } : null),
    });
    if (r.v) partes.push(`${fmt(r.v)} ${r.v === 1 ? 'unidad' : 'unidades'}`);
  }
  return partes.join(' · ');
}
// El dato de un equipo: el de la línea sugerida si está en ella; si no, se pregunta su capacidad
async function sumarEquipo(id) {
  if (!EQUIPOS[id] || datos.seleccion.some((s) => s.id === id)) return;
  const enLinea = datos.linea?.find((x) => x.id === id);
  datos.seleccion.push({ id, dato: enLinea ? enLinea.dato : await pedirCapacidad(id), carrito: true });
  alCarrito([id]);
}
// Lo que se elige en el chat entra también al carrito del menú; la página se pone al día (contador, botones +, formulario)
function alCarrito(ids) {
  const actual = enCarrito();
  const nuevos = ids.filter((id) => EQUIPOS[id] && !actual.includes(id));
  if (!nuevos.length) return;
  const lista = [...actual, ...nuevos];
  try { localStorage.setItem('eqx-cotizacion', JSON.stringify(lista)); } catch { /* sin almacenamiento */ }
  datos.carritoVisto = lista; // así al retomar no lo cuenta como un cambio hecho por fuera
  registrarAgregados(actual, lista, 'asistente');
  pintarContador(lista.length);
  document.dispatchEvent(new CustomEvent('eqx:cotizacion', { detail: lista }));
}
// Un equipo del catálogo: primero la línea, luego el equipo (o escrito directo: "prensa")
async function agregarDelCatalogo() {
  const r1 = await preguntar('¿De qué línea es el equipo?', LINEAS.map((l) => ({ v: l.id, t: l.nombre })), {
    paso: 'linea-cat',
    repregunta: 'Toca la línea o escríbeme el nombre del equipo (por ejemplo, «prensa»).',
    interpretar: (a) => (a.equipos.length ? { v: '', ids: a.equipos.map((id) => equipoDeTexto(id, a)) } : null),
  });
  if (r1.ids?.length) { for (const id of r1.ids) await sumarEquipo(id); return; }
  const enLinea = ORDEN_EQUIPOS.filter((id) => EQUIPOS[id].linea === r1.v);
  const r2 = enLinea.length === 1 ? { v: enLinea[0] } : await preguntar('¿Cuál equipo?', enLinea.map((id) => ({ v: id, t: EQUIPOS[id].nombre })), {
    paso: 'equipo-cat',
    repregunta: 'Toca el equipo o escríbeme su nombre.',
    interpretar: (a) => { const e = a.equipos.map((x) => equipoDeTexto(x, a)).find((id) => enLinea.includes(id)); return e ? { v: e } : null; },
  });
  await sumarEquipo(r2.v);
}
// Equipo que ya estaba en el carrito: entra sin preguntar capacidad (la de la línea sugerida si está en ella;
// si no, queda por definir y la ajusta el ingeniero)
function sumarDelCarrito(id) {
  if (!EQUIPOS[id] || datos.seleccion.some((s) => s.id === id)) return;
  const enLinea = datos.linea?.find((x) => x.id === id);
  datos.seleccion.push({ id, dato: enLinea ? enLinea.dato : '', carrito: true });
}
// Si el carrito cambió desde la última vez que el asistente lo miró (la persona agregó o quitó equipos
// mientras navegaba), la cotización del chat se pone al día y lo cuenta. Devuelve si hubo cambios.
async function ponerAlDiaCarrito() {
  if (!datos.hecho) return false;
  const ahora = enCarrito();
  if (!datos.carritoVisto) { datos.carritoVisto = ahora; return false; }
  const visto = new Set(datos.carritoVisto);
  const agregados = ahora.filter((id) => !visto.has(id));
  const quitados = datos.carritoVisto.filter((id) => !ahora.includes(id) && EQUIPOS[id]);
  datos.carritoVisto = ahora;
  if (!agregados.length && !quitados.length) return false;
  // Eligió toda la línea y luego quitó equipos de ella en el carrito: ya no es la línea completa, sino los que quedan
  if (datos.alcance === 'linea' && quitados.some((id) => datos.linea?.some((x) => x.id === id))) {
    datos.alcance = 'seleccion';
    datos.seleccion = datos.linea.filter((x) => ahora.includes(x.id)).map((x) => ({ id: x.id, dato: x.dato, carrito: true }));
  }
  if (datos.alcance === 'seleccion') {
    agregados.forEach(sumarDelCarrito);
    datos.seleccion = datos.seleccion.filter((s) => !(s.carrito && quitados.includes(s.id)));
  }
  const partes = [];
  if (agregados.length) partes.push(`agregaste <strong>${escapar(nombresDe(agregados))}</strong>`);
  if (quitados.length) partes.push(`quitaste <strong>${escapar(nombresDe(quitados))}</strong>`);
  await bot(`Vi que en tu cotización ${partes.join(' y ')}. Ya lo tengo en cuenta.`, { pausa: 400 });
  guardarChat();
  return true;
}
// Conversación ya terminada que se vuelve a abrir: si el carrito cambió, el mensaje final se rehace con él
async function revisarCarritoFinal() {
  if (await ponerAlDiaCarrito()) await cerrarConversacion({ silencioso: true });
}
// Muestra lo que va en la cotización y pregunta si agrega otro equipo, hasta que diga que no
async function masEquipos() {
  for (;;) {
    await ponerAlDiaCarrito();
    const lista = datos.seleccion.map((s) => `<li><a href="equipo.html?e=${s.id}">${escapar(EQUIPOS[s.id].nombre)}</a><span>${escapar(s.dato || 'por definir')}</span></li>`).join('');
    const r = await preguntar(`Tu cotización va así (también la ves en el carrito del menú):<ol class="asistente__linea">${lista}</ol>¿Agregas otro equipo?`, [{ v: 'no', t: 'No, eso es todo' }, { v: 'si', t: 'Sí, agregar otro' }], {
      paso: 'otro',
      repregunta: '¿Agregas otro equipo? Toca una opción o escríbeme cuál.',
      interpretar: (a) => (a.equipos.length ? { v: 'directo', ids: a.equipos.map((x) => equipoDeTexto(x, a)) } : a.afirma || a.agregar ? { v: 'si' } : a.niega || a.todo ? { v: 'no' } : null),
    });
    if (r.v === 'no') return;
    if (r.v === 'directo') { for (const id of r.ids) await sumarEquipo(id); } else await agregarDelCatalogo();
  }
}
// Después de mostrar la línea sugerida: toda la línea, solo algunos equipos de ella u otro del catálogo.
// Se puede retomar: si ya eligió alcance, no lo vuelve a preguntar; si la selección quedó vacía, la repite.
async function elegirAlcance() {
  if (!datos.alcance) {
    const n = datos.linea.length;
    const r = await preguntar('¿Qué quieres cotizar?', [{ v: 'linea', t: `Toda la línea (${n} equipos)` }, { v: 'elegir', t: 'Solo algunos equipos' }, { v: 'catalogo', t: 'Otro equipo del catálogo' }], {
      paso: 'alcance',
      repregunta: '¿Toda la línea o solo algunos equipos? Toca una opción o escríbeme cuáles.',
      interpretar: (a) => (a.todo ? { v: 'linea' } : a.equipos.length ? { v: 'directo', ids: a.equipos.map((x) => equipoDeTexto(x, a)) } : a.agregar ? { v: 'catalogo' } : a.solo ? { v: 'elegir' } : null),
    });
    if (r.v === 'linea') {
      datos.alcance = 'linea';
      alCarrito(datos.linea.map((x) => x.id));
      guardarChat();
      await bot(`Listo: ${n === 1 ? 'el equipo de la línea queda' : `los ${n} equipos de la línea quedan`} en tu cotización y en el carrito del menú.`, { pausa: 300 });
      return;
    }
    datos.alcance = 'seleccion'; datos.metodo = r.v; guardarChat();
    if (r.v === 'directo') for (const id of r.ids) await sumarEquipo(id);
  }
  if (datos.alcance === 'linea') return;
  if (!datos.seleccion.length) {
    if (datos.metodo === 'elegir') {
      const vals = await preguntarVarios('Marca los equipos que quieres cotizar y toca «Listo».', datos.linea.map((x) => ({ v: x.id, t: EQUIPOS[x.id].nombre })), {
        paso: 'elegir', repregunta: 'Marca uno o varios equipos y toca «Listo». También puedes escribirme cuáles.',
      });
      for (const id of vals) await sumarEquipo(id);
    } else await agregarDelCatalogo();
  }
  await masEquipos();
}

// ---------- guion ----------
// Cada paso respondido queda en datos.hecho; así la conversación se puede retomar (reanudar) en la pregunta
// pendiente cuando la persona vuelve de una ficha o del recorrido 3D, o la sigue en otra página del sitio.
// Cotizar (planta o equipos) y asesoría hacen las mismas preguntas que el formulario de la portada y terminan
// en la misma solicitud: folio, registro y PDF (js/solicitud.js).
let datos = {};
const hecho = (paso) => datos.hecho.has(paso);
const marcar = (paso) => { datos.hecho.add(paso); guardarChat(); };
const conSolicitud = () => ['cotizar', 'equipos', 'equipo', 'asesoria'].includes(datos.intencion);
const TIPO_TEXTO = [
  [/\b(finca|ganader\w*|hato|vacas|ordeno)\b/, 'Finca o ganadero'],
  [/\b(queser\w*|artesanal\w*|pequen\w*)\b/, 'Quesera artesanal'],
  [/\b(procesador\w*|industria\w*|fabrica|empresa|planta grande)\b/, 'Procesadora'],
  [/\b(cooperativ\w*|asociaci\w*|acopio|asociados)\b/, 'Cooperativa o asociación'],
  [/\b(alcald\w*|gobernaci\w*|publica|publico|programa|entidad|gobierno)\b/, 'Entidad pública'],
];
const PLAZO_TEXTO = [
  [/\b(menos de (un|1) mes|ya mismo|urgente|inmediat\w*|esta semana|este mes|lo antes)\b/, 0],
  [/\b(1 a 3|uno a tres|(dos|2) meses|un par de meses|pronto|proximo mes)\b/, 1],
  [/\b(3 a 6|tres a seis|(seis|6) meses|medio ano|semestre)\b/, 2],
  [/\b(mas adelante|averiguando|sin prisa|cotizando|explorando|el otro ano|el proximo ano)\b/, 3],
];
const deptoDe = (n) => DEPARTAMENTOS.find((d) => d !== 'Otro' && new RegExp(`\\b${normalizar(d)}\\b`).test(n)) || null;

// Qué produce y cuántos litros (se saltan si ya los dijo con sus palabras)
async function preguntarProduccion() {
  const litrosGuardados = leer('eqx-litros', null);
  if (!datos.apl && !datos.otroProducto && !hecho('producto')) {
    const pregunta = datos.intencion === 'ver' ? '¿Qué planta quieres ver funcionando?' : ['equipos', 'equipo'].includes(datos.intencion) ? '¿Para qué producto son los equipos?' : '¿Qué produces o quieres producir?';
    const r1 = await preguntar(pregunta, [...APLICACIONES.map((a) => ({ v: a.id, t: a.corto })), { v: null, t: 'Otro producto' }], {
      paso: 'producto',
      repregunta: '¿Qué produces? Toca una opción o escríbelo, por ejemplo «queso costeño».',
      interpretar: (a) => (a.apl ? { v: a.apl } : a.noSe ? { v: null } : pareceNombre(a) && !a.delTema ? { v: null, otro: a.original } : null),
    });
    datos.apl = r1.v;
    if (r1.otro) { datos.otroProducto = r1.otro; await bot(`Anotado: <strong>${escapar(r1.otro)}</strong>. Un asesor te orienta con esa línea.`, { pausa: 700 }); }
  }
  marcar('producto');
  if (!hecho('litros')) {
    if (!datos.litros) {
      const opcionesL = OPCIONES_LITROS.map((L) => ({ v: L, t: `${fmt(L)} L`, marcada: L === litrosGuardados }));
      if (litrosGuardados && !OPCIONES_LITROS.includes(litrosGuardados)) opcionesL.unshift({ v: litrosGuardados, t: `${fmt(litrosGuardados)} L`, marcada: true });
      opcionesL.push({ v: null, t: 'Aún no sé' });
      const r2 = await preguntar('¿Cuántos litros de leche procesas al día? <span class="asistente__suave">Aproximado está bien.</span>', opcionesL, {
        paso: 'litros',
        repregunta: 'Escríbeme un número aproximado (por ejemplo, 1.500) o toca «Aún no sé».',
        interpretar: (a) => (a.litrosSueltos ? { v: a.litrosSueltos } : a.noSe || a.omitir ? { v: null } : null),
      });
      datos.litros = r2.v;
    } else if (!datos.litrosRecien) await bot(`Tomo ${fmt(datos.litros)} L/día, como me dijiste.`, { pausa: 600 });
    marcar('litros');
  }
}

// Plazo, como en el formulario
async function preguntarPlazo() {
  if (hecho('plazo')) return;
  const r = await preguntar('¿Para cuándo necesitas los equipos?', PLAZOS.map((p) => ({ v: p, t: p })), {
    paso: 'plazo',
    repregunta: 'Toca la opción que más se acerque (por ejemplo, «En 1 a 3 meses»).',
    interpretar: (a) => { const p = PLAZO_TEXTO.find(([re]) => re.test(a.n)); return p ? { v: PLAZOS[p[1]] } : a.noSe ? { v: PLAZOS[3] } : null; },
  });
  datos.plazo = r.v;
  marcar('plazo');
}

// Municipio y, en las solicitudes, departamento (si no lo dijo junto con el municipio)
async function preguntarLugar({ conDepartamento }) {
  if (!hecho('municipio')) {
    entrada.placeholder = 'Ej.: Santa Rosa de Osos, Antioquia';
    const r4 = await preguntar('¿En qué municipio está o estará la planta?', [{ v: null, t: 'Omitir' }], {
      paso: 'municipio',
      repregunta: 'Escríbeme el municipio (por ejemplo, Santa Rosa de Osos) o toca «Omitir».',
      interpretar: (a) => (a.omitir || a.niega || a.noSe ? { v: null } : pareceNombre(a) ? { v: 'texto' } : null),
    });
    if (r4.v === 'texto') {
      const d = deptoDe(normalizar(r4.libre));
      if (d) datos.departamento = d;
      datos.municipio = r4.libre.replace(/^(en|desde|de|queda en|esta en|está en)\s+/i, '').split(/[,·;\-–]/)[0].replace(/[.!]+$/, '').trim();
    }
    marcar('municipio');
  }
  if (conDepartamento && !datos.departamento && !hecho('departamento')) {
    const r = await preguntar('¿En qué departamento?', DEPARTAMENTOS.map((d) => ({ v: d, t: d })), {
      paso: 'departamento',
      repregunta: 'Toca el departamento o escríbelo.',
      interpretar: (a) => { const d = deptoDe(a.n); return d ? { v: d } : a.omitir || a.noSe ? { v: '' } : null; },
    });
    datos.departamento = r.v;
  }
  marcar('departamento');
}

// Contacto: nombre y empresa; en las solicitudes además celular, correo (opcional) y nota (opcional)
async function preguntarContacto({ completo }) {
  if (!hecho('nombre')) {
    if (datos.nombre) {
      const r = await preguntar(`Le escribo al asesor a nombre de <strong>${escapar(datos.nombre)}</strong>${datos.empresa ? ` (${escapar(datos.empresa)})` : ''}. ¿Correcto?`, [{ v: 'si', t: 'Sí' }, { v: 'cambiar', t: 'Cambiar' }], {
        paso: 'confirmar',
        repregunta: '¿Lo envío a ese nombre? Toca «Sí» o «Cambiar».',
        interpretar: (a) => (a.presentacion ? { v: 'nuevo', ...a.presentacion } : a.afirma ? { v: 'si' } : a.niega ? { v: 'cambiar' } : null),
      });
      if (r.v === 'cambiar') { datos.nombre = ''; datos.empresa = ''; }
      if (r.v === 'nuevo') { datos.nombre = r.nombre; datos.empresa = r.empresa || ''; }
    }
    if (!datos.nombre) {
      entrada.placeholder = 'Ej.: Ana Gómez, Lácteos La Cima';
      const r = await preguntar('¿Cómo te llamas y de qué empresa o finca eres? Así el asesor sabe con quién habla.', [{ v: null, t: 'Prefiero no decirlo' }], {
        paso: 'nombre', pose: 'notas',
        repregunta: 'Escríbeme tu nombre y, si quieres, tu empresa (por ejemplo: Ana Gómez, Lácteos La Cima). O toca «Prefiero no decirlo».',
        // Se valida solo el nombre (antes de la coma): la empresa puede decir "Quesos…" o "Lácteos…"
        interpretar: (a) => {
          if (a.presentacion) return { v: 'yo', ...a.presentacion };
          if (a.omitir || a.niega) return { v: null };
          const parteNombre = a.original.split(/[,·;\-–]/)[0];
          return !/^\s*(en|desde|de)\s/i.test(parteNombre) && pareceNombre(entender(parteNombre)) ? { v: 'texto' } : null;
        },
      });
      if (r.v === 'yo') { datos.nombre = r.nombre; datos.empresa = r.empresa || ''; }
      if (r.v === 'texto') { const [n, ...e] = r.libre.split(/[,·;\-–]/); datos.nombre = n.trim(); datos.empresa = e.join(' ').trim(); }
      if (datos.nombre) await bot(`¡Mucho gusto, ${escapar(datos.nombre.split(' ')[0])}!`, { pausa: 500 });
    }
    marcar('nombre');
  }
  if (!completo) return;
  if (!hecho('celular')) {
    if (!datos.celular) {
      entrada.placeholder = 'Ej.: 300 123 4567';
      const r = await preguntar('¿A qué celular te contactamos?', [{ v: 'El mismo de WhatsApp', t: 'El mismo de mi WhatsApp' }], {
        paso: 'celular',
        repregunta: 'Escríbeme el número (por ejemplo, 300 123 4567) o toca «El mismo de mi WhatsApp».',
        interpretar: (a) => { const n = a.original.replace(/\D/g, ''); return n.length >= 7 && n.length <= 13 ? { v: a.original.trim() } : a.afirma ? { v: 'El mismo de WhatsApp' } : null; },
      });
      datos.celular = r.v;
    }
    marcar('celular');
  }
  if (!hecho('correo')) {
    if (!datos.correo) {
      entrada.placeholder = 'Ej.: ana@lacteoslacima.com';
      const r = await preguntar('¿Un correo para enviarte la cotización? <span class="asistente__suave">Opcional.</span>', [{ v: '', t: 'Omitir' }], {
        paso: 'correo',
        repregunta: 'Escríbeme el correo o toca «Omitir».',
        interpretar: (a) => { const m = a.original.match(/[^\s@]+@[^\s@]+\.[^\s@]+/); return m ? { v: m[0] } : a.omitir || a.niega ? { v: '' } : null; },
      });
      datos.correo = r.v;
    }
    marcar('correo');
  }
  if (!hecho('nota')) {
    entrada.placeholder = 'Ej.: tengo 80 m², corriente trifásica';
    const r = await preguntar('¿Algo más que debamos saber? <span class="asistente__suave">Espacio disponible, voltaje, si es un proyecto financiado…</span>', [{ v: '', t: 'No, eso es todo' }], {
      paso: 'nota',
      repregunta: 'Escríbelo con tus palabras o toca «No, eso es todo».',
      interpretar: (a) => (a.niega || a.omitir || (a.todo && a.n.length < 20) ? { v: '' } : !a.sinSentido && !a.ofensivo && !a.saludo && a.original.trim().length > 2 ? { v: a.original.trim() } : null),
    });
    datos.nota = r.v;
    marcar('nota');
  }
}

async function conversar(intencionInicial, { reanudar = false } = {}) {
  sesion++; iniciado = true; enCurso = true; finalizado = false; cola = [];
  zonaOpciones.innerHTML = ''; esperaTexto = null;
  if (!reanudar) {
    mensajes.innerHTML = ''; consultaLibre = '';
    entrada.placeholder = 'Escribe tu pregunta…';
    const perfil = leer('eqx-interesado', null);
    // "carrito": cotizar los equipos del carrito (desde el saludo, el panel del carrito o la primera pregunta)
    const desdeCarrito = intencionInicial === 'carrito';
    datos = {
      intencion: desdeCarrito ? 'equipos' : intencionInicial || null, desdeCarrito, carritoVisto: enCarrito(), apl: null, otroProducto: '', litros: null, tipo: '', plazo: '', departamento: '', municipio: '',
      nombre: perfil?.nombre || '', empresa: perfil?.empresa || '', celular: perfil?.celular || '', correo: perfil?.correo || '', nota: '',
      equipos: new Set(), temas: new Set(), pideAsesor: false, seleccion: [], alcance: null, metodo: null, linea: null, equipoFicha: null, folio: null, hecho: new Set(),
    };
  }
  try {
    if (reanudar) {
      await bot('Sigamos donde íbamos.', { pausa: 450, marca: 'reanudar' });
      await ponerAlDiaCarrito();
    } else {
      const primerNombre = datos.nombre.split(' ')[0];
      await bot(`¡Hola${primerNombre ? `, ${escapar(primerNombre)}` : ''}! Soy el asistente de <strong>Industrias Equinox</strong>. Te ayudo a preparar tu solicitud y te paso con un asesor por WhatsApp.`, { pose: 'saludo' });
      if (datos.desdeCarrito && datos.carritoVisto.length) await bot(`Vamos con ${datos.carritoVisto.length === 1 ? 'el equipo' : `los ${datos.carritoVisto.length} equipos`} de tu cotización:${listaCarrito(datos.carritoVisto)}`, { pausa: 500 });
    }

    if (!datos.intencion) {
      const carrito = datos.carritoVisto;
      if (carrito.length) await bot(`Veo que tienes ${cuantosEquipos(carrito.length)} en tu cotización:${listaCarrito(carrito)}`, { pausa: 500 });
      const opciones = Object.entries(INTENCIONES).map(([v, t]) => ({ v, t }));
      if (carrito.length) opciones.unshift({ v: 'carrito', t: carrito.length === 1 ? 'Cotizar el equipo de mi cotización' : `Cotizar los ${carrito.length} equipos de mi cotización` }, { v: 'carrito-mas', t: 'Agregar otro equipo a la lista' });
      if (equipoActual) opciones.unshift({ v: 'equipo', t: `Cotizar ${minuscula(equipoActual.nombre)}` });
      const r = await preguntar(equipoActual ? `Estás viendo la ficha de <strong>${escapar(equipoActual.nombre)}</strong>. ¿En qué te ayudo?` : '¿En qué te ayudo hoy? Toca una opción o escríbeme con tus palabras.', opciones, {
        paso: 'intencion',
        repregunta: '¿En qué te ayudo? Toca una opción o cuéntame con tus palabras qué necesitas.',
        // "quiero cotizar una prensa" → equipos; "una planta de costeño" → planta; "sí" con equipos en el carrito → esos
        // "agregar otro" / "añade una prensa" con equipos en el carrito → la lista del carrito más el equipo nuevo
        interpretar: (a) => (carrito.length && (a.agregar || /\botr[oa]s?\b/.test(a.n)) ? { v: 'carrito-mas', ids: a.equipos.map((x) => equipoDeTexto(x, a)) }
          : a.agregar && !a.apl ? { v: 'equipos' }
          : a.equipos.length && !a.apl && !a.todo && (!a.intencion || a.intencion === 'cotizar') ? { v: 'equipos' }
          : a.intencion ? { v: a.intencion }
          : a.apl || a.litros ? { v: 'cotizar' }
          : equipoActual && a.afirma ? { v: 'equipo' }
          : carrito.length && (a.afirma || a.todo) ? { v: 'carrito' } : null),
      });
      datos.desdeCarrito = r.v === 'carrito' || r.v === 'carrito-mas';
      datos.intencion = datos.desdeCarrito ? 'equipos' : r.v;
      if (r.v === 'carrito-mas') { datos.agregarOtro = true; datos.agregarIds = (r.ids || []).filter((id) => EQUIPOS[id]); }
      if (r.v === 'equipo') datos.equipoFicha = equipoActual.id;
      guardarChat();
      if (carrito.length && !datos.desdeCarrito && conSolicitud()) await bot('Los equipos de tu cotización también van en la solicitud.', { pausa: 300 });
    }

    if (datos.intencion === 'humano') return cerrarConversacion();
    // "Agregar otro equipo": primero el equipo nuevo (los del carrito ya van en la lista); después las preguntas de siempre
    if (datos.agregarOtro && !hecho('agregar')) {
      enCarrito().forEach(sumarDelCarrito);
      if (datos.agregarIds?.length) { for (const id of datos.agregarIds) await sumarEquipo(id); } else await agregarDelCatalogo();
      marcar('agregar');
    }
    // Quién es (como el paso 1 del formulario)
    if (conSolicitud() && !hecho('tipo')) {
      const r = await preguntar('Para preparar tu solicitud: ¿quién eres?', TIPOS_CLIENTE.map(([t, d]) => ({ v: t, t: `${t} · ${d}` })), {
        paso: 'tipo',
        repregunta: 'Toca la opción que más se parezca a tu caso (finca, quesera, procesadora, cooperativa o entidad pública).',
        interpretar: (a) => { const t = tipoDe(a.n); return t ? { v: t } : null; },
      });
      datos.tipo = r.v;
      marcar('tipo');
    }
    await preguntarProduccion();

    if (datos.intencion === 'equipo' || datos.intencion === 'equipos') {
      // Equipos sueltos: los de la ficha o los que nombró, o del catálogo por línea. Con producto y litros,
      // la capacidad de cada equipo sale de la línea sugerida cuando está en ella.
      const a = APLICACIONES.find((x) => x.id === datos.apl);
      if (a && !datos.linea) datos.linea = a.linea(datos.litros || 2000);
      // Los equipos que entraron antes de saber producto y litros toman la capacidad de la línea sugerida
      datos.seleccion.forEach((s) => { if (!s.dato) s.dato = datos.linea?.find((x) => x.id === s.id)?.dato || ''; });
      datos.alcance = 'seleccion';
      if (!datos.seleccion.length) {
        if (datos.intencion === 'equipo') await sumarEquipo(datos.equipoFicha || equipoActual?.id);
        else {
          const yaDichos = [...datos.equipos]; datos.equipos.clear();
          if (datos.desdeCarrito) { enCarrito().forEach(sumarDelCarrito); guardarChat(); }
          for (const id of yaDichos) await sumarEquipo(id);
          if (!datos.seleccion.length) await agregarDelCatalogo();
        }
      }
      if (!hecho('equipos')) { await masEquipos(); marcar('equipos'); }
    } else {
      if (!hecho('linea')) { await mostrarLinea(); marcar('linea'); }
      // Cotizar: toda la línea o solo algunos equipos (o, para otro producto, elegir del catálogo o que un asesor proponga)
      if (datos.intencion === 'cotizar' && datos.linea) {
        if (!hecho('equipos')) { await elegirAlcance(); marcar('equipos'); }
      } else if (datos.intencion === 'cotizar' && !hecho('equipos')) {
        if (!datos.alcance) {
          const r = await preguntar('Para ese producto, ¿eliges tú los equipos o prefieres que un asesor te proponga la línea?', [{ v: 'asesor', t: 'Que un asesor me la proponga' }, { v: 'catalogo', t: 'Elegir equipos del catálogo' }], {
            paso: 'alcance',
            repregunta: 'Toca una opción: que un asesor te proponga la línea o elegir tú los equipos.',
            interpretar: (a) => (a.equipos.length || a.solo ? { v: 'catalogo' } : a.afirma || a.intencion === 'humano' ? { v: 'asesor' } : null),
          });
          datos.alcance = r.v === 'catalogo' ? 'seleccion' : 'asesor';
          guardarChat();
        }
        if (datos.alcance === 'seleccion') { if (!datos.seleccion.length) await agregarDelCatalogo(); await masEquipos(); }
        marcar('equipos');
      }
      if (datos.intencion === 'ver' && datos.apl && !hecho('ver')) {
        const L = datos.litros || 2000;
        if (!hecho('ver-enlace')) {
          await bot(`Te dejo el recorrido 3D listo: la leche pasa equipo por equipo.<div class="asistente__acciones"><a class="btn btn--pequeno" href="planta.html?apl=${datos.apl}&L=${L}&ver=recorrido">Ver el recorrido 3D <span class="btn__ico">${icono('i-play')}</span></a></div>`, { pausa: 600 });
          marcar('ver-enlace');
        }
        const r3 = await preguntar('¿Quieres que un asesor te la explique o la cotice?', [{ v: 'si', t: 'Sí, hablar con un asesor' }, { v: 'no', t: 'Por ahora no' }], {
          paso: 'ver',
          repregunta: '¿Te paso con un asesor? Toca «Sí» o «Por ahora no».',
          interpretar: (a) => (a.afirma || a.intencion === 'cotizar' ? { v: 'si' } : a.niega ? { v: 'no' } : null),
        });
        marcar('ver');
        if (r3.v === 'no') { enCurso = false; await bot('Listo. Cuando quieras, escríbeme aquí y seguimos.'); guardarChat(); return; }
      }
    }

    // Lugar y plazo (como el paso 4 del formulario) y contacto (paso 5)
    if (conSolicitud()) await preguntarPlazo();
    await preguntarLugar({ conDepartamento: conSolicitud() });
    await preguntarContacto({ completo: conSolicitud() });
    entrada.placeholder = 'Escribe tu pregunta…';
    await cerrarConversacion();
  } catch (err) {
    if (err instanceof Salto) { if (!datos.intencion) datos.intencion = 'humano'; entrada.placeholder = 'Escribe tu pregunta…'; return cerrarConversacion(); }
    if (err.message !== 'reiniciado') throw err;
  }
}

// Línea orientativa para el producto y los litros elegidos
async function mostrarLinea() {
  const a = APLICACIONES.find((x) => x.id === datos.apl);
  if (!a) return;
  const L = datos.litros || 2000;
  const linea = a.linea(L);
  datos.linea = linea;
  await bot(`Para <strong>${escapar(minuscula(a.nombre))}</strong> con ${fmt(L)} L/día${datos.litros ? '' : ' (ejemplo)'}, una línea típica lleva:
    <ol class="asistente__linea">${linea.map((x) => `<li><a href="equipo.html?e=${x.id}">${escapar(EQUIPOS[x.id].nombre)}</a><span>${escapar(x.dato)}</span></li>`).join('')}</ol>
    <span class="asistente__suave">Es orientativa: un ingeniero de Equinox la ajusta a tu sala y tu proceso.</span>`, { pausa: 900 });
}

function mensajeWhatsApp() {
  const a = APLICACIONES.find((x) => x.id === datos.apl);
  const partes = ['Hola, Equinox.'];
  if (datos.nombre) partes.push(`Soy ${datos.nombre}${datos.empresa ? ` (${datos.empresa})` : ''}${datos.municipio ? `, desde ${datos.municipio}` : ''}.`);
  else if (datos.municipio) partes.push(`Escribo desde ${datos.municipio}.`);
  const producto = a ? minuscula(a.nombre) : datos.otroProducto || null;
  const volumen = datos.litros ? `${fmt(datos.litros)} L/día` : null;
  // Si eligió equipos sueltos, el mensaje los lista con su capacidad; si eligió toda la línea, va la línea sugerida
  const sel = datos.alcance === 'seleccion' && datos.seleccion.length;
  const cuales = datos.seleccion.length === 1 ? 'este equipo' : 'estos equipos';
  const que = sel ? (producto ? `Quiero cotizar ${cuales} para mi planta de ${producto}${volumen ? ` (${volumen})` : ''}:` : `Quiero cotizar ${cuales}:`) : {
    cotizar: producto ? `Quiero cotizar una planta de ${producto}${volumen ? ` para ${volumen}` : '; aún no tengo claro el volumen diario'}.` : 'Quiero cotizar equipos en acero inoxidable.',
    asesoria: producto ? `Necesito asesoría para mi proceso de ${producto}${volumen ? ` (${volumen})` : ''}.` : 'Necesito asesoría para mi proceso.',
    ver: producto ? `Vi el recorrido 3D de una planta de ${producto}${volumen ? ` para ${volumen}` : ''} y quiero hablar con un asesor.` : 'Quiero hablar con un asesor sobre una planta.',
    equipo: equipoActual ? `Quiero cotizar: ${equipoActual.nombre} (${equipoActual.capacidad}).` : '',
    humano: 'Quiero hablar con un asesor.',
  }[datos.intencion] || '';
  if (que) partes.push(que);
  let texto = partes.join(' ');
  const enSeleccion = new Set(sel ? datos.seleccion.map((s) => s.id) : []);
  if (sel) texto += `\n${datos.seleccion.map((s) => `• ${EQUIPOS[s.id].nombre} · ${s.dato || 'capacidad por definir'}`).join('\n')}`;
  else if (datos.linea && datos.intencion !== 'equipo') texto += `\nLínea sugerida en la web:\n${datos.linea.map((x) => `• ${EQUIPOS[x.id].nombre} · ${x.dato}`).join('\n')}`;
  const marcados = leer('eqx-cotizacion', []).filter((id) => EQUIPOS[id] && id !== equipoActual?.id && !enSeleccion.has(id));
  if (marcados.length) texto += `\nEquipos que marqué en la web: ${marcados.map((id) => EQUIPOS[id].nombre).join(', ')}.`;
  if (equipoActual && datos.intencion !== 'equipo' && !enSeleccion.has(equipoActual.id)) texto += `\nEstaba viendo: ${equipoActual.nombre}.`;
  const interes = [...(datos.equipos || [])].filter((id) => !enSeleccion.has(id));
  if (interes.length) texto += `\nMe interesan: ${interes.map((id) => EQUIPOS[id].nombre).join(', ')}.`;
  if (datos.temas?.size) {
    const t = [...datos.temas].map((id) => TEMAS[id].etiqueta);
    texto += `\nTambién quiero saber ${t.length > 1 ? `${t.slice(0, -1).join(', ')} y ${t.at(-1)}` : t[0]}.`;
  }
  if (consultaLibre) texto += `\nMi consulta: ${consultaLibre}`;
  return texto;
}

// Solicitud con lo conversado (mismo formato que el formulario de la portada); el folio se mantiene si sigue escribiendo
function solicitudDelChat() {
  const a = APLICACIONES.find((x) => x.id === datos.apl);
  if (!datos.folio) { datos.folio = nuevoFolio(); datos.fechaSolicitud = new Date().toISOString(); }
  // Toda la línea y además los que sumó después ("agregar otro"), o solo los que eligió
  let equipos = datos.alcance === 'linea' ? (datos.linea || []).map((x) => ({ id: x.id, dato: x.dato })) : [];
  const base = new Set(equipos.map((e) => e.id));
  equipos = [...equipos, ...datos.seleccion.filter((s) => !base.has(s.id)).map((s) => ({ id: s.id, dato: s.dato }))];
  // Equipos que nombró por el camino ("me interesa una prensa") y los de su carrito también van, con capacidad por definir
  const ya = new Set(equipos.map((e) => e.id));
  equipos = [...equipos, ...[...new Set([...datos.equipos, ...enCarrito()])].filter((id) => !ya.has(id)).map((id) => ({ id, dato: '' }))];
  return {
    folio: datos.folio, fecha: datos.fechaSolicitud, origen: 'asistente', tipo: datos.tipo,
    producto: a ? a.nombre : (datos.otroProducto || 'Sin definir'), apl: datos.apl, litros: datos.litros,
    alcance: equipos.length ? (datos.alcance === 'linea' ? 'linea' : 'seleccion') : 'propuesta', equipos,
    departamento: datos.departamento, municipio: datos.municipio, plazo: datos.plazo,
    nombre: datos.nombre, empresa: datos.empresa, celular: datos.celular, correo: datos.correo, nota: datos.nota,
    consulta: consultaLibre, temas: [...datos.temas].map((t) => TEMAS[t].etiqueta),
  };
}
// Botones del mensaje final (delegados: siguen funcionando cuando la conversación se restaura en otra página)
mensajes.addEventListener('click', (e) => {
  const b = e.target.closest('[data-accion]'); if (!b || !conSolicitud()) return;
  const sol = solicitudDelChat();
  if (b.dataset.accion === 'pdf') descargarSolicitud(sol);
  if (b.dataset.accion === 'enviar-pdf') {
    const ventana = puedeCompartirArchivos() ? null : window.open('', '_blank');
    if (ventana) ventana.opener = null;
    enviarSolicitud(sol, { ventana });
  }
});
// silencioso: rehace el borrador sin decir "Lo agregué" (cuando el asistente ya respondió algo)
async function cerrarConversacion({ silencioso = false } = {}) {
  const id = sesion;
  const yaEstaba = finalizado;
  enCurso = false; finalizado = true;
  zonaOpciones.innerHTML = ''; esperaTexto = null;
  entrada.placeholder = 'Agrega algo más a tu mensaje…';
  try {
    const a = APLICACIONES.find((x) => x.id === datos.apl);
    const linea3D = a && datos.intencion !== 'ver' ? `<a class="asistente__enlace" href="planta.html?apl=${a.id}&L=${datos.litros || 2000}&ver=recorrido">Ver esta línea en 3D</a>` : '';
    // Cotizar y asesoría: solicitud con folio y PDF, igual que el formulario de la portada
    const sol = conSolicitud() ? solicitudDelChat() : null;
    if (sol) { registrarSolicitud(sol); prepararSolicitud(sol); }
    const texto = sol ? textoSolicitud(sol) : mensajeWhatsApp();
    if (yaEstaba) { if (!silencioso) await bot(sol ? 'Lo agregué a tu solicitud.' : 'Lo agregué a tu mensaje.', { pausa: 500 }); }
    else {
      if (consultaLibre && !datos.intencion) await bot('Anotado. Se lo paso a un asesor tal cual lo escribiste.');
      await bot(sol
        ? `¡Listo! Registré tu solicitud <strong>${sol.folio}</strong> y armé el PDF con tus datos, los equipos y el resumen técnico de cada uno.`
        : '¡Listo! Preparé tu mensaje. Ábrelo en WhatsApp, revísalo y envíalo: un asesor de Equinox sigue contigo.', { pose: 'pulgar' });
    }
    if (id !== sesion) return;
    mensajes.querySelectorAll('.asistente__borrador').forEach((n) => n.remove());
    const borrador = document.createElement('div');
    borrador.className = 'asistente__borrador';
    borrador.innerHTML = sol
      ? `<span class="asistente__suave">Tu mensaje · Solicitud ${escapar(sol.folio)}</span><p>${escapar(texto).replace(/\n/g, '<br>')}</p>
      <div class="asistente__acciones">
        <button type="button" class="btn btn--wa" data-accion="enviar-pdf" data-enviar>Enviar a Equinox por WhatsApp <span class="btn__ico">${icono('i-whatsapp-logo')}</span></button>
        <button type="button" class="asistente__enlace" data-accion="pdf">Descargar PDF</button>
        ${linea3D}
      </div>
      <span class="asistente__suave" data-pista>${pistaEnvio(enlaceGuardado(sol))}</span>`
      : `<span class="asistente__suave">Tu mensaje</span><p>${escapar(texto).replace(/\n/g, '<br>')}</p>
      <div class="asistente__acciones">
        <a class="btn btn--wa" href="https://wa.me/${numeroWhatsApp()}?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener" data-enviar>Abrir en WhatsApp <span class="btn__ico">${icono('i-whatsapp-logo')}</span></a>
        ${linea3D}
      </div>`;
    mensajes.append(borrador); bajar();
    // Cuando el PDF termina de subirse, el mensaje lleva su enlace (llega directo al chat de Equinox)
    if (sol) prepararSolicitud(sol).then((enlace) => {
      if (!borrador.isConnected) return;
      borrador.querySelector('p').innerHTML = escapar(textoSolicitud(sol, enlace)).replace(/\n/g, '<br>');
      borrador.querySelector('[data-pista]').textContent = pistaEnvio(enlace);
      guardarChat();
    });
    requestAnimationFrame(bajar); setTimeout(bajar, 350);
    borrador.querySelector('[data-enviar]').focus({ preventScroll: true });
    guardarChat();
  } catch (err) {
    if (err.message !== 'reiniciado') throw err;
  }
}

// ---------- la conversación sobrevive a la navegación ----------
// Se guarda en sessionStorage (solo en esta pestaña, se borra al cerrarla) en cada mensaje y al salir de la página.
// Al volver de una ficha o del recorrido 3D, o al pasar a otra página del sitio, se restaura tal cual:
// si el chat estaba abierto se abre solo y retoma en la pregunta pendiente ("Sigamos donde íbamos").
const CLAVE_CHAT = 'eqx-asistente-chat';
const VIGENCIA_CHAT = 45 * 60 * 1000; // una conversación de hace más de 45 minutos empieza de nuevo
function guardarChat() {
  if (!iniciado || !datos.hecho) return;
  try {
    const copia = mensajes.cloneNode(true);
    copia.querySelectorAll('.asistente__escribiendo').forEach((n) => n.remove());
    sessionStorage.setItem(CLAVE_CHAT, JSON.stringify({
      // enCurso también si la conversación quedó pendiente de retomar en esta página (sin abrir el chat aquí)
      t: Date.now(), html: copia.innerHTML, abierto: abiertoChat, pagina: paginaChat, enCurso: enCurso || pendienteReanudar, finalizado, consultaLibre, placeholder: entrada.placeholder,
      datos: { ...datos, equipos: [...datos.equipos], temas: [...datos.temas], hecho: [...datos.hecho] },
    }));
  } catch { /* sin almacenamiento: la conversación vive solo en esta página */ }
}
function restaurarChat() {
  let g = null;
  try { g = JSON.parse(sessionStorage.getItem(CLAVE_CHAT)); } catch { /* nada guardado */ }
  if (!g?.html || !g.datos || Date.now() - g.t > VIGENCIA_CHAT) return;
  mensajes.innerHTML = g.html;
  if (g.enCurso) {
    // La pregunta pendiente se vuelve a hacer al retomar: se quita del final (con su pose y el "Sigamos" anterior)
    for (let n = mensajes.lastElementChild; n; n = mensajes.lastElementChild) {
      if (n.matches('[data-pregunta], [data-reanudar], .asistente__pose, .asistente__escribiendo')) n.remove(); else break;
    }
  }
  datos = { ...g.datos, equipos: new Set(g.datos.equipos), temas: new Set(g.datos.temas), hecho: new Set(g.datos.hecho) };
  consultaLibre = g.consultaLibre || '';
  finalizado = !!g.finalizado; enCurso = false; iniciado = true;
  pendienteReanudar = !!g.enCurso;
  if (g.placeholder) entrada.placeholder = g.placeholder;
  // El saludo ofrece seguir la conversación en vez de empezar otra
  const p = cuerpoSaludo.querySelector('p'), ops = cuerpoSaludo.querySelector('.asistente__saludo-opciones');
  p.textContent = finalizado ? '¿Te ayudo con algo más? Tu mensaje para WhatsApp sigue listo.' : '¿Seguimos con tu consulta? Quedó a mitad de camino.';
  ops.innerHTML = '<button type="button" data-saludo-ir="seguir">Seguir la conversación</button><button type="button" data-saludo-ir="nueva">Empezar de nuevo</button>';
  // De vuelta en la página donde estaba abierto: se abre solo. En otra página (la ficha que abrió desde el chat):
  // queda cerrado para dejar ver la página, y el robot ofrece seguir la conversación
  // Solicitud ya terminada: el mensaje mostrado se pone al día con el enlace al PDF en cuanto esté subido
  if (finalizado && conSolicitud()) {
    const sol = solicitudDelChat(), borrador = mensajes.querySelector('.asistente__borrador:last-of-type');
    prepararSolicitud(sol).then((enlace) => {
      const p = borrador?.querySelector('p'), pista = borrador?.querySelector('[data-pista]');
      if (p) p.innerHTML = escapar(textoSolicitud(sol, enlace)).replace(/\n/g, '<br>');
      if (pista) pista.textContent = pistaEnvio(enlace);
    });
  }
  abiertoChat = !!g.abierto; paginaChat = g.pagina || aquí;
  if (g.abierto && paginaChat === aquí) abrir(undefined, { auto: true });
  else if (pagina !== 'inicio') setTimeout(saludar, reducido ? 300 : 900);
}
restaurarChat();
addEventListener('pagehide', guardarChat);

export const abrirAsistente = abrir;
