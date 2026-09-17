/* =========================================================
   PHARMA FIT — minha área, sem cadastro

   Guarda no próprio aparelho os dados de quem compra (nome,
   WhatsApp e endereço) e o histórico dos pedidos feitos por
   aqui. O cliente pode apagar quando quiser.

   QUEM TEM CONTA GUARDA TAMBÉM NA CONTA, desde 17/09/2026: o
   conta.js copia o cadastro da conta para cá quando a página
   abre, e manda para lá quando a pessoa salva. Este arquivo
   continua sendo a fonte IMEDIATA que as dez telas leem — é por
   isso que ele não virou assíncrono.

   Quem NÃO tem conta continua exatamente como antes: os dados
   ficam só aqui, e nada além do pedido em si vai para servidor.
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
      /* AVISA A TELA QUE O DADO MUDOU.
         O cadastro da conta desce para cá quando a página abre, e isso
         acontece DEPOIS de o formulário de "Meus dados" já ter sido
         preenchido com o que havia no aparelho. Sem este aviso, quem
         abrisse num aparelho novo veria o formulário vazio mesmo tendo
         cadastro na conta — e concluiria que a conta não guarda nada. */
      try {
        document.dispatchEvent(new CustomEvent('pharmafit-meus-dados'));
      } catch (e) {}
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
