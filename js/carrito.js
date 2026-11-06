// Carrito de la cotización: al tocar el carrito del menú se ven los equipos elegidos, se pueden quitar
// y se pasa a cotizarlos. La lista vive en localStorage (eqx-cotizacion), la misma que usan la portada,
// Equipos y Arma tu planta. Al cambiarla avisa con el evento "eqx:cotizacion" para que cada página se ponga al día.
import { EQUIPOS, imagenEquipo, pintarContador } from './data.js';

const CLAVE = 'eqx-cotizacion';
const boton = document.querySelector('[data-carrito]');
const enPortada = !!document.getElementById('cotizar');
const enEquipos = /equipos\.html$/.test(location.pathname);
const ICO = (n) => `<svg aria-hidden="true"><use href="assets/img/iconos.svg#i-${n}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function leer() {
  try { return (JSON.parse(localStorage.getItem(CLAVE)) || []).filter((id) => EQUIPOS[id]); } catch { return []; }
}
function guardar(ids) {
  try { localStorage.setItem(CLAVE, JSON.stringify(ids)); } catch { /* sin almacenamiento */ }
  pintarContador(ids.length);
  document.dispatchEvent(new CustomEvent('eqx:cotizacion', { detail: ids }));
}

if (boton) {
  const panel = document.createElement('section');
  panel.className = 'carrito';
  panel.id = 'carrito-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'carrito-titulo');
  document.body.append(panel);

  const pintar = () => {
    const ids = leer(), n = ids.length;
    const cabeza = `<header class="carrito__cabeza">
      <div><span class="rotulo">Tu cotización</span><strong id="carrito-titulo" tabindex="-1">${n ? `${n} ${n === 1 ? 'equipo elegido' : 'equipos elegidos'}` : 'Aún no hay equipos'}</strong></div>
      <button type="button" class="carrito__cerrar" data-carrito-cerrar aria-label="Cerrar">${ICO('x')}</button>
    </header>`;
    const seguir = enEquipos
      ? '<button type="button" class="enlace enlace--boton carrito__seguir" data-carrito-cerrar>Seguir viendo equipos</button>'
      : '<a class="enlace carrito__seguir" href="equipos.html">Seguir viendo equipos</a>';
    if (!n) {
      panel.innerHTML = `${cabeza}<div class="carrito__vacio">
        <p>Agrega equipos con el botón <b>+</b> del catálogo o con <b>Cotizar esta línea</b> en la portada.</p>
        ${enEquipos ? '' : `<a class="btn" href="equipos.html">Ver los 19 equipos <span class="btn__ico">${ICO('arrow-right')}</span></a>`}
      </div>`;
      return;
    }
    const filas = ids.map((id) => {
      const eq = EQUIPOS[id];
      return `<li>
        <a class="carrito__equipo" href="equipo.html?e=${id}">
          <img src="${imagenEquipo(id).src}" alt="" width="64" height="50" loading="lazy" decoding="async">
          <span><span class="mono">${eq.tag}</span><strong>${esc(eq.nombre)}</strong><small class="mono">${esc(eq.capacidad)}</small></span>
        </a>
        <button type="button" class="carrito__quitar" data-quitar="${id}" aria-label="Quitar ${esc(eq.nombre)} de la cotización" title="Quitar">${ICO('x')}</button>
      </li>`;
    }).join('');
    panel.innerHTML = `${cabeza}<ul class="carrito__lista">${filas}</ul>
      <div class="carrito__pie">
        <p class="carrito__nota">Un ingeniero de Equinox ajusta capacidades y cantidades en la propuesta.</p>
        <a class="btn carrito__cotizar" href="${enPortada ? '#cotizar' : 'index.html#cotizar'}" data-carrito-ir>Cotizar ${n === 1 ? 'este equipo' : `estos ${n} equipos`} <span class="btn__ico">${ICO('arrow-right')}</span></a>
        ${document.querySelector('.asistente') ? `<button type="button" class="btn btn--claro carrito__wa" data-asistente-abrir="carrito" data-carrito-asistente>O por WhatsApp, con el asistente <span class="btn__ico">${ICO('whatsapp-logo')}</span></button>` : ''}
        <div class="carrito__mas">${seguir}<button type="button" class="carrito__vaciar" data-vaciar>Vaciar</button></div>
      </div>`;
  };

  let abierto = false;
  const abrir = () => {
    pintar();
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('abierto'));
    boton.setAttribute('aria-expanded', 'true');
    abierto = true;
    panel.querySelector('#carrito-titulo').focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('eqx:carrito-abierto')); // el saludo del asistente se recoge para no taparlo
  };
  const cerrar = ({ devolverFoco = true } = {}) => {
    if (!abierto) return;
    abierto = false;
    panel.classList.remove('abierto');
    boton.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!abierto) panel.hidden = true; }, 220);
    if (devolverFoco) boton.focus({ preventScroll: true });
  };

  boton.addEventListener('click', (e) => { e.preventDefault(); if (abierto) cerrar(); else abrir(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierto) cerrar(); });
  document.addEventListener('pointerdown', (e) => {
    if (abierto && !panel.contains(e.target) && !boton.contains(e.target)) cerrar({ devolverFoco: false });
  });

  panel.addEventListener('click', (e) => {
    const quitar = e.target.closest('[data-quitar]');
    if (quitar) {
      const pos = [...panel.querySelectorAll('[data-quitar]')].indexOf(quitar);
      const ids = leer().filter((id) => id !== quitar.dataset.quitar);
      guardar(ids);
      pintar();
      // El foco pasa al siguiente equipo de la lista (o al título si ya no queda ninguno)
      const botones = panel.querySelectorAll('[data-quitar]');
      (botones[Math.min(pos, botones.length - 1)] || panel.querySelector('#carrito-titulo')).focus();
      return;
    }
    const vaciar = e.target.closest('[data-vaciar]');
    if (vaciar) {
      // Pide un segundo toque para no vaciar por accidente
      if (!vaciar.dataset.seguro) {
        vaciar.dataset.seguro = '1';
        vaciar.textContent = '¿Vaciar todo? Toca otra vez';
        setTimeout(() => { if (vaciar.isConnected) { delete vaciar.dataset.seguro; vaciar.textContent = 'Vaciar'; } }, 3500);
        return;
      }
      guardar([]);
      pintar();
      panel.querySelector('#carrito-titulo').focus();
      return;
    }
    if (e.target.closest('[data-carrito-cerrar]')) { cerrar(); return; }
    // El asistente (js/asistente.js) abre con la intención "carrito": cotizar estos equipos conversando
    if (e.target.closest('[data-carrito-asistente]')) { cerrar({ devolverFoco: false }); return; }
    if (e.target.closest('[data-carrito-ir]') && enPortada) cerrar({ devolverFoco: false });
  });
}
