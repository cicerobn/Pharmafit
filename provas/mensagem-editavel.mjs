/* A MENSAGEM DO PEDIDO, EDITÁVEL PELO PAINEL.
 *
 * Brian, 15/10/2026, colando a mensagem que a equipe recebe: "aqui tem
 * que ter como editar no painel, a mensagem que aparece".
 *
 * Aqui são medidos os DOIS lados, em navegador de verdade:
 *
 *   1. O PAINEL — abre Configurações, carrega o texto que está valendo,
 *      mostra a prévia, recusa mensagem quebrada e salva na chave certa.
 *   2. O SITE — com um texto salvo no banco, a mensagem do WhatsApp sai
 *      com ele; com lixo no banco, sai a de fábrica. Porque a regra é
 *      essa: nenhuma venda pode depender de alguém ter preenchido o
 *      painel.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Onde está o Playwright — o `import` normal primeiro, o caminho desta
   máquina como reserva. Prova que só roda de uma pasta específica não é
   prova (ver provas/valor-da-notinha.mjs). */
let chromium;
const pegar = (m) => (m && (m.chromium || (m.default && m.default.chromium))) || null;
try {
  chromium = pegar(await import('playwright'));
  if (!chromium) throw new Error('sem chromium');
} catch (e) {
  try {
    chromium = pegar(await import('/opt/node-tools/node_modules/playwright/index.js'));
    if (!chromium) throw new Error('sem chromium');
  } catch (e2) {
    console.error('PROVA NÃO RODOU: não achei o Playwright.');
    console.error('Nada foi medido — isto NÃO é defeito do site.');
    process.exit(2);
  }
}

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json' };
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

const USUARIO = { id: 'u1', email: 'gestao@pharmafit.com', aud: 'authenticated',
  role: 'authenticated', app_metadata: {}, user_metadata: {} };
const corpoJwt = Buffer.from(JSON.stringify({
  sub: 'u1', email: USUARIO.email, role: 'authenticated', aud: 'authenticated', aal: 'aal1',
  exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000),
})).toString('base64url');
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + corpoJwt + '.assinatura-de-mentira';

const nav = await chromium.launch();

/* ================================================================
   1. O PAINEL
   ================================================================ */
async function abrirPainel(valorGuardado) {
  const ctx = await nav.newContext({ viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const r of ['**/cdn.jsdelivr.net/**', '**/fonts.g*/**', '**/wa.me/**'])
    await ctx.route(r, (x) => x.abort());

  const gravado = [];
  let config = valorGuardado === undefined ? [] : [{ id: 'c1', chave: 'publico_mensagem_zap', valor: valorGuardado }];

  await ctx.route('**/xqiujdwvmbaipxyzcpvt.supabase.co/**', async (rota) => {
    const req = rota.request();
    const p = new URL(req.url()).pathname;
    const json = (c, s = 200) => rota.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(c) });

    if (p.startsWith('/auth/v1/')) {
      if (p.includes('factors') || p.includes('mfa')) return json({ all: [], totp: [] });
      if (p.includes('/token')) return json({ access_token: JWT, token_type: 'bearer',
        expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'fake-refresh', user: USUARIO });
      if (p.includes('/user')) return json(USUARIO);
      return json({ user: USUARIO, aal: 'aal1', currentLevel: 'aal1', nextLevel: 'aal1',
                    currentAuthenticationMethods: [] });
    }
    if (p.startsWith('/rest/v1/')) {
      const tabela = p.replace('/rest/v1/', '').split('?')[0];
      if (req.method() === 'PATCH' || req.method() === 'POST') {
        let corpo = {}; try { corpo = req.postDataJSON(); } catch {}
        gravado.push({ tabela, metodo: req.method(), corpo });
        if (tabela === 'pf_configuracoes') {
          config = [{ id: 'c1', chave: corpo.chave || 'publico_mensagem_zap',
                      valor: corpo.valor !== undefined ? corpo.valor : '' }];
        }
        return json([corpo]);
      }
      if (tabela === 'pf_configuracoes') return json(config);
      if (tabela === 'pf_equipe') return json([{ id: 'u1', email: USUARIO.email, papel: 'ceo' }]);
      return json([]);
    }
    return json({});
  });

  const pag = await ctx.newPage();
  const erros = [];
  pag.on('pageerror', (e) => erros.push(String(e)));
  await pag.goto(`${base}/gestao/login.html`, { waitUntil: 'load' });
  await pag.waitForTimeout(800);
  await pag.fill('#email', USUARIO.email);
  await pag.fill('#senha', 'uma-senha-qualquer');
  await pag.click('#entrar');
  await pag.waitForTimeout(2500);
  await pag.goto(`${base}/gestao/app/configuracoes.html`, { waitUntil: 'load' });
  await pag.waitForTimeout(2000);
  return { ctx, pag, erros, gravado, config: () => config };
}

console.log('\n===========  o editor no painel  ===========');
{
  const { ctx, pag, erros, gravado } = await abrirPainel();
  const campo = pag.locator('[data-msg-texto]');
  const previa = pag.locator('[data-msg-previa]');

  diz(await campo.isVisible(), 'a seção "Mensagem do pedido" aparece em Configurações');

  const texto = await campo.inputValue();
  diz(texto.includes('{produtos}') && texto.includes('{total}'),
    'e vem com o texto que está valendo hoje');

  const p1 = (await previa.textContent()).trim();
  console.log('\n--- a prévia, como a equipe vê ---');
  console.log(p1.split('\n').map((l) => '    | ' + l).join('\n'));
  console.log('');
  diz(p1.includes('Gluconex') && p1.includes('R$ 999,00'),
    'a prévia mostra a mensagem pronta, com um pedido de exemplo');
  diz(!p1.includes('{'), 'e sem nenhuma chave sobrando na tela');
  diz(!p1.includes('Subtotal'), 'sem cupom, o bloco do desconto não aparece');

  await pag.check('[data-msg-com-cupom]');
  await pag.waitForTimeout(300);
  const p2 = (await previa.textContent()).trim();
  diz(p2.includes('Subtotal') && p2.includes('Cupom BEMVINDO'),
    'marcando "ver com cupom", o bloco do desconto entra');
  await pag.uncheck('[data-msg-com-cupom]');
  await pag.waitForTimeout(200);

  /* --- escrever um texto novo --- */
  const MEU = ['Oi! Sou {nome} e quero este pedido:', '', '{produtos}',
    'Dá {total}', '', 'Pago com {pagamento}', 'Entrego em {entrega}',
    'Meu zap: {whatsapp}'].join('\n');
  await campo.fill(MEU);
  await pag.waitForTimeout(400);
  const p3 = (await previa.textContent()).trim();
  diz(p3.startsWith('Oi! Sou Erika Cristina'), 'escrevendo outro texto, a prévia acompanha na hora');
  diz(/Dá R\$ 999,00/.test(p3), 'com o total no lugar certo');

  await pag.click('[data-msg-salvar]');
  await pag.waitForTimeout(900);
  const salvo = gravado.filter((g) => g.tabela === 'pf_configuracoes');
  console.log('    gravou: ' + JSON.stringify(salvo[salvo.length - 1] || null));
  diz(salvo.length === 1 && salvo[0].corpo.chave === 'publico_mensagem_zap',
    'salva na chave publico_mensagem_zap, que é a que o site lê');
  diz(salvo.length === 1 && salvo[0].corpo.valor === MEU, 'com o texto exato que foi escrito');
  diz(/Salvo/.test((await pag.locator('[data-msg-recado]').textContent()) || ''),
    'e a tela confirma', ((await pag.locator('[data-msg-recado]').textContent()) || '').trim());

  diz(erros.length === 0, `nenhum erro de JavaScript${erros.length ? ': ' + erros[0] : ''}`);
  /* print da SEÇÃO, e não da página inteira: o print de página inteira
     desenha a barra fixa do topo no meio do conteúdo e parece defeito
     que não existe. */
  await pag.locator('[data-msg-previa]').scrollIntoViewIfNeeded();
  await pag.waitForTimeout(400);
  await pag.screenshot({ path: join(RAIZ, 'provas', 'saida', 'mensagem-no-painel.png') });
  await ctx.close();
}

console.log('\n===========  o painel RECUSA mensagem quebrada  ===========');
{
  const { ctx, pag, gravado } = await abrirPainel();
  const campo = pag.locator('[data-msg-texto]');
  const recado = pag.locator('[data-msg-recado]');

  await campo.fill('Oi, quero um pedido. Meu zap é {whatsapp}.');
  await pag.waitForTimeout(400);
  const r1 = ((await recado.textContent()) || '').trim();
  console.log('    diz: ' + r1);
  diz(/\{produtos\}/.test(r1) && /\{total\}/.test(r1),
    'sem produto e sem total, avisa o que falta enquanto se escreve');
  await pag.click('[data-msg-salvar]');
  await pag.waitForTimeout(600);
  diz(gravado.filter((g) => g.tabela === 'pf_configuracoes').length === 0,
    'e NÃO salva — a equipe não recebe pedido sem saber do quê nem de quanto');

  await campo.fill('{produtos}\nTotal: {total}\nFalar com {gerente}');
  await pag.waitForTimeout(400);
  const r2 = ((await recado.textContent()) || '').trim();
  console.log('    diz: ' + r2);
  diz(/\{gerente\}/.test(r2), 'peça inventada é apontada pelo nome', '{gerente}');
  await pag.click('[data-msg-salvar]');
  await pag.waitForTimeout(600);
  diz(gravado.filter((g) => g.tabela === 'pf_configuracoes').length === 0,
    'e também não salva — ela sairia escrita assim na mensagem do cliente');

  /* --- e o botão de voltar ao de fábrica --- */
  await pag.click('[data-msg-padrao]');
  await pag.waitForTimeout(400);
  const voltou = await campo.inputValue();
  diz(voltou.includes('*1. Produto*') && voltou.includes('*4. WhatsApp*'),
    '"Voltar ao texto de fábrica" traz de volta as quatro seções da equipe');
  await pag.click('[data-msg-salvar]');
  await pag.waitForTimeout(800);
  const salvo = gravado.filter((g) => g.tabela === 'pf_configuracoes');
  diz(salvo.length === 1 && salvo[0].corpo.valor === '',
    'e salvar o texto de fábrica guarda VAZIO — assim o site usa o de fábrica de verdade',
    salvo.length ? JSON.stringify(salvo[0].corpo.valor) : '(não salvou)');
  await ctx.close();
}

/* ================================================================
   2. O SITE
   ================================================================ */
async function abrirCarrinho(modeloNoBanco) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 900 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const r of ['**/cdn.jsdelivr.net/**', '**/fonts.g*/**', '**/wa.me/**'])
    await ctx.route(r, (x) => x.abort());
  await ctx.route('**/auth/v1/**', (rota) => rota.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ user: null, session: null }) }));
  await ctx.route('**/functions/v1/**', (rota) => rota.fulfill({
    status: 503, contentType: 'application/json', body: '{"erro":"sem gateway"}' }));
  await ctx.route('**/rest/v1/**', async (rota) => {
    const req = rota.request();
    const tabela = new URL(req.url()).pathname.replace('/rest/v1/', '').split('?')[0];
    if (req.method() === 'POST') {
      return rota.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    if (tabela === 'pf_configuracoes' && modeloNoBanco !== undefined) {
      /* `maybeSingle()` pede UM objeto, não uma lista */
      return rota.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ valor: modeloNoBanco }) });
    }
    return rota.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await ctx.addInitScript(() => {
    localStorage.setItem('pharmafit_carrinho', JSON.stringify(
      [{ nome: 'Gluconex 15 mg — 4 ampolas', quantidade: 1 }]));
    localStorage.setItem('pharmafit_meus_dados', JSON.stringify({
      nome: 'Erika Cristina', telefone: '(92) 98427-2567',
      endereco: 'Rua Acácia-Vermelha, 23', pagamento: 'PIX' }));
  });

  const pag = await ctx.newPage();
  const erros = [];
  pag.on('pageerror', (e) => erros.push(String(e)));
  await pag.goto(`${base}/carrinho.html`, { waitUntil: 'load' });
  await pag.waitForTimeout(2000);
  return { ctx, pag, erros };
}

const mensagemDoLink = async (pag) => {
  const href = await pag.locator('#fechar').getAttribute('href');
  const i = href.indexOf('text=');
  return i < 0 ? '' : decodeURIComponent(href.slice(i + 5));
};

console.log('\n===========  o site obedece ao texto salvo  ===========');
{
  const MEU = ['Oi! Sou {nome} e quero este pedido:', '', '{produtos}',
    'Dá {total}', '', 'Pago com {pagamento}', 'Entrego em {entrega}',
    'Meu zap: {whatsapp}'].join('\n');
  const { ctx, pag, erros } = await abrirCarrinho(MEU);
  await pag.click('#fechar');
  await pag.waitForTimeout(1200);
  const texto = await mensagemDoLink(pag);
  console.log('\n--- o que chega no WhatsApp da equipe ---');
  console.log(texto.split('\n').map((l) => '    | ' + l).join('\n'));
  console.log('');
  diz(texto.startsWith('Oi! Sou Erika Cristina'), 'a mensagem sai com o texto que a equipe salvou');
  diz(texto.includes('1× Gluconex 15 mg — 4 ampolas'), 'com o produto de verdade do carrinho');
  /* o `R$` do site vem com espaço DURO (U+00A0), não com espaço comum:
     `/R\$ \d/` não casava e o teste reprovou a mensagem CERTA. Comparar
     texto de tela sem normalizar o espaço é armadilha de sempre. */
  const limpo = texto.replace(/\u00a0/g, ' ');
  diz(/Dá R\$ \d/.test(limpo), 'e o total de verdade',
    (limpo.match(/Dá R\$ [\d.,]+/) || [''])[0]);
  diz(texto.includes('Meu zap: (92) 98427-2567'), 'e o WhatsApp de quem comprou');
  diz(!texto.includes('*1. Produto*'), 'o texto de fábrica não aparece junto');
  diz(!texto.includes('{'), 'e nenhuma chave vazou para a mensagem');
  diz(erros.length === 0, `nenhum erro de JavaScript${erros.length ? ': ' + erros[0] : ''}`);
  await ctx.close();
}

console.log('\n===========  e nunca fica sem mensagem  ===========');
for (const [rotulo, modelo] of [
  ['banco sem nada guardado', undefined],
  ['texto vazio no banco', ''],
  ['texto sem o produto e sem o total', 'Oi, quero comprar. Meu zap é {whatsapp}.'],
]) {
  const { ctx, pag } = await abrirCarrinho(modelo);
  await pag.click('#fechar');
  await pag.waitForTimeout(1200);
  const texto = await mensagemDoLink(pag);
  const quatro = texto.indexOf('*1. Produto*') >= 0 && texto.indexOf('*2. Forma de pagamento*') >= 0 &&
                 texto.indexOf('*3. Entrega*') >= 0 && texto.indexOf('*4. WhatsApp*') >= 0;
  diz(quatro, `${rotulo}: sai a mensagem de fábrica, com as quatro seções`);
  diz(texto.includes('Gluconex'), `${rotulo}: e com o produto`);
  await ctx.close();
}

await nav.close();
sv.close();
console.log('\n    (print do editor em provas/saida/mensagem-no-painel.png)');
console.log(`\n${mal ? 'FALTA CONSERTAR' : 'Tudo passou'} — ${ok} ok, ${mal} falhou`);
process.exit(mal ? 1 : 0);
