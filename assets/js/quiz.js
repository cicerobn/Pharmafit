/* =========================================================
   PHARMA FIT — quiz de direcionamento

   Três perguntas rápidas para entender o que a pessoa procura
   e levá-la ao produto certo (ou ao atacado / representantes).
   No fim, o pedido já sai encaminhado para o WhatsApp.
   ========================================================= */
(function () {
  'use strict';

  var catalogo = window.PHARMAFIT_CATALOGO || [];
  var Preco = window.PharmaFitPreco;

  var PERGUNTAS = [
    {
      chave: 'objetivo',
      titulo: 'O que você procura agora?',
      ajuda: 'Escolha o que mais combina com o seu momento.',
      opcoes: [
        { valor: 'peso',       rotulo: 'Emagrecer com acompanhamento', detalhe: 'Controle de peso e apetite' },
        { valor: 'pele',       rotulo: 'Pele, cabelo e recuperação',   detalhe: 'Linha de peptídeos' },
        { valor: 'avancado',   rotulo: 'Protocolo mais avançado',      detalhe: 'Para quem já fez tratamento antes' },
        { valor: 'revenda',    rotulo: 'Comprar para revender',        detalhe: 'Clínica, profissional ou parceiro' }
      ]
    },
    {
      chave: 'experiencia',
      titulo: 'Você já fez algum protocolo?',
      ajuda: 'Isso muda a dose que vamos indicar.',
      opcoes: [
        { valor: 'nunca',   rotulo: 'É a primeira vez',        detalhe: 'Começar do começo, com calma' },
        { valor: 'ja-fiz',  rotulo: 'Já fiz antes',            detalhe: 'Conheço o processo' },
        { valor: 'em-uso',  rotulo: 'Estou em tratamento',     detalhe: 'Quero continuar ou trocar' }
      ]
    },
    {
      chave: 'formato',
      titulo: 'Como prefere aplicar?',
      ajuda: 'Se não souber, escolha "tanto faz" que a equipe orienta.',
      opcoes: [
        { valor: 'caneta',   rotulo: 'Caneta pronta para uso', detalhe: 'Mais prático' },
        { valor: 'ampola',   rotulo: 'Ampolas',                detalhe: 'Melhor custo por dose' },
        { valor: 'tanto-faz', rotulo: 'Tanto faz',             detalhe: 'Quero a recomendação de vocês' }
      ]
    }
  ];

  var respostas = {};
  var passo = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function acharProduto(filtro) {
    return catalogo.filter(filtro)[0] || catalogo[0];
  }

  /* ---------- a recomendação ---------- */

  function recomendar() {
    /* revenda não é produto: vai para a área de parceiros */
    if (respostas.objetivo === 'revenda') {
      return {
        setor: 'representantes',
        titulo: 'Você se encaixa na nossa área de parceiros',
        texto: 'Revendedores, clínicas e profissionais têm condições próprias e atendimento ' +
               'direto. Faça seu cadastro que a equipe entra em contato.',
        acao: { rotulo: 'Ir para a área de representantes', href: 'representantes.html' },
        secundaria: { rotulo: 'Pedir orçamento em quantidade', href: 'atacado.html' }
      };
    }

    if (respostas.objetivo === 'pele') {
      var pept = acharProduto(function (p) { return p.categoria === 'Peptídeos'; });
      return {
        setor: 'peptideos',
        titulo: 'A linha de peptídeos é o seu caminho',
        texto: 'Nossa indicação para pele, cabelo e recuperação.',
        produto: pept,
        acao: { rotulo: 'Falar com a equipe', pedido: pept.nome },
        secundaria: { rotulo: 'Ver toda a linha', href: 'produtos.html' }
      };
    }

    if (respostas.objetivo === 'avancado' || respostas.experiencia === 'em-uso') {
      var avancado = acharProduto(function (p) { return p.categoria === 'Retatrutida'; });
      return {
        setor: 'avancado',
        titulo: 'Protocolo avançado, com acompanhamento de perto',
        texto: 'Para quem já passou por outros tratamentos e quer um passo além. ' +
               'A equipe confirma a dose antes de fechar.',
        produto: avancado,
        acao: { rotulo: 'Falar com a equipe', pedido: avancado.nome },
        secundaria: { rotulo: 'Ver outras opções', href: 'produtos.html' }
      };
    }

    /* controle de peso: caneta para quem quer praticidade, ampolas para custo */
    var caneta = acharProduto(function (p) { return /pen/i.test(p.nome); });
    var ampola = acharProduto(function (p) { return /ampolas/i.test(p.nome) && p.antes; });

    var escolhido = respostas.formato === 'ampola' ? ampola
                  : respostas.formato === 'caneta' ? caneta
                  : (respostas.experiencia === 'nunca' ? caneta : ampola);

    return {
      setor: 'peso',
      titulo: respostas.experiencia === 'nunca'
        ? 'Começando do jeito certo'
        : 'A continuação natural do seu protocolo',
      texto: 'Indicação com base no que você respondeu. A dose final é confirmada ' +
             'pela equipe no atendimento.',
      produto: escolhido,
      acao: { rotulo: 'Falar com a equipe', pedido: escolhido.nome },
      secundaria: { rotulo: 'Ver todos os produtos', href: 'produtos.html' }
    };
  }

  /* ---------- telas ---------- */

  function pintarPasso() {
    var caixa = document.getElementById('quiz');
    var p = PERGUNTAS[passo];

    document.getElementById('quiz-progresso').style.width =
      Math.round((passo / PERGUNTAS.length) * 100) + '%';
    document.getElementById('quiz-etapa').textContent =
      'Pergunta ' + (passo + 1) + ' de ' + PERGUNTAS.length;

    caixa.innerHTML =
      '<h2 class="quiz__titulo">' + esc(p.titulo) + '</h2>' +
      '<p class="quiz__ajuda">' + esc(p.ajuda) + '</p>' +
      '<div class="quiz__opcoes">' +
        p.opcoes.map(function (o) {
          return '<button class="quiz__op" type="button" data-valor="' + esc(o.valor) + '">' +
            '<span class="quiz__op-nome">' + esc(o.rotulo) + '</span>' +
            '<span class="quiz__op-detalhe">' + esc(o.detalhe) + '</span>' +
            '<svg class="quiz__op-seta" width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
              'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="m9 5 7 7-7 7"/></svg>' +
          '</button>';
        }).join('') +
      '</div>' +
      (passo > 0
        ? '<button class="quiz__voltar" type="button" data-voltar>← Voltar</button>'
        : '');
  }

  function pintarResultado() {
    var r = recomendar();
    var caixa = document.getElementById('quiz');

    document.getElementById('quiz-progresso').style.width = '100%';
    document.getElementById('quiz-etapa').textContent = 'Pronto!';

    var blocoProduto = '';
    if (r.produto) {
      var p = r.produto;
      blocoProduto =
        '<article class="quiz__produto">' +
          '<div class="quiz__produto-img"><img src="' + esc(p.imagem) + '" alt="' + esc(p.nome) + '"></div>' +
          '<div>' +
            '<h3 class="quiz__produto-nome">' + esc(p.nome) + '</h3>' +
            '<p class="quiz__produto-desc">' + esc(p.descricao) + '</p>' +
            (p.antes ? '<p class="product__antes"><s>' + Preco.formatar(p.antes) + '</s>' +
              '<span class="selo-off">-' + Preco.desconto(p.antes, p.venda) + '%</span></p>' : '') +
            '<p class="product__price">' + Preco.formatar(p.venda) + '</p>' +
            '<p class="product__installment">' + Preco.htmlParcelas(p.venda) + '</p>' +
          '</div>' +
        '</article>';
    }

    caixa.innerHTML =
      '<p class="quiz__selo">Sua indicação</p>' +
      '<h2 class="quiz__titulo">' + esc(r.titulo) + '</h2>' +
      '<p class="quiz__ajuda">' + esc(r.texto) + '</p>' +
      blocoProduto +
      '<div class="quiz__acoes">' +
        (r.acao.pedido
          ? '<button class="btn btn--primary btn--block" type="button" data-pedido="' + esc(r.acao.pedido) + '">' +
              esc(r.acao.rotulo) + '</button>'
          : '<a class="btn btn--primary btn--block" href="' + esc(r.acao.href) + '">' + esc(r.acao.rotulo) + '</a>') +
        '<a class="btn btn--outline" href="' + esc(r.secundaria.href) + '">' + esc(r.secundaria.rotulo) + '</a>' +
      '</div>' +
      '<button class="quiz__voltar" type="button" data-refazer>Refazer o quiz</button>';
  }

  /* ---------- eventos ---------- */

  document.addEventListener('click', function (e) {
    var opcao = e.target.closest('.quiz__op');
    if (opcao) {
      respostas[PERGUNTAS[passo].chave] = opcao.getAttribute('data-valor');
      passo++;
      if (passo < PERGUNTAS.length) pintarPasso();
      else pintarResultado();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (e.target.closest('[data-voltar]')) {
      passo = Math.max(0, passo - 1);
      pintarPasso();
      return;
    }

    if (e.target.closest('[data-refazer]')) {
      passo = 0;
      respostas = {};
      pintarPasso();
    }
  });

  pintarPasso();
})();
