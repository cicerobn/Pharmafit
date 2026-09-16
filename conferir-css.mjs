#!/usr/bin/env node
/* ===========================================================================
   CONFERIR CSS — pega o erro de escrita que apaga regra em silêncio
   ===========================================================================

   POR QUE ISTO EXISTE

   Escrevendo a regra do `.linkish` eu fechei um comentário e continuei
   escrevendo texto depois da marca de fechar. O texto solto virou CSS
   inválido, o navegador desistiu daquele trecho e a regra inteira do
   `.linkish` deixou de existir. Nenhum teste reclamou: o site abria, as
   seis suítes passavam, e os links voltavam a parecer texto morto. Eu
   fiz isso DUAS vezes na mesma tarde, e o que me salvou foi olhar a
   foto da tela.

   (Este arquivo também: a primeira versão dele citava a marca de fechar
   comentário dentro do próprio comentário, e fechou a si mesma.)

   CSS não tem erro de compilação. Ele engole o que não entende e segue
   em frente — então a mesma falta que num JavaScript pararia tudo, aqui
   só faz a tela ficar um pouco errada. É o pior tipo de erro que existe:
   o que não avisa.

   O QUE ELE CONFERE

   1. marca de fechar comentário sem abertura antes — o meu erro, 2 vezes
   2. comentário aberto que nunca fecha — engole o resto do arquivo
   3. chaves desbalanceadas
   4. declaração (`coisa: valor;`) solta fora de qualquer bloco
   5. `var(--nome)` de variável que não existe — eu inventei três nomes
      (`--texto`, `--fundo-2`, `--linha`) numa tela nova; os certos eram
      `--ink`, `--line-2` e `--line`, e a tela só saiu "sem graça"

   Ele NÃO sabe se a regra está bonita nem se ela se aplica a alguém.
   Para isso é o navegador. Ele só garante que o que eu escrevi chega
   inteiro até lá.

   COMO RODAR:  node conferir-css.mjs
   Sai com 1 se achou problema, para travar a publicação.
   =========================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';

const RAIZ = process.cwd();
const FORA = new Set(['node_modules', '.git', '.github', 'dist', 'loja-fonte', 'loja']);

function acharCss(dir, achados = []) {
  for (const nome of readdirSync(dir)) {
    if (FORA.has(nome)) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) acharCss(caminho, achados);
    else if (nome.endsWith('.css')) achados.push(caminho);
  }
  return achados;
}

/** Onde está a linha/coluna de um índice, para o recado ser útil. */
function onde(texto, i) {
  const antes = texto.slice(0, i);
  const linha = antes.split('\n').length;
  const coluna = i - antes.lastIndexOf('\n');
  return `linha ${linha}, coluna ${coluna}`;
}

/**
 * Passa o arquivo caractere a caractere sabendo onde está: dentro de
 * comentário, dentro de texto entre aspas, ou no CSS mesmo. Sem isso um
 * `/*` dentro de uma string (`content:"/*"`) viraria alarme falso — e
 * alarme falso ensina a ignorar o vermelho.
 */
function conferir(caminho, texto) {
  const problemas = [];
  let i = 0, profundidade = 0, comecoComentario = -1;

  while (i < texto.length) {
    const c = texto[i], d = texto[i + 1];

    /* ---- comentário ---- */
    if (c === '/' && d === '*') {
      comecoComentario = i;
      const fim = texto.indexOf('*/', i + 2);
      if (fim === -1) {
        problemas.push(`comentário aberto em ${onde(texto, i)} e nunca fechado ` +
                       `— tudo daí para baixo virou comentário`);
        return problemas;
      }
      i = fim + 2;
      comecoComentario = -1;
      continue;
    }

    /* ---- fecha-comentário sem abertura antes: O MEU ERRO ---- */
    if (c === '*' && d === '/') {
      problemas.push(`"*/" sobrando em ${onde(texto, i)} — o comentário já havia ` +
                     `fechado antes, então o texto acima dele está solto no CSS ` +
                     `e apaga a regra que vem depois`);
      i += 2;
      continue;
    }

    /* ---- texto entre aspas ---- */
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < texto.length && texto[j] !== c) j += texto[j] === '\\' ? 2 : 1;
      i = j + 1;
      continue;
    }

    /* ---- chaves ---- */
    if (c === '{') { profundidade++; i++; continue; }
    if (c === '}') {
      profundidade--;
      if (profundidade < 0) {
        problemas.push(`"}" a mais em ${onde(texto, i)}`);
        profundidade = 0;
      }
      i++;
      continue;
    }

    i++;
  }

  if (profundidade > 0) {
    problemas.push(`${profundidade} chave(s) "{" sem fechar — o fim do arquivo ` +
                   `ficou pendurado`);
  }

  /* ---- declaração solta fora de bloco ----
     Fora de qualquer `{ }` só pode haver seletor e regra @. Uma linha
     com `coisa: valor;` ali é sinal de bloco que perdeu a chave, ou de
     comentário que fechou no lugar errado. */
  const semComentario = texto.replace(/\/\*[\s\S]*?\*\//g, ' ');
  let nivel = 0, pedaco = '';
  for (let k = 0; k < semComentario.length; k++) {
    const c = semComentario[k];
    if (c === '{') {
      if (nivel === 0) pedaco = '';
      nivel++;
      continue;
    }
    if (c === '}') { nivel = Math.max(0, nivel - 1); pedaco = ''; continue; }
    if (nivel === 0) pedaco += c;
    if (nivel === 0 && c === ';') {
      const limpo = pedaco.replace(/\s+/g, ' ').trim();
      /* `@import ...;` e `@charset ...;` são declarações legítimas soltas */
      if (limpo && !limpo.startsWith('@')) {
        problemas.push(`declaração solta fora de bloco perto de ` +
                       `${onde(semComentario, k)}: "${limpo.slice(0, 60)}"`);
      }
      pedaco = '';
    }
  }

  return problemas;
}

/**
 * Variável de cor usada e nunca definida.
 *
 * Escrevendo a tela de Configurações eu usei `var(--texto)`,
 * `var(--fundo-2)` e `var(--linha)`. Nenhuma das três existe: os nomes
 * certos são `--ink`, `--line-2` e `--line`. CSS não reclama — a
 * propriedade fica sem valor, e o texto sai preto padrão, a borda
 * some. Na tela parece só "um pouco sem graça", e ninguém procura
 * defeito nisso.
 *
 * A conta é feita por PÁGINA, na união das folhas que ela carrega — o
 * porquê está no corpo da função. Nem folha por folha (acusaria as
 * quinze variáveis que o `gestao.css` pega do `styles.css`, e isso está
 * certo), nem o repositório inteiro num bolo (deixaria passar variável
 * que só existe na folha do painel sendo usada na do site).
 *
 * Variável definida na marra no HTML (`style="--i:3"`, que é o atraso
 * da animação em cascata) também vale como definida.
 */
function conferirVariaveis(arquivosCss) {
  /* AGRUPADO POR PÁGINA, e não pelo repositório inteiro.
   *
   * A primeira versão juntava todas as folhas num bolo só. Isso acertava
   * o painel (as páginas dele carregam gestao.css E styles.css, e a
   * primeira usa quinze variáveis da segunda) e ERRAVA o site: uma
   * variável definida só em gestao/app/app.css passava como se
   * existisse, mesmo o site público nunca carregando aquele arquivo.
   *
   * Era o mesmo furo que deixou os links do site parecendo texto morto:
   * a regra existia, mas na folha errada. O conferidor que nasceu para
   * pegar esse furo estava cego para ele.
   *
   * Agora cada página diz quais folhas ela carrega, e a conta é feita
   * nessa união. Uma variável com valor de reserva (`var(--x, #fff)`)
   * não entra na conta: ela tem resposta mesmo sem definição. */
  const definidasNaMarra = new Set();
  for (const caminho of acharPorExtensao(RAIZ, ['.html', '.js'])) {
    const txt = readFileSync(caminho, 'utf8');
    for (const m of txt.matchAll(/(--[\w-]+)\s*:/g)) definidasNaMarra.add(m[1]);
  }

  const lidas = new Map();   /* caminho -> {definidas, usadas} */
  for (const caminho of arquivosCss) {
    const txt = readFileSync(caminho, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    const definidas = new Set([...txt.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    /* só as SEM valor de reserva: `var(--x)` e não `var(--x, algo)` */
    const usadas = new Set([...txt.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((m) => m[1]));
    lidas.set(caminho, { definidas, usadas });
  }

  const orfas = new Map();   /* recado -> true, para não repetir */

  for (const pagina of acharPorExtensao(RAIZ, ['.html'])) {
    const html = readFileSync(pagina, 'utf8');
    const pasta = dirname(pagina);

    /* as folhas que ESTA página carrega */
    const folhas = [];
    for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/g)) {
      const h = /href=["']([^"']+)["']/.exec(m[0]);
      if (!h || /^https?:/.test(h[1])) continue;
      const alvo = resolve(h[1].startsWith('/') ? RAIZ : pasta,
                           h[1].replace(/^\//, '').split('?')[0]);
      if (lidas.has(alvo)) folhas.push(alvo);
    }
    if (!folhas.length) continue;

    const temAqui = new Set(definidasNaMarra);
    folhas.forEach((f) => lidas.get(f).definidas.forEach((v) => temAqui.add(v)));

    for (const f of folhas) {
      for (const v of lidas.get(f).usadas) {
        if (temAqui.has(v)) continue;
        orfas.set(`${relative(RAIZ, f)}: usa ${v}, que ${relative(RAIZ, pagina)} ` +
                  `não tem em nenhuma folha que ela carrega — a propriedade fica ` +
                  `sem valor e o CSS não reclama`, true);
      }
    }
  }
  return [...orfas.keys()];
}

function acharPorExtensao(dir, exts, achados = []) {
  for (const nome of readdirSync(dir)) {
    if (FORA.has(nome)) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) acharPorExtensao(caminho, exts, achados);
    else if (exts.some((e) => nome.endsWith(e))) achados.push(caminho);
  }
  return achados;
}

/* ---------------------------------------------------------------- */

const arquivos = acharCss(RAIZ);
if (!arquivos.length) {
  console.error('Não achei nenhum .css para conferir — isto é suspeito.');
  process.exit(2);
}

let ruim = 0;
for (const caminho of arquivos) {
  const curto = relative(RAIZ, caminho);
  const problemas = conferir(caminho, readFileSync(caminho, 'utf8'));
  if (!problemas.length) {
    console.log(`  ok    ${curto}`);
  } else {
    ruim += problemas.length;
    console.log(`  ACHEI ${curto}`);
    problemas.forEach((p) => console.log(`          · ${p}`));
  }
}

const orfas = conferirVariaveis(arquivos);
if (!orfas.length) {
  console.log(`  ok    nenhuma variável de cor usada sem existir`);
} else {
  ruim += orfas.length;
  console.log(`  ACHEI variável de cor que não existe`);
  orfas.forEach((o) => console.log(`          · ${o}`));
}

console.log('');
if (ruim) {
  console.log(`${ruim} problema(s) de escrita no CSS. Regra escrita errada não dá ` +
              `erro: ela simplesmente não existe na tela.`);
  process.exit(1);
}
console.log(`${arquivos.length} arquivo(s) de CSS conferidos, nenhum problema de escrita.`);
