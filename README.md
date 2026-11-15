# Reg-Estudiantes GT

Aplicación académica para registrar estudiantes y consultar las ocho columnas guardadas. Se abre por enlace, sin inicio de sesión. La vista **Consulta** incluye búsqueda por cualquier campo, paginación y el botón **Actualizar** para volver a leer la base de datos.

El directorio y su GET son accesibles para cualquiera que conozca o encuentre la URL. reCAPTCHA protege el envío del formulario. Para una demo académica utiliza datos ficticios.

## Herramientas

| Herramienta | Uso |
| --- | --- |
| VS Code y Node.js 24.x | Edición y ejecución local |
| HTML, CSS, JavaScript y Bootstrap 5.3 | Interfaz adaptable de registro y consulta |
| Vercel Functions | API HTTP en la nube |
| Supabase (PostgreSQL y Data API) | Almacenamiento de los ocho campos |
| Google reCAPTCHA v2 | Casilla «No soy un robot» y verificación en el servidor |
| Postman | Pruebas manuales de la API |

Para una entrega personal y no comercial, puedes usar Vercel Hobby y Supabase Free, según sus límites. Supabase puede pausar proyectos gratuitos de baja actividad. Comprueba el estado antes de la exposición.

### Archivos

- `public/index.html` contiene las vistas de registro y consulta.
- `public/assets/` contiene estilos, comportamiento y validación compartida.
- `api/estudiantes.js` contiene GET, POST y el manejo de CORS.
- `api/config.js` entrega al navegador exclusivamente la clave pública de reCAPTCHA.
- `supabase/schema.sql` crea la tabla y configura los permisos.
- `lib/local.js` ejecuta la web y la misma API en tu computadora.
- `vercel.json` configura la publicación de archivos estáticos y cabeceras.

## 1. Configura Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. Abre **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y selecciona **Run**.
3. Copia la **Project URL** desde **Connect** o la configuración de la Data API. Tiene la forma `https://referencia.supabase.co`.
4. En **Settings → API Keys**, crea o copia una clave **Secret** que empieza con `sb_secret_`. Solo Vercel y tu servidor local deben usarla.

El carné se guarda en mayúsculas y es la clave primaria. Si se envía nuevamente el mismo carné, la API devuelve `409`. La tabla tiene RLS y la función del servidor accede con la clave secreta. El navegador usa únicamente la API de la aplicación.

## 2. Configura reCAPTCHA v2

1. Abre la [consola de reCAPTCHA](https://www.google.com/recaptcha/admin/create) y registra un sitio de tipo **Desafío (v2) → Casilla «No soy un robot»**.
2. Para el entorno local agrega `localhost` a los dominios. Para la nube añade el dominio exacto de producción que indique Vercel, sin `https://` ni rutas.
3. Copia la **clave del sitio** y la **clave secreta**. Usa un par por entorno si quieres administrar las pruebas por separado.

El navegador activa el botón de envío cuando los ocho campos son válidos y reCAPTCHA entrega un token. El servidor valida los campos, verifica el token con Google y comprueba que el dominio esté en `RECAPTCHA_HOSTNAMES` antes de insertar. Cada token dura dos minutos y se puede verificar una sola vez.

## 3. Levanta el proyecto en Windows

Abre la carpeta que contiene `package.json` en VS Code. En PowerShell ejecuta:

```powershell
node --version
npm --version
Copy-Item .env.example .env.local
```

Si el Node portátil está en `C:\Herramientas\nodejs` y PowerShell aún no lo encuentra, actualiza el PATH de esa terminal:

```powershell
$env:Path = 'C:\Herramientas\nodejs;' + $env:Path
```

Completa `.env.local` con los valores de tus servicios:

```dotenv
SUPABASE_URL=https://REFERENCIA.supabase.co
SUPABASE_SECRET_KEY=TU_CLAVE_SECRETA_DE_SUPABASE
RECAPTCHA_SITE_KEY=TU_CLAVE_DEL_SITIO
RECAPTCHA_SECRET_KEY=TU_CLAVE_SECRETA_DE_RECAPTCHA
RECAPTCHA_HOSTNAMES=localhost
CORS_ORIGINS=
PORT=3000
```

Ejecuta `npm.cmd run dev` en PowerShell. El proyecto usa módulos nativos de Node y carga Bootstrap y las fuentes desde CDN. Abre [http://localhost:3000](http://localhost:3000). Si ese puerto está ocupado, cambia `PORT` a `3001` y reinicia el servidor.

## 4. Despliega el servicio en Vercel

1. Sube el contenido de la carpeta a un repositorio Git. Conserva `.gitignore` y deja `.env.local` en tu computadora.
2. En [Vercel](https://vercel.com/new), importa el repositorio. Para **Framework Preset** usa **Other**, para **Root Directory** usa la carpeta que contiene `vercel.json` y para **Output Directory** usa `public`. El proyecto no requiere comando de compilación. Selecciona Node.js 24.x si Vercel solicita una versión.
3. En **Settings → Environment Variables**, configura para **Production** las cuatro variables de Supabase y reCAPTCHA, más `RECAPTCHA_HOSTNAMES` con el dominio de producción (por ejemplo, `tu-proyecto.vercel.app`). `PORT` es para uso local. Configura `CORS_ORIGINS` solo si otra web va a llamar la API desde su navegador.
4. Si aún no conoces el dominio, haz el despliegue inicial, cópialo desde **Settings → Domains**, regístralo en Google y actualiza la configuración en Vercel. Después selecciona **Redeploy** en **Deployments** para aplicar las variables.
5. Abre el **dominio de producción** en una ventana privada. Comprueba que la app abra por enlace, que el CAPTCHA se muestre y que un registro de prueba aparezca en **Consulta**. Si Vercel solicita autenticación, revisa **Deployment Protection** y confirma que estás usando el dominio de producción.
6. Usa el dominio que realmente asignó Vercel para construir las URL de tu entrega.

También puedes publicar desde la carpeta del proyecto con `npx.cmd vercel --prod`, después de enlazar el proyecto y configurar las variables de producción en Vercel.

| Uso | Local | Nube, sustituye TU-DOMINIO |
| --- | --- | --- |
| Formulario | `http://localhost:3000/` | `https://TU-DOMINIO.vercel.app/` |
| Directorio | `http://localhost:3000/#consulta` | `https://TU-DOMINIO.vercel.app/#consulta` |
| Registro | `POST http://localhost:3000/api/estudiantes` | `POST https://TU-DOMINIO.vercel.app/api/estudiantes` |
| Consulta | `GET http://localhost:3000/api/estudiantes?pagina=1` | `GET https://TU-DOMINIO.vercel.app/api/estudiantes?pagina=1` |

## 5. Consume el servicio desde Postman u otra aplicación

### POST para registrar

Usa **POST**, URL `https://TU-DOMINIO.vercel.app/api/estudiantes` y **Body → raw → JSON**. Confirma la cabecera `Content-Type: application/json`.

```json
{
  "carne": "2026GT01",
  "nombres": "Ana María",
  "apellidos": "López García",
  "correo": "ana@ejemplo.com",
  "carrera": "Ingeniería en Sistemas",
  "telefono": "5555-1234",
  "fecha_nacimiento": "2006-05-14",
  "genero": "Femenino",
  "recaptchaToken": "PEGA_AQUI_EL_TOKEN"
}
```

Para probar en Postman, abre el formulario en el dominio autorizado, resuelve el CAPTCHA y **deja el formulario sin enviar**. En la consola de desarrollador de esa misma pestaña escribe `grecaptcha.getResponse()`. Copia el valor devuelto como `recaptchaToken` y envía el POST antes de dos minutos. Para repetir la prueba, vuelve a resolver el CAPTCHA y cambia el carné si ya quedó registrado. La clave secreta se queda en el servidor.

Desde otra app web, configura su dominio en reCAPTCHA y agrega ese hostname en `RECAPTCHA_HOSTNAMES`. Agrega también el origen completo en `CORS_ORIGINS`, por ejemplo, `https://mi-app.vercel.app`; si son varios, sepáralos con comas. CORS permite que el navegador lea la respuesta. Postman y los servidores pueden llamar a la API directamente, con un token válido generado en una página autorizada.

```js
async function registrarEstudiante(url, estudiante, recaptchaToken) {
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...estudiante, recaptchaToken })
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje);
  return datos.estudiante;
}
```

El objeto `estudiante` usa los ocho nombres de propiedad del JSON. En una integración nativa, puedes usar la página web de registro del dominio autorizado para completar el flujo de reCAPTCHA web.

### GET para consultar

En Postman usa **GET** con la misma ruta y sin cuerpo. Ejemplo de respuesta:

```json
{
  "estudiantes": [],
  "total": 0,
  "pagina": 1,
  "limite": 100
}
```

La API entrega hasta 100 estudiantes por página y los ordena por carné. Para obtener todos, empieza en `pagina=1` y avanza hasta `Math.ceil(total / limite)`. El directorio de la web reúne las páginas para que el buscador revise todos los registros cargados.

### Respuestas de la API

| HTTP | Resultado |
| --- | --- |
| 200 | Consulta exitosa |
| 201 | Estudiante registrado. Devuelve `mensaje` y `estudiante` |
| 400 | JSON inválido o número de página incorrecto |
| 405 | Método no permitido |
| 409 | Carné duplicado |
| 413 | Cuerpo demasiado grande |
| 415 | El POST requiere JSON |
| 422 | Campos inválidos o CAPTCHA ausente, inválido o caducado. Los errores de campos viajan en `errores` |
| 502 | Error de red o de uno de los servicios |
| 503 | Falta configuración del servidor |

## Diseño y verificación

La interfaz usa gris nube y blanco para las superficies, índigo para el registro y la cabecera de la tabla, y esmeralda para actualizar y señalar la vista activa. Usa `#9CA3AF` en los bordes de los campos y un gris más oscuro para el texto auxiliar. La credencial ilustrada representa el registro académico. Los campos pasan de dos columnas a una en móvil y la tabla permite desplazamiento horizontal con teclado. Las animaciones respetan la preferencia de movimiento reducido.

Para verificar la entrega, intenta completar cada campo con un dato inválido, prueba una fecha exactamente 16 años anterior y otra un día posterior, registra un estudiante ficticio, busca por nombre o carné y pulsa **Actualizar**. Después repite el carné desde Postman con otro token y verifica el código `409`.

### Documentación oficial

- [Planes de Vercel](https://vercel.com/docs/plans/hobby)
- [Funciones Node.js de Vercel](https://vercel.com/docs/functions/runtimes/node-js)
- [Despliegue mediante CLI](https://vercel.com/docs/cli/deploy)
- [Claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys)
- [Pausa de proyectos gratuitos de Supabase](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Dominios de reCAPTCHA](https://developers.google.com/recaptcha/docs/domain_validation)
- [Verificación de tokens de reCAPTCHA](https://developers.google.com/recaptcha/docs/verify)
