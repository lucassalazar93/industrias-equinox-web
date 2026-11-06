// Modo claro / oscuro: lo elige la persona con el botón del menú y se recuerda en este navegador.
// El <head> de cada página pone data-tema antes de pintar (sin parpadeo); aquí se maneja el botón
// y se avisa a las escenas 3D con el evento 'eqx:tema'. Sin elección guardada, el sitio arranca en claro.
const raiz = document.documentElement;
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const temaActual = () => (raiz.dataset.tema === 'oscuro' ? 'oscuro' : 'claro');

function pintarBotones(t) {
  const oscuro = t === 'oscuro';
  document.querySelectorAll('[data-tema-boton]').forEach((b) => {
    b.setAttribute('aria-pressed', oscuro);
    b.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    b.title = oscuro ? 'Modo claro' : 'Modo oscuro';
    b.querySelector('use')?.setAttribute('href', `assets/img/iconos.svg#i-${oscuro ? 'sun' : 'moon'}`);
  });
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#0a1033' : '#edf0f4');
}

function aplicar(t) {
  raiz.dataset.tema = t;
  try { localStorage.setItem('eqx-tema', t); } catch { /* sin almacenamiento */ }
  pintarBotones(t);
  document.dispatchEvent(new CustomEvent('eqx:tema', { detail: { tema: t } }));
}

pintarBotones(temaActual());
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tema-boton]'); if (!b) return;
  if (!reducido) raiz.classList.add('cambiando-tema');
  aplicar(temaActual() === 'oscuro' ? 'claro' : 'oscuro');
  setTimeout(() => raiz.classList.remove('cambiando-tema'), 450);
});
