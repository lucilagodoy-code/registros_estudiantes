import { campos, validar } from '../public/assets/datos.js';

const columnas = Object.keys(campos).join(',');
const limite = 100;
const respuesta = (datos, status = 200) => Response.json(datos, {
  status,
  headers: { 'Cache-Control': 'no-store' }
});

async function consultar(url, headers, request) {
  const paginaSolicitada = Number(new URL(request.url).searchParams.get('pagina') ?? '1');
  if (!Number.isSafeInteger(paginaSolicitada) || paginaSolicitada < 1 || paginaSolicitada > 1000000) {
    return respuesta({ mensaje: 'La página indicada es inválida.' }, 400);
  }
  url.searchParams.set('order', 'carne.asc');
  url.searchParams.set('limit', String(limite));
  url.searchParams.set('offset', String((paginaSolicitada - 1) * limite));
  headers.set('Prefer', 'count=exact');
  const consulta = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!consulta.ok) return respuesta({ mensaje: 'No se pudo consultar el registro.' }, 502);
  const total = Number(consulta.headers.get('content-range')?.split('/').at(-1));
  if (!Number.isSafeInteger(total)) return respuesta({ mensaje: 'No se pudo obtener el total.' }, 502);
  return respuesta({ estudiantes: await consulta.json(), total, pagina: paginaSolicitada, limite });
}

async function guardar(url, headers, request) {
  const tipo = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (tipo !== 'application/json') return respuesta({ mensaje: 'Envía JSON con Content-Type: application/json.' }, 415);
  let datos;
  try {
    const cuerpo = await request.text();
    if (Buffer.byteLength(cuerpo) > 16384) return respuesta({ mensaje: 'La solicitud es demasiado grande.' }, 413);
    datos = JSON.parse(cuerpo);
  } catch {
    return respuesta({ mensaje: 'El cuerpo debe ser JSON válido.' }, 400);
  }
  const { valores, errores } = validar(datos);
  if (Object.keys(errores).length) return respuesta({ mensaje: 'Revisa los campos indicados.', errores }, 422);
  const token = datos?.recaptchaToken;
  if (typeof token !== 'string' || !token.trim() || token.length > 8192) {
    return respuesta({ mensaje: 'Completa la verificación reCAPTCHA.' }, 422);
  }

  const secreto = process.env.RECAPTCHA_SECRET_KEY;
  const dominios = (process.env.RECAPTCHA_HOSTNAMES ?? '').split(',').map((dominio) => dominio.trim().toLowerCase()).filter(Boolean);
  if (!secreto || !dominios.length) return respuesta({ mensaje: 'Falta configurar reCAPTCHA en el servidor.' }, 503);
  const verificacion = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: secreto, response: token }),
    signal: AbortSignal.timeout(8000)
  });
  if (!verificacion.ok) return respuesta({ mensaje: 'Google reCAPTCHA no respondió correctamente.' }, 502);
  const captcha = await verificacion.json();
  const dominio = String(captcha.hostname ?? '').toLowerCase();
  if (!captcha.success || !dominios.includes(dominio)) {
    return respuesta({ mensaje: 'La verificación reCAPTCHA falló o caducó. Inténtala de nuevo.' }, 422);
  }

  headers.set('Content-Type', 'application/json');
  headers.set('Prefer', 'return=representation');
  const insercion = await fetch(url, {
    method: 'POST', headers, body: JSON.stringify(valores), signal: AbortSignal.timeout(10000)
  });
  if (insercion.status === 409) return respuesta({ mensaje: 'Ese carné ya está registrado.', errores: { carne: 'Ese carné ya está registrado.' } }, 409);
  if (!insercion.ok) return respuesta({ mensaje: 'No se pudo guardar el estudiante. Consulta el listado antes de reintentar.' }, 502);
  const [estudiante] = await insercion.json();
  return respuesta({ mensaje: 'Estudiante registrado correctamente.', estudiante }, 201);
}

async function manejar(request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (!['GET', 'POST'].includes(request.method)) {
    const resultado = respuesta({ mensaje: 'Método no permitido.' }, 405);
    resultado.headers.set('Allow', 'GET, POST, OPTIONS');
    return resultado;
  }
  const base = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!base || !clave) return respuesta({ mensaje: 'Falta configurar la conexión a Supabase.' }, 503);
  const url = new URL('/rest/v1/estudiantes', base);
  url.searchParams.set('select', columnas);
  const headers = new Headers({ apikey: clave });
  if (!clave.startsWith('sb_secret_')) headers.set('Authorization', `Bearer ${clave}`);
  return request.method === 'GET' ? consultar(url, headers, request) : guardar(url, headers, request);
}

async function handler(request) {
  let resultado;
  try {
    resultado = await manejar(request);
  } catch {
    resultado = respuesta({ mensaje: 'El servicio no está disponible en este momento.' }, 502);
  }
  const origen = request.headers.get('origin');
  const permitidos = (process.env.CORS_ORIGINS ?? '').split(',').map((valor) => valor.trim());
  resultado.headers.set('Vary', 'Origin');
  if (origen && permitidos.includes(origen)) {
    resultado.headers.set('Access-Control-Allow-Origin', origen);
    resultado.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    resultado.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  return resultado;
}

export default { fetch: handler };
