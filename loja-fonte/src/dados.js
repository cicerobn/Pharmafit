/* Conversa com o banco.
 *
 * O que o site pode fazer aqui é o que a RLS deixa: ler o catálogo, ler os
 * ajustes públicos (frete, cupom) e gravar um pedido novo. Nada mais.
 * Preço de compra, piso e pedido de outra pessoa nem chegam até aqui. */

import { sb } from './supabase.js';
import { T } from './config.js';

const CHAVE_MEUS_DADOS = 'loja2_meus_dados';

/** Catálogo, categorias e ajustes numa ida só. */
export async function carregarLoja() {
  const [cat, prod, cfg] = await Promise.all([
    sb.from(T('categorias')).select('*').eq('oculta', false).order('ordem'),
    sb.from(T('produtos')).select('*').eq('situacao', 'ativo').order('ordem'),
    sb.from(T('config')).select('chave, valor')
  ]);

  const erro = cat.error || prod.error || cfg.error;
  if (erro) throw new Error(erro.message);

  const ajustes = {};
  (cfg.data || []).forEach((linha) => { ajustes[linha.chave] = linha.valor; });

  return {
    categorias: cat.data || [],
    produtos: prod.data || [],
    ajustes
  };
}

/** Frete da loja. É o servidor que manda: se o site mentir, o gatilho recusa. */
export function freteDaLoja(ajustes) {
  const valor = ajustes && ajustes.frete && ajustes.frete.valor;
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Cupom de membro, se a loja tiver configurado um. */
export function cupomDaLoja(ajustes) {
  const cupom = ajustes && ajustes.membro && ajustes.membro.cupom;
  return typeof cupom === 'string' && cupom.trim() ? cupom.trim() : null;
}

/** Banner do topo, se a loja tiver subido um. */
export function bannerDaLoja(ajustes) {
  const b = (ajustes && ajustes.banner) || null;
  if (!b) return null;
  const temImagem = typeof b.imagem === 'string' && b.imagem.trim();
  const temTexto = typeof b.titulo === 'string' && b.titulo.trim();
  return temImagem || temTexto ? b : null;
}

/** Nome da loja, quando estiver definido nos ajustes. */
export function nomeDaLoja(ajustes) {
  const nome = ajustes && ajustes.empresa && ajustes.empresa.nome;
  return typeof nome === 'string' && nome.trim() ? nome.trim() : null;
}

/** WhatsApp da loja, para o cliente falar com ela depois de fechar o pedido. */
export function zapDaLoja(ajustes) {
  const bruto = ajustes && ajustes.empresa && ajustes.empresa.whatsapp;
  const so = String(bruto || '').replace(/\D/g, '');
  if (so.length < 10) return null;
  /* Sem o 55 na frente o WhatsApp não abre conversa nenhuma. */
  return so.startsWith('55') ? so : '55' + so;
}

/**
 * Como pagar, quando a loja tiver configurado.
 *
 * Isto é a chave PIX da própria loja, feita para ser mostrada a quem vai pagar
 * — não é segredo. Chave de gateway é outra coisa e nunca chega até aqui: ela
 * fica em segredo de função de servidor.
 */
export function pagamentoDaLoja(ajustes) {
  const p = (ajustes && ajustes.pagamento) || null;
  if (!p) return null;
  const chave = typeof p.chave_pix === 'string' ? p.chave_pix.trim() : '';
  if (!chave) return null;
  return {
    chave,
    titular: (p.titular || '').trim() || null,
    banco: (p.banco || '').trim() || null
  };
}

/* ---------- dados de quem compra, guardados no aparelho ---------- */

export function meusDados() {
  try {
    const bruto = localStorage.getItem(CHAVE_MEUS_DADOS);
    return bruto ? JSON.parse(bruto) : null;
  } catch (e) {
    return null;
  }
}

export function guardarMeusDados(dados) {
  try { localStorage.setItem(CHAVE_MEUS_DADOS, JSON.stringify(dados)); } catch (e) { /* sem armazenamento */ }
}

/* ---------- gravar o pedido ---------- */

/**
 * Grava o pedido e os itens.
 *
 * O id nasce aqui, no navegador, de propósito: quem compra sem conta não pode
 * LER a tabela de pedidos — é isso que mantém o pedido de um cliente invisível
 * para outro. Como não dá para pedir o id de volta, ele já vai combinado.
 *
 * Os valores vão para o banco, mas não são a autoridade: o gatilho recalcula o
 * total, obriga o frete a ser o da loja e recusa item abaixo do preço praticado.
 */
export async function gravarPedido({ cliente, linhas, conta }) {
  const id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());

  const pedido = {
    id,
    cliente_id: null,
    status: 'aguardando',
    metodo_pagamento: 'a_combinar',
    subtotal: conta.subtotal,
    desconto: 0,
    frete: conta.frete,
    total: conta.total,
    nome: cliente.nome,
    telefone: cliente.telefone,
    cpf: cliente.cpf,
    nascimento: cliente.nascimento,
    email: cliente.email,
    cep: cliente.cep,
    cidade: cliente.cidade,
    rua: cliente.rua,
    numero_casa: cliente.numero_casa,
    complemento: cliente.complemento || null
  };

  const r1 = await sb.from(T('pedidos')).insert(pedido);
  if (r1.error) return { ok: false, erro: r1.error.message };

  const itens = linhas.map((l) => ({
    pedido_id: id,
    produto_id: l.produto_id,
    nome: l.nome,
    apresentacao: l.apresentacao || null,
    quantidade: l.quantidade,
    preco_unitario: l.preco
  }));

  const r2 = await sb.from(T('pedido_itens')).insert(itens);
  if (r2.error) return { ok: false, erro: r2.error.message, precoMudou: true };

  guardarMeusDados(cliente);
  return { ok: true, id, referencia: id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() };
}
