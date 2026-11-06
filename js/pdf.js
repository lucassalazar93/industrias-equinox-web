// Generación de PDF (ficha técnica y plano de planta) con jsPDF, en el navegador.
const AZUL = [8, 16, 90], ROJO = [196, 53, 28], GRIS = [79, 87, 121], PAPEL = [237, 240, 244], BLANCO = [255, 255, 255];
import { numeroWhatsApp, textoWhatsApp } from './data.js';
// whatsapp: número para wa.me (el único de la web, o el de prueba ?wa=); whatsappTexto: el mismo para mostrar; telefono: para llamar
export const CONTACTO = { get whatsapp() { return numeroWhatsApp(); }, get whatsappTexto() { return textoWhatsApp(); }, telefono: '+57 310 725 0200', correo: 'ventas@indequinoxcol.com', web: 'www.indequinoxcol.com', lugar: 'Copacabana, Antioquia, Colombia' };

const limpiar = (s) => String(s ?? '').replace(/≈\s?/g, 'aprox. ').replace(/→/g, 'a').replace(/[“”]/g, '"').replace(/—/g, '-');

// Una sola carga por librería: si otra llamada llega mientras carga, espera la misma (antes respondía "listo" antes de tiempo)
const cargas = new Map();
function cargarScript(src) {
  if (!cargas.has(src)) cargas.set(src, new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { cargas.delete(src); mal(new Error(`No cargó ${src}`)); }; document.head.appendChild(s); }));
  return cargas.get(src);
}
export async function prepararPDF() {
  await cargarScript('vendor/pdf/jspdf.umd.min.js');
  await cargarScript('vendor/pdf/qrcode.js');
}
// Carga con onload (img.decode() se queda esperando en pestañas en segundo plano y en algunos navegadores)
const cargarImg = (url) => new Promise((ok, mal) => { const img = new Image(); img.onload = () => ok(img); img.onerror = mal; img.src = url; });
async function imagen(url, tipo = 'image/png') {
  const img = await cargarImg(url);
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return { url: c.toDataURL(tipo, 0.9), w: img.naturalWidth, h: img.naturalHeight };
}
function qr(doc, texto, x, y, lado) {
  const q = window.qrcode(0, 'M'); q.addData(texto); q.make();
  const n = q.getModuleCount(), cel = lado / n;
  doc.setFillColor(...BLANCO); doc.rect(x - 2, y - 2, lado + 4, lado + 4, 'F');
  doc.setFillColor(...AZUL);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) doc.rect(x + c * cel, y + r * cel, cel + 0.02, cel + 0.02, 'F');
}

function encabezado(doc, logo, titulo, codigo) {
  doc.setFillColor(...AZUL); doc.rect(0, 0, 210, 30, 'F');
  doc.setFillColor(...BLANCO); doc.roundedRect(14, 7, 50, 16, 1.5, 1.5, 'F');
  const lw = 46, lh = (lw * logo.h) / logo.w;
  doc.addImage(logo.url, 'PNG', 16, 15 - lh / 2, lw, lh);
  doc.setTextColor(...BLANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(titulo, 196, 14.5, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text(limpiar(codigo), 196, 21, { align: 'right' });
}
function encabezadoCorto(doc, texto) {
  doc.setFillColor(...AZUL); doc.rect(0, 0, 210, 14, 'F');
  doc.setTextColor(...BLANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  doc.text(limpiar(texto), 14, 9);
  doc.setFont('helvetica', 'normal'); doc.text('Industrias Equinox Colombia', 196, 9, { align: 'right' });
}
function pie(doc, n, total, nota) {
  doc.setDrawColor(...AZUL); doc.setLineWidth(0.3); doc.line(14, 286, 196, 286);
  doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text(`Industrias Equinox Colombia · ${CONTACTO.web} · ${CONTACTO.telefono} · ${CONTACTO.correo}`, 14, 291);
  doc.text(`Página ${n} de ${total}`, 196, 291, { align: 'right' });
  if (nota) { doc.setTextColor(...ROJO); doc.text(limpiar(nota), 14, 282.5); }
}
function sello(doc, texto, x, y) {
  doc.setDrawColor(...ROJO); doc.setTextColor(...ROJO); doc.setLineWidth(0.5);
  doc.setFont('courier', 'bold'); doc.setFontSize(8);
  const w = doc.getTextWidth(texto) + 6;
  doc.rect(x, y, w, 6.5); doc.rect(x - 0.9, y - 0.9, w + 1.8, 8.3);
  doc.text(texto, x + 3, y + 4.5);
}
function titulo(doc, texto, y, tam = 12) {
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(tam);
  doc.text(limpiar(texto), 14, y);
  doc.setDrawColor(...AZUL); doc.setLineWidth(0.4); doc.line(14, y + 2, 196, y + 2);
  return y + 8;
}
function parrafo(doc, texto, x, y, ancho, tam = 9.5, color = AZUL) {
  doc.setTextColor(...color); doc.setFont('helvetica', 'normal'); doc.setFontSize(tam);
  const lineas = doc.splitTextToSize(limpiar(texto), ancho);
  doc.text(lineas, x, y);
  return y + lineas.length * tam * 0.42;
}
function bloqueContacto(doc, y, textoQR, mensaje) {
  doc.setFillColor(...AZUL); doc.rect(14, y, 182, 50, 'F');
  doc.setTextColor(...BLANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('Cotiza con Equinox', 20, y + 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(doc.splitTextToSize(limpiar(mensaje), 118), 20, y + 18);
  const filas = [['WhatsApp', CONTACTO.whatsappTexto], ['Teléfono', CONTACTO.telefono], ['Correo', CONTACTO.correo], ['Web', CONTACTO.web], ['Planta', CONTACTO.lugar]];
  filas.forEach(([k, v], i) => { doc.setFont('helvetica', 'bold'); doc.text(k, 20, y + 29 + i * 4.4); doc.setFont('helvetica', 'normal'); doc.text(v, 42, y + 29 + i * 4.4); });
  qr(doc, textoQR, 156, y + 7, 34);
  doc.setFontSize(7); doc.text('Escanea para escribirnos', 173, y + 47.5, { align: 'center' });
}

export async function fichaPDF({ eq, ficha, cap, unidad, general, explosion, fecha, foto }) {
  await prepararPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await imagen('assets/img/logo-equinox.png');
  const capTxt = ficha.fija || `${Number(cap).toLocaleString('es-CO')} ${unidad}`;
  const codigo = `${eq.tag}-01 · Rev. 0 · ${fecha}`;
  const nota = 'Prototipo: medidas, potencias y pesos son valores de muestra. Equinox confirma los datos en su cotización.';

  // Página 1
  encabezado(doc, logo, 'FICHA TÉCNICA', codigo);
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(21);
  const tl = doc.splitTextToSize(limpiar(eq.nombre), 140);
  doc.text(tl, 14, 44);
  let y = 44 + tl.length * 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRIS);
  doc.text(limpiar(`Capacidad de esta ficha: ${capTxt}`), 14, y); y += 6;
  sello(doc, 'VALORES DE MUESTRA', 152, 38);
  y = parrafo(doc, ficha.resumen, 14, y + 1, 182, 10) + 4;
  const yImg = y;
  doc.setDrawColor(...PAPEL); doc.setLineWidth(0.4);
  if (foto) {
    // Foto real de Equinox, contenida en el recuadro sobre fondo blanco
    const f = await imagen(foto, 'image/jpeg');
    const esc = Math.min(104 / f.w, 72 / f.h), fw = f.w * esc, fh = f.h * esc;
    doc.setFillColor(...BLANCO); doc.rect(14, yImg, 112, 84, 'F');
    doc.addImage(f.url, 'JPEG', 14 + (112 - fw) / 2, yImg + 3 + (72 - fh) / 2, fw, fh);
    doc.rect(14, yImg, 112, 84);
    doc.setFont('courier', 'bold'); doc.setFontSize(7); doc.setTextColor(...ROJO);
    doc.text(limpiar('FOTO REAL · EQUINOX'), 17, yImg + 81);
  } else {
    doc.addImage(general.url, 'JPEG', 14, yImg, 112, 84); doc.rect(14, yImg, 112, 84);
  }
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Datos principales', 132, yImg + 4);
  let yd = yImg + 10;
  const datos = [['Capacidad', capTxt], ...ficha.comunes.slice(0, 1), ...ficha.tabla(cap)];
  datos.slice(0, 7).forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.text(limpiar(k).toUpperCase(), 132, yd);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...AZUL); doc.text(doc.splitTextToSize(limpiar(v), 62), 132, yd + 4.6);
    doc.setDrawColor(...PAPEL); doc.line(132, yd + 7.4, 196, yd + 7.4);
    yd += 11;
  });
  y = yImg + 92;
  y = titulo(doc, 'Pieza por pieza', y);
  const wE = 118, hE = 88.5;
  doc.addImage(explosion.url, 'JPEG', 14, y, wE, hE);
  doc.setDrawColor(...PAPEL); doc.rect(14, y, wE, hE);
  explosion.anclas.forEach((a) => {
    const px = 14 + a.x * wE, py = y + a.y * hE;
    if (px < 14 || px > 14 + wE || py < y || py > y + hE) return;
    doc.setFillColor(...ROJO); doc.circle(px, py, 2.4, 'F');
    doc.setTextColor(...BLANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.text(String(a.n), px, py + 0.9, { align: 'center' });
  });
  let yl = y + 3;
  explosion.anclas.forEach((a) => {
    doc.setFillColor(...ROJO); doc.circle(139, yl - 1, 2.2, 'F');
    doc.setTextColor(...BLANCO); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.text(String(a.n), 139, yl - 0.1, { align: 'center' });
    doc.setTextColor(...AZUL); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const l = doc.splitTextToSize(limpiar(a.nombre), 52); doc.text(l, 144, yl); yl += Math.max(6.5, l.length * 4);
  });

  // Página 2
  doc.addPage();
  encabezadoCorto(doc, `${eq.nombre} · Ficha técnica`);
  y = 26;
  y = titulo(doc, 'Especificaciones por capacidad', y);
  const caps = ficha.capacidades;
  const filasT = ficha.tabla(caps[0]).map(([k]) => k);
  const colL = 52, colW = Math.min(36, 130 / caps.length);
  doc.setFillColor(...PAPEL); doc.rect(14, y - 4.5, colL + colW * caps.length, 7, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...AZUL);
  doc.text(limpiar(unidad === 'unidad' ? 'Medida' : `Capacidad (${unidad})`), 16, y);
  caps.forEach((c, i) => { const sel = c === cap; if (sel) { doc.setFillColor(...AZUL); doc.rect(14 + colL + i * colW, y - 4.5, colW, 7, 'F'); doc.setTextColor(...BLANCO); } else doc.setTextColor(...AZUL); doc.text(ficha.fija ? 'Única' : Number(c).toLocaleString('es-CO'), 14 + colL + i * colW + 2, y); });
  y += 7;
  filasT.forEach((k, fi) => {
    doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text(limpiar(k), 16, y);
    caps.forEach((c, i) => { const v = ficha.tabla(c)[fi][1]; doc.setTextColor(...AZUL); doc.setFont('helvetica', c === cap ? 'bold' : 'normal'); doc.text(doc.splitTextToSize(limpiar(v), colW - 3), 14 + colL + i * colW + 2, y); });
    doc.setDrawColor(...PAPEL); doc.line(14, y + 2.6, 14 + colL + colW * caps.length, y + 2.6);
    y += 7.5;
  });
  y += 4;
  y = titulo(doc, 'Especificaciones comunes', y);
  ficha.comunes.forEach(([k, v], i) => {
    const x = i % 2 ? 106 : 14;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.text(limpiar(k).toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...AZUL); doc.text(limpiar(v), x, y + 4.5);
    if (i % 2) y += 11;
  });
  if (ficha.comunes.length % 2) y += 11;
  y += 2;
  y = titulo(doc, 'Cómo funciona', y);
  Object.values(ficha.pasos).forEach(([t, d], i) => {
    doc.setTextColor(...ROJO); doc.setFont('courier', 'bold'); doc.setFontSize(9); doc.text(String(i + 1).padStart(2, '0'), 14, y);
    doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(limpiar(t), 24, y);
    y = parrafo(doc, d, 24, y + 4.4, 170, 8.8, GRIS) + 2.5;
  });
  y += 2;
  if (y < 205) {
    y = titulo(doc, 'Opciones', y);
    ficha.opciones.forEach(([t, d]) => {
      doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(`• ${limpiar(t)}`, 14, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS);
      const l = doc.splitTextToSize(limpiar(d), 170); doc.text(l, 17, y + 4.2); y += 4.2 + l.length * 3.9 + 2;
    });
  }
  const mensaje = `Hola, Equinox. Quiero cotizar: ${eq.nombre}, ${capTxt} (ficha ${eq.tag}).`;
  bloqueContacto(doc, 228, `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(limpiar(mensaje))}`, 'Escanea el código y escríbenos por WhatsApp con este equipo ya seleccionado, o llámanos. Un ingeniero revisa tu solicitud y te envía la propuesta técnica.');
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); pie(doc, i, total, nota); }
  const slug = eq.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  doc.save(`Ficha-tecnica-${slug}-Equinox.pdf`);
}

// Plano de disposición general A3 (mismo dibujante que la skill planos-equinox)
export async function planoPDF({ id, cap, fecha }) {
  await prepararPDF();
  const { jsPDF } = window.jspdf;
  const { crearPlano, dibujarPlano } = await import('./planos.js');
  const plano = crearPlano(id, cap);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  doc.setProperties({ title: `${plano.codigo} · ${plano.eq.nombre}`, subject: 'Plano de disposición general (preliminar)', author: 'Industrias Equinox Colombia' });
  dibujarPlano(doc, plano, { logo: await imagen('assets/img/logo-equinox.png'), fecha });
  const slug = plano.eq.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  doc.save(`Plano-${plano.codigo}-${slug}.pdf`);
}

export async function plantaPDF({ nombre, litros, producto, area, equipos, isometrica, planta, avisos, fecha, cliente = null }) {
  await prepararPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const logo = await imagen('assets/img/logo-equinox.png');
  const W = 297;
  doc.setFillColor(...AZUL); doc.rect(0, 0, W, 26, 'F');
  doc.setFillColor(...BLANCO); doc.roundedRect(12, 5, 48, 16, 1.5, 1.5, 'F');
  const lw = 44, lh = (lw * logo.h) / logo.w; doc.addImage(logo.url, 'PNG', 14, 13 - lh / 2, lw, lh);
  doc.setTextColor(...BLANCO); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('PLANO PRELIMINAR DE PLANTA', W - 12, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(limpiar(`${nombre} · ${fecha}`), W - 12, 19.5, { align: 'right' });
  if (cliente) { doc.setTextColor(...ROJO); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(limpiar(`Preparado para ${cliente.empresa} · ${cliente.nombre}, ${cliente.cargo}`), 12, 30.2); }
  doc.addImage(isometrica, 'JPEG', 12, 32, 150, 100); doc.setDrawColor(...PAPEL); doc.rect(12, 32, 150, 100);
  doc.addImage(planta, 'JPEG', 168, 32, 117, 100); doc.rect(168, 32, 117, 100);
  doc.setTextColor(...GRIS); doc.setFontSize(7.5); doc.text('Vista 3D', 14, 136); doc.text('Vista en planta (desde arriba)', 170, 136);
  let y = 146;
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(limpiar(`${producto} · ${Number(litros).toLocaleString('es-CO')} litros por día · área aproximada ${area}`), 12, y);
  y += 7;
  const cols = [12, 26, 120, 175, 225];
  doc.setFillColor(...PAPEL); doc.rect(12, y - 4.5, 273, 7, 'F');
  doc.setFontSize(8); ['N.º', 'Equipo', 'Capacidad', 'Huella aprox.', 'Etapa'].forEach((h, i) => doc.text(h, cols[i] + 1, y));
  y += 6.5;
  doc.setFont('helvetica', 'normal');
  equipos.forEach((e, i) => {
    if (y > 196) { doc.addPage(); y = 20; }
    doc.setTextColor(...AZUL); doc.text(String(i + 1).padStart(2, '0'), cols[0] + 1, y); doc.text(limpiar(e.nombre), cols[1] + 1, y); doc.text(limpiar(e.capacidad), cols[2] + 1, y); doc.text(limpiar(e.huella), cols[3] + 1, y); doc.setTextColor(...GRIS); doc.text(limpiar(e.etapa), cols[4] + 1, y);
    doc.setDrawColor(...PAPEL); doc.line(12, y + 2, 285, y + 2); y += 5.6;
  });
  if (avisos.length) { y += 2; doc.setTextColor(...ROJO); doc.setFontSize(8); avisos.slice(0, 4).forEach((a) => { doc.text(`• ${limpiar(a)}`, 12, y); y += 4.4; }); }
  doc.addPage('a4', 'portrait');
  encabezadoCorto(doc, 'Plano preliminar de planta · Siguiente paso');
  let y2 = 28;
  y2 = titulo(doc, 'Qué sigue', y2);
  ['Un ingeniero de Equinox revisa este plano y tu volumen diario.', 'Agendamos una visita técnica para medir el espacio y las conexiones.', 'Recibes la propuesta técnica y económica con plazos de entrega por escrito.'].forEach((t, i) => { doc.setTextColor(...ROJO); doc.setFont('courier', 'bold'); doc.setFontSize(9.5); doc.text(String(i + 1).padStart(2, '0'), 14, y2); doc.setTextColor(...AZUL); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(limpiar(t), 24, y2); y2 += 8; });
  y2 = parrafo(doc, 'Este plano es preliminar: la ubicación, las tuberías y las medidas son orientativas y se confirman en la visita técnica. Las capacidades vienen del catálogo de Equinox; las huellas son aproximadas.', 14, y2 + 4, 182, 9, GRIS);
  const lista = equipos.map((e) => `${e.nombre} (${e.capacidad})`).join(', ');
  bloqueContacto(doc, 228, `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(limpiar(`Hola, Equinox. Armé mi planta de ${producto} para ${litros} L/día en la web: ${lista}`).slice(0, 600))}`, 'Escanea el código y envíanos tu planta por WhatsApp con la lista de equipos lista. Te respondemos con la propuesta técnica.');
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i === total) { pie(doc, i, total, 'Prototipo: plano preliminar, valores de muestra.'); continue; }
    doc.setDrawColor(...AZUL); doc.setLineWidth(0.3); doc.line(12, 200, 285, 200);
    doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(`Industrias Equinox Colombia · ${CONTACTO.web} · ${CONTACTO.telefono} · ${CONTACTO.correo}`, 12, 205);
    doc.text(`Página ${i} de ${total}`, 285, 205, { align: 'right' });
  }
  doc.save(`Plano-planta-${limpiar(producto).replace(/[^a-z0-9]+/gi, '-')}-Equinox.pdf`);
}


// ---------- Solicitud de cotización (robot y formulario de la portada) ----------
// Miniatura liviana (JPEG reducido sobre blanco) para que el PDF pese poco y se pueda mandar por WhatsApp
async function miniatura(url, ancho = 420) {
  const img = await cargarImg(url);
  const esc = Math.min(1, ancho / img.naturalWidth);
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * esc); c.height = Math.round(img.naturalHeight * esc);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  return { url: c.toDataURL('image/jpeg', 0.82), w: c.width, h: c.height };
}
// Bloque de datos con rótulo arriba (como en la ficha)
function bloqueDatos(doc, tituloBloque, filas, x, y, ancho) {
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(limpiar(tituloBloque), x, y);
  doc.setDrawColor(...AZUL); doc.setLineWidth(0.3); doc.line(x, y + 1.6, x + ancho, y + 1.6);
  let yy = y + 7;
  filas.filter(([, v]) => v).forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS); doc.text(limpiar(k).toUpperCase(), x, yy);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...AZUL);
    const l = doc.splitTextToSize(limpiar(v), ancho); doc.text(l, x, yy + 4.2);
    yy += 5.6 + l.length * 4;
  });
  return yy;
}

// sol: { folio, fecha, origen, tipo, producto, litros, alcance, departamento, municipio, plazo, nombre, empresa, celular, correo, nota, consulta, temas }
// items: [{ tag, nombre, linea, dato, resumen, datos: [[k, v]], img }]  → devuelve un Blob (no lo descarga)
// El QR del bloque de contacto lleva un mensaje corto con el folio (uno largo sale muy denso y cuesta escanearlo)
export async function solicitudPDF({ sol, items, textoWhatsApp }) {
  await prepararPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true }); // comprimido: viaja liviano por WhatsApp
  const logo = await imagen('assets/img/logo-equinox.png');
  const fecha = new Date(sol.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  // Página 1: quién, qué proyecto y qué equipos
  encabezado(doc, logo, 'SOLICITUD DE COTIZACIÓN', `${sol.folio} · ${fecha}`);
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(19);
  const tituloDoc = sol.producto && sol.producto !== 'Sin definir' ? `${sol.alcance === 'linea' ? 'Planta' : 'Equipos para'} ${sol.alcance === 'linea' ? 'de ' : ''}${sol.producto.charAt(0).toLowerCase()}${sol.producto.slice(1)}` : 'Equipos en acero inoxidable';
  const tl = doc.splitTextToSize(limpiar(tituloDoc), 132);
  doc.text(tl, 14, 43);
  let y = 43 + tl.length * 7.5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  const para = [sol.nombre, sol.empresa].filter(Boolean).join(' · ');
  doc.text(limpiar(`${para ? `Preparada para ${para} · ` : ''}enviada desde ${sol.origen === 'asistente' ? 'el asistente' : 'el formulario'} de la web`), 14, y);
  sello(doc, 'PARA COTIZAR', 162, 37);
  y += 9;
  const lugar = [sol.municipio, sol.departamento].filter(Boolean).join(', ');
  const yCliente = bloqueDatos(doc, 'Cliente', [['Nombre', sol.nombre], ['Empresa o finca', sol.empresa], ['Celular', sol.celular], ['Correo', sol.correo], ['Lugar', lugar]], 14, y, 84);
  const yProyecto = bloqueDatos(doc, 'Proyecto', [['Tipo', sol.tipo], ['Producto', sol.producto], ['Leche por día', sol.litros ? `${Number(sol.litros).toLocaleString('es-CO')} L` : 'Por definir'], ['Plazo', sol.plazo]], 112, y, 84);
  y = Math.max(yCliente, yProyecto) + 3;

  y = titulo(doc, sol.alcance === 'linea' ? 'Línea completa sugerida' : 'Equipos solicitados', y, 11);
  if (!items.length) {
    y = parrafo(doc, 'Sin equipos marcados: Equinox propone la línea según el producto y los litros diarios.', 14, y + 1, 182, 9.5) + 4;
  } else {
    const cols = [14, 24, 44, 136];
    doc.setFillColor(...PAPEL); doc.rect(14, y - 4, 182, 6.5, 'F');
    doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    ['N.º', 'Código', 'Equipo', 'Capacidad / cantidad'].forEach((h, i) => doc.text(h, cols[i] + 1, y));
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.8);
    items.forEach((e, i) => {
      doc.setTextColor(...ROJO); doc.text(String(i + 1).padStart(2, '0'), cols[0] + 1, y);
      doc.setTextColor(...AZUL); doc.text(limpiar(e.tag), cols[1] + 1, y);
      doc.text(doc.splitTextToSize(limpiar(e.nombre), 88)[0], cols[2] + 1, y);
      doc.text(doc.splitTextToSize(limpiar(e.dato || 'Por definir'), 58)[0], cols[3] + 1, y);
      doc.setDrawColor(...PAPEL); doc.line(14, y + 2, 196, y + 2);
      y += 6;
    });
    y += 2;
  }
  const extras = [['Nota del cliente', sol.nota], ['Consulta', sol.consulta], ['También quiere saber', (sol.temas || []).join(', ')]].filter(([, v]) => v);
  extras.forEach(([k, v]) => {
    doc.setTextColor(...GRIS); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text(limpiar(k).toUpperCase(), 14, y);
    y = parrafo(doc, v, 14, y + 4.2, 182, 9) + 3;
  });
  y = parrafo(doc, 'Capacidades orientativas, calculadas en la web con los litros diarios del cliente. Un ingeniero de Equinox confirma medidas, materiales, plazo y precio en la cotización formal.', 14, Math.max(y + 1, 0), 182, 7.8, GRIS);
  const yContacto = Math.max(y + 4, 228);
  if (yContacto + 50 > 282) { doc.addPage(); encabezadoCorto(doc, `Solicitud ${sol.folio}`); bloqueContacto(doc, 24, `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(`Hola, Equinox. Les escribo por la solicitud ${sol.folio}.`)}`, `Escríbenos con el folio ${sol.folio}: un asesor de Equinox tiene esta solicitud.`); }
  else bloqueContacto(doc, yContacto, `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(`Hola, Equinox. Les escribo por la solicitud ${sol.folio}.`)}`, `Escríbenos con el folio ${sol.folio}: un asesor de Equinox tiene esta solicitud.`);

  // Páginas siguientes: resumen técnico de cada equipo (imagen, descripción y datos principales de su ficha)
  if (items.length) {
    doc.addPage();
    encabezadoCorto(doc, `Solicitud ${sol.folio} · Resumen técnico de los equipos`);
    let yy = 24;
    for (const e of items) {
      const alto = 74;
      if (yy + alto > 280) { doc.addPage(); encabezadoCorto(doc, `Solicitud ${sol.folio} · Resumen técnico de los equipos`); yy = 24; }
      doc.setDrawColor(...PAPEL); doc.setLineWidth(0.4); doc.rect(14, yy, 182, alto - 4);
      if (e.img) {
        try {
          const m = await miniatura(e.img);
          const esc = Math.min(58 / m.w, 52 / m.h), w = m.w * esc, h = m.h * esc;
          doc.addImage(m.url, 'JPEG', 17 + (58 - w) / 2, yy + 3 + (52 - h) / 2, w, h);
        } catch { /* sin imagen: queda el recuadro */ }
      }
      doc.setFont('courier', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...ROJO);
      doc.text(limpiar(`${e.tag} · ${e.linea}`).toUpperCase(), 80, yy + 7);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...AZUL);
      const tn = doc.splitTextToSize(limpiar(e.nombre), 112); doc.text(tn, 80, yy + 13);
      let yr = parrafo(doc, e.resumen, 80, yy + 13 + tn.length * 5, 112, 8.2, GRIS) + 1.5;
      const filas = e.datos.slice(0, 6);
      filas.forEach(([k, v], i) => {
        const cx = 80 + (i % 2) * 58, cy = yr + Math.floor(i / 2) * 9.2;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRIS); doc.text(limpiar(k).toUpperCase(), cx, cy);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.6); doc.setTextColor(...AZUL); doc.text(doc.splitTextToSize(limpiar(v), 55)[0], cx, cy + 3.9);
      });
      yy += alto;
    }
  }
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); pie(doc, i, total, i === 1 ? 'Prototipo: datos técnicos de muestra; Equinox los confirma en la cotización formal.' : ''); }
  return doc.output('blob');
}
