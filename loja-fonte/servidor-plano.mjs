/* Servidor estático mínimo, para testar a loja dentro de uma subpasta.
 * Imita o que a Hostinger faz: entrega o arquivo que existe, e usa index.html
 * quando o caminho é uma pasta. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const RAIZ = process.argv[2];
const PORTA = Number(process.argv[3] || 4180);

const TIPOS = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  /* Sem estes, o navegador recusava desenhar as imagens e o print saía com
     ícone quebrado — eu quase leria isso como defeito do site. */
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

createServer(async (req, res) => {
  let caminho = join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
  try {
    const info = await stat(caminho);
    if (info.isDirectory()) caminho = join(caminho, 'index.html');
    const corpo = await readFile(caminho);
    res.writeHead(200, { 'content-type': TIPOS[extname(caminho)] || 'application/octet-stream' });
    res.end(corpo);
    console.log('200', req.url);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('nao achei');
    console.log('404', req.url, '->', caminho);
  }
}).listen(PORTA, () => console.log('servindo ' + RAIZ + ' na ' + PORTA));
