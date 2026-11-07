import { EQUIPOS, LINEAS, CASOS, MOSTRAR_CASOS, numeroWhatsApp, FOTOS, ORDEN_EQUIPOS, imagenEquipo, pintarContador } from './data.js';
import { FICHAS } from './fichas.js';
import { crearVisor } from './visor.js';
import { registrar } from './medicion.js';

document.documentElement.classList.remove('sin-js');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Number(n).toLocaleString('es-CO');
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const ICO = (n) => `<svg aria-hidden="true"><use href="assets/img/iconos.svg#i-${n}"/></svg>`;

// Menú y contador
const boton = $('.nav__menu'), menu = $('#menu-movil');
const cerrar = () => { boton.setAttribute('aria-expanded', 'false'); menu.classList.remove('abierto'); setTimeout(() => { menu.hidden = true; }, 400); };
boton.addEventListener('click', () => { if (boton.getAttribute('aria-expanded') === 'true') return cerrar(); menu.hidden = false; requestAnimationFrame(() => menu.classList.add('abierto')); boton.setAttribute('aria-expanded', 'true'); });
$$('a', menu).forEach((a) => a.addEventListener('click', cerrar));
pintarContador(leer('eqx-cotizacion', []).length);

// Equipo pedido
const params = new URLSearchParams(location.search);
const id = EQUIPOS[params.get('e')] && FICHAS[params.get('e')] ? params.get('e') : 'enfriamiento';
const eq = EQUIPOS[id], ficha = FICHAS[id];
registrar('ver_ficha', { equipo: id });
const linea = LINEAS.find((l) => l.id === eq.linea);
const capPedida = Number(params.get('cap'));
let cap = ficha.capacidades.reduce((a, b) => (Math.abs(b - capPedida) < Math.abs(a - capPedida) ? b : a), ficha.capacidades[Math.floor(ficha.capacidades.length / 2)]);
if (!capPedida) cap = ficha.capacidades[Math.min(ficha.capacidades.length - 1, Math.floor(ficha.capacidades.length / 2))];
const capTexto = (c) => (ficha.fija ? ficha.fija : `${fmt(c)} ${ficha.unidad}`);

document.title = `${eq.nombre} en acero inoxidable · Ficha técnica | Industrias Equinox Colombia`;
$('meta[name="description"]').setAttribute('content', `${eq.nombre}: ${ficha.resumen} Capacidades ${eq.capacidad}.`);
$('[data-linea]').textContent = linea.nombre;
$('[data-tag]').textContent = `${eq.tag} · ${linea.nombre}`;
$('[data-nombre]').textContent = eq.nombre;
$('[data-resumen]').textContent = ficha.resumen;
if (ficha.nota) { $('[data-nota-cap]').hidden = false; $('[data-nota-cap]').textContent = ficha.nota; }

// Capacidades
const chips = $('[data-capacidades]');
if (ficha.capacidades.length > 1) chips.innerHTML = ficha.capacidades.map((c) => `<label class="chip"><input type="radio" name="cap" value="${c}" ${c === cap ? 'checked' : ''}><span>${fmt(c)} ${ficha.unidad}</span></label>`).join('');
else chips.innerHTML = `<span class="cajetin__valor mono">${capTexto(cap)}</span>`;

// Tabla
const tabla = $('[data-tabla-spec]');
const caps = ficha.capacidades;
const filas = ficha.tabla(caps[0]).map(([k]) => k);
tabla.insertAdjacentHTML('beforeend', `<thead><tr><th scope="col">${ficha.fija ? 'Medida' : `Capacidad (${ficha.unidad})`}</th>${caps.map((c) => `<th scope="col" data-col="${c}">${ficha.fija ? 'Única' : fmt(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((k, i) => `<tr><th scope="row">${k}</th>${caps.map((c) => `<td data-col="${c}">${ficha.tabla(c)[i][1]}</td>`).join('')}</tr>`).join('')}</tbody>`);
$('[data-comunes]').innerHTML = ficha.comunes.map(([k, v]) => `<div><span class="rotulo">${k}</span><strong>${v}</strong></div>`).join('');
$('[data-opciones]').innerHTML = ficha.opciones.map(([t, d]) => `<div><strong>${t}</strong><p>${d}</p></div>`).join('');

// Volver a equipos y anterior / siguiente
// Volver lleva al listado de donde se entró (Equipos con su filtro, o la sección de la portada),
// cayendo en la tarjeta de este equipo. Si se llegó directo, va a Equipos.
const pos = ORDEN_EQUIPOS.indexOf(id), total = ORDEN_EQUIPOS.length;
const idAnt = ORDEN_EQUIPOS[(pos - 1 + total) % total], idSig = ORDEN_EQUIPOS[(pos + 1) % total];
let volver = { url: 'equipos.html', etiqueta: 'Volver a equipos' };
try { volver = JSON.parse(sessionStorage.getItem('eqx-volver')) || volver; } catch { /* sin almacenamiento */ }
const hrefVolver = volver.url.startsWith('equipos.html') ? `${volver.url.split('#')[0]}#eq-${id}` : volver.url;
const normal = (u) => { const x = new URL(u, location.href); return (x.pathname.endsWith('/') ? `${x.pathname}index.html` : x.pathname) + x.search; };
const vieneDeAhi = document.referrer && new URL(document.referrer).origin === location.origin && normal(document.referrer) === normal(volver.url.split('#')[0]);
$$('[data-volver]').forEach((a) => {
  a.href = hrefVolver;
  // Si la página anterior es ese mismo listado, se usa el historial: vuelve al instante y en la misma posición
  a.addEventListener('click', (e) => { if (vieneDeAhi && history.length > 1) { e.preventDefault(); history.back(); } });
});
$$('[data-volver-texto]').forEach((el) => { el.textContent = volver.etiqueta; });
$$('[data-posicion]').forEach((el) => { el.textContent = `${String(pos + 1).padStart(2, '0')} / ${total}`; });
$$('[data-anterior]').forEach((a) => { a.href = `equipo.html?e=${idAnt}`; a.setAttribute('aria-label', `Equipo anterior: ${EQUIPOS[idAnt].nombre}`); });
$$('[data-siguiente]').forEach((a) => { a.href = `equipo.html?e=${idSig}`; a.setAttribute('aria-label', `Equipo siguiente: ${EQUIPOS[idSig].nombre}`); });
$('[data-barra-nombre]').textContent = eq.nombre;
$('[data-sigue]').innerHTML = [[idAnt, 'Anterior'], [idSig, 'Siguiente']].map(([k, rot], i) => {
  const img = imagenEquipo(k);
  return `<a class="sigue__item${i ? ' sigue__item--sig' : ''}" href="equipo.html?e=${k}"><span class="sigue__img"><img src="${img.src}" alt="" loading="lazy" decoding="async"></span><span class="sigue__texto"><span class="mono">${i ? '' : '← '}${rot}${i ? ' →' : ''} · ${EQUIPOS[k].tag}</span><strong>${EQUIPOS[k].nombre}</strong><span class="cap">${EQUIPOS[k].capacidad}</span></span></a>`;
}).join('');
// La barra fija aparece cuando el encabezado de la ficha sale de la pantalla
const barra = $('[data-barra-ficha]'), marcaBarra = $('.ficha-hero__info .cajetin__acciones') || $('[data-nombre]');
let pendienteBarra = false;
const revisarBarra = () => { pendienteBarra = false; barra.classList.toggle('visible', marcaBarra.getBoundingClientRect().bottom < 0); };
addEventListener('scroll', () => { if (!pendienteBarra) { pendienteBarra = true; requestAnimationFrame(revisarBarra); } }, { passive: true });
revisarBarra();

// Relacionados
const rel = Object.entries(EQUIPOS).filter(([k, e]) => e.linea === eq.linea && k !== id).slice(0, 5);
const otros = rel.length < 3 ? Object.entries(EQUIPOS).filter(([k, e]) => k !== id && e.linea !== eq.linea).slice(0, 4 - rel.length) : [];
$('[data-relacionados]').innerHTML = [...rel, ...otros].map(([k, e], i) => `<li><span class="mono">${e.tag}-${String(i + 1).padStart(2, '0')}</span><a href="equipo.html?e=${k}">${e.nombre}</a><span class="cap">${e.capacidad}</span></li>`).join('');

// Video del proceso (vertical, de muestra) o banda de video de referencia
if (ficha.proceso) {
  const p = ficha.proceso, b = $('[data-bloque-proceso]'); b.hidden = false;
  $('[data-proceso-titulo]').textContent = p.titulo;
  $('[data-proceso-texto]').textContent = p.texto;
  $('[data-proceso-pasos]').innerHTML = p.pasos.map(([t, d], i) => `<li><span class="mono">${String(i + 1).padStart(2, '0')}</span><strong>${t}</strong><p>${d}</p></li>`).join('');
  if (p.credito) $('[data-bloque-proceso] .credito').textContent = p.credito;
  const v = $('[data-proceso-video]'); v.poster =`assets/img/posters/${p.video}.jpg`; v.innerHTML = `<source src="assets/video/${p.video}.mp4" type="video/mp4">`;
} else if (ficha.video) {
  const b = $('[data-bloque-video]'); b.hidden = false;
  const v = $('video', b); v.poster = `assets/img/posters/${ficha.video}.jpg`; v.innerHTML = `<source src="assets/video/${ficha.video}.mp4" type="video/mp4">`;
}
const caso = MOSTRAR_CASOS && CASOS.find((c) => c.id === ficha.caso);
if (caso) {
  $('[data-bloque-caso]').hidden = false;
  $('[data-caso]').innerHTML = `<article class="expediente expediente--grande revela" style="grid-column:1/-1"><div class="expediente__cabeza"><span>${caso.proyecto}</span><span>${caso.lugar}</span><span>${caso.producto}</span></div><span class="sello">Caso de muestra</span><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))"><div class="visor" style="aspect-ratio:auto;min-height:300px"><video data-autoplay muted loop playsinline preload="none" poster="assets/img/posters/${caso.video}.jpg"><source src="assets/video/${caso.video}.mp4" type="video/mp4"></video><span class="credito">Video de referencia · Pexels</span></div><div class="expediente__cuerpo"><h3>${caso.titulo}</h3><dl><dt>Reto</dt><dd>${caso.reto}</dd><dt>Solución</dt><dd>${caso.solucion}</dd></dl><div class="expediente__cifra"><strong>${caso.cifra}</strong><span>${caso.cifraTexto}</span></div></div></div></article>`;
}

// Visores
let visorA = null, visorB = null;
try {
  visorA = crearVisor($('#visor-a'), $('#capa-a'), { id, arrastrable: true });
  visorB = crearVisor($('#visor-b'), $('#capa-b'), { id, azimut: 0.6, elevacion: 0.28 });
} catch (e) {
  $('.visor-3d').insertAdjacentHTML('beforeend', '<p class="lead" style="position:absolute;inset:40% 24px auto">El modelo 3D no se pudo cargar en este navegador.</p>');
}

// Foto real (si Equinox la entregó): primera vista de la ficha
const fotos = FOTOS[id] || [];
const capaFoto = $('[data-foto]'), imgFoto = $('[data-foto-img]');
const verFoto = (i) => {
  imgFoto.src = fotos[i].src; imgFoto.alt = fotos[i].alt;
  $$('[data-foto-i]').forEach((x) => x.setAttribute('aria-pressed', Number(x.dataset.fotoI) === i));
};
const mostrarFoto = (si) => { capaFoto.hidden = !si; $('.visor-3d').classList.toggle('con-foto', si); };
if (fotos.length) {
  verFoto(0);
  if (fotos.length > 1) $('[data-foto-mini]').innerHTML = fotos.map((f, i) => `<button type="button" data-foto-i="${i}" aria-pressed="${i === 0}" aria-label="Foto ${i + 1} de ${fotos.length}"><img src="${f.src}" alt=""></button>`).join('');
  $('[data-foto-mini]').addEventListener('click', (e) => { const b = e.target.closest('[data-foto-i]'); if (b) verFoto(Number(b.dataset.fotoI)); });
}

// Vistas del visor principal
let autoplay = null;
const vistas = [...(fotos.length ? [['foto', 'Foto real']] : []), ['general', 'Vista general'], ['explosionada', 'Pieza por pieza'], ...(visorA?.cortable ? [['corte', 'En corte']] : []), ['funcionando', 'En funcionamiento']];
$('[data-vistas]').innerHTML = vistas.map(([k, t], i) => `<button type="button" data-vista="${k}" aria-pressed="${i === 0}">${t}</button>`).join('');
mostrarFoto(fotos.length > 0);
$('[data-vistas]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-vista]'); if (!b) return;
  $$('[data-vista]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  clearInterval(autoplay);
  mostrarFoto(b.dataset.vista === 'foto');
  if (b.dataset.vista === 'foto' || !visorA) return;
  if (b.dataset.vista === 'funcionando') {
    let i = 0; const ps = visorA.pasos;
    visorA.ir(ps[0]);
    autoplay = setInterval(() => { i = (i + 1) % ps.length; visorA.ir(ps[i]); }, 5200);
  } else visorA.ir(b.dataset.vista);
});
visorA?.ir('general');

// Pasos de funcionamiento (scroll)
const contPasos = $('[data-pasos-funciona]');
const listaPasos = [{ modo: 'explosionada', titulo: 'Pieza por pieza', texto: `${visorA ? visorA.partes.length : ''} piezas principales, numeradas. Así se ve lo que hay dentro antes de comprarlo.` },
  ...(visorB?.pasos || []).map((p) => ({ modo: p, titulo: ficha.pasos[p]?.[0] || p, texto: ficha.pasos[p]?.[1] || '' }))];
contPasos.innerHTML = listaPasos.map((p, i) => `<article class="paso-3d" data-modo="${p.modo}"><span class="mono">${String(i + 1).padStart(2, '0')} · ${i === 0 ? 'Vista explosionada' : 'Funcionamiento'}</span><h3>${p.titulo}</h3><p>${p.texto}</p></article>`).join('')
  + `<article class="paso-3d" data-modo="general"><span class="mono">Listo</span><h3>¿Te sirve para tu planta?</h3><p>Cotízalo con la capacidad que necesitas o agrégalo a tu planta y mira cómo encaja con el resto de la línea.</p><p class="cajetin__acciones" style="margin-top:18px"><a class="btn" href="index.html#cotizar" data-cotizar>Cotizar <span class="btn__ico">${ICO('arrow-right')}</span></a><a class="enlace" href="planta.html" data-a-planta>Agregar a mi planta</a></p></article>`;
if (visorB) {
  visorB.ir('explosionada');
  const { ScrollTrigger, gsap } = window;
  if (gsap && ScrollTrigger && !reducido) {
    gsap.registerPlugin(ScrollTrigger);
    $$('[data-modo]', contPasos).forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 62%', end: 'bottom 38%', onToggle: (s) => s.isActive && visorB.ir(el.dataset.modo) }));
  } else {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && visorB.ir(e.target.dataset.modo)), { threshold: 0.6 });
    $$('[data-modo]', contPasos).forEach((el) => io.observe(el));
  }
}

// Capacidad seleccionada
function pintar() {
  const t = ficha.tabla(cap);
  $('[data-placa]').innerHTML = [['Capacidad', capTexto(cap)], [ficha.comunes[0][0], ficha.comunes[0][1].replace('Acero inoxidable ', '')], ...t.slice(0, 2)].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $$('[data-col]', tabla).forEach((c) => c.classList.toggle('col-activa', Number(c.dataset.col) === cap));
  $$('[data-cap-texto]').forEach((el) => { el.textContent = capTexto(cap); });
  $$('[data-cotizar]').forEach((a) => { a.href = `index.html?equipo=${id}&cap=${cap}#cotizar`; });
  $$('[data-a-planta]').forEach((a) => { a.href = `planta.html?agregar=${id}&cap=${cap}`; });
  const texto = `Hola, Equinox. Quiero cotizar: ${eq.nombre}, ${capTexto(cap)}.`;
  $$('[data-wa]').forEach((a) => { a.href = `https://wa.me/${numeroWhatsApp()}?text=${encodeURIComponent(texto)}`; });
  const s = ficha.escala(cap);
  visorA?.escalar(s); visorB?.escalar(s);
}
chips.addEventListener('change', (e) => { cap = Number(e.target.value); pintar(); });
pintar();

// PDF
const aviso = $('[data-aviso]');
const avisar = (t) => { aviso.textContent = t; aviso.hidden = false; clearTimeout(avisar.t); avisar.t = setTimeout(() => { aviso.hidden = true; }, 3600); };
$$('[data-pdf]').forEach((b) => b.addEventListener('click', async () => {
  if (!visorA) return;
  $$('[data-pdf]').forEach((x) => { x.disabled = true; $('[data-pdf-texto]', x).textContent = 'Preparando PDF…'; });
  try {
    const { fichaPDF } = await import('./pdf.js');
    const general = visorA.capturar('general');
    const explosion = visorA.capturar('explosionada');
    const d = new Date();
    await fichaPDF({ eq, ficha, cap, unidad: ficha.unidad, general, explosion, foto: fotos[0]?.src, fecha: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` });
    registrar('descargar_pdf', { tipo: 'ficha', equipo: id });
    avisar('Ficha técnica descargada.');
  } catch (err) {
    console.error(err);
    avisar('No se pudo generar el PDF en este navegador.');
  } finally {
    $$('[data-pdf]').forEach((x, i) => { x.disabled = false; $('[data-pdf-texto]', x).textContent = i ? 'Descargar ficha técnica' : 'Ficha técnica en PDF'; });
  }
}));

// Plano de disposición general
$$('[data-plano]').forEach((b) => b.addEventListener('click', async () => {
  $$('[data-plano]').forEach((x) => { x.disabled = true; $('[data-plano-texto]', x).textContent = 'Preparando plano…'; });
  try {
    const { planoPDF } = await import('./pdf.js');
    const d = new Date();
    await planoPDF({ id, cap, fecha: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` });
    registrar('descargar_pdf', { tipo: 'plano', equipo: id });
    avisar('Plano descargado.');
  } catch (err) {
    console.error(err);
    avisar('No se pudo generar el plano en este navegador.');
  } finally {
    $$('[data-plano]').forEach((x) => { x.disabled = false; $('[data-plano-texto]', x).textContent = 'Plano en PDF'; });
  }
}));

// Revelado y videos
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.revela').forEach((el) => io.observe(el));
const ioV = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { if (!reducido) e.target.play().catch(() => {}); } else e.target.pause(); }), { threshold: 0.35 });
$$('video[data-autoplay]').forEach((v) => ioV.observe(v));
