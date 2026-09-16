/* =========================================================
   PHARMA FIT — monta a loja a partir do catálogo

   Desenha a grade de produtos, os filtros por categoria e o
   carrossel de produtos da página inicial usando os dados
   de assets/js/catalogo.js.
   ========================================================= */
(function () {
  'use strict';

  var catalogo = window.PHARMAFIT_CATALOGO || [];
  var Preco = window.PharmaFitPreco;

  /** Produto sem estoque some da venda e entra na fila de interesse.
      estoque null/indefinido = sem controle de estoque. */
  function semEstoque(p) {
    if (p.indisponivel) return true;
    return p.estoque !== null && p.estoque !== undefined && p.estoque !== '' && Number(p.estoque) <= 0;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function chave(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-');
  }

  var coracaoHtml =
    '<button class="fav" type="button" data-favorito aria-label="Salvar nos favoritos">' +
      '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 20.4 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13z"/></svg>' +
    '</button>';

  var setaHtml =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>';

  /* ---------- bloco de preço, igual na grade e no carrossel ---------- */

  function blocoPreco(p) {
    var desconto = Preco.desconto(p.antes, p.venda);

    return (p.antes
        ? '<p class="product__antes">' +
            '<s>' + Preco.formatar(p.antes) + '</s>' +
            (desconto ? '<span class="selo-off">-' + desconto + '%</span>' : '') +
          '</p>'
        : '') +
      '<p class="product__price">' + Preco.formatar(p.venda) + '</p>' +
      '<p class="product__installment">' + Preco.textoParcelas(p.venda) + '</p>';
  }

  /* ---------- grade de produtos ---------- */

  /** Produtos que a loja mostra (o painel pode tirar um do ar). */
  function visiveis() {
    return catalogo.filter(function (p) { return !p.foraDoSite; });
  }

  function montarGrade() {
    var grade = document.querySelector('[data-grade]');
    if (!grade) return;

    grade.innerHTML = visiveis().map(function (p) {
      var etiqueta = p.antes ? 'PROMOÇÃO' : p.destaque;

      return cartao(p, etiqueta);
    }).join('');
  }

  /** Cartão de produto usado na grade e na página de favoritos. */
  function cartao(p, etiqueta) {
    if (etiqueta === undefined) etiqueta = p.antes ? 'PROMOÇÃO' : p.destaque;

    /* Fora de estoque não ganha botão de carrinho: pôr no carrinho o que
       não pode ser entregue só empurra a decepção para o fim da compra. */
    var acao = semEstoque(p)
      ? '<button class="btn btn--outline btn--espera" type="button" data-avise="' + esc(p.nome) + '">' +
          'Avise-me quando chegar' + setaHtml + '</button>'
      : '<div class="product__acoes">' +
          '<button class="btn btn--primary btn--carrinho" type="button" ' +
            'data-por-no-carrinho="' + esc(p.nome) + '">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>' +
            '<path d="M3 4h2l2.4 10.2a1.5 1.5 0 0 0 1.5 1.2h9.2a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/>' +
            '</svg>' +
            '<span>Adicionar</span>' +
          '</button>' +
          /* "Saiba mais" agora leva à PÁGINA do produto, e não ao
             formulário de contato: quem clica quer ver o produto, não
             escrever para alguém. Do lado de lá tem o WhatsApp. */
          '<a class="btn btn--outline" href="produto.html?p=' +
            encodeURIComponent(p.nome) + '">' +
            'Ver detalhes' + setaHtml + '</a>' +
        '</div>';

    return '' +
      '<article class="product' + (semEstoque(p) ? ' is-indisponivel' : '') +
        '" data-category="' + chave(p.categoria) + '" data-produto="' + esc(p.nome) + '"' +
        ' data-preco="' + Number(p.venda || 0) + '"' +
        ' data-promo="' + (p.antes ? 1 : 0) + '"' +
        ' data-ordem="' + catalogo.indexOf(p) + '">' +
        (semEstoque(p)
          ? '<span class="product__badge product__badge--off">SEM ESTOQUE</span>'
          : (etiqueta ? '<span class="product__badge">' + esc(etiqueta) + '</span>' : '')) +
        coracaoHtml +
        '<div class="product__media">' +
          '<img src="' + esc(p.imagem) + '" alt="' + esc(p.nome) + ' Pharma Fit" loading="lazy">' +
        '</div>' +
        '<div class="product__body">' +
          '<h2 class="product__name">' +
            '<a href="produto.html?p=' + encodeURIComponent(p.nome) + '">' +
              esc(p.nome) + '</a></h2>' +
          '<p class="product__desc">' + esc(p.descricao) + '</p>' +
          blocoPreco(p) +
          acao +
        '</div>' +
      '</article>';
  }

  window.PharmaFitCartao = cartao;

  /* ---------- filtros por categoria ---------- */

  function montarChips() {
    var barra = document.querySelector('[data-chips]');
    if (!barra) return;

    var categorias = [];
    visiveis().forEach(function (p) {
      if (categorias.indexOf(p.categoria) === -1) categorias.push(p.categoria);
    });

    /* "Todos" vem primeiro e nasce marcado. Antes o primeiro chip de
       categoria vinha marcado, e a página abria já filtrada em Tirzepatida —
       quem chegava não via o resto do catálogo e não tinha como voltar a ver
       tudo, porque não existia botão para isso. O filtro em app.js já sabia
       tratar 'todos'; faltava só o botão existir. */
    var botoes = ['<button class="chip is-active" type="button" ' +
      'data-chip="todos" aria-pressed="true">Todos</button>'];

    /* Cada categoria leva um numero de cor, e o CSS decide qual cor e.
       Por indice e nao por nome: renomear "Peptideos" nao deve trocar a
       cor de lugar. O rodizio de 4 garante que a quinta categoria ainda
       receba uma cor definida, em vez de nascer sem nenhuma. */
    categorias.forEach(function (c, i) {
      botoes.push('<button class="chip" type="button" ' +
        'data-cor="' + ((i % 4) + 1) + '" ' +
        'data-chip="' + chave(c) + '" aria-pressed="false">' + esc(c) + '</button>');
    });

    barra.innerHTML = botoes.join('');
  }

  /* ---------- ordenação da vitrine ---------- */

  /**
   * Reordena os cartões que já estão na tela em vez de desenhar
   * tudo de novo — assim os filtros de categoria e a busca não
   * perdem o que já estava marcado.
   */
  function ordenarGrade(criterio) {
    var grade = document.querySelector('[data-grade]');
    if (!grade) return;

    function num(card, attr) { return Number(card.getAttribute(attr) || 0); }

    var cartoes = Array.prototype.slice.call(grade.querySelectorAll('.product'));

    cartoes.sort(function (a, b) {
      if (criterio === 'menor-preco') return num(a, 'data-preco') - num(b, 'data-preco');
      if (criterio === 'maior-preco') return num(b, 'data-preco') - num(a, 'data-preco');
      if (criterio === 'promocao') {
        var dif = num(b, 'data-promo') - num(a, 'data-promo');
        return dif || (num(a, 'data-ordem') - num(b, 'data-ordem'));
      }
      return num(a, 'data-ordem') - num(b, 'data-ordem');
    });

    cartoes.forEach(function (c) { grade.appendChild(c); });
  }

  function ligarOrdenacao() {
    var select = document.querySelector('[data-ordenar]');
    if (!select) return;

    select.addEventListener('change', function () {
      ordenarGrade(select.value);
    });
  }

  /** A ordem escolhida, para reaplicar depois de redesenhar. */
  function ordemEscolhida() {
    var select = document.querySelector('[data-ordenar]');
    return select ? select.value : '';
  }

  /* ---------- carrossel da página inicial ---------- */

  var BENEFICIOS = {
    'Tirzepatida': ['Redução de peso', 'Controle do apetite', 'Acompanhamento médico'],
    'Retatrutida': ['Protocolo avançado', 'Controle do apetite', 'Acompanhamento médico'],
    'Peptídeos': ['Pele e cabelo', 'Recuperação', 'Bem-estar']
  };

  var ICONES = [
    '<circle cx="12" cy="4.4" r="1.8"/><path d="M9.4 7.8h5.2c0 2.1-1.1 3-1.1 4.5s1.1 2.4 1.1 4.5v3H9.4v-3c0-2.1 1.1-3 1.1-4.5s-1.1-2.4-1.1-4.5z"/><path d="M3.4 12.4h2.6M18 12.4h2.6M5 11l-1.6 1.4L5 13.8M19 11l1.6 1.4-1.6 1.4"/>',
    '<path d="M12 3 5.4 5.9v4.8c0 3.9 2.7 7.2 6.6 8.7 3.9-1.5 6.6-4.8 6.6-8.7V5.9z"/><path d="M12 8.4v5.4m0 0-2.1-2.1M12 13.8l2.1-2.1"/>',
    '<circle cx="12" cy="7.4" r="3.2"/><path d="M5 20c.6-3.8 3.4-6 7-6s6.4 2.2 7 6"/>'
  ];

  function montarCarrossel() {
    var trilho = document.querySelector('[data-carousel]');
    if (!trilho) return;

    var destaques = visiveis().slice(0, 5);

    trilho.innerHTML = destaques.map(function (p, i) {
      var beneficios = BENEFICIOS[p.categoria] || BENEFICIOS['Tirzepatida'];
      var etiqueta = i === 0 ? 'MAIS PROCURADO' : (p.antes ? 'PROMOÇÃO' : '');

      var minis = beneficios.map(function (b, k) {
        return '<div class="mini">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + ICONES[k] + '</svg>' +
          '<span>' + esc(b) + '</span></div>';
      }).join('');

      return '' +
        '<article class="protocol">' +
          '<div class="protocol__media">' +
            (etiqueta
              ? '<span class="badge">' +
                  '<svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">' +
                    '<path d="m6 .8 1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.6 2.9 10.2l.6-3.4L1 4.4l3.4-.5z"/>' +
                  '</svg>' + etiqueta + '</span>'
              : '') +
            '<img src="' + esc(p.imagem) + '" alt="' + esc(p.nome) + ' Pharma Fit">' +
          '</div>' +
          '<div class="protocol__body">' +
            '<h3 class="protocol__name">' + esc(p.nome) + '</h3>' +
            '<p class="protocol__desc">' + esc(p.descricao) + '</p>' +
            '<div class="protocol__preco">' + blocoPreco(p) + '</div>' +
            '<div class="mini-list">' + minis + '</div>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  function montarTudo() {
    montarChips();
    montarGrade();
    montarCarrossel();
  }

  montarTudo();
  ligarOrdenacao();

  /* A conversa com o banco mora em `catalogo-banco.js`, e não mais aqui.
     Ela era deste arquivo, que só é carregado em quatro páginas — a
     página de um produto ficava de fora e mostrava para sempre o preço
     escrito no código. O porquê está escrito lá.

     Aqui só sobra o que é desta tela: redesenhar quando o catálogo
     mudar.

     UM OUVINTE SÓ, E NESTA ORDEM. Antes havia dois: um redesenhava a
     grade e outro reaplicava a ordenação. Dois ouvintes do mesmo evento
     rodam na ordem em que foram escritos, e o da ordenação era o
     primeiro — ele ordenava e o outro redesenhava em cima, desfazendo o
     "menor preço" que a pessoa acabou de escolher. Junto num só, a
     ordem é a que eu escrevo aqui e não a que o arquivo calhou de ter. */
  document.addEventListener('pharmafit-catalogo', function () {
    var ordem = ordemEscolhida();
    montarTudo();
    if (ordem) ordenarGrade(ordem);
  });
})();
