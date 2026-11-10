// Panel de ventas (CRM) de Industrias Equinox Colombia: prototipo navegable.
// Vistas: Resumen (cifras y gráficas), Oportunidades (tablero por etapa y lista), Seguimientos (3, 7 y 15 días)
// y Clientes (la base de datos, exportable a Excel). Ficha de cada oportunidad con historial.
// Los datos viven en js/panel-datos.js; las solicitudes del sitio entran solas.
import {
  ETAPAS, ABIERTAS, ORDEN, MOTIVOS, FUENTES, TIPOS, responsables, acciones, ajustes, guardarAjustes,
  cargar, oportunidades, buscar, restablecer, alCambiar, moverEtapa, actualizar, agregarNota, completarAccion, reprogramar,
  crear, sincronizarSitio, estimarValor, nombreEtapa, pesos, millones, fechaCorta, mesCorto, hace, vencimiento, minutosATexto,
  nombreEquipo, textoEquipos,
} from './panel-datos.js';
import { barras, barrasH, embudo, tendencia } from './panel-graficas.js';
import { EQUIPOS, ORDEN_EQUIPOS } from './data.js';

const DEPARTAMENTOS = ['Antioquia', 'Boyacá', 'Caldas', 'Cesar', 'Córdoba', 'Cundinamarca', 'Nariño', 'Quindío', 'Risaralda', 'Santander', 'Sucre', 'Valle del Cauca', 'Otro'];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DIA = 86_400_000;
const ICONO = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>',
  reloj: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  wa: '<svg aria-hidden="true"><use href="assets/img/iconos.svg#i-whatsapp-logo"/></svg>',
  flecha: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  descargar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
  alerta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17h.01"/></svg>',
  imprimir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6H7z"/></svg>',
  editar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
};

// Preferencias de esta persona en este navegador (periodo del resumen)
const leerPreferencia = (k, d) => { try { return JSON.parse(localStorage.getItem('eqx-panel-pref'))?.[k] ?? d; } catch { return d; } };
function guardarPreferencia(k, v) { try { const p = JSON.parse(localStorage.getItem('eqx-panel-pref') || '{}'); p[k] = v; localStorage.setItem('eqx-panel-pref', JSON.stringify(p)); } catch { /* sin almacenamiento */ } }
const estado = { vista: 'resumen', texto: '', responsable: '', fuente: '', modo: 'tablero', orden: { campo: 'creado', dir: -1 }, abierta: null, usuario: null, periodo: leerPreferencia('periodo', 90), editando: false };

// ---------- entrada (perfil) ----------
const leerUsuario = () => { try { return sessionStorage.getItem('eqx-panel-usuario'); } catch { return null; } };
function entrar(perfil) {
  try { sessionStorage.setItem('eqx-panel-usuario', perfil); } catch { /* sin almacenamiento */ }
  estado.usuario = perfil;
  estado.responsable = perfil === 'Gerencia' ? '' : perfil;
  $('#entrada').hidden = true; $('#app').hidden = false;
  $('[data-usuario]').textContent = perfil;
  $('[data-usuario-ini]').textContent = perfil[0];
  $('[data-vista="ajustes"]').hidden = perfil !== 'Gerencia';
  if (!location.hash) location.hash = '#/resumen'; else render();
}
$$('[data-perfil]').forEach((b) => b.addEventListener('click', () => entrar(b.dataset.perfil)));
$('[data-salir]').addEventListener('click', () => {
  try { sessionStorage.removeItem('eqx-panel-usuario'); } catch { /* sin almacenamiento */ }
  cerrarFicha(); $('#app').hidden = true; $('#entrada').hidden = false;
});

// ---------- utilidades de tiempo ----------
const inicioMes = (offset = 0) => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + offset); return d; };
const enRango = (iso, desde, hasta = new Date(8.64e15)) => { const t = new Date(iso); return t >= desde && t < hasta; };
const haceDias = (n) => new Date(Date.now() - n * DIA);
const mediana = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const saludo = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };
const hoyLargo = () => new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

// ---------- filtros ----------
function filtradas({ conTexto = true, conResp = true } = {}) {
  const t = estado.texto.trim().toLowerCase();
  return oportunidades().filter((o) => {
    if (conResp && estado.responsable && o.responsable !== estado.responsable) return false;
    if (estado.fuente && o.fuente !== estado.fuente) return false;
    if (conTexto && t) {
      const c = o.cliente;
      const texto = `${c.nombre} ${c.empresa} ${c.municipio} ${c.departamento} ${o.folio} ${textoEquipos(o)}`.toLowerCase();
      if (!texto.includes(t)) return false;
    }
    return true;
  });
}
const pendientes = (ops = filtradas({ conTexto: false })) => ops.filter((o) => ABIERTAS.includes(o.etapa) && o.proxima)
  .map((o) => ({ o, v: vencimiento(o.proxima.fecha) }));

// ---------- router ----------
const VISTAS = {
  resumen: { titulo: 'Resumen', sub: () => `${saludo()}, ${estado.usuario.split(' (')[0]}. Hoy es ${hoyLargo()}.${estado.responsable ? ' Estas cifras son las de sus clientes.' : ''}`, render: vistaResumen },
  oportunidades: { titulo: 'Oportunidades', sub: () => 'Arrastre cada tarjeta a su etapa. Toque una para ver la ficha.', render: vistaOportunidades },
  seguimientos: { titulo: 'Seguimientos', sub: () => 'Lo que hay que hacer hoy para que ninguna cotización se enfríe.', render: vistaSeguimientos },
  clientes: { titulo: 'Clientes', sub: () => 'La base de datos de Equinox: cada cliente con lo que pidió y de dónde llegó.', render: vistaClientes },
  ajustes: { titulo: 'Ajustes', sub: () => 'Meta del mes, equipo de ventas y reglas de seguimiento.', render: vistaAjustes },
};
function render() {
  const v = (location.hash.match(/^#\/(\w+)/) || [])[1];
  estado.vista = VISTAS[v] ? v : 'resumen';
  const vista = VISTAS[estado.vista];
  $$('.lateral__nav a').forEach((a) => (a.dataset.vista === estado.vista ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $('#titulo-vista').textContent = vista.titulo;
  $('#sub-vista').textContent = vista.sub();
  document.title = `${vista.titulo} · Panel de ventas | Industrias Equinox Colombia`;
  vista.render($('#vista'));
  const urgentes = pendientes(filtradas({ conTexto: false })).filter(({ v }) => v.dias <= 0).length;
  const cont = $('[data-contador-seg]'); cont.hidden = !urgentes; cont.textContent = urgentes;
}
window.addEventListener('hashchange', () => { render(); $('#vista').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); });

// =====================================================================================
// RESUMEN
// =====================================================================================
const PERIODOS = [[30, '30 días'], [90, '90 días'], [180, '6 meses'], [365, '12 meses']];
const textoPeriodo = () => PERIODOS.find(([d]) => d === estado.periodo)?.[1] || `${estado.periodo} días`;
const FIN = new Date(8.64e15);

function vistaResumen(raiz) {
  const ops = filtradas({ conTexto: false });
  const meta = ajustes().metaMes;
  const dias = estado.periodo, desde = haceDias(dias), antes = haceDias(dias * 2);
  const nMeses = dias <= 90 ? 3 : dias <= 180 ? 6 : 12;
  const mes0 = inicioMes(0), mes1 = inicioMes(-1);
  const sol = (d, h) => ops.filter((o) => enRango(o.creado, d, h)).length;
  const solMes = sol(mes0);
  // Comparación justa: este mes hasta hoy contra los mismos días del mes anterior
  const solAntMismoCorte = sol(mes1, new Date(mes1.getTime() + new Date().getDate() * DIA));
  const meses = Array.from({ length: nMeses }, (_, i) => inicioMes(i - nMeses + 1));
  const finMes = (i) => meses[i + 1] || FIN;
  const porMes = meses.map((d, i) => ops.filter((o) => enRango(o.creado, d, finMes(i))).length);
  const ganadas = ops.filter((o) => o.etapa === 'ganado');
  const ventasPorMes = meses.map((d, i) => ganadas.filter((o) => enRango(o.cerrado, d, finMes(i))).reduce((s, o) => s + o.valor, 0));
  const ventasMes = ganadas.filter((o) => enRango(o.cerrado, mes0)).reduce((s, o) => s + o.valor, 0);
  const abiertas = ops.filter((o) => ['cotizado', 'negociacion'].includes(o.etapa));
  const valorAbierto = abiertas.reduce((s, o) => s + o.valor, 0);
  const cerradas = ops.filter((o) => o.cerrado && enRango(o.cerrado, desde));
  const ganadasP = cerradas.filter((o) => o.etapa === 'ganado');
  const tasa = cerradas.length ? ganadasP.length / cerradas.length : null;
  const tasaPorMes = meses.map((d, i) => { const c = ops.filter((o) => o.cerrado && enRango(o.cerrado, d, finMes(i))); return c.length ? c.filter((o) => o.etapa === 'ganado').length / c.length : 0; });
  const resp = mediana(ops.filter((o) => o.primeraRespuestaMin != null && enRango(o.creado, desde)).map((o) => o.primeraRespuestaMin));
  const respAnt = mediana(ops.filter((o) => o.primeraRespuestaMin != null && enRango(o.creado, antes, desde)).map((o) => o.primeraRespuestaMin));
  const respPorMes = meses.map((d, i) => mediana(ops.filter((o) => o.primeraRespuestaMin != null && enRango(o.creado, d, finMes(i))).map((o) => o.primeraRespuestaMin)) || 0);
  const pend = pendientes(ops);
  const vencidas = pend.filter(({ v }) => v.dias < 0).length, deHoy = pend.filter(({ v }) => v.dias === 0).length;
  const sinContestar = ops.filter((o) => o.etapa === 'nuevo').length;
  const avance = Math.min(1, ventasMes / meta);
  const delta = solAntMismoCorte ? Math.round(((solMes - solAntMismoCorte) / solAntMismoCorte) * 100) : null;
  const enPeriodo = ops.filter((o) => enRango(o.creado, desde));
  const verEquipo = !estado.responsable;

  raiz.innerHTML = `
    <header class="informe-cab" aria-hidden="true"><img src="assets/img/logo-equinox.png" alt="" width="120" height="40"><div><b>Informe de ventas · ${textoPeriodo()}</b><span>${hoyLargo()} · ${esc(estado.responsable || 'Toda la empresa')}</span></div></header>
    ${vencidas + deHoy + sinContestar ? `<a class="atencion" href="#/seguimientos">
      <span class="atencion__ico">${ICONO.alerta}</span>
      <span class="atencion__txt"><b>Para hoy:</b> ${[vencidas && plural(vencidas, 'seguimiento vencido', 'seguimientos vencidos'), deHoy && `${deHoy} para hoy`, sinContestar && plural(sinContestar, 'solicitud nueva sin contestar', 'solicitudes nuevas sin contestar')].filter(Boolean).join(' · ')}</span>
      <span class="atencion__ir">Ver seguimientos ${ICONO.flecha}</span></a>` : `<div class="atencion atencion--ok"><span class="atencion__ico">${ICONO.check}</span><span class="atencion__txt"><b>Todo al día.</b> No hay seguimientos pendientes para hoy.</span></div>`}
    <div class="resumen-barra">
      <div class="segmentado" role="group" aria-label="Periodo de las gráficas">${PERIODOS.map(([d, t]) => `<button type="button" data-periodo="${d}" aria-pressed="${estado.periodo === d}">${t}</button>`).join('')}</div>
      <button type="button" class="boton" data-informe>${ICONO.imprimir}<span>Descargar informe</span></button>
    </div>
    <section class="cifras" aria-label="Cifras principales">
      <article class="cifra">
        <p class="cifra__rot">Solicitudes este mes</p>
        <p class="cifra__num mono">${solMes}</p>
        <p class="cifra__pie">${delta == null ? 'Sin datos del mes anterior' : `<span class="delta ${delta >= 0 ? 'delta--sube' : 'delta--baja'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)} %</span> frente a los mismos días de ${mesCorto(mes1)} (${solAntMismoCorte})`}</p>
        ${tendencia(porMes)}
      </article>
      <article class="cifra">
        <p class="cifra__rot">Cotizaciones abiertas</p>
        <p class="cifra__num mono">${millones(valorAbierto)}</p>
        <p class="cifra__pie">${plural(abiertas.length, 'cotización', 'cotizaciones')} entre enviada y negociación</p>
      </article>
      <article class="cifra">
        <p class="cifra__rot">Tasa de cierre · ${textoPeriodo()}</p>
        <p class="cifra__num mono">${tasa == null ? '—' : `${Math.round(tasa * 100)} %`}</p>
        <p class="cifra__pie">${ganadasP.length} ganadas de ${cerradas.length} cerradas</p>
        ${tendencia(tasaPorMes)}
      </article>
      <article class="cifra">
        <p class="cifra__rot">Primera respuesta · mediana</p>
        <p class="cifra__num mono">${minutosATexto(resp)}</p>
        <p class="cifra__pie">${respAnt ? `Periodo anterior: ${minutosATexto(respAnt)} · meta: menos de 1 hora` : 'Meta: menos de 1 hora hábil'}</p>
        ${tendencia(respPorMes)}
      </article>
      <article class="cifra cifra--meta">
        <p class="cifra__rot">Ventas de ${mesCorto(mes0)} · meta ${millones(meta)}</p>
        <p class="cifra__num mono">${millones(ventasMes)}</p>
        <div class="meta" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(avance * 100)}" aria-label="Avance contra la meta del mes"><span style="--w:${avance * 100}%"></span></div>
        <p class="cifra__pie">${Math.round((ventasMes / meta) * 100)} % de la meta · ${plural(ganadas.filter((o) => enRango(o.cerrado, mes0)).length, 'venta', 'ventas')}</p>
      </article>
    </section>
    <section class="tableros">
      <article class="tarjeta tarjeta--ancha"><header><h2>Solicitudes por mes</h2><p>Todas las fuentes · el mes en curso va en rojo</p></header><div data-g="mes"></div></article>
      <article class="tarjeta"><header><h2>Embudo de ventas</h2><p>Hasta dónde llegaron las oportunidades · ${textoPeriodo()}</p></header><div data-g="embudo"></div></article>
      <article class="tarjeta tarjeta--ancha"><header class="tarjeta__cab"><div><h2>Por cerrar</h2><p>Las cotizaciones más grandes en juego</p></div><a class="enlace" href="#/oportunidades">Ver tablero ${ICONO.flecha}</a></header><div data-g="cerrar"></div></article>
      <article class="tarjeta"><header><h2>¿De dónde llegan?</h2><p>Solicitudes por fuente · ${textoPeriodo()}</p></header><div data-g="fuentes"></div></article>
      <article class="tarjeta"><header><h2>Ventas ganadas por mes</h2><p>Valor con anticipo pagado · meta ${millones(meta)} al mes</p></header><div data-g="ventas"></div></article>
      <article class="tarjeta"><header><h2>¿Por qué se pierden?</h2><p>Motivo principal · ${textoPeriodo()}</p></header><div data-g="motivos"></div></article>
      <article class="tarjeta"><header><h2>Lo más pedido</h2><p>Equipos en las solicitudes · ${textoPeriodo()}</p></header><div data-g="equipos"></div></article>
      ${verEquipo ? `<article class="tarjeta tarjeta--ancha"><header><h2>Equipo de ventas</h2><p>Cómo va cada responsable · ${textoPeriodo()}</p></header><div data-g="equipo"></div></article>` : ''}
      <article class="tarjeta"><header><h2>Ventas por región</h2><p>Valor ganado por departamento · ${textoPeriodo()}</p></header><div data-g="region"></div></article>
      <article class="tarjeta"><header><h2>Ventas por tipo de cliente</h2><p>Valor ganado · ${textoPeriodo()}</p></header><div data-g="tipo"></div></article>
      <article class="tarjeta tarjeta--ancha"><header><h2>Actividad reciente</h2><p>Lo último que pasó con los clientes</p></header><div data-g="actividad"></div></article>
    </section>`;

  $$('[data-periodo]', raiz).forEach((b) => b.addEventListener('click', () => { estado.periodo = Number(b.dataset.periodo); guardarPreferencia('periodo', estado.periodo); render(); }));
  $('[data-informe]', raiz).addEventListener('click', () => window.print());
  const g = (k) => $(`[data-g="${k}"]`, raiz);
  const sinDatos = (nodo, texto = 'Sin datos en este periodo') => { nodo.innerHTML = `<p class="vacio vacio--chico">${texto}</p>`; };

  barras(g('mes'), meses.map((d, i) => ({ etiqueta: mesCorto(d), valor: porMes[i], tip: `<b>${mesCorto(d)} ${d.getFullYear()}</b><span>${plural(porMes[i], 'solicitud', 'solicitudes')}</span>` })), { titulo: 'Solicitudes por mes' });
  embudo(g('embudo'), ORDEN.map((id, i) => {
    const llegaron = enPeriodo.filter((o) => (o.alcanzo ?? 0) >= i);
    return { id, nombre: nombreEtapa(id), n: llegaron.length, valor: llegaron.reduce((s, o) => s + o.valor, 0) };
  }), { formatoValor: millones, alElegir: (id) => { estado.modo = 'tablero'; location.hash = '#/oportunidades'; setTimeout(() => $(`[data-col="${id}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }), 60); } });

  // Por cerrar: las 5 cotizaciones abiertas de mayor valor
  const top = [...abiertas].sort((a, b) => b.valor - a.valor).slice(0, 5);
  g('cerrar').innerHTML = top.length ? `<ul class="lista-cerrar">${top.map((o) => { const v = o.proxima && vencimiento(o.proxima.fecha); return `<li><button type="button" data-abrir="${o.id}">
      <span class="lc__cliente"><b>${esc(o.cliente.empresa || o.cliente.nombre)}</b><small>${esc(o.cliente.municipio)} · ${esc(o.responsable)}</small></span>
      <span class="etapa etapa--${o.etapa}">${nombreEtapa(o.etapa)}</span>
      ${v ? `<span class="vence vence--${v.clase}">${v.texto}</span>` : '<span></span>'}
      <span class="lc__valor mono">${millones(o.valor)}</span></button></li>`; }).join('')}</ul>` : '<p class="vacio vacio--chico">No hay cotizaciones abiertas.</p>';

  const porFuente = FUENTES.map((f) => {
    const de = enPeriodo.filter((o) => o.fuente === f);
    const cer = ops.filter((o) => o.fuente === f && o.cerrado);
    const gan = cer.filter((o) => o.etapa === 'ganado').length;
    return { etiqueta: f, valor: de.length, tip: `<b>${f}</b><span>${plural(de.length, 'solicitud', 'solicitudes')} · ${textoPeriodo()}</span><span>Cierre histórico: ${cer.length ? Math.round((gan / cer.length) * 100) : 0} % (${gan} de ${cer.length})</span>` };
  }).filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor);
  if (porFuente.length) barrasH(g('fuentes'), porFuente, { titulo: 'Solicitudes por fuente' }); else sinDatos(g('fuentes'));

  barras(g('ventas'), meses.map((d, i) => ({ etiqueta: mesCorto(d), valor: ventasPorMes[i], tip: `<b>${mesCorto(d)} ${d.getFullYear()}</b><span>${pesos(ventasPorMes[i])}</span><span>${Math.round((ventasPorMes[i] / meta) * 100)} % de la meta mensual</span>` })),
    { formato: (v, corto) => (corto ? (v >= 1e6 ? `${Math.round(v / 1e6)} M` : '0') : pesos(v)), titulo: 'Ventas ganadas por mes' });

  const perdidas = ops.filter((o) => o.etapa === 'perdido' && o.cerrado && enRango(o.cerrado, desde));
  const motivos = MOTIVOS.map((m) => ({ etiqueta: m, valor: perdidas.filter((o) => o.motivoPerdida === m).length })).filter((d) => d.valor).sort((a, b) => b.valor - a.valor);
  if (motivos.length) barrasH(g('motivos'), motivos, { titulo: 'Motivos de pérdida' }); else sinDatos(g('motivos'), 'Ninguna oportunidad perdida en este periodo');

  const conteo = {};
  enPeriodo.forEach((o) => o.equipos.forEach((e) => { conteo[e.id] = conteo[e.id] || { n: 0, g: 0 }; conteo[e.id].n += 1; if (o.etapa === 'ganado') conteo[e.id].g += 1; }));
  const eqs = Object.entries(conteo).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  if (eqs.length) barrasH(g('equipos'), eqs.map(([id, c]) => ({ etiqueta: corto(nombreEquipo(id)), valor: c.n, tip: `<b>${nombreEquipo(id)}</b><span>${plural(c.n, 'solicitud', 'solicitudes')}</span><span>${plural(c.g, 'vendida', 'vendidas')}</span>` })), { titulo: 'Equipos más pedidos' }); else sinDatos(g('equipos'));

  if (verEquipo) {
    const todas = oportunidades().filter((o) => !estado.fuente || o.fuente === estado.fuente);
    // Las personas activas y las que ya no tienen acceso pero aún tienen oportunidades abiertas (para reasignarlas)
    const personas = ajustes().equipo.filter((p) => p.activo || todas.some((o) => o.responsable === p.nombre && ABIERTAS.includes(o.etapa)));
    const filas = personas.map(({ nombre: r, activo }) => {
      const de = todas.filter((o) => o.responsable === r);
      const ab = de.filter((o) => ABIERTAS.includes(o.etapa));
      const cer = de.filter((o) => o.cerrado && enRango(o.cerrado, desde));
      const gan = cer.filter((o) => o.etapa === 'ganado');
      const venc = ab.filter((o) => o.proxima && vencimiento(o.proxima.fecha)?.dias < 0).length;
      const rsp = mediana(de.filter((o) => o.primeraRespuestaMin != null && enRango(o.creado, desde)).map((o) => o.primeraRespuestaMin));
      return { r, activo, ab: ab.length, valorAb: ab.reduce((s, o) => s + o.valor, 0), gan: gan.length, vendido: gan.reduce((s, o) => s + o.valor, 0), tasa: cer.length ? Math.round((gan.length / cer.length) * 100) : null, rsp, venc };
    });
    g('equipo').innerHTML = `<div class="tabla-cont tabla-cont--plana"><table class="tabla tabla--equipo"><thead><tr><th scope="col">Responsable</th><th scope="col" class="num">Abiertas</th><th scope="col" class="num">En juego</th><th scope="col" class="num">Ganadas</th><th scope="col" class="num">Vendido</th><th scope="col" class="num">Cierre</th><th scope="col" class="num">1.ª respuesta</th><th scope="col" class="num">Vencidos</th></tr></thead>
      <tbody>${filas.map((f) => `<tr data-resp="${esc(f.r)}" tabindex="0" title="Ver las oportunidades de ${esc(f.r)}">
        <td data-t="Responsable"><span class="persona"><span class="perfil__ini">${esc(f.r[0])}</span>${esc(f.r)}${f.activo ? '' : ' <span class="chip">sin acceso</span>'}</span></td>
        <td data-t="Abiertas" class="num mono">${f.ab}</td><td data-t="En juego" class="num mono">${millones(f.valorAb)}</td>
        <td data-t="Ganadas" class="num mono">${f.gan}</td><td data-t="Vendido" class="num mono">${f.vendido ? millones(f.vendido) : '—'}</td>
        <td data-t="Cierre" class="num mono">${f.tasa == null ? '—' : `${f.tasa} %`}</td><td data-t="1.ª respuesta" class="num mono">${minutosATexto(f.rsp)}</td>
        <td data-t="Vencidos" class="num">${f.venc ? `<span class="vence vence--vencida">${f.venc}</span>` : '<span class="mono">0</span>'}</td></tr>`).join('')}</tbody></table></div>`;
    $$('[data-resp]', g('equipo')).forEach((tr) => { const ir = () => { estado.responsable = tr.dataset.resp; location.hash = '#/oportunidades'; }; tr.addEventListener('click', ir); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); }); });
  }

  const region = {};
  ganadas.filter((o) => enRango(o.cerrado, desde)).forEach((o) => { region[o.cliente.departamento] = (region[o.cliente.departamento] || 0) + o.valor; });
  const reg = Object.entries(region).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (reg.length) barrasH(g('region'), reg.map(([dep, v]) => ({ etiqueta: dep, valor: v, tip: `<b>${dep}</b><span>${pesos(v)} ganados</span>` })), { formato: (v, c) => (c ? millones(v) : pesos(v)), titulo: 'Ventas por región' }); else sinDatos(g('region'), 'Sin ventas en este periodo');

  const porTipo = {};
  ganadas.filter((o) => enRango(o.cerrado, desde)).forEach((o) => { const t = o.cliente.tipo || 'Sin dato'; porTipo[t] = porTipo[t] || { v: 0, n: 0 }; porTipo[t].v += o.valor; porTipo[t].n += 1; });
  const tipos = Object.entries(porTipo).sort((a, b) => b[1].v - a[1].v);
  if (tipos.length) barrasH(g('tipo'), tipos.map(([t, { v, n }]) => ({ etiqueta: t, valor: v, tip: `<b>${t}</b><span>${pesos(v)} · ${plural(n, 'venta', 'ventas')}</span>` })), { formato: (v, c) => (c ? millones(v) : pesos(v)), titulo: 'Ventas por tipo de cliente' }); else sinDatos(g('tipo'), 'Sin ventas en este periodo');

  // Actividad reciente: lo último del historial de todas las oportunidades
  const eventos = ops.flatMap((o) => o.historial.slice(0, 4).map((h) => ({ ...h, o }))).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);
  g('actividad').innerHTML = `<ol class="actividad">${eventos.map((e) => `<li class="act act--${e.tipo}"><span class="lt__punto" aria-hidden="true"></span>
      <button type="button" data-abrir="${e.o.id}"><b>${esc(e.o.cliente.empresa || e.o.cliente.nombre)}</b> · ${esc(e.texto)}</button>
      <small>${hace(e.fecha)}${e.autor ? ` · ${esc(e.autor)}` : ''}</small></li>`).join('')}</ol>`;
  $$('[data-abrir]', raiz).forEach((b) => b.addEventListener('click', () => abrirFicha(b.dataset.abrir)));
}
const corto = (nombre) => nombre.replace('Tanque de ', 'Tq. ').replace(' con calentamiento', '').replace(' para moldes', '').replace(' a gas o vapor', '').replace(' y conservación', '').replace(' yogur – kumis', '');
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// =====================================================================================
// OPORTUNIDADES
// =====================================================================================
function barraFiltros({ conModo = false } = {}) {
  return `<div class="filtros">
    ${conModo ? `<div class="segmentado" role="group" aria-label="Vista"><button type="button" data-modo="tablero" aria-pressed="${estado.modo === 'tablero'}">Tablero</button><button type="button" data-modo="lista" aria-pressed="${estado.modo === 'lista'}">Lista</button></div>` : ''}
    <label class="filtro"><span>Responsable</span><select data-filtro="responsable"><option value="">Todos</option>${responsables().map((r) => `<option ${estado.responsable === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
    <label class="filtro"><span>Fuente</span><select data-filtro="fuente"><option value="">Todas</option>${FUENTES.map((f) => `<option ${estado.fuente === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
    ${estado.texto ? `<button type="button" class="chip chip--quitar" data-limpiar-texto>“${esc(estado.texto)}” ${ICONO.cerrar}</button>` : ''}
  </div>`;
}
function conectarFiltros(raiz) {
  $$('[data-filtro]', raiz).forEach((s) => s.addEventListener('change', () => { estado[s.dataset.filtro] = s.value; render(); }));
  $$('[data-modo]', raiz).forEach((b) => b.addEventListener('click', () => { estado.modo = b.dataset.modo; render(); }));
  $('[data-limpiar-texto]', raiz)?.addEventListener('click', () => { estado.texto = ''; $('#buscar').value = ''; render(); });
}

function tarjetaOp(o) {
  const v = o.proxima && vencimiento(o.proxima.fecha);
  const eq = o.equipos[0] ? `${corto(nombreEquipo(o.equipos[0].id))}${o.equipos.length > 1 ? ` <span class="mas">+${o.equipos.length - 1}</span>` : ''}` : 'Equipos por definir';
  return `<article class="op" draggable="true" data-op="${o.id}" tabindex="0" aria-label="${esc(o.cliente.empresa || o.cliente.nombre)}, ${nombreEtapa(o.etapa)}">
    <header><b class="op__empresa">${esc(o.cliente.empresa || o.cliente.nombre)}</b><span class="op__valor mono">${millones(o.valor)}</span></header>
    <p class="op__quien">${esc(o.cliente.nombre)} · ${esc(o.cliente.municipio)}</p>
    <p class="op__eq">${eq}</p>
    <footer>
      <span class="chip chip--fuente">${esc(o.fuente)}</span>
      ${o.delSitio && !o.demo ? '<span class="chip chip--sitio">Del sitio</span>' : ''}
      ${o.etapa === 'perdido' ? `<span class="chip">${esc(o.motivoPerdida)}</span>` : ''}
      ${o.etapa === 'ganado' ? `<span class="chip chip--ganado">${ICONO.check} ${fechaCorta(o.cerrado)}</span>` : ''}
      ${v ? `<span class="vence vence--${v.clase}" title="${esc(o.proxima.tipo)}">${v.clase === 'vencida' ? ICONO.alerta : ICONO.reloj}${v.texto}</span>` : ''}
    </footer>
  </article>`;
}

function vistaOportunidades(raiz) {
  const ops = filtradas();
  const recienCerradas = (o) => ABIERTAS.includes(o.etapa) || (o.cerrado && enRango(o.cerrado, haceDias(45)));
  if (estado.modo === 'lista') return vistaLista(raiz, ops);
  raiz.innerHTML = `${barraFiltros({ conModo: true })}
    <div class="tablero" role="list">
      ${ETAPAS.map((e) => {
        const de = ops.filter((o) => o.etapa === e.id && recienCerradas(o)).sort((a, b) => (a.proxima?.fecha || a.creado).localeCompare(b.proxima?.fecha || b.creado));
        const total = de.reduce((s, o) => s + o.valor, 0);
        return `<section class="col col--${e.id}" data-col="${e.id}" role="listitem" aria-label="${e.nombre}">
          <header class="col__cab" title="${esc(e.ayuda)}"><h2>${e.nombre}</h2><span class="col__n mono">${de.length}</span><span class="col__total mono">${millones(total)}</span></header>
          ${['ganado', 'perdido'].includes(e.id) ? '<p class="col__nota">Últimos 45 días</p>' : ''}
          <div class="col__lista" data-soltar="${e.id}">${de.map(tarjetaOp).join('') || '<p class="col__vacia">Sin oportunidades</p>'}</div>
        </section>`;
      }).join('')}
    </div>`;
  conectarFiltros(raiz);
  // Arrastrar y soltar entre etapas (en el celular se cambia la etapa desde la ficha)
  let arrastrando = null;
  $$('.op', raiz).forEach((c) => {
    c.addEventListener('click', () => abrirFicha(c.dataset.op));
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirFicha(c.dataset.op); } });
    c.addEventListener('dragstart', (e) => { arrastrando = c.dataset.op; c.classList.add('arrastrando'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', arrastrando); });
    c.addEventListener('dragend', () => { c.classList.remove('arrastrando'); $$('.col', raiz).forEach((x) => x.classList.remove('sobre')); });
  });
  $$('[data-soltar]', raiz).forEach((zona) => {
    const col = zona.closest('.col');
    col.addEventListener('dragover', (e) => { if (!arrastrando) return; e.preventDefault(); col.classList.add('sobre'); });
    col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('sobre'); });
    col.addEventListener('drop', async (e) => {
      e.preventDefault(); col.classList.remove('sobre');
      const id = arrastrando || e.dataTransfer.getData('text/plain'); arrastrando = null;
      await cambiarEtapa(id, zona.dataset.soltar);
    });
  });
}

function vistaLista(raiz, ops) {
  const { campo, dir } = estado.orden;
  const valor = { cliente: (o) => (o.cliente.empresa || o.cliente.nombre).toLowerCase(), etapa: (o) => ETAPAS.findIndex((e) => e.id === o.etapa), valor: (o) => o.valor, proxima: (o) => o.proxima?.fecha || '9', creado: (o) => o.creado };
  const orden = [...ops].sort((a, b) => { const x = valor[campo](a), y = valor[campo](b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
  const th = (c, t, clase = '') => `<th scope="col" class="${clase}" aria-sort="${campo === c ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" data-ordenar="${c}">${t}<span aria-hidden="true">${campo === c ? (dir > 0 ? '↑' : '↓') : ''}</span></button></th>`;
  raiz.innerHTML = `${barraFiltros({ conModo: true })}
    <div class="clientes-cab"><p><b class="mono">${orden.length}</b> oportunidades · <b class="mono">${millones(orden.reduce((s, o) => s + o.valor, 0))}</b> en total</p><button type="button" class="boton" data-exportar-ops>${ICONO.descargar}<span>Exportar a Excel</span></button></div>
    <div class="tabla-cont"><table class="tabla">
      <thead><tr>${th('cliente', 'Cliente')}${th('etapa', 'Etapa')}${th('valor', 'Valor', 'num')}<th scope="col">Fuente</th>${th('proxima', 'Próxima acción')}<th scope="col">Responsable</th>${th('creado', 'Llegó')}</tr></thead>
      <tbody>${orden.map((o) => { const v = o.proxima && vencimiento(o.proxima.fecha); return `<tr data-op="${o.id}" tabindex="0">
        <td data-t="Cliente"><b>${esc(o.cliente.empresa || o.cliente.nombre)}</b><small>${esc(o.cliente.nombre)} · ${esc(o.cliente.municipio)}</small></td>
        <td data-t="Etapa"><span class="etapa etapa--${o.etapa}">${nombreEtapa(o.etapa)}</span></td>
        <td data-t="Valor" class="num mono">${millones(o.valor)}</td>
        <td data-t="Fuente">${esc(o.fuente)}</td>
        <td data-t="Próxima acción">${v ? `<span class="vence vence--${v.clase}">${v.texto}</span><small>${esc(o.proxima.tipo)}</small>` : '<small>—</small>'}</td>
        <td data-t="Responsable">${esc(o.responsable)}</td>
        <td data-t="Llegó"><small>${hace(o.creado)}</small></td></tr>`; }).join('')}</tbody>
    </table>${orden.length ? '' : '<p class="vacio">No hay oportunidades con estos filtros.</p>'}</div>`;
  conectarFiltros(raiz);
  $('[data-exportar-ops]', raiz).addEventListener('click', () => exportarOportunidades(orden));
  $$('[data-ordenar]', raiz).forEach((b) => b.addEventListener('click', () => { const c = b.dataset.ordenar; estado.orden = { campo: c, dir: estado.orden.campo === c ? -estado.orden.dir : (c === 'cliente' || c === 'proxima' ? 1 : -1) }; render(); }));
  $$('tr[data-op]', raiz).forEach((tr) => { tr.addEventListener('click', () => abrirFicha(tr.dataset.op)); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrirFicha(tr.dataset.op); }); });
}

async function cambiarEtapa(id, etapa) {
  const o = buscar(id); if (!o || o.etapa === etapa) return;
  let motivo = null;
  if (etapa === 'perdido') { motivo = await pedirMotivo(); if (!motivo) return; }
  moverEtapa(id, etapa, { motivo });
  aviso(etapa === 'ganado' ? `¡Venta ganada! ${o.cliente.empresa || o.cliente.nombre} · ${millones(o.valor)}` : `${o.cliente.empresa || o.cliente.nombre} pasó a ${nombreEtapa(etapa)}`);
}

// =====================================================================================
// SEGUIMIENTOS
// =====================================================================================
function vistaSeguimientos(raiz) {
  const pend = pendientes(filtradas()).sort((a, b) => a.o.proxima.fecha.localeCompare(b.o.proxima.fecha));
  const grupos = [
    ['Vencidos', pend.filter(({ v }) => v.dias < 0), 'Primero estos: el cliente está esperando.'],
    ['Hoy', pend.filter(({ v }) => v.dias === 0), ''],
    ['Próximos 7 días', pend.filter(({ v }) => v.dias > 0 && v.dias <= 7), ''],
  ];
  const fila = ({ o, v }) => `<li class="seg" data-op="${o.id}">
    <span class="vence vence--${v.clase}">${v.clase === 'vencida' ? ICONO.alerta : ICONO.reloj}${v.texto}</span>
    <button type="button" class="seg__info" data-abrir="${o.id}"><b>${esc(o.proxima.tipo)}</b><span>${esc(o.cliente.empresa || o.cliente.nombre)} · ${esc(o.cliente.nombre)}</span></button>
    <span class="seg__etapa"><span class="etapa etapa--${o.etapa}">${nombreEtapa(o.etapa)}</span><span class="mono">${millones(o.valor)}</span></span>
    <span class="seg__acc">
      ${enlaceWhatsApp(o, 'icono-btn icono-btn--wa')}
      <button type="button" class="boton boton--chico" data-posponer="${o.id}" title="Pasar para mañana">Mañana</button>
      <button type="button" class="boton boton--chico boton--hecho" data-hecho="${o.id}">${ICONO.check}<span>Hecho</span></button>
    </span></li>`;
  raiz.innerHTML = `${barraFiltros()}
    <div class="reglas"><span><b>Regla de seguimiento:</b> a los 3, 7 y 15 días de enviada la cotización. Al marcar «Hecho», el panel agenda el siguiente.</span></div>
    ${grupos.map(([t, items, ayuda]) => `<section class="grupo"><header><h2>${t} <span class="mono">${items.length}</span></h2>${ayuda ? `<p>${ayuda}</p>` : ''}</header>
      ${items.length ? `<ul class="segs">${items.map(fila).join('')}</ul>` : `<p class="vacio vacio--ok">${ICONO.check} ${t === 'Vencidos' ? 'Ningún seguimiento vencido.' : 'Nada pendiente.'}</p>`}</section>`).join('')}`;
  conectarFiltros(raiz);
  $$('[data-abrir]', raiz).forEach((b) => b.addEventListener('click', () => abrirFicha(b.dataset.abrir)));
  $$('[data-hecho]', raiz).forEach((b) => b.addEventListener('click', () => { const o = buscar(b.dataset.hecho); const t = o.proxima.tipo; completarAccion(o.id); aviso(`Hecho: ${t}. Siguiente: ${o.proxima ? `${o.proxima.tipo}, ${fechaCorta(o.proxima.fecha)}` : '—'}`); }));
  $$('[data-posponer]', raiz).forEach((b) => b.addEventListener('click', () => { reprogramar(b.dataset.posponer, 1); aviso('Pasado para mañana'); }));
}

// WhatsApp solo si el cliente tiene celular (los de ejemplo no traen: se puede agregar con «Editar»)
function enlaceWhatsApp(o, clase = 'boton boton--wa') {
  const tel = (o.cliente.celular || '').replace(/\D/g, '');
  if (tel.length < 10) return '';
  const num = tel.length === 10 ? `57${tel}` : tel;
  const texto = `Hola, ${o.cliente.nombre.split(' ')[0]}. Le escribe ${estado.usuario} de Industrias Equinox Colombia sobre su solicitud ${o.folio}.`;
  return `<a class="${clase}" href="https://wa.me/${num}?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener" aria-label="Escribir por WhatsApp a ${esc(o.cliente.nombre)}">${ICONO.wa}${clase.includes('icono-btn') ? '' : '<span>WhatsApp</span>'}</a>`;
}

// =====================================================================================
// CLIENTES (la base de datos)
// =====================================================================================
function clientesAgrupados() {
  const mapa = new Map();
  for (const o of filtradas()) {
    const clave = `${(o.cliente.empresa || '').toLowerCase()}|${o.cliente.nombre.toLowerCase()}`;
    const c = mapa.get(clave) || { ...o.cliente, ops: [], fuente: o.fuente, ultima: o.creado };
    c.ops.push(o);
    const ult = o.historial[0]?.fecha || o.creado;
    if (ult > c.ultima) c.ultima = ult;
    mapa.set(clave, c);
  }
  return [...mapa.values()].map((c) => ({ ...c, ganado: c.ops.filter((o) => o.etapa === 'ganado').reduce((s, o) => s + o.valor, 0), reciente: [...c.ops].sort((a, b) => b.creado.localeCompare(a.creado))[0] }))
    .sort((a, b) => b.ultima.localeCompare(a.ultima));
}
function vistaClientes(raiz) {
  const lista = clientesAgrupados();
  const total = lista.length, conGanado = lista.filter((c) => c.ganado > 0).length;
  raiz.innerHTML = `${barraFiltros()}
    <div class="clientes-cab"><p><b class="mono">${total}</b> clientes · <b class="mono">${conGanado}</b> ya compraron</p><button type="button" class="boton" data-exportar>${ICONO.descargar}<span>Exportar a Excel</span></button></div>
    <div class="tabla-cont"><table class="tabla tabla--clientes">
      <thead><tr><th scope="col">Cliente</th><th scope="col">Tipo</th><th scope="col">Lugar</th><th scope="col">Fuente</th><th scope="col" class="num">Solicitudes</th><th scope="col" class="num">Comprado</th><th scope="col">Estado</th><th scope="col">Última actividad</th></tr></thead>
      <tbody>${lista.map((c) => `<tr data-op="${c.reciente.id}" tabindex="0">
        <td data-t="Cliente"><b>${esc(c.empresa || c.nombre)}</b><small>${esc(c.nombre)}</small></td>
        <td data-t="Tipo">${esc(c.tipo)}</td>
        <td data-t="Lugar">${esc(c.municipio)}<small>${esc(c.departamento)}</small></td>
        <td data-t="Fuente">${esc(c.fuente)}</td>
        <td data-t="Solicitudes" class="num mono">${c.ops.length}</td>
        <td data-t="Comprado" class="num mono">${c.ganado ? millones(c.ganado) : '—'}</td>
        <td data-t="Estado"><span class="etapa etapa--${c.reciente.etapa}">${nombreEtapa(c.reciente.etapa)}</span></td>
        <td data-t="Última actividad"><small>${hace(c.ultima)}</small></td></tr>`).join('')}</tbody>
    </table>${lista.length ? '' : '<p class="vacio">No hay clientes con estos filtros.</p>'}</div>`;
  conectarFiltros(raiz);
  $$('tr[data-op]', raiz).forEach((tr) => { tr.addEventListener('click', () => abrirFicha(tr.dataset.op)); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrirFicha(tr.dataset.op); }); });
  $('[data-exportar]', raiz).addEventListener('click', () => exportarCSV(lista));
}
// CSV con separador «;» y BOM: así lo abre bien Excel en español
function exportarCSV(lista) {
  const col = ['Empresa', 'Contacto', 'Tipo', 'Municipio', 'Departamento', 'Celular', 'Correo', 'Fuente', 'Solicitudes', 'Comprado (COP)', 'Estado', 'Última actividad'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = lista.map((c) => [c.empresa, c.nombre, c.tipo, c.municipio, c.departamento, c.celular, c.correo, c.fuente, c.ops.length, c.ganado, nombreEtapa(c.reciente.etapa), c.ultima.slice(0, 10)].map(q).join(';'));
  const blob = new Blob(['﻿' + [col.map(q).join(';'), ...filas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `clientes-equinox-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  aviso(`Exportados ${lista.length} clientes`);
}
function descargarCSV(nombre, columnas, filas) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob(['\uFEFF' + [columnas.map(q).join(';'), ...filas.map((f) => f.map(q).join(';'))].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
function exportarOportunidades(lista) {
  descargarCSV('oportunidades-equinox',
    ['Folio', 'Llegó', 'Empresa', 'Contacto', 'Tipo', 'Municipio', 'Departamento', 'Celular', 'Correo', 'Fuente', 'Detalle de la fuente', 'Etapa', 'Valor (COP)', 'Responsable', 'Próxima acción', 'Fecha próxima acción', 'Cotización', 'Motivo de pérdida', 'Cerrada', 'Equipos'],
    lista.map((o) => [o.folio, o.creado.slice(0, 10), o.cliente.empresa, o.cliente.nombre, o.cliente.tipo, o.cliente.municipio, o.cliente.departamento, o.cliente.celular, o.cliente.correo, o.fuente, o.detalleFuente,
      nombreEtapa(o.etapa), o.valor, o.responsable, o.proxima?.tipo || '', o.proxima?.fecha?.slice(0, 10) || '', o.cotizacion?.numero || '', o.motivoPerdida || '', o.cerrado?.slice(0, 10) || '', textoEquipos(o)]));
  aviso(`Exportadas ${lista.length} oportunidades`);
}

// =====================================================================================
// FICHA DE LA OPORTUNIDAD
// =====================================================================================
let foco = null;
function abrirFicha(id) {
  if (!buscar(id)) return;
  if (estado.abierta !== id) estado.editando = false;
  if (!estado.abierta) foco = document.activeElement;
  estado.abierta = id;
  pintarFicha();
  $('#ficha').hidden = false; $('.velo').hidden = false;
  requestAnimationFrame(() => { $('#ficha').classList.add('abierta'); $('.velo').classList.add('visible'); $('#ficha [data-cerrar-ficha]')?.focus(); });
  document.body.classList.add('con-ficha');
}
function cerrarFicha() {
  if (!estado.abierta) return;
  estado.abierta = null;
  $('#ficha').classList.remove('abierta'); $('.velo').classList.remove('visible');
  document.body.classList.remove('con-ficha');
  setTimeout(() => { if (!estado.abierta) { $('#ficha').hidden = true; $('.velo').hidden = true; } }, 260);
  foco?.focus?.();
}
$('.velo').addEventListener('click', cerrarFicha);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && estado.abierta && !document.querySelector('dialog[open]')) cerrarFicha(); });

function pintarFicha() {
  const o = buscar(estado.abierta); if (!o) return cerrarFicha();
  const c = o.cliente;
  const v = o.proxima && vencimiento(o.proxima.fecha);
  const abierta = ABIERTAS.includes(o.etapa);
  const fechaInput = o.proxima ? new Date(new Date(o.proxima.fecha).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';
  const ficha = $('#ficha');
  ficha.innerHTML = `
    <header class="ficha-op__cab">
      <div><p class="rotulo">${esc(o.folio)} · llegó ${hace(o.creado)}</p><h2 id="ficha-titulo">${esc(c.empresa || c.nombre)}</h2><p class="ficha-op__quien">${esc(c.nombre)}${c.tipo ? ` · ${esc(c.tipo)}` : ''}</p></div>
      <button type="button" class="icono-btn" data-cerrar-ficha aria-label="Cerrar la ficha">${ICONO.cerrar}</button>
    </header>
    <div class="ficha-op__cuerpo">
      <div class="etapas" role="group" aria-label="Etapa">
        ${ETAPAS.map((e) => `<button type="button" class="etapas__b etapas__b--${e.id}" data-etapa="${e.id}" aria-pressed="${o.etapa === e.id}" title="${esc(e.ayuda)}">${e.nombre}</button>`).join('')}
      </div>
      ${o.etapa === 'perdido' ? `<p class="ficha-op__motivo">Motivo de pérdida: <b>${esc(o.motivoPerdida)}</b></p>` : ''}
      <div class="ficha-op__grid">
        <label class="campo"><span>Valor de la oportunidad (COP)</span><input data-campo="valor" inputmode="numeric" value="${Math.round(o.valor).toLocaleString('es-CO')}"></label>
        <label class="campo"><span>Responsable</span><select data-campo="responsable">${[...new Set([...responsables(), o.responsable])].map((r) => `<option ${r === o.responsable ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
      </div>
      ${abierta ? `<section class="prox ${v ? `prox--${v.clase}` : ''}">
        <header><h3>Próxima acción</h3>${v ? `<span class="vence vence--${v.clase}">${v.texto}</span>` : ''}</header>
        <div class="prox__campos">
          <select data-prox="tipo" aria-label="Qué hay que hacer">${[...new Set([...acciones(), o.proxima?.tipo].filter(Boolean))].map((a) => `<option ${o.proxima?.tipo === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
          <input type="date" data-prox="fecha" value="${fechaInput}" aria-label="Fecha">
        </div>
        <div class="prox__acc">${enlaceWhatsApp(o)}<button type="button" class="boton boton--hecho" data-hecho-ficha>${ICONO.check}<span>Marcar hecho</span></button></div>
      </section>` : ''}
      <section class="bloque"><h3>Lo que pidió</h3>
        <ul class="eqs">${o.equipos.length ? o.equipos.map((e) => `<li><span>${esc(nombreEquipo(e.id))}</span><span class="mono">${esc(e.dato || '')}</span></li>`).join('') : '<li><span>Equipos por definir</span></li>'}</ul>
        <p class="bloque__dato">${[o.producto, o.litros ? `${Number(o.litros).toLocaleString('es-CO')} L/día` : ''].filter(Boolean).map(esc).join(' · ')}</p>
        ${o.nota ? `<p class="bloque__nota">“${esc(o.nota)}”</p>` : ''}
      </section>
      ${bloqueCotizacion(o)}
      <section class="bloque"><div class="bloque__cab"><h3>Contacto y origen</h3>${estado.editando ? '' : `<button type="button" class="boton boton--chico" data-editar>${ICONO.editar}<span>Editar</span></button>`}</div>
        ${estado.editando ? `<form class="campos campos--ficha" data-form-contacto>
          <label class="campo"><span>Contacto</span><input name="nombre" value="${esc(c.nombre)}" required></label>
          <label class="campo"><span>Empresa o finca</span><input name="empresa" value="${esc(c.empresa)}"></label>
          <label class="campo"><span>Celular</span><input name="celular" inputmode="tel" value="${esc(c.celular)}"></label>
          <label class="campo"><span>Correo</span><input name="correo" type="email" value="${esc(c.correo)}"></label>
          <label class="campo"><span>Municipio</span><input name="municipio" value="${esc(c.municipio)}"></label>
          <label class="campo"><span>Departamento</span><select name="departamento">${opciones([...new Set([...DEPARTAMENTOS, c.departamento].filter(Boolean))], 'Elegir…')}</select></label>
          <label class="campo campo--ancho"><span>Tipo de cliente</span><select name="tipo">${opciones(TIPOS, 'Elegir…')}</select></label>
          <div class="campo--ancho dialogo__pie"><button type="button" class="boton" data-cancelar-edicion>Cancelar</button><button type="submit" class="boton boton--primario">Guardar datos</button></div>
        </form>` : `<dl class="datos">
          <div><dt>Celular</dt><dd>${c.celular ? esc(c.celular) : '<span class="tenue">Sin dato</span>'}</dd></div>
          <div><dt>Correo</dt><dd>${c.correo ? esc(c.correo) : '<span class="tenue">Sin dato</span>'}</dd></div>
          <div><dt>Lugar</dt><dd>${esc([c.municipio, c.departamento].filter(Boolean).join(', ')) || '—'}</dd></div>
          <div><dt>Llegó por</dt><dd>${esc(o.fuente)}<small>${esc(o.detalleFuente || '')}</small></dd></div>
          <div><dt>Primera respuesta</dt><dd>${minutosATexto(o.primeraRespuestaMin)}</dd></div>
          <div><dt>Responsable</dt><dd>${esc(o.responsable)}</dd></div>
        </dl>`}
      </section>
      <section class="bloque"><h3>Historial</h3>
        <form class="nota-nueva" data-nota><label class="sr" for="nota-txt">Agregar nota</label><textarea id="nota-txt" rows="2" placeholder="Agregar una nota: qué dijo, qué sigue…"></textarea><button class="boton" type="submit">Agregar nota</button></form>
        <ol class="linea-tiempo">${o.historial.map((h) => `<li class="lt lt--${h.tipo}"><span class="lt__punto" aria-hidden="true"></span><p>${esc(h.texto)}</p><small>${fechaCorta(h.fecha)} · ${hace(h.fecha)} · ${esc(h.autor || '')}</small></li>`).join('')}</ol>
      </section>
    </div>`;
  $('[data-cerrar-ficha]', ficha).addEventListener('click', cerrarFicha);
  $$('[data-etapa]', ficha).forEach((b) => b.addEventListener('click', () => cambiarEtapa(o.id, b.dataset.etapa)));
  $('[data-campo="valor"]', ficha).addEventListener('change', (e) => { const n = Number(e.target.value.replace(/\D/g, '')); if (n && n !== o.valor) { actualizar(o.id, { valor: n }, `Valor actualizado a ${pesos(n)}`); aviso('Valor actualizado'); } });
  $('[data-campo="responsable"]', ficha).addEventListener('change', (e) => { actualizar(o.id, { responsable: e.target.value }, `Responsable: ${e.target.value}`); aviso(`Asignada a ${e.target.value}`); });
  $$('[data-prox]', ficha).forEach((inp) => inp.addEventListener('change', () => {
    const tipo = $('[data-prox="tipo"]', ficha).value, f = $('[data-prox="fecha"]', ficha).value;
    const fecha = f ? new Date(`${f}T09:00:00`).toISOString() : o.proxima?.fecha;
    actualizar(o.id, { proxima: { tipo, fecha } }, `Próxima acción: ${tipo}, ${fechaCorta(fecha)}`);
  }));
  $('[data-hecho-ficha]', ficha)?.addEventListener('click', () => { const t = o.proxima?.tipo; completarAccion(o.id); aviso(`Hecho: ${t}`); });
  $('[data-nota]', ficha).addEventListener('submit', (e) => { e.preventDefault(); const t = $('#nota-txt').value; if (t.trim()) { agregarNota(o.id, t); aviso('Nota agregada'); } });
  // Contacto editable
  $('[data-editar]', ficha)?.addEventListener('click', () => { estado.editando = true; pintarFicha(); $('[data-form-contacto] input', ficha)?.focus(); });
  const fc = $('[data-form-contacto]', ficha);
  if (fc) {
    fc.departamento.value = c.departamento || ''; fc.tipo.value = c.tipo || '';
    $('[data-cancelar-edicion]', fc).addEventListener('click', () => { estado.editando = false; pintarFicha(); });
    fc.addEventListener('submit', (e) => {
      e.preventDefault(); if (!fc.reportValidity()) return;
      const nuevo = { ...c, nombre: fc.nombre.value.trim(), empresa: fc.empresa.value.trim(), celular: fc.celular.value.trim(), correo: fc.correo.value.trim(), municipio: fc.municipio.value.trim(), departamento: fc.departamento.value, tipo: fc.tipo.value };
      estado.editando = false;
      actualizar(o.id, { cliente: nuevo }, 'Datos de contacto actualizados');
      aviso('Datos guardados');
    });
  }
  // Cotización
  $('[data-registrar-cot]', ficha)?.addEventListener('click', () => cambiarEtapa(o.id, 'cotizado'));
  $$('[data-cot]', ficha).forEach((inp) => inp.addEventListener('change', () => {
    const k = inp.dataset.cot;
    const val = k === 'fecha' ? new Date(`${inp.value}T09:00:00`).toISOString() : k === 'numero' ? inp.value.trim() : Number(inp.value.replace(/\D/g, '')) || o.cotizacion[k];
    actualizar(o.id, { cotizacion: { ...o.cotizacion, [k]: val } }, k === 'numero' ? `Cotización: ${val}` : null);
  }));
}
const aFechaInput = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '');
const listaDias = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : String(xs[0]));
function bloqueCotizacion(o) {
  if ((o.alcanzo ?? 0) < 2 && !o.cotizacion) return '';
  const k = o.cotizacion;
  if (!k) return `<section class="bloque"><h3>Cotización</h3><p class="bloque__dato">Todavía no se ha enviado. Al registrarla, el panel agenda el seguimiento a los ${listaDias(ajustes().seguimiento)} días.</p><button type="button" class="boton" data-registrar-cot>${ICONO.check}<span>Registrar cotización enviada</span></button></section>`;
  const vence = new Date(new Date(k.fecha).getTime() + k.vigenciaDias * DIA);
  const quedan = Math.ceil((vence - Date.now()) / DIA);
  const estadoCot = o.etapa === 'ganado' ? '<span class="chip chip--ganado">Aceptada</span>' : o.etapa === 'perdido' ? '<span class="chip">No aceptada</span>'
    : quedan < 0 ? `<span class="vence vence--vencida">Vencida hace ${-quedan} días</span>` : `<span class="vence ${quedan <= 5 ? 'vence--hoy' : ''}">Vigente ${quedan === 0 ? 'hasta hoy' : `${quedan} días más`}</span>`;
  return `<section class="bloque"><div class="bloque__cab"><h3>Cotización</h3>${estadoCot}</div>
    <div class="campos campos--cot">
      <label class="campo"><span>Número</span><input data-cot="numero" value="${esc(k.numero)}"></label>
      <label class="campo"><span>Enviada el</span><input type="date" data-cot="fecha" value="${aFechaInput(k.fecha)}"></label>
      <label class="campo"><span>Plazo de entrega (semanas)</span><input data-cot="plazoSemanas" inputmode="numeric" value="${k.plazoSemanas}"></label>
      <label class="campo"><span>Vigencia (días)</span><input data-cot="vigenciaDias" inputmode="numeric" value="${k.vigenciaDias}"></label>
    </div>
    <p class="bloque__dato">Vence el ${fechaCorta(vence.toISOString())} · entrega en unas ${k.plazoSemanas} semanas desde el anticipo</p></section>`;
}

// =====================================================================================
// AJUSTES (solo Gerencia)
// =====================================================================================
function vistaAjustes(raiz) {
  if (estado.usuario !== 'Gerencia') { raiz.innerHTML = '<p class="vacio">Solo Gerencia cambia los ajustes.</p>'; return; }
  const a = ajustes();
  const abiertasDe = (n) => oportunidades().filter((o) => o.responsable === n && ABIERTAS.includes(o.etapa)).length;
  raiz.innerHTML = `<div class="ajustes">
    <section class="tarjeta">
      <header><h2>Meta de ventas</h2><p>Es la meta del mes que se ve en el resumen. La meta de 2027 es de 800 a 1.000 millones al año.</p></header>
      <form class="form-ajuste" data-form-meta>
        <label class="campo"><span>Meta mensual (COP)</span><input name="meta" inputmode="numeric" value="${Math.round(a.metaMes).toLocaleString('es-CO')}" required></label>
        <p class="form-ajuste__nota" data-meta-anual>Equivale a ${millones(a.metaMes * 12)} al año</p>
        <button type="submit" class="boton boton--primario">Guardar meta</button>
      </form>
    </section>
    <section class="tarjeta">
      <header><h2>Seguimiento de cotizaciones</h2><p>Días después de enviada la cotización. Al marcar «Hecho», el panel agenda el siguiente.</p></header>
      <form class="form-ajuste" data-form-seg>
        <div class="campos campos--tres">${a.seguimiento.map((d, i) => `<label class="campo"><span>${['Primer', 'Segundo', 'Tercer'][i]} seguimiento</span><input name="s${i}" inputmode="numeric" value="${d}" required></label>`).join('')}</div>
        <label class="campo"><span>Vigencia de la cotización (días)</span><input name="vigencia" inputmode="numeric" value="${a.vigenciaDias}" required></label>
        <button type="submit" class="boton boton--primario">Guardar reglas</button>
      </form>
    </section>
    <section class="tarjeta tarjeta--ancha">
      <header><h2>Equipo y accesos</h2><p>Quién entra al panel. En la versión real cada persona tiene su usuario y contraseña, y Gerencia decide quién entra.</p></header>
      <div class="tabla-cont tabla-cont--plana"><table class="tabla tabla--equipo">
        <thead><tr><th scope="col">Persona</th><th scope="col">Rol</th><th scope="col" class="num">Oportunidades abiertas</th><th scope="col">Acceso</th></tr></thead>
        <tbody>${a.equipo.map((p, i) => `<tr class="${p.activo ? '' : 'inactivo'}">
          <td data-t="Persona"><span class="persona"><span class="perfil__ini">${esc(p.nombre[0])}</span>${esc(p.nombre)}</span></td>
          <td data-t="Rol">${esc(p.rol)}</td>
          <td data-t="Abiertas" class="num mono">${abiertasDe(p.nombre)}</td>
          <td data-t="Acceso"><label class="interruptor"><input type="checkbox" data-activo="${i}" ${p.activo ? 'checked' : ''} ${p.rol === 'Gerencia' ? 'disabled' : ''}><span></span>${p.activo ? 'Activo' : 'Sin acceso'}</label></td></tr>`).join('')}</tbody>
      </table></div>
      <form class="form-ajuste form-ajuste--fila" data-form-persona>
        <label class="campo"><span>Nombre</span><input name="nombre" placeholder="Ej.: Camila (ventas)" required></label>
        <label class="campo"><span>Rol</span><select name="rol"><option>Ventas</option><option>Gerencia</option></select></label>
        <button type="submit" class="boton">Agregar persona</button>
      </form>
      <p class="form-ajuste__nota">Si alguien deja de tener acceso, sus oportunidades siguen a su nombre: se reasignan desde la ficha.</p>
    </section>
    <section class="tarjeta tarjeta--ancha">
      <header><h2>Datos</h2><p>La base de datos es de Equinox. Se puede descargar completa cuando se necesite.</p></header>
      <div class="acciones-datos">
        <button type="button" class="boton" data-exportar-todo>${ICONO.descargar}<span>Exportar oportunidades a Excel</span></button>
        <button type="button" class="boton" data-exportar-clientes>${ICONO.descargar}<span>Exportar clientes a Excel</span></button>
        <button type="button" class="boton boton--peligro-suave" data-restablecer-ajustes>Restablecer datos de ejemplo</button>
      </div>
    </section>
  </div>`;
  const fm = $('[data-form-meta]', raiz);
  fm.meta.addEventListener('input', () => { const n = Number(fm.meta.value.replace(/\D/g, '')); $('[data-meta-anual]', raiz).textContent = `Equivale a ${millones(n * 12)} al año`; });
  fm.addEventListener('submit', (e) => { e.preventDefault(); const n = Number(fm.meta.value.replace(/\D/g, '')); if (!n) return; guardarAjustes({ metaMes: n }); aviso(`Meta mensual: ${pesos(n)}`); });
  const fs = $('[data-form-seg]', raiz);
  fs.addEventListener('submit', (e) => {
    e.preventDefault();
    const dias = [0, 1, 2].map((i) => Number(fs[`s${i}`].value.replace(/\D/g, '')));
    if (dias.some((d) => !d) || !(dias[0] < dias[1] && dias[1] < dias[2])) { aviso('Los días deben ir de menor a mayor, por ejemplo 3, 7 y 15'); return; }
    guardarAjustes({ seguimiento: dias, vigenciaDias: Number(fs.vigencia.value.replace(/\D/g, '')) || a.vigenciaDias });
    aviso(`Seguimiento a los ${listaDias(dias)} días`);
  });
  $$('[data-activo]', raiz).forEach((c) => c.addEventListener('change', () => {
    const equipo = a.equipo.map((p, i) => (i === Number(c.dataset.activo) ? { ...p, activo: c.checked } : p));
    guardarAjustes({ equipo }); aviso(`${equipo[c.dataset.activo].nombre}: ${c.checked ? 'con acceso' : 'sin acceso'}`);
  }));
  const fp = $('[data-form-persona]', raiz);
  fp.addEventListener('submit', (e) => {
    e.preventDefault(); const nombre = fp.nombre.value.trim(); if (!nombre) return;
    if (a.equipo.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) { aviso('Esa persona ya está en el equipo'); return; }
    guardarAjustes({ equipo: [...a.equipo, { nombre, rol: fp.rol.value, activo: true }] }); aviso(`${nombre} agregado al equipo`);
  });
  $('[data-exportar-todo]', raiz).addEventListener('click', () => exportarOportunidades(oportunidades()));
  $('[data-exportar-clientes]', raiz).addEventListener('click', () => { const t = estado.texto, r = estado.responsable, f = estado.fuente; estado.texto = ''; estado.responsable = ''; estado.fuente = ''; const l = clientesAgrupados(); estado.texto = t; estado.responsable = r; estado.fuente = f; exportarCSV(l); });
  $('[data-restablecer-ajustes]', raiz).addEventListener('click', () => $('[data-restablecer]').click());
}

// =====================================================================================
// NUEVA SOLICITUD
// =====================================================================================
const dlg = $('#dialogo-nueva'), form = $('#form-nueva');
let equiposNuevos = [];
const opciones = (lista, vacio) => (vacio ? `<option value="">${vacio}</option>` : '') + lista.map((x) => `<option>${esc(x)}</option>`).join('');
form.departamento.innerHTML = opciones(DEPARTAMENTOS, 'Elegir…');
form.tipo.innerHTML = opciones(TIPOS, 'Elegir…');
form.fuente.innerHTML = opciones(FUENTES.filter((f) => f !== 'Sitio web'), 'Elegir…');
form.equipo.innerHTML = `<option value="">Elegir equipo…</option>${ORDEN_EQUIPOS.map((id) => `<option value="${id}">${esc(EQUIPOS[id].nombre)}</option>`).join('')}`;
function pintarChips() {
  $('[data-chips-equipos]').innerHTML = equiposNuevos.map((e, i) => `<li class="chip">${esc(nombreEquipo(e.id))}${e.dato ? ` · ${esc(e.dato)}` : ''}<button type="button" data-quitar="${i}" aria-label="Quitar">${ICONO.cerrar}</button></li>`).join('');
  $$('[data-quitar]').forEach((b) => b.addEventListener('click', () => { equiposNuevos.splice(Number(b.dataset.quitar), 1); pintarChips(); }));
  form.valor.placeholder = equiposNuevos.length ? `Estimado: ${pesos(estimarValor(equiposNuevos))}` : 'Se calcula con los equipos';
}
$('[data-agregar-equipo]').addEventListener('click', () => {
  if (!form.equipo.value) return form.equipo.focus();
  equiposNuevos.push({ id: form.equipo.value, dato: form.dato.value.trim() });
  form.equipo.value = ''; form.dato.value = ''; pintarChips();
});
function abrirNueva() {
  form.reset(); equiposNuevos = []; pintarChips();
  form.responsable.innerHTML = opciones(responsables());
  if (estado.usuario && estado.usuario !== 'Gerencia') form.responsable.value = estado.usuario;
  dlg.showModal(); form.nombre.focus();
}
$$('[data-nueva]').forEach((b) => b.addEventListener('click', abrirNueva));
$$('[data-cerrar-dialogo]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const valor = Number(form.valor.value.replace(/\D/g, '')) || estimarValor(equiposNuevos);
  const o = crear({
    cliente: { nombre: form.nombre.value.trim(), empresa: form.empresa.value.trim(), celular: form.celular.value.trim(), correo: '', municipio: form.municipio.value.trim(), departamento: form.departamento.value, tipo: form.tipo.value },
    equipos: equiposNuevos, litros: Number(form.litros.value.replace(/\D/g, '')) || null, fuente: form.fuente.value, responsable: form.responsable.value, valor, nota: form.nota.value.trim(),
  });
  dlg.close();
  aviso('Solicitud guardada. Primer contacto: hoy.');
  if (estado.vista !== 'oportunidades') location.hash = '#/oportunidades';
  setTimeout(() => abrirFicha(o.id), 80);
});

// ---------- motivo de pérdida ----------
function pedirMotivo() {
  const d = $('#dialogo-motivo');
  $('[data-motivos]', d).innerHTML = MOTIVOS.map((m, i) => `<label class="motivo"><input type="radio" name="motivo" value="${esc(m)}" ${i === 0 ? 'checked' : ''}><span>${esc(m)}</span></label>`).join('');
  d.showModal();
  return new Promise((res) => d.addEventListener('close', () => res(d.returnValue === 'ok' ? $('input[name="motivo"]:checked', d)?.value : null), { once: true }));
}

// ---------- aviso ----------
let tAviso;
function aviso(texto) {
  const t = $('#toast'); t.textContent = texto; t.hidden = false;
  requestAnimationFrame(() => t.classList.add('visible'));
  clearTimeout(tAviso); tAviso = setTimeout(() => { t.classList.remove('visible'); setTimeout(() => { t.hidden = true; }, 250); }, 2800);
}

// ---------- búsqueda global ----------
const buscador = $('#buscar');
let tBuscar;
buscador.addEventListener('input', () => {
  clearTimeout(tBuscar);
  tBuscar = setTimeout(() => {
    estado.texto = buscador.value;
    if (estado.texto && estado.vista === 'resumen') { location.hash = '#/oportunidades'; estado.modo = 'lista'; } else render();
  }, 160);
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]') && !$('#app').hidden) { e.preventDefault(); buscador.focus(); }
});

// ---------- restablecer y sincronizar ----------
$('[data-restablecer]').addEventListener('click', () => {
  if (!confirm('¿Volver a los datos de ejemplo? Se pierden los cambios hechos en esta demo (las solicitudes del sitio se vuelven a traer).')) return;
  cerrarFicha(); restablecer(); aviso('Datos de ejemplo restablecidos');
});
function traerDelSitio() {
  const n = sincronizarSitio();
  if (n > 0) aviso(n === 1 ? 'Llegó 1 solicitud nueva del sitio' : `Llegaron ${n} solicitudes nuevas del sitio`);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && estado.usuario) traerDelSitio(); });
window.addEventListener('storage', (e) => { if (e.key === 'eqx-solicitudes' && estado.usuario) traerDelSitio(); });

// Al cambiar los datos se repinta la vista (y la ficha abierta)
alCambiar(() => { if ($('#app').hidden) return; render(); if (estado.abierta) pintarFicha(); });
// Al cambiar el tamaño de la ventana se rehacen las gráficas
let tRes;
window.addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(() => { if (estado.vista === 'resumen' && !$('#app').hidden) render(); }, 200); });

// ---------- arranque ----------
cargar();
const usuario = leerUsuario();
if (usuario) entrar(usuario); else $('#entrada').hidden = false;
