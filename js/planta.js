// Arma tu planta: constructor interactivo de planta láctea en 3D con los equipos de Equinox.
import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/addons/OrbitControls.js';
import { entornoAcero } from './estudio.js';
import { crearMateriales, construir } from './modelos.js';
import { EQUIPOS, LINEAS, APLICACIONES, numeroWhatsApp, apuntarWhatsApp, imagenEquipo } from './data.js';
import { FICHAS } from './fichas.js';
import { pedirDatos } from './interesado.js';
import { CONTACTO } from './pdf.js';
import { registrar, registrarAgregados } from './medicion.js';

document.documentElement.classList.remove('sin-js');
apuntarWhatsApp(); // aviso si hay número de WhatsApp de prueba (?wa=)
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const guardarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const suave = (x) => x * x * (3 - 2 * x);

const ETAPA = { enfriamiento: 1, almacenamiento: 1, pasteurizador: 2, marmitaMulti: 2, mezcla: 3, fermentacion: 4, tina: 4, polivalente: 4, mantequillera: 4, marmitaVolcable: 4, hiladora: 5, formadora: 6, moldePrensa: 6, moldeCosteno: 6, moldeMozzarella: 6, prensa: 7, carro: 8, meson: 9, canastilla: 9 };
const NOMBRE_ETAPA = { 1: 'Recibo y frío', 2: 'Pasteurización', 3: 'Mezcla', 4: 'Proceso', 5: 'Hilado', 6: 'Formado y moldeo', 7: 'Prensado', 8: 'Escurrido y traslado', 9: 'Apoyo' };
const FLUIDO = new Set(['enfriamiento', 'almacenamiento', 'pasteurizador', 'marmitaMulti', 'mezcla', 'fermentacion', 'tina', 'polivalente', 'hiladora', 'marmitaVolcable', 'mantequillera']);
const aLitros = (v) => Math.max(200, Math.round((200 * Math.pow(100, v / 100)) / 100) * 100);
const aRango = (L) => Math.round((Math.log(L / 200) / Math.log(100)) * 100);
const numero = (txt) => { const n = String(txt).match(/\d{1,3}(?:\.\d{3})+|\d+/g)?.map((x) => Number(x.replace(/\./g, ''))) || [0]; return /×/.test(txt) && n.length > 1 ? n[0] * n[1] : n[0]; };
const capMinima = (id, necesaria) => { const c = FICHAS[id].capacidades; return c.find((x) => x >= necesaria) ?? c[c.length - 1]; };
const capMedia = (id) => { const c = FICHAS[id].capacidades; return c[Math.floor((c.length - 1) / 2)]; };
const capTexto = (id, cap) => (FICHAS[id].fija ? 'Medida única' : `${fmt(cap)} ${FICHAS[id].unidad}`);

// ---------- estado ----------
// origen: plantilla de la que salió la sala; modificada: la persona ya la cambió (deja de ser "ejemplo")
let estado = { producto: 'campesino', litros: 2000, sala: { w: 14, l: 9 }, items: [], origen: null, modificada: true };
let uidSig = 1;
const app = () => APLICACIONES.find((a) => a.id === estado.producto) || APLICACIONES[0];

// ---------- escena ----------
const lienzo = $('#planta-3d');
const contEscena = $('.planta__escena');
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true; // corte del equipo en marcha durante el recorrido
// Sombras reales de la luz principal sobre el piso (además de la sombra suave bajo cada equipo)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
// Colores de la sala según el tema (claro u oscuro); el PDF del plano siempre se captura en claro
const tokenCss = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// piso: epóxico gris medio de la sala, para que el acero de los equipos resalte; junta: líneas de las baldosas
const PALETA_CLARA = { paper: '#edf0f4', paperLo: '#e1e6ec', paperHi: '#f7f9fb', ink: '#08105a', piso: '#7b8592', junta: '#ffffff' };
const oscuro = () => document.documentElement.dataset.tema === 'oscuro';
const paletaTema = (claro = false) => (claro || !oscuro() ? PALETA_CLARA : { paper: tokenCss('--paper') || PALETA_CLARA.paper, paperLo: tokenCss('--paper-lo') || PALETA_CLARA.paperLo, paperHi: tokenCss('--paper-hi') || PALETA_CLARA.paperHi, ink: tokenCss('--ink') || PALETA_CLARA.ink, piso: '#323c5c', junta: '#c5cce6' });
let paleta = paletaTema();
const FONDO = new THREE.Color(paleta.paper);
scene.background = FONDO;
scene.environment = entornoAcero(renderer);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 220);
camera.position.set(10, 10, 13);
const controls = new OrbitControls(camera, lienzo);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = 1.42; controls.minDistance = 3; controls.maxDistance = 55;
controls.target.set(0, 0.6, 0);
const luz = new THREE.DirectionalLight(0xffffff, 1.6); luz.position.set(6, 12, 8);
luz.castShadow = true;
luz.shadow.mapSize.set(2048, 2048);
luz.shadow.bias = -0.0004; luz.shadow.normalBias = 0.025;
if ('intensity' in luz.shadow) luz.shadow.intensity = 0.55;
scene.add(luz, luz.target, new THREE.AmbientLight(0xdfe6f5, 0.35));

// Piso de plano
const piso = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: paleta.paperLo }));
piso.rotation.x = -Math.PI / 2; piso.position.y = -0.002;
scene.add(piso);
const salaG = new THREE.Group(); scene.add(salaG);
const tinta = new THREE.MeshBasicMaterial({ color: paleta.ink });
function pintarSala() {
  salaG.children.forEach((c) => c.geometry?.dispose());
  salaG.clear();
  const { w, l } = estado.sala;
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ color: paleta.piso, map: texEpoxi(), roughness: 0.62, metalness: 0, envMapIntensity: 0.12 }));
  suelo.rotation.x = -Math.PI / 2; suelo.position.y = -0.001; suelo.receiveShadow = true;
  const menor = new THREE.GridHelper(Math.max(w, l), Math.max(w, l) * 2, paleta.junta, paleta.junta);
  menor.material.transparent = true; menor.material.opacity = 0.06; menor.scale.set(w / Math.max(w, l), 1, l / Math.max(w, l));
  const mayor = new THREE.GridHelper(Math.max(w, l), Math.max(w, l), paleta.junta, paleta.junta);
  mayor.material.transparent = true; mayor.material.opacity = 0.16; mayor.scale.copy(menor.scale);
  // La cámara de sombras cubre la sala completa
  const s = Math.max(w, l) / 2 + 3, cs = luz.shadow.camera;
  cs.left = -s; cs.right = s; cs.top = s; cs.bottom = -s; cs.near = 1; cs.far = 45; cs.updateProjectionMatrix();
  salaG.add(suelo, menor, mayor);
  const muro = (x, z, ww, ll) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.08, ll), tinta); m.position.set(x, 0.04, z); salaG.add(m); };
  muro(0, -l / 2, w + 0.08, 0.06); muro(0, l / 2, w + 0.08, 0.06); muro(-w / 2, 0, 0.06, l); muro(w / 2, 0, 0.06, l);
  $$('.cota-sala').forEach((e) => e.remove());
  [['ancho', `${fmt(w, 1)} m`, V(0, 0, l / 2 + 0.7)], ['largo', `${fmt(l, 1)} m`, V(w / 2 + 0.8, 0, 0)]].forEach(([k, t, p]) => { const el = document.createElement('span'); el.className = 'cota-sala mono'; el.textContent = t; el.dataset.k = k; el._p = p; capaEtq.appendChild(el); });
}

// ---------- equipos en escena ----------
const capaEtq = $('[data-etiquetas]');
const objetos = new Map();
function aplicarTemaEscena(claro = false) {
  paleta = paletaTema(claro);
  FONDO.set(paleta.paper); piso.material.color.set(paleta.paperLo); tinta.color.set(paleta.ink); matMarco.color.set(paleta.ink);
  pintarSala();
}
document.addEventListener('eqx:tema', () => aplicarTemaEscena());
const matMarco = new THREE.LineDashedMaterial({ color: paleta.ink, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.5 });
const matSel = new THREE.LineBasicMaterial({ color: 0xc4351c });
const matChoque = new THREE.LineDashedMaterial({ color: 0xc4351c, dashSize: 0.1, gapSize: 0.06 });
let texPiso;
function texEpoxi() {
  if (texPiso) return texPiso;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = 200 + Math.random() * 55; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4); }
  texPiso = new THREE.CanvasTexture(c); texPiso.wrapS = texPiso.wrapT = THREE.RepeatWrapping; texPiso.repeat.set(6, 6); texPiso.colorSpace = THREE.SRGBColorSpace;
  return texPiso;
}
let texSombra;
function sombraTex() {
  if (texSombra) return texSombra;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, 'rgba(4,8,30,0.42)'); r.addColorStop(1, 'rgba(4,8,30,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return (texSombra = new THREE.CanvasTexture(c));
}

function crearObjeto(item, { caer = false } = {}) {
  // Planos de corte propios: en el recorrido, el equipo en marcha se abre en cuadrante para ver la leche por dentro
  const cortes = { cX: new THREE.Plane(V(-1, 0, 0), 50), cZ: new THREE.Plane(V(0, 0, -1), 50), abierto: 0 };
  const M = crearMateriales({ planos: [cortes.cX, cortes.cZ] });
  const modelo = construir(item.id, M);
  modelo.grupo.traverse((o) => { if (o.isMesh && !o.material?.transparent) o.castShadow = true; });
  const raiz = new THREE.Group();
  raiz.add(modelo.grupo);
  const { w, d } = modelo.huella;
  const pts = [V(-w / 2, 0.012, -d / 2), V(w / 2, 0.012, -d / 2), V(w / 2, 0.012, d / 2), V(-w / 2, 0.012, d / 2)];
  const marco = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), matMarco);
  marco.computeLineDistances();
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.15, d * 1.15), new THREE.MeshBasicMaterial({ map: sombraTex(), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.004;
  raiz.add(marco, sombra);
  modelo.grupo.updateMatrixWorld(true);
  const alto = new THREE.Box3().setFromObject(modelo.grupo).max.y;
  scene.add(raiz);
  const etq = document.createElement('button');
  etq.type = 'button'; etq.className = 'tag-planta';
  etq.innerHTML = `<b class="mono"></b><span>${EQUIPOS[item.id].nombre}</span>`;
  etq.addEventListener('click', () => seleccionar(item.uid));
  capaEtq.appendChild(etq);
  // Materiales del equipo, para atenuarlo cuando otro está en marcha (el vidrio queda como está)
  const mats = new Set();
  modelo.grupo.traverse((c) => { if (c.material) [].concat(c.material).forEach((m) => { if (m.transmission) return; m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; m.userData.dw0 = m.depthWrite; mats.add(m); }); });
  const obj = { item, modelo, raiz, marco, etq, alto, caida: caer && !reducido ? 1 : 0, paso: null, tp: 0, cortes, mats: [...mats], opacidad: 1, opPintada: 1 };
  objetos.set(item.uid, obj);
  aplicarItem(obj);
  return obj;
}
function aplicarItem(obj) {
  const { item, raiz } = obj;
  const s = FICHAS[item.id].escala(item.cap);
  raiz.scale.setScalar(s);
  raiz.rotation.y = (item.rot || 0) * (Math.PI / 2);
  raiz.position.set(item.x, obj.caida * 2.2, item.z);
}
function quitarObjeto(uid) {
  const o = objetos.get(uid); if (!o) return;
  scene.remove(o.raiz);
  o.raiz.traverse((c) => { c.geometry?.dispose(); });
  o.etq.remove();
  objetos.delete(uid);
}
function huellaMundo(item) {
  const o = objetos.get(item.uid);
  const s = FICHAS[item.id].escala(item.cap);
  let { w, d } = o.modelo.huella; w *= s; d *= s;
  if ((item.rot || 0) % 2) [w, d] = [d, w];
  return { x0: item.x - w / 2, x1: item.x + w / 2, z0: item.z - d / 2, z1: item.z + d / 2, w, d };
}
const choca = (a, b, m = 0.05) => a.x0 < b.x1 - m && a.x1 > b.x0 + m && a.z0 < b.z1 - m && a.z1 > b.z0 + m;
const ordenados = () => [...estado.items].sort((a, b) => ETAPA[a.id] - ETAPA[b.id] || a.uid - b.uid);

// ---------- acciones ----------
function lugarLibre(id, cap) {
  const tmp = { uid: -1, id, cap, x: 0, z: 0, rot: 0 };
  const o = crearObjeto(tmp); const h = huellaMundo(tmp); quitarObjeto(-1);
  const { w, l } = estado.sala;
  for (let z = -l / 2 + h.d / 2 + 0.6; z <= l / 2 - h.d / 2 - 0.4; z += 0.5) {
    for (let x = -w / 2 + h.w / 2 + 0.6; x <= w / 2 - h.w / 2 - 0.4; x += 0.5) {
      const cand = { x0: x - h.w / 2 - 0.4, x1: x + h.w / 2 + 0.4, z0: z - h.d / 2 - 0.4, z1: z + h.d / 2 + 0.4 };
      if (!estado.items.some((it) => choca(cand, huellaMundo(it), 0))) return { x, z };
    }
  }
  return { x: 0, z: 0 };
  void o;
}
function agregar(id, { cap, x, z, rot = 0, caer = true, seleccionarlo = true, deUsuario = true } = {}) {
  if (deUsuario) marcarPropia();
  cap = cap ?? capMedia(id);
  if (x === undefined) ({ x, z } = lugarLibre(id, cap));
  const item = { uid: uidSig++, id, cap, x: ajustar(x), z: ajustar(z), rot };
  estado.items.push(item);
  crearObjeto(item, { caer });
  cambio();
  if (seleccionarlo) seleccionar(item.uid);
  return item;
}
const ajustar = (v) => Math.round(v * 4) / 4;
function quitar(uid) {
  marcarPropia();
  estado.items = estado.items.filter((i) => i.uid !== uid);
  quitarObjeto(uid);
  if (seleccion === uid) seleccionar(null);
  cambio();
}
// ---------- plantillas, ejemplo y deshacer ----------
let cargas = [];
let esperaLitros = null;
function vaciarEscena() { cargas.forEach(clearTimeout); cargas = []; clearTimeout(esperaLitros); [...objetos.keys()].forEach(quitarObjeto); estado.items = []; seleccionar(null); }
const foto = () => JSON.parse(JSON.stringify({ producto: estado.producto, litros: estado.litros, sala: estado.sala, origen: estado.origen, modificada: estado.modificada, items: estado.items.map(({ id, cap, x, z, rot }) => ({ id, cap, x, z, rot })) }));
function restaurar(f) {
  vaciarEscena();
  Object.assign(estado, { producto: f.producto, litros: f.litros, sala: f.sala, origen: f.origen, modificada: f.modificada });
  pintarSala();
  f.items.forEach((it) => { const item = { ...it, uid: uidSig++ }; estado.items.push(item); crearObjeto(item); });
  pintarControles(); cambio(); pintarPlantillas(); encuadrar();
}
function marcarPropia() {
  if (estado.modificada) return;
  estado.modificada = true;
  pintarEjemplo(); pintarPlantillas();
}
function vaciarSala() {
  if (!estado.items.length && !cargas.length) return;
  const antes = foto();
  vaciarEscena();
  estado.origen = null; estado.modificada = true;
  cambio(); pintarPlantillas(); encuadrar();
  avisar('Sala vacía. Agrega equipos o parte de una plantilla.', { texto: 'Deshacer', accion: () => restaurar(antes) });
}
function cargarPlantilla(producto, { animar = true, deshacer = true } = {}) {
  const antes = estado.items.length && estado.modificada ? foto() : null;
  estado.producto = producto;
  pintarControles();
  plantilla({ animar });
  estado.origen = { producto, litros: estado.litros }; estado.modificada = false;
  cambio(); pintarPlantillas();
  if (deshacer && antes) avisar(`Plantilla cargada: ${app().nombre}.`, { texto: 'Deshacer', accion: () => restaurar(antes) });
}
const ejemplo = $('[data-ejemplo]');
const invitacion = $('[data-invitacion]');
function pintarEjemplo() {
  const a = estado.origen && APLICACIONES.find((x) => x.id === estado.origen.producto);
  const esEjemplo = !!a && !estado.modificada;
  ejemplo.hidden = !(esEjemplo && estado.items.length && !ejemplo.dataset.cerrado && !recorrido.activo && invitacion.hidden);
  if (a) {
    $('[data-ejemplo-titulo]').textContent = 'Esta es una planta de ejemplo';
    $('[data-ejemplo-datos]').textContent = `${a.nombre} · ${fmt(estado.litros)} L por día · ${estado.items.length} ${estado.items.length === 1 ? 'equipo' : 'equipos'}`;
  }
  $('[data-origen]').textContent = !estado.items.length ? '' : esEjemplo ? `Plantilla de ejemplo: ${a.nombre}. Cámbiala a tu medida.` : a ? `Basada en la plantilla ${a.nombre}.` : 'Armada equipo por equipo.';
}
function pintarPlantillas() {
  $('[data-plantillas]').innerHTML = APLICACIONES.map((a) => {
    const ids = [...new Set(a.linea(estado.litros).map((r) => r.id))];
    const enSala = estado.origen?.producto === a.id && !estado.modificada && estado.items.length;
    return `<li><button type="button" class="plantilla" data-cargar="${a.id}"${enSala ? ' aria-current="true"' : ''}>
      <span class="plantilla__cabeza"><strong>${a.nombre}</strong>${enSala ? '<span class="mono">En la sala</span>' : `<span class="mono">${ids.length} equipos</span>`}</span>
      <span class="plantilla__texto">${a.resumen}</span>
      <span class="plantilla__equipos">${ids.map((id) => `<img src="${imagenEquipo(id).src}" alt="" title="${EQUIPOS[id].nombre}" loading="lazy" decoding="async">`).join('')}</span>
    </button></li>`;
  }).join('');
}
$('[data-plantillas]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cargar]'); if (!b) return;
  if (recorrido.activo) detenerRecorrido();
  cargarPlantilla(b.dataset.cargar);
  if (matchMedia('(max-width: 980px)').matches) contEscena.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
});

function plantilla({ animar = true } = {}) {
  vaciarEscena();
  const linea = app().linea(estado.litros);
  const piezas = linea.map((r) => { const cap = capMinima(r.id, numero(r.dato)); const tmp = { uid: -1, id: r.id, cap, x: 0, z: 0, rot: 0 }; crearObjeto(tmp); const h = huellaMundo(tmp); quitarObjeto(-1); return { id: r.id, cap, w: h.w }; });
  const gap = 1.1;
  const total = piezas.reduce((s, p) => s + p.w, 0) + gap * (piezas.length - 1);
  const filas = total > estado.sala.w - 1.5 ? 2 : 1;
  const porFila = Math.ceil(piezas.length / filas);
  const paso = animar && !reducido ? 180 : 0;
  for (let f = 0; f < filas; f++) {
    const fila = piezas.slice(f * porFila, (f + 1) * porFila);
    const ancho = fila.reduce((s, p) => s + p.w, 0) + gap * (fila.length - 1);
    let x = -ancho / 2;
    fila.forEach((p, i) => {
      const px = x + p.w / 2, pz = filas === 1 ? 0 : (f === 0 ? -1.8 : 1.8);
      const poner = () => agregar(p.id, { cap: p.cap, x: px, z: pz, seleccionarlo: false, deUsuario: false, caer: animar });
      if (paso) cargas.push(setTimeout(poner, (f * porFila + i) * paso)); else poner();
      x += p.w + gap;
    });
  }
  if (paso) cargas.push(setTimeout(() => encuadrar(), piezas.length * paso + 400)); else encuadrar();
}

// ---------- tuberías y flujo ----------
const tuberias = new THREE.Group(); scene.add(tuberias);
const matTubo = new THREE.MeshPhysicalMaterial({ color: 0xe4e9ee, metalness: 1, roughness: 0.2 });
const matFlujo = new THREE.LineDashedMaterial({ color: 0xc4351c, dashSize: 0.22, gapSize: 0.14 });
const matFlecha = new THREE.MeshBasicMaterial({ color: 0xc4351c });
let conexiones = [];
// Flujo visible: la tubería se llena de azul con pulsos blancos de leche; en el piso, flechas rojas que avanzan
function texturaLeche() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(40, 49, 117, 0.96)'; g.fillRect(0, 0, 128, 16);
  const gr = g.createLinearGradient(36, 0, 92, 0);
  gr.addColorStop(0, 'rgba(255, 255, 255, 0)'); gr.addColorStop(0.3, 'rgba(255, 254, 248, 1)'); gr.addColorStop(0.7, 'rgba(255, 254, 248, 1)'); gr.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = gr; g.fillRect(36, 0, 56, 16);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function texturaFlechas() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = '#c4351c'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(14, 20); g.lineTo(32, 42); g.lineTo(50, 20); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const texLeche = texturaLeche(), texFlechas = texturaFlechas();
function materialFlujo(base, repetir) {
  const t = base.clone(); t.needsUpdate = true; t.repeat.set(...repetir);
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide });
}
function puertoMundo(item, cual) {
  const o = objetos.get(item.uid);
  o.raiz.updateMatrixWorld(true);
  return o.raiz.localToWorld(o.modelo.puertos[cual].clone());
}
function actualizarTuberias() {
  tuberias.children.forEach((c) => { c.geometry?.dispose(); if (c.userData.propio) { c.material.map?.dispose(); c.material.dispose(); } });
  tuberias.clear();
  conexiones = [];
  const lista = ordenados();
  for (let i = 0; i < lista.length - 1; i++) {
    const A = lista[i], B = lista[i + 1];
    if (FLUIDO.has(A.id) && FLUIDO.has(B.id)) {
      const a = puertoMundo(A, 'salida'), b = puertoMundo(B, 'entrada');
      const h = Math.max(2.4, a.y + 0.45, b.y + 0.45);
      const pts = [a, V(a.x, h, a.z), V(b.x, h, a.z), V(b.x, h, b.z), b].filter((p, k, arr) => k === 0 || p.distanceTo(arr[k - 1]) > 0.01);
      const ruta = new THREE.CurvePath();
      for (let k = 0; k < pts.length - 1; k++) ruta.add(new THREE.LineCurve3(pts[k], pts[k + 1]));
      const tubo = new THREE.Mesh(new THREE.TubeGeometry(ruta, 48 * (pts.length - 1), 0.035, 8, false), matTubo);
      tuberias.add(tubo);
      pts.slice(1, -1).forEach((p) => { const codo = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), matTubo); codo.position.copy(p); tuberias.add(codo); });
      const flujo = new THREE.Mesh(new THREE.TubeGeometry(ruta, 48 * (pts.length - 1), 0.056, 12, false), materialFlujo(texLeche, [Math.max(1, ruta.getLength() / 0.42), 1]));
      flujo.visible = false; flujo.renderOrder = 2; flujo.userData.propio = true; tuberias.add(flujo);
      conexiones.push({ de: A.uid, a: B.uid, curva: ruta, tipo: 'tubo', flujo, total: flujo.geometry.index.count });
    } else {
      const a = V(A.x, 0.02, A.z), b = V(B.x, 0.02, B.z);
      const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), matFlujo); linea.computeLineDistances();
      const medio = a.clone().lerp(b, 0.5);
      const flecha = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 3), matFlecha);
      flecha.position.copy(medio); flecha.rotation.x = Math.PI / 2;
      flecha.rotation.z = -Math.atan2(b.x - a.x, b.z - a.z);
      flecha.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
      tuberias.add(linea, flecha);
      const largo = a.distanceTo(b);
      const geo = new THREE.PlaneGeometry(0.34, largo, 1, 32); geo.rotateX(-Math.PI / 2);
      const banda = new THREE.Mesh(geo, materialFlujo(texFlechas, [1, Math.max(1, largo / 0.34)]));
      banda.position.set(medio.x, 0.02, medio.z); banda.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      banda.visible = false; banda.renderOrder = 2; banda.userData.propio = true; tuberias.add(banda);
      conexiones.push({ de: A.uid, a: B.uid, curva: new THREE.LineCurve3(V(A.x, 0.08, A.z), V(B.x, 0.08, B.z)), tipo: 'piso', flujo: banda, total: geo.index.count });
    }
  }
}

// ---------- validación y resumen ----------
function validar() {
  const avisos = [];
  const linea = app().linea(estado.litros);
  let cubiertas = 0;
  linea.forEach((r) => {
    const puestos = estado.items.filter((i) => i.id === r.id);
    const nombre = EQUIPOS[r.id].nombre;
    if (!puestos.length) { avisos.push({ tipo: 'falta', texto: `Falta ${nombre}. Se sugiere ${r.dato}.`, id: r.id, cap: capMinima(r.id, numero(r.dato)) }); return; }
    const necesaria = numero(r.dato);
    const unidad = FICHAS[r.id].unidad;
    const medible = ['L', 'L/h'].includes(unidad) && necesaria > 0;
    const suma = puestos.reduce((s, i) => s + i.cap, 0);
    if (medible && suma < necesaria * 0.95) { avisos.push({ tipo: 'corta', texto: `${nombre}: ${fmt(suma)} ${unidad} instalados; se sugieren ${r.dato}.`, uid: puestos[0].uid, cap: capMinima(r.id, necesaria) }); return; }
    cubiertas++;
  });
  const lista = estado.items;
  for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) if (choca(huellaMundo(lista[i]), huellaMundo(lista[j]))) avisos.push({ tipo: 'choque', texto: `${EQUIPOS[lista[i].id].nombre} y ${EQUIPOS[lista[j].id].nombre} se superponen.`, uids: [lista[i].uid, lista[j].uid] });
  const { w, l } = estado.sala;
  lista.forEach((it) => { const h = huellaMundo(it); if (h.x0 < -w / 2 || h.x1 > w / 2 || h.z0 < -l / 2 || h.z1 > l / 2) avisos.push({ tipo: 'fuera', texto: `${EQUIPOS[it.id].nombre} queda fuera de la sala.`, uids: [it.uid] }); });
  return { avisos, cubiertas, total: linea.length };
}
function area() {
  if (!estado.items.length) return 0;
  const hs = estado.items.map(huellaMundo);
  const x0 = Math.min(...hs.map((h) => h.x0)) - 1, x1 = Math.max(...hs.map((h) => h.x1)) + 1;
  const z0 = Math.min(...hs.map((h) => h.z0)) - 1, z1 = Math.max(...hs.map((h) => h.z1)) + 1;
  return (x1 - x0) * (z1 - z0);
}
let ultimaValidacion = { avisos: [] };
function pintarResumen() {
  const v = validar(); ultimaValidacion = v;
  const lista = ordenados();
  lista.forEach((it, i) => { const o = objetos.get(it.uid); $('b', o.etq).textContent = `${EQUIPOS[it.id].tag}-${String(i + 1).padStart(2, '0')}`; o.tag = $('b', o.etq).textContent; });
  $('[data-total-equipos]').textContent = estado.items.length;
  $('[data-total-area]').textContent = `${fmt(area(), 0)} m²`;
  $('[data-total-litros]').textContent = `${fmt(estado.litros)} L`;
  $('[data-estado-linea]').textContent = `${v.cubiertas} de ${v.total} etapas`;
  $('[data-estado-linea]').classList.toggle('ok', v.cubiertas === v.total && !v.avisos.length);
  $('[data-vacio]').hidden = estado.items.length > 0;
  const avisos = $('[data-avisos]');
  if (!estado.items.length) avisos.innerHTML = '';
  else if (!v.avisos.length) avisos.innerHTML = `<p class="aviso-ok">Línea completa para ${app().nombre.toLowerCase()} a ${fmt(estado.litros)} L por día.</p>`;
  else avisos.innerHTML = v.avisos.map((a, k) => `<p class="aviso-${a.tipo}">${a.texto}${a.tipo === 'falta' ? ` <button type="button" data-arreglar="${k}">Agregar</button>` : a.tipo === 'corta' ? ` <button type="button" data-arreglar="${k}">Ajustar</button>` : ''}</p>`).join('');
  $('[data-items]').innerHTML = lista.map((it) => { const o = objetos.get(it.uid); return `<li class="${it.uid === seleccion ? 'activo' : ''}"><button type="button" data-item="${it.uid}"><span class="mono">${o.tag}</span><strong>${EQUIPOS[it.id].nombre}</strong><small>${capTexto(it.id, it.cap)} · ${NOMBRE_ETAPA[ETAPA[it.id]]}</small></button></li>`; }).join('');
  // marcos de choque
  const enChoque = new Set(v.avisos.filter((a) => a.uids).flatMap((a) => a.uids));
  objetos.forEach((o, uid) => { o.marco.material = uid === seleccion ? matSel : enChoque.has(uid) ? matChoque : matMarco; });
  // WhatsApp
  const texto = `Hola, Equinox. Armé mi planta de ${app().nombre.toLowerCase()} para ${fmt(estado.litros)} L/día en la web:\n${lista.map((it) => `• ${EQUIPOS[it.id].nombre} · ${capTexto(it.id, it.cap)}`).join('\n')}\nÁrea aproximada: ${fmt(area())} m².`;
  $('[data-wa-planta]').href = `https://wa.me/${numeroWhatsApp()}?text=${encodeURIComponent(texto)}`;
}
$('[data-avisos]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-arreglar]'); if (!b) return;
  const a = ultimaValidacion.avisos[Number(b.dataset.arreglar)];
  if (a.tipo === 'falta') agregar(a.id, { cap: a.cap });
  if (a.tipo === 'corta') { marcarPropia(); const it = estado.items.find((i) => i.uid === a.uid); it.cap = a.cap; aplicarItem(objetos.get(it.uid)); cambio(); seleccionar(it.uid); }
});
$('[data-items]').addEventListener('click', (e) => { const b = e.target.closest('[data-item]'); if (b) { seleccionar(Number(b.dataset.item)); enfocar(Number(b.dataset.item)); } });

function cambio() {
  actualizarTuberias();
  pintarResumen();
  pintarEjemplo();
  guardarLS('eqx-planta', estado);
}

// ---------- selección e inspector ----------
let seleccion = null;
const ins = $('[data-inspector]');
function seleccionar(uid) {
  seleccion = uid;
  const it = estado.items.find((i) => i.uid === uid);
  ins.hidden = !it;
  objetos.forEach((o, k) => o.etq.classList.toggle('activa', k === uid));
  if (it) {
    const f = FICHAS[it.id];
    $('[data-ins-tag]').textContent = objetos.get(uid).tag || EQUIPOS[it.id].tag;
    $('[data-ins-nombre]').textContent = EQUIPOS[it.id].nombre;
    $('[data-ins-cap]').innerHTML = f.capacidades.map((c) => `<option value="${c}" ${c === it.cap ? 'selected' : ''}>${capTexto(it.id, c)}</option>`).join('');
    $('[data-ins-cap]').disabled = f.capacidades.length < 2;
    $('[data-ins-ficha]').href = `equipo.html?e=${it.id}&cap=${it.cap}`;
  }
  pintarResumen();
}
$('[data-ins-cap]').addEventListener('change', (e) => { const it = estado.items.find((i) => i.uid === seleccion); if (!it) return; marcarPropia(); it.cap = Number(e.target.value); aplicarItem(objetos.get(it.uid)); cambio(); });
ins.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ins]'); if (!b) return;
  const it = estado.items.find((i) => i.uid === seleccion); if (!it) return;
  if (b.dataset.ins === 'rotar') { marcarPropia(); it.rot = ((it.rot || 0) + 1) % 4; aplicarItem(objetos.get(it.uid)); cambio(); }
  if (b.dataset.ins === 'quitar') quitar(it.uid);
  if (b.dataset.ins === 'duplicar') agregar(it.id, { cap: it.cap, rot: it.rot });
});
addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  const it = estado.items.find((i) => i.uid === seleccion);
  if (e.key === 'Escape') { if (contEscena.classList.contains('completa')) salirCompleta(); seleccionar(null); }
  if (!it) return;
  if (e.key === 'r' || e.key === 'R') { marcarPropia(); it.rot = ((it.rot || 0) + 1) % 4; aplicarItem(objetos.get(it.uid)); cambio(); }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); quitar(it.uid); }
});

// ---------- puntero: mover equipos ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const planoPiso = new THREE.Plane(V(0, 1, 0), 0);
function aPiso(cx, cy) {
  const r = lienzo.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(planoPiso, V());
}
function tocado(cx, cy) {
  const r = lienzo.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects([...objetos.values()].map((o) => o.modelo.grupo), true);
  if (!hits.length) return null;
  let n = hits[0].object;
  while (n && ![...objetos.values()].some((o) => o.modelo.grupo === n)) n = n.parent;
  return [...objetos.values()].find((o) => o.modelo.grupo === n)?.item.uid ?? null;
}
let arrastre = null;
lienzo.addEventListener('pointerdown', (e) => {
  if (recorrido.activo) return;
  const uid = tocado(e.clientX, e.clientY);
  if (uid == null) { arrastre = { vacio: true, x: e.clientX, y: e.clientY }; return; }
  const it = estado.items.find((i) => i.uid === uid);
  const p = aPiso(e.clientX, e.clientY);
  arrastre = { uid, dx: it.x - p.x, dz: it.z - p.z, movio: false };
  controls.enabled = false;
  lienzo.setPointerCapture(e.pointerId);
  seleccionar(uid);
});
lienzo.addEventListener('pointermove', (e) => {
  if (!arrastre || arrastre.vacio) return;
  const p = aPiso(e.clientX, e.clientY); if (!p) return;
  const it = estado.items.find((i) => i.uid === arrastre.uid);
  const { w, l } = estado.sala;
  it.x = Math.min(w / 2, Math.max(-w / 2, ajustar(p.x + arrastre.dx)));
  it.z = Math.min(l / 2, Math.max(-l / 2, ajustar(p.z + arrastre.dz)));
  arrastre.movio = true;
  aplicarItem(objetos.get(it.uid));
  actualizarTuberias();
  lienzo.classList.add('moviendo');
});
lienzo.addEventListener('pointerup', (e) => {
  if (arrastre?.vacio && Math.hypot(e.clientX - arrastre.x, e.clientY - arrastre.y) < 5) seleccionar(null);
  if (arrastre && !arrastre.vacio) { controls.enabled = true; if (arrastre.movio) { marcarPropia(); cambio(); } }
  arrastre = null; lienzo.classList.remove('moviendo');
});
lienzo.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; contEscena.classList.add('soltando'); });
lienzo.addEventListener('dragleave', () => contEscena.classList.remove('soltando'));
lienzo.addEventListener('drop', (e) => {
  e.preventDefault(); contEscena.classList.remove('soltando');
  const id = e.dataTransfer.getData('text/plain'); if (!EQUIPOS[id]) return;
  const p = aPiso(e.clientX, e.clientY);
  agregar(id, { x: p?.x ?? 0, z: p?.z ?? 0 });
});

// ---------- catálogo ----------
$('[data-catalogo]').innerHTML = LINEAS.map((l) => `<section><h3 class="rotulo">${l.nombre}</h3><ul>${Object.entries(EQUIPOS).filter(([, e]) => e.linea === l.id).map(([id, e]) => `<li><button type="button" draggable="true" data-agregar-eq="${id}"><span class="mono">${e.tag}</span><strong>${e.nombre}</strong><small>${e.capacidad}</small><i aria-hidden="true">+</i></button></li>`).join('')}</ul></section>`).join('');
$('[data-catalogo]').addEventListener('click', (e) => { const b = e.target.closest('[data-agregar-eq]'); if (b) agregar(b.dataset.agregarEq); });
$('[data-catalogo]').addEventListener('dragstart', (e) => { const b = e.target.closest('[data-agregar-eq]'); if (b) e.dataTransfer.setData('text/plain', b.dataset.agregarEq); });

// ---------- producto, litros, sala ----------
const selProd = $('[data-producto]');
selProd.innerHTML = APLICACIONES.map((a) => `<option value="${a.id}">${a.nombre}</option>`).join('');
const rango = $('[data-litros]');
function pintarControles() {
  selProd.value = estado.producto;
  rango.value = aRango(estado.litros);
  rango.style.setProperty('--p', `${rango.value}%`);
  $('[data-litros-salida]').textContent = `${fmt(estado.litros)} L`;
  $('[data-sala-w]').value = estado.sala.w; $('[data-sala-l]').value = estado.sala.l;
}
selProd.addEventListener('change', () => {
  estado.producto = selProd.value;
  // Si la sala es la planta de ejemplo, se cambia por la plantilla del nuevo producto; si es propia, solo cambia la validación
  if (estado.origen && !estado.modificada) cargarPlantilla(selProd.value, { deshacer: false }); else { cambio(); pintarPlantillas(); }
});
// Litros: se piden sin obligar. Hasta que la persona indique los suyos, la cantidad es un ejemplo y se dice.
let litrosPropios = leer('eqx-litros', null);
function marcarLitros(propios = false) {
  if (propios) { litrosPropios = estado.litros; guardarLS('eqx-litros', estado.litros); }
  $('[data-campo-litros]').classList.toggle('pide', !litrosPropios);
  $('[data-litros-pista]').textContent = litrosPropios ? 'Dimensionada para tus litros.' : 'Es un ejemplo: ajústalo a tu planta.';
}
function fijarLitros(L) {
  estado.litros = Math.min(20000, Math.max(200, Math.round(L / 100) * 100));
  pintarControles(); marcarLitros(true);
  if (estado.origen && !estado.modificada) cargarPlantilla(estado.producto, { animar: false, deshacer: false }); else cambio();
  pintarPlantillas();
}
function irALitros() {
  const campo = $('[data-campo-litros]');
  if (matchMedia('(max-width: 980px)').matches) campo.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' });
  else $('.planta__catalogo').scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
  rango.focus({ preventScroll: true });
  campo.classList.remove('llamar'); void campo.offsetWidth; campo.classList.add('llamar');
}
rango.addEventListener('input', () => {
  estado.litros = aLitros(Number(rango.value)); pintarControles(); marcarLitros(true);
  // La planta de ejemplo se redimensiona con la leche por día; una planta propia solo se valida
  if (estado.origen && !estado.modificada) { clearTimeout(esperaLitros); esperaLitros = setTimeout(() => { if (estado.origen && !estado.modificada) cargarPlantilla(estado.producto, { animar: false, deshacer: false }); }, 260); } else cambio();
  pintarPlantillas();
});
$('[data-vaciar]').addEventListener('click', vaciarSala);
$('[data-ejemplo-vaciar]').addEventListener('click', vaciarSala);
$('[data-ejemplo-cerrar]').addEventListener('click', () => { ejemplo.dataset.cerrado = '1'; pintarEjemplo(); });
$$('[data-ver-plantillas]').forEach((b) => b.addEventListener('click', () => irAPestana('plantillas')));
$('[data-vacio-equipos]').addEventListener('click', () => irAPestana('equipos'));

// Pestañas Plantillas / Equipos
const pestanas = $$('[data-pestana]');
function mostrarPestana(k) { pestanas.forEach((p) => { const on = p.dataset.pestana === k; p.setAttribute('aria-selected', on); p.tabIndex = on ? 0 : -1; document.getElementById(p.getAttribute('aria-controls')).hidden = !on; }); }
function irAPestana(k) { mostrarPestana(k); const panel = $('.planta__catalogo'); const destino = document.getElementById(`panel-${k}`); if (matchMedia('(max-width: 980px)').matches) destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' }); else panel.scrollTo({ top: destino.offsetTop - $('.planta__pestanas').offsetHeight - 8, behavior: reducido ? 'auto' : 'smooth' }); $(`[data-pestana=${k}]`).focus({ preventScroll: true }); }
pestanas.forEach((p) => p.addEventListener('click', () => mostrarPestana(p.dataset.pestana)));
$('.planta__pestanas').addEventListener('keydown', (e) => { if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return; const i = pestanas.findIndex((p) => p.getAttribute('aria-selected') === 'true'); const sig = pestanas[(i + (e.key === 'ArrowRight' ? 1 : -1) + pestanas.length) % pestanas.length]; mostrarPestana(sig.dataset.pestana); sig.focus(); });
const cambiarSala = () => { estado.sala = { w: Math.min(40, Math.max(4, Number($('[data-sala-w]').value) || 14)), l: Math.min(40, Math.max(4, Number($('[data-sala-l]').value) || 9)) }; pintarSala(); cambio(); };
$('[data-sala-w]').addEventListener('change', cambiarSala);
$('[data-sala-l]').addEventListener('change', cambiarSala);

// ---------- cámara ----------
const vista = { objetivo: null, posicion: null };
function caja3() {
  const b = new THREE.Box3();
  if (!estado.items.length) b.setFromCenterAndSize(V(0, 0.6, 0), V(estado.sala.w, 1, estado.sala.l));
  else objetos.forEach((o) => b.expandByObject(o.modelo.grupo));
  return b;
}
function encuadrar(modo = modoVista) {
  const b = caja3(); const c = b.getCenter(V()); const r = Math.max(3, b.getBoundingSphere(new THREE.Sphere()).radius);
  const dist = (r / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * (camera.aspect < 1 ? 1.5 : 1.05);
  vista.objetivo = c.clone();
  vista.posicion = modo === 'planta' ? c.clone().add(V(0, dist * 1.1, dist * 0.06)) : c.clone().add(V(0.62, 0.56, 0.78).normalize().multiplyScalar(dist));
}
// Traslado: la cámara se aleja para ver ambos equipos y sigue al frente de la leche
const dirCam = V();
function encuadrarTraslado(con, frente) {
  const medio = con.curva.getPointAt(0.5), punta = con.curva.getPointAt(Math.min(1, frente));
  const largo = con.curva.getPointAt(0).distanceTo(con.curva.getPointAt(1));
  const objetivo = medio.clone().lerp(punta, 0.4);
  objetivo.y = Math.max(0.6, objetivo.y * 0.7);
  dirCam.copy(camera.position).sub(controls.target).setY(0);
  if (dirCam.lengthSq() < 1e-4) dirCam.set(0.62, 0, 0.78);
  dirCam.normalize();
  const dist = Math.max(5.5, largo * 1.25);
  vista.objetivo = objetivo;
  vista.posicion = objetivo.clone().addScaledVector(dirCam, dist * 0.82).setY(objetivo.y + dist * 0.58);
}
function enfocar(uid) {
  const o = objetos.get(uid); if (!o) return;
  const p = o.raiz.position.clone().add(V(0, o.alto * o.raiz.scale.y * 0.4, 0));
  const dir = camera.position.clone().sub(controls.target).normalize();
  vista.objetivo = p; vista.posicion = p.clone().addScaledVector(dir, Math.max(4.5, o.alto * o.raiz.scale.y * 2.6));
}
let modoVista = '3d';
$$('[data-vista3]').forEach((b) => b.addEventListener('click', () => { modoVista = b.dataset.vista3; $$('[data-vista3]').forEach((x) => x.setAttribute('aria-pressed', x === b)); encuadrar(); }));

// ---------- recorrido del proceso ----------
const recorrido = { activo: false, pausado: false, i: 0, fase: 'equipo', t: 0, orden: [], pintado: -1, entroCompleta: false };
const leche = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfffdf6 }), 18);
leche.visible = false; leche.frustumCulled = false; leche.renderOrder = 3; scene.add(leche);
// Producto que viaja por el piso entre estaciones (bloques de cuajada o queso)
const bloques = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.12, 0.17), new THREE.MeshStandardMaterial({ color: 0xf2e6bf, roughness: 0.55 }), 7);
bloques.visible = false; bloques.frustumCulled = false; scene.add(bloques);
const hud = $('[data-hud]');
const control = $('[data-control]');
const dummy = new THREE.Object3D();
const DUR_EQUIPO = 5.2, DUR_TRASLADO = 2.2;

// ---------- proceso en vivo: equipo en marcha y leche que se ve pasar ----------
// El equipo en marcha se abre en corte y lleva un anillo rojo que late en el piso; los demás se atenúan.
// Las tuberías ya recorridas siguen fluyendo (azul con pulsos blancos) y la del traslado se llena de punta a punta.
const matAnillo = new THREE.MeshBasicMaterial({ color: 0xc4351c, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
const matOnda = matAnillo.clone();
const anillo = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 96), matAnillo); anillo.rotation.x = -Math.PI / 2;
const onda = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 96), matOnda); onda.rotation.x = -Math.PI / 2;
const marcha = new THREE.Group(); marcha.add(anillo, onda); marcha.visible = false; scene.add(marcha);
let tVivo = 0;
function pintarOpacidad(o) {
  o.opPintada = o.opacidad;
  const f = o.opacidad;
  o.mats.forEach((m) => { m.opacity = m.userData.op0 * f; m.transparent = m.userData.tr0 || f < 0.999; m.depthWrite = f > 0.6 ? m.userData.dw0 : false; });
}
function ajustarCorte(o) {
  const { cX, cZ, abierto } = o.cortes;
  if (abierto < 0.003) { cX.constant = 50; cZ.constant = 50; return; }
  const P = o.raiz.position;
  const ang = Math.atan2(camera.position.x - P.x, camera.position.z - P.z);
  cX.normal.set(-Math.sin(ang + Math.PI / 4), 0, -Math.cos(ang + Math.PI / 4));
  cZ.normal.set(-Math.sin(ang - Math.PI / 4), 0, -Math.cos(ang - Math.PI / 4));
  const h = huellaMundo(o.item), extra = (1 - suave(abierto)) * Math.max(h.w, h.d) * 1.3;
  cX.constant = -(cX.normal.x * P.x + cX.normal.z * P.z) + extra;
  cZ.constant = -(cZ.normal.x * P.x + cZ.normal.z * P.z) + extra;
}
function efectosEnVivo(dt) {
  tVivo += dt;
  const r = recorrido, activo = r.activo;
  const actual = activo ? r.orden[r.i] : null;
  const siguiente = activo && r.fase === 'traslado' ? r.orden[r.i + 1] : null;
  const k = reducido ? 1 : Math.min(1, dt * 4);
  objetos.forEach((o, uid) => {
    if (uid < 0) return;
    const enFoco = !activo || uid === actual?.uid || uid === siguiente?.uid;
    o.opacidad += ((enFoco ? 1 : 0.2) - o.opacidad) * k;
    if (Math.abs(o.opacidad - o.opPintada) > 0.004) pintarOpacidad(o);
    o.etq.classList.toggle('tenue', activo && !enFoco);
    o.etq.classList.toggle('en-marcha', activo && r.fase === 'equipo' && uid === actual?.uid);
    if (o.modelo.cortable) {
      const abrir = activo && r.fase === 'equipo' && uid === actual?.uid ? 1 : 0;
      o.cortes.abierto += (abrir - o.cortes.abierto) * (reducido ? 1 : Math.min(1, dt * 2.6));
      ajustarCorte(o);
    }
  });
  if (activo && actual && r.fase === 'equipo') {
    const h = huellaMundo(actual), rad = Math.max(h.w, h.d) * 0.5 + 0.12;
    marcha.visible = true; marcha.position.set(actual.x, 0.016, actual.z);
    anillo.scale.setScalar(rad);
    const fase = reducido ? 0.5 : (tVivo % 1.6) / 1.6;
    onda.scale.setScalar(rad * (1 + fase * 0.75)); matOnda.opacity = 0.8 * (1 - fase);
  } else marcha.visible = false;
  conexiones.forEach((c, j) => {
    if (!c.flujo) return;
    let f = 0;
    if (activo) { if (j < r.i) f = 1; else if (j === r.i && r.fase === 'traslado') f = Math.min(1, (r.t / DUR_TRASLADO) * 1.25); }
    c.flujo.visible = f > 0;
    if (!f) return;
    c.flujo.geometry.setDrawRange(0, Math.max(6, Math.floor((c.total * f) / 6) * 6));
    if (reducido) return;
    const tex = c.flujo.material.map, vel = f < 1 ? 2.6 : 0.9;
    if (c.tipo === 'tubo') tex.offset.x -= dt * vel; else tex.offset.y += dt * vel * 0.8;
  });
}
function iniciarRecorrido({ completa = true } = {}) {
  if (recorrido.activo) return detenerRecorrido();
  if (!estado.items.length) return avisar('Agrega equipos para ver el recorrido.');
  seleccionar(null);
  Object.assign(recorrido, { activo: true, pausado: false, i: 0, fase: 'equipo', t: 0, orden: ordenados(), pintado: -1, entroCompleta: false });
  registrar('ver_recorrido_3d', { aplicacion: estado.producto });
  invitacion.hidden = true;
  $$('.llamar').forEach((el) => el.classList.remove('llamar'));
  try { sessionStorage.setItem('eqx-recorrido-visto', '1'); } catch { /* sin almacenamiento */ }
  if (completa && !enCompleta()) { recorrido.entroCompleta = true; entrarCompleta(); }
  $('[data-recorrido]').classList.add('activo'); $('[data-recorrido] span').textContent = 'Detener recorrido';
  contEscena.classList.add('recorriendo');
  control.hidden = grab.activo;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.55;
  pintarEjemplo(); pintarControl();
  enfocar(recorrido.orden[0].uid);
}
function limpiarRecorrido() {
  recorrido.activo = false; leche.visible = false; bloques.visible = false; hud.hidden = true; control.hidden = true;
  objetos.forEach((o) => { o.paso = null; });
  controls.autoRotate = false;
  contEscena.classList.remove('recorriendo');
  $('[data-recorrido]').classList.remove('activo'); $('[data-recorrido] span').textContent = 'Recorrido del proceso';
}
function detenerRecorrido() {
  limpiarRecorrido();
  if (recorrido.entroCompleta) { recorrido.entroCompleta = false; salirCompleta(); }
  pintarEjemplo();
  encuadrar();
}
$('[data-recorrido]').addEventListener('click', () => iniciarRecorrido());
$('[data-ejemplo-ver]').addEventListener('click', () => iniciarRecorrido());

// Invitación a ver la planta funcionando (al llegar desde la portada con ?ver=recorrido)
const durRecorrido = (n) => Math.round(n * DUR_EQUIPO + Math.max(0, n - 1) * DUR_TRASLADO);
function mostrarInvitacion() {
  if (recorrido.activo || !estado.items.length) return;
  const a = app(), n = estado.items.length;
  $('[data-inv-titulo]').textContent = `Tu planta de ${a.corto.toLowerCase()} está lista`;
  pintarInvitacion();
  invitacion.hidden = false; pintarEjemplo();
  controls.autoRotate = true; controls.autoRotateSpeed = 0.4;
  $('[data-inv-play]').focus({ preventScroll: true });
}
// Antes de reproducir, la invitación pregunta los litros (opciones rápidas u otra cantidad); no es obligatorio
const OPCIONES_LITROS = [500, 1000, 2000, 5000, 10000];
function pintarInvitacion() {
  const n = estado.items.length, enOpciones = OPCIONES_LITROS.includes(estado.litros);
  $('[data-inv-datos]').textContent = `${fmt(estado.litros)} L por día · ${n} ${n === 1 ? 'equipo' : 'equipos'} · recorrido de ${durRecorrido(n)} s`;
  $('[data-inv-opciones]').innerHTML = OPCIONES_LITROS.map((L) => `<button type="button" data-inv-l="${L}" aria-pressed="${L === estado.litros}">${fmt(L)} L</button>`).join('')
    + `<label class="planta__inv-otro${enOpciones ? '' : ' activo'}"><span>Otra</span><input type="text" inputmode="numeric" autocomplete="off" placeholder="3.500" value="${enOpciones ? '' : fmt(estado.litros)}" data-inv-otro aria-label="Otra cantidad de litros por día"></label>`;
  $('[data-inv-litros-nota]').textContent = litrosPropios ? `Dimensionada para tus ${fmt(estado.litros)} L por día.` : `Usamos ${fmt(estado.litros)} L de ejemplo; elige tu cantidad si es otra.`;
}
invitacion.addEventListener('click', (e) => {
  const b = e.target.closest('[data-inv-l]'); if (!b) return;
  fijarLitros(Number(b.dataset.invL)); pintarInvitacion();
  $(`[data-inv-l="${b.dataset.invL}"]`)?.focus();
});
invitacion.addEventListener('change', (e) => {
  if (!e.target.matches('[data-inv-otro]')) return;
  const n = Number(e.target.value.replace(/\D/g, ''));
  if (n) { fijarLitros(n); pintarInvitacion(); $('[data-inv-otro]')?.focus(); }
});
invitacion.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-inv-otro]')) { e.preventDefault(); e.target.blur(); } });
$('[data-ejemplo-litros]').addEventListener('click', irALitros);
function cerrarInvitacion() { invitacion.hidden = true; controls.autoRotate = recorrido.activo; pintarEjemplo(); }
$('[data-inv-play]').addEventListener('click', () => { cerrarInvitacion(); iniciarRecorrido(); });
$('[data-inv-cerrar]').addEventListener('click', cerrarInvitacion);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !invitacion.hidden) cerrarInvitacion(); });

// Si en un rato nadie ha visto el recorrido, el botón llama la atención (una sola vez por visita)
function llamarAlRecorrido() {
  let visto = false; try { visto = sessionStorage.getItem('eqx-recorrido-visto') === '1'; } catch { /* sin almacenamiento */ }
  if (visto || recorrido.activo || grab.activo || !estado.items.length || !invitacion.hidden) return;
  [$('[data-recorrido]'), ejemplo.hidden ? null : $('[data-ejemplo-ver]')].filter(Boolean).forEach((el) => el.classList.add('llamar'));
}
setTimeout(llamarAlRecorrido, 9000);
function irEtapa(i) {
  const r = recorrido; if (!r.activo) return;
  objetos.forEach((o) => { o.paso = null; }); leche.visible = false; bloques.visible = false;
  r.i = Math.max(0, Math.min(r.orden.length - 1, i)); r.fase = 'equipo'; r.t = 0;
  enfocar(r.orden[r.i].uid); pintarControl();
}
function pintarControl() {
  const r = recorrido; r.pintado = r.i;
  const it = r.orden[r.i]; if (!it) return;
  $('[data-rec-paso]').textContent = `Etapa ${r.i + 1} de ${r.orden.length} · ${NOMBRE_ETAPA[ETAPA[it.id]]}`;
  $('[data-rec-nombre]').textContent = EQUIPOS[it.id].nombre;
  $('[data-rec-barra]').innerHTML = r.orden.map((_, k) => `<i class="${k < r.i ? 'hecha' : k === r.i ? 'actual' : ''}"></i>`).join('');
  const b = $('[data-rec="pausa"]');
  b.setAttribute('aria-label', r.pausado ? 'Seguir el recorrido' : 'Pausar el recorrido');
  $('use', b).setAttribute('href', `assets/img/iconos.svg#i-${r.pausado ? 'play' : 'pause'}`);
  $('[data-rec="anterior"]').disabled = r.i === 0;
  $('[data-rec="siguiente"]').disabled = r.i >= r.orden.length - 1;
}
control.addEventListener('click', (e) => {
  const b = e.target.closest('[data-rec]'); if (!b) return;
  const acc = b.dataset.rec;
  if (acc === 'salir') return detenerRecorrido();
  if (acc === 'pausa') { recorrido.pausado = !recorrido.pausado; controls.autoRotate = !recorrido.pausado; pintarControl(); }
  if (acc === 'anterior') irEtapa(recorrido.i - 1);
  if (acc === 'siguiente') irEtapa(recorrido.i + 1);
});
function finRecorrido() {
  if (grab.activo) { limpiarRecorrido(); controls.autoRotate = true; grab.fase = 'cierre'; grab.t = 0; encuadrar(); return; }
  detenerRecorrido();
  avisar('Recorrido completo. ¿Cotizamos tu planta?');
}
function avanzarRecorrido(dt) {
  const r = recorrido; r.t += dt;
  const it = r.orden[r.i]; const o = objetos.get(it?.uid);
  if (!o) return detenerRecorrido();
  if (r.fase === 'equipo') {
    const pasos = o.modelo.pasos.slice(0, 3);
    const k = Math.min(pasos.length - 1, Math.floor((r.t / DUR_EQUIPO) * pasos.length));
    if (o.paso !== pasos[k]) { o.paso = pasos[k]; o.tp = 0; }
    const filas = o.modelo.hud(o.paso, o.tp) || [];
    hud.hidden = false;
    hud.innerHTML = `<div><span>Etapa ${r.i + 1} de ${r.orden.length}</span><strong>${NOMBRE_ETAPA[ETAPA[it.id]]}</strong></div><div><span>Equipo</span><strong>${EQUIPOS[it.id].nombre}</strong></div>${filas.map(([a, b]) => `<div><span>${a}</span><strong class="mono">${b}</strong></div>`).join('')}`;
    if (r.t >= DUR_EQUIPO) {
      o.paso = null;
      const con = conexiones.find((c) => c.de === it.uid);
      if (con && r.i < r.orden.length - 1) { r.fase = 'traslado'; r.t = 0; r.con = con; encuadrarTraslado(con, 0); }
      else if (r.i < r.orden.length - 1) { r.i++; r.t = 0; enfocar(r.orden[r.i].uid); }
      else finRecorrido();
    }
  } else {
    const u = Math.min(1, r.t / DUR_TRASLADO), frente = Math.min(1, u * 1.25);
    // Por tubería: un frente de leche blanca encabeza el llenado azul; por el piso: bloques de producto en fila
    const tubo = r.con.tipo === 'tubo', part = tubo ? leche : bloques, sep = tubo ? 0.012 : 0.07;
    leche.visible = tubo; bloques.visible = !tubo;
    for (let k = 0; k < part.count; k++) {
      const v = frente - k * sep;
      dummy.position.copy(r.con.curva.getPointAt(Math.max(0, Math.min(1, v))));
      dummy.rotation.set(0, tubo ? 0 : Math.atan2(r.con.curva.v2.x - r.con.curva.v1.x, r.con.curva.v2.z - r.con.curva.v1.z), 0);
      dummy.scale.setScalar(v > 0 && v < 1 ? (tubo ? 1 - k * 0.035 : 1) : 0.001);
      dummy.updateMatrix(); part.setMatrixAt(k, dummy.matrix);
    }
    part.instanceMatrix.needsUpdate = true;
    encuadrarTraslado(r.con, frente);
    hud.innerHTML = `<div><span>Traslado</span><strong>${r.con.tipo === 'tubo' ? 'Por tubería sanitaria' : 'Producto a la siguiente estación'}</strong></div><div><span>Hacia</span><strong>${EQUIPOS[r.orden[r.i + 1].id].nombre}</strong></div>`;
    if (r.t >= DUR_TRASLADO) { leche.visible = false; bloques.visible = false; r.i++; r.fase = 'equipo'; r.t = 0; enfocar(r.orden[r.i].uid); }
  }
}

// ---------- pantalla completa ----------
// Usa la API del navegador; donde no existe (iPhone), la escena ocupa la ventana con CSS.
const enCompleta = () => document.fullscreenElement === contEscena || contEscena.classList.contains('completa');
function entrarCompleta() {
  if (enCompleta()) return;
  const conCss = () => { contEscena.classList.add('completa'); document.documentElement.classList.add('sin-scroll'); pintarPantalla(); };
  if (contEscena.requestFullscreen) contEscena.requestFullscreen({ navigationUI: 'hide' }).then(pintarPantalla, conCss);
  else conCss();
}
function salirCompleta() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  contEscena.classList.remove('completa'); document.documentElement.classList.remove('sin-scroll');
  pintarPantalla();
}
function pintarPantalla() {
  const on = enCompleta(), b = $('[data-pantalla]');
  b.setAttribute('aria-pressed', on); b.title = on ? 'Salir de pantalla completa' : 'Pantalla completa';
  $('use', b).setAttribute('href', `assets/img/iconos.svg#i-arrows-${on ? 'in' : 'out'}`);
  $('span', b).textContent = on ? 'Salir de pantalla completa' : 'Pantalla completa';
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) recorrido.entroCompleta = false;
  pintarPantalla();
  if (!recorrido.activo && !grab.activo) setTimeout(encuadrar, 80);
});
$('[data-pantalla]').addEventListener('click', () => (enCompleta() ? salirCompleta() : entrarCompleta()));

// ---------- video del recorrido (inmersivo y descargable) ----------
// La escena se graba a 1280 × 720 en un lienzo 2D que suma portada, rótulos, lecturas y cierre con contacto.
const VW = 1280, VH = 720, DUR_INTRO = 3.4, DUR_CIERRE = 5;
const grab = { activo: false, fase: 'intro', t: 0, total: 0, lienzo: null, g: null, rec: null, trozos: [], cliente: null, logo: null, tipo: '', cancelado: false };
const cargarImg = (src) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
const resumenPlanta = () => ({ producto: app().nombre, litros: estado.litros, area: `${fmt(area())} m²`, equipos: ordenados().map((it) => `${EQUIPOS[it.id].nombre} · ${capTexto(it.id, it.cap)}`) });
$('[data-video-planta]').addEventListener('click', grabarVideo);
async function grabarVideo() {
  if (grab.activo) return;
  if (!estado.items.length) return avisar('Agrega equipos antes de grabar el recorrido.');
  const tipo = ['video/mp4;codecs=avc1.42E01F', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((x) => window.MediaRecorder?.isTypeSupported?.(x));
  if (!tipo || !HTMLCanvasElement.prototype.captureStream) return avisar('Este navegador no puede grabar video. Usa Chrome o Edge en computador.');
  const cliente = await pedirDatos({ motivo: 'el video del recorrido de tu planta', boton: 'Grabar y descargar', detalle: resumenPlanta(), origen: 'planta-video' });
  if (!cliente) return;
  if (recorrido.activo) detenerRecorrido();
  seleccionar(null);
  try { await document.fonts.ready; grab.logo = await cargarImg('assets/img/logo-equinox.png'); } catch { grab.logo = null; }
  grab.lienzo = document.createElement('canvas'); grab.lienzo.width = VW; grab.lienzo.height = VH; grab.lienzo.className = 'planta__video';
  grab.lienzo.setAttribute('aria-label', 'Vista previa del video que se está grabando');
  grab.g = grab.lienzo.getContext('2d');
  contEscena.appendChild(grab.lienzo);
  Object.assign(grab, { activo: true, fase: 'intro', t: 0, total: 0, cliente, tipo, cancelado: false, trozos: [] });
  contEscena.classList.add('grabando'); $('[data-grabando]').hidden = false; ejemplo.hidden = true;
  entrarCompleta();
  renderer.setPixelRatio(1); renderer.setSize(VW, VH, false); camera.aspect = VW / VH; camera.updateProjectionMatrix();
  encuadrar(); controls.autoRotate = true; controls.autoRotateSpeed = 0.55;
  grab.rec = new MediaRecorder(grab.lienzo.captureStream(30), { mimeType: tipo, videoBitsPerSecond: 4e6 });
  grab.rec.ondataavailable = (e) => { if (e.data.size) grab.trozos.push(e.data); };
  grab.rec.onstop = () => {
    const ok = !grab.cancelado && grab.trozos.length > 0;
    if (ok) {
      const blob = new Blob(grab.trozos, { type: tipo.split(';')[0] });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `Recorrido-planta-${app().id}-Equinox.${tipo.includes('mp4') ? 'mp4' : 'webm'}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    terminarGrabacion();
    avisar(ok ? 'Video del recorrido descargado.' : 'Grabación cancelada.');
  };
  grab.rec.start(500);
}
function terminarGrabacion() {
  grab.activo = false; grab.lienzo?.remove(); grab.lienzo = null;
  contEscena.classList.remove('grabando'); $('[data-grabando]').hidden = true;
  if (recorrido.activo) limpiarRecorrido();
  controls.autoRotate = false;
  salirCompleta();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); ajustarTam(); encuadrar(); pintarEjemplo();
}
$('[data-grabando-cancelar]').addEventListener('click', () => { grab.cancelado = true; if (grab.rec?.state === 'recording') grab.rec.stop(); else terminarGrabacion(); });
function pasoGrabacion(dt) {
  grab.t += dt; grab.total += dt;
  if (grab.fase === 'intro' && grab.t >= DUR_INTRO) { grab.fase = 'recorrido'; grab.t = 0; iniciarRecorrido({ completa: false }); }
  if (grab.fase === 'cierre' && grab.t >= DUR_CIERRE && grab.rec?.state === 'recording') grab.rec.stop();
  const s = Math.floor(grab.total);
  $('[data-grabando-tiempo]').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  componer();
}

// Dibujo del video: mismo sistema del sitio (papel, tinta, rojo de cota, Archivo y Martian Mono)
const COL = { tinta: '#08105a', tinta3: '#4f5779', rojo: '#c4351c', papel: 'rgba(237,240,244,', papelHi: '#f7f9fb' };
const F = (peso, tam, mono = false) => `${peso} ${tam}px ${mono ? '"Martian Mono", ui-monospace, monospace' : '"Archivo", "Segoe UI", sans-serif'}`;
const suaveSalida = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
function txt(g, t, x, y, fuente, color, align = 'left') { g.font = fuente; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(t, x, y); }
function recortar(g, t, max, fuente) { g.font = fuente; if (g.measureText(t).width <= max) return t; let s = t; while (s.length > 1 && g.measureText(`${s}…`).width > max) s = s.slice(0, -1); return `${s.trimEnd()}…`; }
function placa(g, x, y, w, h, fondo = COL.papelHi, borde = COL.tinta) { g.fillStyle = fondo; g.fillRect(x, y, w, h); if (borde) { g.lineWidth = 2; g.strokeStyle = borde; g.strokeRect(x + 1, y + 1, w - 2, h - 2); } }
function logo(g, x, y, w) { if (!grab.logo) return 0; const h = (w * grab.logo.naturalHeight) / grab.logo.naturalWidth; g.drawImage(grab.logo, x, y, w, h); return h; }
function papelCompleto(g, opacidad) {
  g.fillStyle = `${COL.papel}${opacidad})`; g.fillRect(0, 0, VW, VH);
  g.strokeStyle = `rgba(8,16,90,${0.05 * opacidad})`; g.lineWidth = 1; g.beginPath();
  for (let x = 0; x <= VW; x += 40) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, VH); }
  for (let y = 0; y <= VH; y += 40) { g.moveTo(0, y + 0.5); g.lineTo(VW, y + 0.5); }
  g.stroke();
}
function cota(g, x0, x1, y) { g.strokeStyle = COL.rojo; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.moveTo(x0, y - 7); g.lineTo(x0, y + 7); g.moveTo(x1, y - 7); g.lineTo(x1, y + 7); g.stroke(); }
function componer() {
  const g = grab.g, cli = grab.cliente;
  g.drawImage(lienzo, 0, 0, VW, VH);
  if (grab.fase === 'intro') {
    g.globalAlpha = 1 - suaveSalida((grab.t - (DUR_INTRO - 0.7)) / 0.7);
    papelCompleto(g, 0.95);
    const sube = (1 - suaveSalida(grab.t / 0.9)) * 26;
    g.save(); g.translate(0, sube);
    logo(g, 96, 132, 220);
    txt(g, 'Recorrido de tu planta', 96, 318, F(760, 68), COL.tinta);
    g.font = F(760, 68); cota(g, 96, 96 + g.measureText('Recorrido de tu planta').width, 346);
    txt(g, `${app().nombre} · ${fmt(estado.litros)} L por día · ${estado.items.length} equipos`, 96, 400, F(500, 26), COL.tinta3);
    txt(g, `Preparado para ${cli.empresa}`, 96, 474, F(600, 22, true), COL.rojo);
    txt(g, `${cli.nombre} · ${cli.cargo}`, 96, 510, F(560, 21), COL.tinta);
    txt(g, 'Industrias Equinox Colombia · Plano preliminar con valores de muestra', 96, 650, F(500, 15), COL.tinta3);
    g.restore(); g.globalAlpha = 1;
    return;
  }
  // Marca y destinatario (se desvanecen al entrar el cierre)
  g.globalAlpha = grab.fase === 'cierre' ? 1 - suaveSalida(grab.t / 0.9) : 1;
  placa(g, 24, 20, 184, 66); logo(g, 40, 28, 152);
  const chip = recortar(g, `Preparado para ${cli.empresa}`, 420, F(600, 15, true)); g.font = F(600, 15, true);
  const cw = g.measureText(chip).width + 36; placa(g, VW - 24 - cw, 20, cw, 46); txt(g, chip, VW - 24 - cw / 2, 49, F(600, 15, true), COL.tinta, 'center');
  etiquetasVideo(g);
  g.globalAlpha = 1;
  if (grab.fase === 'recorrido' && recorrido.activo) panelEtapa(g);
  if (grab.fase === 'cierre') cierreVideo(g);
}
const tmpV = V();
function etiquetasVideo(g) {
  const actual = recorrido.activo ? recorrido.orden[recorrido.i]?.uid : null;
  objetos.forEach((o, uid) => {
    tmpV.copy(o.raiz.position); tmpV.y += o.alto * o.raiz.scale.y + 0.25; tmpV.project(camera);
    if (tmpV.z >= 1) return;
    const x = ((tmpV.x + 1) / 2) * VW, y = ((1 - tmpV.y) / 2) * VH;
    const nombre = EQUIPOS[o.item.id].nombre, codigo = o.tag || EQUIPOS[o.item.id].tag;
    const on = uid === actual;
    g.font = F(700, 13, true); const wc = g.measureText(codigo).width + 14;
    g.font = F(620, 14); const wn = g.measureText(nombre).width + 16;
    const w = wc + wn, h = 28, x0 = x - w / 2, y0 = y - h;
    const base = g.globalAlpha; g.globalAlpha = base * (actual == null || on ? 1 : 0.55);
    placa(g, x0, y0, w, h, COL.papelHi, on ? COL.rojo : COL.tinta);
    g.fillStyle = on ? COL.rojo : COL.tinta; g.fillRect(x0 + 3, y0 + 3, wc - 3, h - 6);
    txt(g, codigo, x0 + 3 + (wc - 3) / 2, y0 + 19, F(700, 13, true), '#fff', 'center');
    txt(g, nombre, x0 + wc + 8, y0 + 19, F(620, 14), COL.tinta);
    g.globalAlpha = base;
  });
}
function panelEtapa(g) {
  const r = recorrido, it = r.orden[r.i]; if (!it) return;
  const x = 32, y = VH - 178, w = 600, h = 132;
  placa(g, x, y, w, h, 'rgba(247,249,251,0.96)');
  if (r.fase === 'equipo') {
    txt(g, `ETAPA ${r.i + 1} DE ${r.orden.length} · ${NOMBRE_ETAPA[ETAPA[it.id]].toUpperCase()}`, x + 26, y + 38, F(600, 15, true), COL.rojo);
    txt(g, recortar(g, EQUIPOS[it.id].nombre, w - 52, F(740, 34)), x + 26, y + 84, F(740, 34), COL.tinta);
    txt(g, `${EQUIPOS[it.id].tag} · ${capTexto(it.id, it.cap)}`, x + 26, y + 114, F(500, 16, true), COL.tinta3);
    const o = objetos.get(it.uid); const filas = (o && o.modelo.hud(o.paso, o.tp)) || [];
    if (filas.length) {
      const fw = 360, fh = filas.length * 34 + 52, fx = VW - 32 - fw, fy = VH - 46 - fh;
      placa(g, fx, fy, fw, fh, 'rgba(247,249,251,0.96)');
      txt(g, 'LECTURA EN VIVO', fx + 22, fy + 30, F(600, 12, true), COL.rojo);
      filas.forEach(([a, b], k) => {
        txt(g, recortar(g, String(a).toUpperCase(), 190, F(650, 13)), fx + 22, fy + 64 + k * 34, F(650, 13), COL.tinta3);
        txt(g, String(b), fx + fw - 22, fy + 64 + k * 34, F(600, 17, true), COL.tinta, 'right');
      });
    }
  } else {
    txt(g, 'TRASLADO', x + 26, y + 38, F(600, 15, true), COL.rojo);
    txt(g, r.con.tipo === 'tubo' ? 'Por tubería sanitaria' : 'Producto a la siguiente estación', x + 26, y + 84, F(740, 32), COL.tinta);
    txt(g, recortar(g, `Hacia ${EQUIPOS[r.orden[r.i + 1].id].nombre}`, w - 52, F(500, 16, true)), x + 26, y + 114, F(500, 16, true), COL.tinta3);
  }
  // Avance por etapas
  const n = r.orden.length, bx = 32, bw = VW - 64, sep = 6, seg = (bw - (n - 1) * sep) / n;
  const avance = r.fase === 'equipo' ? Math.min(1, r.t / DUR_EQUIPO) : 1;
  for (let k = 0; k < n; k++) {
    const sx = bx + k * (seg + sep);
    g.fillStyle = 'rgba(8,16,90,0.18)'; g.fillRect(sx, VH - 28, seg, 5);
    if (k < r.i) { g.fillStyle = COL.tinta; g.fillRect(sx, VH - 28, seg, 5); }
    if (k === r.i) { g.fillStyle = COL.rojo; g.fillRect(sx, VH - 28, seg * avance, 5); }
  }
}
function cierreVideo(g) {
  const a = suaveSalida(grab.t / 0.9), cli = grab.cliente;
  g.globalAlpha = a;
  papelCompleto(g, 0.96);
  logo(g, 96, 84, 190);
  txt(g, 'Cotiza esta planta con Equinox', 96, 232, F(760, 46), COL.tinta);
  g.font = F(760, 46); cota(g, 96, 96 + g.measureText('Cotiza esta planta con Equinox').width, 256);
  txt(g, `${app().nombre} · ${fmt(estado.litros)} L por día · área aprox. ${fmt(area())} m²`, 96, 310, F(500, 22), COL.tinta3);
  const lista = ordenados();
  lista.slice(0, 7).forEach((it, k) => {
    const y = 362 + k * 34;
    txt(g, String(k + 1).padStart(2, '0'), 96, y, F(600, 15, true), COL.rojo);
    txt(g, recortar(g, `${EQUIPOS[it.id].nombre} · ${capTexto(it.id, it.cap)}`, 640, F(560, 19)), 140, y, F(560, 19), COL.tinta);
  });
  if (lista.length > 7) txt(g, `y ${lista.length - 7} equipos más`, 140, 362 + 7 * 34, F(500, 16), COL.tinta3);
  const px = 900, py = 96, pw = 300, ph = 330;
  placa(g, px, py, pw, ph, COL.tinta, null);
  txt(g, 'Contacto', px + 28, py + 50, F(740, 26), '#fff');
  [['WhatsApp', CONTACTO.whatsappTexto], ['Teléfono', CONTACTO.telefono], ['Correo', CONTACTO.correo], ['Web', CONTACTO.web], ['Planta', CONTACTO.lugar.replace(/, Colombia$/, '')]].forEach(([k, v], i) => {
    txt(g, k.toUpperCase(), px + 28, py + 96 + i * 46, F(650, 12), '#aab3d8');
    txt(g, recortar(g, v, pw - 56, F(560, 17)), px + 28, py + 118 + i * 46, F(560, 17), '#fff');
  });
  txt(g, recortar(g, `Preparado para ${cli.empresa} · ${cli.nombre}, ${cli.cargo}`, VW - 192, F(600, 16, true)), 96, 640, F(600, 16, true), COL.rojo);
  txt(g, 'Plano preliminar con valores de muestra. Equinox confirma medidas y capacidades en la visita técnica.', 96, 672, F(500, 14), COL.tinta3);
  g.globalAlpha = 1;
}

// ---------- capturas para PDF ----------
function capturar(modo) {
  const ancho = modo === 'planta' ? 1170 : 1500, alto = 1000;
  const tam = renderer.getSize(new THREE.Vector2()); const pr = renderer.getPixelRatio();
  const pos = camera.position.clone(), tgt = controls.target.clone();
  renderer.setPixelRatio(1); renderer.setSize(ancho, alto, false); camera.aspect = ancho / alto; camera.updateProjectionMatrix();
  const b = caja3(); const c = b.getCenter(V());
  const r = Math.max(3, modo === 'planta' ? Math.max(estado.sala.w, estado.sala.l) * 0.55 : b.getBoundingSphere(new THREE.Sphere()).radius);
  const dist = (r / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.05;
  if (modo === 'planta') { camera.position.copy(V(0, dist, 0.0001)); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0); camera.up.set(0, 1, 0); } else { camera.position.copy(c.clone().add(V(0.62, 0.56, 0.78).normalize().multiplyScalar(dist))); camera.lookAt(c); }
  const oscuroAntes = document.documentElement.dataset.tema === 'oscuro';
  if (oscuroAntes) aplicarTemaEscena(true);
  scene.background = new THREE.Color(0xffffff);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/jpeg', 0.9);
  scene.background = FONDO;
  if (oscuroAntes) aplicarTemaEscena();
  renderer.setPixelRatio(pr); renderer.setSize(tam.x, tam.y, false); camera.aspect = tam.x / tam.y; camera.updateProjectionMatrix();
  camera.position.copy(pos); controls.target.copy(tgt); camera.lookAt(tgt);
  return url;
}
$('[data-pdf-planta]').addEventListener('click', async (e) => {
  if (!estado.items.length) return avisar('Agrega equipos antes de descargar el plano.');
  const b = e.currentTarget;
  const cliente = await pedirDatos({ motivo: 'el plano de tu planta', boton: 'Descargar plano', detalle: resumenPlanta(), origen: 'planta-pdf' });
  if (!cliente) return; b.disabled = true; $('span', b).textContent = 'Preparando…';
  try {
    const { plantaPDF } = await import('./pdf.js');
    const lista = ordenados();
    const d = new Date();
    await plantaPDF({
      nombre: `Planta de ${app().nombre.toLowerCase()}`, litros: estado.litros, producto: app().nombre, area: `${fmt(area())} m²`,
      equipos: lista.map((it) => { const h = huellaMundo(it); return { nombre: EQUIPOS[it.id].nombre, capacidad: capTexto(it.id, it.cap), huella: `${fmt(h.w, 1)} × ${fmt(h.d, 1)} m`, etapa: NOMBRE_ETAPA[ETAPA[it.id]] }; }),
      isometrica: capturar('3d'), planta: capturar('planta'), avisos: ultimaValidacion.avisos.map((a) => a.texto),
      fecha: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
      cliente,
    });
    registrar('descargar_pdf', { tipo: 'planta' });
    avisar('Plano descargado.');
  } catch (err) { console.error(err); avisar('No se pudo generar el PDF en este navegador.'); }
  finally { b.disabled = false; $('span', b).textContent = 'Plano en PDF'; }
});

// ---------- cotizar ----------
$$('[data-cotizar-planta]').forEach((a) => a.addEventListener('click', () => {
  guardarLS('eqx-planta', estado);
  let antes = []; try { antes = JSON.parse(localStorage.getItem('eqx-cotizacion')) || []; } catch { /* sin almacenamiento */ }
  const ids = [...new Set(estado.items.map((i) => i.id))];
  registrarAgregados(antes, ids, 'planta');
  guardarLS('eqx-cotizacion', ids);
  a.href = 'index.html?planta=1#cotizar';
}));

// ---------- avisos flotantes ----------
const aviso = $('[data-aviso]');
function avisar(t, accion) {
  aviso.textContent = t;
  if (accion) { const b = document.createElement('button'); b.type = 'button'; b.textContent = accion.texto; b.addEventListener('click', () => { aviso.hidden = true; accion.accion(); }); aviso.append(b); }
  aviso.hidden = false; clearTimeout(avisar.t); avisar.t = setTimeout(() => { aviso.hidden = true; }, accion ? 8000 : 3400);
}

// ---------- menú ----------
const boton = $('.nav__menu'), menu = $('#menu-movil');
boton.addEventListener('click', () => { const abrir = boton.getAttribute('aria-expanded') !== 'true'; boton.setAttribute('aria-expanded', abrir); menu.hidden = !abrir; menu.classList.toggle('abierto', abrir); });

// ---------- tamaño y bucle ----------
function ajustarTam() { if (grab.activo) return; const { clientWidth: w, clientHeight: h } = contEscena; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(ajustarTam).observe(contEscena);
const reloj = new THREE.Clock();
let t = 0;
const tmp = V();
function cuadro() {
  requestAnimationFrame(cuadro);
  const dt = Math.min(reloj.getDelta(), 0.05); t += dt;
  if (recorrido.activo && !recorrido.pausado) avanzarRecorrido(dt);
  efectosEnVivo(recorrido.pausado ? 0 : dt);
  if (recorrido.activo && recorrido.pintado !== recorrido.i) pintarControl();
  if (vista.objetivo) {
    const k = reducido ? 1 : 1 - Math.pow(0.02, dt);
    controls.target.lerp(vista.objetivo, k);
    if (vista.posicion) camera.position.lerp(vista.posicion, k);
    if (controls.target.distanceTo(vista.objetivo) < 0.01 && (!vista.posicion || camera.position.distanceTo(vista.posicion) < 0.02)) { vista.objetivo = null; vista.posicion = null; }
  }
  controls.update();
  objetos.forEach((o) => {
    if (o.caida > 0) { o.caida = Math.max(0, o.caida - dt * 2.2); o.raiz.position.y = suave(o.caida) * 2.2; }
    o.tp += dt;
    o.modelo.animar(dt, t, o.paso, o.tp);
  });
  renderer.render(scene, camera);
  if (grab.activo) pasoGrabacion(dt);
  // etiquetas
  const w = lienzo.clientWidth, h = lienzo.clientHeight;
  objetos.forEach((o) => {
    tmp.copy(o.raiz.position); tmp.y += o.alto * o.raiz.scale.y + 0.25; tmp.project(camera);
    const vis = tmp.z < 1;
    o.etq.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px) translate(-50%, -100%)`;
    o.etq.style.visibility = vis ? 'visible' : 'hidden';
  });
  $$('.cota-sala', capaEtq).forEach((el) => { tmp.copy(el._p).project(camera); el.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px) translate(-50%, -50%)`; });
}

// ---------- inicio ----------
// Primera visita: la sala abre con una planta de ejemplo (queso campesino, 2.000 L) y el aviso para vaciarla.
// Si ya hay una planta guardada, se respeta tal como la dejó la persona.
const params = new URLSearchParams(location.search);
const guardado = leer('eqx-planta', null);
const aplParam = params.get('apl') && APLICACIONES.find((a) => a.id === params.get('apl')) ? params.get('apl') : null;
if (guardado?.items && !aplParam) {
  estado = { ...estado, ...guardado, items: [] };
  pintarSala();
  guardado.items.forEach((it) => { if (EQUIPOS[it.id] && FICHAS[it.id]) { const item = { ...it, uid: uidSig++ }; estado.items.push(item); crearObjeto(item); } });
  // Plantas guardadas por la versión anterior: si coinciden con la plantilla de su producto, son el ejemplo
  if (!('origen' in guardado) && estado.items.length) {
    const deLinea = app().linea(estado.litros).map((r) => r.id).sort().join();
    if (deLinea === estado.items.map((x) => x.id).sort().join()) { estado.origen = { producto: estado.producto, litros: estado.litros }; estado.modificada = false; }
  }
} else pintarSala();
pintarControles();
pintarPlantillas();
if (aplParam) {
  estado.litros = Math.max(200, Number(params.get('L')) || 2000);
  cargarPlantilla(aplParam, { deshacer: false });
  // Desde la portada ("Ver esta planta funcionando"): la sala se arma y luego invita a reproducir el recorrido
  if (params.get('ver') === 'recorrido') setTimeout(mostrarInvitacion, reducido ? 50 : 1300);
} else if (!guardado) {
  if (litrosPropios) estado.litros = litrosPropios;
  cargarPlantilla('campesino', { deshacer: false });
}
marcarLitros();
cambio();
const agregarParam = params.get('agregar');
if (agregarParam && EQUIPOS[agregarParam] && FICHAS[agregarParam]) setTimeout(() => { agregar(agregarParam, { cap: Number(params.get('cap')) || undefined }); avisar(`${EQUIPOS[agregarParam].nombre} agregado a tu planta.`); }, 300);
pintarPantalla();
ajustarTam();
encuadrar();
cuadro();
