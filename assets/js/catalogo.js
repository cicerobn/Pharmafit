/* =========================================================
   PHARMA FIT — catálogo (fonte única de produtos e preços)

   Este arquivo alimenta a loja e o painel de gestão.
   Para mudar preço, custo ou promoção, mexa só aqui.

     custo   -> quanto o produto custa para vocês (nunca aparece no site)
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
       custo: 520, venda: 1099, antes: 0,
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

   NENHUM PRODUTO TEM `atacado` HOJE, de propósito: esses preços são
   números do negócio, e eu não invento preço. Sem `atacado`, o
   produto mostra o preço normal e nenhuma faixa aparece — a tela não
   fica com espaço vazio nem com faixa de mentira.
   ========================================================= */

window.PHARMAFIT_CATALOGO = [

  /* ---------- tirzepatida ---------- */
  {
    nome: 'Tirzec Pen 15 mg',
    categoria: 'Tirzepatida',
    descricao: 'Caneta aplicadora de tirzepatida 15 mg, pronta para uso.',
    custo: 520, venda: 1099, antes: 0,
    imagem: 'assets/img/prod-caneta.svg',
    destaque: 'MAIS VENDIDO',
    estoque: null
  },
  {
    nome: 'TG 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    custo: 450, venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },
  {
    nome: 'Tirzedral 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    custo: 0, venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },
  {
    nome: 'Lipoless 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    custo: 435, venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },
  {
    nome: 'Tirzec 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    custo: 450, venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },
  {
    nome: 'Gluconex 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    custo: 450, venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },
  {
    nome: 'Lipoland 15 mg — 4 ampolas',
    categoria: 'Tirzepatida',
    descricao: 'Tirzepatida 15 mg, caixa com 4 ampolas.',
    custo: 440, venda: 999, antes: 1300,
    imagem: 'assets/img/prod-ampolas.svg',
    estoque: null
  },

  /* ---------- retatrutida ---------- */
  {
    nome: 'Retatrutide ZPHC 120 mg',
    categoria: 'Retatrutida',
    descricao: 'Retatrutida 120 mg, linha ZPHC.',
    custo: 2060, venda: 3249, antes: 0,
    imagem: 'assets/img/prod-frasco.svg',
    destaque: 'LINHA PREMIUM',
    estoque: null
  },

  /* ---------- peptídeos ---------- */
  {
    nome: 'Glow GHK-Cu Alluvi',
    categoria: 'Peptídeos',
    descricao: 'Peptídeo de cobre GHK-Cu, linha Alluvi.',
    custo: 620, venda: 1099, antes: 0,
    imagem: 'assets/img/prod-frasco.svg',
    estoque: null
  },
  {
    nome: 'GHK-Cu 100 mg',
    categoria: 'Peptídeos',
    descricao: 'Peptídeo de cobre GHK-Cu, frasco de 100 mg.',
    custo: 200, venda: 799, antes: 0,
    imagem: 'assets/img/prod-frasco.svg',
    estoque: null
  },
  {
    nome: 'Klow 70 mg',
    categoria: 'Peptídeos',
    descricao: 'Blend de peptídeos Klow, frasco de 70 mg.',
    custo: 300, venda: 870, antes: 0,
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
