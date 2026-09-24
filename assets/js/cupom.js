/* =========================================================
   PHARMA FIT — cupom de desconto no carrinho

   precisa: nuvem

   Brian, 24/09/2026: "cupons para fazer promoção / Cupom de % ou de
   valor".

   QUEM CRIA O CUPOM É A EQUIPE, NO PAINEL (tela Cupons). Aqui o site
   só pergunta ao banco se um código vale — pela função `pf_cupom`, que
   devolve a regra de UM código e nada mais. O site não enxerga a lista
   de cupons: se enxergasse, qualquer um abriria o navegador e leria
   todos os códigos da loja.

   O QUE O CUPOM FAZ, E O QUE ELE NÃO FAZ

   Ele muda o total que a pessoa vê, vai escrito na mensagem do
   WhatsApp e fica gravado no pedido que chega ao painel (coluna
   `cupom`). Quem confirma o valor final continua sendo a equipe, no
   WhatsApp, como sempre foi: preço não é decidido pelo navegador de
   quem compra.

   Por isso mesmo o PAGAMENTO NA HORA (PIX) some enquanto há cupom: o
   banco confere cada item da cobrança contra o preço de tabela e
   recusaria o valor com desconto. Com cupom, o pedido fecha pelo
   WhatsApp — ver `pagamento.js`.

   O cupom fica guardado no aparelho junto do carrinho, e é conferido
   de novo toda vez que o carrinho abre: se a equipe desligou o cupom
   ou ele venceu, ele sai sozinho, com um recado dizendo por quê.
   ========================================================= */
(function () {
  'use strict';

  var Nuvem = window.PharmaFitNuvem;
  var CHAVE = 'pharmafit_cupom';

  function ler() {
    try {
      var c = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      if (c && c.codigo && (c.tipo === 'porcentagem' || c.tipo === 'valor') && Number(c.valor) > 0) return c;
    } catch (e) {}
    return null;
  }

  function gravar(c) {
    try {
      if (c) localStorage.setItem(CHAVE, JSON.stringify(c));
      else localStorage.removeItem(CHAVE);
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('pharmafit-cupom', { detail: c }));
  }

  function normalizar(codigo) {
    return String(codigo || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  /** Pergunta ao banco. Devolve {codigo,tipo,valor}, null (não vale)
      ou lança erro quando não deu para perguntar. */
  async function consultar(codigo) {
    if (!Nuvem || !Nuvem.cliente) throw new Error('sem conexão');
    try { await Nuvem.pronto; } catch (e) {}
    var sb = Nuvem.cliente();
    if (!sb || !sb.rpc) throw new Error('sem conexão');

    var r = await sb.rpc('pf_cupom', { p_codigo: codigo });
    if (r.error) throw new Error(r.error.message || 'erro no banco');
    var linha = Array.isArray(r.data) ? r.data[0] : r.data;
    if (!linha || !linha.codigo) return null;
    return { codigo: linha.codigo, tipo: linha.tipo, valor: Number(linha.valor) };
  }

  var Cupom = {
    atual: ler,

    /** Quanto o cupom tira de um total. Nunca mais que o total. */
    desconto: function (total, cupom) {
      var c = cupom || ler();
      var t = Number(total) || 0;
      if (!c || t <= 0) return 0;
      var d = c.tipo === 'porcentagem'
        ? t * Number(c.valor) / 100
        : Number(c.valor);
      d = Math.round(Math.min(d, t) * 100) / 100;
      return d > 0 ? d : 0;
    },

    /** "10%" ou "R$ 50,00" — como o cupom aparece escrito. */
    rotulo: function (cupom) {
      var c = cupom || ler();
      if (!c) return '';
      return c.tipo === 'porcentagem'
        ? String(Number(c.valor)).replace('.', ',') + '%'
        : Number(c.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    /** Tenta aplicar um código. Devolve { ok, cupom } ou { ok:false, erro }. */
    aplicar: async function (codigo) {
      var cod = normalizar(codigo);
      if (!cod) return { ok: false, erro: 'Digite o código do cupom.' };
      if (!/^[A-Z0-9_-]{3,24}$/.test(cod)) {
        return { ok: false, erro: 'Esse código não existe. Confira como ele foi escrito.' };
      }
      var c;
      try { c = await consultar(cod); } catch (e) {
        return { ok: false, erro: 'Não consegui conferir o cupom agora. Tente de novo em instantes.' };
      }
      if (!c) return { ok: false, erro: 'Esse cupom não existe ou já não vale mais.' };
      gravar(c);
      return { ok: true, cupom: c };
    },

    remover: function () { gravar(null); },

    /** Confere de novo o cupom guardado. Se deixou de valer, tira e
        devolve o motivo; se valeu, atualiza a regra (a equipe pode ter
        mudado o valor). Erro de conexão não tira nada. */
    reconferir: async function () {
      var c = ler();
      if (!c) return { mudou: false };
      var novo;
      try { novo = await consultar(c.codigo); } catch (e) { return { mudou: false }; }
      if (!novo) {
        gravar(null);
        return { mudou: true, saiu: c.codigo };
      }
      if (novo.tipo !== c.tipo || novo.valor !== Number(c.valor)) {
        gravar(novo);
        return { mudou: true };
      }
      return { mudou: false };
    }
  };

  window.PharmaFitCupom = Cupom;
})();
