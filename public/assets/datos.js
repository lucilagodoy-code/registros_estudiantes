export const carreras = [
  'Ingeniería en Sistemas',
  'Ingeniería Industrial',
  'Administración de Empresas',
  'Contaduría Pública',
  'Psicología',
  'Ingeniería Civil'
];

export const generos = ['Masculino', 'Femenino', 'Otro'];

export const campos = {
  carne: 'Carné',
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  correo: 'Correo',
  carrera: 'Carrera',
  telefono: 'Teléfono',
  fecha_nacimiento: 'Fecha de nacimiento',
  genero: 'Género'
};

export function fechaLimite(hoy = new Date()) {
  const partes = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(hoy);
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  const anio = Number(valores.year) - 16;
  const ultimoDia = new Date(Date.UTC(anio, Number(valores.month), 0)).getUTCDate();
  const dia = String(Math.min(Number(valores.day), ultimoDia)).padStart(2, '0');
  return `${anio}-${valores.month}-${dia}`;
}

export function validar(datos, hoy = new Date()) {
  const valores = Object.fromEntries(Object.keys(campos).map((campo) => {
    const valor = datos?.[campo];
    return [campo, typeof valor === 'string' ? valor.normalize('NFC').trim() : ''];
  }));
  const errores = {};
  if (!/^[A-Za-z0-9]{8,40}$/.test(valores.carne)) {
    errores.carne = 'Escribe de 8 a 40 letras o números, sin espacios ni guiones.';
  }
  for (const campo of ['nombres', 'apellidos']) {
    if (!/^\p{L}[\p{L}\p{M}]*(?: +\p{L}[\p{L}\p{M}]*)*$/u.test(valores[campo]) || valores[campo].length > 100) {
      errores[campo] = 'Usa únicamente letras y espacios.';
    }
  }
  const [usuarioCorreo, dominioCorreo, ...partesExtra] = valores.correo.split('@');
  const parteLocal = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
  const dominio = /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
  if (valores.correo.length > 254 || usuarioCorreo.length > 64 || !dominioCorreo ||
      partesExtra.length || !parteLocal.test(usuarioCorreo) || !dominio.test(dominioCorreo)) {
    errores.correo = 'Ingresa un correo válido, por ejemplo, ana@ejemplo.com.';
  }
  if (!carreras.includes(valores.carrera)) errores.carrera = 'Selecciona una carrera.';
  if (!/^\d{4}-\d{4}$/.test(valores.telefono)) errores.telefono = 'Usa el formato 5555-1234.';
  const fecha = valores.fecha_nacimiento;
  const fechaParseada = new Date(`${fecha}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha.startsWith('0000-') ||
      Number.isNaN(fechaParseada.getTime()) || fechaParseada.toISOString().slice(0, 10) !== fecha) {
    errores.fecha_nacimiento = 'Ingresa una fecha válida.';
  } else if (fecha > fechaLimite(hoy)) {
    errores.fecha_nacimiento = 'El estudiante debe tener al menos 16 años.';
  }
  if (!generos.includes(valores.genero)) errores.genero = 'Selecciona una opción.';
  if (!errores.carne) valores.carne = valores.carne.toUpperCase();
  return { valores, errores };
}
