#!/usr/bin/env node
/* ===========================================================================
   CONFERIR LISTAS — tabela nova não pode ficar fora do backup
   ===========================================================================

   POR QUE ISTO EXISTE

   Criar uma tabela nova no painel exige tocar em DUAS listas escritas à
   mão, dentro de `gestao/assets/ajustes.js`:

     TABELAS   — o que o teste de conexão confere
     COLECOES  — o que a cópia de segurança baixa

   Esquecer a primeira dá um teste de conexão incompleto: chato, visível.
   Esquecer a SEGUNDA é o estrago de verdade: o backup sai sem aquela
   tabela e não avisa. O arquivo parece certo, tem as outras tabelas
   dentro, e só no dia de precisar dele é que se descobre o buraco. Foi
   exatamente o risco que eu criei hoje ao acrescentar
   `pf_atendimentos` — os pedidos de atendimento ficariam fora da cópia.

   O QUE ELA CONFERE

   1. as duas listas têm os mesmos nomes
   2. TODA coleção que o painel realmente lê aparece nas duas

   O item 2 é o que faz esta conferência valer: a lista de verdade não é
   escrita aqui, ela é LIDA do código (`Dados.listar('x')` e `T('x')`
   pelos arquivos da gestão). Lista conferida contra lista continuaria
   deixando passar o que falta nas duas.

   COMO RODAR:  node conferir-listas.mjs
   =========================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = process.cwd();
const FONTE = 'gestao/assets/ajustes.js';

/* ---------- as duas listas escritas à mão ---------- */

const ajustes = readFileSync(join(RAIZ, FONTE), 'utf8');

function listaDeNomes(marca) {
  const i = ajustes.indexOf(marca);
  if (i === -1) return null;
  const abre = ajustes.indexOf('[', i);
  const fecha = ajustes.indexOf('];', abre);
  if (abre === -1 || fecha === -1) return null;
  const trecho = ajustes.slice(abre, fecha);
  /* pega `nome: 'x'` (TABELAS) e `'x'` solto (COLECOES) */
  const comRotulo = [...trecho.matchAll(/nome:\s*'([a-z_]+)'/g)].map((m) => m[1]);
  if (comRotulo.length) return new Set(comRotulo);
  return new Set([...trecho.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
}

const TABELAS = listaDeNomes('var TABELAS');
const COLECOES = listaDeNomes('var COLECOES');

if (!TABELAS || !COLECOES) {
  console.error(`Não consegui ler as listas TABELAS/COLECOES de ${FONTE}.`);
  process.exit(2);
}

/* ---------- o que o painel realmente lê ---------- */

function arquivosJs(dir, achados = []) {
  for (const nome of readdirSync(dir)) {
    if (['node_modules', '.git', 'vendor', 'dist'].includes(nome)) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosJs(caminho, achados);
    else if (nome.endsWith('.js')) achados.push(caminho);
  }
  return achados;
}

const usadas = new Map();   /* nome -> onde apareceu */
for (const caminho of arquivosJs(join(RAIZ, 'gestao'))) {
  const txt = readFileSync(caminho, 'utf8');
  const curto = relative(RAIZ, caminho);
  for (const re of [/\.listar\(\s*'([a-z_]+)'/g, /\bT\(\s*'([a-z_]+)'/g,
                    /\.atualizar\(\s*'([a-z_]+)'/g, /\.excluir\(\s*'([a-z_]+)'/g,
                    /\.inserir\(\s*'([a-z_]+)'/g]) {
    for (const m of txt.matchAll(re)) {
      if (!usadas.has(m[1])) usadas.set(m[1], curto);
    }
  }
}

/* `pessoal` e companhia podem aparecer por outros caminhos; o que
   importa é que nada LIDO fique fora das listas. */
const problemas = [];

for (const n of TABELAS) {
  if (!COLECOES.has(n)) {
    problemas.push(`"${n}" está em TABELAS e NÃO está em COLECOES — ` +
                   `ela fica fora da cópia de segurança`);
  }
}
for (const n of COLECOES) {
  if (!TABELAS.has(n)) {
    problemas.push(`"${n}" está em COLECOES e NÃO está em TABELAS — ` +
                   `o teste de conexão não confere essa tabela`);
  }
}
for (const [n, onde] of usadas) {
  if (!TABELAS.has(n) || !COLECOES.has(n)) {
    problemas.push(`o painel lê "${n}" (${onde}) e essa tabela não está ` +
                   `nas duas listas de ${FONTE}`);
  }
}

/* ---------- recado ---------- */

console.log(`  ${TABELAS.size} em TABELAS · ${COLECOES.size} em COLECOES · ` +
            `${usadas.size} coleções lidas pelo painel`);

if (!problemas.length) {
  console.log('  ok    toda tabela que o painel usa está no teste de conexão e no backup');
  process.exit(0);
}

console.log('');
console.log(`  ACHEI ${problemas.length} problema(s):`);
problemas.forEach((p) => console.log(`          · ${p}`));
console.log('');
console.log(`Conserto: acrescente o nome nas DUAS listas de ${FONTE}.`);
console.log('Ficar fora do backup é o pior dos dois: a cópia sai incompleta');
console.log('e não avisa, e isso só aparece no dia de precisar dela.');
process.exit(1);
