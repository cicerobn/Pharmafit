#!/usr/bin/env node
/* ===========================================================================
   CONFERIR QUE CADA PÁGINA CARREGA O QUE OS SCRIPTS DELA PRECISAM
   ===========================================================================

   As 16 páginas listam os scripts à mão, uma por uma. É a mesma doença
   dos menus, e o preço aqui é maior: menu diferente a pessoa VÊ, script
   faltando ninguém vê.

   Medido em 17/09/2026: `conta.js` estava em 4 das 16 páginas. E
   `pedido.js` — que está em todas as 16 — pergunta a ele quem está
   logado para carimbar o dono do pedido (`cliente_id`). Nas outras 12,
   `window.PharmaFitConta` simplesmente não existia: o `try/catch` em
   volta engolia, o pedido era gravado SEM dono, e a tela mostrava
   sucesso. Quem comprasse logado pela página inicial — que é por onde
   quase todo mundo compra — não encontrava aquele pedido em "Meus
   pedidos" no outro aparelho. Nenhum erro, nenhum rastro, e a única
   coisa que aparecia era o cliente dizendo que o pedido "desapareceu".

   COMO ESTA CONFERÊNCIA FUNCIONA

   Ela não guarda lista de página nenhuma — listas assim é que
   desencontram. Cada script DIZ de quem depende, numa linha no
   comentário de cima dele:

       precisa: nuvem, minha-area, conta

   A regra fica ao lado do código que tem a necessidade, onde quem
   mexer nele vai ler. Esta conferência então abre as 16 páginas e
   exige, para cada script carregado:

     1. que tudo de que ele precisa esteja carregado na mesma página;
     2. que venha ANTES dele, porque um script que se anuncia em
        `window.…` só existe depois de rodar.

   E EXIGE O CONTRÁRIO TAMBÉM, pela declaração `enche:`: se o HTML da
   página tem um gancho (`data-fav-contador`, por exemplo), a página
   tem de carregar o script que preenche aquele gancho. Isto entrou
   depois, porque `precisa` não pegava o defeito: o problema não era um
   script chamando outro, era um pedaço de HTML sem o script que lhe dá
   vida. Aconteceu com o contador de favoritos em quatro páginas — o
   menu prometia o número e nunca mostrava.

   COMO RODAR:  node conferir-scripts.mjs
   =========================================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PASTA = 'assets/js';

/* ---------- o que cada script declara ---------- */

/* Duas declarações, e elas cobram coisas diferentes:
 *
 *   precisa: <scripts>   -> este arquivo depende deles; têm de estar
 *                           na mesma página e ANTES dele.
 *   enche: <data-gancho> -> este arquivo preenche esse gancho; toda
 *                           página que tiver o gancho no HTML tem de
 *                           carregar este arquivo.
 *
 * A segunda nasceu em 17/09/2026. O coração e o carrinho saíram da
 * barra de cima, e os contadores deles passaram a viver dentro do
 * MENU — que é igual nas 16 páginas. Quatro páginas não carregavam
 * `favoritos.js`, então nelas o número nunca aparecia: o menu prometia
 * uma coisa e entregava outra, sem erro nenhum na tela.
 *
 * `precisa` não pegaria isso: o problema não é um script chamando
 * outro, é um pedaço de HTML sem o script que lhe dá vida. */

const precisa = new Map();
const enche = new Map();

for (const arq of readdirSync(PASTA).filter((f) => f.endsWith('.js'))) {
  const texto = readFileSync(join(PASTA, arq), 'utf8');
  /* a declaração vale só no começo do arquivo: é cabeçalho, não código */
  const cabeca = texto.slice(0, 4000);
  const m = cabeca.match(/^[^\S\n]*(?:\/\*|\*|\/\/)?[^\S\n]*precisa:[^\S\n]*(.+)$/m);
  if (!m) continue;
  const lista = m[1]
    .replace(/\*\/\s*$/, '')
    .split(/[,\s]+/)
    .map((s) => s.trim().replace(/\.js$/, ''))
    .filter(Boolean);
  if (lista.length) precisa.set(arq.replace(/\.js$/, ''), lista);
}

for (const arq of readdirSync(PASTA).filter((f) => f.endsWith('.js'))) {
  const cabeca = readFileSync(join(PASTA, arq), 'utf8').slice(0, 4000);
  const m = cabeca.match(/^[^\S\n]*(?:\/\*|\*|\/\/)?[^\S\n]*enche:[^\S\n]*(.+)$/m);
  if (!m) continue;
  const ganchos = m[1]
    .replace(/\*\/\s*$/, '')
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^data-[a-z-]+$/.test(s));
  if (ganchos.length) enche.set(arq.replace(/\.js$/, ''), ganchos);
}

if (!precisa.size && !enche.size) {
  console.error('Nenhum script declara "precisa:" nem "enche:" — ou a declaração sumiu,');
  console.error('ou o jeito de escrever mudou. Sem declaração esta conferência aprova');
  console.error('tudo, e conferência que aprova tudo é pior que conferência nenhuma.');
  process.exit(2);
}

/* ---------- os scripts que cada página carrega, na ordem ---------- */

const paginas = readdirSync('.').filter((f) => f.endsWith('.html')).sort();
if (!paginas.length) {
  console.error('Não achei página nenhuma — isto é suspeito.');
  process.exit(2);
}

const problemas = [];

for (const pag of paginas) {
  const html = readFileSync(pag, 'utf8');
  const ordem = [];
  for (const s of html.matchAll(/<script\s+src="([^"]+)"/g)) {
    const nome = s[1].split(/[?#]/)[0].split('/').pop().replace(/\.js$/, '');
    ordem.push(nome);
  }
  if (!ordem.length) continue;

  /* quem tem o gancho tem de ter o script que o enche */
  for (const [script, ganchos] of enche) {
    for (const gancho of ganchos) {
      if (!html.includes(gancho)) continue;
      if (ordem.indexOf(script) === -1) {
        problemas.push(
          `${pag}: tem \`${gancho}\` no HTML e NÃO carrega ${script}.js, ` +
          `que é quem preenche esse gancho — ele fica ali sem nunca aparecer`
        );
      }
    }
  }

  for (const [script, dependencias] of precisa) {
    const meu = ordem.indexOf(script);
    if (meu === -1) continue;                 /* a página não usa este */

    for (const dep of dependencias) {
      const dela = ordem.indexOf(dep);
      if (dela === -1) {
        problemas.push(
          `${pag}: carrega ${script}.js e NÃO carrega ${dep}.js, de que ele depende`
        );
      } else if (dela > meu) {
        problemas.push(
          `${pag}: ${dep}.js vem DEPOIS de ${script}.js — quando ${script}.js roda, ` +
          `${dep}.js ainda não existe`
        );
      }
    }
  }

  /* ---------- e todos eles com `defer` ----------
   *
   * Brian, 19/09/2026: "ta menos lento, mas quando abre ta lento
   * tambem". A página do produto carrega 465 KB de JavaScript em 18
   * tags, e nenhuma delas tinha `defer`.
   *
   * O QUE EU ACHEI QUE ERA, E NÃO ERA. Escrevi aqui primeiro que as
   * dezoito baixavam em fila, uma de cada vez. Fui medir antes de
   * acreditar e estava errado: o navegador tem um leitor adiantado
   * que acha todas as tags e baixa TODAS em paralelo desde sempre. O
   * que estava em fila era a EXECUÇÃO — a leitura da página para em
   * cada script até ele rodar.
   *
   * O QUE A MEDIDA DEU, com 80ms de ida e volta por arquivo, até a
   * foto do produto ganhar endereço: 401ms em fila contra 349ms com
   * `defer`. 13%. É ganho de verdade e não custa nada, mas é bem menos
   * do que o parágrafo errado prometia — e comentário que promete o
   * que não entrega é pior que comentário nenhum.
   *
   * O PESO É QUE É O ASSUNTO, e ele continua aqui: 465 KB, dos quais
   * 213 são a biblioteca do Supabase. Nenhum `defer` conserta isso.
   *
   * ISTO É CONFERIDO, e não só corrigido de uma vez, porque página
   * nova nasce do esqueleto de uma pronta: sem esta regra, a primeira
   * página que alguém copiar de um exemplo antigo volta a enfileirar
   * tudo, e ninguém vê — não dá erro em tela nenhuma, só fica lento.
   *
   * `defer` depois do `src` e não antes: é assim que o casamento lá em
   * cima acha o nome do arquivo. */
  for (const s of html.matchAll(/<script\s+src="([^"]+)"([^>]*)>/g)) {
    const arquivo = s[1].split(/[?#]/)[0].split('/').pop();
    if (!/\bdefer\b/.test(s[2])) {
      problemas.push(
        `${pag}: ${arquivo} carrega SEM defer — o navegador para a página ` +
        `para baixar e rodar este script antes de seguir`
      );
    }
  }
}

console.log(`  ${paginas.length} páginas · ${precisa.size} script(s) com dependência · ` +
            `${enche.size} com gancho declarado:`);
for (const [s, d] of precisa) console.log(`    ${s}.js precisa de ${d.join(', ')}`);
for (const [s, g] of enche) console.log(`    ${s}.js enche ${g.join(', ')}`);

if (!problemas.length) {
  console.log('  ok    toda página carrega o que os scripts e o HTML dela precisam');
  process.exit(0);
}

console.log('');
console.log(`  ACHEI ${problemas.length} problema(s):`);
console.log('');
for (const p of problemas) console.log('  · ' + p);
console.log('');
console.log('Script que falta não dá erro na tela: quem depende dele tem `try/catch`');
console.log('em volta e segue em frente fazendo menos do que deveria, calado.');
process.exit(1);
