#!/usr/bin/env node
/* ===========================================================================
   CONFERIR QUE O MENU É O MESMO EM TODA PÁGINA
   ===========================================================================

   A barra lateral e a barra de baixo estão escritas à mão dentro de cada
   uma das 16 páginas. Dezesseis cópias da mesma coisa, mantidas por
   memória — e elas DESENCONTRARAM.

   Medido em 17/09/2026: em 13 das 16 páginas a barra lateral não tinha
   Atendimento nem Conta. Só a página inicial e a de produtos tinham o
   menu completo; a página de erro tinha um item só. O visitante que
   abrisse o menu no carrinho via um site menor do que o site é, e não
   havia erro nenhum na tela para alguém notar.

   Esta conferência não pede que o menu seja bonito nem completo. Ela
   pede uma coisa só: que seja IGUAL em todas. Se o menu certo é com
   oito itens ou com três, quem decide é o Brian; que ele seja o mesmo
   em toda página é o que impede o site de mentir sobre si mesmo.

   O que ela IGNORA, de propósito: a marca de "você está aqui"
   (`is-active`, `aria-current`). Essa tem de ser diferente em cada
   página — é a única diferença legítima entre as cópias.

   COMO RODAR:  node conferir-menus.mjs
   =========================================================================== */

import { readFileSync, readdirSync } from 'node:fs';

/* ---------- ler os menus de uma página ---------- */

function itensDe(html, bloco) {
  const re = bloco === 'gaveta'
    ? /<nav class="drawer__nav"[^>]*>([\s\S]*?)<\/nav>/
    : /<nav class="tabbar"[^>]*>([\s\S]*?)<\/nav>/;
  const m = html.match(re);
  if (!m) return null;

  const itens = [];
  for (const a of m[1].matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    /* A BARRA DA FRENTE NÃO CONTA.
       A página de erro usa caminho absoluto ("/carrinho.html") de
       propósito: ela pode ser servida em /qualquer/endereco/que/nao/
       existe, e ali "carrinho.html" resolveria para
       /qualquer/endereco/carrinho.html. É a única diferença legítima
       de destino entre as cópias, então eu comparo sem ela — senão
       esta conferência exigiria que eu quebrasse o 404 para ela ficar
       verde. Conferência que pede defeito não serve. */
    const destino = a[1].split(/[?#]/)[0].replace(/^\//, '');
    /* o rótulo é o texto que sobra depois de tirar os desenhos */
    const rotulo = a[2]
      .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    itens.push(destino + ' = ' + rotulo);
  }
  return itens;
}

const paginas = readdirSync('.').filter((f) => f.endsWith('.html')).sort();
if (!paginas.length) {
  console.error('Não achei página nenhuma — isto é suspeito.');
  process.exit(2);
}

const problemas = [];

for (const bloco of ['gaveta', 'barra de baixo']) {
  const porPagina = new Map();
  for (const p of paginas) {
    const itens = itensDe(readFileSync(p, 'utf8'), bloco === 'gaveta' ? 'gaveta' : 'barra');
    if (itens === null) continue;          /* página sem esse bloco */
    porPagina.set(p, itens.join('  ·  '));
  }
  if (!porPagina.size) {
    problemas.push(`nenhuma página tem ${bloco} — isto é suspeito`);
    continue;
  }

  /* a versão que a MAIORIA tem é a referência: se uma página divergir,
     é ela que está errada; se todas divergirem, o recado mostra o mapa */
  const contagem = new Map();
  for (const v of porPagina.values()) contagem.set(v, (contagem.get(v) || 0) + 1);
  const [referencia] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0];

  const fora = [...porPagina.entries()].filter(([, v]) => v !== referencia);

  console.log(`  ${bloco}: ${porPagina.size} páginas, ` +
              `${contagem.size === 1 ? 'todas iguais' : contagem.size + ' versões diferentes'}`);

  for (const [p, v] of fora) {
    const ref = referencia.split('  ·  ');
    const meu = v.split('  ·  ');
    const faltam = ref.filter((x) => !meu.includes(x));
    const sobram = meu.filter((x) => !ref.includes(x));
    problemas.push(
      `${p}: a ${bloco} não é igual à das outras` +
      (faltam.length ? `\n      faltam: ${faltam.join(', ')}` : '') +
      (sobram.length ? `\n      sobram: ${sobram.join(', ')}` : '')
    );
  }
}

if (!problemas.length) {
  console.log('  ok    o menu é o mesmo em toda página');
  process.exit(0);
}

console.log('');
console.log(`  ACHEI ${problemas.length} problema(s):`);
console.log('');
for (const p of problemas) console.log('  · ' + p);
console.log('');
console.log('Menu que muda de página para página faz o site parecer menor do que é,');
console.log('e não dá erro nenhum na tela para alguém notar.');
process.exit(1);
