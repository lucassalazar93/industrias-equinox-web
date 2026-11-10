// Datos del panel de ventas (CRM) del prototipo.
// En la versión real viven en la base de datos de Equinox; aquí viven en este navegador (localStorage 'eqx-crm'):
// datos de ejemplo + las solicitudes reales que se hagan en el sitio (formulario y asistente, 'eqx-solicitudes').
// Etapas y motivos de pérdida: los de .claude/skills/equinox-base/references/medicion.md.
import { EQUIPOS } from './data.js';

export const ETAPAS = [
  { id: 'nuevo', nombre: 'Nuevo', ayuda: 'Llegó la solicitud; falta el primer contacto' },
  { id: 'calificado', nombre: 'Calificado', ayuda: 'Se conoce producto, litros, ciudad, plazo y quién decide' },
  { id: 'costeo', nombre: 'En costeo', ayuda: 'Ingeniería prepara la oferta' },
  { id: 'cotizado', nombre: 'Cotización enviada', ayuda: 'El cliente tiene la cotización formal' },
  { id: 'negociacion', nombre: 'Negociación', ayuda: 'Se ajustan alcance, precio, plazo o pago' },
  { id: 'ganado', nombre: 'Ganado', ayuda: 'Pagó el anticipo' },
  { id: 'perdido', nombre: 'Perdido', ayuda: 'Dijo que no o no respondió tras el último seguimiento' },
];
export const ABIERTAS = ['nuevo', 'calificado', 'costeo', 'cotizado', 'negociacion'];
// Orden del avance (Perdido no es un paso: 'alcanzo' guarda hasta dónde llegó cada oportunidad, para el embudo)
export const ORDEN = ['nuevo', 'calificado', 'costeo', 'cotizado', 'negociacion', 'ganado'];
export const nombreEtapa = (id) => ETAPAS.find((e) => e.id === id)?.nombre || id;
export const MOTIVOS = ['Precio', 'Plazo de entrega', 'Otro proveedor', 'Sin presupuesto', 'Proyecto aplazado', 'Sin respuesta', 'Especificación que no fabricamos', 'Otro'];
export const FUENTES = ['Sitio web', 'Google', 'WhatsApp', 'Referido', 'Redes sociales', 'Pauta', 'Feria o visita', 'Llamada'];
export const TIPOS = ['Finca o ganadero', 'Quesera artesanal', 'Procesadora', 'Cooperativa o asociación', 'Entidad pública'];
export const RESPONSABLES = ['Laura (ventas)', 'Andrés (ventas)', 'Gerencia'];
export const ACCIONES = ['Primer contacto', 'Llamar', 'Pedir datos técnicos', 'Enviar cotización', 'Seguimiento día 3', 'Seguimiento día 7', 'Seguimiento día 15', 'Visita a planta', 'Confirmar anticipo'];
// Meta mensual de ventas: la meta de 2027 es de 800 a 1.000 millones al año (estudio, sección 2)
export const META_MES = 75_000_000;

const CLAVE = 'eqx-crm';
const VERSION = 6;   // subirla cuando cambie la forma de los datos de ejemplo: el panel los vuelve a generar
const DIA = 86_400_000;

// ---------- almacenamiento ----------
const leerJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const guardarJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

let estado = null;
const oyentes = new Set();
export const alCambiar = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };
function avisar() { guardarJSON(CLAVE, estado); oyentes.forEach((fn) => fn(estado)); }

// Ajustes del negocio: los cambia Gerencia en la vista Ajustes
const AJUSTES_INICIALES = () => ({
  metaMes: META_MES,
  seguimiento: [3, 7, 15],          // días después de enviada la cotización
  vigenciaDias: 30,                 // vigencia de la cotización formal
  equipo: [
    { nombre: 'Gerencia', rol: 'Gerencia', activo: true },
    { nombre: 'Laura (ventas)', rol: 'Ventas', activo: true },
    { nombre: 'Andrés (ventas)', rol: 'Ventas', activo: true },
  ],
});
const nuevoEstado = () => ({ version: VERSION, creado: new Date().toISOString(), ajustes: AJUSTES_INICIALES(), ops: generarEjemplo() });

export function cargar() {
  const guardado = leerJSON(CLAVE, null);
  estado = guardado?.version === VERSION ? guardado : nuevoEstado();
  estado.ajustes ??= AJUSTES_INICIALES();
  importarDelSitio();
  guardarJSON(CLAVE, estado);
  return estado;
}
export const oportunidades = () => estado.ops;
export const buscar = (id) => estado.ops.find((o) => o.id === id);
export function restablecer() {
  estado = nuevoEstado();
  importarDelSitio();
  avisar();
}
export const ajustes = () => estado.ajustes;
export const responsables = () => estado.ajustes.equipo.filter((p) => p.activo).map((p) => p.nombre);
export const acciones = () => ['Primer contacto', 'Llamar', 'Pedir datos técnicos', 'Enviar cotización', ...estado.ajustes.seguimiento.map((d) => `Seguimiento día ${d}`), 'Visita a planta', 'Confirmar anticipo'];
export function guardarAjustes(cambios) { Object.assign(estado.ajustes, cambios); avisar(); }

// ---------- cambios ----------
const ahora = () => new Date().toISOString();
function anotar(o, tipo, texto, autor = 'Tú') { o.historial.unshift({ fecha: ahora(), tipo, texto, autor }); }

export function moverEtapa(id, etapa, { motivo = null } = {}) {
  const o = buscar(id); if (!o || o.etapa === etapa) return;
  const antes = o.etapa;
  o.etapa = etapa;
  if (etapa === 'perdido') o.motivoPerdida = motivo || o.motivoPerdida || 'Sin respuesta';
  else o.motivoPerdida = null;
  if (etapa === 'ganado' || etapa === 'perdido') { o.cerrado = ahora(); o.proxima = null; }
  else {
    o.cerrado = null;
    if (etapa === 'cotizado') {
      // Al enviar la cotización: queda registrada y arranca la cadena de seguimiento (3, 7 y 15 días)
      o.cotizacion ??= { numero: `COT-${o.folio.replace(/^EQX-/, '')}`, fecha: ahora(), plazoSemanas: 6, vigenciaDias: estado.ajustes.vigenciaDias };
      const d0 = estado.ajustes.seguimiento[0];
      o.proxima = { tipo: `Seguimiento día ${d0}`, fecha: enDias(d0) };
    } else if (!o.proxima) o.proxima = { tipo: siguienteAccion(etapa), fecha: enDias(1) };
  }
  const idx = ORDEN.indexOf(etapa);
  if (idx > (o.alcanzo ?? 0)) o.alcanzo = idx;
  if (antes === 'nuevo' && o.primeraRespuestaMin == null) o.primeraRespuestaMin = Math.max(1, Math.round((Date.now() - new Date(o.creado)) / 60000));
  anotar(o, 'etapa', `Pasó de ${nombreEtapa(antes)} a ${nombreEtapa(etapa)}${etapa === 'perdido' ? ` · motivo: ${o.motivoPerdida}` : ''}`);
  avisar();
}
export function actualizar(id, cambios, nota = null) {
  const o = buscar(id); if (!o) return;
  Object.assign(o, cambios);
  if (nota) anotar(o, 'cambio', nota);
  avisar();
}
export function agregarNota(id, texto) {
  const o = buscar(id); if (!o || !texto.trim()) return;
  anotar(o, 'nota', texto.trim());
  avisar();
}
// Marca hecha la próxima acción y agenda la siguiente (la cadena 3 → 7 → 15 días de la cotización)
export function completarAccion(id) {
  const o = buscar(id); if (!o?.proxima) return;
  const hecha = o.proxima.tipo;
  anotar(o, 'accion', `Hecho: ${hecha}`);
  if (o.etapa === 'nuevo') { o.etapa = 'calificado'; o.primeraRespuestaMin ??= Math.max(1, Math.round((Date.now() - new Date(o.creado)) / 60000)); anotar(o, 'etapa', 'Pasó de Nuevo a Calificado'); }
  // Cadena de seguimiento según los ajustes: enviar cotización → día 3 → día 7 → día 15 → llamar
  const seg = estado.ajustes.seguimiento;
  const cadena = { 'Enviar cotización': [`Seguimiento día ${seg[0]}`, seg[0]] };
  seg.forEach((d, i) => { cadena[`Seguimiento día ${d}`] = i < seg.length - 1 ? [`Seguimiento día ${seg[i + 1]}`, seg[i + 1] - d] : ['Llamar', 7]; });
  const [tipo, dias] = cadena[hecha] || [siguienteAccion(o.etapa), 2];
  o.proxima = { tipo, fecha: enDias(dias) };
  if (hecha === 'Enviar cotización' && o.etapa !== 'cotizado') { avisar(); return moverEtapa(o.id, 'cotizado'); }
  avisar();
}
export function reprogramar(id, dias) {
  const o = buscar(id); if (!o?.proxima) return;
  o.proxima.fecha = enDias(dias);
  anotar(o, 'accion', `Reprogramado: ${o.proxima.tipo} para ${fechaCorta(o.proxima.fecha)}`);
  avisar();
}
export function crear(datos) {
  const o = {
    id: `op-${Date.now().toString(36)}`, folio: datos.folio || folioManual(), creado: ahora(), demo: false, delSitio: false,
    cliente: datos.cliente, equipos: datos.equipos || [], litros: datos.litros || null, producto: datos.producto || '',
    fuente: datos.fuente, detalleFuente: datos.detalleFuente || 'Registro manual', etapa: 'nuevo', alcanzo: 0, valor: datos.valor || 0,
    responsable: datos.responsable || responsables()[0], proxima: { tipo: 'Primer contacto', fecha: enDias(0) },
    primeraRespuestaMin: null, motivoPerdida: null, cerrado: null,
    historial: [{ fecha: ahora(), tipo: 'creado', texto: `Registrada a mano · ${datos.fuente}`, autor: 'Tú' }],
  };
  if (datos.nota) o.historial.unshift({ fecha: ahora(), tipo: 'nota', texto: datos.nota, autor: 'Tú' });
  estado.ops.unshift(o);
  avisar();
  return o;
}

const siguienteAccion = (etapa) => ({ nuevo: 'Primer contacto', calificado: 'Pedir datos técnicos', costeo: 'Enviar cotización', cotizado: 'Seguimiento día 3', negociacion: 'Confirmar anticipo' }[etapa] || 'Llamar');
const enDias = (d) => { const f = new Date(); f.setHours(9, 0, 0, 0); f.setTime(f.getTime() + d * DIA); return f.toISOString(); };
const folioManual = () => { const d = new Date(); return `EQX-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-M${String(Math.floor(Math.random() * 900) + 100)}`; };

// ---------- solicitudes hechas en el sitio (formulario y asistente) ----------
// Cada solicitud del sitio entra sola como oportunidad Nueva, con su fuente. Es la conexión que promete la propuesta.
function importarDelSitio() {
  const sols = leerJSON('eqx-solicitudes', []);
  if (!Array.isArray(sols)) return;
  const folios = new Set(estado.ops.map((o) => o.folio));
  for (const s of sols) {
    if (!s?.folio || folios.has(s.folio)) continue;
    const creado = s.fecha || ahora();
    estado.ops.unshift({
      id: `sitio-${s.folio}`, folio: s.folio, creado, demo: false, delSitio: true,
      cliente: { nombre: s.nombre || 'Sin nombre', empresa: s.empresa || '', celular: s.celular || '', correo: s.correo || '', municipio: s.municipio || '', departamento: s.departamento || '', tipo: s.tipo || '' },
      equipos: (s.equipos || []).filter((e) => EQUIPOS[e.id]), litros: s.litros || null, producto: s.producto || '',
      fuente: 'Sitio web', detalleFuente: `${s.origen === 'asistente' ? 'Asistente' : 'Formulario'} · ${s.fuente || 'directo'}`,
      etapa: 'nuevo', alcanzo: 0, valor: estimarValor(s.equipos || []), responsable: RESPONSABLES[0],
      proxima: { tipo: 'Primer contacto', fecha: creado }, primeraRespuestaMin: null, motivoPerdida: null, cerrado: null,
      historial: [{ fecha: creado, tipo: 'creado', texto: `Llegó por el sitio (${s.origen === 'asistente' ? 'asistente' : 'formulario'}) · folio ${s.folio}`, autor: 'Sitio web' }],
      nota: s.nota || s.consulta || '',
    });
    folios.add(s.folio);
  }
}
// Al volver a la pestaña del panel, trae las solicitudes nuevas del sitio
export function sincronizarSitio() {
  const antes = estado.ops.length;
  importarDelSitio();
  if (estado.ops.length !== antes) avisar();
  return estado.ops.length - antes;
}

// ---------- valores de ejemplo ----------
// Precios de referencia SOLO para los datos de ejemplo del prototipo (no son precios de Equinox)
const PRECIO_EJEMPLO = {
  enfriamiento: 18e6, almacenamiento: 45e6, pasteurizador: 62e6, marmitaMulti: 24e6, marmitaVolcable: 14e6, mezcla: 16e6,
  fermentacion: 21e6, tina: 26e6, polivalente: 55e6, hiladora: 38e6, formadora: 30e6, prensa: 19e6, moldePrensa: 3e6,
  moldeCosteno: 2.5e6, moldeMozzarella: 1.5e6, carro: 9e6, mantequillera: 15e6, meson: 3.5e6, canastilla: 0.6e6,
};
export const estimarValor = (equipos) => Math.round(equipos.reduce((s, e) => s + (PRECIO_EJEMPLO[e.id] || 10e6), 0) / 1e5) * 1e5;

// ---------- generador de datos de ejemplo (determinista) ----------
function azar(semilla) { return () => { semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const NOMBRES = ['Luz Marina', 'Jorge Iván', 'Gloria', 'Carlos Andrés', 'Diana', 'Hernán', 'Paola', 'Fabio', 'Claudia', 'Óscar', 'Beatriz', 'Wilson', 'Adriana', 'Rodrigo', 'Natalia', 'Javier', 'Marta Lucía', 'Alirio', 'Sandra', 'Germán', 'Yolanda', 'Mauricio', 'Liliana', 'Édgar'];
const APELLIDOS = ['Restrepo', 'Gómez', 'Zapata', 'Arango', 'Ospina', 'Cardona', 'Montoya', 'Giraldo', 'Rendón', 'Henao', 'Quintero', 'Valencia', 'Muñoz', 'Pineda', 'Salazar', 'Mejía', 'Ríos', 'Vélez'];
const EMPRESAS = {
  'Finca o ganadero': ['Hacienda La Esperanza', 'Finca El Porvenir', 'Hato San José', 'Finca Las Brisas', 'Lechería El Mirador', 'Finca Villa Clara'],
  'Quesera artesanal': ['Quesos Doña Rosa', 'Quesera El Trébol', 'Lácteos La Montañita', 'Quesos del Norte', 'Delicias del Campo', 'Quesera San Isidro'],
  'Procesadora': ['Lácteos El Roble S.A.S.', 'Procesadora La Pradera', 'Alimentos Andinos S.A.S.', 'Lácteos Bella Vista', 'Derivados La Colina'],
  'Cooperativa o asociación': ['Asociación de Lecheros de la Meseta', 'Cooperativa Agropecuaria del Valle', 'Asoleche Altiplano', 'Coolechera del Oriente'],
  'Entidad pública': ['Alcaldía municipal (programa lechero)', 'Gobernación (alianza productiva)', 'SENA, centro agropecuario'],
};
const LUGARES = [
  ['Santa Rosa de Osos', 'Antioquia'], ['San Pedro de los Milagros', 'Antioquia'], ['Entrerríos', 'Antioquia'], ['Don Matías', 'Antioquia'],
  ['Yarumal', 'Antioquia'], ['La Unión', 'Antioquia'], ['Rionegro', 'Antioquia'], ['Belmira', 'Antioquia'], ['Copacabana', 'Antioquia'],
  ['Ubaté', 'Cundinamarca'], ['Zipaquirá', 'Cundinamarca'], ['Paipa', 'Boyacá'], ['Duitama', 'Boyacá'], ['Montería', 'Córdoba'],
  ['Planeta Rica', 'Córdoba'], ['Valledupar', 'Cesar'], ['Pasto', 'Nariño'], ['Manizales', 'Caldas'], ['San Gil', 'Santander'], ['Sincelejo', 'Sucre'],
];
const PAQUETES = {
  'Finca o ganadero': [[['enfriamiento', '1.000 L']], [['enfriamiento', '2.000 L']], [['enfriamiento', '500 L'], ['canastilla', '4 unidades']]],
  'Quesera artesanal': [[['tina', '1.000 L'], ['moldePrensa', '≈ 150 kg/día'], ['prensa', '2 pistones']], [['marmitaMulti', '300 L por lote'], ['tina', '500 L']], [['hiladora', '100 kg/h'], ['moldeMozzarella', '≈ 80 moldes/día']], [['moldeCosteno', '≈ 120 kg/día'], ['carro', '100 moldes']]],
  'Procesadora': [[['pasteurizador', '1.000 L/h'], ['almacenamiento', '5.000 L']], [['polivalente', '4.000 L'], ['prensa', '6 pistones'], ['carro', '200 moldes']], [['fermentacion', '2 × 1.000 L'], ['mezcla', '500 L']], [['hiladora', '200 kg/h'], ['formadora', '500 – 2.500 g']]],
  'Cooperativa o asociación': [[['enfriamiento', '2.000 L'], ['enfriamiento', '2.000 L']], [['almacenamiento', '10.000 L']], [['enfriamiento', '1.500 L'], ['pasteurizador', '500 L/h']]],
  'Entidad pública': [[['enfriamiento', '2.000 L'], ['enfriamiento', '1.000 L'], ['meson', '100 × 200 × 90']], [['marmitaMulti', '200 L por lote'], ['mantequillera', '60 L'], ['meson', '100 × 200 × 90']]],
};
const PRODUCTO = { 'Finca o ganadero': 'Acopio y enfriamiento', 'Quesera artesanal': 'Queso campesino', 'Procesadora': 'Varias líneas', 'Cooperativa o asociación': 'Acopio', 'Entidad pública': 'Planta comunitaria' };
const NOTAS = ['Pide plazo de entrega antes de decidir.', 'Quiere visitar la planta en Copacabana.', 'Compara con un tanque importado.', 'Necesita factura para el crédito de Finagro.', 'Decide el gerente; volver a llamar el lunes.', 'Pidió foto de un equipo similar instalado.', 'Pregunta si el anticipo puede ser del 50 %.', 'Ya tiene el lote; arranca obra en dos meses.'];

export function generarEjemplo(semilla = 20260156) {
  const r = azar(semilla);
  const elegir = (lista) => lista[Math.floor(r() * lista.length)];
  const pesado = (pares) => { let t = r() * pares.reduce((s, [, p]) => s + p, 0); for (const [v, p] of pares) { t -= p; if (t <= 0) return v; } return pares[0][0]; };
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const ops = [];
  const N = 72;
  for (let i = 0; i < N; i++) {
    // Más solicitudes en los meses recientes (el sitio y la medición empiezan a dar fruto)
    const edad = Math.floor(Math.pow(r(), 1.1) * 178);
    // Nada en el futuro: lo de hoy llegó hace un rato
    const creado = new Date(Math.min(hoy.getTime() - edad * DIA + (7 + r() * 11) * 3_600_000, Date.now() - (25 + r() * 200) * 60_000));
    const tipo = pesado([['Quesera artesanal', 34], ['Finca o ganadero', 26], ['Procesadora', 18], ['Cooperativa o asociación', 14], ['Entidad pública', 8]]);
    const recientes = edad < 70;
    const fuente = pesado([['WhatsApp', 26], ['Google', recientes ? 20 : 10], ['Sitio web', recientes ? 22 : 6], ['Referido', 16], ['Redes sociales', 8], ['Feria o visita', 5], ['Llamada', 6], ['Pauta', recientes ? 5 : 0]]);
    const paquete = elegir(PAQUETES[tipo]).map(([id, dato]) => ({ id, dato }));
    const valor = Math.round(estimarValor(paquete) * (0.85 + r() * 0.4) / 1e5) * 1e5;
    const [municipio, departamento] = elegir(LUGARES);
    const nombre = `${elegir(NOMBRES)} ${elegir(APELLIDOS)}`;
    const empresa = elegir(EMPRESAS[tipo]);
    // Etapa según la edad: lo viejo ya se cerró; lo reciente sigue abierto
    let etapa;
    if (edad > 75) etapa = pesado([['ganado', 30], ['perdido', 42], ['negociacion', 8], ['cotizado', 12], ['calificado', 8]]);
    else if (edad > 25) etapa = pesado([['ganado', 16], ['perdido', 18], ['negociacion', 18], ['cotizado', 26], ['costeo', 12], ['calificado', 10]]);
    else if (edad > 4) etapa = pesado([['cotizado', 28], ['costeo', 24], ['calificado', 30], ['negociacion', 6], ['nuevo', 8], ['perdido', 4]]);
    else etapa = pesado([['nuevo', 55], ['calificado', 35], ['costeo', 10]]);
    const orden = ORDEN;
    const hasta = etapa === 'perdido' ? orden[1 + Math.floor(r() * 4)] : etapa;
    // La primera respuesta mejora con el tiempo (antes, horas; con el panel y las alertas, minutos)
    const primeraRespuestaMin = etapa === 'nuevo' ? null : Math.round(edad > 90 ? 180 + r() * 900 : edad > 40 ? 60 + r() * 300 : 8 + r() * 70);
    const historial = [];
    // Las cerradas se resolvieron en 2 a 9 semanas; las abiertas siguen moviéndose hasta hoy
    const duracion = ['ganado', 'perdido'].includes(etapa) ? Math.min(edad, 14 + r() * 50) : Math.max(1, edad);
    const momento = (frac) => new Date(Math.min(creado.getTime() + frac * duracion * DIA, Date.now() - (20 + ((i * 53) % 420)) * 60_000)).toISOString();
    historial.push({ fecha: creado.toISOString(), tipo: 'creado', texto: `Llegó por ${fuente}`, autor: fuente === 'Sitio web' ? 'Sitio web' : 'Registro' });
    const pasos = orden.slice(1, orden.indexOf(hasta) + 1);
    pasos.forEach((p, k) => historial.push({ fecha: momento((k + 1) / (pasos.length + 2)), tipo: 'etapa', texto: `Pasó a ${nombreEtapa(p)}`, autor: elegir(RESPONSABLES) }));
    let motivoPerdida = null, cerrado = null;
    if (etapa === 'perdido') { motivoPerdida = pesado([['Precio', 26], ['Plazo de entrega', 24], ['Sin respuesta', 20], ['Proyecto aplazado', 12], ['Otro proveedor', 10], ['Sin presupuesto', 6], ['Especificación que no fabricamos', 2]]); cerrado = momento(1); historial.push({ fecha: cerrado, tipo: 'etapa', texto: `Pasó a Perdido · motivo: ${motivoPerdida}`, autor: elegir(RESPONSABLES) }); }
    if (etapa === 'ganado') { cerrado = momento(1); historial.push({ fecha: cerrado, tipo: 'etapa', texto: 'Pagó el anticipo', autor: 'Gerencia' }); }
    if (r() < 0.55) historial.push({ fecha: momento(0.5), tipo: 'nota', texto: elegir(NOTAS), autor: elegir(RESPONSABLES) });
    historial.sort((a, b) => b.fecha.localeCompare(a.fecha));
    // Próxima acción de las abiertas: algunas vencidas, otras para hoy y los próximos días
    let proxima = null;
    if (ABIERTAS.includes(etapa)) {
      // La mayoría al día; unas pocas vencidas o para hoy (lo normal en una semana de trabajo)
      const desfase = etapa === 'nuevo' ? 0 : pesado([[-3, 1], [-1, 2], [0, 2], [1, 3], [2, 3], [3, 3], [5, 3], [7, 2], [10, 1]]);
      const f = new Date(hoy.getTime() + desfase * DIA); f.setHours(9 + Math.floor(r() * 8), 0, 0, 0);
      proxima = { tipo: siguienteAccion(etapa), fecha: f.toISOString() };
      if (etapa === 'cotizado') proxima.tipo = elegir(['Seguimiento día 3', 'Seguimiento día 7', 'Seguimiento día 15']);
    }
    ops.push({
      id: `demo-${i + 1}`, folio: `EQX-${creado.toISOString().slice(2, 10).replace(/-/g, '')}-${String(1000 + Math.floor(r() * 9000))}`,
      creado: creado.toISOString(), demo: true, delSitio: fuente === 'Sitio web',
      cliente: { nombre, empresa, celular: '', correo: '', municipio, departamento, tipo },
      equipos: paquete, litros: tipo === 'Finca o ganadero' ? 300 + Math.round(r() * 17) * 100 : 500 + Math.round(r() * 55) * 100,
      producto: PRODUCTO[tipo], fuente, detalleFuente: fuente === 'Sitio web' ? (r() < 0.5 ? 'Formulario' : 'Asistente') : fuente,
      etapa, alcanzo: orden.indexOf(hasta), valor, responsable: elegir(RESPONSABLES), proxima, primeraRespuestaMin, motivoPerdida, cerrado, historial,
    });
    // Cotización registrada para las que llegaron a Cotización enviada (sin más llamadas al azar: no cambia el resto)
    const op = ops[ops.length - 1];
    if (op.alcanzo >= 3) {
      const envio = historial.find((h) => h.texto === 'Pasó a Cotización enviada');
      op.cotizacion = { numero: `COT-${op.folio.replace(/^EQX-/, '')}`, fecha: envio?.fecha || op.creado, plazoSemanas: [4, 6, 8, 10][i % 4], vigenciaDias: 30 };
    }
  }
  return ops.sort((a, b) => b.creado.localeCompare(a.creado));
}

// ---------- formatos ----------
export const pesos = (v) => '$' + Math.round(v || 0).toLocaleString('es-CO');
export const millones = (v) => {
  const m = (v || 0) / 1e6;
  return `$${m >= 100 ? Math.round(m).toLocaleString('es-CO') : m.toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
};
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fechaCorta = (iso) => { const d = new Date(iso); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
export const mesCorto = (d) => MESES[d.getMonth()];
export function hace(iso) {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24); if (d < 31) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return fechaCorta(iso);
}
// Estado de la próxima acción: vencida, hoy, mañana o en N días
export function vencimiento(iso) {
  if (!iso) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const dias = Math.round((d - hoy) / DIA);
  if (dias < 0) return { clase: 'vencida', texto: `Vencida hace ${-dias} ${dias === -1 ? 'día' : 'días'}`, dias };
  if (dias === 0) return { clase: 'hoy', texto: 'Hoy', dias };
  if (dias === 1) return { clase: 'pronto', texto: 'Mañana', dias };
  return { clase: 'pronto', texto: `En ${dias} días`, dias };
}
export const minutosATexto = (m) => (m == null ? '—' : m < 60 ? `${Math.round(m)} min` : `${(m / 60).toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`);
export const nombreEquipo = (id) => EQUIPOS[id]?.nombre || id;
export const textoEquipos = (o) => (o.equipos?.length ? o.equipos.map((e) => `${nombreEquipo(e.id)}${e.dato ? ` (${e.dato})` : ''}`).join(', ') : 'Por definir');
