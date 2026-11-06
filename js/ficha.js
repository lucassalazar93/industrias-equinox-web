import { EQUIPOS, CASOS, numeroWhatsApp, pintarContador } from './data.js';
import { crearTanque } from './tank3d.js';

document.documentElement.classList.remove('sin-js');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

// Menú y contador
const boton = $('.nav__menu'), menu = $('#menu-movil');
const cerrar = () => { boton.setAttribute('aria-expanded', 'false'); menu.classList.remove('abierto'); setTimeout(() => { menu.hidden = true; }, 400); };
boton.addEventListener('click', () => {
  if (boton.getAttribute('aria-expanded') === 'true') return cerrar();
  menu.hidden = false; requestAnimationFrame(() => menu.classList.add('abierto')); boton.setAttribute('aria-expanded', 'true');
});
$$('a', menu).forEach((a) => a.addEventListener('click', cerrar));
pintarContador(leer('eqx-cotizacion', []).length);

// Medidas de muestra: cilindro con altura de líquido ≈ diámetro
const CAPACIDADES = [300, 500, 1000, 1500, 2000];
const medidas = (L) => {
  const d = Math.cbrt((4 * (L / 1000)) / Math.PI);
  return { d, h: d + 0.65, peso: Math.round((L * 0.12 + 60) / 5) * 5 };
};
let cap = 1000;

const placa = $('[data-placa]');
const tabla = $('[data-tabla-spec]');
tabla.insertAdjacentHTML('beforeend', `<thead><tr><th scope="col">Capacidad nominal</th>${CAPACIDADES.map((c) => `<th scope="col" data-col="${c}">${fmt(c)} L</th>`).join('')}</tr></thead>
<tbody>
  <tr><th scope="row">Diámetro interno aprox.</th>${CAPACIDADES.map((c) => `<td data-col="${c}">${fmt(medidas(c).d, 2)} m</td>`).join('')}</tr>
  <tr><th scope="row">Altura total aprox.</th>${CAPACIDADES.map((c) => `<td data-col="${c}">${fmt(medidas(c).h, 2)} m</td>`).join('')}</tr>
  <tr><th scope="row">Peso vacío aprox.</th>${CAPACIDADES.map((c) => `<td data-col="${c}">${fmt(medidas(c).peso)} kg</td>`).join('')}</tr>
  <tr><th scope="row">Recolección típica</th>${CAPACIDADES.map((c) => `<td data-col="${c}">${c <= 500 ? 'Diaria' : 'Cada 1 a 2 días'}</td>`).join('')}</tr>
</tbody>`);

const chips = $('[data-capacidades]');
chips.innerHTML = CAPACIDADES.map((c) => `<label class="chip"><input type="radio" name="cap" value="${c}" ${c === cap ? 'checked' : ''}><span>${fmt(c)} L</span></label>`).join('');

let tanque;
function pintar() {
  const m = medidas(cap);
  placa.innerHTML = `
    <div><dt>Capacidad nominal</dt><dd>${fmt(cap)} L</dd></div>
    <div><dt>Material</dt><dd>AISI 304</dd></div>
    <div><dt>Diámetro interno</dt><dd>≈ ${fmt(m.d, 2)} m</dd></div>
    <div><dt>Altura total</dt><dd>≈ ${fmt(m.h, 2)} m</dd></div>`;
  $$('[data-col]', tabla).forEach((c) => c.classList.toggle('col-activa', Number(c.dataset.col) === cap));
  $$('[data-cap-texto]').forEach((el) => { el.textContent = `${fmt(cap)} L`; });
  $$('[data-cotizar]').forEach((a) => { a.href = `index.html?equipo=enfriamiento&cap=${cap}#cotizar`; });
  const texto = `Hola, Equinox. Quiero cotizar un tanque de enfriamiento de leche de ${fmt(cap)} litros.`;
  $$('[data-wa]').forEach((a) => { a.href = `https://wa.me/${numeroWhatsApp()}?text=${encodeURIComponent(texto)}`; });
  tanque?.escalar(0.78 + ((cap - 300) / 1700) * 0.3);
}
chips.addEventListener('change', (e) => { cap = Number(e.target.value); pintar(); });
$('[data-imprimir]').addEventListener('click', () => window.print());

// 3D
try {
  tanque = crearTanque($('#tanque-ficha'), $('#anotaciones-ficha'), {
    arrastrable: true,
    pasos: {
      acero: { cam: [5.4, 2.9, 6.4], objetivo: [0, 1.1, 0], giro: 0.1, foco: 'tablero', mostrar: ['patas'] },
      corte: { cam: [4.9, 2.7, 5.8], objetivo: [0, 1.15, 0], corte: 1, foco: 'pared' },
      agitador: { cam: [4.1, 4.4, 4.9], objetivo: [0, 1.35, 0], corte: 1, foco: 'agitador' },
      tapa: { cam: [5.2, 3.3, 6.2], objetivo: [0, 1.0, 0], foco: 'tapa', mostrar: ['valvula', 'patas'] },
    },
  });
  tanque.ir('acero');
} catch {
  $('.visor-3d').innerHTML = '<p class="lead" style="padding:30% 24px">El modelo 3D no se pudo cargar en este navegador.</p>';
}
$$('[data-vista]').forEach((b) => b.addEventListener('click', () => {
  $$('[data-vista]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  tanque?.ir(b.dataset.vista);
}));
pintar();

// Caso relacionado y equipos relacionados
const c = CASOS.find((x) => x.id === 'acopio');
$('[data-caso-ficha]').innerHTML = `
  <article class="expediente expediente--grande revela" style="grid-column:1/-1">
    <div class="expediente__cabeza"><span>${c.proyecto}</span><span>${c.lugar}</span><span>${c.producto}</span></div>
    <span class="sello">Caso de muestra</span>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))">
      <div class="visor" style="aspect-ratio:auto;min-height:320px"><video data-autoplay muted loop playsinline preload="none" poster="assets/img/posters/${c.video}.jpg"><source src="assets/video/${c.video}.mp4" type="video/mp4"></video><span class="credito">Video de referencia · Pexels</span></div>
      <div class="expediente__cuerpo"><h3>${c.titulo}</h3><dl><dt>Reto</dt><dd>${c.reto}</dd><dt>Solución</dt><dd>${c.solucion}</dd></dl><div class="expediente__cifra"><strong>${c.cifra}</strong><span>${c.cifraTexto}</span></div></div>
    </div>
  </article>`;
$('[data-relacionados]').innerHTML = ['almacenamiento', 'pasteurizador', 'tina', 'mantequillera'].map((id, i) => {
  const eq = EQUIPOS[id];
  return `<li><span class="mono">${eq.tag}-${String(i + 1).padStart(2, '0')}</span><a href="index.html#equipos">${eq.nombre}</a><span class="cap">${eq.capacidad}</span></li>`;
}).join('');

// Revelado y videos
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.revela').forEach((el) => io.observe(el));
const ioV = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { if (!reducido) e.target.play().catch(() => {}); } else e.target.pause(); }), { threshold: 0.35 });
$$('video[data-autoplay]').forEach((v) => ioV.observe(v));
