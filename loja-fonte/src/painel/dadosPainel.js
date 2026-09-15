/* Tudo que o painel fala com o banco.
 *
 * Nada aqui é privilégio do código: o site é estático e qualquer visitante lê
 * este arquivo. Quem decide o que pode é a RLS do banco. Se alguém copiar estas
 * funções e chamar sem ser administrador, o banco devolve vazio ou recusa — está
 * provado em prova-de-seguranca.sql.
 */

import { sb } from '../supabase.js';
import { T } from '../config.js';

/* ---------- quem está entrando ---------- */

export async function sessaoAtual() {
  const { data } = await sb.auth.getSession();
  return (data && data.session) || null;
}

export async function souAdmin() {
  const { data, error } = await sb.rpc('loja2_e_admin');
  if (error) return false;
  return data === true;
}

export async function entrar(email, senha) {
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, sessao: data.session };
}

export async function sair() {
  await sb.auth.signOut();
}

export async function pedirNovaSenha(email) {
  /* Volta com ?painel=1 e não com #/painel: o Supabase cola o próprio pedaço
     depois do #, e dois # no mesmo endereço quebram os dois. */
  const volta = window.location.origin + window.location.pathname + '?painel=1';
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: volta });
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

export async function trocarSenha(nova) {
  const { error } = await sb.auth.updateUser({ password: nova });
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

/* ---------- catálogo, do lado de dentro ---------- */

/**
 * O catálogo como o painel precisa ver: TODOS os produtos, inclusive os
 * arquivados, com o preço de compra ao lado. O preço de compra vem de outra
 * tabela porque a RLS dela só libera para administrador — a loja nunca o lê.
 */
export async function catalogoCompleto() {
  const [prod, cat, custos, pisos] = await Promise.all([
    sb.from(T('produtos')).select('*').neq('situacao', 'excluido').order('ordem').order('nome'),
    sb.from(T('categorias')).select('*').order('ordem'),
    sb.from(T('custos')).select('produto_id, custo'),
    sb.from(T('precos')).select('produto_id, piso')
  ]);

  const erro = prod.error || cat.error;
  if (erro) throw new Error(erro.message);

  const porId = {};
  (custos.data || []).forEach((c) => { porId[c.produto_id] = { custo: Number(c.custo) }; });
  (pisos.data || []).forEach((p) => {
    porId[p.produto_id] = { ...(porId[p.produto_id] || {}), piso: Number(p.piso) };
  });

  return {
    produtos: (prod.data || []).map((p) => ({
      ...p,
      custo: porId[p.produto_id] ? porId[p.produto_id].custo : null,
      piso: porId[p.produto_id] ? porId[p.produto_id].piso : null
    })),
    categorias: cat.data || []
  };
}

export async function salvarProduto(produto, custo) {
  const linha = {
    produto_id: produto.produto_id,
    nome: produto.nome,
    apresentacao: produto.apresentacao || null,
    descricao: produto.descricao || null,
    categoria: produto.categoria || null,
    marca: produto.marca || null,
    sku: produto.sku || null,
    imagem: produto.imagem || null,
    preco: produto.preco,
    preco_vip: produto.preco_vip,
    preco_promocional: produto.preco_promocional,
    estoque: produto.estoque,
    situacao: produto.situacao,
    ordem: produto.ordem || 0,
    atualizado_em: new Date().toISOString()
  };

  const r = await sb.from(T('produtos')).upsert(linha, { onConflict: 'produto_id' });
  if (r.error) return { ok: false, erro: r.error.message };

  /* O preço de compra mora em outra tabela, com outra permissão. Sem valor,
     não grava uma linha de custo zero só para existir. */
  const n = Number(custo);
  if (Number.isFinite(n) && n >= 0) {
    const rc = await sb.from(T('custos')).upsert(
      { produto_id: produto.produto_id, custo: n, atualizado_em: new Date().toISOString() },
      { onConflict: 'produto_id' }
    );
    if (rc.error) return { ok: false, erro: rc.error.message };
  }

  return { ok: true };
}

export async function arquivarProduto(produto_id, arquivar) {
  const r = await sb.from(T('produtos'))
    .update({ situacao: arquivar ? 'arquivado' : 'ativo', atualizado_em: new Date().toISOString() })
    .eq('produto_id', produto_id);
  if (r.error) return { ok: false, erro: r.error.message };
  return { ok: true };
}

/**
 * Apagar de verdade. O banco recusa se o produto já apareceu em algum pedido —
 * apagar o produto apagaria o custo daquela venda e o lucro de um mês fechado
 * mudaria sozinho. Nesse caso a saída é arquivar.
 */
export async function apagarProduto(produto_id) {
  const r = await sb.from(T('produtos')).delete().eq('produto_id', produto_id);
  if (r.error) {
    const jaVendido = /ja foi vendido/.test(r.error.message);
    return { ok: false, erro: r.error.message, jaVendido };
  }
  return { ok: true };
}

/* ---------- categorias ---------- */

export async function salvarCategoria(cat) {
  const r = await sb.from(T('categorias')).upsert({
    id: cat.id,
    nome: cat.nome,
    icone: cat.icone || 'caixa',
    tom: cat.tom || 'ouro',
    ordem: cat.ordem || 0,
    oculta: !!cat.oculta,
    destaque: !!cat.destaque
  }, { onConflict: 'id' });
  if (r.error) return { ok: false, erro: r.error.message };
  return { ok: true };
}

export async function apagarCategoria(id) {
  const r = await sb.from(T('categorias')).delete().eq('id', id);
  if (r.error) return { ok: false, erro: r.error.message };
  return { ok: true };
}

/* ---------- pedidos ---------- */

export async function pedidos({ de, ate, status } = {}) {
  let q = sb.from(T('pedidos')).select('*').order('criado_em', { ascending: false });
  if (de) q = q.gte('criado_em', de.toISOString());
  if (ate) q = q.lt('criado_em', ate.toISOString());
  if (status && status.length) q = q.in('status', status);

  const r = await q;
  if (r.error) throw new Error(r.error.message);
  return r.data || [];
}

export async function itensDosPedidos(ids) {
  if (!ids.length) return [];
  const r = await sb.from(T('pedido_itens')).select('*').in('pedido_id', ids);
  if (r.error) throw new Error(r.error.message);
  return r.data || [];
}

export async function custosDosPedidos(ids) {
  if (!ids.length) return [];
  const r = await sb.from(T('custo_vendido')).select('*').in('pedido_id', ids);
  if (r.error) throw new Error(r.error.message);
  return r.data || [];
}

/**
 * Muda o andamento do pedido. Só isso: o banco recusa qualquer mudança de
 * valor, e recusa voltar atrás num pagamento que já aconteceu.
 */
export async function mudarStatus(id, status) {
  const r = await sb.from(T('pedidos')).update({ status }).eq('id', id);
  if (r.error) return { ok: false, erro: r.error.message };
  return { ok: true };
}

export async function corrigirEndereco(id, campos) {
  const r = await sb.from(T('pedidos')).update(campos).eq('id', id);
  if (r.error) return { ok: false, erro: r.error.message };
  return { ok: true };
}

/* ---------- configuração ---------- */

export async function ajustes() {
  const r = await sb.from(T('config')).select('chave, valor');
  if (r.error) throw new Error(r.error.message);
  const saida = {};
  (r.data || []).forEach((l) => { saida[l.chave] = l.valor; });
  return saida;
}

export async function salvarAjuste(chave, valor) {
  const r = await sb.from(T('config')).upsert(
    { chave, valor, atualizado_em: new Date().toISOString() },
    { onConflict: 'chave' }
  );
  if (r.error) return { ok: false, erro: r.error.message };
  return { ok: true };
}

/* ---------- quem tem acesso ao painel ---------- */

export async function equipe() {
  const { data, error } = await sb.rpc('loja2_equipe');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function darAcesso(email) {
  const { data, error } = await sb.rpc('loja2_promover', { p_email: email.trim() });
  if (error) return { ok: false, erro: error.message };
  if (data === 'sem_conta') return { ok: false, erro: 'sem_conta' };
  if (data === 'sem_permissao') return { ok: false, erro: 'sem_permissao' };
  return { ok: true };
}

export async function tirarAcesso(user_id) {
  const { data, error } = await sb.rpc('loja2_rebaixar', { p_user: user_id });
  if (error) return { ok: false, erro: error.message };
  if (data === 'ultimo') return { ok: false, erro: 'ultimo' };
  if (data === 'sem_permissao') return { ok: false, erro: 'sem_permissao' };
  return { ok: true };
}

/* ---------- fotos ---------- */

const BALDE = 'loja2-fotos';

/** Sobe a foto e devolve o endereço público dela. */
export async function subirFoto(arquivo, pasta) {
  const limpo = String(arquivo.name || 'foto')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const caminho = `${pasta}/${Date.now()}-${limpo}`;

  const r = await sb.storage.from(BALDE).upload(caminho, arquivo, { upsert: false });
  if (r.error) return { ok: false, erro: r.error.message };

  const { data } = sb.storage.from(BALDE).getPublicUrl(caminho);
  return { ok: true, url: data.publicUrl };
}
