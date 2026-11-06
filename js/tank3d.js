// Tanque de enfriamiento en acero inoxidable, modelado por código (Three.js).
import * as THREE from 'three';
import { entornoAcero } from './estudio.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function texturaCepillado() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * 64;
    const v = 100 + Math.random() * 70;
    g.fillStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.35})`;
    g.fillRect(0, y, 512, Math.random() * 1.4 + 0.3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 6);
  return t;
}

function texturaSombra() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  r.addColorStop(0, 'rgba(6,12,63,0.32)');
  r.addColorStop(0.55, 'rgba(6,12,63,0.12)');
  r.addColorStop(1, 'rgba(6,12,63,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// Perfil del casco: fondo con pendiente al desagüe, pared recta y domo superior.
function perfil(R, yFondo, yPared, yDomo) {
  const pts = [V(0, yFondo - 0.06, 0)];
  pts.push(V(R * 0.96, yFondo, 0), V(R, yFondo + 0.04, 0), V(R, yPared, 0));
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    pts.push(V(Math.cos(a) * R, yPared + Math.sin(a) * (yDomo - yPared), 0));
  }
  pts[pts.length - 1].x = 0.001;
  return pts.map((p) => new THREE.Vector2(p.x, p.y));
}

export function crearTanque(canvas, overlay, opciones = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.environment = entornoAcero(renderer); // estudio con franjas de luz: el inox se ve como inox

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const luz = new THREE.DirectionalLight(0xffffff, 1.2);
  luz.position.set(3, 6, 4);
  scene.add(luz, new THREE.AmbientLight(0xdfe6f5, 0.35));

  // Corte de un cuadrante (vista en corte de plano técnico)
  const corteX = new THREE.Plane(V(-1, 0, 0), 5);
  const corteZ = new THREE.Plane(V(0, 0, -1), 5);
  const planos = [corteX, corteZ];

  const rugosidad = texturaCepillado();
  const acero = new THREE.MeshPhysicalMaterial({
    color: 0xdde2e8, metalness: 1, roughness: 0.3, roughnessMap: rugosidad,
    clearcoat: 0.25, clearcoatRoughness: 0.25, side: THREE.DoubleSide,
    clippingPlanes: planos, clipIntersection: true,
  });
  const aceroInterior = acero.clone();
  aceroInterior.color.set(0xf1f4f7);
  aceroInterior.roughness = 0.18;
  aceroInterior.clippingPlanes = planos;
  aceroInterior.clipIntersection = true;
  const aislante = new THREE.MeshStandardMaterial({ color: 0xe9c66a, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, clippingPlanes: planos, clipIntersection: true });
  const aceroPiezas = new THREE.MeshPhysicalMaterial({ color: 0xd5dbe2, metalness: 1, roughness: 0.22, roughnessMap: rugosidad });
  const pintura = new THREE.MeshStandardMaterial({ color: 0x0b1466, roughness: 0.45, metalness: 0.2 });
  const pantalla = new THREE.MeshStandardMaterial({ color: 0x0a0f2c, emissive: 0x3fb8ff, emissiveIntensity: 0.55, roughness: 0.3 });

  const tanque = new THREE.Group();
  scene.add(tanque);

  const yF = 0.42, yP = 1.86, yD = 2.12;
  const casco = (R, mat) => new THREE.Mesh(new THREE.LatheGeometry(perfil(R, yF - (R - 1) * 0.6, yP, yD + (R - 1) * 0.6), 96), mat);
  const exterior = casco(1.07, acero);
  const espuma = casco(1.035, aislante);
  const interior = casco(1.0, aceroInterior);
  tanque.add(exterior, espuma, interior);

  // Patas regulables
  const patas = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 20), aceroPiezas);
    p.position.set(Math.cos(a) * 0.82, 0.25, Math.sin(a) * 0.82);
    const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.05, 24), aceroPiezas);
    pie.position.set(p.position.x, 0.025, p.position.z);
    patas.add(p, pie);
  }
  tanque.add(patas);

  // Motorreductor del agitador sobre puente
  const motor = new THREE.Group();
  const puente = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.22), aceroPiezas);
  puente.position.y = yD + 0.08;
  const caja = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.26), aceroPiezas);
  caja.position.y = yD + 0.21;
  const cuerpoMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 32), pintura);
  cuerpoMotor.rotation.z = Math.PI / 2;
  cuerpoMotor.position.set(0.3, yD + 0.22, 0);
  motor.add(puente, caja, cuerpoMotor);
  tanque.add(motor);

  // Eje y paletas (visibles en la vista en corte)
  const agitador = new THREE.Group();
  const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.55, 16), aceroPiezas);
  eje.position.y = 1.3;
  agitador.add(eje);
  [0.72, 1.18].forEach((y) => {
    const paleta = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.16, 0.02), aceroPiezas);
    paleta.position.y = y;
    paleta.rotation.y = y > 1 ? Math.PI / 2 : 0;
    agitador.add(paleta);
  });
  tanque.add(agitador);

  // Tapa de inspección
  const tapa = new THREE.Group();
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 12, 48), aceroPiezas);
  aro.rotation.x = Math.PI / 2;
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.04, 48), aceroPiezas);
  const manija = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 24, Math.PI), aceroPiezas);
  manija.position.y = 0.03;
  tapa.add(aro, disco, manija);
  tapa.position.set(-0.3, yD - 0.03, 0.3);
  tapa.rotation.set(0.14, 0, 0.14);
  tanque.add(tapa);

  // Válvula sanitaria de descarga
  const valvula = new THREE.Group();
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 20), aceroPiezas);
  tubo.rotation.z = Math.PI / 2;
  tubo.position.x = 0.21;
  const cuerpoValvula = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.09, 24), aceroPiezas);
  cuerpoValvula.rotation.z = Math.PI / 2;
  cuerpoValvula.position.x = 0.36;
  const palanca = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.26), pintura);
  palanca.position.set(0.36, 0.08, 0.1);
  valvula.add(tubo, cuerpoValvula, palanca);
  const angValvula = -0.9;
  valvula.position.set(Math.sin(angValvula), yF + 0.1, Math.cos(angValvula));
  valvula.rotation.y = angValvula - Math.PI / 2;
  tanque.add(valvula);

  // Tablero de temperatura
  const tablero = new THREE.Group();
  const marco = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.05), aceroPiezas);
  const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), pantalla);
  vidrio.position.z = 0.027;
  tablero.add(marco, vidrio);
  const angTablero = -0.35;
  tablero.position.set(Math.sin(angTablero) * 1.1, 1.25, Math.cos(angTablero) * 1.1);
  tablero.rotation.y = angTablero;
  tanque.add(tablero);

  // Sombra de contacto
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.002;
  scene.add(sombra);

  // Trazo de plano (azul) que precede al acero
  const trazo = new THREE.Group();
  const matTrazo = new THREE.LineBasicMaterial({ color: 0x0b1466, transparent: true, opacity: 0 });
  // El trazo azul del dibujo se aclara en modo oscuro
  const colorTrazo = () => matTrazo.color.set(getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0b1466');
  colorTrazo();
  document.addEventListener('eqx:tema', colorTrazo);
  const circulo = (r, y) => {
    const pts = [];
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(V(Math.cos(a) * r, y, Math.sin(a) * r)); }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matTrazo);
  };
  [yF + 0.04, 0.9, 1.4, yP].forEach((y) => trazo.add(circulo(1.075, y)));
  trazo.add(circulo(0.6, yP + 0.2), circulo(0.25, yD - 0.02));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    trazo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(Math.cos(a) * 1.075, yF + 0.04, Math.sin(a) * 1.075), V(Math.cos(a) * 1.075, yP, Math.sin(a) * 1.075)]), matTrazo));
  }
  tanque.add(trazo);

  const metales = [acero, aceroInterior, aislante, aceroPiezas, pintura, pantalla];

  // Puntos anotados
  const anclas = {
    agitador: V(0.3, yD + 0.36, 0),
    tapa: V(-0.3, yD + 0.02, 0.3),
    pared: V(0, 1.3, 0),
    tablero: V(Math.sin(angTablero) * 1.13, 1.25, Math.cos(angTablero) * 1.13),
    valvula: V(Math.sin(angValvula) * 1.38, yF + 0.1, Math.cos(angValvula) * 1.38),
    patas: V(Math.cos(Math.PI / 4) * 0.82, 0.16, Math.sin(Math.PI / 4) * 0.82),
  };
  const etiquetas = overlay ? [...overlay.querySelectorAll('[data-ancla]')] : [];

  const estado = {
    cam: V(4.2, 2.5, 5.1), objetivo: V(0, 1.15, 0), corte: 0, trazo: 0, acero: 1, giro: 0, foco: null, escala: 1,
  };
  const meta = { ...estado, cam: estado.cam.clone(), objetivo: estado.objetivo.clone() };
  let yaw = 0, yawObjetivo = 0, arrastre = null;
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PASOS = opciones.pasos || {};
  function ir(nombre) {
    const p = PASOS[nombre];
    if (!p) return;
    if (p.cam) meta.cam = V(...p.cam);
    if (p.objetivo) meta.objetivo = V(...p.objetivo);
    meta.corte = p.corte ?? 0;
    meta.trazo = p.trazo ?? 0;
    meta.acero = p.acero ?? 1;
    meta.giro = p.giro ?? 0;
    meta.foco = p.foco ?? null;
    etiquetas.forEach((el) => el.classList.toggle('activa', !meta.foco || el.dataset.ancla === meta.foco || (p.mostrar || []).includes(el.dataset.ancla)));
    if (reducido) Object.assign(estado, { ...meta, cam: meta.cam.clone(), objetivo: meta.objetivo.clone() });
  }

  if (opciones.arrastrable) {
    canvas.style.touchAction = 'pan-y';
    canvas.addEventListener('pointerdown', (e) => { arrastre = { x: e.clientX, yaw: yawObjetivo }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('arrastrando'); });
    canvas.addEventListener('pointermove', (e) => { if (arrastre) yawObjetivo = arrastre.yaw + (e.clientX - arrastre.x) * 0.008; });
    const soltar = () => { arrastre = null; canvas.classList.remove('arrastrando'); };
    canvas.addEventListener('pointerup', soltar);
    canvas.addEventListener('pointercancel', soltar);
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '120px' }).observe(canvas);

  function ajustar() {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 36 : 28;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(ajustar).observe(canvas.parentElement);
  ajustar();

  const reloj = new THREE.Clock();
  const tmp = new THREE.Vector3();
  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!visible) return;
    const dt = Math.min(reloj.getDelta(), 0.05);
    const k = reducido ? 1 : 1 - Math.pow(0.0025, dt);
    estado.cam.lerp(meta.cam, k);
    estado.objetivo.lerp(meta.objetivo, k);
    estado.corte += (meta.corte - estado.corte) * k;
    estado.trazo += (meta.trazo - estado.trazo) * k;
    estado.acero += (meta.acero - estado.acero) * k;
    if (!arrastre && meta.giro && !reducido) yawObjetivo += dt * meta.giro;
    yaw += (yawObjetivo - yaw) * (reducido ? 1 : 1 - Math.pow(0.001, dt));
    tanque.rotation.y = yaw;
    estado.escala += (meta.escala - estado.escala) * k;
    tanque.scale.setScalar(estado.escala);
    sombra.scale.setScalar(estado.escala);
    if (!reducido) agitador.rotation.y += dt * 0.9;

    // Corte en cuadrante orientado siempre hacia la cámara (en coordenadas del mundo).
    const c = 5 - estado.corte * 5;
    const ang = Math.atan2(estado.cam.x, estado.cam.z);
    corteX.normal.set(-Math.sin(ang + Math.PI / 4), 0, -Math.cos(ang + Math.PI / 4));
    corteZ.normal.set(-Math.sin(ang - Math.PI / 4), 0, -Math.cos(ang - Math.PI / 4));
    corteX.constant = c;
    corteZ.constant = c;
    anclas.pared.set(Math.sin(ang + Math.PI / 4) * 1.04, 1.3, Math.cos(ang + Math.PI / 4) * 1.04);

    matTrazo.opacity = estado.trazo;
    const transp = estado.acero < 0.995;
    metales.forEach((m) => {
      m.opacity = estado.acero;
      if (m.transparent !== transp) { m.transparent = transp; m.needsUpdate = true; }
      m.depthWrite = estado.acero > 0.5;
    });
    tanque.children.forEach((h) => { if (h !== trazo) h.visible = estado.acero > 0.02 || h === agitador; });
    agitador.visible = estado.corte > 0.15 && estado.acero > 0.02;

    camera.position.copy(estado.cam);
    camera.lookAt(estado.objetivo);
    renderer.render(scene, camera);

    if (etiquetas.length) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      etiquetas.forEach((el) => {
        const a = anclas[el.dataset.ancla];
        if (!a) return;
        tmp.copy(a);
        if (el.dataset.ancla !== 'pared') tmp.applyAxisAngle(V(0, 1, 0), yaw);
        tmp.multiplyScalar(estado.escala);
        tmp.project(camera);
        el.style.setProperty('--x', `${((tmp.x + 1) / 2) * w}px`);
        el.style.setProperty('--y', `${((1 - tmp.y) / 2) * h}px`);
      });
    }
  }
  cuadro();

  return { ir, girarA: (v) => { yawObjetivo = v; }, escalar: (s) => { meta.escala = s; if (reducido) estado.escala = s; } };
}
