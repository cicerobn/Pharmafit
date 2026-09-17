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

   COMO RODAR:  node conferir-scripts.mjs
   =========================================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PASTA = 'assets/js';

/* ---------- o que cada script declara precisar ---------- */

const precisa = new Map();

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

if (!precisa.size) {
  console.error('Nenhum script declara "precisa:" — ou a declaração sumiu, ou o');
  console.error('jeito de escrever mudou. Sem declaração esta conferência aprova');
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
}

console.log(`  ${paginas.length} páginas, ${precisa.size} script(s) com dependência declarada:`);
for (const [s, d] of precisa) console.log(`    ${s}.js precisa de ${d.join(', ')}`);

if (!problemas.length) {
  console.log('  ok    toda página carrega o que os scripts dela precisam');
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
