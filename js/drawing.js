// Dibuja la línea de proceso como un plano técnico (SVG).
import { EQUIPOS } from './data.js';

const P = (d, extra = '') => `<path pathLength="1" d="${d}" ${extra}/>`;

// Símbolos con origen en el centro del piso (0,0); el equipo crece hacia y negativa.
const SIMBOLOS = {
  tanque: () => [
    P('M-34 0V-16M34 0V-16M-44 0H-24M24 0H44'),
    P('M-40 -18V-92A40 10 0 0 1 40 -92V-18A40 10 0 0 1 -40 -18Z'),
    P('M-40 -92A40 10 0 0 0 40 -92', 'class="fino"'),
    P('M-9 -102H9V-114H-9Z M0 -102V-40 M-14 -40H14', 'class="fino"'),
    P('M40 -26H56'),
  ],
  silo: () => [
    P('M-24 0V-20M24 0V-20M-32 0H-16M16 0H32'),
    P('M-30 -40V-138A30 8 0 0 1 30 -138V-40L0 -22Z'),
    P('M-30 -138A30 8 0 0 0 30 -138', 'class="fino"'),
    P('M0 -22V-12H18'),
    P('M-30 -70H30M-30 -100H30', 'class="fino discontinua"'),
  ],
  placas: () => [
    P('M-46 0V-96M46 0V-96M-52 0H-40M40 0H52M-48 -96H48'),
    P('M-34 -14V-86M-25 -14V-86M-16 -14V-86M-7 -14V-86M2 -14V-86M11 -14V-86M20 -14V-86M29 -14V-86', 'class="fino"'),
    P('M-40 -14H40V-86H-40Z'),
    P('M-46 -72H-60M46 -30H60'),
  ],
  marmita: () => [
    P('M-30 0L-22 -24M30 0L22 -24M-38 0H-22M22 0H38'),
    P('M-42 -84Q-42 -28 0 -28Q42 -28 42 -84Z'),
    P('M-34 -84Q-34 -38 0 -38Q34 -38 34 -84', 'class="fino discontinua"'),
    P('M-48 -84H48M-42 -70H-54M42 -70H54', 'class="fino"'),
  ],
  conico: () => [
    P('M-30 0V-30M30 0V-30M-38 0H-22M22 0H38'),
    P('M-36 -48V-118A36 9 0 0 1 36 -118V-48L0 -26Z'),
    P('M-42 -54V-112M42 -54V-112', 'class="fino discontinua"'),
    P('M-8 -127H8V-138H-8Z M0 -127V-60', 'class="fino"'),
    P('M0 -26V-14H20'),
  ],
  tina: () => [
    P('M-50 0V-22M50 0V-22M-58 0H-42M42 0H58'),
    P('M-62 -78V-48Q-62 -24 -38 -24H38Q62 -24 62 -48V-78'),
    P('M-68 -78H68'),
    P('M-30 -86V-34M-18 -86V-34M-6 -86V-34', 'class="fino"'),
    P('M-30 -86H-6M-18 -86V-96', 'class="fino"'),
    P('M-58 -54Q-58 -30 -36 -30H36Q58 -30 58 -54', 'class="fino discontinua"'),
    P('M62 -34H74'),
  ],
  hiladora: () => [
    P('M-40 0V-26M40 0V-26M-48 0H-32M32 0H48'),
    P('M-48 -28H48V-74H-48Z'),
    P('M-36 -40L-28 -62L-20 -40L-12 -62L-4 -40L4 -62L12 -40L20 -62L28 -40L36 -62', 'class="fino"'),
    P('M-30 -74L-40 -100H10L0 -74', 'class="fino"'),
    P('M48 -50H62'),
  ],
  formadora: () => [
    P('M-34 0V-26M34 0V-26M-42 0H-26M26 0H42'),
    P('M-42 -28H30V-86H-42Z'),
    P('M30 -44H62M30 -36H62', 'class="fino"'),
    P('M40 -48A4 4 0 1 1 40 -47M52 -48A4 4 0 1 1 52 -47', 'class="fino"'),
    P('M-28 -50A14 14 0 1 0 2 -50A14 14 0 1 0 -28 -50', 'class="fino"'),
  ],
  prensa: () => [
    P('M-46 0V-112M46 0V-112M-54 0H-38M38 0H54M-50 -112H50'),
    P('M-10 -112V-86H10V-112', 'class="fino"'),
    P('M0 -86V-70M-28 -70H28', ''),
    P('M-30 -62H-6V-40H-30ZM6 -62H30V-40H6Z', 'class="fino"'),
    P('M-46 -36H46', 'class="fino"'),
  ],
  moldes: () => [
    P('M-58 0V-30M58 0V-30M-62 -32H62'),
    P('M-52 -36H-24V-58H-52ZM-14 -36H14V-58H-14ZM24 -36H52V-58H24Z', 'class="fino"'),
    P('M-46 -62H-20V-80H-46ZM-10 -62H16V-80H-10ZM26 -62H50V-80H26Z', 'class="fino"'),
  ],
  carro: () => [
    P('M-40 -12V-120M40 -12V-120'),
    P('M-40 -40H40M-40 -68H40M-40 -96H40M-40 -120H40', 'class="fino"'),
    P('M-34 -4A6 6 0 1 0 -22 -4A6 6 0 1 0 -34 -4M22 -4A6 6 0 1 0 34 -4A6 6 0 1 0 22 -4'),
    P('M-40 -12H40'),
  ],
  tambor: () => [
    P('M-40 0L-10 -60M40 0L10 -60M-48 0H-32M32 0H48'),
    P('M-30 -60A30 30 0 1 0 30 -60A30 30 0 1 0 -30 -60'),
    P('M-18 -60H18M0 -78V-42', 'class="fino"'),
    P('M30 -60H46', 'class="fino"'),
  ],
  meson: () => [
    P('M-58 0V-70M58 0V-70M-64 -70H64'),
    P('M-58 -46H58M-58 -20H58', 'class="fino"'),
  ],
};

const ALTURA = { tanque: 114, silo: 146, placas: 96, marmita: 84, conico: 138, tina: 96, hiladora: 100, formadora: 86, prensa: 112, moldes: 80, carro: 126, tambor: 90, meson: 70 };

function partirNombre(nombre, max) {
  const palabras = nombre.split(' ');
  const lineas = [''];
  palabras.forEach((p) => {
    const actual = lineas[lineas.length - 1];
    if ((actual + ' ' + p).trim().length > max && actual) lineas.push(p);
    else lineas[lineas.length - 1] = (actual + ' ' + p).trim();
  });
  return lineas.slice(0, 2);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function dibujarLinea(svg, items, { vertical = false } = {}) {
  const n = items.length;
  let w, h, pos;
  if (!vertical) {
    w = 1000; h = 304;
    const margen = n === 1 ? 500 : 110;
    const paso = n === 1 ? 0 : (w - margen * 2) / (n - 1);
    pos = items.map((_, i) => ({ x: margen + paso * i, y: 204 }));
  } else {
    w = 360; h = n * 190 + 30;
    pos = items.map((_, i) => ({ x: 92, y: 176 + i * 190 }));
  }
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

  let tuberias = '';
  for (let i = 0; i < n - 1; i++) {
    const a = pos[i], b = pos[i + 1];
    if (!vertical) {
      const y = a.y - 26;
      const x1 = a.x + 62, x2 = b.x - 62;
      tuberias += `<path class="tubo" pathLength="1" style="--i:${i * 2 + 1}" d="M${x1} ${y}H${x2}"/>`;
      const mx = (x1 + x2) / 2;
      tuberias += `<path class="flecha" style="--i:${i * 2 + 2}" d="M${mx - 6} ${y - 5}L${mx + 4} ${y}L${mx - 6} ${y + 5}"/>`;
    } else {
      const x = a.x + 70;
      tuberias += `<path class="tubo" pathLength="1" style="--i:${i * 2 + 1}" d="M${a.x + 56} ${a.y - 26}H${x}V${b.y - 120}H${b.x}V${b.y - ALTURA[EQUIPOS[items[i + 1].id].simbolo] - 8}"/>`;
    }
  }

  const equipos = items.map((it, i) => {
    const eq = EQUIPOS[it.id];
    const { x, y } = pos[i];
    const alto = ALTURA[eq.simbolo];
    const formas = SIMBOLOS[eq.simbolo]().join('');
    const nombre = partirNombre(eq.nombre, vertical ? 22 : 18);
    const tag = `${eq.tag}-${String(i + 1).padStart(2, '0')}`;
    const tx = vertical ? x + 92 : x;
    const ty = vertical ? y - alto + 18 : y + 30;
    const anchor = vertical ? 'start' : 'middle';
    const tagY = y - alto - 30;
    const cota = i === 0 && !vertical
      ? `<g class="cota" style="--i:${i * 2}"><path pathLength="1" d="M${x - 78} ${y}V${y - alto}M${x - 84} ${y}H${x - 72}M${x - 84} ${y - alto}H${x - 72}"/><text x="${x - 88}" y="${y - alto / 2}" transform="rotate(-90 ${x - 88} ${y - alto / 2})" text-anchor="middle">${esc(it.dato)}</text></g>`
      : '';
    const capNum = (String(it.dato).match(/\d{1,3}(?:\.\d{3})+|\d+/) || ['0'])[0].replace(/\./g, '');
    const zona = vertical ? `<rect class="zona" x="${x - 70}" y="${y - alto - 52}" width="300" height="${alto + 110}"/>` : `<rect class="zona" x="${x - 80}" y="${y - alto - 52}" width="160" height="${alto + 140}"/>`;
    return `<a class="equipo-enlace" href="equipo.html?e=${it.id}&amp;cap=${capNum}" aria-label="Ver ficha técnica: ${esc(eq.nombre)}">${zona}<g class="equipo" style="--i:${i * 2}">
      <g transform="translate(${x} ${y})">${formas}</g>
      <g class="tag"><circle cx="${x}" cy="${tagY}" r="17"/><path d="M${x - 17} ${tagY}H${x + 17}"/><text x="${x}" y="${tagY - 4}" text-anchor="middle">${eq.tag}</text><text x="${x}" y="${tagY + 11}" text-anchor="middle">${String(i + 1).padStart(2, '0')}</text><path class="guia" d="M${x} ${tagY + 17}V${y - alto - 6}"/></g>
      <text class="nombre" x="${tx}" y="${ty}" text-anchor="${anchor}">${nombre.map((l, k) => `<tspan x="${tx}" dy="${k ? 17 : 0}">${esc(l)}</tspan>`).join('')}</text>
      <text class="dato" x="${tx}" y="${ty + nombre.length * 17 + 6}" text-anchor="${anchor}">${esc(it.dato)}</text>
      <title>${esc(tag)} · ${esc(eq.nombre)} · ${esc(it.dato)} · ver ficha técnica</title>
      ${cota}
    </g><text class="ver" x="${tx}" y="${ty + nombre.length * 17 + 26}" text-anchor="${anchor}">Ver ficha →</text></a>`;
  }).join('');

  svg.innerHTML = `<g class="piso"><path d="M20 ${vertical ? 0 : 204}H${w - 20}" ${vertical ? 'style="display:none"' : ''}/></g>${tuberias}${equipos}`;
  svg.classList.remove('dibujando');
  // fuerza el reinicio de la animación de trazo
  void svg.getBoundingClientRect();
  svg.classList.add('dibujando');
}
