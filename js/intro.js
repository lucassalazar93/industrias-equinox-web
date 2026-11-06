// Entrada de la portada: la placa de identificación de Equinox.
// La placa llega a oscuras; un arco de soldadura se enciende, la ilumina y recorre la costura con chispas.
// El cordón se enfría con el tono de calor real del inoxidable (paja, dorado, morado, azul) y el logo
// aparece grabado a su paso. Luego la placa se pule, aparecen los campos grabados y el mensaje palabra
// por palabra; termina con "Entrar" y una barra que avanza sola. Al salir, la pantalla sube como persiana.
// Se ve una vez por visita (sessionStorage) o con ?intro=1; se omite con movimiento reducido.
const raiz = document.documentElement;
const intro = document.querySelector('[data-intro]');
if (intro && raiz.classList.contains('con-intro')) iniciar(); else intro?.remove();

function iniciar() {
  try { sessionStorage.setItem('eqx-intro', '1'); } catch { /* sin almacenamiento */ }
  const placa = intro.querySelector('[data-intro-placa]');
  const logo = intro.querySelector('[data-intro-logo]');
  const lienzo = intro.querySelector('[data-intro-lienzo]');
  const avance = intro.querySelector('[data-intro-avance]');
  const soldador = intro.querySelector('[data-intro-soldador]');
  const arco = intro.querySelector('[data-intro-arco]');
  const g = lienzo.getContext('2d');
  // Punta de la antorcha dentro de la imagen del robot soldador (fracción del ancho y del alto)
  const PUNTA = [0.578, 0.94];
  let rw = 0, rh = 0;
  // Tiempos en segundos
  // subir: la placa sube a su sitio; el mensaje aparece cuando ya llegó (frase), para que nunca se monte encima
  const T = { encender: 1.3, fin: 4.5, pulir: 4.6, subir: 5.1, frase: 6.25, final: 7.7, salir: 12.4 };
  let W = 0, H = 0, dpr = 1, costuraY = 0, x0 = 0, x1 = 0, logoX0 = 0, logoX1 = 1;
  function medir() {
    const r = placa.getBoundingClientRect(), l = logo.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const costura = intro.querySelector('.intro__costura').getBoundingClientRect();
    costuraY = costura.top - r.top + costura.height / 2;
    x0 = costura.left - r.left; x1 = costura.right - r.left;
    logoX0 = l.left - r.left; logoX1 = l.right - r.left;
    rw = soldador?.offsetWidth || 0; rh = soldador?.offsetHeight || 0;
    if (arco) { const d = Math.max(46, H * 0.24); arco.style.width = arco.style.height = `${d}px`; arco.style.margin = `${-d / 2}px 0 0 ${-d / 2}px`; }
    // Mientras se suelda, la placa queda en el centro de la pantalla; sube a su sitio cuando aparece el mensaje
    const texto = intro.querySelector('.intro__texto');
    const hueco = parseFloat(getComputedStyle(intro).rowGap) || 0;
    intro.style.setProperty('--bajar', `${((texto.offsetHeight + hueco) / 2).toFixed(1)}px`);
  }
  medir();
  addEventListener('resize', medir);

  const cordon = [];   // { x, nace }
  const chispas = [];  // { x, y, vx, vy, vida, total }
  let ultimoX = -1, t0 = 0, previo = 0, terminado = false, acumulado = 0;
  const marcas = new Set();
  const una = (nombre, fn) => { if (!marcas.has(nombre)) { marcas.add(nombre); fn(); } };

  // Tono de calor del acero inoxidable según los segundos desde que pasó el arco
  const TONOS = [[0, [255, 250, 228]], [0.15, [255, 214, 130]], [0.45, [240, 164, 64]], [0.85, [214, 168, 82]], [1.25, [174, 118, 64]], [1.7, [126, 92, 160]], [2.3, [82, 116, 184]], [3.4, [160, 172, 186]]];
  function tono(edad) {
    for (let i = 1; i < TONOS.length; i++) {
      if (edad <= TONOS[i][0]) {
        const [ta, a] = TONOS[i - 1], [tb, b] = TONOS[i], k = (edad - ta) / (tb - ta);
        return a.map((v, j) => Math.round(v + (b[j] - v) * k));
      }
    }
    return TONOS[TONOS.length - 1][1];
  }

  function cuadro(ahora) {
    if (terminado) return;
    if (!t0) t0 = ahora;
    const t = (ahora - t0) / 1000, dt = Math.min(0.05, (ahora - (previo || ahora)) / 1000);
    const previoReal = previo;
    // Las chispas envejecen con el reloj real: en equipos lentos (pocos cuadros por segundo) se apagan a tiempo
    const dtVida = Math.min(0.25, (ahora - (previoReal || ahora)) / 1000);
    previo = ahora;
    const p = Math.min(1, Math.max(0, (t - T.encender) / (T.fin - T.encender)));
    const soldando = p > 0 && p < 1;
    const x = x0 + (x1 - x0) * p;
    const titila = 0.78 + Math.random() * 0.22;

    if (t >= T.encender) una('encender', () => intro.classList.add('encendido'));

    // Luz: la placa está a oscuras y la ilumina el arco; con el pulido queda a plena luz
    const oscuro = t < T.pulir ? 1 : Math.max(0, 1 - (t - T.pulir) / 1.1);
    placa.style.setProperty('--oscuro', oscuro.toFixed(3));
    placa.style.setProperty('--ax', `${(soldando ? x : x1).toFixed(1)}px`);
    placa.style.setProperty('--ay', `${costuraY.toFixed(1)}px`);
    placa.style.setProperty('--radio', `${(t < T.encender ? 0 : W * (soldando ? 0.5 + 0.06 * titila : 0.55)).toFixed(1)}px`);

    // Robot soldador: llega desde arriba antes de encender, recorre la costura con la punta de la antorcha
    // en el arco (con un leve temblor de mano y la luz del arco encima) y se retira cuando termina
    if (soldador) {
      if (!rw) { rw = soldador.offsetWidth; rh = soldador.offsetHeight; }
      const suave = (k) => 1 - Math.pow(1 - k, 3);
      const llega = suave(Math.min(1, Math.max(0, (t - (T.encender - 0.8)) / 0.8)));
      const va = suave(Math.min(1, Math.max(0, (t - T.fin) / 0.75)));
      const xr = soldando ? x : (t < T.encender ? x0 : x1);
      const px = xr - PUNTA[0] * rw - (1 - llega) * 0.12 * rw + va * 0.25 * rw;
      const py = costuraY - PUNTA[1] * rh - (1 - llega) * 0.22 * rh - va * 0.3 * rh + (soldando ? Math.sin(t * 23) * 0.8 : 0);
      soldador.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
      soldador.style.opacity = (llega * (1 - va)).toFixed(3);
      soldador.style.setProperty('--luz', (soldando ? 0.95 + 0.2 * titila : t < T.encender ? 0.55 + 0.2 * llega : 0.95).toFixed(2));
    }
    if (arco) {
      arco.style.transform = `translate(${x.toFixed(1)}px, ${costuraY.toFixed(1)}px) scale(${(0.8 + 0.4 * titila).toFixed(2)})`;
      arco.style.opacity = soldando ? titila.toFixed(2) : '0';
    }

    // El logo se graba al paso del arco
    const pl = Math.min(1, Math.max(0, (x - logoX0) / (logoX1 - logoX0)));
    logo.style.clipPath = `inset(0 ${((1 - pl) * 100).toFixed(2)}% 0 0)`;

    if (soldando) {
      if (ultimoX < 0) ultimoX = x0;
      while (ultimoX < x) { ultimoX += 3.4; cordon.push({ x: ultimoX, nace: t }); }
      // Chispas por segundo (no por cuadro), para que la lluvia sea igual a 30 o a 144 Hz
      acumulado += 300 * Math.min(0.25, (ahora - (previoReal || ahora)) / 1000);
      const nuevas = Math.min(40, Math.floor(acumulado)); acumulado -= nuevas;
      for (let k = 0; k < nuevas; k++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.35) * 2.5;
        const v = 180 + Math.random() * 420;
        chispas.push({ x, y: costuraY, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida: 0, total: 0.35 + Math.random() * 0.7 });
      }
    }

    g.clearRect(0, 0, W, H);
    // Cordón: "monedas" superpuestas, de blanco incandescente a azul de revenido
    for (const d of cordon) {
      const [r, gg, b] = tono(Math.min(2.1, t - d.nace)); // queda en el azul violeta del revenido
      g.fillStyle = `rgb(${r},${gg},${b})`;
      g.beginPath(); g.ellipse(d.x, costuraY, 6.2, 4.3, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(40, 30, 20, 0.18)'; g.lineWidth = 0.8; g.stroke();
    }
    g.globalCompositeOperation = 'lighter';
    if (soldando) {
      let gr = g.createRadialGradient(x, costuraY, 0, x, costuraY, Math.max(W, H) * 0.6);
      gr.addColorStop(0, `rgba(170, 210, 255, ${0.34 * titila})`); gr.addColorStop(1, 'rgba(170, 210, 255, 0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const rn = 54 * titila;
      gr = g.createRadialGradient(x, costuraY, 0, x, costuraY, rn);
      gr.addColorStop(0, 'rgba(255, 255, 255, 1)'); gr.addColorStop(0.22, 'rgba(205, 232, 255, 0.95)'); gr.addColorStop(1, 'rgba(120, 180, 255, 0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, costuraY, rn, 0, Math.PI * 2); g.fill();
    }
    g.lineCap = 'round';
    for (let i = chispas.length - 1; i >= 0; i--) {
      const s = chispas[i];
      s.vida += dtVida; if (s.vida >= s.total) { chispas.splice(i, 1); continue; }
      s.vy += 980 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const k = 1 - s.vida / s.total;
      g.strokeStyle = `rgba(255, ${Math.round(150 + 100 * k)}, ${Math.round(60 * k)}, ${k})`;
      g.lineWidth = 1.2 + 1.3 * k;
      g.beginPath(); g.moveTo(s.x - s.vx * 0.032, s.y - s.vy * 0.032); g.lineTo(s.x, s.y); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';

    if (t > T.pulir) una('pulir', () => intro.classList.add('pulida'));
    if (t > T.subir) una('subir', () => intro.classList.add('sube'));
    if (t > T.frase) una('frase', () => intro.classList.add('con-texto'));
    if (t > T.final) una('final', () => {
      intro.classList.add('final');
      avance.style.transitionDuration = `${T.salir - T.final}s`;
      requestAnimationFrame(() => avance.classList.add('llena'));
    });
    if (t > T.salir) return salir();
    requestAnimationFrame(cuadro);
  }

  function salir(rapido = false) {
    if (terminado) return;
    terminado = true;
    if (rapido) intro.classList.add('rapida');
    intro.classList.add('sale');
    const quitar = () => {
      intro.remove();
      raiz.classList.remove('con-intro');
      removeEventListener('resize', medir);
      document.dispatchEvent(new CustomEvent('eqx:intro-fin'));
    };
    intro.addEventListener('transitionend', (e) => { if (e.target === intro) quitar(); }, { once: true });
    setTimeout(() => { if (intro.isConnected) quitar(); }, rapido ? 800 : 1600);
  }

  // Entrar o saltar: botones, clic, tecla o intento de desplazarse
  intro.querySelector('[data-intro-entrar]').addEventListener('click', (e) => { e.stopPropagation(); salir(); });
  intro.querySelector('[data-intro-saltar]').addEventListener('click', (e) => { e.stopPropagation(); salir(true); });
  intro.addEventListener('click', () => salir(!intro.classList.contains('final')));
  const porTecla = (e) => { if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return; removeEventListener('keydown', porTecla); salir(!intro.classList.contains('final')); };
  addEventListener('keydown', porTecla);
  addEventListener('wheel', () => salir(true), { once: true, passive: true });
  addEventListener('touchmove', () => salir(true), { once: true, passive: true });

  requestAnimationFrame(() => { intro.classList.add('entra'); requestAnimationFrame(cuadro); });
  setTimeout(() => salir(true), 16000); // respaldo si la pestaña queda en segundo plano
}
