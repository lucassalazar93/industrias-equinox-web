// Gráficas del panel de ventas: SVG hecho a mano, una sola serie por gráfica (sin leyenda), con tooltip al pasar
// el mouse o al enfocar con el teclado. Los colores salen de las variables de css/panel.css (modo claro y oscuro).
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, padre) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); padre?.append(n); return n; };

// ---------- tooltip compartido ----------
let tip;
function tooltip() {
  if (tip) return tip;
  tip = document.createElement('div');
  tip.className = 'pg-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.append(tip);
  return tip;
}
function mostrar(html, x, y) {
  const t = tooltip(); t.innerHTML = html; t.hidden = false;
  const r = t.getBoundingClientRect();
  const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2));
  const top = y - r.height - 12 < 8 ? y + 16 : y - r.height - 12;
  t.style.transform = `translate(${left}px, ${top}px)`;
}
const ocultar = () => { if (tip) tip.hidden = true; };
function interactivo(nodo, html) {
  nodo.setAttribute('tabindex', '0');
  nodo.setAttribute('role', 'img');
  nodo.addEventListener('pointerenter', (e) => mostrar(html, e.clientX, e.clientY));
  nodo.addEventListener('pointermove', (e) => mostrar(html, e.clientX, e.clientY));
  nodo.addEventListener('pointerleave', ocultar);
  nodo.addEventListener('focus', () => { const r = nodo.getBoundingClientRect(); mostrar(html, r.left + r.width / 2, r.top); });
  nodo.addEventListener('blur', ocultar);
}
window.addEventListener('scroll', ocultar, { passive: true });

// Escala "bonita" para el eje: 0 … tope con 4 divisiones
function escala(max) {
  if (max <= 0) return { tope: 4, paso: 1 };
  const bruto = max / 4, pot = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto);
  return { tope: paso * 4, paso };
}
// Barra con el extremo de datos redondeado (4 px) y la base recta
function barra(padre, x, y, w, h, clase) {
  const r = Math.min(4, w / 2, h);
  const d = h <= 0 ? '' : `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  return el('path', { d, class: clase }, padre);
}

// ---------- barras verticales (por mes) ----------
// datos: [{ etiqueta, valor, tip }], opciones: { formato, resaltarUltimo, alto }
export function barras(contenedor, datos, { formato = String, resaltarUltimo = true, alto = 220, titulo = '' } = {}) {
  contenedor.replaceChildren();
  const ancho = Math.max(320, contenedor.clientWidth || 560);
  const m = { t: 14, r: 8, b: 28, l: 52 };
  const svg = el('svg', { viewBox: `0 0 ${ancho} ${alto}`, width: '100%', height: alto, class: 'pg', 'aria-label': titulo }, contenedor);
  const { tope, paso } = escala(Math.max(...datos.map((d) => d.valor), 0));
  const ih = alto - m.t - m.b, iw = ancho - m.l - m.r;
  for (let v = 0; v <= tope + 1e-9; v += paso) {
    const y = m.t + ih - (v / tope) * ih;
    el('line', { x1: m.l, x2: ancho - m.r, y1: y, y2: y, class: v === 0 ? 'pg-base' : 'pg-rejilla' }, svg);
    el('text', { x: m.l - 10, y: y + 4, class: 'pg-eje', 'text-anchor': 'end' }, svg).textContent = formato(v, true);
  }
  const banda = iw / datos.length, w = Math.min(46, banda * 0.62);
  datos.forEach((d, i) => {
    const h = (d.valor / tope) * ih, x = m.l + i * banda + (banda - w) / 2, y = m.t + ih - h;
    const g = el('g', { class: 'pg-item', 'aria-label': `${d.etiqueta}: ${formato(d.valor)}` }, svg);
    el('rect', { x: m.l + i * banda, y: m.t, width: banda, height: ih, class: 'pg-zona' }, g);
    barra(g, x, y, w, h, resaltarUltimo && i === datos.length - 1 ? 'pg-barra pg-barra--actual' : 'pg-barra');
    el('text', { x: x + w / 2, y: alto - 8, class: 'pg-eje', 'text-anchor': 'middle' }, svg).textContent = d.etiqueta;
    if (d.valor > 0 && datos.length <= 8) el('text', { x: x + w / 2, y: y - 6, class: 'pg-valor', 'text-anchor': 'middle' }, g).textContent = formato(d.valor, true);
    interactivo(g, d.tip || `<b>${d.etiqueta}</b><span>${formato(d.valor)}</span>`);
  });
}

// ---------- barras horizontales (fuentes, motivos, equipos) ----------
// datos: [{ etiqueta, valor, tip, sub }]
export function barrasH(contenedor, datos, { formato = String, titulo = '' } = {}) {
  contenedor.replaceChildren();
  const fila = 34, ancho = Math.max(300, contenedor.clientWidth || 420);
  const alto = datos.length * fila + 6;
  const etq = Math.min(168, ancho * 0.4), val = 70;
  const maxC = Math.floor(etq / 6.6);
  const recorte = (t) => (t.length > maxC ? `${t.slice(0, maxC - 1).trimEnd()}…` : t);
  const svg = el('svg', { viewBox: `0 0 ${ancho} ${alto}`, width: '100%', height: alto, class: 'pg', 'aria-label': titulo }, contenedor);
  const max = Math.max(...datos.map((d) => d.valor), 1);
  const iw = ancho - etq - val - 8;
  datos.forEach((d, i) => {
    const y = i * fila + 6, h = 16, w = Math.max(d.valor > 0 ? 3 : 0, (d.valor / max) * iw);
    const g = el('g', { class: 'pg-item', 'aria-label': `${d.etiqueta}: ${formato(d.valor)}` }, svg);
    el('rect', { x: 0, y: y - 6, width: ancho, height: fila, class: 'pg-zona' }, g);
    el('text', { x: 0, y: y + 12, class: 'pg-etq' }, g).textContent = recorte(d.etiqueta);
    el('rect', { x: etq, y, width: iw, height: h, rx: 3, class: 'pg-pista' }, g);
    const r = Math.min(4, w / 2);
    if (w > 0) el('path', { d: `M${etq},${y}H${etq + w - r}Q${etq + w},${y} ${etq + w},${y + r}V${y + h - r}Q${etq + w},${y + h} ${etq + w - r},${y + h}H${etq}Z`, class: 'pg-barra' }, g);
    el('text', { x: ancho, y: y + 12, class: 'pg-valor', 'text-anchor': 'end' }, g).textContent = formato(d.valor, true);
    interactivo(g, d.tip || `<b>${d.etiqueta}</b><span>${formato(d.valor)}</span>`);
  });
}

// ---------- embudo por etapa (HTML: se lee mejor y se adapta al ancho) ----------
// etapas: [{ id, nombre, n, valor }]; clic en una etapa → callback
export function embudo(contenedor, etapas, { alElegir, formatoValor = String } = {}) {
  contenedor.replaceChildren();
  const max = Math.max(...etapas.map((e) => e.n), 1);
  const lista = document.createElement('ol'); lista.className = 'embudo';
  etapas.forEach((e, i) => {
    const li = document.createElement('li');
    const previa = etapas[i - 1];
    const paso = previa && previa.n ? Math.round((e.n / previa.n) * 100) : null;
    li.innerHTML = `<button type="button" class="embudo__fila" data-etapa="${e.id}" aria-label="${e.nombre}: ${e.n} oportunidades${paso != null ? `, ${paso} % de ${previa.nombre}` : ''}. Ver en el tablero">
      <span class="embudo__nombre">${e.nombre}${paso != null ? `<small class="mono" title="Pasaron de ${previa.nombre} a ${e.nombre}">${paso} % pasa</small>` : '<small>&nbsp;</small>'}</span>
      <span class="embudo__pista"><span class="embudo__barra" style="--w:${Math.max(3, (e.n / max) * 100)}%"></span></span>
      <span class="embudo__n mono">${e.n}</span>
      <span class="embudo__valor mono">${formatoValor(e.valor)}</span>
    </button>`;
    li.querySelector('button').addEventListener('click', () => alElegir?.(e.id));
    lista.append(li);
  });
  contenedor.append(lista);
}

// ---------- minigráfica de tendencia (en las cifras) ----------
export function tendencia(valores, { ancho = 96, alto = 28 } = {}) {
  const max = Math.max(...valores, 1), min = Math.min(...valores, 0);
  const x = (i) => (i / Math.max(1, valores.length - 1)) * (ancho - 4) + 2;
  const y = (v) => alto - 3 - ((v - min) / Math.max(1e-9, max - min)) * (alto - 6);
  const puntos = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const u = valores.length - 1;
  return `<svg class="tendencia" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" aria-hidden="true"><polyline points="${puntos}"/><circle cx="${x(u)}" cy="${y(valores[u])}" r="3"/></svg>`;
}
