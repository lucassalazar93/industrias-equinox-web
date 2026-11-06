// Página Equipos: una lámina por línea de proceso, índice fijo y regreso desde la ficha.
// La ficha vuelve aquí con #eq-<id> (o por historial) para caer en el mismo equipo.
import { EQUIPOS, LINEAS, ORDEN_EQUIPOS, imagenEquipo } from './data.js';

document.documentElement.classList.remove('sin-js');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ICO = (n) => `<svg aria-hidden="true"><use href="assets/img/iconos.svg#i-${n}"/></svg>`;
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hashInicial = location.hash;

// Qué agrupa cada línea (texto de catálogo, sin cifras de desempeño)
const DESCRIPCION = {
  quesos: 'Del cuajado al prensado: tinas, hiladora, formadora, prensa neumática, moldes y carro para moldes.',
  proceso: 'Pasteurizador a placas, marmita multiprocesos y tanque de mezcla para tratar y preparar la leche.',
  frio: 'Tanques para enfriar la leche en la finca y conservarla en la planta.',
  fermentados: 'Tanque de fermentación para yogur y kumis.',
  mantequilla: 'Mantequillera y marmita volcable para batir crema y cocinar dulces de leche.',
  implementos: 'Mesón y canastilla en acero inoxidable para el trabajo diario de la planta.',
};

// Menú móvil
const boton = $('.nav__menu'), menu = $('#menu-movil');
const cerrar = () => { boton.setAttribute('aria-expanded', 'false'); menu.classList.remove('abierto'); setTimeout(() => { menu.hidden = true; }, 400); };
boton.addEventListener('click', () => { if (boton.getAttribute('aria-expanded') === 'true') return cerrar(); menu.hidden = false; requestAnimationFrame(() => menu.classList.add('abierto')); boton.setAttribute('aria-expanded', 'true'); });
$$('a', menu).forEach((a) => a.addEventListener('click', cerrar));

// Láminas
const lineas = LINEAS.map((l) => ({ ...l, ids: ORDEN_EQUIPOS.filter((id) => EQUIPOS[id].linea === l.id) })).filter((l) => l.ids.length);
$('[data-cifras]').textContent = `${ORDEN_EQUIPOS.length} equipos · ${lineas.length} líneas`;
$('[data-indice-lineas]').innerHTML = lineas.map((l) => `<li><a href="#linea-${l.id}" data-indice="${l.id}"><span>${l.nombre}</span><span class="mono">${l.ids.length}</span></a></li>`).join('');

const celda = (id) => {
  const eq = EQUIPOS[id], img = imagenEquipo(id);
  return `<li class="eq" id="eq-${id}">
    <a class="eq__enlace" href="equipo.html?e=${id}" data-ir="${id}">
      <span class="eq__img${img.real ? ' eq__img--foto' : ''}"><img src="${img.src}" alt="" loading="lazy" decoding="async"></span>
      <span class="eq__datos">
        <span class="eq__codigo mono">${eq.tag}${img.real ? ' · Foto real' : ''}</span>
        <span class="eq__nombre">${eq.nombre}</span>
      </span>
      <span class="eq__cap mono">${eq.capacidad}</span>
      <span class="eq__ver">Ver ficha ${ICO('arrow-right')}</span>
    </a>
    <button type="button" class="eq__cot" data-agregar="${id}" aria-pressed="false"></button>
  </li>`;
};
$('[data-laminas]').innerHTML = lineas.map((l) => `
  <section class="lamina-linea" id="linea-${l.id}" aria-labelledby="titulo-${l.id}">
    <div class="lamina-linea__cabeza">
      <h2 id="titulo-${l.id}">${l.nombre}</h2>
      <p>${DESCRIPCION[l.id] || ''}</p>
      <span class="mono">${l.ids.length} ${l.ids.length === 1 ? 'equipo' : 'equipos'}</span>
    </div>
    <ul class="lamina-linea__lista">${l.ids.map(celda).join('')}</ul>
  </section>`).join('');

// Cotización (misma clave que la portada y la ficha)
const enCot = new Set(leer('eqx-cotizacion', []));
function pintarCotizacion() {
  $$('[data-contador]').forEach((el) => { $('.mono', el).textContent = enCot.size; el.classList.toggle('con-items', enCot.size > 0); });
  $$('[data-agregar]').forEach((b) => {
    const on = enCot.has(b.dataset.agregar), nombre = EQUIPOS[b.dataset.agregar].nombre;
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', on ? `${nombre}: en la cotización. Quitar` : `Agregar ${nombre} a la cotización`);
    b.title = on ? 'En la cotización' : 'Agregar a la cotización';
    b.innerHTML = ICO(on ? 'check' : 'plus');
  });
}
pintarCotizacion();
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-agregar]'); if (!b) return;
  const id = b.dataset.agregar;
  enCot.has(id) ? enCot.delete(id) : enCot.add(id);
  guardar('eqx-cotizacion', [...enCot]);
  pintarCotizacion();
});

// Índice: marca la línea en pantalla y la mantiene visible en la barra móvil
const indices = $$('[data-indice]'), secciones = $$('.lamina-linea');
let activa = null, pendiente = false;
function marcarActiva() {
  pendiente = false;
  const corte = innerHeight * 0.32;
  let actual = secciones[0];
  secciones.forEach((s) => { if (s.getBoundingClientRect().top <= corte) actual = s; });
  if (actual === activa) return;
  activa = actual;
  const id = actual.id.replace('linea-', '');
  indices.forEach((a) => { const on = a.dataset.indice === id; a.classList.toggle('activo', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  const chip = indices.find((a) => a.dataset.indice === id), barra = chip?.closest('ul');
  if (barra && barra.scrollWidth > barra.clientWidth) barra.scrollTo({ left: chip.offsetLeft - 16, behavior: reducido ? 'auto' : 'smooth' });
}
addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(marcarActiva); } }, { passive: true });
marcarActiva();

// Al entrar a una ficha, recordar a dónde volver
$('[data-laminas]').addEventListener('click', (e) => {
  if (!e.target.closest('[data-ir]')) return;
  try { sessionStorage.setItem('eqx-volver', JSON.stringify({ url: 'equipos.html', etiqueta: 'Volver a equipos' })); } catch { /* sin almacenamiento */ }
});

// Llegada: desde la ficha (#eq-<id>) cae en el equipo y lo marca; enlaces viejos con ?linea= van a esa lámina
const destino = /^#eq-[A-Za-z]+$/.test(hashInicial) && $(hashInicial);
const lineaVieja = new URLSearchParams(location.search).get('linea');
if (destino) {
  history.replaceState(null, '', location.pathname);
  requestAnimationFrame(() => {
    const r = destino.getBoundingClientRect();
    window.scrollTo({ top: r.top + scrollY - Math.max(120, (innerHeight - r.height) / 2), behavior: 'instant' });
    destino.classList.add('eq--vista');
    $('a', destino).focus({ preventScroll: true });
    setTimeout(() => destino.classList.remove('eq--vista'), 2600);
  });
} else if (/^#linea-[a-z]+$/.test(hashInicial) && $(hashInicial)) {
  // Desde el adelanto de la portada: cae en la lámina de esa línea (se dibuja con JS, el navegador no alcanza a saltar solo)
  requestAnimationFrame(() => $(hashInicial).scrollIntoView({ behavior: 'instant' }));
} else if (lineaVieja && $(`#linea-${lineaVieja}`)) {
  history.replaceState(null, '', `${location.pathname}#linea-${lineaVieja}`);
  requestAnimationFrame(() => $(`#linea-${lineaVieja}`).scrollIntoView({ behavior: 'instant' }));
}
