/* Traz a `main` para dentro da branch antes de publicar, e resolve sozinho o
 * único conflito que este repositório produz por desenho.
 *
 * POR QUE ISTO EXISTE
 *
 * Em 18/09/2026 a publicação automática falhou na primeira tentativa, e falhou
 * bem: os dezenove conferidores passaram e o merge parou, sem tocar na `main`.
 * O motivo foi este — dois trabalhos andando ao mesmo tempo:
 *
 *   - na branch, os ícones da página inicial (mexeu em styles.css e loja.js)
 *   - na main, o cartão da gestão e as traduções (mexeu em outros arquivos)
 *
 * Nenhum dos dois encostou no que o outro escreveu. Mesmo assim, DEZESSEIS
 * páginas deram conflito — porque as duas linhas recalcularam a marca de
 * versão (`styles.css?v=3384520b`) nas MESMAS linhas dos mesmos arquivos. A
 * marca é derivada do conteúdo: ela muda em toda página sempre que qualquer
 * CSS ou script muda. Duas branches vivas, portanto, conflitam sempre.
 *
 * Isso não é defeito da marca — ela existe por um motivo bom, escrito em
 * `marcar-versao.mjs`. É o preço dela, e o preço tem conserto: como a marca
 * NASCE DO ARQUIVO, ela não precisa ser reconciliada, precisa ser RECALCULADA.
 * Conflito em linha de marca é o git perguntando qual soma vale, quando a
 * resposta certa não é nenhuma das duas — é a soma do arquivo depois do merge.
 *
 * O QUE ELE RESOLVE, E O QUE ELE SE RECUSA A RESOLVER
 *
 * Só toca em conflito de página (.html) em que os dois lados são IGUAIS depois
 * de apagar as marcas. Aí ele sabe que ninguém discordou de nada: as duas
 * versões dizem a mesma coisa, com somas diferentes. Pega um lado, roda o
 * marcador, e a soma certa entra sozinha.
 *
 * Qualquer outra coisa — conflito em CSS, em script, ou em página onde os dois
 * lados de fato escrevem textos diferentes — ele desfaz o merge e para. Um
 * resolvedor automático que "dá um jeito" em conflito de conteúdo é como
 * apagar o alarme: a publicação seguiria, e alguém descobriria semanas depois
 * qual metade do trabalho de quem sumiu.
 *
 * COMO USAR
 *
 *   node juntar-main.mjs      junta origin/main na branch atual
 *
 * Sai com 0 quando juntou (ou quando não havia nada para juntar) e com 1
 * quando parou — e, quando para, deixa a árvore limpa, sem merge pela metade.
 */

import { execFileSync } from 'node:child_process';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** Roda um git que PODE falhar: devolve a saída e se deu certo. */
function gitTalvez(...args) {
  try {
    return { ok: true, saida: git(...args) };
  } catch (erro) {
    return { ok: false, saida: (erro.stdout || '') + (erro.stderr || '') };
  }
}

/* A marca apagada dos dois lados. É ela que responde "os dois lados dizem a
 * mesma coisa?" — e note que apaga a marca INTEIRA, `?v=` incluído: uma página
 * que ganhou um script novo em um dos lados tem uma linha a mais, e tem de
 * continuar contando como diferente. */
const SEM_MARCA = /\?v=[0-9a-f]+/g;
const semMarcas = (texto) => texto.replace(SEM_MARCA, '');

git('fetch', 'origin', 'main');

const base = git('merge-base', 'HEAD', 'origin/main').trim();
const pontaMain = git('rev-parse', 'origin/main').trim();
if (base === pontaMain) {
  console.log('A main já está dentro desta branch: nada a juntar.');
  process.exit(0);
}

const merge = gitTalvez('merge', '--no-edit', 'origin/main');
if (merge.ok) {
  console.log('A main entrou na branch sem conflito.');
  process.exit(0);
}

const conflitados = git('diff', '--name-only', '--diff-filter=U')
  .split('\n')
  .filter(Boolean);

/* Sem lista de conflitos, o merge falhou por outro motivo (árvore suja, por
 * exemplo). Não é caso deste arquivo, e fingir que é seria pior. */
if (!conflitados.length) {
  console.error('PAREI: o merge falhou e não há conflito de arquivo para resolver.');
  console.error(merge.saida.trim());
  gitTalvez('merge', '--abort');
  process.exit(1);
}

const naoResolvo = [];

for (const arquivo of conflitados) {
  if (!arquivo.endsWith('.html')) {
    naoResolvo.push(`${arquivo} (não é página; marca de versão só mora em .html)`);
    continue;
  }

  /* OS TRÊS LADOS, e são três de propósito. `:1:` é o ancestral comum — o
   * arquivo como estava quando as duas linhas se separaram —, `:2:` é esta
   * branch e `:3:` é a main, cada um o arquivo INTEIRO, não só o pedaço que
   * conflitou.
   *
   * O ancestral é o que faz a pergunta certa. Eu tinha escrito isto
   * comparando só os dois lados entre si, e na primeira vez que rodou o
   * próprio repositório me mostrou o furo: em `conta.html` a main tinha
   * mudado o texto e esta branch não tinha mudado nada além da marca. Os dois
   * lados eram diferentes, sim — e mesmo assim não havia discordância
   * nenhuma para resolver, porque só UM deles tinha mudado alguma coisa.
   * Comparado com o ancestral isso aparece; comparado um com o outro, não. */
  const ancestral = gitTalvez('show', `:1:${arquivo}`);
  const meu = gitTalvez('show', `:2:${arquivo}`);
  const dela = gitTalvez('show', `:3:${arquivo}`);

  if (!meu.ok || !dela.ok || !ancestral.ok) {
    naoResolvo.push(`${arquivo} (falta um dos três lados: nasceu nas duas pontas?)`);
    continue;
  }

  const antes = semMarcas(ancestral.saida);
  const aqui = semMarcas(meu.saida);
  const la = semMarcas(dela.saida);

  /* Fora as marcas: quem de fato mexeu no conteúdo desta página? */
  const mexiAqui = aqui !== antes;
  const mexeuLa = la !== antes;

  if (mexiAqui && mexeuLa && aqui !== la) {
    naoResolvo.push(`${arquivo} (os dois lados mudaram o conteúdo, e para coisas diferentes)`);
    continue;
  }

  /* Sobrou o caso fácil, nas suas três formas: ninguém mexeu no conteúdo, só
   * um mexeu, ou os dois chegaram no mesmo texto. Em todas elas existe uma
   * versão do conteúdo que é a certa, e é ela que entra. A marca não vem de
   * lado nenhum — é recalculada depois do merge, logo abaixo. */
  const fica = mexiAqui && !mexeuLa ? '--ours' : '--theirs';
  git('checkout', fica, '--', arquivo);
  git('add', '--', arquivo);
}

if (naoResolvo.length) {
  console.error('\nPAREI: há conflito que eu não posso resolver sozinho.\n');
  console.error('Eu só resolvo conflito de marca de versão — o caso em que os dois lados');
  console.error('dizem a mesma coisa e discordam só da soma do arquivo. Nestes aqui,');
  console.error('alguém precisa decidir o que fica:\n');
  for (const caso of naoResolvo) console.error(`  ${caso}`);
  console.error('\nA branch ficou como estava, sem merge pela metade.');
  gitTalvez('merge', '--abort');
  process.exit(1);
}

/* Agora sim a soma certa: depois do merge, calculada do arquivo que ficou. */
execFileSync('node', ['marcar-versao.mjs'], { stdio: 'inherit' });
gitTalvez('add', '-u', '--', '*.html');

git('commit', '--no-edit');

console.log(`\nA main entrou na branch. ${conflitados.length} página(s) tinham conflito`);
console.log('só de marca de versão, e a marca foi recalculada depois do merge.');
