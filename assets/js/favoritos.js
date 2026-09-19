/* =========================================================
   PHARMA FIT — favoritos sem conta

   O que a pessoa curte fica salvo no próprio navegador, sem
   cadastro e sem login. Vale entre as páginas do site.

   enche: data-fav-contador

   Esta linha é lida por `conferir-scripts.mjs`: toda página que tiver
   esse gancho no HTML tem de carregar este arquivo. Ela existe porque
   em 17/09/2026 o coração saiu da barra de cima e o contador passou a
   viver dentro do menu — que é IGUAL nas 16 páginas. Quatro delas não
   carregavam este script, então nelas o número simplesmente nunca
   aparecia: o menu prometia uma coisa e entregava outra, sem erro
   nenhum na tela.
   ========================================================= */
(function () {
  'use strict';

  var CHAVE = 'pharmafit_favoritos';
  var catalogo = window.PHARMAFIT_CATALOGO || [];

  function ler() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE) || '[]');
    } catch (e) {
      return [];
    }
  }

  function gravar(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) {}
    atualizarTela();
  }

  function tem(nome) {
    return ler().indexOf(nome) !== -1;
  }

  function alternar(nome) {
    var lista = ler();
    var i = lista.indexOf(nome);
    if (i === -1) lista.push(nome); else lista.splice(i, 1);
    gravar(lista);
    return i === -1;
  }

  /* A TARJA PRETA DO FAVORITO SAIU DAQUI.

     Brian, 18/09/2026, com a foto dela na tela: "tire isso".

     Ela dizia "Lipoless 15 mg — 4 ampolas salvo nos favoritos." num
     retângulo preto por cima da vitrine, quase três segundos, a cada
     toque no coração — e cobria os cartões de cima justamente quando a
     pessoa está percorrendo a lista marcando o que gosta.

     O aviso não foi perdido, ele já existia em dois lugares melhores:
     o coração daquele cartão fica preenchido na hora, e o número ao
     lado do coração no menu sobe. Os dois ficam na tela, em vez de
     aparecer e sumir, e nenhum cobre nada.

     A tarja continua existindo no site para o que ela serve: coisa que
     acabou de acontecer e NÃO tem marca na tela — "Lembrete criado",
     "Histórico apagado", "Aplicação registrada". */

  /* ---------- reflete o estado na tela ---------- */

  function atualizarTela() {
    var lista = ler();

    document.querySelectorAll('.product[data-produto]').forEach(function (card) {
      var salvo = lista.indexOf(card.getAttribute('data-produto')) !== -1;
      var botao = card.querySelector('[data-favorito]');
      if (!botao) return;
      botao.classList.toggle('is-salvo', salvo);
      botao.setAttribute('aria-pressed', String(salvo));
      botao.setAttribute('aria-label', salvo ? 'Remover dos favoritos' : 'Salvar nos favoritos');
      botao.querySelector('svg').setAttribute('fill', salvo ? 'currentColor' : 'none');
    });

    document.querySelectorAll('[data-fav-contador]').forEach(function (el) {
      el.textContent = lista.length;
      el.hidden = !lista.length;
    });
  }

  /* ---------- página de favoritos ---------- */

  function montarPagina() {
    var alvo = document.querySelector('[data-favoritos-grade]');
    if (!alvo) return;

    var lista = ler();
    var produtos = catalogo.filter(function (p) {
      return lista.indexOf(p.nome) !== -1 && !p.foraDoSite;
    });

    document.querySelector('[data-favoritos-vazio]').hidden = produtos.length > 0;
    alvo.hidden = !produtos.length;

    alvo.innerHTML = produtos.map(function (p) {
      return window.PharmaFitCartao(p);
    }).join('');
    /* a moldura de cada foto toma a cor do fundo dela; sem isto a borda
       que o Brian apontou em 19/09/2026 voltaria a aparecer aqui */
    if (window.PharmaFitFundoDaFoto) window.PharmaFitFundoDaFoto(alvo);

    atualizarTela();
  }

  /* ---------- eventos ---------- */

  document.addEventListener('click', function (e) {
    var botao = e.target.closest('[data-favorito]');
    if (!botao) return;

    e.preventDefault();
    var card = botao.closest('.product');
    var nome = card && card.getAttribute('data-produto');
    if (!nome) return;

    var salvou = alternar(nome);

    /* A batida do coração, só ao SALVAR: ao tirar, o coração esvazia e
       (na página de favoritos) o cartão sai da lista — festejar o que
       a pessoa acabou de desistir seria estranho. */
    if (salvou) {
      botao.classList.remove('is-batendo');
      void botao.offsetWidth;   /* obriga o navegador a reiniciar a animação */
      botao.classList.add('is-batendo');
      botao.addEventListener('animationend', function () {
        botao.classList.remove('is-batendo');
      }, { once: true });
    }

    /* na página de favoritos, some da lista na hora */
    if (document.querySelector('[data-favoritos-grade]') && !salvou) montarPagina();
  });

  document.addEventListener('DOMContentLoaded', function () {
    montarPagina();
    atualizarTela();
  });

  /* a grade é montada por loja.js antes deste script rodar */
  atualizarTela();

  /* O banco respondeu (catalogo-banco.js): a lista de favoritos mostra
     preço e foto, e a equipe muda os dois pelo painel. */
  document.addEventListener('pharmafit-catalogo', function () {
    montarPagina();
    atualizarTela();
  });

  /* `pintar` é o `atualizarTela` de dentro, com nome de fora.
     Quem desenha cartão novo DEPOIS que esta página carregou — a
     página do produto, com os produtos da mesma linha — precisa pedir
     para os corações nascerem marcados. Antes isso só funcionava por
     acidente de ordem: este arquivo é carregado antes daquele, então o
     `DOMContentLoaded` daqui corria depois e arrumava. Ordem de script
     como garantia invisível é justamente o que eu passei a semana
     consertando; melhor a tela pedir. */
  window.PharmaFitFavoritos = {
    ler: ler, tem: tem, alternar: alternar, pintar: atualizarTela
  };
})();
