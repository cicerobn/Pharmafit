/* Põe a marca de versão nos endereços de estilo e script das páginas.
 *
 * POR QUE ISTO EXISTE
 *
 * Em 15/09/2026 eu medi o servidor pedindo `assets/js/app.js` dez vezes
 * seguidas. Metade das respostas veio na versão ANTIGA do arquivo — a de antes
 * da troca de "protocolos" por "produtos". A hospedagem guarda o arquivo em
 * mais de um lugar e responde com o velho por sorteio, a cada pedido.
 *
 * Somado a isso, o `.htaccess` manda o navegador guardar script e estilo por um
 * dia. Junto, dá o pior tipo de defeito: a mudança é aprovada, funciona para
 * quem publicou, e o cliente continua vendo o site de ontem. Ninguém vê erro
 * nenhum, e a conclusão natural é "então não mudou nada".
 *
 * A marca resolve porque muda o ENDEREÇO. `app.js?v=3f2a1b9c` é, para todo
 * cache do caminho, um arquivo que ninguém pediu ainda — não existe cópia velha
 * dele para servir. Quando o arquivo muda, a marca muda, e o endereço muda com
 * ela. Quando o arquivo não muda, tudo continua guardado, que é o que a gente
 * quer.
 *
 * O CUIDADO QUE IMPORTA
 *
 * Marca escrita à mão apodrece. Hoje mesmo eu tropecei duas vezes nisso: uma
 * lista de arquivos escrita à mão que não acompanhava o trabalho, e um
 * `versao.txt` afirmando um commit que não era o dele. Marca de versão errada é
 * pior que marca nenhuma, porque ela promete estar certa.
 *
 * Então ela não é escrita à mão: nasce do conteúdo do arquivo (md5), e o modo
 * `--conferir` reprova a publicação se alguma estiver velha ou faltando. A
 * marca não pode ficar atrás do arquivo sem alguém ser avisado.
 *
 * COMO USAR
 *
 *   node marcar-versao.mjs              escreve as marcas nas páginas
 *   node marcar-versao.mjs --conferir    só confere, não escreve (é o da publicação)
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve, relative, extname } from 'node:path';

const RAIZ = process.cwd();
const CONFERIR = process.argv.includes('--conferir');

/* A LOJA FICA FORA, e isso não é detalhe.
 *
 * Ela é MONTADA, e a montagem já põe a impressão digital no próprio nome do
 * arquivo (`index-Ctj6MFPc.js`). Marca em cima de marca não protege mais nada —
 * e pior, mexer ali quebraria a conferência que compara a montagem com a fonte,
 * que é o que garante que a loja no ar é a loja desta fonte.
 *
 * Eu descobri isso tropeçando: rodando no repositório privado, este arquivo
 * entrou em `loja-nova/dist/` e quis marcar os arquivos da montagem. Por isso
 * `dist` está na lista PELO NOME, em qualquer nível — montagem é montagem em
 * qualquer pasta, e a próxima vai aparecer em outro lugar. */
const FORA = ['loja', 'loja-fonte', 'loja-nova', 'dist', 'node_modules', '.git', '.github'];

/* O endereço de um script ou estilo dentro do HTML. Guardo os pedaços para
 * poder reescrever só a marca e deixar o resto intacto. */
const ENDERECO = /(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"]+?)(")/gi;

function paginas(pasta = RAIZ, fundo = 0) {
  if (fundo > 6) return [];
  const saida = [];
  for (const nome of readdirSync(pasta)) {
    if (FORA.includes(nome)) continue;
    const caminho = join(pasta, nome);
    let info;
    try { info = statSync(caminho); } catch { continue; }
    if (info.isDirectory()) saida.push(...paginas(caminho, fundo + 1));
    else if (extname(nome) === '.html') saida.push(caminho);
  }
  return saida;
}

function digital(arquivo) {
  return createHash('md5').update(readFileSync(arquivo)).digest('hex').slice(0, 8);
}

/** O arquivo local que este endereço aponta, ou null se não for um deles. */
function arquivoDe(endereco, pagina) {
  /* Endereço de fora não é nosso para marcar. */
  if (/^(https?:)?\/\//i.test(endereco) || endereco.startsWith('data:')) return null;

  const [caminho] = endereco.split(/[?#]/);
  if (!['.js', '.css'].includes(extname(caminho))) return null;

  /* O service worker fica de fora: o navegador tem regra própria para trocar de
   * service worker, e marca no endereço dele atrapalha em vez de ajudar. */
  if (/(^|\/)sw\.js$/.test(caminho)) return null;

  const alvo = caminho.startsWith('/')
    ? join(RAIZ, caminho)
    : resolve(dirname(pagina), caminho);

  /* Nada de sair da pasta do site. */
  if (!alvo.startsWith(RAIZ)) return null;

  try { if (!statSync(alvo).isFile()) return null; } catch { return null; }

  /* Um arquivo dentro de loja/ não se marca, pelo motivo escrito lá em cima. */
  const dentro = relative(RAIZ, alvo).split(/[/\\]/)[0];
  if (FORA.includes(dentro)) return null;

  return alvo;
}

const velhas = [];
let escritas = 0;
let conferidas = 0;

for (const pagina of paginas()) {
  const antes = readFileSync(pagina, 'utf8');

  const depois = antes.replace(ENDERECO, (inteiro, abre, endereco, fecha) => {
    const arquivo = arquivoDe(endereco, pagina);
    if (!arquivo) return inteiro;

    const marca = digital(arquivo);
    const [caminho, consulta = ''] = endereco.split('?');

    /* Só a marca é reescrita; se houver outro parâmetro, ele fica. */
    const resto = consulta.split('&').filter((p) => p && !p.startsWith('v='));
    const nova = [`v=${marca}`, ...resto].join('&');
    const enderecoNovo = `${caminho}?${nova}`;

    conferidas++;
    if (endereco !== enderecoNovo) {
      velhas.push({
        pagina: relative(RAIZ, pagina),
        arquivo: relative(RAIZ, arquivo),
        tinha: endereco,
        deveria: enderecoNovo
      });
    }
    return abre + enderecoNovo + fecha;
  });

  if (depois !== antes && !CONFERIR) {
    writeFileSync(pagina, depois, 'utf8');
    escritas++;
  }
}

if (!conferidas) {
  console.error('PAREI: não achei um único endereço de script ou estilo para marcar.');
  console.error('Um verificador que aprova sem ter olhado nada é pior que nenhum.');
  process.exit(2);
}

if (CONFERIR) {
  if (!velhas.length) {
    console.log(`As ${conferidas} marcas de versão estão na versão do arquivo.`);
    process.exit(0);
  }

  console.error('\nPAREI: há marca de versão velha nas páginas.\n');
  console.error('A marca existe para o cliente receber o arquivo novo. Velha, ela faz');
  console.error('o contrário: garante que ele continue recebendo o antigo.\n');
  for (const v of velhas.slice(0, 20)) {
    console.error(`  ${v.pagina}`);
    console.error(`    ${v.arquivo} mudou`);
    console.error(`    está:    ${v.tinha}`);
    console.error(`    deveria: ${v.deveria}\n`);
  }
  if (velhas.length > 20) console.error(`  … e mais ${velhas.length - 20}.\n`);
  console.error('Conserto: rode `node marcar-versao.mjs` e mande junto com a mudança.');
  process.exit(1);
}

console.log(`Marcas de versão em dia: ${conferidas} endereços em ${paginas().length} páginas.`);
console.log(escritas ? `${escritas} páginas reescritas.` : 'Nada mudou — já estavam certas.');
