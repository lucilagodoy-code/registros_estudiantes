import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import estudiantes from '../api/estudiantes.js';
import config from '../api/config.js';

const directorio = resolve('public');
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const rutas = new Map([['/api/estudiantes', estudiantes], ['/api/config', config]]);
const puerto = Number(process.env.PORT || 3000);

createServer(async (entrada, salida) => {
  try {
    const url = new URL(entrada.url, `http://localhost:${puerto}`);
    salida.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const accion = rutas.get(url.pathname);
    if (accion) {
      const opciones = { method: entrada.method, headers: entrada.headers };
      if (!['GET', 'HEAD'].includes(entrada.method)) {
        opciones.body = entrada;
        opciones.duplex = 'half';
      }
      const respuesta = await accion.fetch(new Request(url, opciones));
      salida.writeHead(respuesta.status, Object.fromEntries(respuesta.headers));
      salida.end(Buffer.from(await respuesta.arrayBuffer()));
      return;
    }

    const archivo = resolve(directorio, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    if (!archivo.startsWith(directorio + sep) || !tipos[extname(archivo)]) {
      salida.writeHead(404).end('Página no encontrada.');
      return;
    }
    const contenido = await readFile(archivo);
    salida.writeHead(200, { 'Content-Type': tipos[extname(archivo)] });
    salida.end(entrada.method === 'HEAD' ? undefined : contenido);
  } catch (error) {
    salida.writeHead(error.code === 'ENOENT' ? 404 : 500).end('No se pudo completar la solicitud.');
  }
}).listen(puerto, 'localhost', () => console.log(`Reg-Estudiantes GT en http://localhost:${puerto}`));
