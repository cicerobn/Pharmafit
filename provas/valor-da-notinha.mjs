/* O VALOR QUE O PAINEL SUGERE NA HORA DE CONFIRMAR.
 *
 * Brian, 15/10/2026, com o print da conversa da equipe: "tô tendo esse
 * problema no site do valor ficar diferente na notinha, aí sempre a
 * pessoa pergunta".
 *
 * Aqui o painel é aberto de verdade, com uma lista de produtos de
 * verdade (um produto com OPÇÕES, que é como o site vende as sete
 * marcas de ampola) e um pedido pendente de verdade. O que se mede é o
 * número que a caixa "Confirmar venda" oferece — porque é ele que vira
 * a notinha.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ONDE ESTÁ O PLAYWRIGHT.
 *
 * Esta prova abre um navegador, e o navegador vem do Playwright — que
 * não está instalado dentro do site (e não deve estar: o site é
 * estático e não tem `node_modules`). Nesta máquina ele mora em
 * /opt/node-tools. O `import 'playwright'` normal vem primeiro, para
 * quem tiver instalado do jeito comum; o caminho fixo é a reserva.
 *
 * Sem isto, a prova só rodava se chamada de uma pasta com um atalho
 * para o node_modules — ou seja, só do jeito que EU rodei, e ninguém
 * mais conseguiria repetir a medição. */
/* O `|| m.default` existe porque o Playwright é um pacote do formato
   antigo: importado por caminho, ele chega embrulhado em `default`, e
   sem desembrulhar o `chromium` vem vazio — foi exatamente o erro que
   esta linha conserta. */
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
    console.error('Instale com `npm i playwright` nesta pasta, ou rode de onde ele estiver.');
    console.error('Nada foi medido — isto NÃO é defeito do painel.');
    process.exit(2);
  }
}

/* a raiz do site, a partir deste arquivo: `provas/` fica dentro dela.
   Chumbar o caminho faz a prova só rodar na minha máquina. */
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

/* ---------- os dados que o banco devolveria ----------

   Um produto com opções, como o site vende: a vitrine mostra
   "Tirzepatida 15 mg — 1 ampola" e dentro dela estão as marcas. Cada
   marca tem preço PRÓPRIO. O nome que vai no pedido e na mensagem do
   WhatsApp é "<produto> (<opção>)". */
const PRODUTOS = [
  {
    id: 'p1', nome: 'Tirzepatida 15 mg — 1 ampola', categoria: 'Tirzepatida',
    preco: 300, custo: 180, antes: 0, estoque: null, ativo: true,
    opcoes: [
      { nome: 'Gluconex', preco: 349, custo: 200, estoque: null },
      { nome: 'Tirzedral', preco: 0, custo: 0, estoque: null },  /* herda o do produto */
    ],
  },
  {
    id: 'p2', nome: 'Gluconex 15 mg — 4 ampolas', categoria: 'Tirzepatida',
    preco: 999, custo: 600, antes: 1300, estoque: null, ativo: true, opcoes: [],
  },
];

/* Três pedidos pendentes: um de produto simples, um de OPÇÃO (que era o
   furo) e um de produto que não existe mais na lista. */
const PEDIDOS = [
  { id: 'd1', numero: 1001, cliente: 'Erika Cristina', telefone: '(92) 98427-2567',
    endereco: 'Rua Acácia-Vermelha, 23', produto: 'Gluconex 15 mg — 4 ampolas',
    quantidade: 1, valor: 0, status: 'pendente', origem: 'site',
    criado_em: new Date().toISOString() },
  { id: 'd2', numero: 1002, cliente: 'Marcielle', telefone: '(92) 99138-2663',
    endereco: 'Rua Itu, 55', produto: 'Tirzepatida 15 mg — 1 ampola (Gluconex)',
    quantidade: 2, valor: 0, status: 'pendente', origem: 'site',
    criado_em: new Date().toISOString() },
  { id: 'd3', numero: 1003, cliente: 'Cliente Antigo', telefone: '(92) 90000-0000',
    endereco: 'Rua Qualquer, 1', produto: 'Produto Que Saiu Da Lista',
    quantidade: 1, valor: 0, status: 'pendente', origem: 'site',
    criado_em: new Date().toISOString() },
];

/* Um JWT de mentira, mas com a FORMA certa: a biblioteca lê o `exp` de
   dentro dele para saber se a sessão vale. */
const corpoJwt = Buffer.from(JSON.stringify({
  sub: 'u1', email: 'gestao@pharmafit.com', role: 'authenticated', aud: 'authenticated',
  aal: 'aal1', exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
})).toString('base64url');
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + corpoJwt + '.assinatura-de-mentira';

import { mkdirSync } from 'node:fs';
mkdirSync(join(RAIZ, 'provas', 'saida'), { recursive: true });

const nav = await chromium.launch();

async function abrirPainel() {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
  for (const r of ['**/cdn.jsdelivr.net/**', '**/fonts.g*/**', '**/wa.me/**'])
    await ctx.route(r, (x) => x.abort());

  const pedidos = JSON.parse(JSON.stringify(PEDIDOS));
  const gravado = [];

  /* o Supabase inteiro, respondido daqui */
  await ctx.route('**/xqiujdwvmbaipxyzcpvt.supabase.co/**', async (rota) => {
    const req = rota.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const json = (corpo, status = 200) => rota.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(corpo) });

    if (p.startsWith('/auth/v1/')) {
      if (p.includes('factors') || p.includes('mfa')) return json({ all: [], totp: [] });
      if (p.includes('/token')) {
        /* a resposta que o Supabase dá a um login com senha certo */
        return json({ access_token: JWT, token_type: 'bearer', expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'fake-refresh', user: USUARIO });
      }
      if (p.includes('/user')) return json(USUARIO);
      return json({ user: USUARIO, aal: 'aal1', currentLevel: 'aal1', nextLevel: 'aal1',
                    currentAuthenticationMethods: [] });
    }

    if (p.startsWith('/rest/v1/')) {
      const tabela = p.replace('/rest/v1/', '').split('?')[0];
      if (req.method() === 'PATCH' || req.method() === 'POST') {
        let corpo = {}; try { corpo = req.postDataJSON(); } catch {}
        gravado.push({ tabela, metodo: req.method(), corpo });
        return json([corpo]);
      }
      if (tabela === 'pf_produtos' || tabela === 'pf_produtos_publico') return json(PRODUTOS);
      if (tabela === 'pf_pedidos' || tabela === 'pf_pedidos_meus') return json(pedidos);
      if (tabela === 'pf_equipe') return json([{ id: 'u1', email: USUARIO.email, papel: 'ceo' }]);
      if (tabela === 'pf_configuracoes') return json([]);
      return json([]);
    }
    return json({});
  });

  const USUARIO = { id: 'u1', email: 'gestao@pharmafit.com', aud: 'authenticated',
    role: 'authenticated', app_metadata: {}, user_metadata: {} };

  const pag = await ctx.newPage();
  const erros = [];
  pag.on('pageerror', (e) => erros.push(String(e)));

  /* ENTRA PELO LOGIN DE VERDADE. Plantar a sessão no aparelho à mão não
     funcionou — a biblioteca guarda a sessão no formato dela, e teste
     que depende de adivinhar formato interno quebra sozinho. Entrando
     pela tela, quem guarda a sessão é a própria biblioteca. */
  await pag.goto(`${base}/gestao/login.html`, { waitUntil: 'load' });
  await pag.waitForTimeout(800);
  await pag.fill('#email', 'gestao@pharmafit.com');
  await pag.fill('#senha', 'uma-senha-qualquer');
  await pag.click('#entrar');
  await pag.waitForTimeout(3000);
  return { ctx, pag, erros, gravado };
}

console.log('\n===========  o painel abre?  ===========');
const { ctx, pag, erros, gravado } = await abrirPainel();
console.log('    endereço depois do login: ' + (await pag.url()).replace(base, ''));
diz(!(await pag.url()).includes('login'), 'o login entrou (não voltou para a tela de login)');

/* A fila de confirmar mora no painel antigo — é para lá que cada linha
   do painel novo aponta (`../index.html?pedido=...`). */
await pag.goto(`${base}/gestao/index.html`, { waitUntil: 'load' });
await pag.waitForTimeout(2500);
diz(!(await pag.url()).includes('login'), 'a fila de pedidos abriu');
diz(erros.length === 0, `nenhum erro de JavaScript${erros.length ? ': ' + erros[0] : ''}`);

/** Abre a caixa "Confirmar venda" de um pedido e lê o que ela oferece. */
async function confirmar(id) {
  await pag.click(`[data-confirmar="${id}"]`);
  await pag.waitForTimeout(500);
  return {
    produto: (await pag.locator('#cv-produto').textContent()).trim(),
    valor: await pag.locator('#cv-valor').inputValue(),
    origem: (await pag.locator('#cv-origem').isVisible())
      ? (await pag.locator('#cv-origem').textContent()).trim() : '',
  };
}
async function fechar() {
  /* o X da caixa, e não o fundo: o fundo fica ATRÁS do formulário e o
     clique nele é interceptado */
  await pag.locator('#modal-valor button[data-fechar-valor]').first().click();
  await pag.waitForTimeout(300);
}

console.log('\n===========  pedido de produto simples  ===========');
{
  const r = await confirmar('d1');
  console.log('    produto: ' + r.produto);
  console.log('    valor oferecido: ' + (r.valor || '(vazio)'));
  console.log('    diz: ' + (r.origem || '(nada)'));
  diz(r.valor === '999', 'oferece os R$ 999,00 da lista de produtos', r.valor);
  diz(/999/.test(r.origem), 'e escreve de onde o número saiu');
  await fechar();
}

console.log('\n===========  pedido de OPÇÃO — era o furo  ===========');
{
  const r = await confirmar('d2');
  console.log('    produto: ' + r.produto);
  console.log('    valor oferecido: ' + (r.valor || '(vazio)'));
  console.log('    diz: ' + (r.origem || '(nada)'));
  /* a opção Gluconex custa 349 e o pedido é de 2 */
  diz(r.valor === '698', 'oferece 349 × 2 = R$ 698,00, o preço DA OPÇÃO', r.valor || '(vazio)');
  diz(/Gluconex/.test(r.origem), 'e diz que o preço veio da opção "Gluconex"');
  diz(/349/.test(r.origem) && /698/.test(r.origem), 'mostrando a conta por unidade e o total');
  /* O print sai DAQUI, com a caixa da opção aberta: é a tela que o
     Brian precisa ver, não a última que o teste tocou. */
  await pag.screenshot({ path: join(RAIZ, 'provas', 'saida', 'confirmar-venda.png') });
  await fechar();
}

console.log('\n===========  produto que saiu da lista  ===========');
{
  const r = await confirmar('d3');
  console.log('    produto: ' + r.produto);
  console.log('    valor oferecido: ' + (r.valor || '(vazio)'));
  console.log('    diz: ' + (r.origem || '(nada)'));
  diz(r.valor === '', 'não inventa valor nenhum');
  diz(/não está na sua lista/.test(r.origem),
    'e AVISA que não tem preço para sugerir, em vez de calar');
  diz(/WhatsApp/.test(r.origem), 'mandando conferir o valor na mensagem do cliente');
  await fechar();
}

console.log('\n===========  o custo gravado numa venda de opção  ===========');
{
  await confirmar('d2');
  await pag.fill('#cv-valor', '698');
  await pag.click('#cv-salvar');
  await pag.waitForTimeout(1200);
  const conf = gravado.filter((g) => g.metodo === 'PATCH' && g.corpo && g.corpo.custo !== undefined);
  const ultimo = conf[conf.length - 1];
  console.log('    gravou: ' + JSON.stringify(ultimo ? ultimo.corpo : null));
  diz(!!ultimo && Number(ultimo.corpo.custo) === 200,
    'grava o custo DA OPÇÃO (R$ 200), não zero',
    ultimo ? String(ultimo.corpo.custo) : '(não gravou)');
}

console.log('\n    (print da caixa em provas/saida/confirmar-venda.png)');

await ctx.close();
await nav.close();
sv.close();
console.log(`\n${mal ? 'FALTA CONSERTAR' : 'Tudo passou'} — ${ok} ok, ${mal} falhou`);
process.exit(mal ? 1 : 0);
