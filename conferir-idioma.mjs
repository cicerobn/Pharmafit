#!/usr/bin/env node
/* ===========================================================================
   CONFERIR IDIOMA — texto novo não entra sem tradução
   ===========================================================================

   O site fala português do Brasil e espanhol do Paraguai. A tradução é
   um dicionário de frases exatas (assets/js/idioma-es.js), e o risco
   dele é simples: alguém escreve uma frase nova numa página, esquece o
   dicionário, e o site em espanhol passa a ter um pedaço em português.

   Meio traduzido é pior que não traduzido: o cliente paraguaio acha que
   quebrou.

   Esta conferência lê as 16 páginas e exige que toda frase de tela
   esteja no dicionário — ou esteja na lista de coisas que NÃO se
   traduzem (nome de produto, dose, marca, telefone, dinheiro).

   O QUE ELA NÃO ALCANÇA, E ONDE ISSO É COBERTO

   Boa parte da tela é escrita pelo JavaScript na hora: a vitrine, o
   carrinho, os recados de erro. Nada disso está no HTML, então nenhuma
   leitura de arquivo acha. Quem confere aquilo é a medição no
   navegador, que abre as 16 páginas em espanhol e lista o que sobrou
   em português — foi ela que achou as 66 frases que faltavam, e a
   última delas ("Idioma do site", num aria-label) que o olho não veria.

   Aqui fica a parte que roda sem navegador, na publicação.

   COMO RODAR:  node conferir-idioma.mjs
   =========================================================================== */

import { readFileSync, readdirSync } from 'node:fs';

/* ---------- o dicionário ---------- */

const fonte = readFileSync('assets/js/idioma-es.js', 'utf8');

function pegarObjeto(texto, marca) {
  const i = texto.indexOf(marca);
  if (i === -1) return null;
  const abre = texto.indexOf('{', i);
  let nivel = 0, fim = -1;
  for (let k = abre; k < texto.length; k++) {
    if (texto[k] === '{') nivel++;
    else if (texto[k] === '}') { nivel--; if (!nivel) { fim = k; break; } }
  }
  if (fim === -1) return null;
  return JSON.parse(texto.slice(abre, fim + 1));
}

const DICIONARIO = pegarObjeto(fonte, 'window.PHARMAFIT_ES =');
if (!DICIONARIO) {
  console.error('Não consegui ler o dicionário de assets/js/idioma-es.js.');
  process.exit(2);
}

/* Os padrões: frase com número ou nome dentro. Lidos do mesmo arquivo,
   para não existirem em dois lugares e envelhecerem em um deles. */
const PADROES = [...fonte.matchAll(/\{\s*pt:\s*\/(.+?)\/\s*,\s*es:/g)]
  .map((m) => new RegExp(m[1]));

/* ---------- o que NÃO se traduz ---------- */

const NAO_TRADUZ = [
  /^R\$/, /^US\$/, /^G\$/, /^AR\$/,                    /* dinheiro */
  /^\(?\d[\d\s().+-]{5,}$/,                             /* telefone */
  /^PHARMA FIT$/i, /^Pharma Fit$/,                      /* a marca */
  /^\d+$/, /^\d+%$/, /^[·•|—–\-+/,.:;!?()]+$/,
  /^[A-Z]{1,3}$/, /^\d+x$/,
  /^(Pix|WhatsApp|Instagram|e-?mail|PIX|USDT)$/i,
  /^(Tirzec|Tirzedral|Gluconex|Lipoland|Lipoless|Klow|GHK-Cu|TG|Glow|Retatrutide|Alluvi|ZPHC)/i,
  /* rótulo CURTO de dose ou apresentação. Curto de propósito: com a
     regra larga (/mg\b/) a conferência escondeu "Caneta aplicadora de
     tirzepatida 15 mg, pronta para uso.", que estava em português numa
     tela em espanhol. Isenção larga dá o verde errado. */
  (x) => x.length <= 26 && /\d\s*(mg|ml|mcg|ui)\b/i.test(x),
  (x) => x.length <= 26 && /\b(ampolas?|Pen|frasco|caixa)\b/i.test(x),
];

const isento = (x) => NAO_TRADUZ.some((r) => (typeof r === 'function' ? r(x) : r.test(x)));
const cobrePadrao = (x) => PADROES.some((re) => re.test(x));

/* ---------- ler as páginas ---------- */

function frasesDe(html) {
  let t = html;
  t = t.replace(/<script[\s\S]*?<\/script>/g, ' ');
  t = t.replace(/<style[\s\S]*?<\/style>/g, ' ');
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  t = t.replace(/<svg[\s\S]*?<\/svg>/g, ' ');

  const achadas = [];
  for (const m of t.matchAll(/>([^<>]+)</g)) achadas.push(m[1]);
  for (const m of t.matchAll(/(?:placeholder|aria-label|title|alt)="([^"]+)"/g)) achadas.push(m[1]);

  return achadas
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter((x) => x && /[A-Za-zÀ-ú]{2}/.test(x));
}

const paginas = readdirSync('.').filter((f) => f.endsWith('.html')).sort();
if (!paginas.length) {
  console.error('Não achei página nenhuma — isto é suspeito.');
  process.exit(2);
}

const faltando = new Map();
let olhadas = 0;

for (const p of paginas) {
  for (const f of frasesDe(readFileSync(p, 'utf8'))) {
    olhadas++;
    if (DICIONARIO[f] !== undefined) continue;
    if (cobrePadrao(f)) continue;
    if (isento(f)) continue;
    if (!faltando.has(f)) faltando.set(f, []);
    if (!faltando.get(f).includes(p)) faltando.get(f).push(p);
  }
}

/* ---------- o recado ---------- */

console.log(`  ${paginas.length} páginas, ${olhadas} textos, ` +
            `${Object.keys(DICIONARIO).length} frases no dicionário`);

if (!faltando.size) {
  console.log('  ok    toda frase de tela tem tradução (ou é nome/marca/dose)');
  console.log('');
  console.log('        O texto que o JavaScript escreve na hora é conferido');
  console.log('        abrindo as páginas em espanhol e medindo o que sobrou —');
  console.log('        isso precisa de navegador e roda fora da publicação.');
  process.exit(0);
}

console.log('');
console.log(`  ACHEI ${faltando.size} frase(s) de tela sem tradução:`);
console.log('');
for (const [f, pgs] of faltando) {
  console.log(`  ${JSON.stringify(f)}: "",   // ${pgs.join(', ')}`);
}
console.log('');
console.log('Ponha cada uma em assets/js/idioma-es.js — ou, se for nome de');
console.log('produto, marca ou dose, acrescente ao NAO_TRADUZ deste arquivo.');
console.log('Site meio traduzido é pior que site sem tradução: o cliente');
console.log('paraguaio acha que quebrou.');
process.exit(1);
