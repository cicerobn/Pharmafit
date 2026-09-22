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

  /* ---------- a foto no tamanho da TELA, não no tamanho do arquivo ----------
   *
   * Brian, 19/09/2026: "os produtos tao demorando uma eternidade pra
   * aparecer — as fotos deles".
   *
   * O QUE ESTAVA ACONTECENDO. A foto que a equipe sobe pelo painel é
   * reduzida para 1200px no maior lado (está explicado em
   * `gestao/app/produtos.js`), o que é certo para a página do produto.
   * Só que o cartão da vitrine mostra essa mesma foto num quadrado de
   * ~150px no celular. O visitante baixava onze fotos de 1200px para
   * ver onze miniaturas — e, como o preço e o texto vêm da consulta ao
   * banco e chegam antes, a tela ficava pronta com onze retângulos
   * vazios esperando as fotos. É exatamente o que a foto que ele mandou
   * mostra: os preços do banco já na tela, as fotos não.
   *
   * O CONSERTO. O Supabase serve a mesma foto redimensionada quando se
   * troca `/object/` por `/render/image/` e se pede a largura. 400px de
   * largura (o dobro do cartão, para tela retina) custa uma fração do
   * arquivo inteiro.
   *
   * E SE O PROJETO NÃO TIVER ESSE RECURSO? Redimensionar no servidor é
   * recurso de plano pago no Supabase, e eu não consigo conferir daqui
   * qual é o plano — a rede deste ambiente não alcança o banco. Então o
   * código não aposta: se o endereço redimensionado falhar, o `error`
   * lá embaixo devolve a foto inteira e desliga a tentativa para todas
   * as outras. O pior caso é um pedido perdido, uma vez; o melhor é a
   * vitrine abrindo numa fração do peso.
   *
   * Foto que não é do balde (o SVG genérico daqui, ou endereço de fora)
   * passa intacta: não há o que redimensionar. */
  var CAMINHO_ARQUIVO = '/storage/v1/object/public/';
  var CAMINHO_MEDIDA = '/storage/v1/render/image/public/';
  var semRedimensionador = false;

  function fotoDoTamanho(url, largura) {
    var u = String(url || '');
    if (semRedimensionador || u.indexOf(CAMINHO_ARQUIVO) === -1) return u;
    return u.replace(CAMINHO_ARQUIVO, CAMINHO_MEDIDA) +
      '?width=' + largura + '&resize=contain&quality=70';
  }

  /* A PÁGINA DO PRODUTO USA A MESMA CONTA, por isso ela sai daqui.
     `tela-produto.js` carrega depois deste arquivo e monta o `<img>`
     grande na mão — sem isto ele teria a sua própria cópia da regra, e
     no dia em que o endereço do redimensionador mudasse, metade do site
     seguiria o outro caminho. */
  window.PharmaFitFoto = fotoDoTamanho;

  /** O `<img>` de uma foto de produto, já no tamanho que a tela usa. */
  function fotoHtml(p, largura, eager) {
    var pedida = fotoDoTamanho(p.imagem, largura);
    var original = String(p.imagem || '');

    return '<img src="' + esc(pedida) + '"' +
      /* Só existe quando houve troca de endereço: é ele que diz ao
         conserto abaixo qual era a foto inteira.
         `data-foto-inteira`, e NÃO `data-foto`: este último já é um
         marcador desta casa — `app.js` acha por ele a foto que voa até
         o carrinho, e o CSS da página do produto o usa como seletor.
         Guardar um endereço nele fazia dois donos para o mesmo nome. */
      (pedida !== original ? ' data-foto-inteira="' + esc(original) + '"' : '') +
      ' alt="' + esc(p.nome) + ' Pharma Fit"' +
      ' decoding="async"' +
      /* Os primeiros cartões da tela NÃO são preguiçosos: `lazy` neles
         manda o navegador esperar o layout para só então pedir a foto,
         e são justamente as fotos que a pessoa já está olhando. Do
         quarto em diante, preguiçoso de novo — esses ela pode nem ver. */
      (eager ? '' : ' loading="lazy"') +
      '>';
  }

  /* O CONSERTO, SE O REDIMENSIONADOR NÃO EXISTIR.
     `error` de imagem não sobe pela árvore, por isso o `true` no fim:
     sem a fase de captura este ouvinte nunca seria chamado. */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;

    var inteira = img.getAttribute('data-foto-inteira');
    /* Sem o atributo, ou já mostrando a foto inteira: aí o problema é
       a foto mesmo, e não o redimensionador. Não há o que fazer. */
    if (!inteira || img.src === inteira) return;

    semRedimensionador = true;
    img.src = inteira;

    /* As outras da tela iam falhar pelo mesmo motivo. Trocar todas
       agora evita onze pedidos perdidos em vez de um. */
    Array.prototype.forEach.call(
      document.querySelectorAll('img[data-foto-inteira]'),
      function (outra) {
        var url = outra.getAttribute('data-foto-inteira');
        if (url && outra.src !== url) outra.src = url;
      }
    );

    /* E A COR DO FUNDO DA MOLDURA TEM DE SER LIDA DE NOVO.
       Esta é a costura entre os dois consertos desta noite: a moldura
       toma a cor do fundo da foto (para não sobrar borda em volta), e
       essa leitura já rodou — falhando, porque o endereço redimensionado
       não existia. Sem apagar a marca de "já lido", a moldura ficaria
       branca para sempre e a borda voltaria justamente no projeto que
       não tem redimensionador. */
    if (window.PharmaFitFundoDaFoto) {
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-fundo-da-foto]'),
        function (caixa) { delete caixa.dataset.fundoLido; }
      );
      window.PharmaFitFundoDaFoto(document);
    }
  }, true);

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

  /* ---------- as etiquetas da vitrine ----------

     Brian, 18/09/2026: "Deixe que essas barras de 'mais vendido,
     promocao' esteja so em alguns produtos especificos que eu
     selecionar no painel".

     ANTES NENHUMA DAS DUAS ERA ESCOLHIDA POR ALGUÉM.

     · `MAIS PROCURADO` ia no primeiro cartão do carrossel — `i === 0`.
       Não era o mais procurado: era o de cima. Mudar a ordem do
       catálogo mudava qual produto a loja anunciava como campeão, e
       nada na tela dizia isso.
     · `PROMOÇÃO` aparecia sozinha em todo produto com preço antigo.
       Sete dos onze têm preço antigo — a etiqueta que devia chamar o
       olho estava em sete cartões de onze, e ao lado de um preço
       riscado que já dizia a mesma coisa.

     Agora ela vem da coluna `destaque` do produto, que só a equipe
     escreve, no painel. Produto sem escolha não tem etiqueta.

     SÃO DOIS VALORES, E NÃO TEXTO LIVRE. A etiqueta manda na cor e na
     animação: só existe desenho para estes dois. Texto livre deixaria
     entrar um "QUEIMA DE ESTOQUE" que apareceria como um retângulo sem
     estilo na vitrine. O banco recusa o que não está aqui (migração
     12), e este mapa recusa de novo — se um valor estranho chegar por
     qualquer caminho, o cartão fica SEM etiqueta em vez de ficar feio. */

  var ETIQUETAS = {
    /* A ETIQUETA DA FILA "EM DESTAQUE", na página inicial.
       Brian, 18/09/2026: "Todos que estiverem ai deixe a barra de
       'mais procurado'".
       Ela NÃO é oferecida no painel de propósito: não é característica
       de um produto, é o nome da vitrine onde ele está. Quem manda
       nela é o lugar (a fila da inicial), e por isso os três cartões
       de lá mostram a mesma — quem quiser saber o que é promoção vê o
       preço riscado, no próprio cartão. */
    'mais-procurado': {
      texto: 'MAIS PROCURADO',
      classe: 'vendido',
      desenho: '<path d="m6 .8 1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.6 2.9 10.2l.6-3.4L1 4.4l3.4-.5z"/>'
    },
    'mais-vendido': {
      texto: 'MAIS VENDIDO',
      classe: 'vendido',
      /* a estrela */
      desenho: '<path d="m6 .8 1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.6 2.9 10.2l.6-3.4L1 4.4l3.4-.5z"/>'
    },
    'promocao': {
      texto: 'PROMOÇÃO',
      classe: 'promo',
      /* o sinal de por cento: dois anéis e a barra. Desenhado com
         PREENCHIMENTO, e não com traço, porque estes ícones vão dentro
         de um `fill="currentColor"` — um desenho de traço sairia
         invisível ali. */
      desenho:
        '<path d="M3 1.1a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zm0 1.2a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4z"/>' +
        '<path d="M9 7.1a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zm0 1.2a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4z"/>' +
        '<path d="M9.2 1 10.6 2 2.8 11 1.4 10z"/>'
    }
  };

  /**
   * A etiqueta do produto, ou nada.
   *
   * `base` é a classe do cartão onde ela vai: `product__badge` na
   * lista, `badge` no carrossel. As duas formas são diferentes (uma é
   * faixa de canto, a outra é pílula sobre a foto), e por isso cada uma
   * tem a sua classe — mas a COR e a ANIMAÇÃO vêm do mesmo lugar no
   * CSS, pelo sufixo `--promo` / `--vendido`. Assim não existe o caso
   * de a promoção ser vermelha num cartão e dourada no outro.
   */
  function etiquetaHtml(p, base) {
    var e = ETIQUETAS[String((p && p.destaque) || '')];
    if (!e) return '';

    return '<span class="' + base + ' ' + base + '--' + e.classe + '">' +
      '<svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">' +
        e.desenho +
      '</svg>' +
      '<span>' + e.texto + '</span>' +
    '</span>';
  }

  /* ---------- a moldura da foto ----------
   *
   * Brian, 19/09/2026: "Alguns produtos ainda estao com a borda, nao
   * quero que isso aconteca nem que isso se repita".
   *
   * O PROBLEMA, medido: a foto quase nunca tem o formato exato da
   * moldura, e o que sobra nas laterais (ou em cima) é a cor da
   * moldura. Foto de catálogo tem fundo branco OU QUASE branco — 247,
   * 247,247 numa e 252,252,250 noutra —, e a moldura é branca puro. Dá
   * um degrau de 5 a 8 tons numa linha reta de 134px: pouco no número,
   * bem visível no olho. É a borda que ele viu.
   *
   * EU TENTEI PINTAR A MOLDURA COM A PRÓPRIA FOTO DESFOCADA e medi
   * antes de acreditar: FICOU PIOR. O desfoque preenche a moldura com
   * um recorte, então numa foto em pé ele mostra a parte escura do
   * produto enquanto a foto de verdade tem margem branca ao lado — a
   * emenda subiu de 8 para 191 tons.
   *
   * O QUE RESOLVE é `corDoFundoDaFoto`, logo abaixo: a moldura toma a
   * cor dos cantos da própria foto.
   *
   * Aqui fica só a marca de que ESTA imagem é foto de verdade, e não o
   * desenho padrão — com o desenho não há o que igualar, o fundo dele é
   * transparente.
   */
  function molduraFoto(p, classe) {
    if (!p || !p.fotoDeVerdade) return '<div class="' + classe + '">';
    return '<div class="' + classe + ' ' + classe + '--foto" data-fundo-da-foto>';
  }

  /* ---------- bloco de preço, igual na grade e no carrossel ---------- */

  /* O PÉ DO CARTÃO: o que custa e como levar.
   *
   * `botao` é o carrinho redondo, ou vazio quando não há estoque.
   *
   * QUEM FICA NA LINHA DO BOTÃO, E QUEM NÃO FICA. Só o preço divide a
   * linha com ele. O preço antigo e a parcela ficam em linhas inteiras,
   * em cima e embaixo — e isso foi medido, não escolhido: o botão come
   * 46px dos 146px do cartão, e a parcela já usava 140 desses 146.
   * Dentro da coluna estreita ela quebrava em duas linhas e desalinhava
   * a fila inteira.
   *
   * E O BLOCO SE LÊ EM TRÊS DEGRAUS, de cima para baixo: o que ERA
   * (riscado, com o selo de desconto ao lado), o que É (o número
   * grande, ao lado do carrinho) e COMO PAGAR (a parcela em chip).
   *
   * O selo de desconto ganha `selo-off--forte` quando o corte é de 20%
   * ou mais: aí o clarão passa por ele. Desconto de 8% e desconto de
   * 31% não podem chamar o olho do mesmo jeito — se tudo pisca, nada
   * chama. Os cortes do catálogo de hoje vão de 8% a 31%.
   */
  function blocoPe(p, botao) {
    var desconto = Preco.desconto(p.antes, p.venda);

    return (p.antes
        ? '<p class="product__antes">' +
            '<s>' + Preco.formatar(p.antes) + '</s>' +
            (desconto
              ? '<span class="selo-off' + (desconto >= 20 ? ' selo-off--forte' : '') + '">' +
                  '<span>-' + desconto + '%</span></span>'
              : '') +
          '</p>'
        : '') +
      '<div class="product__pe">' +
        '<p class="product__price">' + Preco.formatar(p.venda) + '</p>' +
        botao +
      '</div>' +
      '<p class="product__installment">' + Preco.htmlParcelas(p.venda) + '</p>';
  }

  /* ---------- grade de produtos ---------- */

  /** Produtos que a loja mostra (o painel pode tirar um do ar). */
  function visiveis() {
    return catalogo.filter(function (p) { return !p.foraDoSite; });
  }

  function montarGrade() {
    var grade = document.querySelector('[data-grade]');
    if (!grade) return;

    grade.innerHTML = visiveis().map(cartao).join('');
  }

  /** Cartão de produto usado na grade e na página de favoritos.
      `i` é a posição na fila: os primeiros pedem a foto na hora. */
  function cartao(p, i) {

    /* Fora de estoque não ganha botão de carrinho: pôr no carrinho o que
       não pode ser entregue só empurra a decepção para o fim da compra. */
    /* Fora de estoque a ação continua sendo uma FRASE, e não podia ser
       outra coisa: "avise-me quando chegar" não cabe num símbolo. O
       botão redondo do carrinho só existe onde há o que pôr nele. */
    var acaoEspera = semEstoque(p)
      ? '<button class="btn btn--outline btn--espera" type="button" data-avise="' + esc(p.nome) + '">' +
          'Avise-me quando chegar' + setaHtml + '</button>'
      : '';

    /* O CARRINHO VIROU SÍMBOLO, AO LADO DO PREÇO.
       Brian, 18/09/2026, com a foto de um cartão de outra loja: "quero
       que os produtos fiquem assim (...) em baixo o preco, e do lado o
       simbolo de jogar pro carrinho".

       Antes era um botão de largura inteira escrito "Adicionar", numa
       linha só dele embaixo do preço. Como símbolo ao lado do preço ele
       devolve essa linha ao cartão — e põe as duas coisas que decidem a
       compra (quanto custa, como levar) no mesmo lugar do olho.

       O RÓTULO NÃO SUMIU, mudou de lugar: `aria-label` diz "Adicionar
       <produto> ao carrinho" para quem usa leitor de tela, e `title`
       diz o mesmo no passar do mouse. Botão só de desenho sem rótulo é
       um botão que só funciona para quem enxerga.

       E DENTRO DELE VAI O CLARÃO. Brian, na mesma noite: "o carrinho
       nos produtos ali ta muito sem graca, nao estou gostando de como
       ele esta". Eu havia posto este clarão no botão escrito, que este
       cartão não tem mais — então ele vem para cá, que é onde o
       carrinho vive agora. É um elemento e não um `::after` porque o
       botão já usa pseudo-elemento no aviso de "no carrinho", e dois
       desenhos no mesmo pseudo-elemento se atropelam. `aria-hidden`
       porque é cenário: não tem nada a dizer a quem ouve a tela. */
    var botaoCarrinho =
      '<button class="product__carrinho" type="button" ' +
        'data-por-no-carrinho="' + esc(p.nome) + '" ' +
        'title="Adicionar ao carrinho" ' +
        'aria-label="Adicionar ' + esc(p.nome) + ' ao carrinho">' +
        '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>' +
        '<path d="M3 4h2l2.4 10.2a1.5 1.5 0 0 0 1.5 1.2h9.2a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/>' +
        '</svg>' +
        '<span class="product__carrinho-luz" aria-hidden="true"></span>' +
      '</button>';

    return '' +
      /* `product--promo` existe para o CSS poder tratar o cartão em
         oferta como um conjunto: é ele que tira o preço do dourado
         (porque ao lado do selo vermelho o dourado perde contraste) e
         que acende o fio vermelho no alto do cartão. */
      '<article class="product' + (semEstoque(p) ? ' is-indisponivel' : '') +
        (p.antes && !semEstoque(p) ? ' product--promo' : '') +
        '" data-category="' + chave(p.categoria) + '" data-produto="' + esc(p.nome) + '"' +
        ' data-preco="' + Number(p.venda || 0) + '"' +
        ' data-promo="' + (p.antes ? 1 : 0) + '"' +
        ' data-ordem="' + catalogo.indexOf(p) + '">' +
        (semEstoque(p)
          ? '<span class="product__badge product__badge--off"><span>SEM ESTOQUE</span></span>'
          : etiquetaHtml(p, 'product__badge')) +
        coracaoHtml +
        /* AS DUAS FRENTES DESTA NOITE SE ENCONTRAM NESTA LINHA, e não
           havia o que escolher entre elas: `molduraFoto` é a MOLDURA
           (a outra frente, para as fotos pararem de sair de tamanhos
           diferentes) e `fotoHtml` é a FOTO DENTRO dela (esta, para ela
           chegar no tamanho da tela em vez do tamanho do arquivo). Uma
           abre o `<div>`, a outra escreve o `<img>`. */
        molduraFoto(p, 'product__media') +
          /* 400px: o dobro do cartão no celular, para a tela retina não
             borrar. Os quatro primeiros entram sem `lazy` — são os que
             já estão na tela quando a página abre. */
          fotoHtml(p, 400, i < 4) +
        '</div>' +
        '<div class="product__body">' +
          '<h2 class="product__name">' +
            '<a href="produto.html?p=' + encodeURIComponent(p.nome) + '">' +
              esc(p.nome) + '</a></h2>' +
          '<p class="product__desc">' + esc(p.descricao) + '</p>' +
          blocoPe(p, semEstoque(p) ? '' : botaoCarrinho) +
          acaoEspera +
        '</div>' +
      '</article>';
  }

  window.PharmaFitCartao = cartao;

  /* A PÁGINA DE UM PRODUTO usa a mesma função para desenhar a etiqueta
     dela. Sem isto ela teria a sua própria cópia da regra, e no dia em
     que uma mudasse (cor, nome, um terceiro valor) as duas telas
     mostrariam etiquetas diferentes para o mesmo produto. */
  window.PharmaFitEtiqueta = etiquetaHtml;

  /* ---------- os ícones das categorias, na página inicial ----------

     Brian, 18/09/2026: "tire isso aqui e deixe icones de cada
     categoria de produtos".

     A LISTA VEM DO CATÁLOGO, NÃO DAQUI. Escrever as três categorias à
     mão neste arquivo seria a doença dos menus outra vez: no dia em
     que uma categoria nova entrar pelo painel, a barra de cima da
     página inicial continuaria mostrando as antigas e ninguém veria.
     Então eu leio as categorias dos produtos visíveis, na ordem em
     que aparecem no catálogo.

     O QUE É ESCRITO À MÃO É SÓ O DESENHO, e com um desenho de reserva:
     categoria que eu não conheço ganha o frasco genérico em vez de
     ficar sem ícone. Assim uma categoria nova aparece inteira no
     mesmo dia, só sem desenho próprio até alguém dar um a ela. */

  var DESENHO_CATEGORIA = {
    /* tirzepatida: a CANETA aplicadora, que é como ela chega na mão do
       cliente — o mesmo objeto do `prod-caneta.svg` da vitrine. Aqui
       havia uma ampola; ampola e frasco são a mesma silhueta em
       miniatura, e a tirzepatida ficava com o desenho do genérico. */
    'Tirzepatida':
      '<rect x="10.2" y="2.4" width="3.6" height="3.4" rx="1.2"/>' +
      '<rect x="9.2" y="5.6" width="5.6" height="12" rx="1.9"/>' +
      '<path d="M10.8 8.8h2.4"/>' +
      '<path d="M12 17.6v3.6"/>',
    /* retatrutida: o anel da molécula, com o núcleo dentro. É o
       protocolo mais avançado do catálogo, e o hexágono diz isso sem
       escrever. Antes eram quatro bolinhas ligadas por traços finos:
       no chip, a 15px, os traços sumiam e sobravam quatro pontos
       soltos. O anel fechado aguenta o tamanho pequeno. */
    'Retatrutida':
      '<path d="M9.2 8.1 13.4 10.5v4.8l-4.2 2.4-4.2-2.4v-4.8z"/>' +
      '<path d="m13.4 10.5 2.5-1.4"/><circle cx="17.4" cy="8.1" r="1.7"/>',
    /* peptídeos: a corrente de aminoácidos — três contas ligadas, que é
       literalmente o que um peptídeo é. A gota que estava aqui é o
       desenho de qualquer líquido, e não dizia nada deste produto. */
    'Peptídeos':
      '<circle cx="5.9" cy="17" r="2.5"/><circle cx="12" cy="12" r="2.5"/>' +
      '<circle cx="18.1" cy="7" r="2.5"/>' +
      '<path d="m7.9 15.4 2.1-1.8M14 10.4l2.1-1.8"/>'
  };

  var DESENHO_RESERVA =
    '<path d="M9.9 2.8h4.2v2.7H9.9z"/>' +
    '<path d="M8.3 5.5h7.4a1.8 1.8 0 0 1 1.8 1.8v11.1a2.2 2.2 0 0 1-2.2 2.2H8.7a2.2 2.2 0 0 1-2.2-2.2V7.3a1.8 1.8 0 0 1 1.8-1.8z"/>' +
    '<path d="M6.5 12.3h11"/>';

  /* O "Todos" também ganha desenho: quatro quadradinhos, que é o
     símbolo de "tudo junto". Sem ele, a fila de categorias ficaria com
     um botão sem ícone na frente de todos os outros com ícone — e o
     único sem desenho parece o que faltou terminar, não o especial. */
  var DESENHO_TODOS =
    '<rect x="3.6" y="3.6" width="7" height="7" rx="2"/>' +
    '<rect x="13.4" y="3.6" width="7" height="7" rx="2"/>' +
    '<rect x="3.6" y="13.4" width="7" height="7" rx="2"/>' +
    '<rect x="13.4" y="13.4" width="7" height="7" rx="2"/>';

  /** O desenho de uma categoria, em SVG, no tamanho pedido. */
  function svgCategoria(desenho, tamanho, classe) {
    return '<svg class="' + classe + '" width="' + tamanho + '" height="' + tamanho + '" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + desenho + '</svg>';
  }

  function montarCategoriasIniciais() {
    var caixa = document.querySelector('[data-categorias-home]');
    if (!caixa) return;

    var vistas = [];
    visiveis().forEach(function (p) {
      var c = String(p.categoria || '').trim();
      if (!c) return;
      var achou = vistas.filter(function (v) { return v.nome === c; })[0];
      if (achou) achou.quantos++;
      else vistas.push({ nome: c, quantos: 1 });
    });

    /* Sem catálogo, sem seção: melhor nada que molduras vazias. */
    if (!vistas.length) { caixa.hidden = true; return; }
    caixa.hidden = false;

    caixa.innerHTML = vistas.map(function (v, i) {
      var desenho = DESENHO_CATEGORIA[v.nome] || DESENHO_RESERVA;
      /* ESTE `svg` ESCRITO À MÃO NÃO VIROU `svgCategoria()` de
         propósito: aqui o traço é 1.7 e o desenho é grande, branco
         dentro de um disco colorido; no chip ele é 1.5, pequeno e da
         cor do texto. Juntar os dois numa função com dois parâmetros
         de aparência só mudaria o lugar onde a diferença mora. */
      /* A COR DO DISCO ENTRA POR ÍNDICE, como nos chips (`data-cor`), e
         pela mesma razão: renomear uma categoria no painel não pode
         trocar a cor de lugar. O rodízio de 4 garante cor definida da
         quinta categoria em diante. E é o MESMO número do chip, então
         a mesma categoria tem a mesma cor na página inicial e na lista
         — é isso que deixa a cor significar alguma coisa. */
      /* `#chave` no endereço: a lista de produtos lê isso e já abre
         filtrada (ver `app.js`). Sem isso o ícone levaria para a lista
         inteira e a pessoa teria de filtrar de novo na mão — o toque
         prometeria uma coisa e entregaria outra. */
      return '<a class="categoria" data-cor="' + ((i % 4) + 1) + '" ' +
        'href="produtos.html#' + chave(v.nome) + '">' +
        '<span class="categoria__ico">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          desenho + '</svg>' +
        '</span>' +
        '<span class="categoria__nome">' + esc(v.nome) + '</span>' +
        '<span class="categoria__conta">' + v.quantos +
          (v.quantos === 1 ? ' produto' : ' produtos') + '</span>' +
      '</a>';
    }).join('');
  }

  /* ---------- filtros por categoria ---------- */

  function montarChips() {
    var barra = document.querySelector('[data-chips]');
    if (!barra) return;

    var categorias = [];
    visiveis().forEach(function (p) {
      if (categorias.indexOf(p.categoria) === -1) categorias.push(p.categoria);
    });

    /* O CHIP AGORA TEM TRÊS PEDAÇOS, E CADA UM TEM MOTIVO.

       Brian, 18/09/2026: "onde tem as barras de categoria, deixe uma
       coisa mais bonita, com os icones de cada categoria e de uma forma
       bonita, que ao trocar de uma pra outra tambem tenha uma animacao
       legal".

       1. `chip__fundo` — a pílula colorida, num elemento próprio em vez
          de ser o fundo do botão. É ela que desliza de um chip para o
          outro quando você troca de categoria (o CSS dá a ela um
          `view-transition-name`, e o navegador move a pílula em vez de
          apagá-la aqui e acendê-la lá). Com o fundo no próprio botão
          isso não dá: o botão também carrega o texto, e o texto de uma
          categoria viraria o da outra no meio do caminho.
       2. o desenho da categoria, o MESMO da página inicial — a lista
          vem do catálogo e o desenho do mapa lá de cima. Dois lugares
          desenhando a mesma categoria diferente é a doença dos menus.
       3. o nome.

       O ponto colorido que existia antes saiu: ele era um substituto
       de ícone, e agora existe o ícone de verdade.

       "Todos" vem primeiro e nasce marcado. Antes o primeiro chip de
       categoria vinha marcado, e a página abria já filtrada em
       Tirzepatida — quem chegava não via o resto do catálogo e não
       tinha como voltar a ver tudo, porque não existia botão para isso.
       O filtro em app.js já sabia tratar 'todos'; faltava só o botão
       existir. */

    function botao(rotulo, valor, desenho, cor) {
      var marcado = valor === 'todos';
      return '<button class="chip' + (marcado ? ' is-active' : '') + '" type="button" ' +
        (cor ? 'data-cor="' + cor + '" ' : '') +
        'data-chip="' + valor + '" aria-pressed="' + (marcado ? 'true' : 'false') + '">' +
        '<span class="chip__fundo" aria-hidden="true"></span>' +
        svgCategoria(desenho, 15, 'chip__ico') +
        '<span class="chip__nome">' + esc(rotulo) + '</span>' +
      '</button>';
    }

    var botoes = [botao('Todos', 'todos', DESENHO_TODOS, 0)];

    /* Cada categoria leva um numero de cor, e o CSS decide qual cor e.
       Por indice e nao por nome: renomear "Peptideos" nao deve trocar a
       cor de lugar. O rodizio de 4 garante que a quinta categoria ainda
       receba uma cor definida, em vez de nascer sem nenhuma. */
    categorias.forEach(function (c, i) {
      botoes.push(botao(c, chave(c), DESENHO_CATEGORIA[c] || DESENHO_RESERVA, (i % 4) + 1));
    });

    barra.innerHTML = botoes.join('');
    marcarCortes(barra);
  }

  /* ---------- a barra de categorias que não cabe na tela ----------

     A fila de chips rola de lado, e no celular ela quase nunca cabe: na
     foto que o Brian mandou o "Peptídeos" estava cortado no meio, sem
     nada dizendo que havia mais coisa à direita. Corte seco parece
     defeito; desbotado parece continuação.

     O esmaecido entra SÓ QUANDO SOBRA CONTEÚDO daquele lado — medido,
     não adivinhado. Numa tela larga, onde os quatro chips cabem, ele
     não aparece (senão o último chip ficaria apagado sem razão), e ao
     chegar no fim da rolagem o da direita sai. */

  function marcarCortes(barra) {
    if (!barra) return;

    function medir() {
      var sobra = barra.scrollWidth - barra.clientWidth;
      /* 2px de folga: navegador arredonda medida de rolagem, e sem a
         folga a barra fica acendendo e apagando o esmaecido sozinha. */
      barra.classList.toggle('is-corta-esquerda', barra.scrollLeft > 2);
      barra.classList.toggle('is-corta-direita', sobra > 2 && barra.scrollLeft < sobra - 2);
    }

    medir();
    barra.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    /* A fonte de letra chega depois do HTML e muda a largura dos chips
       — sem esta segunda medida, uma barra que passou a caber continua
       esmaecida. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
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

    /* A PÍLULA MOSTRA O QUE ESTÁ ESCOLHIDO. O `select` de verdade está
       invisível por cima dela (é ele que abre a roda do sistema no
       celular), então sem esta linha a pílula ficaria muda. Escrevo o
       texto da opção escolhida, não o valor dela: o cliente lê "Menor
       preço", não "menor-preco". */
    var valor = document.querySelector('[data-ordenar-valor]');
    function mostrarEscolha() {
      if (!valor) return;
      var op = select.options[select.selectedIndex];
      valor.textContent = op ? op.textContent : '';
    }
    mostrarEscolha();

    select.addEventListener('change', function () {
      mostrarEscolha();
      ordenarGrade(select.value);
    });
  }

  /** A ordem escolhida, para reaplicar depois de redesenhar. */
  function ordemEscolhida() {
    var select = document.querySelector('[data-ordenar]');
    return select ? select.value : '';
  }

  /* ---------- carrossel da página inicial ---------- */

  /* Os três benefícios e os desenhos deles vivem em `catalogo.js`,
     numa função só, porque a PÁGINA DE UM PRODUTO mostra os mesmos
     três e não carrega este arquivo. Duas listas iguais em dois
     arquivos é a doença dos menus: no dia em que uma mudar, param de
     ser iguais e ninguém vê. */

  function montarCarrossel() {
    var trilho = document.querySelector('[data-carousel]');
    if (!trilho) return;

    /* Três, e não cinco: a página inicial mostra só o destaque. Quem
       quer a lista toda vai em Produtos, na barra de baixo. */
    var destaques = visiveis().slice(0, 3);

    trilho.innerHTML = destaques.map(function (p) {
      return '' +
        /* O CARTÃO INTEIRO É UM LINK PARA O PRODUTO.
           Brian, 17/09/2026: "Tem que dar pra clicar no produto e ver
           tudo sobre ele". Como não há botão nenhum dentro dele, o
           jeito certo é o mais simples: o cartão é a âncora. Um link
           só, que o leitor de tela anuncia de uma vez, e área de toque
           do tamanho do cartão. */
        '<a class="protocol" href="produto.html?p=' + encodeURIComponent(p.nome) + '">' +
          molduraFoto(p, 'protocol__media') +
            /* A FILA DA INICIAL É "EM DESTAQUE", E OS TRÊS LEVAM A
               MESMA ETIQUETA: ela fala da fila, não do produto.
               A etiqueta que a equipe escolhe no painel (mais vendido
               / promoção) manda na LISTA de produtos e na página do
               produto, onde o cartão está sozinho e a etiqueta
               distingue um do outro. Aqui todos os três são destaque,
               então distinguir não faz sentido. */
            etiquetaHtml({ destaque: 'mais-procurado' }, 'badge') +
            /* 300px: aqui o cartão tem ~110px, e os três estão no alto
               da página inicial — nenhum deles é preguiçoso. */
            fotoHtml(p, 300, true) +
          '</div>' +
          '<div class="protocol__body">' +
            '<h3 class="protocol__name">' + esc(p.nome) + '</h3>' +
            /* SÓ O PREÇO, e o desconto quando existe.
               Brian, 18/09/2026: "Deixe esses cards aqui com as fotos
               menores e um tamanho menor, quero que de ve pra ver 3
               ali". Três cartões numa tela de 390 dão 110px cada. Nesse
               espaço não cabe descrição, parcelamento nem a faixa dos
               três benefícios — "Acompanhamento" sozinho precisa de
               70px, e numa coluna de 33px voltaria a quebrar no meio
               da palavra, que é o defeito que eu passei ontem
               consertando.
               Nada disso se perdeu: a descrição, as parcelas e os três
               benefícios estão todos na página do produto, que é onde
               este cartão leva com um toque. */
            /* SÓ O VALOR, sem o selo de desconto.
               Eu tinha posto o "-23%" ao lado do preço e ele não cabia
               na coluna de 92px: descia para uma linha própria, e aí os
               três cartões ficavam com o preço em alturas diferentes —
               um com o preço no pé, dois com preço e selo no meio.
               Parecia desalinhado porque estava.
               Nada se perde: a etiqueta PROMOÇÃO em cima da foto já diz
               que é promoção, e a porcentagem com o preço antigo
               riscado está na lista de produtos e na página do produto. */
            '<p class="protocol__valor">' + Preco.formatar(p.venda) + '</p>' +
          '</div>' +
        '</a>';
    }).join('');
  }

  function montarTudo() {
    montarChips();
    montarGrade();
    montarCarrossel();
    montarCategoriasIniciais();
    /* depois de os cartões existirem: a moldura de cada foto toma a cor
       do fundo dela, e a borda deixa de aparecer. Vale também quando o
       catálogo do banco chega depois e redesenha tudo. O pintor mora em
       `catalogo.js` porque o CARRINHO também precisa dele e não carrega
       este arquivo. */
    if (window.PharmaFitFundoDaFoto) window.PharmaFitFundoDaFoto(document);
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
