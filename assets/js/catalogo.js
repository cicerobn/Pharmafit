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
    destaque: 'MAIS VENDIDO',
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
    destaque: 'LINHA PREMIUM',
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

  /** "ou em até 3x sem juros de R$ 333,00" */
  textoParcelas: function (valor, vezes) {
    vezes = vezes || 3;
    return 'ou em até ' + vezes + 'x sem juros de ' +
      window.PharmaFitPreco.formatar(window.PharmaFitPreco.parcela(valor, vezes));
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
