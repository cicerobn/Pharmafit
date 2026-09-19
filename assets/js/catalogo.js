/* =========================================================
   PHARMA FIT — catálogo (fonte única de produtos e preços)

   Este arquivo alimenta a loja. Para mudar preço ou promoção do
   catálogo de partida, mexa só aqui — mas o que vale no ar é o que
   estiver no painel: o banco sobrescreve isto ao carregar a página.

   O PREÇO DE COMPRA NÃO MORA MAIS AQUI

   Ele morava: doze linhas com o preço de compra de cada produto, uma
   por uma. O comentário antigo dizia
   "nunca aparece no site", e isso era verdade para a TELA e mentira
   para o ARQUIVO — este arquivo é servido ao visitante, e abrir
   /assets/js/catalogo.js num navegador mostrava a margem de cada
   produto. O preço de compra agora existe num lugar só: a coluna
   `custo` de `pf_produtos`, que só a equipe logada lê. Você digita
   nela pelo painel, em Produtos → três bolinhas → Preço de compra.

     venda   -> preço para o cliente
     antes   -> preço "de" riscado; 0 = sem promoção
     estoque -> null = sem controle de estoque; número = controla e
                desconta a cada venda confirmada (0 = "sem estoque",
                o site troca o botão por "Avise-me quando chegar")
     parcelas-> quantas vezes sem juros (padrão 3)

   ---------------------------------------------------------
   PREÇO POR QUANTIDADE (atacado) — opcional
   ---------------------------------------------------------

   Brian: para um produto ter preço de atacado, acrescente `atacado`
   nele, assim:

     {
       nome: 'Tirzec Pen 15 mg',
       venda: 1099, antes: 0,
       atacado: [
         { nome: 'Varejo',    de: 1,  ate: 4, preco: 1099 },
         { nome: 'Atacado',   de: 5,  ate: 9, preco: 1050 },
         { nome: 'Atacado +', de: 10,         preco: 999  }
       ],
       ...
     }

     de     -> a partir de quantas unidades esta faixa vale
     ate    -> até quantas (a última não precisa: vale "ou mais")
     preco  -> quanto custa CADA unidade nesta faixa
     nome   -> o rótulo que aparece na tela

   O que a loja faz sozinha, com isso:

     · mostra as faixas lado a lado na página do produto e marca a
       que vale para a quantidade escolhida;
     · diz "levando 4 unidades a mais, cada uma sai por R$ 1.050,00";
     · usa o preço da faixa no carrinho e no total.

   HOJE SÓ O `Tirzec Pen 15 mg` TEM FAIXA, com os números que o Brian
   passou. Os outros não têm, e isso não é esquecimento: preço é número
   do negócio e eu não invento preço. Sem `atacado`, o produto mostra o
   preço normal e nenhuma faixa aparece — a tela não fica com espaço
   vazio nem com faixa de mentira.
   ========================================================= */

window.PHARMAFIT_CATALOGO = [

  /* ---------- tirzepatida ---------- */
  {
    nome: 'Tirzec Pen 15 mg',
    categoria: 'Tirzepatida',
    descricao: 'Caneta aplicadora de tirzepatida 15 mg, pronta para uso.',
    venda: 1099, antes: 0,
    /* As faixas que o Brian passou (16/09/2026, "vá fazendo").
       `venda` fica em 1099 de propósito: é o preço de uma unidade, e a
       primeira faixa repete o mesmo número. Se os dois discordassem, o
       cartão mostraria um preço e o carrinho outro. */
    atacado: [
      { nome: 'Varejo',    de: 1,  ate: 4, preco: 1099 },
      { nome: 'Atacado',   de: 5,  ate: 9, preco: 1050 },
      { nome: 'Atacado +', de: 10,         preco: 999  }
    ],
    imagem: 'assets/img/prod-caneta.svg',
    /* A ETIQUETA DA VITRINE É ESCOLHA DA EQUIPE, NO PAINEL.
       Só existem dois valores, `mais-vendido` e `promocao`, porque são
       os dois que o site sabe desenhar — cada um tem cor e animação
       própria. O que está escrito aqui é só o ponto de partida: o
       painel grava na coluna `destaque` de `pf_produtos` e o que vale
       no ar é o do painel. Tirar a etiqueta lá tira do site. */
    destaque: 'mais-vendido',
    estoque: null
  },
  {
    nome: 'TG 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },
  {
    nome: 'Tirzedral 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },
  {
    nome: 'Lipoless 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },
  {
    nome: 'Tirzec 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },
  {
    nome: 'Gluconex 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },
  {
    nome: 'Lipoland 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },

  /* ---------- retatrutida ---------- */
  {
    nome: 'Retatrutide ZPHC 120 mg',
    categoria: 'Retatrutida',
    descricao: 'Retatrutida 120 mg, linha ZPHC.',
    venda: 3249, antes: 0,
    imagem: 'assets/img/prod-frasco.svg',
    /* AQUI HAVIA `destaque: 'LINHA PREMIUM'`.
       Saiu porque ela não é uma das duas etiquetas que a equipe pode
       escolher no painel: ficaria para sempre nesse produto, sem
       ninguém conseguir tirar pela tela, e sem cor nem animação
       próprias — um retângulo dourado escrito "LINHA PREMIUM".
       Brian: se você quiser uma terceira etiqueta, eu faço; ela precisa
       de nome, cor e de entrar na lista do painel. */
    estoque: null
  },

  /* ---------- peptídeos ---------- */
  {
    nome: 'Glow GHK-Cu Alluvi',
    categoria: 'Peptídeos',
    descricao: 'Peptídeo de cobre GHK-Cu, linha Alluvi.',
    venda: 1099, antes: 0,
    imagem: 'assets/img/prod-frasco.svg',
    estoque: null
  },
  {
    nome: 'GHK-Cu 100 mg',
    categoria: 'Peptídeos',
    descricao: 'Peptídeo de cobre GHK-Cu, frasco de 100 mg.',
    venda: 799, antes: 0,
    imagem: 'assets/img/prod-frasco.svg',
    estoque: null
  },
  {
    nome: 'Klow 70 mg',
    categoria: 'Peptídeos',
    descricao: 'Blend de peptídeos Klow, frasco de 70 mg.',
    venda: 870, antes: 0,
    imagem: 'assets/img/prod-frasco.svg',
    estoque: null
  }
];

/* ---------------------------------------------------------
   Ajudantes de preço, usados pela loja e pelo painel
   --------------------------------------------------------- */
window.PharmaFitPreco = {

  /** 999 -> "R$ 999,00" */
  formatar: function (valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL', minimumFractionDigits: 2
    });
  },

  /** Valor de cada parcela sem juros (padrão: 3x). */
  parcela: function (valor, vezes) {
    vezes = vezes || 3;
    return Number(valor || 0) / vezes;
  },

  /** "ou 3x sem juros de R$ 333,00"
   *
   * Era "ou EM ATÉ 3x…". As duas palavras saíram por medida, não por
   * gosto: com elas a frase pedia 150px e a coluna do cartão da
   * vitrine tem 146 — quatro pixels custavam uma linha inteira (14px
   * de altura) em TODO cartão, num cartão que o Brian pediu menor
   * (18/09/2026). Medi as duas saídas e escolhi esta: diminuir a letra
   * para caber deixaria o texto menos legível, e o site sempre calcula
   * em 3 vezes, então "ou 3x" diz o mesmo que "ou em até 3x" sem
   * prometer nada diferente. */
  textoParcelas: function (valor, vezes) {
    vezes = vezes || 3;
    return 'ou ' + vezes + 'x sem juros de ' +
      window.PharmaFitPreco.formatar(window.PharmaFitPreco.parcela(valor, vezes));
  },

  /**
   * A MESMA PARCELA, EM HTML, COM O "3x sem juros" EM DESTAQUE.
   *
   * Brian, 18/09/2026: "ali onde fala da parcela tambem deixe mais
   * bonito". A linha era a menor letra do cartão, cinza e corrida.
   *
   * POR QUE UMA SEGUNDA FUNÇÃO em vez de pôr `<b>` na de cima: a de
   * cima é usada com `textContent` na página do produto — ali o `<b>`
   * apareceria escrito na tela, letra por letra. E há um motivo mais
   * fundo: o tradutor do site casa FRASE INTEIRA por nó de texto, e
   * partir "ou 3x sem juros de R$ 366,33" em pedaços faria a frase
   * inteira deixar de casar. Por isso cada pedaço aqui é uma frase
   * fechada, com o seu próprio padrão em `idioma-es.js`:
   *   "3x sem juros"  ·  "de R$ 366,33"
   */
  htmlParcelas: function (valor, vezes) {
    vezes = vezes || 3;
    var P = window.PharmaFitPreco;
    return '<span class="parcela">' +
        '<span class="parcela__chip">' + vezes + 'x sem juros</span>' +
        '<span class="parcela__valor">de ' + P.formatar(P.parcela(valor, vezes)) + '</span>' +
      '</span>';
  },

  /** Desconto em % entre o preço antigo e o atual (0 se não houver). */
  desconto: function (antes, venda) {
    if (!antes || antes <= venda) return 0;
    return Math.round((1 - venda / antes) * 100);
  },

  /** Margem em reais entre venda e custo. */
  margem: function (custo, venda) {
    return Number(venda || 0) - Number(custo || 0);
  }
};

/* =========================================================
   A COR DO FUNDO DE CADA FOTO DE PRODUTO

   Brian, 19/09/2026: "Alguns produtos ainda estao com a borda, nao
   quero que isso aconteca nem que isso se repita".

   O PROBLEMA, medido: a foto quase nunca tem o formato exato da moldura
   onde ela aparece, e o que sobra nas laterais (ou em cima) é a cor da
   moldura. Foto de catálogo tem fundo branco OU QUASE branco — medi
   247,247,247 numa e 252,252,250 noutra —, e as molduras do site são
   brancas ou creme. Dá um degrau de 5 a 8 tons numa linha reta, que é
   pouco no número e bem visível no olho: é a borda que ele viu no TG,
   no Gluconex e no Lipoland.

   EU TENTEI PRIMEIRO PINTAR A MOLDURA COM A PRÓPRIA FOTO DESFOCADA, e
   medi antes de acreditar: FICOU PIOR. O desfoque preenche a moldura
   com um recorte, então numa foto em pé ele mostra a parte escura do
   produto enquanto a foto de verdade tem margem branca ao lado — a
   emenda subiu de 8 para 191 tons. Ideia bonita, número ruim.

   O QUE RESOLVE: a moldura toma a COR DO FUNDO DA PRÓPRIA FOTO, lida
   dos quatro cantos dela. A sobra fica exatamente da cor do que está ao
   lado, e não existe emenda para se ver — com qualquer foto, de
   qualquer formato, hoje e nas próximas, sem ninguém subir foto de
   novo.

   MORA AQUI, E NÃO NO `loja.js`, porque a foto aparece em quatro
   lugares e o `loja.js` não é carregado em todos: o cartão da vitrine,
   a fila da página inicial, a foto grande da página do produto e a
   miniatura do carrinho. `catalogo.js` é o único que todas as páginas
   carregam.

   TRÊS CUIDADOS, e cada um tem motivo:

   1. A LEITURA USA UMA SEGUNDA IMAGEM, com `crossOrigin`. Ler pixel de
      imagem de outro endereço só é permitido com CORS, e pedir CORS na
      imagem QUE APARECE na tela seria arriscado: se o servidor não
      mandasse o cabeçalho, a foto não carregaria e o cliente ficaria
      sem foto nenhuma. A que aparece continua sem `crossOrigin`; esta
      cópia só serve para medir. Falhando a medida, a moldura fica como
      estava — o pior caso é o de hoje.

   2. SÓ PINTA SE OS QUATRO CANTOS CONCORDAREM. Numa foto sem fundo
      uniforme (um ambiente, uma bancada), qualquer cor escolhida
      estaria errada em três dos quatro lados.

   3. NÃO ESCURECE A MOLDURA SEM PRECISAR. Fundo abaixo de 120 de 255
      fica de fora: moldura escura dentro de um cartão branco chama mais
      atenção que a emenda que ela conserta — e foi disso que ele
      reclamou na fila "Em destaque" no dia 18.
   ========================================================= */

(function () {
  'use strict';

  function lerCanto(ctx, x, y) {
    var d = ctx.getImageData(x, y, 1, 1).data;
    return [d[0], d[1], d[2]];
  }

  function medir(caixa, url) {
    var medida = new Image();
    medida.crossOrigin = 'anonymous';
    medida.onload = function () {
      try {
        var n = 24;
        var tela = document.createElement('canvas');
        tela.width = n; tela.height = n;
        var ctx = tela.getContext('2d');
        ctx.drawImage(medida, 0, 0, n, n);

        var cantos = [[1, 1], [n - 2, 1], [1, n - 2], [n - 2, n - 2]]
          .map(function (c) { return lerCanto(ctx, c[0], c[1]); });

        var media = [0, 1, 2].map(function (k) {
          return Math.round(cantos.reduce(function (t, c) { return t + c[k]; }, 0) / cantos.length);
        });
        /* OS QUATRO CANTOS PRECISAM CONCORDAR. VOLTEI ATRÁS NISTO.
         *
         * Brian, 19/09/2026, com o cartão do Gluconex numa moldura
         * verde-oliva: "Volte atras disso aqui".
         *
         * ONTEM EU TIREI ESTA EXIGÊNCIA e mandei pintar a média dos
         * cantos SEMPRE, concordando eles ou não. O raciocínio era que
         * uma diferença de tom incomoda menos que um retângulo de cor
         * errada. A foto dele mostrou o furo: com a foto APROXIMADA,
         * os cantos deixam de ser fundo e viram PRODUTO. A média de
         * azul, dourado e branco deu verde-oliva, e o cartão ficou com
         * uma moldura de uma cor que não existe na foto.
         *
         * "Média de cores que discordam" não é uma cor aproximada: é
         * uma cor nova, que não está em lugar nenhum da imagem. Pior
         * que a emenda que ela tentava esconder.
         *
         * Cantos discordando = não dá para saber qual é o fundo. Então
         * a moldura fica como estava (o creme claro do cartão) e a
         * emenda volta a ser os 5 a 8 tons de sempre — o pior caso é o
         * que já existia, e ninguém inventa cor. */
        var espalha = Math.max.apply(null, [0, 1, 2].map(function (k) {
          var vs = cantos.map(function (c) { return c[k]; });
          return Math.max.apply(null, vs) - Math.min.apply(null, vs);
        }));
        if (espalha > 26) return;

        /* E AQUI MORAVA A REGRA QUE CRIOU A RECLAMAÇÃO DE ONTEM: fundo
           mais escuro que 120 de 255 não pintava a moldura. Essa NÃO
           volta. Ela era o que deixava a foto de fundo preto (Lipoland)
           dentro de uma moldura branca, com um retângulo de beirada
           dura no meio do cartão. Fundo preto lido com os quatro cantos
           concordando é fundo preto de verdade, e a moldura acompanha. */

        caixa.style.setProperty('--fundo-foto',
          'rgb(' + media[0] + ',' + media[1] + ',' + media[2] + ')');
      } catch (e) {
        /* imagem de outro endereço sem CORS: a moldura fica como estava */
      }
    };
    medida.src = url;
  }

  /**
   * Pinta a moldura de toda foto marcada com `data-fundo-da-foto`
   * dentro de `raiz`. A marca pode estar na moldura (que contém um
   * <img>) ou na própria <img>, como no carrinho.
   */
  window.PharmaFitFundoDaFoto = function (raiz) {
    var alvos = (raiz || document).querySelectorAll('[data-fundo-da-foto]');
    [].forEach.call(alvos, function (caixa) {
      var img = caixa.tagName === 'IMG' ? caixa : caixa.querySelector('img');
      var url = img && img.getAttribute('src');
      if (!url) return;
      /* A marca guarda QUAL endereço foi lido, e não um simples "já
         li": quando o endereço da foto troca — é o que faz o plano B
         do redimensionador, em `loja.js` — a medida antiga vale para
         uma foto que não está mais ali. */
      if (caixa.dataset.fundoLido === url) return;
      caixa.dataset.fundoLido = url;
      medir(caixa, url);
    });
  };
})();

/* =========================================================
   OS TRÊS BENEFÍCIOS DE CADA CATEGORIA

   Eles moravam dentro de `loja.js`, que desenha o carrossel da página
   inicial e a lista de produtos. Mas `loja.js` não é carregado na
   página de UM produto — e foi ali que o Brian pediu para "ver tudo
   sobre ele". Copiar a lista para o outro arquivo seria a mesma doença
   dos menus: duas listas iguais que, no dia em que uma mudar, param de
   ser iguais e ninguém percebe.

   Então a lista mora aqui, junto do catálogo, e quem desenha é UMA
   função, chamada pelas duas telas. Se o texto mudar, muda nas duas.

   O `­` é o hífen suave: invisível, vira tracinho só se a palavra
   precisar quebrar naquele ponto. "Acompanhamento" tem 14 letras e em
   celular estreito não cabe na coluna do cartão; sem ele o navegador
   partia a palavra em qualquer lugar e sem tracinho, parecendo erro de
   escrita. O tradutor de espanhol ignora este caractere ao procurar a
   frase no dicionário (ver `idioma.js`).
   ========================================================= */
window.PharmaFitBeneficios = (function () {
  'use strict';

  var HIFEN = '­';

  var POR_CATEGORIA = {
    'Tirzepatida': ['Redução de peso', 'Controle do apetite',
                    'Acompanha' + HIFEN + 'mento médico'],
    'Retatrutida': ['Protocolo avançado', 'Controle do apetite',
                    'Acompanha' + HIFEN + 'mento médico'],
    'Peptídeos':   ['Pele e cabelo', 'Recuperação', 'Bem-estar']
  };

  var DESENHOS = [
    '<circle cx="12" cy="4.4" r="1.8"/><path d="M9.4 7.8h5.2c0 2.1-1.1 3-1.1 4.5s1.1 2.4 1.1 4.5v3H9.4v-3c0-2.1 1.1-3 1.1-4.5s-1.1-2.4-1.1-4.5z"/><path d="M3.4 12.4h2.6M18 12.4h2.6M5 11l-1.6 1.4L5 13.8M19 11l1.6 1.4-1.6 1.4"/>',
    '<path d="M12 3 5.4 5.9v4.8c0 3.9 2.7 7.2 6.6 8.7 3.9-1.5 6.6-4.8 6.6-8.7V5.9z"/><path d="M12 8.4v5.4m0 0-2.1-2.1M12 13.8l2.1-2.1"/>',
    '<circle cx="12" cy="7.4" r="3.2"/><path d="M5 20c.6-3.8 3.4-6 7-6s6.4 2.2 7 6"/>'
  ];

  function escapar(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Os três textos da categoria (cai na Tirzepatida se não conhecer). */
  function lista(categoria) {
    return POR_CATEGORIA[categoria] || POR_CATEGORIA['Tirzepatida'];
  }

  /** O HTML da faixa, igual no cartão e na página do produto. */
  function html(categoria) {
    return lista(categoria).map(function (texto, i) {
      return '<div class="mini">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        DESENHOS[i] + '</svg>' +
        '<span>' + escapar(texto) + '</span></div>';
    }).join('');
  }

  return { lista: lista, html: html };
})();
