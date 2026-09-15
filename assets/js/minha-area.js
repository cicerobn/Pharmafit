/* =========================================================
   PHARMA FIT — minha área, sem cadastro

   Guarda no próprio aparelho os dados de quem compra (nome,
   WhatsApp e endereço) e o histórico dos pedidos feitos por
   aqui. Nada disso vai para servidor nenhum além do pedido em
   si — e o cliente pode apagar quando quiser.
   ========================================================= */
(function () {
  'use strict';

  var CHAVE_DADOS = 'pharmafit_meus_dados';
  var CHAVE_PEDIDOS = 'pharmafit_meus_pedidos';
  var cfg = window.PHARMAFIT_CONFIG || {};

  function ler(chave, padrao) {
    try {
      var raw = localStorage.getItem(chave);
      return raw ? JSON.parse(raw) : padrao;
    } catch (e) {
      return padrao;
    }
  }

  function gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {}
  }

  var Area = {

    /** Dados de contato salvos neste aparelho. */
    dados: function () {
      return ler(CHAVE_DADOS, { nome: '', telefone: '', endereco: '' });
    },

    salvarDados: function (dados) {
      gravar(CHAVE_DADOS, {
        nome: String(dados.nome || '').trim(),
        telefone: String(dados.telefone || '').trim(),
        endereco: String(dados.endereco || '').trim()
      });
    },

    limparDados: function () {
      try { localStorage.removeItem(CHAVE_DADOS); } catch (e) {}
    },

    /** Pedidos feitos por este aparelho. */
    pedidos: function () {
      return ler(CHAVE_PEDIDOS, []);
    },

    registrarPedido: function (pedido) {
      var lista = Area.pedidos();
      lista.unshift({
        produto: pedido.produto,
        quantidade: pedido.quantidade || 1,
        cliente: pedido.cliente,
        endereco: pedido.endereco,
        quando: new Date().toISOString()
      });
      gravar(CHAVE_PEDIDOS, lista.slice(0, 30));
    },

    limparPedidos: function () {
      try { localStorage.removeItem(CHAVE_PEDIDOS); } catch (e) {}
    },

    /** Link do WhatsApp da loja com uma mensagem pronta. */
    linkLoja: function (texto) {
      var numero = String(cfg.WHATSAPP || '').replace(/\D/g, '');
      if (!numero) return null;
      return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto || 'Olá! Vim pelo site da Pharma Fit.');
    }
  };

  window.PharmaFitArea = Area;
})();
