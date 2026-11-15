import { campos, carreras, generos, fechaLimite, validar } from './datos.js';

const porId = (id) => document.getElementById(id);
const formulario = porId('formulario');
const guardar = porId('guardar');
const buscar = porId('buscar');
const actualizar = porId('actualizar');
const estadoTabla = porId('estado-tabla');
const estadoCaptcha = porId('estado-captcha');
const reintentarCaptcha = porId('reintentar-captcha');
const tocados = new Set();
const controles = new Map();
const atributos = {
  carne: { type: 'text', maxlength: 40, minlength: 8, placeholder: '20260001', autocapitalize: 'characters', spellcheck: 'false' },
  nombres: { type: 'text', autocomplete: 'given-name', maxlength: 100, placeholder: 'Ana María' },
  apellidos: { type: 'text', autocomplete: 'family-name', maxlength: 100, placeholder: 'López García' },
  correo: { type: 'email', autocomplete: 'email', maxlength: 254, placeholder: 'ana@ejemplo.com' },
  telefono: { type: 'tel', maxlength: 9, placeholder: '5555-1234' },
  fecha_nacimiento: { type: 'date', max: fechaLimite() }
};
const orden = ['carne', 'correo', 'nombres', 'apellidos', 'carrera', 'telefono', 'fecha_nacimiento', 'genero'];
const pistas = { carne: 'Mínimo 8 letras o números.', fecha_nacimiento: 'Edad mínima de 16 años.' };
let tokenCaptcha = '';
let widget;
let cargandoCaptcha = false;
let enviando = false;
let errorServidor = {};
let registros = [];
let tablaCargada = false;
let cargandoTabla = false;
let actualizarPendiente = false;
let pagina = 1;
const filasPorPagina = 12;

function elemento(etiqueta, texto, clase) {
  const nodo = document.createElement(etiqueta);
  if (texto) nodo.textContent = texto;
  if (clase) nodo.className = clase;
  return nodo;
}

function crearControl(campo) {
  if (campo === 'carrera') {
    const select = elemento('select', '', 'form-select');
    select.add(new Option('Selecciona una carrera', ''));
    for (const carrera of carreras) select.add(new Option(carrera, carrera));
    return select;
  }
  const input = elemento('input', '', 'form-control');
  for (const [nombre, valor] of Object.entries(atributos[campo])) input.setAttribute(nombre, valor);
  return input;
}

function crearCampo(campo) {
  const radio = campo === 'genero';
  const grupo = elemento(radio ? 'fieldset' : 'div', '', 'campo');
  const etiqueta = elemento(radio ? 'legend' : 'label', campos[campo]);
  if (!radio) etiqueta.htmlFor = campo;
  grupo.append(etiqueta);
  const error = elemento('p', '', 'error-campo');
  error.id = `error-${campo}`;
  error.hidden = true;
  const descripcion = pistas[campo] ? `pista-${campo} ${error.id}` : error.id;
  let entradas;
  if (radio) {
    const opciones = elemento('div', '', 'radios');
    entradas = generos.map((genero) => {
      const opcion = elemento('label', '', 'radio-opcion');
      const entrada = elemento('input');
      entrada.type = 'radio';
      entrada.value = genero;
      opcion.append(entrada, genero);
      opciones.append(opcion);
      return entrada;
    });
    grupo.append(opciones);
  } else {
    const entrada = crearControl(campo);
    entrada.id = campo;
    entradas = [entrada];
    grupo.append(entrada);
  }
  for (const entrada of entradas) {
    entrada.name = campo;
    entrada.required = true;
    entrada.setAttribute('aria-describedby', descripcion);
  }
  if (pistas[campo]) {
    const pista = elemento('p', pistas[campo], 'pista');
    pista.id = `pista-${campo}`;
    grupo.append(pista);
  }
  grupo.append(error);
  controles.set(campo, { entradas, error });
  return grupo;
}

for (const campo of orden) porId('campos').append(crearCampo(campo));
for (const etiqueta of Object.values(campos)) {
  const columna = elemento('th', etiqueta);
  columna.scope = 'col';
  porId('columnas').append(columna);
}

function revisarFormulario() {
  const resultado = validar(Object.fromEntries(new FormData(formulario)));
  for (const [campo, { entradas, error }] of controles) {
    const mensaje = tocados.has(campo) ? errorServidor[campo] || resultado.errores[campo] : '';
    error.textContent = mensaje || '';
    error.hidden = !mensaje;
    for (const entrada of entradas) {
      entrada.classList.toggle('is-invalid', Boolean(mensaje));
      if (mensaje) entrada.setAttribute('aria-invalid', 'true');
      else entrada.removeAttribute('aria-invalid');
    }
  }
  guardar.disabled = enviando || !tokenCaptcha || Boolean(Object.keys(resultado.errores).length || Object.keys(errorServidor).length);
  return resultado;
}

function mostrarMensaje(texto, error = false) {
  const mensaje = porId('estado-formulario');
  mensaje.textContent = texto;
  mensaje.hidden = !texto;
  mensaje.dataset.error = String(error);
}

function mostrarCaptcha(texto, reintentar = false) {
  estadoCaptcha.textContent = texto;
  estadoCaptcha.hidden = !texto;
  reintentarCaptcha.hidden = !reintentar;
}

function cargarScriptCaptcha() {
  if (window.grecaptcha?.render) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = elemento('script');
    const temporizador = setTimeout(fallar, 12000);
    function fallar() {
      clearTimeout(temporizador);
      script.remove();
      reject(new Error('No se pudo cargar la verificación.'));
    }
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit&hl=es-419&onload=recaptchaLista';
    script.async = true;
    script.onerror = fallar;
    window.recaptchaLista = () => {
      clearTimeout(temporizador);
      resolve();
    };
    document.head.append(script);
  });
}

async function iniciarCaptcha() {
  if (cargandoCaptcha) return;
  cargandoCaptcha = true;
  mostrarCaptcha('Cargando verificación…');
  try {
    if (widget !== undefined) {
      window.grecaptcha.reset(widget);
      mostrarCaptcha('');
      return;
    }
    const respuesta = await fetch('/api/config', { signal: AbortSignal.timeout(10000) });
    if (!respuesta.ok) throw new Error('No se pudo consultar la configuración de reCAPTCHA.');
    const { recaptchaSiteKey } = await respuesta.json();
    if (!recaptchaSiteKey) throw new Error('Falta configurar reCAPTCHA para habilitar el envío.');
    await cargarScriptCaptcha();
    widget = window.grecaptcha.render('captcha', {
      sitekey: recaptchaSiteKey,
      size: matchMedia('(max-width: 365px)').matches ? 'compact' : 'normal',
      callback(token) {
        tokenCaptcha = token;
        mostrarCaptcha('');
        revisarFormulario();
      },
      'expired-callback'() {
        tokenCaptcha = '';
        mostrarCaptcha('La verificación caducó. Marca la casilla de nuevo.');
        revisarFormulario();
      },
      'error-callback'() {
        tokenCaptcha = '';
        mostrarCaptcha('La verificación no está disponible.', true);
        revisarFormulario();
      }
    });
    mostrarCaptcha('');
  } catch (error) {
    mostrarCaptcha(error.message, true);
  } finally {
    cargandoCaptcha = false;
  }
}

formulario.addEventListener('input', (evento) => {
  const campo = evento.target.name;
  delete errorServidor[campo];
  revisarFormulario();
});
formulario.addEventListener('focusout', (evento) => {
  if (controles.has(evento.target.name)) tocados.add(evento.target.name);
  revisarFormulario();
});
reintentarCaptcha.addEventListener('click', iniciarCaptcha);

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const { valores } = revisarFormulario();
  if (guardar.disabled) return;
  enviando = true;
  const textoOriginal = guardar.innerHTML;
  guardar.textContent = 'Registrando…';
  revisarFormulario();
  mostrarMensaje('');
  try {
    const respuesta = await fetch('/api/estudiantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...valores, recaptchaToken: tokenCaptcha }),
      signal: AbortSignal.timeout(22000)
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      const camposActuales = validar(Object.fromEntries(new FormData(formulario))).valores;
      const erroresRecibidos = Object.entries(datos.errores ?? {}).filter(([campo]) => camposActuales[campo] === valores[campo]);
      errorServidor = Object.fromEntries(erroresRecibidos);
      for (const [campo] of erroresRecibidos) tocados.add(campo);
      revisarFormulario();
      controles.get(erroresRecibidos[0]?.[0])?.entradas[0].focus();
      throw new Error(datos.mensaje);
    }
    const valoresActuales = validar(Object.fromEntries(new FormData(formulario))).valores;
    if (Object.entries(valores).every(([campo, valor]) => valoresActuales[campo] === valor)) {
      formulario.reset();
      tocados.clear();
    }
    tablaCargada = false;
    if (!porId('consulta').hidden) {
      if (cargandoTabla) actualizarPendiente = true;
      else cargarTabla();
    }
    mostrarMensaje(`Estudiante registrado correctamente. Carné ${datos.estudiante.carne}.`);
  } catch (error) {
    mostrarMensaje(error.name === 'TimeoutError' ? 'La solicitud tardó demasiado. Consulta el directorio antes de reintentar.' : error.message, true);
  } finally {
    enviando = false;
    tokenCaptcha = '';
    if (widget !== undefined) window.grecaptcha.reset(widget);
    guardar.innerHTML = textoOriginal;
    revisarFormulario();
  }
});

const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-GT');
const fechaVisible = (valor) => String(valor).split('-').reverse().join('/');
function presentarTabla() {
  const consulta = normalizar(buscar.value).trim().split(/\s+/).filter(Boolean);
  const coincidencias = registros.filter((registro) => {
    const texto = normalizar([...Object.values(registro), fechaVisible(registro.fecha_nacimiento)].join(' '));
    return consulta.every((termino) => texto.includes(termino));
  });
  const paginas = Math.max(1, Math.ceil(coincidencias.length / filasPorPagina));
  pagina = Math.min(pagina, paginas);
  const filas = coincidencias.slice((pagina - 1) * filasPorPagina, pagina * filasPorPagina).map((registro) => {
    const fila = elemento('tr');
    for (const campo of Object.keys(campos)) {
      fila.append(elemento('td', campo === 'fecha_nacimiento' ? fechaVisible(registro[campo]) : String(registro[campo] ?? '')));
    }
    return fila;
  });
  if (!filas.length) {
    const fila = elemento('tr');
    const contenido = elemento('td', consulta.length ? 'No encontramos coincidencias.' : 'Todavía no hay estudiantes registrados.');
    contenido.colSpan = Object.keys(campos).length;
    fila.append(contenido);
    filas.push(fila);
  }
  porId('filas').replaceChildren(...filas);
  estadoTabla.textContent = consulta.length ? `${coincidencias.length} coincidencias de ${registros.length} registros` : `${registros.length} ${registros.length === 1 ? 'estudiante registrado' : 'estudiantes registrados'}`;
  porId('paginacion').hidden = paginas === 1;
  porId('pagina-actual').textContent = `Página ${pagina} de ${paginas}`;
  porId('anterior').disabled = pagina === 1;
  porId('siguiente').disabled = pagina === paginas;
}

async function cargarTabla() {
  if (cargandoTabla) return;
  cargandoTabla = true;
  actualizar.disabled = true;
  estadoTabla.textContent = 'Actualizando directorio…';
  const contenedor = porId('filas');
  contenedor.setAttribute('aria-busy', 'true');
  try {
    const nuevos = [];
    for (let numero = 1, totalPaginas = 1; numero <= totalPaginas; numero += 1) {
      const respuesta = await fetch(`/api/estudiantes?pagina=${numero}`, { signal: AbortSignal.timeout(14000) });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje);
      if (numero === 1) totalPaginas = Math.ceil(datos.total / datos.limite);
      nuevos.push(...datos.estudiantes);
    }
    registros = [...new Map(nuevos.map((registro) => [registro.carne, registro])).values()];
    tablaCargada = true;
    pagina = 1;
    presentarTabla();
  } catch (error) {
    const mensaje = error.name === 'TimeoutError' ? 'La consulta tardó demasiado. Intenta actualizar otra vez.' : error.message;
    estadoTabla.textContent = tablaCargada ? `${mensaje} Se muestran los últimos registros disponibles.` : mensaje;
  } finally {
    contenedor.removeAttribute('aria-busy');
    actualizar.disabled = false;
    cargandoTabla = false;
    if (actualizarPendiente) {
      actualizarPendiente = false;
      cargarTabla();
    }
  }
}

buscar.addEventListener('input', () => {
  pagina = 1;
  if (tablaCargada) presentarTabla();
});
actualizar.addEventListener('click', cargarTabla);
porId('anterior').addEventListener('click', () => { pagina -= 1; presentarTabla(); });
porId('siguiente').addEventListener('click', () => { pagina += 1; presentarTabla(); });

function navegar(enfocar = false) {
  const consulta = location.hash === '#consulta';
  porId('consulta').hidden = !consulta;
  porId('registro').hidden = consulta;
  for (const enlace of document.querySelectorAll('nav a')) {
    if (enlace.hash === (consulta ? '#consulta' : '#registro')) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  }
  if (consulta && !tablaCargada) cargarTabla();
  if (!consulta && widget === undefined && reintentarCaptcha.hidden) iniciarCaptcha();
  if (enfocar) {
    porId(consulta ? 'titulo-consulta' : 'titulo-registro').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', () => navegar(true));
navegar();
