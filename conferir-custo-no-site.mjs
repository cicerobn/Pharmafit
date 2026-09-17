#!/usr/bin/env node
/* ===========================================================================
   CONFERIR QUE O PREÇO DE COMPRA NÃO ESTÁ NO SITE
   ===========================================================================

   O site é estático: tudo que está no código dele qualquer visitante lê,
   abrindo o arquivo no navegador. E a chave que o site usa para falar com
   o banco também está lá dentro — ela é pública por natureza.

   Então há dois jeitos de o preço de compra escapar, e os dois já
   aconteceram neste projeto:

     1. ESCRITO NO ARQUIVO. `assets/js/catalogo.js` tinha doze linhas
        "custo: 520". O comentário em cima delas dizia "nunca aparece no
        site" — verdade para a TELA, mentira para o ARQUIVO.

     2. PEDIDO AO BANCO. O site lia a tabela `pf_produtos` com `select
        *`, e a regra de leitura liberava a linha inteira. Medido em
        17/09/2026 com a chave do visitante: custo de todos os 11
        produtos, incluindo Retatrutide (custo 2060, venda 3249).

   Esta conferência fecha os dois, e fecha pela FORMA — não por uma lista
   de nomes de arquivo que eu teria de lembrar de atualizar:

     · nenhum `custo: <número>` em arquivo que o site serve;
     · nenhuma leitura da TABELA de produtos ou de pedidos no código do
       site: para isso existem as vistas `pf_produtos_publico` e
       `pf_pedidos_meus`, que não têm a coluna.

   O que ela NÃO proibe, de propósito: GRAVAR pedido (`inserir`), que é a
   compra acontecendo, e falar da palavra "custo" em comentário. Proibir
   comentário sobre o assunto seria proibir explicar o assunto.

   COMO RODAR:  node conferir-custo-no-site.mjs
   =========================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/* ---------- os arquivos que o site serve ---------- */

/* Derivado da FORMA: o site é a raiz (.html) mais a pasta assets/. A
   pasta gestao/ é o painel, que roda com o login da equipe e PODE ler
   custo; a vendor/ é biblioteca de terceiro, que eu não escrevi. */
function arquivosDoSite() {
  const achados = [];

  for (const f of readdirSync('.')) {
    if (extname(f) === '.html') achados.push(f);
  }

  (function andar(dir) {
    for (const f of readdirSync(dir)) {
      const caminho = join(dir, f);
      if (statSync(caminho).isDirectory()) {
        if (f === 'vendor') continue;
        andar(caminho);
        continue;
      }
      if (['.js', '.html', '.css'].includes(extname(f))) achados.push(caminho);
    }
  })('assets');

  return achados.sort();
}

/* ---------- o que não pode aparecer ---------- */

const PROIBIDO = [
  {
    /* `custo: 520` é dado. `custo` no meio de uma frase é explicação. A
       diferença está nos dois-pontos seguidos de número. */
    re: /\bcusto\s*:\s*-?\d/g,
    recado: 'preço de compra escrito dentro do arquivo',
    porque: 'qualquer pessoa abre este arquivo no navegador e lê o número. ' +
            'O preço de compra mora na coluna `custo` de pf_produtos, que só a equipe lê.'
  },
  {
    /* a tabela, em vez da vista */
    re: /(?:from\(\s*['"]pf_produtos['"]|buscar\(\s*['"]produtos['"])/g,
    recado: 'leitura da TABELA de produtos',
    porque: 'a tabela traz a coluna de custo. O site lê `produtos_publico` ' +
            '(a vista sem custo).'
  },
  {
    /* pedidos: LER a tabela é proibido; gravar não passa por aqui */
    re: /from\(\s*['"]pf_pedidos['"]\s*\)\s*\.\s*select/g,
    recado: 'leitura da TABELA de pedidos',
    porque: 'a tabela traz o custo daquele pedido. O site lê `pf_pedidos_meus`.'
  }
];

/* ---------- conferir ---------- */

const arquivos = arquivosDoSite();
if (!arquivos.length) {
  console.error('Não achei arquivo nenhum do site — isto é suspeito.');
  process.exit(2);
}

const achados = [];

for (const arq of arquivos) {
  const texto = readFileSync(arq, 'utf8');
  const linhas = texto.split('\n');

  for (const p of PROIBIDO) {
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(texto)) !== null) {
      const linha = texto.slice(0, m.index).split('\n').length;
      achados.push({
        arq, linha, recado: p.recado, porque: p.porque,
        trecho: (linhas[linha - 1] || '').trim().slice(0, 78)
      });
    }
  }
}

console.log(`  ${arquivos.length} arquivos do site conferidos`);

if (!achados.length) {
  console.log('  ok    nenhum preço de compra no código do site');
  console.log('  ok    e nenhuma leitura das tabelas que trazem custo');
  process.exit(0);
}

console.log('');
console.log(`  ACHEI ${achados.length} lugar(es) onde o preço de compra escapa:`);
console.log('');
for (const a of achados) {
  console.log(`  ${a.arq}:${a.linha} — ${a.recado}`);
  console.log(`      ${a.trecho}`);
  console.log(`      ${a.porque}`);
  console.log('');
}
console.log('O site é estático: o que estiver no código dele o visitante lê.');
process.exit(1);
