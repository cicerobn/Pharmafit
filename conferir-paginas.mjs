#!/usr/bin/env node
/* ===========================================================================
   CONFERIR PÁGINAS — o texto que o WhatsApp mostra ao compartilhar
   ===========================================================================

   POR QUE ISTO EXISTE

   Páginas novas nascem de uma página que já existe: eu copio o esqueleto
   de uma pronta (topo, menu, barra de baixo) e troco o conteúdo. O
   conteúdo eu troco — o cabeçalho invisível eu esqueci.

   Cinco páginas ficaram assim. `produto.html`, `carrinho.html`,
   `entrar.html` e `criar-conta.html` nasceram de `privacidade.html`, e
   as quatro diziam ao WhatsApp que eram "Seus dados — Pharma Fit ·
   Como a Pharma Fit trata as informações dos clientes". A `404.html`
   nasceu de `atendimento.html` e se anunciava como atendimento.

   Isso não aparece na tela: aparece no quadradinho de pré-visualização
   quando o cliente manda o link para alguém. E a página que mais se
   compartilha é justamente a do produto — o negócio todo fecha no
   WhatsApp.

   A REGRA, E POR QUE ELA NÃO ENVELHECE

   Duas páginas diferentes não podem ter o mesmo texto de
   compartilhamento. Não é uma lista de páginas nem de textos certos —
   dessas eu já vi três apodrecerem neste projeto. É uma pergunta que se
   responde sozinha com o que estiver no repositório: se eu copiar um
   esqueleto amanhã e esquecer o cabeçalho de novo, o texto repetido
   aparece e a publicação para.

   COMO RODAR:  node conferir-paginas.mjs
   =========================================================================== */

import { readFileSync, readdirSync } from 'node:fs';

const pegar = (html, re) => {
  const m = re.exec(html);
  return m ? m[1].trim() : '';
};

const CAMPOS = [
  { nome: 'título da aba',            re: /<title>([^<]*)<\/title>/ },
  { nome: 'descrição',                re: /<meta\s+name="description"\s+content="([^"]*)"/ },
  { nome: 'título ao compartilhar',   re: /<meta\s+property="og:title"\s+content="([^"]*)"/ },
  { nome: 'descrição ao compartilhar',re: /<meta\s+property="og:description"\s+content="([^"]*)"/ },
];

const paginas = readdirSync('.').filter((f) => f.endsWith('.html')).sort();
if (!paginas.length) {
  console.error('Não achei página nenhuma — isto é suspeito.');
  process.exit(2);
}

const problemas = [];

/* ---- 1. nenhum campo em branco ---- */
const lido = new Map();
for (const p of paginas) {
  const html = readFileSync(p, 'utf8');
  const valores = {};
  for (const c of CAMPOS) {
    valores[c.nome] = pegar(html, c.re);
    if (!valores[c.nome]) {
      problemas.push(`${p}: ${c.nome} está em branco`);
    }
  }
  lido.set(p, valores);
}

/* ---- 2. duas páginas não repetem o texto de compartilhamento ----
   O `<title>` da aba entra também: duas abas com o mesmo nome já é
   sinal de esqueleto copiado sem trocar nada. */
for (const c of CAMPOS) {
  const porTexto = new Map();
  for (const [p, v] of lido) {
    const t = v[c.nome];
    if (!t) continue;
    if (!porTexto.has(t)) porTexto.set(t, []);
    porTexto.get(t).push(p);
  }
  for (const [texto, quais] of porTexto) {
    if (quais.length > 1) {
      problemas.push(
        `${quais.join(' e ')} têm o MESMO ${c.nome}: "${texto.slice(0, 60)}"` +
        ` — uma delas nasceu da outra e ficou com o cabeçalho da irmã`
      );
    }
  }
}

/* ---- 3. o nome da casa está lá ----
   Sem isso a pré-visualização sai sem marca nenhuma. */
for (const [p, v] of lido) {
  const t = v['título ao compartilhar'];
  if (t && !/pharma\s*fit/i.test(t)) {
    problemas.push(`${p}: o título ao compartilhar não diz "Pharma Fit" ("${t}")`);
  }
}

/* ---------------------------------------------------------------- */

if (!problemas.length) {
  console.log(`  ok    ${paginas.length} páginas: cada uma se anuncia como ela mesma`);
  console.log('');
  console.log('        (título da aba, descrição e os dois textos de compartilhar,');
  console.log('         todos preenchidos e nenhum repetido entre páginas)');
  process.exit(0);
}

console.log(`  ACHEI ${problemas.length} problema(s) no cabeçalho das páginas:`);
problemas.forEach((p) => console.log(`          · ${p}`));
console.log('');
console.log('Isto não aparece na tela — aparece no quadradinho que o WhatsApp');
console.log('mostra quando o cliente manda o link para alguém.');
process.exit(1);
