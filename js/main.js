import { APLICACIONES, EQUIPOS, LINEAS, CASOS, MOSTRAR_CASOS, numeroWhatsApp, GALERIA, ORDEN_EQUIPOS, imagenEquipo } from './data.js';
import { dibujarLinea } from './drawing.js';
import { nuevoFolio, registrarSolicitud, filasSolicitud, urlWhatsApp, enviarSolicitud, descargarSolicitud, prepararSolicitud, puedeCompartirArchivos, pistaEnvio } from './solicitud.js';

document.documentElement.classList.remove('sin-js');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ICO = (n) => `<svg aria-hidden="true"><use href="assets/img/iconos.svg#i-${n}"/></svg>`;
const fmt = (n) => Number(n).toLocaleString('es-CO');
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const movil = matchMedia('(max-width: 860px)');
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

// ---------- estado compartido ----------
const estado = {
  aplicacion: 'campesino',
  litros: 2000,
  equipos: new Set(leer('eqx-cotizacion', [])),
};
const app = (id = estado.aplicacion) => APLICACIONES.find((a) => a.id === id);

function actualizarContador() {
  const n = estado.equipos.size;
  $$('[data-contador]').forEach((el) => { $('.mono', el).textContent = n; el.classList.toggle('con-items', n > 0); });
  guardar('eqx-cotizacion', [...estado.equipos]);
  $$('[data-agregar]').forEach((b) => {
    const on = estado.equipos.has(b.dataset.agregar);
    b.setAttribute('aria-pressed', on);
    b.innerHTML = `${ICO(on ? 'check' : 'plus')}<span>${on ? 'En cotización' : 'Agregar'}</span>`;
  });
}

// ---------- navegación ----------
const nav = $('#nav');
new IntersectionObserver(([e]) => nav.classList.toggle('elevada', !e.isIntersecting), { rootMargin: '-80px 0px 0px 0px' }).observe($('#inicio .lamina__titulo') || document.body);
const botonMenu = $('.nav__menu');
const menu = $('#menu-movil');
function cerrarMenu() { botonMenu.setAttribute('aria-expanded', 'false'); menu.classList.remove('abierto'); setTimeout(() => { menu.hidden = true; }, 400); }
botonMenu.addEventListener('click', () => {
  const abrir = botonMenu.getAttribute('aria-expanded') !== 'true';
  if (!abrir) return cerrarMenu();
  menu.hidden = false;
  requestAnimationFrame(() => menu.classList.add('abierto'));
  botonMenu.setAttribute('aria-expanded', 'true');
});
$$('a', menu).forEach((a) => a.addEventListener('click', cerrarMenu));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && botonMenu.getAttribute('aria-expanded') === 'true') cerrarMenu(); });

// ---------- configurador (lámina) ----------
const plano = $('#plano');
const rango = $('#litros');
const salida = $('#litros-salida');
const aLitros = (v) => Math.max(200, Math.round((200 * Math.pow(100, v / 100)) / 100) * 100);
const aRango = (L) => Math.round((Math.log(L / 200) / Math.log(100)) * 100);
// Litros: se piden sin obligar. Mientras la persona no indique los suyos, 2.000 L es un ejemplo y la celda lo dice.
const litrosNum = $('[data-litros-num]');
const celdaLitros = $('[data-litros-celda]');
let litrosPropios = leer('eqx-litros', null);
if (litrosPropios) { estado.litros = litrosPropios; rango.value = aRango(litrosPropios); }
function marcarLitros(propios = false) {
  if (propios) { litrosPropios = estado.litros; guardar('eqx-litros', estado.litros); }
  celdaLitros.classList.toggle('pide', !litrosPropios);
  $('[data-litros-pista]').textContent = litrosPropios ? 'Línea dimensionada para tus litros.' : 'Es un ejemplo: escribe tus litros para dimensionar la línea.';
}
marcarLitros();

function mensajeLinea() {
  const a = app();
  const equipos = a.linea(estado.litros).map((x) => `• ${EQUIPOS[x.id].nombre} (${x.dato})`).join('\n');
  return `Hola, Equinox. Quiero cotizar una línea de ${a.nombre.toLowerCase()} para ${fmt(estado.litros)} litros por día.\n${equipos}`;
}

function pintarLamina({ redibujar = true } = {}) {
  const a = app();
  const linea = a.linea(estado.litros);
  salida.textContent = `${fmt(estado.litros)} L`;
  if (document.activeElement !== litrosNum) litrosNum.value = fmt(estado.litros);
  rango.setAttribute('aria-valuetext', `${fmt(estado.litros)} litros por día`);
  rango.style.setProperty('--p', `${rango.value}%`);
  $$('[data-litros-texto]').forEach((el) => { el.textContent = `${fmt(estado.litros)} L`; });
  $('[data-proyecto]').textContent = `Planta de ${a.corto.toLowerCase()}`;
  const kg = a.rendimiento ? ` · ≈ ${fmt(Math.round(estado.litros / a.rendimiento))} kg de queso al día` : '';
  $('[data-resumen]').textContent = `${linea.length} ${linea.length === 1 ? 'equipo sugerido' : 'equipos sugeridos'}${kg}`;
  $('[data-wa-linea]').href = `https://wa.me/${numeroWhatsApp()}?text=${encodeURIComponent(mensajeLinea())}`;
  $$('[data-planta-linea]').forEach((a) => { a.href = `planta.html?apl=${estado.aplicacion}&L=${estado.litros}`; });
  // Llamado a ver la línea funcionando: abre Arma tu planta con el recorrido listo para reproducir
  const n = linea.length, seg = Math.round(n * 5.2 + Math.max(0, n - 1) * 2.2);
  $$('[data-ver-funcionando]').forEach((el) => { el.href = `planta.html?apl=${estado.aplicacion}&L=${estado.litros}&ver=recorrido`; });
  $$('[data-ver-linea]').forEach((el) => { el.href = `planta.html?apl=${el.dataset.verLinea}&L=${estado.litros}&ver=recorrido`; });
  $$('[data-ver-datos]').forEach((el) => { el.textContent = `Recorrido 3D de ${seg} s · ${n} equipos · ${fmt(estado.litros)} L/día${litrosPropios ? '' : ' de ejemplo'}`; });
  $('#plano-desc').textContent = `Plano de la línea sugerida para ${a.nombre}: ${linea.map((x) => `${EQUIPOS[x.id].nombre}, ${x.dato}`).join('; ')}.`;
  // Leyenda visible del plano: dice qué línea se está viendo y se resalta cuando cambia
  const leyenda = $('[data-leyenda]');
  const textoLeyenda = `Línea sugerida · ${a.nombre} · ${fmt(estado.litros)} L/día · ${linea.length} ${linea.length === 1 ? 'equipo' : 'equipos'}`;
  if (leyenda.textContent !== textoLeyenda) {
    const habia = leyenda.dataset.lista === '1';
    leyenda.textContent = textoLeyenda; leyenda.dataset.lista = '1';
    if (habia && redibujar) { leyenda.classList.remove('cambio'); void leyenda.offsetWidth; leyenda.classList.add('cambio'); }
  }
  if (redibujar) dibujarLinea(plano, linea);
}
// En celular el plano queda debajo del cajetín: al cambiar de producto se baja hasta él para que se note el cambio
function mostrarPlanoSiHaceFalta() {
  if (!movil.matches) return;
  $('.lamina__dibujo').scrollTo({ left: 0, behavior: reducido ? 'auto' : 'smooth' });
  const r = $('.lamina__dibujo').getBoundingClientRect();
  if (r.top > innerHeight - 120 || r.bottom < 80) $('.lamina__dibujo').scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' });
}

const chips = $('[data-chips-aplicacion]');
chips.innerHTML = APLICACIONES.map((a) => `<label class="chip"><input type="radio" name="aplicacion" value="${a.id}" ${a.id === estado.aplicacion ? 'checked' : ''}><span>${a.corto}</span></label>`).join('');
chips.addEventListener('change', (e) => { estado.aplicacion = e.target.value; pintarLamina(); setTimeout(mostrarPlanoSiHaceFalta, 120); });
let espera;
rango.addEventListener('input', () => {
  estado.litros = aLitros(Number(rango.value));
  marcarLitros(true);
  pintarLamina({ redibujar: false });
  clearTimeout(espera);
  espera = setTimeout(() => pintarLamina(), 260);
});
// Litros escritos a mano (200 a 20.000 L, de 100 en 100)
litrosNum.addEventListener('focus', () => litrosNum.select());
litrosNum.addEventListener('blur', () => { litrosNum.value = fmt(estado.litros); });
litrosNum.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); litrosNum.blur(); } });
litrosNum.addEventListener('change', () => {
  const n = Number(litrosNum.value.replace(/\D/g, ''));
  if (!n) { litrosNum.value = fmt(estado.litros); return; }
  estado.litros = Math.min(20000, Math.max(200, Math.round(n / 100) * 100));
  rango.value = aRango(estado.litros);
  marcarLitros(true);
  pintarLamina();
});
$('[data-cotizar-linea]').addEventListener('click', () => prellenar(estado.aplicacion, estado.litros, app().linea(estado.litros).map((x) => x.id)));
pintarLamina();
// Al terminar la entrada (placa de Equinox), el plano se vuelve a trazar ya a la vista
document.addEventListener('eqx:intro-fin', () => pintarLamina());
// El robot de la portada entra cuando termina la entrada de la placa (o al cargar, si no hay entrada)
const robotPortada = $('.lamina__robot');
if (robotPortada) {
  const mostrarRobot = () => setTimeout(() => robotPortada.classList.add('listo'), 250);
  if (document.documentElement.classList.contains('con-intro')) document.addEventListener('eqx:intro-fin', mostrarRobot, { once: true });
  else mostrarRobot();
}

function elegirAplicacion(id, { irAlPlano = false } = {}) {
  estado.aplicacion = id;
  const radio = $(`input[name="aplicacion"][value="${id}"]`);
  if (radio) radio.checked = true;
  pintarLamina();
  if (irAlPlano) $('#inicio').scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' });
}

// ---------- índice de aplicaciones ----------
const indice = $('[data-indice]');
const videoApl = $('[data-video-apl]');
indice.innerHTML = APLICACIONES.map((a, i) => `<li><button type="button" data-apl="${a.id}" aria-pressed="${i === 0}"><span class="mono">${String.fromCharCode(65 + i)}</span><strong>${a.nombre}</strong><span class="flecha-ind">${ICO('arrow-right').replace('<svg', '<svg width="22" height="22"')}</span></button></li>`).join('');
let aplPanel = APLICACIONES[0].id;
function pintarPanel(id) {
  aplPanel = id;
  const a = app(id);
  $$('[data-apl]', indice).forEach((b) => b.setAttribute('aria-pressed', b.dataset.apl === id));
  $('[data-apl-nombre]').textContent = a.nombre;
  $('[data-apl-ver]').href = `planta.html?apl=${a.id}&L=2000&ver=recorrido`;
  $('[data-apl-resumen]').textContent = a.resumen;
  $('[data-apl-equipos]').innerHTML = a.linea(2000).map((x, i) => {
    const eq = EQUIPOS[x.id];
    return `<li><span class="mono">${eq.tag}-${String(i + 1).padStart(2, '0')}</span><a href="equipo.html?e=${x.id}">${eq.nombre}</a><span class="cap">${eq.capacidad}</span></li>`;
  }).join('');
  const src = `assets/video/${a.video}.mp4`;
  if (!videoApl.dataset.src || videoApl.dataset.src !== src) {
    videoApl.dataset.src = src;
    videoApl.poster = `assets/img/posters/${a.video}.jpg`;
    $('[data-credito-apl]').textContent = a.credito || 'Video de referencia · Pexels';
    videoApl.style.objectPosition = a.encuadre || '';
    if (videoApl.dataset.cargado) { videoApl.src = src; if (!reducido) videoApl.play().catch(() => {}); }
  }
}
indice.addEventListener('click', (e) => { const b = e.target.closest('[data-apl]'); if (b) pintarPanel(b.dataset.apl); });
indice.addEventListener('mouseover', (e) => { const b = e.target.closest('[data-apl]'); if (b && matchMedia('(hover: hover)').matches) pintarPanel(b.dataset.apl); });
$('[data-ver-plano]').addEventListener('click', () => elegirAplicacion(aplPanel, { irAlPlano: true }));
$('[data-apl-cotizar]').addEventListener('click', () => prellenar(aplPanel, 2000, app(aplPanel).linea(2000).map((x) => x.id)));
pintarPanel(aplPanel);

// ---------- casos ----------
const casoHTML = (c) => `
  <article class="expediente revela ${c.destacado ? 'expediente--grande' : ''}">
    <div class="expediente__cabeza"><span>${c.proyecto}</span><span>${c.lugar}</span><span>${c.producto}</span></div>
    <span class="sello">Caso de muestra</span>
    ${c.destacado ? `<div class="visor"><video data-autoplay muted loop playsinline preload="none" poster="assets/img/posters/${c.video}.jpg"><source src="assets/video/${c.video}.mp4" type="video/mp4"></video><span class="credito">Video de referencia · Pexels</span></div>` : ''}
    <div class="expediente__cuerpo">
      <h3>${c.titulo}</h3>
      <dl><dt>Reto</dt><dd>${c.reto}</dd><dt>Solución</dt><dd>${c.solucion}</dd></dl>
      <div class="expediente__cifra"><strong>${c.cifra}</strong><span>${c.cifraTexto}</span></div>
    </div>
  </article>`;
const [destacado, ...resto] = CASOS;
if (MOSTRAR_CASOS) {
  $('[data-casos]').innerHTML = `${casoHTML(destacado)}<div class="casos__lado">${resto.map(casoHTML).join('')}</div>`;
  $('[data-seccion-casos]').hidden = false;
}

// ---------- demostración del asistente ("Cotiza conversando"): conversación de ejemplo con la línea real de costeño ----------
const demoChat = $('[data-demo-chat]');
if (demoChat) {
  const ej = APLICACIONES.find((x) => x.id === 'costeno'), L = 2000, lineaEj = ej.linea(L);
  const piezas = [
    ['bot', '¡Hola! Soy el asistente de <strong>Industrias Equinox</strong>. ¿Qué produces o quieres producir?'],
    ['persona', 'Queso costeño'],
    ['bot', '¿Cuántos litros de leche procesas al día?'],
    ['persona', 'Unos 2.000 litros'],
    ['bot', `Para queso costeño con ${fmt(L)} L/día, una línea típica lleva:<ol class="asistente__linea">${lineaEj.slice(0, 3).map((x) => `<li><b>${EQUIPOS[x.id].nombre}</b><span>${x.dato}</span></li>`).join('')}</ol><span class="asistente__suave">…y ${lineaEj.length - 3} equipos más.</span>`],
  ];
  demoChat.innerHTML = piezas.map(([quien, html], i) => `<div class="asistente__msj asistente__msj--${quien}" style="--i:${i}">${html}</div>`).join('')
    + `<div class="asistente__borrador" style="--i:${piezas.length}"><span class="asistente__suave">Tu mensaje está listo</span><div class="asistente__acciones"><span class="btn btn--wa btn--pequeno">Abrir en WhatsApp <span class="btn__ico"><svg aria-hidden="true"><use href="assets/img/iconos.svg#i-whatsapp-logo"/></svg></span></span></div></div>`;
}

// ---------- adelanto de equipos por línea (el catálogo completo está en equipos.html) ----------
$('[data-lineas-adelanto]').innerHTML = LINEAS.map((l, i) => {
  const ids = ORDEN_EQUIPOS.filter((id) => EQUIPOS[id].linea === l.id);
  const fotos = ids.slice(0, 4).map((id) => `<img src="${imagenEquipo(id).src}" alt="" title="${EQUIPOS[id].nombre}" loading="lazy" decoding="async">`).join('');
  const mas = ids.length > 4 ? `<span class="mono">+${ids.length - 4}</span>` : '';
  const nombres = ids.slice(0, 3).map((id) => EQUIPOS[id].nombre).join(' · ') + (ids.length > 3 ? '…' : '');
  return `<li class="revela"><a href="equipos.html#linea-${l.id}">
    <span class="mono">L-${String(i + 1).padStart(2, '0')} · ${ids.length} ${ids.length === 1 ? 'equipo' : 'equipos'}</span>
    <strong>${l.nombre}</strong>
    <span class="lineas-adelanto__fotos" aria-hidden="true">${fotos}${mas}</span>
    <span class="lineas-adelanto__nombres">${nombres}</span>
    <span class="ver">Ver la línea <svg aria-hidden="true"><use href="assets/img/iconos.svg#i-arrow-right"/></svg></span>
  </a></li>`;
}).join('');
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-agregar]');
  if (!b) return;
  const id = b.dataset.agregar;
  estado.equipos.has(id) ? estado.equipos.delete(id) : estado.equipos.add(id);
  actualizarContador();
  pintarEquiposForm();
});

// ---------- cotizador ----------
const form = $('#formulario');
const pasos = $$('[data-paso-form]', form);
let paso = 1;
$('[data-select-producto]').innerHTML = `<option value="">Elige</option>${APLICACIONES.map((a) => `<option value="${a.id}">${a.nombre}</option>`).join('')}<option value="otro">Otro producto</option>`;
function pintarEquiposForm() {
  const cont = $('[data-equipos-form]');
  cont.innerHTML = Object.entries(EQUIPOS).map(([id, eq]) => `<label class="chip"><input type="checkbox" value="${id}" ${estado.equipos.has(id) ? 'checked' : ''}><span>${eq.nombre}</span></label>`).join('');
  $('[data-sin-equipos]').textContent = estado.equipos.size
    ? `${estado.equipos.size} ${estado.equipos.size === 1 ? 'equipo marcado' : 'equipos marcados'}. Ajusta la selección si hace falta.`
    : 'Marca los equipos. Si no sabes, déjalo así y te proponemos la línea.';
}
$('[data-equipos-form]').addEventListener('change', (e) => {
  if (e.target.checked) estado.equipos.add(e.target.value); else estado.equipos.delete(e.target.value);
  actualizarContador();
  $('[data-sin-equipos]').textContent = `${estado.equipos.size} ${estado.equipos.size === 1 ? 'equipo marcado' : 'equipos marcados'}.`;
});

function irPaso(n) {
  paso = n;
  pasos.forEach((p) => p.classList.toggle('activo', Number(p.dataset.pasoForm) === n));
  $$('.progreso span', form).forEach((s, i) => { s.classList.toggle('hecho', i + 1 < n); s.classList.toggle('actual', i + 1 === n); });
  $('[data-atras]').hidden = n === 1;
  $('[data-paso-texto]').textContent = `Paso ${n} de 5`;
  $('[data-siguiente]').innerHTML = n === 5 ? `Enviar solicitud <span class="btn__ico">${ICO('arrow-right')}</span>` : `Siguiente <span class="btn__ico">${ICO('arrow-right')}</span>`;
}
function marcar(campo, ok) { campo.closest('.campo')?.classList.toggle('error', !ok); return ok; }
function validar(n) {
  if (n === 1) {
    const ok = !!form.tipo.value;
    $('[data-error="tipo"]').classList.toggle('visible', !ok);
    return ok;
  }
  if (n === 2) return marcar(form.litros, Number(form.litros.value) >= 50);
  if (n === 4) return marcar(form.departamento, !!form.departamento.value);
  if (n === 5) {
    const okN = marcar(form.nombre, form.nombre.value.trim().length > 1);
    const okC = marcar(form.celular, form.celular.value.replace(/\D/g, '').length >= 10);
    return okN && okC;
  }
  return true;
}
$('[data-siguiente]').addEventListener('click', () => {
  if (!validar(paso)) { const err = $('.campo.error input, .campo.error select', pasos[paso - 1]); err?.focus(); return; }
  if (paso < 5) { irPaso(paso + 1); $('input, select', pasos[paso - 1])?.focus({ preventScroll: true }); return; }
  enviar();
});
$('[data-atras]').addEventListener('click', () => irPaso(paso - 1));
form.addEventListener('submit', (e) => { e.preventDefault(); $('[data-siguiente]').click(); });

// La solicitud (folio, registro, texto de WhatsApp y PDF) es la misma que arma el asistente: js/solicitud.js
let solicitudActual = null;
function enviar() {
  const d = new Date();
  const folio = nuevoFolio(d);
  const a = app(form.producto.value);
  const producto = form.producto.value === 'otro' ? 'Otro producto' : (a?.nombre || 'Sin definir');
  const litros = Number(form.litros.value) || null;
  // Capacidad de cada equipo marcado: la de la línea sugerida para esos litros, si el equipo está en ella
  const linea = a ? a.linea(litros || 2000) : [];
  const equipos = [...estado.equipos].map((id) => ({ id, dato: linea.find((x) => x.id === id)?.dato || '' }));
  const sol = {
    folio, fecha: d.toISOString(), origen: 'formulario', tipo: form.tipo.value, producto, apl: a?.id || null, litros,
    alcance: equipos.length ? 'seleccion' : 'propuesta', equipos,
    departamento: form.departamento.value, municipio: form.municipio.value.trim(), plazo: form.plazo.value,
    nombre: form.nombre.value.trim(), empresa: form.empresa.value.trim(), celular: form.celular.value.trim(), correo: form.correo.value.trim(), nota: form.nota.value.trim(),
  };
  registrarSolicitud(sol);
  solicitudActual = sol;
  $('[data-pista-exito]').textContent = pistaEnvio(null);
  prepararSolicitud(sol).then((enlace) => {
    if (solicitudActual !== sol) return;
    $('[data-wa-exito]').href = urlWhatsApp(sol, enlace);
    $('[data-pista-exito]').textContent = pistaEnvio(enlace);
  });
  $('[data-resumen-exito]').innerHTML = filasSolicitud(sol).map(([k, v]) => `<dt>${k}</dt><dd>${v.replace(/</g, '&lt;')}</dd>`).join('');
  $('[data-wa-exito]').href = urlWhatsApp(sol);
  $('[data-folio-exito]').textContent = `Solicitud ${folio} registrada`;
  $('[data-folio]').textContent = folio;
  pasos.forEach((p) => p.classList.remove('activo'));
  $('[data-pie-form]').hidden = true;
  $('.progreso', form).hidden = true;
  $('[data-exito]').classList.add('visible');
  $('[data-exito] h3').focus?.();
}
// WhatsApp con el PDF: en el celular se comparte el archivo con el mensaje; en el computador se descarga y se abre WhatsApp
$('[data-wa-exito]').addEventListener('click', (e) => {
  if (!solicitudActual) return;
  e.preventDefault();
  const ventana = puedeCompartirArchivos() ? null : window.open('', '_blank');
  if (ventana) ventana.opener = null;
  enviarSolicitud(solicitudActual, { ventana });
});
$('[data-pdf-exito]').addEventListener('click', () => { if (solicitudActual) descargarSolicitud(solicitudActual); });
$('[data-nueva]').addEventListener('click', () => {
  form.reset();
  $('[data-exito]').classList.remove('visible');
  $('[data-pie-form]').hidden = false;
  $('.progreso', form).hidden = false;
  $('[data-folio]').textContent = 'EQX · nueva';
  irPaso(1);
});

function prellenar(aplicacion, litros, equipos = []) {
  equipos.forEach((id) => estado.equipos.add(id));
  actualizarContador();
  pintarEquiposForm();
  form.producto.value = aplicacion;
  form.litros.value = litros;
  if (aplicacion === 'acopio') form.tipo.value = 'Finca o ganadero';
}

// Parámetros desde la ficha (?equipo=tina&cap=1000) o desde el constructor de planta (?planta=1)
const params = new URLSearchParams(location.search);
if (params.get('equipo') && EQUIPOS[params.get('equipo')]) {
  const idEq = params.get('equipo');
  const aplic = APLICACIONES.find((a) => a.linea(2000).some((x) => x.id === idEq));
  const capEq = Number(params.get('cap')) || 0;
  prellenar(aplic?.id || '', /\bL$/.test(EQUIPOS[idEq].capacidad) && capEq ? capEq : 2000, [idEq]);
  form.nota.value = `Me interesa: ${EQUIPOS[idEq].nombre}${capEq ? `, capacidad ${fmt(capEq)}` : ''}.`;
}
if (params.get('planta')) {
  const planta = leer('eqx-planta', null);
  if (planta?.items?.length) {
    prellenar(planta.producto, planta.litros, [...new Set(planta.items.map((i) => i.id))]);
    form.nota.value = `Planta armada en 3D en la web (sala de ${planta.sala.w} × ${planta.sala.l} m):\n${planta.items.map((i) => `• ${EQUIPOS[i.id].nombre} · ${fmt(i.cap)}`).join('\n')}`;
  }
}

actualizarContador();
pintarEquiposForm();
irPaso(1);

// ---------- regreso desde la ficha ----------
// Al entrar a una ficha desde la portada, la ficha ofrece volver a la misma sección.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="equipo.html"]'); if (!a) return;
  const seccion = a.closest('section[id]')?.id || 'inicio';
  const etiqueta = 'Volver al inicio';
  try { sessionStorage.setItem('eqx-volver', JSON.stringify({ url: `index.html#${seccion}`, etiqueta })); } catch { /* sin almacenamiento */ }
});

// ---------- galería de fotos reales ----------
const galeria = $('[data-galeria]');
if (galeria) {
  galeria.innerHTML = GALERIA.map((g, i) => {
    const eq = g.id && EQUIPOS[g.id];
    const nombre = eq ? eq.nombre : g.nombre;
    const foto = `<div class="galeria-real__foto"><img src="${g.foto}" alt="${nombre}, fotografía real de Equinox" loading="lazy" decoding="async"></div>`;
    const pie = eq
      ? `<div class="galeria-real__pie"><span class="mono">${eq.tag} · Foto real</span><strong>${nombre}</strong><span class="ver">Ficha, plano y 3D <svg aria-hidden="true"><use href="assets/img/iconos.svg#i-arrow-right"/></svg></span></div>`
      : `<div class="galeria-real__pie"><span class="mono">Nombre por confirmar</span><strong>${nombre}</strong><span class="ver ver--quieto">Fuera del catálogo actual</span></div>`;
    const clase = `galeria-real__item revela${i === 0 ? ' galeria-real__item--destacado' : ''}`;
    return eq ? `<li class="${clase}"><a href="equipo.html?e=${g.id}">${foto}${pie}</a></li>` : `<li class="${clase}">${foto}${pie}</li>`;
  }).join('') + `<li class="galeria-real__cta revela"><span class="mono">A la medida</span><strong>¿Tu proceso necesita un equipo distinto?</strong><p>Lo diseñamos contigo y lo fabricamos a la medida de tu planta, con el plano revisado antes de fabricar.</p><a class="btn btn--sobre-noche" href="#cotizar">Pide una visita técnica <span class="btn__ico"><svg aria-hidden="true"><use href="assets/img/iconos.svg#i-arrow-right"/></svg></span></a></li>`;
}

// ---------- revelado y videos ----------
const io = new IntersectionObserver((entradas) => entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.revela').forEach((el) => io.observe(el));

const ioVideo = new IntersectionObserver((entradas) => entradas.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting) {
    if (v.dataset.src && !v.dataset.cargado) { v.src = v.dataset.src; v.dataset.cargado = '1'; }
    if (!reducido) v.play().catch(() => {});
  } else v.pause();
}), { threshold: 0.35 });
$$('video[data-autoplay], [data-video-apl]').forEach((v) => ioVideo.observe(v));

// ---------- movimiento con scroll ----------
const { gsap, ScrollTrigger } = window;
if (gsap && ScrollTrigger && !reducido) {
  gsap.registerPlugin(ScrollTrigger);
  const portada = $('[data-portada]');
  gsap.fromTo(portada, { '--recorte': movil.matches ? '3%' : '8%' }, { '--recorte': '0%', ease: 'none', scrollTrigger: { trigger: portada, start: 'top 85%', end: 'top 20%', scrub: true } });
}

// ---------- tanque 3D ----------
const lienzo = $('#tanque-3d');
if (lienzo) {
  import('./tank3d.js').then(({ crearTanque }) => {
    const tanque = crearTanque(lienzo, $('#anotaciones-3d'), {
      pasos: {
        plano: { cam: [5.9, 3.1, 6.9], trazo: 1, acero: 0, giro: 0.12, foco: 'ninguno' },
        acero: { cam: [5.5, 2.9, 6.5], giro: 0.12, foco: 'tablero' },
        corte: { cam: [4.9, 2.7, 5.8], objetivo: [0, 1.15, 0], corte: 1, foco: 'pared' },
        agitador: { cam: [4.1, 4.4, 4.9], objetivo: [0, 1.35, 0], corte: 1, foco: 'agitador' },
        tapa: { cam: [5.3, 3.3, 6.3], objetivo: [0, 1.0, 0], foco: 'tapa', mostrar: ['valvula', 'patas'] },
      },
    });
    tanque.ir('plano');
    const pasos3d = $$('[data-paso]');
    if (window.ScrollTrigger && !reducido) {
      pasos3d.forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 60%', end: 'bottom 40%', onToggle: (s) => s.isActive && tanque.ir(el.dataset.paso) }));
    } else {
      const ioPaso = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && tanque.ir(e.target.dataset.paso)), { threshold: 0.6 });
      pasos3d.forEach((el) => ioPaso.observe(el));
    }
  }).catch(() => { lienzo.closest('.anatomia__escena').innerHTML = '<p class="lead" style="padding:40vh 24px 0">El modelo 3D no se pudo cargar en este navegador.</p>'; });
}
