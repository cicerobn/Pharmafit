/* =========================================================
   PHARMA FIT — barra de navegação do painel

   Injeta o mesmo menu em todas as telas da gestão e marca a
   página atual. O item "Meu painel" só aparece para o dono
   (EMAIL_DONO no config.js).
   ========================================================= */
(function () {
  'use strict';

  var cfg = window.PHARMAFIT_CONFIG || {};

  /* O CAMINHO DE VOLTA PARA O PAINEL NOVO.
   *
   * Brian, 18/09/2026: "ao clicar ali naquele icone nao tem como
   * voltar". O botão do gráfico no painel novo levava para a tela
   * ANTIGA de relatórios — isso eu consertei no próprio botão —, mas o
   * problema de fundo é outro e vale para as OITO telas antigas: o
   * painel novo leva para elas (Gastos e Dashboard estão no "Mais"), e
   * nenhuma delas tinha caminho de volta. Quem chegava aqui ficava,
   * até fechar e digitar o endereço de novo.
   *
   * Este item entra PRIMEIRO e é desenhado diferente dos outros: ele
   * não é uma seção do painel velho, é a saída dele. Fica aqui, num
   * lugar só, porque as oito telas montam o menu por este arquivo —
   * escrever o link em cada HTML seria oito chances de esquecer uma. */
  var VOLTAR = { href: 'app/inicio.html', texto: 'Painel', volta: true };

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

      alvo.innerHTML = [VOLTAR].concat(ITENS)
        .filter(function (i) { return !i.sóDono || dono; })
        .map(function (i) {
          if (i.volta) {
            return '<a href="' + i.href + '" class="admin__link admin__link--volta" ' +
              'aria-label="Voltar ao painel">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<path d="m15 5-7 7 7 7"/></svg>' + i.texto + '</a>';
          }
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
