/* Dois acabamentos depois de montar a versão estática.
 *
 * 1. Escreve dentro da pasta publicada qual versão ela é. Serve para uma coisa
 *    só, mas importante: depois de publicar, dá para perguntar ao site que está
 *    no ar qual versão ele tem. Se a resposta for a antiga, a publicação não
 *    chegou — e é melhor saber por um aviso do que descobrindo que uma correção
 *    não surtiu efeito.
 *
 * 2. Tira o `crossorigin` do <script> e do <link>. O Vite põe isso porque
 *    assume que os arquivos podem estar num CDN. Aqui eles estão na mesma
 *    pasta do site, então o atributo não serve para nada — e serve para quebrar:
 *    numa hospedagem que responda esses arquivos por um caminho intermediário
 *    sem cabeçalho de CORS, o navegador recusa baixar e a loja abre BRANCA, sem
 *    dizer por quê. Menos uma peça capaz de falhar em silêncio.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const pasta = process.argv[2] || 'dist';
const commit = process.env.GITHUB_SHA || 'local';
const quando = new Date().toISOString();

mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, 'versao.txt'), `${commit}\n${quando}\n`, 'utf8');

const pagina = join(pasta, 'index.html');
if (existsSync(pagina)) {
  const antes = readFileSync(pagina, 'utf8');
  const depois = antes.replace(/\s+crossorigin(?=[\s>])/g, '');
  if (depois !== antes) writeFileSync(pagina, depois, 'utf8');
  console.log(`index.html: crossorigin removido (${(antes.length - depois.length)} caracteres)`);
}

console.log(`versao.txt: ${commit.slice(0, 12)} · ${quando}`);
