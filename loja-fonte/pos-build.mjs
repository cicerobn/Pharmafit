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

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const pasta = process.argv[2] || 'dist';
/* Quando a publicacao sabe o commit (GITHUB_SHA), a marca e o commit: e o que
 * a conferencia pos-publicacao compara para provar que a versao chegou.
 *
 * Quando nao sabe, ele NAO inventa. Um arquivo nao pode saber o commit em que
 * ele mesmo vai entrar, e eu ja escrevi um commit errado aqui por isso — a
 * marca ficou apontando o commit anterior, parecendo verdade. Sem commit, a
 * marca e a impressao digital dos arquivos montados: muda quando a fonte muda,
 * e nao afirma nada que nao saiba. */
const commit = process.env.GITHUB_SHA || null;
const quando = new Date().toISOString();

mkdirSync(pasta, { recursive: true });

const pagina = join(pasta, 'index.html');
if (existsSync(pagina)) {
  const antes = readFileSync(pagina, 'utf8');
  const depois = antes.replace(/\s+crossorigin(?=[\s>])/g, '');
  if (depois !== antes) writeFileSync(pagina, depois, 'utf8');
  console.log(`index.html: crossorigin removido (${(antes.length - depois.length)} caracteres)`);
}

if (commit) {
  writeFileSync(join(pasta, 'versao.txt'), `${commit}\n${quando}\n`, 'utf8');
  console.log(`versao.txt: ${commit.slice(0, 12)} · ${quando}`);
} else {
  const arquivos = readdirSync(pasta).filter((n) => n !== 'versao.txt').sort();
  const digital = createHash('md5');
  arquivos.forEach((n) => digital.update(readFileSync(join(pasta, n))));
  const marca = digital.digest('hex').slice(0, 12);
  writeFileSync(join(pasta, 'versao.txt'),
    `${marca}\nmontado de loja-fonte/ e publicado junto com o site da Pharma Fit\n`, 'utf8');
  console.log(`versao.txt: ${marca} (impressao digital dos arquivos, sem commit)`);
}
