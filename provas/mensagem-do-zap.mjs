/* A MENSAGEM QUE CHEGA NO WHATSAPP DA EQUIPE.
 *
 * Pedido deles, 14/10/2026, repassado pelo Brian com o print da conversa:
 * "Exemplo o que seria útil pra mim: 1 Produto interessado, 2 Forma de
 * pagamento, 3 Localização de entrega, 4 WhatsApp".
 *
 * Aqui o carrinho é aberto de verdade, o pedido é fechado de verdade, e o
 * que se mede é o TEXTO que vai no link do WhatsApp — que é a única coisa
 * que a pessoa que atende vai ver.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const RAIZ = '/home/user/pharmafit';
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const sv = createServer(async (q, r) => {
  let c = decodeURIComponent(q.url.split('?')[0]); if (c.endsWith('/')) c += 'index.html';
  const a = join(RAIZ, normalize(c).replace(/^(\.\.[/\\])+/, ''));
  try { const b = await readFile(a); r.writeHead(200, { 'content-type': T[extname(a)] || 'application/octet-stream' }); r.end(b); }
  catch { r.writeHead(404); r.end('nao achei'); }
});
await new Promise((ok) => sv.listen(0, ok));
const base = `http://127.0.0.1:${sv.address().port}`;

let ok = 0, mal = 0;
const diz = (bom, texto, extra) => {
  console.log(`  ${bom ? 'ok  ' : 'FALHOU'} ${texto}${extra ? '  — ' + extra : ''}`);
  bom ? ok++ : mal++;
};

const nav = await chromium.launch();

async function abrirCarrinho(jaGuardado) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 900 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const r of ['**/cdn.jsdelivr.net/**', '**/fonts.g*/**', '**/wa.me/**'])
    await ctx.route(r, (x) => x.abort());
  await ctx.route('**/auth/v1/**', (rota) => rota.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ user: null, session: null }) }));
  const gravado = [];
  await ctx.route('**/rest/v1/**', async (rota) => {
    if (rota.request().method() === 'POST') gravado.push(rota.request().postDataJSON());
    return rota.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
  });
  /* o pagamento no site não está ligado neste teste: o que se mede aqui é o
     caminho do WhatsApp */
  await ctx.route('**/functions/v1/**', (rota) => rota.fulfill({
    status: 503, contentType: 'application/json',
    body: JSON.stringify({ erro: 'gateway ainda nao configurado', falta: 'PF_GATEWAY_CHAVE' }) }));

  await ctx.addInitScript((meus) => {
    localStorage.setItem('pharmafit_carrinho', JSON.stringify(
      [{ nome: 'Tirzedral 15 mg — 4 ampolas', quantidade: 1 }]));
    if (meus) localStorage.setItem('pharmafit_meus_dados', JSON.stringify(meus));
  }, jaGuardado || null);

  const pag = await ctx.newPage();
  const erros = [];
  pag.on('pageerror', (e) => erros.push(String(e)));
  await pag.goto(`${base}/carrinho.html`, { waitUntil: 'load' });
  await pag.waitForTimeout(1500);
  return { ctx, pag, erros, gravado };
}

/** O texto do WhatsApp, decodificado — é isto que a equipe lê. */
const mensagem = async (pag) => {
  const href = await pag.locator('#fechar').getAttribute('href');
  const i = href.indexOf('text=');
  return i < 0 ? '' : decodeURIComponent(href.slice(i + 5));
};

/* ==========  1. a mensagem, com os quatro itens na ordem  ========== */
console.log('\n===========  a mensagem que a equipe pediu  ===========');
{
  const { ctx, pag, erros } = await abrirCarrinho();

  await pag.click('#fechar');
  await pag.waitForTimeout(700);
  diz(await pag.locator('[data-campo-pagamento]').isVisible(),
    'o caminho do WhatsApp mostra o campo da forma de pagamento');

  await pag.fill('#ct-nome', 'Marcielle');
  await pag.fill('#ct-zap', '(92) 99138-2663');
  await pag.fill('#ct-endereco', 'Rua Itu número 55, Redenção — CEP 69047470');
  await pag.selectOption('#ct-pagamento', 'PIX');
  await pag.waitForTimeout(400);
  await pag.click('#fechar');
  await pag.waitForTimeout(800);

  const texto = await mensagem(pag);
  console.log('\n--- o que chega no WhatsApp da equipe ---');
  console.log(texto.split('\n').map((l) => '    | ' + l).join('\n'));
  console.log('');

  const p = {
    produto: texto.indexOf('*1. Produto*'),
    pagamento: texto.indexOf('*2. Forma de pagamento*'),
    entrega: texto.indexOf('*3. Entrega*'),
    zap: texto.indexOf('*4. WhatsApp*'),
  };
  diz(p.produto > 0 && p.pagamento > 0 && p.entrega > 0 && p.zap > 0,
    'os quatro itens que eles pediram estão na mensagem');
  diz(p.produto < p.pagamento && p.pagamento < p.entrega && p.entrega < p.zap,
    'e na ORDEM que eles pediram: produto, pagamento, entrega, WhatsApp');

  diz(texto.indexOf('1× Tirzedral 15 mg — 4 ampolas') > 0, '1 · o produto, com a quantidade');
  /* O TOTAL VEM DA TELA, nao chumbado no teste. Eu havia escrito 899,00,
     que e o preco do print do Brian — o catalogo hoje tem 999,00, e o teste
     reprovou a mensagem CERTA. Chumbar preco em teste e prometer que o preco
     nunca muda. */
  const totalNaTela = (await pag.locator('#resumo-total').textContent()).trim();
  const limpo = (s) => s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  diz(limpo(texto).indexOf('Total: ' + limpo(totalNaTela)) > 0,
    '    e o total, igual ao que o resumo mostra', totalNaTela);
  diz(texto.slice(p.pagamento, p.entrega).indexOf('PIX') > 0, '2 · a forma de pagamento escolhida');
  diz(texto.slice(p.entrega, p.zap).indexOf('Rua Itu número 55') > 0, '3 · o endereço de entrega');
  diz(texto.slice(p.zap).indexOf('(92) 99138-2663') > 0, '4 · o WhatsApp de quem comprou');
  diz(texto.split('\n')[0].indexOf('Marcielle') > 0,
    'e o nome subiu para a saudação, fora do caminho dos quatro',
    texto.split('\n')[0]);
  diz(texto.indexOf('Nome:') < 0 && texto.indexOf('Entrega: Rua') < 0,
    'as linhas soltas de antes (Nome:, WhatsApp:, Entrega:) sumiram');
  diz(erros.length === 0, `nenhum erro de JavaScript${erros.length ? ': ' + erros[0] : ''}`);
  await ctx.close();
}

/* ==========  2. sem escolher a forma, o pedido não vai  ========== */
console.log('\n===========  a forma de pagamento é obrigatória no WhatsApp  ===========');
{
  const { ctx, pag, gravado } = await abrirCarrinho();
  await pag.click('#fechar');
  await pag.waitForTimeout(700);
  await pag.fill('#ct-nome', 'Marcielle');
  await pag.fill('#ct-zap', '(92) 99138-2663');
  await pag.fill('#ct-endereco', 'Rua Itu 55');
  /* a lista fica sem escolher, de propósito */
  await pag.click('#fechar');
  await pag.waitForTimeout(700);
  diz(await pag.locator('#enviado').isHidden(), 'o pedido NÃO é dado por enviado');
  diz(gravado.length === 0, 'e nada é gravado', `${gravado.length}`);
  const recado = await pag.locator('.field__erro').first().textContent().catch(() => '');
  diz(/forma de pagamento/i.test(recado || ''), 'e a tela diz o que falta',
    (recado || '(nada)').trim());
  await ctx.close();
}

/* ==========  3. no PIX o campo nem aparece  ========== */
console.log('\n===========  no caminho do PIX, perguntar seria bobagem  ===========');
{
  const ctx2 = await nav.newContext({ viewport: { width: 390, height: 900 } });
  await ctx2.close();
  const { ctx, pag } = await abrirCarrinho();
  /* o botão do PIX está escondido neste teste (gateway respondendo 503),
     então eu chamo o mesmo pedido que ele faz */
  const visivel = await pag.evaluate(() => {
    window.PharmaFitContato.pedir(false);
    var caixa = document.querySelector('[data-campo-pagamento]');
    return { form: !document.querySelector('[data-contato]').hidden, pagamento: !caixa.hidden };
  });
  diz(visivel.form === true, 'o formulário aparece');
  diz(visivel.pagamento === false,
    'mas o campo da forma de pagamento NÃO — quem tocou em "Pagar com PIX" já respondeu isso');
  await ctx.close();
}

/* ==========  4. quem já comprou antes continua com um toque  ========== */
console.log('\n===========  quem já escolheu uma vez  ===========');
{
  const { ctx, pag, gravado } = await abrirCarrinho({
    nome: 'Cliente Que Volta', telefone: '(92) 98590-4669',
    endereco: 'Rua de Sempre, 20 — Manaus', pagamento: 'Dinheiro na entrega',
  });
  diz(await pag.locator('[data-contato]').isHidden(), 'o formulário nem aparece ao abrir');
  await pag.click('#fechar');
  await pag.waitForTimeout(900);
  diz(await pag.locator('#enviado').isVisible(),
    'um toque só e o pedido vai — o campo novo não quebrou isso');
  diz(await pag.locator('[data-contato]').isHidden(), 'e o formulário continua fora da tela');
  const texto = await mensagem(pag);
  diz(texto.indexOf('Dinheiro na entrega') > 0,
    'com a forma de pagamento que o aparelho guardou',
    texto.split('\n').filter((l) => /Dinheiro/.test(l))[0] || '(não achei)');
  diz(gravado.length >= 1, 'e a fila do painel recebeu o pedido', `${gravado.length} gravação(ões)`);
  await ctx.close();
}

console.log(`\n${mal ? 'FALTA CONSERTAR' : 'Tudo passou'} — ${ok} ok, ${mal} falhou`);
await nav.close();
sv.close();
process.exit(mal ? 1 : 0);
