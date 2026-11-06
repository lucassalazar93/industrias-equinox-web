// Intérprete del texto libre del asistente. No es inteligencia artificial: reconoce palabras clave
// (productos, equipos, litros, temas como precio o garantía, saludos, groserías y texto sin sentido)
// para que el asistente conteste amable y vuelva a encaminar la conversación.
// Funciones puras, sin DOM: se pueden probar con Node (ver LEEME).

// Minúsculas, sin tildes ni signos raros (la ñ queda como n)
export const normalizar = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9?¿.,\s]/g, ' ').replace(/\s+/g, ' ').trim();

const hay = (n, re) => re.test(n);

// ---------- productos (ids de APLICACIONES) ----------
const PRODUCTOS = [
  ['costeno', /\bcosten[oa]s?\b/],
  ['mozzarella', /\b(mo[sz]+a?r+e?l+a|mozarel+a|pasta hilada|quesillo|doble crema|hilad[oa]s?)\b/],
  ['campesino', /\b(campesino|queso fresco|cuajada|queso blanco|queso de mano|quesito)\b/],
  ['fermentados', /\b(yogu?rt?s?|yogures|kumis+|fermentad\w*|bebida lactea|avena)\b/],
  ['pasteurizada', /\b(leche pasteurizada|pasteurizar leche|envasar leche|leche en bolsa|ultrapasteuriz\w*)\b/],
  ['acopio', /\b(acopio|centro de acopio|ordeno|ordenar|enfriar (la )?leche|lecheria)\b/],
  ['mantequilla', /\b(mantequilla|arequipe|dulce de leche|manjar|crema de leche)\b/],
];

// ---------- equipos (ids de EQUIPOS) ----------
const EQUIPOS_TXT = [
  ['enfriamiento', /\b(tanques? (de )?enfriamiento|tanques? de frio|enfriador(es)?|tanque enfriador)\b/],
  ['almacenamiento', /\b(silos?|tanques? de almacenamiento)\b/],
  ['pasteurizador', /\b(pasteurizador\w*|intercambiador\w*)\b/],
  ['marmitaVolcable', /\bmarmitas? volcables?\b/],
  ['marmitaMulti', /\bmarmitas?\b/],
  ['mezcla', /\btanques? de mezcla\b/],
  ['fermentacion', /\b(fermentador\w*|tanques? de fermentacion|incubador\w*)\b/],
  ['polivalente', /\btinas? polivalentes?\b/],
  ['tina', /\b(tinas?|cubas?)\b/],
  ['hiladora', /\bhilador\w*\b/],
  ['formadora', /\b(formadora\w*|moldeadora\w*)\b/],
  ['prensa', /\bprensas?\b/],
  ['moldes', /\bmoldes?\b/],
  ['carro', /\b(carros?|escabiladero\w*)\b/],
  ['mantequillera', /\b(mantequillera\w*|batidora\w*)\b/],
  ['meson', /\b(meson(es)?|mesas?)\b/],
  ['canastilla', /\b(canastillas?|canastas?)\b/],
];

// ---------- temas que el asistente sabe contestar a grandes rasgos ----------
export const TEMAS = {
  precio: { re: /\b(precios?|cuanto (vale|valen|cuesta|cuestan|sale|salen|cobran)|valor|costos?|cuesta|cuestan|barato|caro|tarifa)\b/, etiqueta: 'el precio' },
  plazo: { re: /\b(cuanto (tarda|tardan|demora|demoran)|tiempo de entrega|plazos?|demora|tardan|cuando (lo|me) entregan)\b/, etiqueta: 'el plazo de entrega' },
  garantia: { re: /\bgarantias?\b/, etiqueta: 'la garantía' },
  servicio: { re: /\b(mantenimiento|repuestos?|reparacion|reparar|servicio tecnico|soporte|arreglo|danad[oa]|averia)\b/, etiqueta: 'mantenimiento y repuestos' },
  ubicacion: { re: /\b(donde (estan|quedan|queda|son|los encuentro)|direccion|ubicacion|ubicados|sede|oficinas?|taller|visita\w*|ir a verlos)\b/, etiqueta: 'una visita técnica' },
  pago: { re: /\b(pagos?|pagar|credito|financ\w*|cuotas|anticipo|contado|formas de pago)\b/, etiqueta: 'las formas de pago' },
  cobertura: { re: /\b(instalan|instalacion|envian|envio|envios|despach\w*|transporte|llegan a|fuera de antioquia|todo el pais)\b/, etiqueta: 'la instalación y el envío' },
  material: { re: /\b(acero|inoxidable|inox|304|316|calibre|material(es)?)\b/, etiqueta: 'el material' },
  medida: { re: /\b(a la medida|personaliz\w*|a mi medida|diseno propio)\b/, etiqueta: 'fabricación a la medida' },
};

// ---------- intención ----------
const INTENCION = [
  ['humano', /\b(asesor(a|es)?|vendedor(a)?|humano|persona real|una persona|alguien|hablar con|llam(ar|en|ada|enme)|telefono|celular|numero de contacto)\b/],
  ['ver', /\b(ver (la |una |el )?(planta|recorrido|simulacion)|recorrido|3d|funcionando|simulacion|demo)\b/],
  ['cotizar', /\b(cotiz\w*|presupuesto|comprar|compra|adquirir|necesito (un|una|unos|unas)|quiero (un|una|unos|unas)|precios?|cuanto (vale|cuesta))\b/],
  ['asesoria', /\b(asesoria|asesorar|consejo|orientacion|orientar|montar|empezar|emprend\w*|proyecto|ayuda con mi|mejorar mi)\b/],
];

const OFENSIVO = /\b(hijueputa|hp|jueputa|malparid[oa]|gonorrea|puta|puto|mierda|idiota|estupid[oa]|imbecil|marica|pendej[oa]|huevon|careverga|verga|basura|inutil|ladron(es)?|estafa\w*)\b/;
const SALUDO = /^(hola+|holi|ola|hey|saludos|buen(os|as)? (dia|dias|tardes|noches)|buenas|que (mas|tal)|q mas|alo)\b/;
const GRACIAS = /\b(gracias|muy amable|te agradezco|que amable)\b/;
const DESPEDIDA = /\b(chao|adios|hasta luego|hasta pronto|nos vemos|bye)\b/;
const AFIRMA = /^(si+|claro|ok|okay|okey|vale|dale|listo|de una|correcto|perfecto|exacto|bueno|va|asi es|eso)\b/;
const NIEGA = /^(no+|nop|nel|para nada|ahora no|todavia no|despues|luego|mas tarde)\b/;
const NO_SE = /\b(no se|ni idea|no estoy segur[oa]|no tengo claro|no lo se|aun no se|todavia no se|no sabria|depende)\b/;
const OMITIR = /\b(omitir|omite|saltar|salta|prefiero no|no quiero (decir|dar)|siguiente|paso)\b/;
const RISA = /^(ja|je|ji|jsj|xd|lol)+\b/;
// Alcance de la cotización: toda la línea o solo algunos equipos
const TODO = /\b(toda|todo|todos|todas|completa|completo|entera)\b/;
const SOLO = /\b(solo|sola|solamente|unicamente|nada mas|un equipo|algunos|algunas|ciertos)\b/;
const COMO_ESTAS = /\b(como (estas|esta|vas|va todo|te va)|que tal (estas|todo)|todo bien)\b/;
const FUERA = /\b(chistes?|cuentame|cancion|canta\w*|clima|lluvia|que hora|hora es|futbol|partido|politic\w*|president\w*|novi[oa]s?|amor|tu edad|cuantos anos|que haces|aburrid\w*|juegos?|jugar|receta\w*|pelicula\w*|musica)\b/;
const SOBRE_BOT = /\b(eres (un |una )?(robot|bot|humano|persona|ia|maquina|real)|inteligencia artificial|chatgpt|quien eres|que eres)\b/;
const INTERROGATIVA = /^(¿)?\s*(que|como|cuanto|cuantos|cuantas|cuando|donde|cual|cuales|quien|tienen|hacen|venden|fabrican|pueden|hay|manejan|trabajan|es posible|se puede)\b/;
const DEL_TEMA = /\b(leche|queso|quesos|lacteo\w*|planta|plantas|equipo\w*|maquin\w*|tanque\w*|acero|inox\w*|fabric\w*|produc\w*|litros?|cotiz\w*|equinox|proceso|linea)\b/;

// ---------- litros ----------
const UNIDADES = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };
// exigirUnidad: fuera de la pregunta de litros solo se toma un número que diga "litros" (o "L")
export function litrosDe(n, exigirUnidad = true) {
  const conUnidad = /(litros?|lts?\b|\bl\b|\blt\b|l\/dia|l al dia)/.test(n);
  if (exigirUnidad && !conUnidad) return null;
  let v = null;
  const m = n.match(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(mil|k)?/);
  if (m) {
    const crudo = m[1];
    const miles = /^\d{1,3}([.,]\d{3})+$/.test(crudo);
    v = miles ? Number(crudo.replace(/[.,]/g, '')) : Number(crudo.replace(',', '.'));
    if (m[2]) v *= 1000;
  } else {
    const w = n.match(/\b(?:(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta|cuarenta|cincuenta|cien|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos)\s+)?(mil)\b/)
      || n.match(/\b(cien|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos)\b/);
    if (w) v = w[2] === 'mil' ? (UNIDADES[w[1]] || 1) * 1000 : UNIDADES[w[1]];
  }
  return v && v >= 20 && v <= 1000000 ? Math.round(v) : null;
}

// Cualquier número del texto (capacidades, pistones, cantidades): "2.000", "3 mil", "4", "veinte"
export function numeroDe(n) {
  const v = litrosDe(n, false);
  if (v) return v;
  const m = n.match(/\b(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\b/);
  if (m) { const x = /^\d{1,3}([.,]\d{3})+$/.test(m[1]) ? Number(m[1].replace(/[.,]/g, '')) : Number(m[1].replace(',', '.')); return x > 0 ? x : null; }
  const w = n.match(/\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta|cuarenta|cincuenta|cien)\b/);
  return w ? UNIDADES[w[1]] : null;
}

// ---------- nombre y empresa ("soy Ana Gómez de Lácteos La Cima") ----------
export function presentacionDe(original) {
  const m = String(original).match(/\b(?:soy|me llamo|mi nombre es|les habla|te habla|habla)\s+(.+)/i);
  if (!m) return null;
  const [nombre, empresa] = m[1].split(/\s+(?:de la empresa|de|del|desde|y trabajo en|en)\s+|,\s*/i);
  const limpio = (t) => (t || '').replace(/[.!?¿¡]+$/g, '').trim();
  const n = limpio(nombre).split(/\s+/).slice(0, 4).join(' ');
  return n && !esSinSentido(normalizar(n)) && /[a-záéíóúñ]/i.test(n) ? { nombre: n, empresa: limpio(empresa) } : null;
}

// ---------- texto sin sentido ("asdfgh", "xxxxx", solo emojis) ----------
const TECLADO = /(asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|rtyu|tyui|zxcv|xcvb|cvbn|vbnm|jklñ|qaz|wsx|edc)/;
export function esSinSentido(n) {
  const palabras = n.replace(/[?¿.,]/g, ' ').split(/\s+/).filter(Boolean);
  if (!palabras.length) return true;
  const rara = (p) => p.length >= 3 && (TECLADO.test(p) || /(.)\1{3,}/.test(p) || /[bcdfghjklmnpqrstvwxyz]{5,}/.test(p) || (p.length >= 4 && !/[aeiou]/.test(p) && !/^\d+$/.test(p)));
  const raras = palabras.filter(rara).length;
  return raras > 0 && raras >= palabras.length / 2;
}

// Lo que se pudo entender de un mensaje libre
export function entender(original) {
  const n = normalizar(original);
  const r = {
    original: String(original).trim(), n,
    vacio: !/[a-z0-9]/.test(n),
    ofensivo: hay(n, OFENSIVO),
    saludo: hay(n, SALUDO), gracias: hay(n, GRACIAS), despedida: hay(n, DESPEDIDA),
    afirma: hay(n, AFIRMA), niega: hay(n, NIEGA), noSe: hay(n, NO_SE), omitir: hay(n, OMITIR), risa: hay(n, RISA),
    sobreBot: hay(n, SOBRE_BOT), comoEstas: hay(n, COMO_ESTAS), fueraDeTema: hay(n, FUERA),
    todo: hay(n, TODO), solo: hay(n, SOLO), numero: numeroDe(n),
    pregunta: /[?¿]/.test(original) || hay(n, INTERROGATIVA),
    delTema: hay(n, DEL_TEMA),
    apl: (PRODUCTOS.find(([, re]) => re.test(n)) || [])[0] || null,
    quesoSinTipo: /\bquesos?\b/.test(n),
    equipos: EQUIPOS_TXT.filter(([, re]) => re.test(n)).map(([id]) => id),
    temas: Object.entries(TEMAS).filter(([, t]) => t.re.test(n)).map(([id]) => id),
    intencion: (INTENCION.find(([, re]) => re.test(n)) || [])[0] || null,
    litros: litrosDe(n, true),
    litrosSueltos: litrosDe(n, false),
    presentacion: presentacionDe(original),
  };
  // "tina" y "marmita" dentro de "tina polivalente" / "marmita volcable" no se repiten
  if (r.equipos.includes('polivalente')) r.equipos = r.equipos.filter((e) => e !== 'tina');
  if (r.equipos.includes('marmitaVolcable')) r.equipos = r.equipos.filter((e) => e !== 'marmitaMulti');
  if (r.apl) r.quesoSinTipo = false;
  r.sinSentido = !r.vacio && esSinSentido(n) && !r.apl && !r.equipos.length && !r.temas.length && !r.litros;
  r.delTema = r.delTema || !!(r.apl || r.equipos.length || r.temas.length || r.litros);
  if (r.delTema) r.fueraDeTema = false;
  return r;
}

// ¿Parece un nombre de persona o de lugar? (para no guardar "hola" o "cuánto cuesta" como nombre)
export function pareceNombre(a) {
  const palabras = a.n.split(/\s+/).filter(Boolean);
  return !a.vacio && !a.sinSentido && !a.pregunta && !a.ofensivo && !a.saludo && !a.gracias && !a.despedida
    && !a.afirma && !a.niega && !a.noSe && !a.omitir && !a.risa && !a.sobreBot && !a.comoEstas && !a.fueraDeTema
    && !a.temas.length && !a.intencion && !a.apl && !a.equipos.length && !a.litros && !a.quesoSinTipo && !/\d{3,}/.test(a.n)
    && palabras.length >= 1 && palabras.length <= 8 && /[a-z]{2,}/.test(a.n);
}
