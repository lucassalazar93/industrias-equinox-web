// Planos de disposición general (A3, vectorial) para los equipos Equinox.
// Módulo puro, sin DOM: lo usan la ficha web (descarga) y la skill planos-equinox (lote en Node).
// Medidas: VALORES DE MUESTRA derivados de la capacidad. Plano preliminar, no apto para fabricación.
import { EQUIPOS, LINEAS } from './data.js';
import { FICHAS } from './fichas.js';

const TINTA = [8, 16, 90], ROJO = [196, 53, 28], GRIS = [79, 87, 121], PAPEL = [228, 232, 240], RESALTE = [222, 228, 245];
const ESCALAS = [2, 5, 10, 20, 25, 50, 100];
const r5 = (v) => Math.round(v / 5) * 5;
const r10 = (v) => Math.round(v / 10) * 10;
const fmt = (n) => Number(n).toLocaleString('es-CO');
const limpiar = (s) => String(s ?? '').replace(/≈\s?/g, 'aprox. ').replace(/→/g, 'a').replace(/–/g, '-');
const diam = (litros, hd = 1) => Math.cbrt((4 * (litros / 1000)) / (Math.PI * hd)) * 1000; // mm

// Cada familia devuelve: { xMin, xMax, alto, prof, latMin?, latMax?, frente(p), planta(p), lateral?(p),
//   cotas: [{ vista, dir: 'h'|'v', a, b, en, lado, nivel, letra }], textos: [{ vista, x, y, texto }], valores: [...] }

// ---------- recipiente vertical: tanques, silo, fermentador ----------
function recipiente(cap, cfg) {
  const D = r10(diam(cap, cfg.hd ?? 1));
  const ais = 35, Ro = D / 2 + ais;
  const hLeg = cfg.hPata ?? 450;
  const hFondo = cfg.conico ? r10(D * 0.35) : r10(D * 0.06);
  const yb = hLeg + hFondo, yt = yb + r10(D * (cfg.hd ?? 1)), hDomo = r10(D * 0.16), ytop = yt + hDomo;
  const altoMotor = cfg.agitador ? 280 : 0;
  const lateral = cfg.salida !== 'fondo';
  const ySal = lateral ? yb + 70 : hLeg - 120;
  const largoSal = 320;
  const libre = cfg.conico ? hLeg : r10(hLeg - hFondo * 0.5);
  const xMin = -Ro - (cfg.mirilla ? 130 : 80);
  const xMax = Math.max(lateral ? Ro + largoSal + 40 : Ro + 40, cfg.escalera ? Ro + 520 : 0, cfg.agitador ? 440 : 0);
  const alto = ytop + Math.max(altoMotor, cfg.escalera ? 320 : 0);
  const nPatas = cfg.patas || 4, rPata = Ro * 0.82;
  const frente = (p) => {
    p.eje(0, -60, 0, alto + 60);
    p.linea(-Ro, yb, -Ro, yt); p.linea(Ro, yb, Ro, yt);
    p.elipse(0, yt, Ro, hDomo + ais * 0.4, 0, 180);
    if (cfg.conico) { p.linea(-Ro, yb, -60, hLeg); p.linea(Ro, yb, 60, hLeg); p.linea(-60, hLeg, 60, hLeg); }
    else p.elipse(0, yb, Ro, hFondo, 180, 360);
    p.linea(-D / 2, yb, -D / 2, yt, 'oculta'); p.linea(D / 2, yb, D / 2, yt, 'oculta');
    p.linea(-Ro, yt, Ro, yt, 'fina'); p.linea(-Ro, yb, Ro, yb, 'fina');
    if (cfg.chaqueta) { const y0 = yb + 80, h = (yt - yb) * 0.7; p.rect(Ro, y0, 22, h, 'fina'); p.rect(-Ro - 22, y0, 22, h, 'fina'); }
    const xs = nPatas === 3 ? [0, -rPata * 0.87, rPata * 0.87] : [-rPata * 0.71, rPata * 0.71];
    xs.forEach((x) => { p.rect(x - 25, 20, 50, libre - 20); p.rect(x - 55, 0, 110, 20); });
    if (cfg.agitador) {
      p.rect(-Ro * 0.85, ytop + 10, Ro * 1.7, 50); p.rect(-110, ytop + 60, 220, 150); p.rect(110, ytop + 80, 300, 200);
      p.linea(0, ytop, 0, yb + 120, 'oculta');
      [0.3, 0.62].forEach((f) => p.linea(-D * 0.4, yb + (yt - yb) * f, D * 0.4, yb + (yt - yb) * f, 'oculta'));
    }
    const tx = -Ro * 0.45;
    p.rect(tx - 220, ytop - hDomo * 0.3, 440, 40);
    if (lateral) { p.rect(Ro, ySal - 38, largoSal, 76); p.circulo(Ro + largoSal * 0.6, ySal, 60); p.linea(Ro + largoSal * 0.6, ySal + 60, Ro + largoSal * 0.6, ySal + 200); }
    else { p.rect(-38, ySal, 76, hLeg - ySal); p.rect(-38, ySal - 76, largoSal * 0.8, 76); p.circulo(largoSal * 0.45, ySal - 38, 55); }
    if (cfg.tablero !== false) p.rect(-Ro - 60, yb + (yt - yb) * 0.45, 60, 220);
    if (cfg.escalera) { const x0 = Ro + 120; p.linea(x0, 0, x0, ytop + 300); p.linea(x0 + 380, 0, x0 + 380, ytop + 300); for (let y = 300; y < ytop + 300; y += 300) p.linea(x0, y, x0 + 380, y, 'fina'); p.linea(-Ro * 0.6, ytop + 300, x0 + 380, ytop + 300); }
    if (cfg.mirilla) { p.linea(-Ro - 90, yb + 150, -Ro - 90, yt - 150, 'fina'); p.linea(-Ro - 120, yb + 150, -Ro - 120, yt - 150, 'fina'); }
    p.globo(Ro * 0.3, ytop - hDomo * 0.1, 'N1', 1);
    p.globo(lateral ? Ro + largoSal : largoSal * 0.8 - 38, lateral ? ySal : ySal - 38, 'N2', 1);
    p.globo(tx - 220, ytop - hDomo * 0.1, 'N3', -1);
    if (cfg.tablero !== false) p.globo(-Ro - 60, yb + (yt - yb) * 0.45 + 220, 'N4', -1);
    if (cfg.mirilla) p.globo(-Ro - 120, yt - 150, 'N4', -1);
  };
  const planta = (p) => {
    p.eje(xMin, 0, xMax, 0); p.eje(0, -Ro - 100, 0, Ro + 100);
    p.circulo(0, 0, Ro); p.circulo(0, 0, D / 2, 'oculta');
    (nPatas === 3 ? [90, 210, 330] : [45, 135, 225, 315]).forEach((a) => { const r = (a * Math.PI) / 180; p.circulo(Math.cos(r) * rPata, Math.sin(r) * rPata, 55, 'oculta'); });
    p.circulo(-Ro * 0.45, Ro * 0.3, 200);
    if (cfg.agitador) { p.rect(-Ro * 0.85, -60, Ro * 1.7, 120); p.rect(110, -100, 300, 200); }
    if (lateral) p.rect(Ro, -38, largoSal, 76);
    if (cfg.escalera) p.rect(Ro + 120, -190, 380, 380, 'fina');
  };
  return {
    xMin, xMax, alto, prof: 2 * Ro, frente, planta,
    cotas: [
      { vista: 'planta', dir: 'h', a: -D / 2, b: D / 2, en: Ro, lado: 1, letra: 'A' },
      { vista: 'planta', dir: 'h', a: -Ro, b: Ro, en: -Ro, lado: -1, letra: 'B' },
      { vista: 'frente', dir: 'v', a: 0, b: ytop + altoMotor, en: xMin, lado: -1, letra: 'C' },
      { vista: 'frente', dir: 'v', a: 0, b: libre, en: xMax, lado: 1, letra: 'D' },
      { vista: 'frente', dir: 'v', a: 0, b: ySal, en: xMax, lado: 1, nivel: 1, letra: 'E' },
      { vista: 'frente', dir: 'h', a: xMin, b: xMax, en: 0, lado: 1, letra: 'F' },
    ],
    valores: [D, 2 * Ro, r10(ytop + altoMotor), libre, r10(ySal), r10(xMax - xMin)],
  };
}

// ---------- marmita ----------
function marmita(cap, volcable) {
  const D = r10(diam(cap, 0.75)), R = D / 2, yC = 980, yBorde = yC + 220, alto = yC + 560;
  const xMin = volcable ? -R - 260 : -R - 60, xMax = volcable ? R + 470 : R + 300;
  const frente = (p) => {
    p.eje(0, -40, 0, alto + 40);
    p.elipse(0, yC, R, R * 0.85, 180, 360); p.linea(-R, yC, -R, yBorde); p.linea(R, yC, R, yBorde);
    p.elipse(0, yC, R + 50, R * 0.85 + 50, 200, 340, 'fina');
    p.linea(-R - 20, yBorde, R + 20, yBorde);
    p.rect(-R * 1.05, yC + 300, R * 2.1, 45); p.rect(-110, yC + 345, 220, 150); p.rect(110, yC + 360, 280, 190);
    p.linea(0, yC + 300, 0, yC - R * 0.7, 'oculta');
    if (volcable) {
      [-R - 220, R + 140].forEach((x) => { p.rect(x, 25, 80, yC - 5); p.rect(x - 40, 0, 160, 25); });
      p.circulo(R + 300, yC, 160); p.linea(-R - 140, yC, R + 300, yC, 'eje');
      p.globo(R + 300, yC + 160, 'N3', 1);
    } else {
      [-R * 0.62, R * 0.62].forEach((x) => { p.rect(x - 22, 20, 44, yC - R * 0.55 - 20); p.rect(x - 50, 0, 100, 20); });
      const yF = yC - R * 0.85;
      p.rect(-30, yF - 260, 60, 260); p.rect(-30, yF - 330, 300, 70); p.circulo(200, yF - 295, 45);
      p.linea(R + 40, yC - 200, R + 260, yC - 200); p.linea(R + 260, yC - 200, R + 260, 300);
      p.globo(270, yF - 295, 'N2', 1); p.globo(R + 260, 300, 'N3', 1);
    }
    p.globo(-R * 0.4, yBorde, 'N1', -1);
  };
  const planta = (p) => {
    p.eje(xMin, 0, xMax, 0); p.eje(0, -R - 150, 0, R + 150);
    p.circulo(0, 0, R + 20); p.circulo(0, 0, R + 50, 'oculta'); p.rect(-R * 1.05, -60, R * 2.1, 120); p.rect(110, -95, 280, 190);
    if (volcable) { p.rect(-R - 220, -60, 80, 120); p.rect(R + 140, -60, 80, 120); p.linea(R + 300, -160, R + 300, 160); }
  };
  return {
    xMin, xMax, alto, prof: D + 300, frente, planta,
    cotas: [
      { vista: 'planta', dir: 'h', a: -R, b: R, en: R + 50, lado: 1, letra: 'A' },
      { vista: 'frente', dir: 'v', a: 0, b: yBorde, en: xMin, lado: -1, letra: 'B' },
      { vista: 'frente', dir: 'v', a: 0, b: alto - 20, en: xMin, lado: -1, nivel: 1, letra: 'C' },
      { vista: 'frente', dir: 'h', a: xMin, b: xMax, en: 0, lado: 1, letra: 'D' },
    ],
    valores: [D, yBorde, alto - 20, r10(xMax - xMin)],
  };
}

// ---------- tina de cuajado ----------
function tina(cap, poli) {
  const L = r10(poli ? 2400 + cap / 2.5 : 1200 + cap), W = r10(poli ? 1100 : 600 + Math.min(600, cap / 8)), H = r10(poli ? 800 : 500 + Math.min(300, cap / 15));
  const hLeg = 380, alto = hLeg + H + 270;
  const frente = (p) => {
    p.rect(-L / 2, hLeg, L, H); p.linea(-L / 2, hLeg + H - 30, L / 2, hLeg + H - 30, 'fina');
    p.rect(-L / 2 + 40, hLeg - 45, L - 80, H * 0.75, 'oculta');
    [-L * 0.42, 0, L * 0.42].forEach((x) => { p.rect(x - 22, 20, 44, hLeg - 65); p.rect(x - 50, 0, 100, 20); });
    p.linea(-L / 2, hLeg + H + 30, L / 2, hLeg + H + 30);
    p.rect(-150, hLeg + H + 30, 300, 90); p.rect(-60, hLeg + H + 120, 120, 150);
    for (let i = 0; i <= 6; i++) p.linea(-120 + i * 40, hLeg + H + 30, -120 + i * 40, hLeg + H * 0.25, 'oculta');
    p.rect(L / 2, hLeg + 30, 260, 70); p.circulo(L / 2 + 170, hLeg + 65, 50);
    p.globo(L / 2 + 260, hLeg + 65, 'N2', 1); p.globo(-L / 2 + 100, hLeg + H, 'N1', -1); p.globo(60, hLeg + H + 270, 'N3', 1);
  };
  const lateral = (p) => {
    const a = W / 2, r = 180;
    p.eje(0, -40, 0, alto + 40);
    const u = (dx, dy) => [[-a - dx, hLeg + H], [-a - dx, hLeg + r - dy], [-a - dx + r, hLeg - dy], [a + dx - r, hLeg - dy], [a + dx, hLeg + r - dy], [a + dx, hLeg + H]];
    p.poli(u(0, 0)); p.poli(u(45, 45).map(([x, y]) => [x, Math.min(y, hLeg + H * 0.75)]), 'fina');
    p.sombrear(-a + 20, hLeg + 20, W - 40, H * 0.8);
    [-a + 60, a - 60].forEach((x) => { p.rect(x - 22, 20, 44, hLeg - 65); p.rect(x - 50, 0, 100, 20); });
    p.rect(-a - 70, hLeg + H + 30, W + 140, 90);
  };
  const planta = (p) => {
    p.eje(-L / 2 - 100, 0, L / 2 + 360, 0);
    p.rect(-L / 2, -W / 2, L, W); p.rect(-L / 2 + 20, -W / 2 + 20, L - 40, W - 40, 'fina');
    p.linea(-L / 2, -W / 2 - 30, L / 2, -W / 2 - 30, 'fina'); p.linea(-L / 2, W / 2 + 30, L / 2, W / 2 + 30, 'fina');
    p.rect(-150, -W / 2 - 70, 300, W + 140); p.rect(L / 2, -35, 260, 70);
  };
  return {
    xMin: -L / 2, xMax: L / 2 + 300, alto, prof: W + 140, latMin: -W / 2 - 70, latMax: W / 2 + 70, frente, planta, lateral,
    cotas: [
      { vista: 'frente', dir: 'h', a: -L / 2, b: L / 2, en: 0, lado: 1, letra: 'A' },
      { vista: 'lateral', dir: 'h', a: -W / 2, b: W / 2, en: 0, lado: 1, letra: 'B' },
      { vista: 'lateral', dir: 'v', a: hLeg, b: hLeg + H, en: W / 2 + 70, lado: 1, letra: 'C' },
      { vista: 'frente', dir: 'v', a: 0, b: alto, en: -L / 2, lado: -1, letra: 'D' },
    ],
    valores: [L, W, H, alto],
  };
}

// ---------- pasteurizador a placas ----------
function pasteurizador(cap) {
  const L = r10(1600 + cap / 12), n = Math.round(20 + cap / 180), H = 1450, Wf = 720;
  const x0 = -L / 2 + 140, paso = Math.min(28, (L * 0.5) / n);
  const frente = (p) => {
    p.rect(-L / 2, 60, 120, 1300); p.rect(-L / 2 - 90, 0, 300, 60);
    p.rect(L / 2 - 80, 0, 80, H); p.rect(L / 2 - 190, 0, 300, 60);
    p.linea(-L / 2 + 120, H - 20, L / 2 - 80, H - 20); p.linea(-L / 2 + 120, 140, L / 2 - 80, 140, 'fina');
    for (let i = 0; i < n; i++) p.linea(x0 + i * paso, 250, x0 + i * paso, 1300, 'fina');
    p.rect(x0, 250, n * paso, 1050);
    p.rect(x0 + n * paso + 10, 200, 80, 1150);
    [[1220, 'N1'], [340, 'N2']].forEach(([y, t]) => { p.rect(-L / 2 - 160, y - 30, 160, 60); p.globo(-L / 2 - 160, y, t, -1); });
    p.rect(L / 2 + 250, 750, 500, 700); p.rect(L / 2 + 470, 0, 60, 750); p.globo(L / 2 + 750, 1300, 'N4', 1);
    p.rect(-L / 2 + 200, 0, 500, 300); p.circulo(-L / 2 + 330, 210, 80); p.globo(-L / 2 + 700, 200, 'N3', 1);
  };
  const planta = (p) => {
    p.rect(-L / 2 - 90, -Wf / 2, L + 200, Wf); p.rect(-L / 2, -360, 120, 720); p.rect(x0, -250, n * paso, 500, 'fina');
    p.rect(L / 2 + 250, -100, 500, 160); p.rect(-L / 2 + 200, Wf / 2 + 80, 500, 220);
    p.linea(-L / 2 + 300, -Wf / 2 - 160, L / 2 - 300, -Wf / 2 - 160, 'oculta');
  };
  return {
    xMin: -L / 2 - 170, xMax: L / 2 + 760, alto: H, prof: Wf + 700, frente, planta,
    cotas: [
      { vista: 'frente', dir: 'h', a: -L / 2 - 90, b: L / 2 + 110, en: 0, lado: 1, letra: 'A' },
      { vista: 'frente', dir: 'v', a: 0, b: H, en: -L / 2 - 170, lado: -1, letra: 'C' },
      { vista: 'planta', dir: 'v', a: -Wf / 2, b: Wf / 2, en: -L / 2 - 90, lado: -1, letra: 'D' },
    ],
    textos: [{ vista: 'frente', x: x0 + (n * paso) / 2, y: 1340, texto: 'B placas' }],
    valores: [L + 200, n, H, Wf],
  };
}

// ---------- hiladora y formadora ----------
function maquina(cap, tipo) {
  const L = tipo === 'hiladora' ? r10(2000 + cap * 1.6) : 2900, W = tipo === 'hiladora' ? 800 : 900, H = tipo === 'hiladora' ? 1600 : 1500;
  const y0 = 560, cuerpo = tipo === 'hiladora' ? L * 0.55 : 820, hC = tipo === 'hiladora' ? 220 : 520;
  const frente = (p) => {
    p.rect(-L / 2 + 300, y0, cuerpo, hC);
    p.poli([[-L / 2 + 420, y0 + hC], [-L / 2 + 300, H], [-L / 2 + 820, H], [-L / 2 + 700, y0 + hC]], 'visible', true);
    if (tipo === 'hiladora') {
      for (let x = -L / 2 + 340; x < -L / 2 + 260 + cuerpo; x += 120) p.linea(x, y0 + 30, x + 60, y0 + 190, 'oculta');
      p.rect(-L / 2, y0 + 10, 300, 200); p.poli([[-L / 2 + 300 + cuerpo, y0 + 60], [L / 2, y0 - 60]]);
      p.linea(-L / 2 + 300 + cuerpo * 0.6, y0 + hC, -L / 2 + 300 + cuerpo * 0.6, H - 100); p.globo(-L / 2 + 300 + cuerpo * 0.6, H - 100, 'N3', 1);
      p.globo(L / 2, y0 - 60, 'N2', 1);
    } else {
      p.circulo(-L / 2 + 1150, 950, 170); p.rect(-L / 2 + 1150, 580, L - 1450, 40); p.rect(L / 2 - 500, 0, 500, 420, 'fina');
      p.globo(L / 2 - 250, 420, 'N2', 1);
    }
    [-L / 2 + 360, -L / 2 + 240 + cuerpo].forEach((x) => { p.rect(x - 20, 18, 40, y0 - 18); p.rect(x - 45, 0, 90, 18); });
    p.globo(-L / 2 + 560, H, 'N1', -1);
  };
  const planta = (p) => { p.rect(-L / 2 + 300, -W / 2, cuerpo, W); p.rect(-L / 2 + 300, -W / 2 + 40, 520, W - 80, 'fina'); if (tipo === 'hiladora') p.rect(-L / 2, -150, 300, 300); else p.rect(-L / 2 + 1150, -180, L - 1450, 360); };
  return {
    xMin: -L / 2, xMax: L / 2, alto: H, prof: W, frente, planta,
    cotas: [
      { vista: 'frente', dir: 'h', a: -L / 2, b: L / 2, en: 0, lado: 1, letra: 'A' },
      { vista: 'planta', dir: 'v', a: -W / 2, b: W / 2, en: -L / 2 + 300, lado: -1, letra: 'B' },
      { vista: 'frente', dir: 'v', a: 0, b: H, en: -L / 2, lado: -1, letra: 'C' },
    ],
    valores: [L, W, H],
  };
}

// ---------- mantequillera ----------
function mantequillera(cap) {
  const D = r10(diam(cap)), L = D, yE = D / 2 + 520, alto = yE + D / 2 + 40;
  const frente = (p) => {
    p.eje(-L / 2 - 200, yE, L / 2 + 200, yE); p.rect(-L / 2, yE - D / 2, L, D);
    p.linea(-L / 2 + 30, yE - D / 2, -L / 2 + 30, yE + D / 2, 'fina'); p.linea(L / 2 - 30, yE - D / 2, L / 2 - 30, yE + D / 2, 'fina');
    [-1, 1].forEach((s) => { p.linea(s * (L / 2 + 120), 25, s * (L / 2 + 120), yE); p.rect(s * (L / 2 + 120) - 40, 0, 80, 25); });
    p.rect(L / 2 + 180, yE - 420, 260, 400); p.rect(-150, yE + D / 2, 300, 40);
    p.globo(-150, yE + D / 2 + 40, 'N1', -1); p.globo(L / 2 + 440, yE - 220, 'N2', 1);
  };
  const lateral = (p) => { p.eje(0, -40, 0, alto + 40); p.circulo(0, yE, D / 2); p.circulo(0, yE, 40); p.poli([[-450, 0], [0, yE], [450, 0]]); p.rect(-150, yE + D / 2, 300, 40); };
  const planta = (p) => { p.rect(-L / 2, -D / 2, L, D); p.rect(L / 2 + 180, -150, 260, 300); [-1, 1].forEach((s) => p.rect(s * (L / 2 + 120) - 40, -450, 80, 900, 'fina')); };
  return {
    xMin: -L / 2 - 160, xMax: L / 2 + 460, alto, prof: 1000, latMin: -500, latMax: 500, frente, planta, lateral,
    cotas: [
      { vista: 'lateral', dir: 'h', a: -D / 2, b: D / 2, en: alto, lado: -1, letra: 'A' },
      { vista: 'frente', dir: 'v', a: 0, b: alto, en: -L / 2 - 160, lado: -1, letra: 'B' },
      { vista: 'frente', dir: 'h', a: -L / 2 - 160, b: L / 2 + 440, en: 0, lado: 1, letra: 'C' },
    ],
    valores: [D, alto, r10(L + 600)],
  };
}

// ---------- prensa neumática ----------
function prensa(n) {
  const L = r10(420 * n + 600), W = 700, H = 1950, yT = 820;
  const frente = (p) => {
    [-L / 2, L / 2 - 60].forEach((x) => p.rect(x, 0, 60, H));
    p.rect(-L / 2, H - 120, L, 120); p.rect(-L / 2 + 60, yT - 50, L - 120, 50); p.linea(-L / 2 + 60, yT - 160, L / 2 - 60, yT - 110, 'fina');
    for (let i = 0; i < n; i++) { const x = -L / 2 + 360 + i * 420; p.rect(x - 70, H - 540, 140, 420); p.linea(x, H - 540, x, yT + 320); p.rect(x - 150, yT + 290, 300, 30); p.rect(x - 160, yT, 320, 260, 'fina'); }
    p.linea(-L / 2, H + 90, L / 2, H + 90); p.globo(L / 2, H + 90, 'N1', 1); p.rect(L / 2 + 40, 1200, 140, 320); p.globo(L / 2 + 180, 1360, 'N2', 1);
  };
  const lateral = (p) => { [-W / 2, W / 2 - 60].forEach((x) => p.rect(x, 0, 60, H)); p.rect(-W / 2, H - 120, W, 120); p.rect(-W / 2 + 60, yT - 50, W - 120, 50); p.rect(-70, H - 540, 140, 420); p.rect(-160, yT, 320, 260, 'fina'); };
  const planta = (p) => { p.rect(-L / 2, -W / 2, L, W); for (let i = 0; i < n; i++) p.circulo(-L / 2 + 360 + i * 420, 0, 70); p.rect(-L / 2 + 60, -W / 2 + 60, L - 120, W - 120, 'fina'); };
  return {
    xMin: -L / 2, xMax: L / 2 + 200, alto: H + 90, prof: W, latMin: -W / 2, latMax: W / 2, frente, planta, lateral,
    cotas: [
      { vista: 'frente', dir: 'h', a: -L / 2, b: L / 2, en: 0, lado: 1, letra: 'A' },
      { vista: 'lateral', dir: 'h', a: -W / 2, b: W / 2, en: 0, lado: 1, letra: 'B' },
      { vista: 'frente', dir: 'v', a: 0, b: H, en: -L / 2, lado: -1, letra: 'C' },
    ],
    textos: [{ vista: 'frente', x: -L / 2 + 360, y: H - 600, texto: 'D pistones' }],
    valores: [L, W, H, n],
  };
}

// ---------- piezas simples ----------
function caja3(dims, { perforado = true, tapa = false } = {}) {
  const [w, h, d] = dims;
  const frente = (p) => { p.rect(-w / 2, 0, w, h); if (perforado) p.perforar(-w / 2 + 20, 20, w - 40, h - 40); if (tapa) { p.rect(-w / 2 + 10, h + 30, w - 20, 8); p.rect(-12, h + 38, 24, 40); p.globo(0, h + 78, 'N1', 1); } };
  const lateral = (p) => { p.rect(-d / 2, 0, d, h); if (perforado) p.perforar(-d / 2 + 20, 20, d - 40, h - 40); if (tapa) p.rect(-d / 2 + 10, h + 30, d - 20, 8); };
  const planta = (p) => { p.rect(-w / 2, -d / 2, w, d); p.rect(-w / 2 + 8, -d / 2 + 8, w - 16, d - 16, 'fina'); if (perforado) p.perforar(-w / 2 + 25, -d / 2 + 25, w - 50, d - 50); };
  return {
    xMin: -w / 2, xMax: w / 2, alto: h + (tapa ? 90 : 0), prof: d, latMin: -d / 2, latMax: d / 2, frente, planta, lateral,
    cotas: [
      { vista: 'frente', dir: 'h', a: -w / 2, b: w / 2, en: 0, lado: 1, letra: 'A' },
      { vista: 'lateral', dir: 'h', a: -d / 2, b: d / 2, en: 0, lado: 1, letra: 'B' },
      { vista: 'frente', dir: 'v', a: 0, b: h, en: -w / 2, lado: -1, letra: 'C' },
    ],
    valores: [w, d, h],
  };
}
function carro(cap) {
  const W = 1200, D = 650, H = 1750;
  const frente = (p) => { [-W / 2, W / 2 - 30].forEach((x) => p.rect(x, 120, 30, H - 120)); p.rect(-W / 2, H - 30, W, 30); for (let i = 0; i < 6; i++) p.rect(-W / 2 + 30, 280 + i * 240, W - 60, 12, 'fina'); [-W / 2 + 15, W / 2 - 15].forEach((x) => { p.circulo(x, 60, 60); p.rect(x - 30, 110, 60, 30); }); };
  const lateral = (p) => { [-D / 2, D / 2 - 30].forEach((x) => p.rect(x, 120, 30, H - 120)); for (let i = 0; i < 6; i++) p.linea(-D / 2, 286 + i * 240, D / 2, 286 + i * 240, 'fina'); [-D / 2 + 15, D / 2 - 15].forEach((x) => p.circulo(x, 60, 60)); };
  const planta = (p) => { p.rect(-W / 2, -D / 2, W, D); p.perforar(-W / 2 + 60, -D / 2 + 60, W - 120, D - 120); };
  return {
    xMin: -W / 2, xMax: W / 2, alto: H, prof: D, latMin: -D / 2, latMax: D / 2, frente, planta, lateral,
    cotas: [
      { vista: 'frente', dir: 'h', a: -W / 2, b: W / 2, en: 0, lado: 1, letra: 'A' },
      { vista: 'lateral', dir: 'h', a: -D / 2, b: D / 2, en: 0, lado: 1, letra: 'B' },
      { vista: 'frente', dir: 'v', a: 0, b: H, en: -W / 2, lado: -1, letra: 'C' },
    ],
    textos: [{ vista: 'frente', x: 0, y: 280 + 6 * 240 - 60, texto: 'D bandejas' }],
    valores: [W, D, H, Math.round(cap / 18)],
  };
}
function meson() {
  const W = 2000, D = 1000, H = 900;
  const vista = (ancho) => (p) => { p.rect(-ancho / 2, H - 40, ancho, 40); [[500, 25], [160, 25]].forEach(([y, e]) => p.rect(-ancho / 2 + 50, y, ancho - 100, e)); [-ancho / 2 + 30, ancho / 2 - 70].forEach((x) => { p.rect(x, 30, 40, H - 70); p.rect(x - 5, 0, 50, 30); }); };
  const planta = (p) => { p.rect(-W / 2, -D / 2, W, D); [[-W / 2 + 30, -D / 2 + 30], [W / 2 - 70, -D / 2 + 30], [-W / 2 + 30, D / 2 - 70], [W / 2 - 70, D / 2 - 70]].forEach(([x, z]) => p.rect(x, z, 40, 40, 'oculta')); };
  return {
    xMin: -W / 2, xMax: W / 2, alto: H, prof: D, latMin: -D / 2, latMax: D / 2, frente: vista(W), lateral: vista(D), planta,
    cotas: [
      { vista: 'frente', dir: 'h', a: -W / 2, b: W / 2, en: 0, lado: 1, letra: 'A' },
      { vista: 'lateral', dir: 'h', a: -D / 2, b: D / 2, en: 0, lado: 1, letra: 'B' },
      { vista: 'frente', dir: 'v', a: 0, b: H, en: -W / 2, lado: -1, letra: 'C' },
    ],
    valores: [W, D, H],
  };
}

// ---------- catálogo de planos ----------
const RECIP = {
  enfriamiento: { agitador: true },
  mezcla: { agitador: true, chaqueta: true },
  almacenamiento: { agitador: true, escalera: true, mirilla: true, tablero: false, salida: 'fondo', hd: 1.5, hPata: 900, conico: true },
  fermentacion: { agitador: true, chaqueta: true, salida: 'fondo', conico: true, patas: 3, hd: 1.1, hPata: 650 },
};
const LETRAS_RECIP = ['A Ø interno', 'B Ø exterior', 'C Altura total', 'D Altura libre bajo el tanque', 'E Altura de la salida', 'F Ancho total'];
const MOLDES = { moldePrensa: (c) => [r5(300 + c * 5), 250, r5(300 + c * 5)], moldeCosteno: (c) => [r5(250 + c * 10), 180, r5(250 + c * 10)], moldeMozzarella: () => [300, 120, 150] };

function geometria(id, cap) {
  if (RECIP[id]) return recipiente(cap, RECIP[id]);
  if (id === 'marmitaMulti') return marmita(cap, false);
  if (id === 'marmitaVolcable') return marmita(cap, true);
  if (id === 'tina') return tina(cap, false);
  if (id === 'polivalente') return tina(cap, true);
  if (id === 'pasteurizador') return pasteurizador(cap);
  if (id === 'hiladora' || id === 'formadora') return maquina(cap, id);
  if (id === 'mantequillera') return mantequillera(cap);
  if (id === 'prensa') return prensa(cap);
  if (MOLDES[id]) return caja3(MOLDES[id](cap), { tapa: true });
  if (id === 'carro') return carro(cap);
  if (id === 'meson') return meson();
  if (id === 'canastilla') return caja3([600, 250, 400]);
  throw new Error(`Sin geometría de plano para el equipo «${id}». Agréguela en geometria() de planos.js.`);
}

function datosTexto(id) {
  const cfg = RECIP[id];
  if (cfg) {
    const con = [['N1', 'Entrada de producto', 'Clamp sanitario 2"'], ['N2', cfg.salida === 'fondo' ? 'Descarga de fondo' : 'Salida / descarga', 'Válvula sanitaria 2"'], ['N3', 'Tapa de inspección', 'Ø 400 abatible']];
    if (cfg.mirilla) con.push(['N4', 'Indicador de nivel', 'Mirilla de vidrio']); else con.push(['N4', 'Tablero de control', 'Tensión a definir']);
    const bom = [['Tanque interior', 'AISI 304, pulido sanitario'], [cfg.chaqueta ? 'Chaqueta térmica' : 'Aislamiento térmico', cfg.chaqueta ? 'AISI 304' : 'Poliuretano inyectado'], ['Pared exterior', 'AISI 304, acabado 2B'], ['Agitador y motorreductor', 'AISI 304 / motor IP55'], ['Tapa de inspección', 'AISI 304'], ['Válvula sanitaria', 'AISI 304'], [`Patas regulables (${cfg.patas || 4})`, 'AISI 304']];
    if (cfg.escalera) bom.push(['Escalera y baranda', 'AISI 304']);
    return { letras: LETRAS_RECIP, con, bom };
  }
  const T = {
    marmitaMulti: { letras: ['A Ø de la olla', 'B Altura al borde', 'C Altura total', 'D Ancho total'], con: [['N1', 'Carga de producto', 'Boca superior'], ['N2', 'Descarga', 'Válvula sanitaria 2"'], ['N3', 'Entrada de vapor', 'Rosca 3/4" (a definir)']], bom: [['Olla interior', 'AISI 304, pulido sanitario'], ['Chaqueta de calentamiento', 'AISI 304'], ['Agitador raspador', 'AISI 304'], ['Motorreductor y puente', 'AISI 304 / motor IP55'], ['Patas regulables (3)', 'AISI 304']] },
    marmitaVolcable: { letras: ['A Ø de la olla', 'B Altura al borde', 'C Altura total', 'D Ancho total'], con: [['N1', 'Carga de producto', 'Boca superior'], ['N3', 'Volante de volteo', 'Reducción manual']], bom: [['Olla interior', 'AISI 304, pulido sanitario'], ['Chaqueta de calentamiento', 'AISI 304'], ['Agitador raspador', 'AISI 304'], ['Motorreductor y puente', 'AISI 304 / motor IP55'], ['Soporte con eje de volteo', 'AISI 304']] },
    tina: { letras: ['A Largo', 'B Ancho', 'C Profundidad útil', 'D Altura total'], con: [['N1', 'Entrada de leche', 'Clamp sanitario 2"'], ['N2', 'Salida de suero', 'Válvula sanitaria 2"'], ['N3', 'Motorreductor del carro', 'Tensión a definir']], bom: [['Cuba de cuajado', 'AISI 304, pulido sanitario'], ['Chaqueta de calentamiento', 'AISI 304'], ['Carro con liras de corte', 'AISI 304'], ['Rieles del carro', 'AISI 304'], ['Válvula de desuerado', 'AISI 304'], ['Patas regulables (6)', 'AISI 304']] },
    pasteurizador: { letras: ['A Largo total', 'B Número de placas', 'C Altura', 'D Ancho del bastidor'], con: [['N1', 'Entrada de leche cruda', 'Clamp sanitario'], ['N2', 'Salida de leche pasteurizada', 'Clamp sanitario'], ['N3', 'Bomba sanitaria', 'Según caudal'], ['N4', 'Tablero con pantalla táctil', 'Tensión a definir']], bom: [['Bastidor fijo', 'AISI 304'], ['Placa de presión', 'AISI 304'], ['Placas de intercambio', 'AISI 316 (a confirmar)'], ['Empaques', 'Grado alimentario'], ['Barras guía y tornillos', 'AISI 304'], ['Tubo de retención', 'AISI 304'], ['Bomba sanitaria', 'AISI 304'], ['Tablero de control', 'Acero inoxidable']] },
    hiladora: { letras: ['A Largo', 'B Ancho', 'C Altura'], con: [['N1', 'Tolva de carga', 'Abierta'], ['N2', 'Salida de pasta', 'Canal'], ['N3', 'Entrada de agua caliente', 'Rosca 1" (a definir)']], bom: [['Cámara de hilado', 'AISI 304'], ['Tornillos de hilado (2)', 'AISI 304'], ['Tolva de carga', 'AISI 304'], ['Motorreductor', 'Motor IP55'], ['Patas regulables (4)', 'AISI 304']] },
    formadora: { letras: ['A Largo', 'B Ancho', 'C Altura'], con: [['N1', 'Tolva de alimentación', 'Abierta'], ['N2', 'Salida al agua fría', 'Banda']], bom: [['Cuerpo', 'AISI 304'], ['Tambor formador', 'AISI 304'], ['Banda de salida', 'Grado alimentario'], ['Tanque de enfriamiento', 'AISI 304']] },
    mantequillera: { letras: ['A Ø del tambor', 'B Altura total', 'C Ancho total'], con: [['N1', 'Compuerta de carga', 'Abatible con cierre'], ['N2', 'Motorreductor', 'Tensión a definir']], bom: [['Tambor de batido', 'AISI 304'], ['Soporte en A', 'AISI 304'], ['Eje y rodamientos', 'Acero inoxidable'], ['Motorreductor con guarda', 'Motor IP55']] },
    prensa: { letras: ['A Largo', 'B Ancho', 'C Altura', 'D Pistones'], con: [['N1', 'Alimentación de aire', 'Rosca 1/4" (a definir)'], ['N2', 'Unidad de mantenimiento', 'Filtro y regulador']], bom: [['Estructura', 'AISI 304'], ['Cilindros neumáticos', 'Cuerpo inoxidable'], ['Platos de presión', 'AISI 304'], ['Mesa con bandeja de escurrido', 'AISI 304'], ['Distribuidor de aire', 'Acero inoxidable']] },
    carro: { letras: ['A Ancho', 'B Fondo', 'C Altura', 'D Bandejas'], con: [], bom: [['Estructura tubular', 'AISI 304'], ['Bandejas perforadas', 'AISI 304'], ['Ruedas giratorias (4, 2 con freno)', 'Grado alimentario']] },
    meson: { letras: ['A Largo', 'B Fondo', 'C Altura'], con: [], bom: [['Superficie de trabajo', 'Acero inoxidable'], ['Entrepaños (2)', 'Acero inoxidable'], ['Patas con niveladores (4)', 'Acero inoxidable']] },
    canastilla: { letras: ['A Largo', 'B Ancho', 'C Alto'], con: [], bom: [['Canastilla perforada', 'Acero inoxidable'], ['Refuerzo perimetral', 'Acero inoxidable']] },
  };
  T.polivalente = { ...T.tina, bom: [['Tina polivalente', 'AISI 304, pulido sanitario'], ...T.tina.bom.slice(1)] };
  if (MOLDES[id]) return { letras: ['A Largo interno', 'B Ancho interno', 'C Alto'], con: [['N1', 'Seguidor de prensado', 'Con guía central']], bom: [['Cuerpo perforado', 'AISI 304'], ['Seguidor (tapa de prensado)', 'AISI 304'], ['Fondo perforado', 'AISI 304']] };
  if (!T[id]) throw new Error(`Sin datos de plano para el equipo «${id}». Agréguelo en datosTexto() de planos.js.`);
  return T[id];
}

export function crearPlano(id, capPedida) {
  const ficha = FICHAS[id] || FICHAS.enfriamiento;
  const eq = EQUIPOS[id] || EQUIPOS.enfriamiento;
  const caps = ficha.capacidades;
  const cap = caps.includes(capPedida) ? capPedida : caps[Math.floor((caps.length - 1) / 2)];
  const g = geometria(id, cap);
  const { letras, con, bom } = datosTexto(id);
  return {
    id, eq, ficha, cap, caps, geo: g, letras, conexiones: con, bom,
    linea: LINEAS.find((l) => l.id === eq.linea)?.nombre || '',
    tabla: caps.map((c) => ({ cap: c, vals: geometria(id, c).valores })),
    codigo: `EQX-DG-${eq.tag}-001`,
    capTexto: ficha.fija ? 'Medida única' : `${fmt(cap)} ${cap === 1 ? ({ pistones: 'pistón', moldes: 'molde' }[ficha.unidad] || ficha.unidad) : ficha.unidad}`,
  };
}
export const IDS_PLANOS = Object.keys(FICHAS);

// ---------- dibujo sobre jsPDF ----------
const ESTILO = { visible: [0.5, null], fina: [0.18, null], oculta: [0.25, [2.2, 1.2]], eje: [0.18, [7, 1.4, 1, 1.4]] };

function pluma(doc, ox, oy, s, enPlanta = false) {
  const X = (x) => ox + x / s, Y = (y) => (enPlanta ? oy + y / s : oy - y / s);
  const estilo = (t) => { const [w, d] = ESTILO[t] || ESTILO.visible; doc.setLineWidth(w); doc.setLineDashPattern(d || [], 0); doc.setDrawColor(...TINTA); };
  const p = {
    X, Y, s,
    linea(x1, y1, x2, y2, t = 'visible') { estilo(t); doc.line(X(x1), Y(y1), X(x2), Y(y2)); },
    poli(pts, t = 'visible', cerrar = false) { estilo(t); for (let i = 0; i < pts.length - 1; i++) doc.line(X(pts[i][0]), Y(pts[i][1]), X(pts[i + 1][0]), Y(pts[i + 1][1])); if (cerrar) doc.line(X(pts.at(-1)[0]), Y(pts.at(-1)[1]), X(pts[0][0]), Y(pts[0][1])); },
    rect(x, y, w, h, t = 'visible') { p.poli([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], t, true); },
    circulo(cx, cy, r, t = 'visible') { estilo(t); doc.circle(X(cx), Y(cy), r / s, 'S'); },
    // ángulos en grados, medidos en el sistema del modelo (y hacia arriba en alzado)
    elipse(cx, cy, rx, ry, a0, a1, t = 'visible') { const pts = []; for (let i = 0; i <= 40; i++) { const a = ((a0 + ((a1 - a0) * i) / 40) * Math.PI) / 180; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } p.poli(pts, t); },
    eje(x1, y1, x2, y2) { p.linea(x1, y1, x2, y2, 'eje'); },
    sombrear(x, y, w, h) { estilo('fina'); const paso = 4 * s; for (let k = paso; k < w + h; k += paso) { const ax = x + Math.max(0, k - h), ay = y + Math.min(k, h), bx = x + Math.min(k, w), by = y + Math.max(0, k - w); doc.line(X(ax), Y(ay), X(bx), Y(by)); } },
    perforar(x, y, w, h) { estilo('fina'); const paso = Math.max(30, 4.2 * s); for (let yy = y + paso / 2; yy < y + h; yy += paso) for (let xx = x + paso / 2; xx < x + w; xx += paso) doc.circle(X(xx), Y(yy), Math.max(0.35, 6 / s), 'S'); },
    globo(x, y, texto, lado = 1) {
      const px = X(x), py = Y(y), bx = px + lado * 11, by = py - 8;
      estilo('fina'); doc.line(px, py, bx - lado * 3.4, by + 1);
      doc.setFillColor(255, 255, 255); doc.setLineDashPattern([], 0); doc.circle(bx, by, 3.4, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...ROJO); doc.text(texto, bx, by + 0.85, { align: 'center' });
      doc.setFillColor(...TINTA); doc.circle(px, py, 0.5, 'F');
    },
  };
  return p;
}
function flecha(doc, x, y, ux, uy) {
  const L = 2.6, w = 0.75;
  doc.setFillColor(...TINTA);
  doc.triangle(x, y, x - ux * L - uy * w, y - uy * L + ux * w, x - ux * L + uy * w, y - uy * L - ux * w, 'F');
}
function cota(doc, p, c) {
  const off = (c.lado || 1) * (7 + 6.5 * (c.nivel || 0));
  doc.setLineDashPattern([], 0); doc.setLineWidth(0.18); doc.setDrawColor(...TINTA);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...ROJO);
  if (c.dir === 'h') {
    const x1 = p.X(c.a), x2 = p.X(c.b), yb = p.Y(c.en), yl = yb + off, sg = Math.sign(off);
    doc.line(x1, yb + sg * 1, x1, yl + sg * 1.6); doc.line(x2, yb + sg * 1, x2, yl + sg * 1.6);
    doc.line(x1, yl, x2, yl); flecha(doc, x1, yl, -1, 0); flecha(doc, x2, yl, 1, 0);
    doc.setFillColor(255, 255, 255); const tx = (x1 + x2) / 2; doc.rect(tx - 2.4, yl - 4.2, 4.8, 3.6, 'F'); doc.text(c.letra, tx, yl - 1.2, { align: 'center' });
  } else {
    const y1 = p.Y(c.a), y2 = p.Y(c.b), xb = p.X(c.en), xl = xb + off, sg = Math.sign(off);
    doc.line(xb + sg * 1, y1, xl + sg * 1.6, y1); doc.line(xb + sg * 1, y2, xl + sg * 1.6, y2);
    doc.line(xl, y1, xl, y2); const up = y2 < y1 ? -1 : 1; flecha(doc, xl, y1, 0, -up); flecha(doc, xl, y2, 0, up);
    doc.setFillColor(255, 255, 255); const ty = (y1 + y2) / 2; doc.rect(xl - 4.2, ty - 2.4, 3.6, 4.8, 'F'); doc.text(c.letra, xl - 1.2, ty, { align: 'center', angle: 90 });
  }
}
function celda(doc, x, y, w, h, etiqueta, valor, negrita = false) {
  doc.setDrawColor(...TINTA); doc.setLineWidth(0.25); doc.setLineDashPattern([], 0); doc.rect(x, y, w, h);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.setTextColor(...GRIS); doc.text(etiqueta.toUpperCase(), x + 1.6, y + 3);
  doc.setFont('helvetica', negrita ? 'bold' : 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TINTA);
  doc.text(limpiar(valor), x + 1.6, y + h - 3);
}
function tabla(doc, x, y, titulo, cabeza, filas, anchos, resaltar = -1) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...TINTA); doc.text(titulo, x, y);
  y += 1.8;
  const total = anchos.reduce((a, b) => a + b, 0), tam = 6.8;
  doc.setFillColor(...TINTA); doc.rect(x, y, total, 5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255); doc.setFontSize(6.3);
  let cx = x; cabeza.forEach((c, i) => { doc.text(limpiar(c), cx + 1.4, y + 3.5); cx += anchos[i]; });
  y += 5;
  filas.forEach((f, fi) => {
    const lineas = f.map((c, i) => doc.splitTextToSize(limpiar(c), anchos[i] - 2.6));
    const h = Math.max(...lineas.map((l) => l.length)) * 2.7 + 1.8;
    if (fi === resaltar) { doc.setFillColor(...RESALTE); doc.rect(x, y, total, h, 'F'); }
    doc.setDrawColor(...PAPEL); doc.setLineWidth(0.2); doc.setLineDashPattern([], 0); doc.line(x, y + h, x + total, y + h);
    doc.setFont('helvetica', fi === resaltar ? 'bold' : 'normal'); doc.setFontSize(tam); doc.setTextColor(...TINTA);
    cx = x; lineas.forEach((l, i) => { doc.text(l, cx + 1.4, y + 2.9); cx += anchos[i]; });
    y += h;
  });
  return y + 5.5;
}

export function dibujarPlano(doc, plano, { logo, fecha = '' } = {}) {
  const W = 420, H = 297, g = plano.geo;
  doc.setLineDashPattern([], 0);
  // Marco (ISO 5457): margen de archivo de 20 mm a la izquierda y referencias de zona
  doc.setDrawColor(...TINTA); doc.setLineWidth(0.7); doc.rect(20, 10, W - 30, H - 20);
  doc.setLineWidth(0.25);
  const cols = 8, filas = 6, aZ = (W - 30) / cols, hZ = (H - 20) / filas;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRIS);
  for (let i = 0; i < cols; i++) { const x = 20 + aZ * (i + 0.5); doc.text(String(i + 1), x, 8.3, { align: 'center' }); doc.text(String(i + 1), x, H - 5.5, { align: 'center' }); if (i) { doc.line(20 + aZ * i, 10, 20 + aZ * i, 12.5); doc.line(20 + aZ * i, H - 12.5, 20 + aZ * i, H - 10); } }
  for (let j = 0; j < filas; j++) { const y = 10 + hZ * (j + 0.5) + 1; const l = 'ABCDEF'[j]; doc.text(l, 16, y, { align: 'center' }); doc.text(l, W - 6.5, y, { align: 'center' }); if (j) { doc.line(20, 10 + hZ * j, 22.5, 10 + hZ * j); doc.line(W - 12.5, 10 + hZ * j, W - 10, 10 + hZ * j); } }

  // Vistas en primer diedro: planta debajo del alzado, vista lateral (desde la izquierda) a la derecha
  const area = { x: 26, y: 16, w: 244, h: 210 };
  const anchoF = g.xMax - g.xMin, anchoL = g.lateral ? g.latMax - g.latMin : 0;
  const margenW = g.lateral ? 70 : 44, margenH = 66;
  const s = ESCALAS.find((k) => (anchoF + anchoL) / k <= area.w - margenW && (g.alto + g.prof) / k <= area.h - margenH) || 100;
  const fw = anchoF / s, lw = anchoL / s, fh = g.alto / s, pd = g.prof / s;
  const gap = g.lateral ? 30 : 0;
  const xIzq = area.x + 16 + (area.w - margenW - (fw + lw)) / 2;
  const oxF = xIzq - g.xMin / s;
  const yPiso = area.y + 22 + fh;
  const pF = pluma(doc, oxF, yPiso, s);
  g.frente(pF);
  const yPlanta = yPiso + 24 + pd / 2;
  const pP = pluma(doc, oxF, yPlanta, s, true);
  g.planta(pP);
  let pL = null, oxL = 0;
  if (g.lateral) { oxL = xIzq + fw + gap - g.latMin / s; pL = pluma(doc, oxL, yPiso, s); g.lateral(pL); }
  const plumas = { frente: pF, planta: pP, lateral: pL };
  g.cotas.forEach((c) => plumas[c.vista] && cota(doc, plumas[c.vista], c));
  (g.textos || []).forEach((t) => { const p = plumas[t.vista]; doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...ROJO); doc.setFillColor(255, 255, 255); const tw = doc.getTextWidth(t.texto) + 3; doc.rect(p.X(t.x) - tw / 2, p.Y(t.y) - 3.4, tw, 4.6, 'F'); doc.text(t.texto, p.X(t.x), p.Y(t.y), { align: 'center' }); });

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...TINTA);
  const cxF = oxF + (g.xMin + g.xMax) / 2 / s;
  doc.text('ALZADO', cxF, area.y + 5, { align: 'center' });
  doc.text('PLANTA', cxF, yPlanta + pd / 2 + 16, { align: 'center' });
  if (g.lateral) doc.text(plano.id === 'tina' || plano.id === 'polivalente' ? 'CORTE TRANSVERSAL' : 'VISTA LATERAL', oxL + (g.latMin + g.latMax) / 2 / s, area.y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRIS);
  doc.text(`Escala 1:${s}`, cxF, area.y + 8.5, { align: 'center' });

  // Tablas
  const tx = 277, tw = 129;
  let ty = 19;
  const letras = plano.letras.map((t) => t.split(' ')[0]);
  const nombres = plano.letras.map((t) => t.split(' ').slice(1).join(' '));
  const unidad = plano.ficha.fija ? '' : plano.ficha.unidad;
  const aL = Math.min(18, (tw - 26) / letras.length);
  ty = tabla(doc, tx, ty, 'DIMENSIONES POR CAPACIDAD (mm)', [unidad ? `Cap. (${unidad})` : 'Medida', ...letras], plano.tabla.map((r) => [plano.ficha.fija ? 'Única' : fmt(r.cap), ...r.vals.map((v) => fmt(v))]), [26, ...letras.map(() => aL)], plano.tabla.findIndex((r) => r.cap === plano.cap));
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.3); doc.setTextColor(...GRIS);
  const ley = doc.splitTextToSize(letras.map((l, i) => `${l}: ${nombres[i]}`).join('   ·   '), tw);
  doc.text(ley, tx, ty - 2.5); ty += ley.length * 2.6 + 2.5;
  if (plano.conexiones.length) ty = tabla(doc, tx, ty, 'CONEXIONES', ['N.º', 'Servicio', 'Tipo / tamaño'], plano.conexiones, [12, 62, 55]);
  tabla(doc, tx, ty, 'LISTA DE MATERIALES', ['Ítem', 'Descripción', 'Material', 'Cant.'], plano.bom.map(([d, m], i) => [String(i + 1), d, m, '1']), [10, 57, 50, 12]);

  // Notas
  const notas = [
    'Medidas en milímetros. Valores de muestra calculados a partir de la capacidad; se confirman en la visita técnica.',
    `Material en contacto con el producto: ${plano.ficha.comunes[0][1]}.`,
    'Superficies en contacto lisas, no porosas y de fácil limpieza (Resolución 2674 de 2013). Rugosidad objetivo a definir por Equinox.',
    'Soldaduras continuas, sin rincones, pulidas en la zona de producto. Tolerancias generales ISO 2768-m salvo indicación.',
    'Las partes a presión, como chaquetas a vapor, requieren cálculo y aprobación de ingeniería antes de fabricar.',
  ];
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...TINTA); doc.text('NOTAS', 26, 238);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6);
  let ny = 242.5; notas.forEach((n, i) => { const l = doc.splitTextToSize(`${i + 1}. ${n}`, 196); doc.text(l, 26, ny); ny += l.length * 2.8 + 0.8; });

  // Sello preliminar
  doc.setDrawColor(...ROJO); doc.setTextColor(...ROJO); doc.setLineWidth(0.6); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  const sello = 'PRELIMINAR · NO APTO PARA FABRICACIÓN', swd = doc.getTextWidth(sello) + 8;
  doc.rect(408 - swd, 223.5, swd, 7.5); doc.rect(407 - swd, 222.5, swd + 2, 9.5);
  doc.text(sello, 412 - swd, 228.8);

  // Cajetín (ISO 7200)
  const cx = 230, cy = 233;
  doc.setDrawColor(...TINTA); doc.setLineWidth(0.5); doc.setLineDashPattern([], 0); doc.rect(cx, cy, 180, 54);
  doc.setLineWidth(0.25); doc.rect(cx, cy, 50, 22); doc.rect(cx + 50, cy, 130, 22);
  if (logo) { const lw2 = 44, lh = (lw2 * logo.h) / logo.w; doc.addImage(logo.url, 'PNG', cx + 3, cy + 11 - lh / 2, lw2, lh); }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...GRIS); doc.text('INDUSTRIAS EQUINOX COLOMBIA · PLANO DE DISPOSICIÓN GENERAL', cx + 52, cy + 4);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...TINTA);
  const tit = doc.splitTextToSize(limpiar(plano.eq.nombre), 124); doc.text(tit[0], cx + 52, cy + 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.text(limpiar(`${plano.linea} · Capacidad de esta hoja: ${plano.capTexto}`), cx + 52, cy + 18.5);
  let fx = cx;
  [['Plano N.º', plano.codigo, 60], ['Rev.', '0', 18], ['Escala', `1:${s}`, 26], ['Formato', 'A3', 20], ['Proyección', '1.er diedro (ISO E)', 36], ['Unidades', 'mm', 20]].forEach(([e, v, w]) => { celda(doc, fx, cy + 22, w, 16, e, v, e === 'Plano N.º'); fx += w; });
  fx = cx;
  [['Fecha', fecha, 30], ['Dibujó', 'Equinox · generado', 40], ['Revisó', '', 40], ['Aprobó (ingeniero con matrícula)', '', 70]].forEach(([e, v, w]) => { celda(doc, fx, cy + 38, w, 16, e, v); fx += w; });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...GRIS); doc.text('Hoja 1 de 1', 408, cy + 52.8, { align: 'right' });
  return { escala: s };
}
