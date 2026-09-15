/* =========================================================
   PHARMA FIT — barra de navegação do painel

   Injeta o mesmo menu em todas as telas da gestão e marca a
   página atual. O item "Meu painel" só aparece para o dono
   (EMAIL_DONO no config.js).
   ========================================================= */
(function () {
  'use strict';

  var cfg = window.PHARMAFIT_CONFIG || {};

  var ITENS = [
    { href: 'dashboard.html',  texto: 'Dashboard' },
    { href: 'index.html',      texto: 'Vendas' },
    { href: 'relatorios.html', texto: 'Relatórios' },
    { href: 'despesas.html',   texto: 'Gastos' },
    { href: 'clientes.html',   texto: 'Clientes' },
    { href: 'pessoal.html',    texto: 'Meu painel', sóDono: true },
    { href: 'ajustes.html',    texto: 'Ajustes',    sóDono: true }
  ];

  window.PharmaFitMenu = {

    /** Desenha o menu. `usuario` decide se "Meu painel" aparece. */
    montar: function (usuario) {
      var alvo = document.querySelector('[data-menu]');
      if (!alvo) return;

      var atual = (location.pathname.split('/').pop() || 'index.html');
      /* a ficha individual pertence à seção Clientes */
      if (atual === 'cliente.html') atual = 'clientes.html';
      var email = String((usuario && usuario.email) || '').toLowerCase();
      var dono = !cfg.EMAIL_DONO || email === String(cfg.EMAIL_DONO).toLowerCase();

      alvo.innerHTML = ITENS
        .filter(function (i) { return !i.sóDono || dono; })
        .map(function (i) {
          var ativo = i.href === atual ? ' class="admin__link is-active"' : ' class="admin__link"';
          return '<a href="' + i.href + '"' + ativo + '>' + i.texto + '</a>';
        }).join('');
    },

    /** true se o usuário logado é o dono. */
    éDono: function (usuario) {
      var email = String((usuario && usuario.email) || '').toLowerCase();
      return !cfg.EMAIL_DONO || email === String(cfg.EMAIL_DONO).toLowerCase();
    }
  };
})();
