// Datos del interesado: se piden antes de descargar el plano o el video de la planta,
// para que Equinox pueda hacerle seguimiento.
// En el prototipo quedan en este navegador (localStorage 'eqx-interesados'); en la versión real
// se envían al CRM o al correo de ventas antes de entregar la descarga.
const CLAVE_PERFIL = 'eqx-interesado';
const CLAVE_LISTA = 'eqx-interesados';
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

const CAMPOS = [
  { id: 'empresa', etiqueta: 'Empresa', auto: 'organization', requerido: true },
  { id: 'nombre', etiqueta: 'Nombre y apellido', auto: 'name', requerido: true },
  { id: 'cargo', etiqueta: 'Cargo', auto: 'organization-title', requerido: true, ayuda: 'Ej.: gerente, jefe de planta' },
  { id: 'celular', etiqueta: 'Celular o WhatsApp', auto: 'tel', tipo: 'tel', requerido: true, modo: 'tel' },
  { id: 'correo', etiqueta: 'Correo', auto: 'email', tipo: 'email', requerido: false },
];

let dialogo = null;
function crear() {
  dialogo = document.createElement('dialog');
  dialogo.className = 'datos-cliente';
  dialogo.dataset.clarityMask = 'true';
  dialogo.setAttribute('aria-labelledby', 'datos-cliente-titulo');
  dialogo.innerHTML = `
    <form method="dialog" novalidate>
      <h2 id="datos-cliente-titulo">Antes de descargar</h2>
      <p class="datos-cliente__texto" data-dc-texto></p>
      <div class="datos-cliente__campos">
        ${CAMPOS.map((c) => `<label class="campo${c.id === 'empresa' || c.id === 'correo' ? ' campo--ancho' : ''}" for="dc-${c.id}">
          <span>${c.etiqueta}${c.requerido ? '' : ' <small>(opcional)</small>'}</span>
          <input id="dc-${c.id}" name="${c.id}" type="${c.tipo || 'text'}" autocomplete="${c.auto}" ${c.modo ? `inputmode="${c.modo}"` : ''} ${c.requerido ? 'required' : ''} ${c.ayuda ? `placeholder="${c.ayuda}"` : ''}>
        </label>`).join('')}
      </div>
      <label class="datos-cliente__permiso"><input type="checkbox" name="permiso" required> <span>Autorizo a Industrias Equinox Colombia a usar estos datos para contactarme sobre esta solicitud, conforme a la Ley 1581 de 2012.</span></label>
      <p class="datos-cliente__error" data-dc-error role="alert" hidden></p>
      <div class="datos-cliente__acciones">
        <button class="btn" type="submit" value="enviar"><span data-dc-boton>Descargar</span> <span class="btn__ico"><svg aria-hidden="true"><use href="assets/img/iconos.svg#i-download-simple"/></svg></span></button>
        <button class="btn btn--claro" type="button" data-dc-cancelar>Cancelar</button>
      </div>
      <p class="datos-cliente__nota">Prototipo: los datos quedan solo en este navegador. En el sitio real llegan al equipo de ventas de Equinox.</p>
    </form>`;
  document.body.appendChild(dialogo);
  dialogo.querySelector('[data-dc-cancelar]').addEventListener('click', () => dialogo.close('cancelar'));
  return dialogo;
}

export const perfilGuardado = () => leer(CLAVE_PERFIL, null);

// Abre el formulario y devuelve los datos (o null si la persona cancela).
// motivo: texto corto de lo que descarga ("el plano de tu planta", "el video del recorrido").
// detalle: resumen de la planta que se guarda junto al registro.
export function pedirDatos({ motivo = 'la descarga', boton = 'Descargar', detalle = null, origen = 'planta' } = {}) {
  const d = dialogo || crear();
  const form = d.querySelector('form');
  const error = d.querySelector('[data-dc-error]');
  const perfil = perfilGuardado() || {};
  CAMPOS.forEach((c) => { form.elements[c.id].value = perfil[c.id] || ''; form.elements[c.id].removeAttribute('aria-invalid'); });
  form.elements.permiso.checked = !!perfil.permiso;
  d.querySelector('[data-dc-texto]').textContent = `Déjanos los datos de tu empresa para preparar ${motivo} a su nombre. Un asesor de Equinox te contacta solo por esta solicitud.`;
  d.querySelector('[data-dc-boton]').textContent = boton;
  error.hidden = true;

  return new Promise((resolver) => {
    const alEnviar = (e) => {
      e.preventDefault();
      const datos = Object.fromEntries(CAMPOS.map((c) => [c.id, form.elements[c.id].value.trim()]));
      const faltan = CAMPOS.filter((c) => c.requerido && !datos[c.id]);
      const telMalo = datos.celular && datos.celular.replace(/\D/g, '').length < 7;
      const correoMalo = datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo);
      CAMPOS.forEach((c) => form.elements[c.id].toggleAttribute('aria-invalid', faltan.includes(c) || (c.id === 'celular' && telMalo) || (c.id === 'correo' && correoMalo)));
      let msg = '';
      if (faltan.length) msg = `Completa: ${faltan.map((c) => c.etiqueta.toLowerCase()).join(', ')}.`;
      else if (telMalo) msg = 'Revisa el celular: debe tener al menos 7 dígitos.';
      else if (correoMalo) msg = 'Revisa el correo: parece incompleto.';
      else if (!form.elements.permiso.checked) msg = 'Para continuar, marca la autorización de uso de datos.';
      if (msg) { error.textContent = msg; error.hidden = false; (form.querySelector('[aria-invalid]') || form.elements.permiso).focus(); return; }
      const registro = { ...datos, permiso: true };
      guardar(CLAVE_PERFIL, registro);
      const lista = leer(CLAVE_LISTA, []);
      lista.push({ ...registro, descarga: motivo, origen, detalle, fecha: new Date().toISOString() });
      guardar(CLAVE_LISTA, lista);
      terminar(registro);
      d.close('enviado');
    };
    const alCerrar = () => terminar(null);
    function terminar(valor) {
      form.removeEventListener('submit', alEnviar);
      d.removeEventListener('close', alCerrar);
      resolver(valor);
    }
    form.addEventListener('submit', alEnviar);
    d.addEventListener('close', alCerrar, { once: true });
    d.showModal();
    (CAMPOS.map((c) => form.elements[c.id]).find((el) => !el.value) || form.querySelector('[type=submit]')).focus();
  });
}
