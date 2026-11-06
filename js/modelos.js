// Modelos 3D de los equipos Equinox, hechos por código (Three.js).
// Cada constructor devuelve { grupo, partes, pasos, cortable, animar, hud, puertos, huella }.
// Unidades en metros, piso en y = 0, origen en el centro de la huella.
import * as THREE from 'three';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
const suave = (x) => x * x * (3 - 2 * x);
const ciclo = (tp, dur, pausa = 1.4) => Math.min(1, (tp % (dur + pausa)) / dur);

// ---------- texturas compartidas ----------
let texCepillado, texPerforado;
function cepillado() {
  if (texCepillado) return texCepillado;
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 900; i++) { const v = 100 + Math.random() * 70; g.fillStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.35})`; g.fillRect(0, Math.random() * 64, 512, Math.random() * 1.4 + 0.3); }
  texCepillado = new THREE.CanvasTexture(c); texCepillado.wrapS = texCepillado.wrapT = THREE.RepeatWrapping; texCepillado.repeat.set(1, 6);
  return texCepillado;
}
function perforado() {
  if (texPerforado) return texPerforado;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#000';
  for (let y = 8; y < 128; y += 16) for (let x = (y / 16) % 2 ? 16 : 8; x < 128; x += 16) { g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill(); }
  texPerforado = new THREE.CanvasTexture(c); texPerforado.wrapS = texPerforado.wrapT = THREE.RepeatWrapping; texPerforado.repeat.set(3, 3);
  return texPerforado;
}

export function crearMateriales({ planos = null } = {}) {
  const corte = planos ? { clippingPlanes: planos, clipIntersection: true } : {};
  const rug = cepillado();
  // Acero cepillado: poco áspero para que se vean las franjas de luz del entorno (estudio.js) y anisotropía para el brillo alargado del cepillado
  const acero = new THREE.MeshPhysicalMaterial({ color: 0xe2e6eb, metalness: 1, roughness: 0.2, roughnessMap: rug, anisotropy: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.2, side: THREE.DoubleSide, ...corte });
  const aceroInt = new THREE.MeshPhysicalMaterial({ color: 0xf1f4f7, metalness: 1, roughness: 0.14, roughnessMap: rug, side: THREE.DoubleSide, emissive: 0x000000, ...corte });
  const aislante = new THREE.MeshStandardMaterial({ color: 0xe9c66a, roughness: 0.92, side: THREE.DoubleSide, emissive: 0x000000, ...corte });
  const chaqueta = new THREE.MeshPhysicalMaterial({ color: 0xd3d9e0, metalness: 1, roughness: 0.24, roughnessMap: rug, anisotropy: 0.45, side: THREE.DoubleSide, emissive: 0x000000, ...corte });
  const piezas = new THREE.MeshPhysicalMaterial({ color: 0xd9dee4, metalness: 1, roughness: 0.16, roughnessMap: rug, anisotropy: 0.4 });
  const pulido = new THREE.MeshPhysicalMaterial({ color: 0xeef2f6, metalness: 1, roughness: 0.1 });
  const pintura = new THREE.MeshStandardMaterial({ color: 0x0b1466, roughness: 0.45, metalness: 0.2 });
  const goma = new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.8 });
  const pantalla = new THREE.MeshStandardMaterial({ color: 0x0a0f2c, emissive: 0x3fb8ff, emissiveIntensity: 0.55, roughness: 0.3 });
  const leche = new THREE.MeshPhysicalMaterial({ color: 0xf7f4ec, roughness: 0.35, sheen: 0.4 });
  const cuajada = new THREE.MeshStandardMaterial({ color: 0xf2e6bf, roughness: 0.6 });
  const suero = new THREE.MeshStandardMaterial({ color: 0xe6e09a, roughness: 0.4, transparent: true, opacity: 0.85 });
  const crema = new THREE.MeshStandardMaterial({ color: 0xf6e7a8, roughness: 0.5 });
  const vidrio = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.35 });
  const caliente = new THREE.MeshBasicMaterial({ color: 0xe0442b });
  const frio = new THREE.MeshBasicMaterial({ color: 0x2f8cff });
  const blanco = new THREE.MeshBasicMaterial({ color: 0xfdfcf7 });
  const vapor = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
  const perf = new THREE.MeshPhysicalMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.28, alphaMap: perforado(), alphaTest: 0.5, side: THREE.DoubleSide });
  return { acero, aceroInt, aislante, chaqueta, piezas, pulido, pintura, goma, pantalla, leche, cuajada, suero, crema, vidrio, caliente, frio, blanco, vapor, perf, cortables: [acero, aceroInt, aislante, chaqueta] };
}

// ---------- utilidades de geometría ----------
const malla = (geo, mat, p = [0, 0, 0], r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); return m; };
const cil = (rt, rb, h, mat, p, r, seg = 32, abierto = false) => malla(new THREE.CylinderGeometry(rt, rb, h, seg, 1, abierto), mat, p, r);
const caja = (w, h, d, mat, p, r) => malla(new THREE.BoxGeometry(w, h, d), mat, p, r);
const grupo = (...h) => { const g = new THREE.Group(); h.flat().forEach((x) => x && g.add(x)); return g; };
function barra(a, b, r, mat) {
  const A = V(...a), B = V(...b);
  const m = cil(r, r, A.distanceTo(B), mat, [0, 0, 0], [0, 0, 0], 16);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
function tuboCurva(puntos, r, mat) {
  const curva = new THREE.CatmullRomCurve3(puntos.map((p) => V(...p)), false, 'catmullrom', 0.05);
  return malla(new THREE.TubeGeometry(curva, 64, r, 10), mat);
}
class Helice extends THREE.Curve {
  constructor(r, paso, largo) { super(); this.r = r; this.paso = paso; this.largo = largo; }
  getPoint(t, o = new THREE.Vector3()) { const x = -this.largo / 2 + t * this.largo; const a = (x / this.paso) * Math.PI * 2; return o.set(x, Math.cos(a) * this.r, Math.sin(a) * this.r); }
}
function perfilCasco(R, yFc, yFb, yP, yD) {
  const pts = [new THREE.Vector2(0, yFc), new THREE.Vector2(R * 0.97, yFb), new THREE.Vector2(R, yFb + 0.03), new THREE.Vector2(R, yP)];
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.001, Math.cos(a) * R), yP + Math.sin(a) * (yD - yP))); }
  return pts;
}
const casco = (R, yFc, yFb, yP, yD, mat) => malla(new THREE.LatheGeometry(perfilCasco(R, yFc, yFb, yP, yD), 72), mat);
function patas(n, R, h, mat, ang0 = Math.PI / 4) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = ang0 + (i * Math.PI * 2) / n;
    g.add(cil(0.035, 0.035, h, mat, [Math.cos(a) * R, h / 2, Math.sin(a) * R], [0, 0, 0], 16));
    g.add(cil(0.07, 0.08, 0.04, mat, [Math.cos(a) * R, 0.02, Math.sin(a) * R], [0, 0, 0], 20));
  }
  return g;
}
function nivel(r, y0, hMax, mat) {
  const geo = new THREE.CylinderGeometry(r, r, 1, 48); geo.translate(0, 0.5, 0);
  const m = malla(geo, mat, [0, y0, 0]);
  m.userData.fijar = (f) => { m.scale.y = Math.max(0.001, f * hMax); m.visible = f > 0.01; };
  m.userData.fijar(0.6);
  return m;
}
const dummy = new THREE.Object3D();
function particulas(n, r, mat) { const im = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 8, 6), mat, n); im.frustumCulled = false; im.visible = false; return im; }
function enCurva(im, curva, t, vel, escala = 1) {
  const n = im.count;
  for (let i = 0; i < n; i++) { const u = (((i / n) + t * vel) % 1 + 1) % 1; dummy.position.copy(curva.getPointAt(u)); dummy.scale.setScalar(escala); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }
  im.instanceMatrix.needsUpdate = true;
}
function fluyendo(im, mostrar) { im.visible = mostrar; }

// Registro de piezas para la vista explosionada
function registro() {
  const partes = [];
  const P = (nombre, obj, off = [0, 0, 0], explotar) => { partes.push({ nombre, obj, off: V(...off), base: obj.position.clone(), explotar }); return obj; };
  return { partes, P };
}

// ---------- recipiente vertical (tanques, silo, fermentador) ----------
function recipiente(M, cfg) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  const { R, yFc, yFb, yP, yD } = cfg;
  const k = R / 0.6;
  const exterior = casco(R * 1.07, yFc - 0.04, yFb - 0.04, yP, yD + 0.05, M.acero);
  const capa = casco(R * 1.035, yFc - 0.02, yFb - 0.02, yP, yD + 0.025, cfg.chaqueta ? M.chaqueta : M.aislante);
  const interior = casco(R, yFc, yFb, yP, yD, M.aceroInt);
  g.add(P('Pared exterior', exterior, [R * 2.6, 0, 0]), P(cfg.chaqueta ? 'Chaqueta térmica' : 'Aislamiento de poliuretano', capa, [R * 1.3, 0, 0]), P(cfg.nombreInterior || 'Tanque interior pulido', interior));
  const leche = nivel(R * 0.985, yFb + 0.01, yP - yFb - 0.06, cfg.contenido || M.leche);
  g.add(leche);

  const altoPata = cfg.patasH ?? yFb;
  g.add(P('Patas regulables', patas(cfg.patas || 4, R * 0.85, altoPata, M.piezas), [0, -0.6 * k, 0]));

  let agitador = null;
  if (cfg.agitador) {
    agitador = new THREE.Group();
    const largo = yD - (yFb + 0.12);
    agitador.add(cil(0.022, 0.022, largo, M.piezas, [0, yFb + 0.12 + largo / 2, 0], [0, 0, 0], 12));
    if (cfg.agitador === 'helice') {
      for (let i = 0; i < 3; i++) agitador.add(caja(0.32 * k, 0.02, 0.09, M.piezas, [0, yFb + 0.22, 0], [0.5, (i * Math.PI * 2) / 3, 0]));
    } else if (cfg.agitador === 'ancla') {
      agitador.add(tuboCurva([[-R * 0.9, yP - 0.1, 0], [-R * 0.92, yFb + 0.1, 0], [0, yFb + 0.05, 0], [R * 0.92, yFb + 0.1, 0], [R * 0.9, yP - 0.1, 0]], 0.02, M.piezas));
    } else {
      [0.32, 0.62].forEach((f, i) => agitador.add(caja(R * 1.7, 0.13 * k, 0.02, M.piezas, [0, yFb + (yP - yFb) * f, 0], [0, i ? Math.PI / 2 : 0, 0])));
    }
    g.add(P(cfg.agitador === 'helice' ? 'Agitador de hélice' : 'Agitador de paletas', agitador, [0, (yD - yFb) * 0.95, 0]));
    const motor = grupo(
      caja(R * 1.8, 0.05, 0.2, M.piezas, [0, yD + 0.08, 0]),
      caja(0.24, 0.18, 0.24, M.piezas, [0, yD + 0.2, 0]),
      cil(0.11, 0.11, 0.32, M.pintura, [0.28, yD + 0.21, 0], [0, 0, Math.PI / 2]),
    );
    g.add(P('Motorreductor', motor, [0, (yD - yFb) * 1.35, 0]));
  }

  const dTapa = Math.hypot(cfg.tapa?.[0] ?? -0.3 * k, cfg.tapa?.[1] ?? 0.3 * k);
  const yTapa = yP + (yD - yP) * Math.sqrt(Math.max(0, 1 - (dTapa / R) ** 2));
  const tapa = grupo(malla(new THREE.TorusGeometry(0.2 * Math.min(k, 1.4), 0.022, 12, 40), M.piezas, [0, 0, 0], [Math.PI / 2, 0, 0]), cil(0.195 * Math.min(k, 1.4), 0.195 * Math.min(k, 1.4), 0.035, M.piezas, [0, 0, 0], [0, 0, 0], 40), malla(new THREE.TorusGeometry(0.07, 0.011, 8, 20, Math.PI), M.piezas, [0, 0.025, 0]));
  tapa.position.set(cfg.tapa?.[0] ?? -0.3 * k, yTapa + 0.02, cfg.tapa?.[1] ?? 0.3 * k);
  tapa.rotation.set(0.14, 0, 0.14);
  g.add(P('Tapa de inspección', tapa, [-0.5 * k, 0.9 * k, 0.4 * k]));

  // Válvula
  const valv = new THREE.Group();
  const manija = caja(0.03, 0.03, 0.24, M.pintura, [0.36, 0.08, 0.1]);
  valv.add(cil(0.04, 0.04, 0.42, M.piezas, [0.21, 0, 0], [0, 0, Math.PI / 2], 16), cil(0.07, 0.07, 0.09, M.piezas, [0.36, 0, 0], [0, 0, Math.PI / 2], 20), manija);
  let salida;
  if (cfg.valvula === 'fondo') {
    valv.position.set(0, yFc - 0.12, 0);
    valv.add(cil(0.04, 0.04, 0.14, M.piezas, [0, 0.07, 0], [0, 0, 0], 16));
    valv.rotation.y = -Math.PI * 0.3;
    salida = V(Math.cos(Math.PI * 0.3) * 0.42, yFc - 0.12, Math.sin(Math.PI * 0.3) * 0.42);
  } else {
    const a = -0.9;
    valv.position.set(Math.sin(a) * R, yFb + 0.08, Math.cos(a) * R);
    valv.rotation.y = a - Math.PI / 2;
    salida = V(Math.sin(a) * (R + 0.42), yFb + 0.08, Math.cos(a) * (R + 0.42));
  }
  g.add(P(cfg.valvula === 'fondo' ? 'Válvula sanitaria de fondo' : 'Válvula sanitaria de descarga', valv, cfg.valvula === 'fondo' ? [0.3 * k, -0.45 * k, 0.3 * k] : [-0.6 * k, -0.1, 0.6 * k]));

  if (cfg.tablero !== false) {
    const a = -0.35;
    const tab = grupo(caja(0.34, 0.22, 0.05, M.piezas), malla(new THREE.PlaneGeometry(0.22, 0.1), M.pantalla, [0, 0, 0.027]));
    tab.position.set(Math.sin(a) * (R * 1.07 + 0.03), (yFb + yP) / 2 + 0.1, Math.cos(a) * (R * 1.07 + 0.03));
    tab.rotation.y = a;
    g.add(P('Tablero de control', tab, [Math.sin(a) * 0.9 * k, 0, Math.cos(a) * 0.9 * k]));
  }
  if (cfg.escalera) {
    const a = 1.25, r0 = R * 1.07 + 0.2;
    const esc = new THREE.Group();
    const t = V(Math.cos(a), 0, -Math.sin(a));
    const c = V(Math.sin(a) * r0, 0, Math.cos(a) * r0);
    [-0.18, 0.18].forEach((s) => esc.add(barra([c.x + t.x * s, 0, c.z + t.z * s], [c.x + t.x * s, yD + 0.5, c.z + t.z * s], 0.018, M.piezas)));
    for (let y = 0.3; y < yD + 0.4; y += 0.3) esc.add(barra([c.x - t.x * 0.18, y, c.z - t.z * 0.18], [c.x + t.x * 0.18, y, c.z + t.z * 0.18], 0.012, M.piezas));
    esc.add(malla(new THREE.TorusGeometry(R * 0.55, 0.015, 8, 48), M.piezas, [0, yD + 0.35, 0], [Math.PI / 2, 0, 0]));
    g.add(P('Escalera y baranda', esc, [Math.sin(a) * 1.4 * k, 0, Math.cos(a) * 1.4 * k]));
  }
  if (cfg.mirilla) {
    const a = -1.5, r0 = R * 1.07 + 0.07;
    const mir = grupo(cil(0.022, 0.022, yP - yFb - 0.3, M.vidrio, [0, (yP + yFb) / 2, 0], [0, 0, 0], 12), caja(0.06, 0.04, 0.06, M.piezas, [0, yFb + 0.15, 0]), caja(0.06, 0.04, 0.06, M.piezas, [0, yP - 0.15, 0]));
    mir.position.set(Math.sin(a) * r0, 0, Math.cos(a) * r0);
    g.add(P('Indicador de nivel', mir, [Math.sin(a) * 0.9 * k, 0, Math.cos(a) * 0.9 * k]));
  }

  // Partículas: chorro de descarga y vapor
  const chorro = particulas(26, 0.018 * Math.max(1, k * 0.8), M.leche);
  const curvaChorro = new THREE.CatmullRomCurve3([salida.clone(), salida.clone().add(V(0.05, -0.12, 0.05)), V(salida.x * 1.05, 0.02, salida.z * 1.05)]);
  const burbujas = particulas(18, 0.03, M.vapor);
  g.add(chorro, burbujas);

  const pasos = cfg.pasos;
  const orden = Object.keys(pasos);
  let temp = cfg.tempInicial ?? 35;
  return {
    grupo: g, partes, pasos: orden, cortable: true,
    puertos: { entrada: V(0, yD + 0.1, 0), salida },
    huella: { w: R * 2.4, d: R * 2.4 },
    animar(dt, t, paso, tp) {
      const a = pasos[paso] || cfg.reposo || { nivel: 0.62, agit: 0.4 };
      let f = Array.isArray(a.nivel) ? a.nivel[0] + (a.nivel[1] - a.nivel[0]) * suave(ciclo(tp, a.nivel[2] || 4)) : (a.nivel ?? 0.62);
      leche.userData.fijar(f);
      if (agitador && !reducido) agitador.rotation.y += dt * (a.agit ?? 0.4) * 2.2;
      const fr = a.frio ? a.frio * (0.55 + 0.25 * Math.sin(t * 3)) : 0;
      const ca = a.calor ? a.calor * (0.55 + 0.25 * Math.sin(t * 3)) : 0;
      M.aceroInt.emissive.setRGB(ca * 0.55, ca * 0.12 + fr * 0.18, fr * 0.6);
      M.chaqueta.emissive.setRGB(ca * 0.6, ca * 0.1 + fr * 0.2, fr * 0.7);
      manija.rotation.y = a.valvula ? -Math.PI / 2 : 0;
      fluyendo(chorro, !!a.valvula && f > 0.05);
      if (a.valvula) enCurva(chorro, curvaChorro, t, 0.9);
      fluyendo(burbujas, !!a.burbujas);
      if (a.burbujas) {
        for (let i = 0; i < burbujas.count; i++) {
          const u = ((i * 0.37 + t * 0.25) % 1);
          const ang = i * 2.39;
          dummy.position.set(Math.cos(ang) * R * 0.6 * ((i % 5) / 5 + 0.2), yFb + (yP - yFb) * f * u, Math.sin(ang) * R * 0.6 * ((i % 5) / 5 + 0.2));
          dummy.scale.setScalar(0.4 + u * 0.6); dummy.updateMatrix(); burbujas.setMatrixAt(i, dummy.matrix);
        }
        burbujas.instanceMatrix.needsUpdate = true;
      }
      if (a.temp) { const [t0, t1, d] = a.temp; temp = t0 + (t1 - t0) * suave(ciclo(tp, d || 5)); } else temp = cfg.tempInicial ?? 35;
      this._nivel = f; this._temp = temp;
    },
    hud(paso) {
      const a = pasos[paso];
      if (!a) return null;
      const filas = [['Nivel', `${fmt(this._nivel * 100)} %`]];
      if (a.mostrarTemp !== false) filas.push(['Temperatura', `${fmt(this._temp, 1)} °C`]);
      if (a.dato) filas.push(a.dato);
      return filas;
    },
  };
}

const tanqueEnfriamiento = (M) => recipiente(M, {
  R: 0.6, yFc: 0.42, yFb: 0.48, yP: 1.42, yD: 1.64, agitador: 'paletas', tapa: [-0.3, 0.3],
  pasos: {
    llenado: { nivel: [0.05, 0.85, 4], agit: 0.2, dato: ['Entrada', 'Leche del ordeño'] },
    enfriamiento: { nivel: 0.85, frio: 1, agit: 0.6, temp: [35, 4, 5] },
    agitacion: { nivel: 0.85, agit: 1.6, frio: 0.5, tempInicial: 4, temp: [4, 4, 1], dato: ['Agitador', 'Lento, sin batir la grasa'] },
    descarga: { nivel: [0.85, 0.08, 5], valvula: 1, agit: 0.3, temp: [4, 4, 1], dato: ['Salida', 'Al carrotanque'] },
  },
});
const tanqueMezcla = (M) => recipiente(M, {
  R: 0.6, yFc: 0.4, yFb: 0.46, yP: 1.4, yD: 1.58, agitador: 'helice', chaqueta: true, tempInicial: 8, tapa: [-0.3, 0.3],
  pasos: {
    carga: { nivel: [0.05, 0.75, 4], agit: 0.2, dato: ['Entrada', 'Leche e ingredientes'] },
    mezcla: { nivel: 0.75, agit: 3.5, burbujas: true, dato: ['Agitador', 'Hélice de alta velocidad'] },
    calentamiento: { nivel: 0.75, agit: 1.2, calor: 1, temp: [8, 65, 5] },
    descarga: { nivel: [0.75, 0.08, 5], valvula: 1, agit: 0.4, temp: [65, 65, 1] },
  },
});
const silo = (M) => recipiente(M, {
  R: 1.0, yFc: 0.55, yFb: 0.95, yP: 3.6, yD: 3.85, agitador: 'paletas', escalera: true, mirilla: true, valvula: 'fondo', tapa: [0.2, -0.45], tempInicial: 4,
  pasos: {
    recibo: { nivel: [0.05, 0.8, 5], agit: 0.2, frio: 0.3, temp: [6, 4, 5], dato: ['Entrada', 'Desde el carrotanque'] },
    conservacion: { nivel: 0.8, agit: 0.3, frio: 0.8, temp: [4, 4, 1], dato: ['Aislamiento', 'Mantiene la temperatura'] },
    agitacion: { nivel: 0.8, agit: 1.2, frio: 0.4, temp: [4, 4, 1], dato: ['Agitador', 'Periódico y lento'] },
    despacho: { nivel: [0.8, 0.1, 6], valvula: 1, agit: 0.3, temp: [4, 4, 1], dato: ['Salida', 'A proceso o envasado'] },
  },
});
const fermentador = (M) => recipiente(M, {
  R: 0.58, yFc: 0.36, yFb: 0.72, yP: 1.62, yD: 1.8, agitador: 'ancla', chaqueta: true, valvula: 'fondo', patas: 3, tapa: [-0.28, 0.28], tempInicial: 8,
  pasos: {
    llenado: { nivel: [0.05, 0.8, 4], agit: 0.2, dato: ['Entrada', 'Leche pasteurizada'] },
    calentamiento: { nivel: 0.8, agit: 0.6, calor: 1, temp: [8, 43, 5] },
    fermentacion: { nivel: 0.8, agit: 0, calor: 0.25, temp: [43, 43, 1], dato: ['Reposo', '4 a 6 horas (muestra)'] },
    enfriamiento: { nivel: 0.8, agit: 0.5, frio: 1, temp: [43, 6, 5] },
    descarga: { nivel: [0.8, 0.06, 5], valvula: 1, agit: 0.2, temp: [6, 6, 1] },
  },
});

// ---------- pasteurizador a placas ----------
function pasteurizador(M) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  const yC = 0.78, N = 26, x0 = -0.72, paso = 0.028;
  g.add(P('Bastidor fijo', grupo(caja(0.12, 1.3, 0.72, M.acero, [-0.86, yC, 0]), caja(0.3, 0.06, 0.8, M.piezas, [-0.86, 0.03, 0])), [-0.5, 0, 0]));
  g.add(P('Columna de soporte', grupo(caja(0.08, 1.45, 0.12, M.piezas, [0.98, 0.725, 0]), caja(0.3, 0.06, 0.4, M.piezas, [0.98, 0.03, 0])), [0.7, 0, 0]));
  g.add(P('Barras guía', grupo(barra([-0.86, 1.45, 0], [0.98, 1.45, 0], 0.03, M.pulido), barra([-0.86, 0.14, 0], [0.98, 0.14, 0], 0.025, M.pulido)), [0, 0.55, 0]));
  const placas = new THREE.Group();
  const matsPlaca = [];
  for (let i = 0; i < N; i++) {
    const mat = M.piezas.clone(); mat.color.set(0xe6eaef); mat.roughness = 0.35; mat.emissive = new THREE.Color(0x000000); matsPlaca.push(mat);
    const pl = grupo(caja(0.012, 1.05, 0.5, mat), caja(0.003, 0.96, 0.42, M.goma, [0.0075, 0, 0]));
    pl.position.set(x0 + i * paso, yC, 0);
    pl.userData.base = pl.position.x;
    placas.add(pl);
  }
  g.add(P('Paquete de placas', placas, [0, 0, 0], (f) => placas.children.forEach((pl, i) => { pl.position.x = pl.userData.base + i * 0.05 * f; })));
  const presion = caja(0.08, 1.2, 0.62, M.acero, [x0 + N * paso + 0.05, yC, 0]);
  g.add(P('Placa de presión', presion, [1.35, 0, 0]));
  g.add(P('Tornillos de apriete', grupo([[0.62, 0.36], [0.62, -0.36], [0.95, 0.36], [0.95, -0.36]].map(([y, z]) => barra([-0.94, yC + (y - 0.78) * 1, z], [0.12, yC + (y - 0.78), z], 0.014, M.piezas))), [0, -0.5, 0.55]));
  const puertos = grupo([[1.22, 0.24], [1.22, -0.24], [0.34, 0.24], [0.34, -0.24]].map(([y, z]) => cil(0.04, 0.04, 0.16, M.piezas, [-1.0, y, z], [0, 0, Math.PI / 2], 16)));
  g.add(P('Conexiones sanitarias', puertos, [-0.45, 0, 0]));
  const serpentin = malla(new THREE.TubeGeometry(new Helice(0.13, 0.11, 1.0), 220, 0.022, 8), M.pulido, [0, 0.5, -0.78]);
  g.add(P('Tubo de retención', serpentin, [0, 0, -0.6]));
  const tablero = grupo(caja(0.5, 0.7, 0.16, M.acero, [0, 1.15, 0]), malla(new THREE.PlaneGeometry(0.32, 0.22), M.pantalla, [0, 1.22, 0.082]), cil(0.03, 0.03, 0.8, M.piezas, [0, 0.4, 0], [0, 0, 0], 12), caja(0.3, 0.04, 0.3, M.piezas, [0, 0.02, 0]));
  tablero.position.set(1.55, 0, 0.35);
  tablero.rotation.y = -0.5;
  g.add(P('Tablero con pantalla táctil', tablero, [0.6, 0, 0.5]));
  const bomba = grupo(cil(0.1, 0.1, 0.18, M.pulido, [0, 0.22, 0], [Math.PI / 2, 0, 0], 24), caja(0.3, 0.16, 0.16, M.pintura, [0.25, 0.22, 0]), caja(0.5, 0.04, 0.22, M.piezas, [0.1, 0.06, 0]));
  bomba.position.set(-0.4, 0, 0.75);
  g.add(P('Bomba sanitaria', bomba, [0, 0, 0.6]));

  // Flujos en zigzag por sección
  const zig = (i0, i1, z, sube) => { const pts = []; for (let i = i0; i <= i1; i++) { const x = x0 + i * paso + paso / 2; pts.push(V(x, (i - i0) % 2 === (sube ? 0 : 1) ? yC + 0.42 : yC - 0.42, z)); } return new THREE.CatmullRomCurve3(pts); };
  const secciones = { regeneracion: [0, 9], calentamiento: [10, 17], enfriamiento: [18, 25] };
  const fl = {
    leche: particulas(40, 0.018, M.blanco),
    medio: particulas(40, 0.018, M.caliente),
    frio: particulas(40, 0.018, M.frio),
    reten: particulas(30, 0.02, M.caliente),
  };
  Object.values(fl).forEach((im) => g.add(im));
  const curvaReten = new THREE.CatmullRomCurve3(Array.from({ length: 120 }, (_, i) => new Helice(0.13, 0.11, 1.0).getPoint(i / 119).add(V(0, 0.5, -0.78))));
  const colorSec = { regeneracion: [0.9, 0.55, 0.1], calentamiento: [0.95, 0.2, 0.1], enfriamiento: [0.1, 0.45, 1] };
  const datos = {
    regeneracion: [['Leche', '4 → 55 °C'], ['Recupera', 'Calor de la leche ya pasteurizada']],
    calentamiento: [['Leche', '55 → 72 °C'], ['Medio', 'Agua caliente a 78 °C']],
    retencion: [['Temperatura', '72 °C'], ['Tiempo', '15 segundos']],
    enfriamiento: [['Leche', '72 → 4 °C'], ['Medio', 'Agua helada a 1 °C']],
  };
  return {
    grupo: g, partes, pasos: ['regeneracion', 'calentamiento', 'retencion', 'enfriamiento'], cortable: false,
    puertos: { entrada: V(-1.08, 0.34, 0.24), salida: V(-1.08, 1.22, -0.24) },
    huella: { w: 2.9, d: 1.9 },
    animar(dt, t, paso) {
      const sec = secciones[paso];
      matsPlaca.forEach((m, i) => {
        let c = [0, 0, 0];
        if (sec && i >= sec[0] && i <= sec[1]) { const k = 0.25 + 0.12 * Math.sin(t * 4 + i * 0.4); c = colorSec[paso].map((v) => v * k); }
        m.emissive.setRGB(...c);
      });
      const enSec = !!sec;
      fluyendo(fl.leche, enSec); fluyendo(fl.medio, paso === 'calentamiento' || paso === 'regeneracion'); fluyendo(fl.frio, paso === 'enfriamiento'); fluyendo(fl.reten, paso === 'retencion');
      if (sec) {
        enCurva(fl.leche, zig(sec[0], sec[1], 0.1, true), t, 0.35);
        if (paso === 'enfriamiento') enCurva(fl.frio, zig(sec[0], sec[1], -0.1, false), t, -0.35);
        else enCurva(fl.medio, zig(sec[0], sec[1], -0.1, false), t, -0.35);
        fl.medio.material = paso === 'regeneracion' ? M.blanco : M.caliente;
      }
      if (paso === 'retencion') enCurva(fl.reten, curvaReten, t, 0.25);
      M.pantalla.emissiveIntensity = 0.5 + 0.15 * Math.sin(t * 2);
    },
    hud(paso) { return datos[paso] || null; },
  };
}

// ---------- marmita ----------
function marmita(M, { volcable = false } = {}) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  const R = 0.45, yC = 0.98;
  const perfil = (r, extra = 0) => { const pts = []; for (let i = 0; i <= 14; i++) { const a = (i / 14) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.001, Math.sin(a) * r), yC - Math.cos(a) * r * 0.85)); } pts.push(new THREE.Vector2(r, yC + 0.22 + extra)); return pts; };
  const olla = new THREE.Group();
  const cuerpo = malla(new THREE.LatheGeometry(perfil(R), 64), M.aceroInt);
  const chaq = malla(new THREE.LatheGeometry(perfil(R + 0.05, -0.12), 64), M.chaqueta);
  const borde = malla(new THREE.TorusGeometry(R + 0.02, 0.025, 10, 64), M.pulido, [0, yC + 0.22, 0], [Math.PI / 2, 0, 0]);
  const contenido = malla(new THREE.CylinderGeometry(R * 0.96, R * 0.5, 0.35, 48), volcable ? M.crema : M.leche, [0, yC - 0.05, 0]);
  olla.add(cuerpo, contenido, borde);
  const chaqGrupo = grupo(chaq);
  olla.add(chaqGrupo);
  g.add(olla);
  P('Olla interior pulida', cuerpo);
  partes.push({ nombre: 'Chaqueta de calentamiento', obj: chaqGrupo, off: V(R * 2.6, 0, 0), base: chaqGrupo.position.clone() });
  let agit = null;
  agit = grupo(barra([0, yC + 0.3, 0], [0, yC - 0.25, 0], 0.02, M.piezas), malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-R * 0.85, yC + 0.15, 0), V(-R * 0.8, yC - 0.2, 0), V(0, yC - R * 0.78, 0), V(R * 0.8, yC - 0.2, 0), V(R * 0.85, yC + 0.15, 0)]), 40, 0.016, 8), M.piezas));
  const puente = grupo(caja(R * 2.3, 0.05, 0.16, M.piezas, [0, yC + 0.3, 0]), caja(0.22, 0.16, 0.22, M.piezas, [0, yC + 0.4, 0]), cil(0.1, 0.1, 0.28, M.pintura, [0.24, yC + 0.41, 0], [0, 0, Math.PI / 2], 24));
  olla.add(agit, puente);
  P('Agitador raspador', agit, [0, 0.75, 0]);
  P('Motorreductor', puente, [0, 1.05, 0]);
  const vapores = particulas(24, 0.035, M.vapor);
  g.add(vapores);
  let pivote = V(0, yC, 0);
  if (volcable) {
    const soporte = grupo(caja(0.08, yC + 0.05, 0.12, M.piezas, [-(R + 0.18), (yC + 0.05) / 2, 0]), caja(0.08, yC + 0.05, 0.12, M.piezas, [R + 0.18, (yC + 0.05) / 2, 0]), caja(0.3, 0.04, 0.3, M.piezas, [-(R + 0.18), 0.02, 0]), caja(0.3, 0.04, 0.3, M.piezas, [R + 0.18, 0.02, 0]), barra([-(R + 0.2), yC, 0], [R + 0.2, yC, 0], 0.03, M.pulido));
    const volante = grupo(malla(new THREE.TorusGeometry(0.16, 0.014, 8, 32), M.pintura, [R + 0.3, yC, 0], [0, Math.PI / 2, 0]), barra([R + 0.22, yC, 0], [R + 0.3, yC, 0], 0.02, M.piezas));
    g.add(P('Soporte con eje de volteo', soporte, [0, -0.45, 0]), P('Volante de volteo', volante, [0.6, 0, 0]));
  } else {
    g.add(P('Patas regulables', patas(3, R * 0.85, yC - R * 0.6, M.piezas), [0, -0.5, 0]));
    const valv = grupo(cil(0.035, 0.035, 0.3, M.piezas, [0, yC - R * 0.85 - 0.12, 0], [0, 0, 0], 16), cil(0.035, 0.035, 0.3, M.piezas, [0.15, yC - R * 0.85 - 0.27, 0], [0, 0, Math.PI / 2], 16), caja(0.24, 0.03, 0.03, M.pintura, [0.18, yC - R * 0.85 - 0.2, 0.05]));
    g.add(P('Válvula de descarga', valv, [0.3, -0.35, 0.3]));
    g.add(P('Entrada de vapor', tuboCurva([[R + 0.05, yC - 0.2, 0.1], [R + 0.25, yC - 0.2, 0.1], [R + 0.3, 0.3, 0.1]], 0.025, M.caliente), [0.5, 0, 0]));
  }
  const pasos = volcable
    ? { carga: { nivel: [0.1, 0.8, 3] }, coccion: { calor: 1, vapor: true, temp: [20, 92, 5] }, agitacion: { agit: 2, calor: 0.6, vapor: true, temp: [92, 92, 1] }, volteo: { volteo: 1 } }
    : { carga: { nivel: [0.1, 0.8, 3] }, calentamiento: { calor: 1, vapor: true, temp: [8, 85, 5] }, agitacion: { agit: 2, calor: 0.6, temp: [85, 85, 1] }, descarga: { nivel: [0.8, 0.1, 4] } };
  let temp = 20, f = 0.6, giro = 0;
  return {
    grupo: g, partes, pasos: Object.keys(pasos), cortable: true,
    puertos: { entrada: V(0, yC + 0.3, 0), salida: V(0.3, 0.2, 0) },
    huella: { w: R * 2.8, d: R * 2.4 },
    animar(dt, t, paso, tp) {
      const a = pasos[paso] || { agit: 0.4 };
      f = Array.isArray(a.nivel) ? a.nivel[0] + (a.nivel[1] - a.nivel[0]) * suave(ciclo(tp, a.nivel[2])) : 0.75;
      contenido.scale.y = Math.max(0.05, f); contenido.position.y = yC - 0.24 + 0.17 * f;
      if (!reducido) agit.rotation.y += dt * (a.agit ?? 0.4) * 2;
      const ca = a.calor ? a.calor * (0.55 + 0.25 * Math.sin(t * 3)) : 0;
      M.chaqueta.emissive.setRGB(ca * 0.6, ca * 0.12, 0);
      giro += ((a.volteo ? Math.min(1.25, suave(ciclo(tp, 3)) * 1.25) : 0) - giro) * Math.min(1, dt * 4);
      olla.position.copy(pivote); olla.rotation.z = volcable ? giro : 0; olla.position.sub(pivote.clone().applyAxisAngle(V(0, 0, 1), olla.rotation.z));
      fluyendo(vapores, !!a.vapor);
      if (a.vapor) { for (let i = 0; i < vapores.count; i++) { const u = (i / vapores.count + t * 0.3) % 1; const an = i * 2.4; dummy.position.set(Math.cos(an) * R * 0.5 * (i % 3) / 2, yC + 0.15 + u * 0.7, Math.sin(an) * R * 0.5 * (i % 3) / 2); dummy.scale.setScalar(0.5 + u); dummy.updateMatrix(); vapores.setMatrixAt(i, dummy.matrix); } vapores.instanceMatrix.needsUpdate = true; }
      temp = a.temp ? a.temp[0] + (a.temp[1] - a.temp[0]) * suave(ciclo(tp, a.temp[2])) : temp;
    },
    hud(paso) {
      if (!pasos[paso]) return null;
      const filas = [['Temperatura', `${fmt(temp)} °C`], ['Llenado', `${fmt(f * 100)} %`]];
      if (paso === 'volteo') filas.push(['Volteo', 'Vaciado sin raspar a mano']);
      return filas;
    },
  };
}

// ---------- tina de cuajado ----------
function perfilU(a, h, r, t) {
  const s = new THREE.Shape();
  s.moveTo(-a, h); s.lineTo(-a, r); s.quadraticCurveTo(-a, 0, -a + r, 0); s.lineTo(a - r, 0); s.quadraticCurveTo(a, 0, a, r); s.lineTo(a, h);
  if (t) { s.lineTo(a - t, h); s.lineTo(a - t, r); s.quadraticCurveTo(a - t, t, a - r, t); s.lineTo(-a + r, t); s.quadraticCurveTo(-a + t, t, -a + t, r); s.lineTo(-a + t, h); }
  s.closePath();
  return s;
}
function extruirX(shape, largo, mat) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: largo, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -largo / 2); geo.rotateY(Math.PI / 2);
  return malla(geo, mat);
}
function tina(M, { largo = 2.3, ancho = 0.82, alto = 0.68, nombre = 'Cuba de cuajado' } = {}) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  const yB = 0.38, a = ancho / 2, r = 0.2;
  const cuba = grupo(extruirX(perfilU(a, alto, r, 0.012), largo, M.aceroInt), (() => { const e1 = extruirX(perfilU(a, alto, r), 0.012, M.acero); e1.position.x = largo / 2; const e2 = e1.clone(); e2.position.x = -largo / 2; return grupo(e1, e2); })());
  cuba.position.y = yB;
  const chaq = extruirX(perfilU(a + 0.045, alto * 0.75, r + 0.03, 0.01), largo - 0.04, M.chaqueta);
  chaq.position.y = yB - 0.045;
  const fill = extruirX(perfilU(a - 0.03, alto * 0.92, r - 0.03), largo - 0.06, M.leche);
  fill.position.y = yB + 0.015;
  g.add(P(nombre, cuba), P('Chaqueta de calentamiento', chaq, [0, -0.1, ancho * 1.6]), fill);
  const patasG = new THREE.Group();
  [-largo * 0.42, 0, largo * 0.42].forEach((x) => [-a + 0.08, a - 0.08].forEach((z) => { patasG.add(cil(0.035, 0.035, yB, M.piezas, [x, yB / 2, z], [0, 0, 0], 16)); patasG.add(cil(0.07, 0.08, 0.04, M.piezas, [x, 0.02, z])); }));
  g.add(P('Patas regulables', patasG, [0, -0.5, 0]));
  const rieles = grupo(barra([-largo / 2, yB + alto + 0.03, a + 0.03], [largo / 2, yB + alto + 0.03, a + 0.03], 0.02, M.pulido), barra([-largo / 2, yB + alto + 0.03, -a - 0.03], [largo / 2, yB + alto + 0.03, -a - 0.03], 0.02, M.pulido));
  g.add(P('Rieles del carro', rieles, [0, 0.45, 0]));
  const carro = new THREE.Group();
  carro.add(caja(0.3, 0.08, ancho + 0.14, M.acero, [0, yB + alto + 0.09, 0]), cil(0.08, 0.08, 0.2, M.pintura, [0, yB + alto + 0.22, 0], [0, 0, 0], 20));
  const lira = new THREE.Group();
  lira.add(caja(0.5, 0.02, 0.02, M.piezas, [0, 0.0, 0]), caja(0.5, 0.02, 0.02, M.piezas, [0, -alto * 0.75, 0]));
  for (let i = 0; i <= 8; i++) lira.add(barra([-0.25 + i * 0.0625, 0, 0], [-0.25 + i * 0.0625, -alto * 0.75, 0], 0.004, M.pulido));
  lira.add(barra([0, 0.06, 0], [0, 0, 0], 0.015, M.piezas));
  lira.position.y = yB + alto + 0.02;
  carro.add(lira);
  g.add(P('Carro con liras de corte', carro, [0, 0.95, 0]));
  const valv = grupo(cil(0.04, 0.04, 0.3, M.piezas, [largo / 2 + 0.15, yB + 0.06, 0], [0, 0, Math.PI / 2], 16), caja(0.03, 0.2, 0.03, M.pintura, [largo / 2 + 0.2, yB + 0.14, 0]));
  g.add(P('Válvula de desuerado', valv, [0.5, 0, 0]));
  const suero = particulas(24, 0.02, M.suero);
  g.add(suero);
  const curvaSuero = new THREE.CatmullRomCurve3([V(largo / 2 + 0.3, yB + 0.06, 0), V(largo / 2 + 0.4, yB - 0.05, 0), V(largo / 2 + 0.45, 0.02, 0)]);
  const pasos = {
    llenado: { nivel: [0.05, 0.85, 4], calor: 1, temp: [20, 32, 4] },
    coagulacion: { nivel: 0.85, cuaja: [0, 1, 4], temp: [32, 32, 1] },
    corte: { nivel: 0.85, cuaja: 1, corte: true, temp: [32, 32, 1] },
    desuerado: { nivel: [0.85, 0.4, 5], cuaja: 1, suero: true, temp: [32, 32, 1] },
  };
  let temp = 20, f = 0.6, cuaja = 0;
  const cLeche = new THREE.Color(0xf7f4ec), cCuajada = new THREE.Color(0xf0e2b5);
  return {
    grupo: g, partes, pasos: Object.keys(pasos), cortable: true,
    puertos: { entrada: V(-largo / 2, yB + alto, 0), salida: V(largo / 2 + 0.3, yB + 0.06, 0) },
    huella: { w: largo + 0.6, d: ancho + 0.5 },
    animar(dt, t, paso, tp) {
      const p = pasos[paso] || {};
      f = Array.isArray(p.nivel) ? p.nivel[0] + (p.nivel[1] - p.nivel[0]) * suave(ciclo(tp, p.nivel[2])) : 0.7;
      fill.scale.y = Math.max(0.02, f); fill.visible = f > 0.03;
      cuaja = Array.isArray(p.cuaja) ? suave(ciclo(tp, p.cuaja[2])) : (p.cuaja ?? 0);
      M.leche.color.copy(cLeche).lerp(cCuajada, cuaja);
      const ca = p.calor ? 0.55 + 0.25 * Math.sin(t * 3) : 0;
      M.chaqueta.emissive.setRGB(ca * 0.6, ca * 0.12, 0);
      if (p.corte && !reducido) { carro.position.x = Math.sin(t * 0.6) * (largo / 2 - 0.3); lira.rotation.y = t * 0.8; } else { carro.position.x += (0 - carro.position.x) * Math.min(1, dt * 2); }
      fluyendo(suero, !!p.suero); if (p.suero) enCurva(suero, curvaSuero, t, 0.8);
      temp = p.temp ? p.temp[0] + (p.temp[1] - p.temp[0]) * suave(ciclo(tp, p.temp[2])) : temp;
    },
    hud(paso) {
      if (!pasos[paso]) return null;
      const extra = { coagulacion: ['Reposo', '30 a 40 min (muestra)'], corte: ['Corte', 'Liras en vaivén'], desuerado: ['Salida', 'Suero por la válvula'] }[paso];
      return [['Temperatura', `${fmt(temp, 1)} °C`], ['Llenado', `${fmt(f * 100)} %`], extra].filter(Boolean);
    },
  };
}

// ---------- hiladora ----------
function hiladora(M) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  const y = 0.82;
  const camara = grupo(caja(1.3, 0.5, 0.62, M.acero, [0, y, 0]));
  g.add(P('Cámara de hilado', camara, [0, 0, 1.0]));
  const tolva = malla(new THREE.CylinderGeometry(0.42, 0.2, 0.36, 4, 1, true), M.acero, [-0.35, y + 0.43, 0], [0, Math.PI / 4, 0]);
  g.add(P('Tolva de carga', tolva, [0, 0.6, 0]));
  const tornillos = new THREE.Group();
  [-0.13, 0.13].forEach((z, i) => {
    const t = grupo(malla(new THREE.TubeGeometry(new Helice(0.085, 0.12, 1.1), 200, 0.012, 6), M.pulido), cil(0.022, 0.022, 1.15, M.piezas, [0, 0, 0], [0, 0, Math.PI / 2], 12));
    t.position.set(0, y - 0.05, z); t.userData.signo = i ? 1 : -1; tornillos.add(t);
  });
  g.add(P('Tornillos de hilado', tornillos, [0, 0.95, 0]));
  const salida = grupo(caja(0.36, 0.04, 0.3, M.acero, [0.85, y - 0.1, 0], [0, 0, -0.4]));
  g.add(P('Salida de pasta', salida, [0.5, 0, 0]));
  const motor = grupo(caja(0.3, 0.3, 0.3, M.piezas, [-0.85, y - 0.05, 0]), cil(0.11, 0.11, 0.3, M.pintura, [-1.1, y - 0.05, 0], [0, 0, Math.PI / 2], 24));
  g.add(P('Motorreductor', motor, [-0.6, 0, 0]));
  const agua = tuboCurva([[0.3, y + 0.25, -0.2], [0.3, y + 0.55, -0.2], [0.6, y + 0.6, -0.2], [0.7, y + 0.9, -0.3]], 0.022, M.caliente);
  g.add(P('Entrada de agua caliente', agua, [0, 0.5, -0.5]));
  const patasG = new THREE.Group();
  [[-0.55, -0.25], [-0.55, 0.25], [0.55, -0.25], [0.55, 0.25]].forEach(([x, z]) => { patasG.add(cil(0.03, 0.03, y - 0.25, M.piezas, [x, (y - 0.25) / 2, z], [0, 0, 0], 16)); patasG.add(cil(0.06, 0.07, 0.04, M.piezas, [x, 0.02, z])); });
  g.add(P('Patas regulables', patasG, [0, -0.45, 0]));
  const masa = particulas(30, 0.035, M.cuajada);
  const hilo = malla(new THREE.CylinderGeometry(0.05, 0.05, 1, 16), M.cuajada, [1.0, y - 0.18, 0], [0, 0, Math.PI / 2 + 0.4]);
  hilo.geometry.translate(0, 0.5, 0); hilo.visible = false;
  g.add(masa, hilo);
  const curvaMasa = new THREE.CatmullRomCurve3([V(-0.35, y + 0.4, 0), V(-0.35, y, 0), V(0.5, y - 0.05, 0), V(0.75, y - 0.1, 0)]);
  const pasos = { carga: { masa: true }, hilado: { giro: 1, masa: true, temp: [60, 82, 4] }, salida: { giro: 0.6, hilo: true, temp: [82, 82, 1] } };
  let temp = 60;
  return {
    grupo: g, partes, pasos: Object.keys(pasos), cortable: true,
    puertos: { entrada: V(-0.35, y + 0.6, 0), salida: V(1.0, y - 0.18, 0) },
    huella: { w: 2.5, d: 1.1 },
    animar(dt, t, paso, tp) {
      const p = pasos[paso] || { giro: 0.2 };
      if (!reducido) tornillos.children.forEach((tt) => { tt.rotation.x += dt * (p.giro ?? 0.2) * 4 * tt.userData.signo; });
      fluyendo(masa, !!p.masa); if (p.masa) enCurva(masa, curvaMasa, t, p.giro ? 0.25 : 0.12);
      hilo.visible = !!p.hilo; if (p.hilo) hilo.scale.y = 0.05 + 0.4 * ciclo(tp, 2.5, 0.3);
      temp = p.temp ? p.temp[0] + (p.temp[1] - p.temp[0]) * suave(ciclo(tp, p.temp[2])) : 60;
    },
    hud(paso) { if (!pasos[paso]) return null; return [['Agua', `${fmt(temp)} °C`], ['Tornillos', paso === 'carga' ? 'Detenidos' : 'Contrarrotantes']]; },
  };
}

// ---------- formadora ----------
function formadora(M) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  g.add(P('Cuerpo', caja(0.8, 0.8, 0.7, M.acero, [-0.3, 0.75, 0]), [-0.4, 0, 0]));
  g.add(P('Tolva de alimentación', malla(new THREE.CylinderGeometry(0.36, 0.18, 0.32, 4, 1, true), M.acero, [-0.35, 1.32, 0], [0, Math.PI / 4, 0]), [0, 0.55, 0]));
  const tambor = cil(0.17, 0.17, 0.5, M.pulido, [0.22, 0.95, 0], [Math.PI / 2, 0, 0], 32);
  g.add(P('Tambor formador', tambor, [0.3, 0.5, 0]));
  const banda = grupo(caja(1.3, 0.03, 0.36, M.goma, [0.95, 0.62, 0]), cil(0.04, 0.04, 0.4, M.pulido, [0.3, 0.62, 0], [Math.PI / 2, 0, 0], 16), cil(0.04, 0.04, 0.4, M.pulido, [1.6, 0.62, 0], [Math.PI / 2, 0, 0], 16), caja(1.3, 0.04, 0.04, M.piezas, [0.95, 0.56, 0.2]), caja(1.3, 0.04, 0.04, M.piezas, [0.95, 0.56, -0.2]));
  g.add(P('Banda de salida', banda, [0.6, 0, 0.5]));
  const tanque = caja(0.5, 0.35, 0.6, M.vidrio, [1.85, 0.4, 0]);
  g.add(P('Tanque de enfriamiento', grupo(tanque, caja(0.52, 0.02, 0.62, M.piezas, [1.85, 0.22, 0])), [0.6, 0, 0]));
  const patasG = grupo([[-0.6, -0.28], [-0.6, 0.28], [0, -0.28], [0, 0.28], [1.6, -0.18], [1.6, 0.18]].map(([x, z]) => cil(0.03, 0.03, x > 1 ? 0.6 : 0.35, M.piezas, [x, x > 1 ? 0.3 : 0.175, z], [0, 0, 0], 12)));
  g.add(P('Patas', patasG, [0, -0.4, 0]));
  const bolas = particulas(10, 0.06, M.cuajada);
  g.add(bolas);
  const curva = new THREE.CatmullRomCurve3([V(0.3, 0.7, 0), V(1.0, 0.69, 0), V(1.6, 0.69, 0), V(1.8, 0.45, 0)]);
  const pasos = { alimentacion: { giro: 0.2 }, formado: { giro: 1.2, bolas: true }, salida: { giro: 1, bolas: true } };
  return {
    grupo: g, partes, pasos: Object.keys(pasos), cortable: false,
    puertos: { entrada: V(-0.35, 1.5, 0), salida: V(1.85, 0.4, 0) },
    huella: { w: 2.9, d: 1.0 },
    animar(dt, t, paso) {
      const p = pasos[paso] || { giro: 0.2 };
      if (!reducido) tambor.rotation.y += dt * (p.giro ?? 0.2) * 3;
      fluyendo(bolas, !!p.bolas); if (p.bolas) enCurva(bolas, curva, t, 0.12);
    },
    hud(paso) { if (!pasos[paso]) return null; return [['Pieza', '500 a 2.500 g'], ['Etapa', { alimentacion: 'Llenado de la tolva', formado: 'Formado continuo', salida: 'Al agua fría' }[paso]]]; },
  };
}

// ---------- prensa neumática ----------
function prensa(M, { pistones = 4 } = {}) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  const L = 0.42 * pistones + 0.3, yT = 0.82, yS = 1.95;
  const marco = grupo([[-L / 2, -0.3], [-L / 2, 0.3], [L / 2, -0.3], [L / 2, 0.3]].map(([x, z]) => caja(0.06, yS, 0.06, M.acero, [x, yS / 2, z])), caja(L + 0.1, 0.12, 0.7, M.acero, [0, yS, 0]));
  g.add(P('Estructura', marco, [0, 0, -1.0]));
  const mesa = grupo(caja(L, 0.05, 0.62, M.acero, [0, yT, 0]), caja(L, 0.04, 0.5, M.piezas, [0, yT - 0.12, 0], [0.08, 0, 0]));
  g.add(P('Mesa con bandeja de escurrido', mesa, [0, -0.45, 0]));
  const cilindros = new THREE.Group(), vastagos = new THREE.Group(), moldes = new THREE.Group();
  for (let i = 0; i < pistones; i++) {
    const x = -L / 2 + 0.36 + i * 0.42;
    cilindros.add(cil(0.07, 0.07, 0.42, M.pintura, [x, yS - 0.27, 0], [0, 0, 0], 24));
    const v = grupo(cil(0.02, 0.02, 0.6, M.pulido, [0, -0.3, 0], [0, 0, 0], 12), caja(0.3, 0.03, 0.3, M.acero, [0, -0.6, 0]));
    v.position.set(x, yS - 0.48, 0); vastagos.add(v);
    const m = grupo(caja(0.32, 0.26, 0.32, M.perf, [0, 0.13, 0]), caja(0.3, 0.2, 0.3, M.cuajada, [0, 0.11, 0]));
    m.position.set(x, yT + 0.025, 0); moldes.add(m);
  }
  g.add(P('Cilindros neumáticos', cilindros, [0, 0.6, 0]), P('Vástagos y platos de presión', vastagos, [0, 0.25, 0.6]), P('Moldes con cuajada', moldes, [0, 0, 0.9]));
  g.add(P('Unidad de mantenimiento de aire', grupo(caja(0.14, 0.32, 0.12, M.piezas, [L / 2 + 0.15, 1.3, 0.3]), cil(0.04, 0.04, 0.12, M.vidrio, [L / 2 + 0.15, 1.1, 0.3], [0, 0, 0], 16)), [0.5, 0, 0.3]));
  g.add(P('Distribuidor de aire', barra([-L / 2, yS + 0.1, 0.25], [L / 2, yS + 0.1, 0.25], 0.025, M.pulido), [0, 0.5, 0.3]));
  const pasos = { carga: {}, prensado: { prensa: true }, volteo: { volteo: true }, descarga: { desliza: true } };
  let presion = 0;
  return {
    grupo: g, partes, pasos: Object.keys(pasos), cortable: false,
    puertos: { entrada: V(-L / 2, yT, 0), salida: V(L / 2, yT, 0) },
    huella: { w: L + 0.5, d: 1.0 },
    animar(dt, t, paso, tp) {
      const p = pasos[paso] || {};
      let baja = 0;
      if (p.prensa) baja = suave(Math.min(1, (tp % 4) / 1.2)) * (1 - suave(Math.max(0, ((tp % 4) - 3) / 0.8)));
      vastagos.children.forEach((v) => { v.position.y = yS - 0.48 - baja * 0.4; });
      presion = baja * 4;
      moldes.children.forEach((m, i) => { m.rotation.x = p.volteo ? suave(ciclo(tp, 1.6, 2)) * Math.PI : 0; m.position.y = yT + 0.025 + (p.volteo ? 0.13 : 0); m.position.z = p.desliza ? suave(ciclo(tp, 2.5)) * 0.9 : 0; m.position.x = -L / 2 + 0.36 + i * 0.42; });
    },
    hud(paso) { if (!pasos[paso]) return null; return [['Presión', `${fmt(presion, 1)} bar (muestra)`], ['Pistones', String(pistones)]]; },
  };
}

// ---------- moldes ----------
function moldes(M, { tipo = 'prensa' } = {}) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  const dims = { prensa: [0.34, 0.26, 0.34], costeno: [0.32, 0.18, 0.32], mozzarella: [0.32, 0.12, 0.16] }[tipo];
  const [w, h, d] = dims;
  const bandeja = grupo(caja(w * 3 + 0.3, 0.03, d + 0.2, M.acero, [0, 0.015, 0]));
  g.add(P('Bandeja de escurrido', bandeja, [0, -0.35, 0]));
  const cuerpos = new THREE.Group(), quesos = new THREE.Group(), tapas = new THREE.Group();
  [-1, 0, 1].forEach((i) => {
    const x = i * (w + 0.08);
    const cuerpo = new THREE.Group();
    cuerpo.add(caja(w, h, 0.004, M.perf, [0, h / 2, d / 2]), caja(w, h, 0.004, M.perf, [0, h / 2, -d / 2]), caja(0.004, h, d, M.perf, [w / 2, h / 2, 0]), caja(0.004, h, d, M.perf, [-w / 2, h / 2, 0]), caja(w, 0.004, d, M.perf, [0, 0.002, 0]));
    cuerpo.position.set(x, 0.03, 0); cuerpos.add(cuerpo);
    const q = caja(w - 0.02, h * 0.85, d - 0.02, M.cuajada, [x, 0.03 + h * 0.43, 0]); q.userData.y = q.position.y; quesos.add(q);
    const tp = grupo(caja(w - 0.012, 0.012, d - 0.012, M.pulido, [0, 0, 0]), cil(0.02, 0.02, 0.06, M.piezas, [0, 0.035, 0], [0, 0, 0], 12));
    tp.position.set(x, 0.03 + h + 0.01, 0); tp.userData.y = tp.position.y; tapas.add(tp);
  });
  g.add(P('Moldes perforados', cuerpos), P('Queso', quesos, [0, 0, 0.55]), P('Seguidores (tapas de prensado)', tapas, [0, 0.45, 0]));
  const pasos = { llenado: {}, prensado: { prensa: true }, desmolde: { sale: true } };
  return {
    grupo: g, partes, pasos: Object.keys(pasos), cortable: false,
    puertos: { entrada: V(-(w * 1.5 + 0.2), 0.2, 0), salida: V(w * 1.5 + 0.2, 0.2, 0) },
    huella: { w: w * 3 + 0.5, d: d + 0.4 },
    animar(dt, t, paso, tp) {
      const p = pasos[paso] || {};
      const lleno = paso === 'llenado' ? suave(ciclo(tp, 3)) : 1;
      quesos.children.forEach((q) => { q.scale.y = Math.max(0.05, lleno); q.position.y = 0.03 + h * 0.43 * lleno + (p.sale ? suave(ciclo(tp, 2.5)) * (h + 0.25) : 0); });
      const baja = p.prensa ? suave(Math.min(1, (tp % 3.5) / 1)) * 0.06 : 0;
      tapas.children.forEach((tt) => { tt.position.y = tt.userData.y - baja + (p.sale ? 0.3 : 0) + (paso === 'llenado' ? 0.3 : 0); });
    },
    hud(paso) { if (!pasos[paso]) return null; return [['Molde', { prensa: '20 a 40 kg', costeno: '10 a 20 kg', mozzarella: '2.500 g' }[tipo]], ['Etapa', { llenado: 'Cuajada al molde', prensado: 'Seguidor presiona', desmolde: 'Bloque listo' }[paso]]]; },
  };
}

// ---------- carro escabiladero ----------
function carro(M) {
  const { partes, P } = registro();
  const raiz = new THREE.Group();
  const g = new THREE.Group();
  raiz.add(g);
  const W = 1.2, D = 0.65, H = 1.6;
  const marco = grupo([[-W / 2, -D / 2], [-W / 2, D / 2], [W / 2, -D / 2], [W / 2, D / 2]].map(([x, z]) => cil(0.02, 0.02, H, M.acero, [x, 0.14 + H / 2, z], [0, 0, 0], 12)), caja(W, 0.03, 0.03, M.acero, [0, H + 0.14, D / 2]), caja(W, 0.03, 0.03, M.acero, [0, H + 0.14, -D / 2]));
  g.add(P('Estructura tubular', marco, [0, 0, -0.9]));
  const bandejas = new THREE.Group(), carga = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const y = 0.28 + i * 0.24;
    bandejas.add(caja(W - 0.04, 0.012, D - 0.04, M.perf, [0, y, 0]));
    for (let j = 0; j < 3; j++) carga.add(caja(0.26, 0.14, 0.26, M.cuajada, [-0.38 + j * 0.38, y + 0.08, 0]));
  }
  g.add(P('Bandejas de escurrido', bandejas, [0.0, 0, 0.6]), P('Moldes con queso', carga, [0, 0, 1.3]));
  const ruedas = new THREE.Group();
  [[-W / 2, -D / 2], [-W / 2, D / 2], [W / 2, -D / 2], [W / 2, D / 2]].forEach(([x, z]) => { const r = grupo(cil(0.06, 0.06, 0.04, M.goma, [0, 0, 0], [Math.PI / 2, 0, 0], 20), caja(0.03, 0.08, 0.08, M.piezas, [0, 0.07, 0])); r.position.set(x, 0.06, z); ruedas.add(r); });
  g.add(P('Ruedas giratorias', ruedas, [0, -0.4, 0]));
  const gotas = particulas(30, 0.012, M.suero);
  g.add(gotas);
  const pasos = { carga: {}, escurrido: { gotas: true }, traslado: { mueve: true } };
  return {
    grupo: raiz, partes, pasos: Object.keys(pasos), cortable: false,
    puertos: { entrada: V(-W / 2, 0.8, 0), salida: V(W / 2, 0.8, 0) },
    huella: { w: W + 0.4, d: D + 0.4 },
    animar(dt, t, paso, tp) {
      const p = pasos[paso] || {};
      const vis = paso === 'carga' ? Math.ceil(ciclo(tp, 3) * 18) : 18;
      carga.children.forEach((c, i) => { c.visible = i < vis; });
      g.position.x = p.mueve ? Math.sin(t * 0.7) * 0.6 : g.position.x * 0.9;
      if (p.mueve && !reducido) ruedas.children.forEach((r) => { r.children[0].rotation.y = 0; r.rotation.y = Math.cos(t * 0.7) > 0 ? 0 : Math.PI; });
      fluyendo(gotas, !!p.gotas);
      if (p.gotas) { for (let i = 0; i < gotas.count; i++) { const u = (i / gotas.count + t * 0.6) % 1; dummy.position.set(-0.5 + (i % 6) * 0.2, 1.6 - u * 1.4, -0.2 + (i % 3) * 0.2); dummy.scale.setScalar(1); dummy.updateMatrix(); gotas.setMatrixAt(i, dummy.matrix); } gotas.instanceMatrix.needsUpdate = true; }
    },
    hud(paso) { if (!pasos[paso]) return null; return [['Capacidad', '100 a 200 moldes'], ['Etapa', { carga: 'Moldes a las bandejas', escurrido: 'El suero cae a la base', traslado: 'Al cuarto frío' }[paso]]]; },
  };
}

// ---------- mantequillera ----------
function mantequillera(M) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  const y = 1.0, R = 0.42, L = 0.8;
  const soporte = new THREE.Group();
  [-1, 1].forEach((s) => { soporte.add(barra([s * (L / 2 + 0.12), 0, -0.45], [s * (L / 2 + 0.12), y, 0], 0.035, M.acero), barra([s * (L / 2 + 0.12), 0, 0.45], [s * (L / 2 + 0.12), y, 0], 0.035, M.acero), caja(0.08, 0.04, 1.0, M.piezas, [s * (L / 2 + 0.12), 0.02, 0])); });
  g.add(P('Soporte en A', soporte, [0, -0.5, 0]));
  const tambor = new THREE.Group();
  tambor.add(cil(R, R, L, M.acero, [0, 0, 0], [0, 0, Math.PI / 2], 48), cil(R * 0.94, R * 0.94, L * 0.92, M.crema, [0, 0, 0], [0, 0, Math.PI / 2], 32));
  tambor.add(caja(0.3, 0.04, 0.24, M.pulido, [0, R + 0.01, 0]));
  tambor.position.y = y;
  g.add(P('Tambor de batido', tambor, [0, 0.6, 0]));
  g.add(P('Eje y rodamientos', barra([-(L / 2 + 0.2), y, 0], [L / 2 + 0.2, y, 0], 0.03, M.pulido), [0, 0, 0.6]));
  g.add(P('Motorreductor con guarda', grupo(caja(0.26, 0.4, 0.3, M.pintura, [L / 2 + 0.32, y - 0.15, 0]), cil(0.1, 0.1, 0.25, M.piezas, [L / 2 + 0.32, 0.35, 0.2], [Math.PI / 2, 0, 0], 20)), [0.6, 0, 0]));
  const gotas = particulas(20, 0.02, M.suero);
  g.add(gotas);
  const pasos = { carga: {}, batido: { giro: 1.6 }, lavado: { giro: 0.6, gotas: true }, descarga: { abre: true } };
  return {
    grupo: g, partes, pasos: Object.keys(pasos), cortable: false,
    puertos: { entrada: V(0, y + R + 0.1, 0), salida: V(0, 0.3, 0.5) },
    huella: { w: L + 0.9, d: 1.1 },
    animar(dt, t, paso, tp) {
      const p = pasos[paso] || {};
      if (!reducido) tambor.rotation.x += dt * (p.giro ?? 0) * 2.5;
      if (p.abre) tambor.rotation.x += (Math.PI - (tambor.rotation.x % (Math.PI * 2))) * Math.min(1, dt * 2);
      fluyendo(gotas, !!p.gotas);
      if (p.gotas) { for (let i = 0; i < gotas.count; i++) { const u = (i / gotas.count + t * 0.8) % 1; dummy.position.set(-0.2 + (i % 5) * 0.1, y - R - u * (y - R), 0.05); dummy.scale.setScalar(1); dummy.updateMatrix(); gotas.setMatrixAt(i, dummy.matrix); } gotas.instanceMatrix.needsUpdate = true; }
    },
    hud(paso) { if (!pasos[paso]) return null; return [['Etapa', { carga: 'Crema al tambor', batido: 'Separa grasa y suero', lavado: 'Lavado de la mantequilla', descarga: 'Tambor boca abajo' }[paso]], ['Giro', p2(paso)]]; },
  };
  function p2(paso) { return paso === 'batido' ? 'Rápido' : paso === 'lavado' ? 'Lento' : 'Detenido'; }
}

// ---------- mesón y canastilla ----------
function meson(M) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  const W = 2.0, D = 1.0, H = 0.9;
  g.add(P('Superficie de trabajo', caja(W, 0.04, D, M.acero, [0, H, 0]), [0, 0.6, 0]));
  g.add(P('Entrepaño superior', caja(W - 0.1, 0.025, D - 0.1, M.acero, [0, 0.5, 0]), [0, 0.25, 0]));
  g.add(P('Entrepaño inferior', caja(W - 0.1, 0.025, D - 0.1, M.acero, [0, 0.16, 0])));
  g.add(P('Patas con niveladores', grupo([[-W / 2 + 0.05, -D / 2 + 0.05], [-W / 2 + 0.05, D / 2 - 0.05], [W / 2 - 0.05, -D / 2 + 0.05], [W / 2 - 0.05, D / 2 - 0.05]].map(([x, z]) => grupo(caja(0.04, H, 0.04, M.piezas, [x, H / 2, z]), cil(0.03, 0.04, 0.03, M.goma, [x, 0.015, z])))), [0, -0.4, 0]));
  return { grupo: g, partes, pasos: ['trabajo', 'almacenamiento', 'limpieza'], cortable: false, puertos: { entrada: V(-W / 2, H, 0), salida: V(W / 2, H, 0) }, huella: { w: W + 0.3, d: D + 0.3 }, animar() {}, hud(paso) { return { trabajo: [['Superficie', 'Acero inoxidable']], almacenamiento: [['Entrepaños', '2 niveles']], limpieza: [['Limpieza', 'Superficies lisas, sin rincones']] }[paso] || null; } };
}
function canastilla(M) {
  const { partes, P } = registro();
  const g = new THREE.Group();
  const W = 0.6, D = 0.4, H = 0.25;
  const una = (y) => grupo(caja(W, H, 0.004, M.perf, [0, y + H / 2, D / 2]), caja(W, H, 0.004, M.perf, [0, y + H / 2, -D / 2]), caja(0.004, H, D, M.perf, [W / 2, y + H / 2, 0]), caja(0.004, H, D, M.perf, [-W / 2, y + H / 2, 0]), caja(W, 0.004, D, M.perf, [0, y + 0.002, 0]), caja(W + 0.02, 0.012, 0.012, M.pulido, [0, y + H, D / 2]), caja(W + 0.02, 0.012, 0.012, M.pulido, [0, y + H, -D / 2]));
  const c1 = una(0), c2 = una(H + 0.02), c3 = una((H + 0.02) * 2);
  const prod = grupo(caja(W - 0.05, H * 0.6, D - 0.05, M.cuajada, [0, H * 0.32, 0]));
  g.add(P('Canastilla perforada', c1), P('Canastilla apilada', c2, [0, 0.35, 0]), P('Canastilla apilada', c3, [0, 0.7, 0]), P('Producto', prod, [0, 0, 0.5]));
  return { grupo: g, partes, pasos: ['carga', 'escurrido', 'apilado'], cortable: false, puertos: { entrada: V(-W / 2, 0.3, 0), salida: V(W / 2, 0.3, 0) }, huella: { w: W + 0.3, d: D + 0.3 }, animar(dt, t, paso, tp) { if (!paso) { c2.visible = c3.visible = true; return; } const ap = paso === 'apilado' ? suave(ciclo(tp, 2.5)) : 1; c2.position.y = (1 - ap) * 0.4; c3.position.y = (1 - ap) * 0.8; c2.visible = c3.visible = paso !== 'carga'; }, hud(paso) { return { carga: [['Uso', 'Producto en la canastilla']], escurrido: [['Perforación', 'Escurre el suero']], apilado: [['Apilado', 'Ahorra espacio en frío']] }[paso] || null; } };
}

// ---------- registro de familias ----------
export const FAMILIAS = {
  enfriamiento: tanqueEnfriamiento,
  mezcla: tanqueMezcla,
  almacenamiento: silo,
  fermentacion: fermentador,
  pasteurizador,
  marmitaMulti: (M) => marmita(M),
  marmitaVolcable: (M) => marmita(M, { volcable: true }),
  tina: (M) => tina(M),
  polivalente: (M) => tina(M, { largo: 3.2, ancho: 1.0, alto: 0.8, nombre: 'Tina polivalente' }),
  hiladora,
  formadora,
  prensa: (M, o) => prensa(M, o),
  moldePrensa: (M) => moldes(M, { tipo: 'prensa' }),
  moldeCosteno: (M) => moldes(M, { tipo: 'costeno' }),
  moldeMozzarella: (M) => moldes(M, { tipo: 'mozzarella' }),
  carro,
  mantequillera,
  meson,
  canastilla,
};

export function construir(id, M, opciones) {
  const f = FAMILIAS[id] || FAMILIAS.enfriamiento;
  const m = f(M, opciones);
  // anclas de etiquetas (centro de cada pieza en reposo)
  const caja3 = new THREE.Box3();
  m.partes.forEach((p) => { caja3.setFromObject(p.obj); p.ancla = caja3.getCenter(new THREE.Vector3()); });
  return m;
}

export function explotar(modelo, f) {
  modelo.partes.forEach((p) => {
    p.obj.position.copy(p.base).addScaledVector(p.off, f);
    if (p.explotar) p.explotar(f);
  });
}
