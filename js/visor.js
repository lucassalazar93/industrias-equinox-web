// Visor 3D de ficha: vista general, explosionada (con etiquetas guía), en corte y en funcionamiento.
import * as THREE from 'three';
import { entornoAcero } from './estudio.js';
import { crearMateriales, construir, explotar } from './modelos.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

function texturaSombra() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  r.addColorStop(0, 'rgba(6,12,63,0.3)'); r.addColorStop(0.55, 'rgba(6,12,63,0.1)'); r.addColorStop(1, 'rgba(6,12,63,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function crearVisor(canvas, overlay, { id, opciones = {}, arrastrable = false, etiquetas = true, azimut = 0.72, elevacion = 0.32 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.environment = entornoAcero(renderer); // estudio con franjas de luz: el inox se ve como inox
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  const luz = new THREE.DirectionalLight(0xffffff, 1.2); luz.position.set(3, 6, 4);
  scene.add(luz, new THREE.AmbientLight(0xdfe6f5, 0.35));

  const cX = new THREE.Plane(V(-1, 0, 0), 50), cZ = new THREE.Plane(V(0, 0, -1), 50);
  const M = crearMateriales({ planos: [cX, cZ] });
  const modelo = construir(id, M, opciones);
  const raiz = new THREE.Group();
  raiz.add(modelo.grupo);
  scene.add(raiz);
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.002;
  scene.add(sombra);

  // Encuadre en reposo y explosionado
  const caja = new THREE.Box3();
  const medir = (f) => { explotar(modelo, f); modelo.grupo.updateMatrixWorld(true); caja.setFromObject(modelo.grupo); const s = caja.getBoundingSphere(new THREE.Sphere()); return { c: s.center.clone(), r: s.radius }; };
  const enc0 = medir(0), enc1 = medir(1); explotar(modelo, 0);
  sombra.scale.setScalar(enc0.r * 2.6);

  // Etiquetas guía
  const capa = document.createElement('div'); capa.className = 'guias';
  capa.innerHTML = '<svg class="guias__lineas"></svg>';
  overlay?.appendChild(capa);
  const svg = capa.querySelector('svg');
  const unicas = [];
  modelo.partes.forEach((p) => { if (!unicas.find((u) => u.nombre === p.nombre)) unicas.push(p); });
  const etqs = unicas.map((p, i) => { const el = document.createElement('div'); el.className = 'etq'; el.innerHTML = `<b class="mono">${String(i + 1).padStart(2, '0')}</b><span>${p.nombre}</span>`; capa.appendChild(el); return { p, el, n: i + 1 }; });
  const hud = document.createElement('div'); hud.className = 'hud'; hud.hidden = true; overlay?.appendChild(hud);

  const estado = { exp: 0, corte: 0, zoom: 1, azim: azimut, elev: elevacion, giro: 0.1, paso: null, tp: 0, escala: 1, etq: 0 };
  const meta = { ...estado };
  let yawArr = 0, arrastre = null, visible = true;

  if (arrastrable) {
    canvas.style.touchAction = 'pan-y';
    canvas.addEventListener('pointerdown', (e) => { arrastre = { x: e.clientX, y: e.clientY, az: meta.azim, el: meta.elev }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('arrastrando'); });
    canvas.addEventListener('pointermove', (e) => { if (!arrastre) return; meta.azim = arrastre.az - (e.clientX - arrastre.x) * 0.008; meta.elev = Math.min(1.1, Math.max(0.02, arrastre.el + (e.clientY - arrastre.y) * 0.004)); });
    const soltar = () => { arrastre = null; canvas.classList.remove('arrastrando'); };
    canvas.addEventListener('pointerup', soltar); canvas.addEventListener('pointercancel', soltar);
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '120px' }).observe(canvas);
  const ajustar = () => { const { clientWidth: w, clientHeight: h } = canvas.parentElement; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(ajustar).observe(canvas.parentElement); ajustar();

  function posicionCamara(est, aspecto = camera.aspect) {
    const c = enc0.c.clone().lerp(enc1.c, est.exp).multiplyScalar(est.escala);
    const r = (enc0.r + (enc1.r - enc0.r) * est.exp) * est.escala;
    const fovV = THREE.MathUtils.degToRad(camera.fov);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspecto);
    const dist = (r / Math.sin(Math.min(fovV, fovH) / 2)) * 1.02 * est.zoom;
    const dir = V(Math.sin(est.azim) * Math.cos(est.elev), Math.sin(est.elev), Math.cos(est.azim) * Math.cos(est.elev));
    return { pos: c.clone().addScaledVector(dir, dist), c };
  }

  function aplicar(dt, t) {
    explotar(modelo, estado.exp);
    raiz.scale.setScalar(estado.escala);
    sombra.scale.setScalar(enc0.r * 2.6 * estado.escala);
    const { pos, c } = posicionCamara(estado);
    camera.position.copy(pos); camera.lookAt(c);
    const ang = Math.atan2(pos.x - c.x, pos.z - c.z);
    const k = modelo.cortable && estado.corte > 0.002 ? (1 - Math.min(1, estado.corte * 1.08)) * enc0.r * 1.6 * estado.escala : 50;
    cX.normal.set(-Math.sin(ang + Math.PI / 4), 0, -Math.cos(ang + Math.PI / 4)); cX.constant = k;
    cZ.normal.set(-Math.sin(ang - Math.PI / 4), 0, -Math.cos(ang - Math.PI / 4)); cZ.constant = k;
    modelo.animar(dt, t, estado.exp > 0.25 ? null : estado.paso, estado.tp);
  }

  function etiquetar() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const op = estado.etq;
    capa.style.opacity = op;
    if (op < 0.02) return;
    const pts = etqs.map((e) => {
      const p = e.p.ancla.clone().addScaledVector(e.p.off, estado.exp).multiplyScalar(estado.escala).project(camera);
      return { e, x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
    });
    const centro = w / 2, margen = Math.max(12, w * 0.02), colW = Math.min(220, w * 0.26);
    const izq = pts.filter((q) => q.x < centro).sort((a, b) => a.y - b.y);
    const der = pts.filter((q) => q.x >= centro).sort((a, b) => a.y - b.y);
    const repartir = (lista) => { let y = 24; lista.forEach((q) => { q.ly = Math.max(q.y, y); y = q.ly + 34; }); const exceso = y - 34 - (h - 16); if (exceso > 0) lista.forEach((q) => { q.ly -= exceso; }); };
    repartir(izq); repartir(der);
    let d = '';
    izq.forEach((q) => { q.e.el.style.transform = `translate(${margen}px, ${q.ly - 12}px)`; q.e.el.style.width = `${colW}px`; q.e.el.classList.add('etq--izq'); q.e.el.classList.remove('etq--der'); const xb = margen + colW + 6; d += `M${xb} ${q.ly}H${xb + 14}L${q.x} ${q.y}`; });
    der.forEach((q) => { q.e.el.style.transform = `translate(${w - margen - colW}px, ${q.ly - 12}px)`; q.e.el.style.width = `${colW}px`; q.e.el.classList.add('etq--der'); q.e.el.classList.remove('etq--izq'); const xb = w - margen - colW - 6; d += `M${xb} ${q.ly}H${xb - 14}L${q.x} ${q.y}`; });
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = `<path d="${d}"/>${pts.map((q) => `<circle cx="${q.x}" cy="${q.y}" r="3.2"/>`).join('')}`;
  }

  let ultimoHud = 0;
  function escribirHud(t) {
    if (t - ultimoHud < 0.12) return;
    ultimoHud = t;
    const filas = estado.exp < 0.25 && estado.paso ? modelo.hud(estado.paso, estado.tp) : null;
    hud.hidden = !filas;
    if (filas) hud.innerHTML = filas.map(([k, v]) => `<div><span>${k}</span><strong class="mono">${v}</strong></div>`).join('');
  }

  const reloj = new THREE.Clock();
  let t = 0;
  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!visible) { reloj.getDelta(); return; }
    const dt = Math.min(reloj.getDelta(), 0.05); t += dt;
    const k = reducido ? 1 : 1 - Math.pow(0.003, dt);
    ['exp', 'corte', 'zoom', 'escala', 'etq'].forEach((key) => { estado[key] += (meta[key] - estado[key]) * k; });
    if (!arrastre && meta.giro && !reducido) meta.azim += dt * meta.giro;
    estado.azim += (meta.azim - estado.azim) * k; estado.elev += (meta.elev - estado.elev) * k;
    estado.paso = meta.paso; estado.tp += dt;
    aplicar(dt, t);
    renderer.render(scene, camera);
    if (etiquetas) etiquetar();
    escribirHud(t);
  }
  cuadro();

  const MODOS = {
    general: { exp: 0, corte: 0, zoom: 1, giro: 0.1, paso: null, etq: 0 },
    explosionada: { exp: 1, corte: 0, zoom: 1.05, giro: 0.04, paso: null, etq: 1 },
    corte: { exp: 0, corte: 1, zoom: 0.95, giro: 0.06, paso: null, etq: 0 },
  };
  function ir(modo, extra = {}) {
    const m = typeof modo === 'string' ? (MODOS[modo] || { exp: 0, corte: modelo.cortable ? 1 : 0, zoom: 0.95, giro: 0.05, paso: modo, etq: 0 }) : modo;
    const pasoNuevo = m.paso !== meta.paso;
    Object.assign(meta, m, extra);
    if (pasoNuevo) estado.tp = 0;
    if (reducido) Object.assign(estado, meta);
  }

  function capturar(modo = 'general', { ancho = 1400, alto = 1050 } = {}) {
    const guardado = { ...estado };
    const m = MODOS[modo] || MODOS.general;
    Object.assign(estado, m, { escala: estado.escala, azim: 0.72, elev: 0.3, paso: null, tp: 0 });
    const tamano = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    renderer.setPixelRatio(1); renderer.setSize(ancho, alto, false);
    camera.aspect = ancho / alto; camera.updateProjectionMatrix();
    renderer.setClearColor(0xffffff, 1);
    aplicar(0, t);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/jpeg', 0.9);
    const anclas = etqs.map((e) => { const p = e.p.ancla.clone().addScaledVector(e.p.off, estado.exp).multiplyScalar(estado.escala).project(camera); return { n: e.n, nombre: e.p.nombre, x: (p.x + 1) / 2, y: (1 - p.y) / 2 }; });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(pr); renderer.setSize(tamano.x, tamano.y, false);
    camera.aspect = tamano.x / tamano.y; camera.updateProjectionMatrix();
    Object.assign(estado, guardado);
    return { url, anclas };
  }

  return {
    ir, capturar,
    escalar: (s) => { meta.escala = s; if (reducido) estado.escala = s; },
    pasos: modelo.pasos, cortable: modelo.cortable, partes: etqs.map((e) => e.p.nombre),
  };
}
