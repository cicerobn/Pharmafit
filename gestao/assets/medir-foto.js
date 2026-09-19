/* =========================================================
   PHARMA FIT — ONDE O PRODUTO COMEÇA DENTRO DA FOTO

   Uma coisa só: olhar uma foto já desenhada num canvas e responder
   duas perguntas — qual é a cor do fundo, e em que retângulo o produto
   está. Quem usa é `produtos.js`, na hora de adicionar o produto: com
   essas duas respostas ele recorta a sobra e devolve a foto com o
   produto grande, do mesmo tamanho em todas.

   Brian, 19/09/2026: "Quando for assim, tenta dar um zoom na imagem,
   deixe isso ao adicionar o produto".

   POR QUE ESTA CONTA MORA SOZINHA NUM ARQUIVO

   Porque dá para conferir. Dentro de `produtos.js` ela ficaria
   embrulhada num `FileReader`, num `Image.onload` e numa tela que só
   existe depois do login do painel — nada disso se testa. Aqui ela é
   uma função que recebe um canvas e devolve números, e o teste do
   navegador chama ela com fotos feitas de propósito e confere a caixa
   que ela achou.

   O QUE ELA RECUSA A FAZER, E ISSO IMPORTA MAIS QUE O QUE ELA FAZ

   Se os quatro cantos da foto NÃO concordarem entre si, ela devolve
   `fundo: null` e a foto inteira como caixa. Fundo que não é de uma
   cor só não tem como ser separado do produto por cor, e recortar ali
   seria adivinhar onde o produto está — e adivinhar errado corta o
   produto, que é o pior resultado possível. Nesse caso `produtos.js`
   guarda a foto como ela veio.
   ========================================================= */
(function () {
  'use strict';

  /* Quanto dois tons podem diferir e ainda contarem como "a mesma
     cor". 18 de 255 em qualquer canal: acomoda o ruído do JPEG e a
     sombra suave do estúdio, e ainda separa o produto do fundo. */
  var TOLERANCIA = 18;

  /* O quanto os quatro cantos podem discordar entre si para o fundo
     ainda valer como uniforme. Mais folgado que a tolerância acima
     porque canto de foto costuma ter vinheta da lente. */
  var DESACORDO = 26;

  function longe(px, i, cor) {
    return Math.abs(px[i] - cor[0]) > TOLERANCIA ||
           Math.abs(px[i + 1] - cor[1]) > TOLERANCIA ||
           Math.abs(px[i + 2] - cor[2]) > TOLERANCIA;
  }

  /**
   * @param ctx contexto 2d com a foto já desenhada
   * @param l,a largura e altura da foto
   * @returns {{fundo:number[]|null, caixa:{x:number,y:number,l:number,a:number}}}
   */
  window.PharmaFitMedirFoto = function (ctx, l, a) {
    var inteira = { x: 0, y: 0, l: l, a: a };

    var dados;
    try {
      dados = ctx.getImageData(0, 0, l, a).data;
    } catch (e) {
      /* foto de outro endereço sem CORS: não dá para ler os pixels */
      return { fundo: null, caixa: inteira };
    }

    function em(x, y) {
      var i = (y * l + x) * 4;
      return [dados[i], dados[i + 1], dados[i + 2]];
    }

    /* Os cantos são lidos um pouco para dentro: a primeira fila de
       pixels de uma foto redimensionada costuma vir suja. */
    var d = Math.max(1, Math.round(Math.min(l, a) * 0.02));
    var cantos = [em(d, d), em(l - 1 - d, d), em(d, a - 1 - d), em(l - 1 - d, a - 1 - d)];

    var fundo = [0, 1, 2].map(function (k) {
      return Math.round(cantos.reduce(function (t, c) { return t + c[k]; }, 0) / 4);
    });
    var espalha = Math.max.apply(null, [0, 1, 2].map(function (k) {
      var vs = cantos.map(function (c) { return c[k]; });
      return Math.max.apply(null, vs) - Math.min.apply(null, vs);
    }));

    if (espalha > DESACORDO) return { fundo: null, caixa: inteira };

    /* A varredura: a primeira e a última linha/coluna que têm ALGUM
       pixel diferente do fundo. O que sobra fora disso é sobra. */
    var topo = -1, base = -1, esq = -1, dir = -1;
    var x, y, i;

    for (y = 0; y < a && topo === -1; y++) {
      for (x = 0; x < l; x++) {
        i = (y * l + x) * 4;
        if (longe(dados, i, fundo)) { topo = y; break; }
      }
    }
    /* Foto de uma cor só: não há produto para achar. */
    if (topo === -1) return { fundo: fundo, caixa: inteira };

    for (y = a - 1; y >= topo && base === -1; y--) {
      for (x = 0; x < l; x++) {
        i = (y * l + x) * 4;
        if (longe(dados, i, fundo)) { base = y; break; }
      }
    }
    for (x = 0; x < l && esq === -1; x++) {
      for (y = topo; y <= base; y++) {
        i = (y * l + x) * 4;
        if (longe(dados, i, fundo)) { esq = x; break; }
      }
    }
    for (x = l - 1; x >= esq && dir === -1; x--) {
      for (y = topo; y <= base; y++) {
        i = (y * l + x) * 4;
        if (longe(dados, i, fundo)) { dir = x; break; }
      }
    }

    var caixa = { x: esq, y: topo, l: dir - esq + 1, a: base - topo + 1 };

    /* CAIXA PEQUENA DEMAIS É MEDIDA ERRADA, não produto pequeno. Abaixo
       de 15% da foto o que se achou provavelmente é um respingo, uma
       marca d'água ou um pedaço de texto — e recortar por ele jogaria o
       produto inteiro fora. Melhor não recortar do que recortar errado. */
    if (caixa.l < l * 0.15 || caixa.a < a * 0.15) return { fundo: fundo, caixa: inteira };

    return { fundo: fundo, caixa: caixa };
  };

  /* ---------- o zoom: quanto da foto entra no quadrado ----------
   *
   * Brian, 19/09/2026: "Quero que tenha tipo uma barrinha que vou
   * puxando e vai dando um zoom, se eu puxo pra direita da mais zoom,
   * se puxo pra esquerda da menos zoom".
   *
   * O RECORTE DEIXA DE SER UMA DECISÃO MINHA. Antes eu achava o produto
   * e recortava; dava certo nas fotos de catálogo e errado em algumas.
   * Agora a conta continua, mas só para SUGERIR onde a barrinha começa
   * — quem decide é quem está olhando a foto.
   *
   * O QUE O NÚMERO SIGNIFICA:
   *   zoom 1   = a foto INTEIRA cabe no quadrado (nada cortado);
   *   zoom 2   = ela entra com o dobro do tamanho, e o que passar da
   *              beirada do quadrado fica de fora.
   *
   * E o zoom acontece em volta do CENTRO DO PRODUTO, não do centro da
   * foto: produto que está um pouco para o lado continua enquadrado
   * quando se aproxima. É o que faz a barrinha parecer que "entende" a
   * foto.
   */
  window.PharmaFitZoom = function (img) {
    var l = img.width, a = img.height;

    var medida = document.createElement('canvas');
    medida.width = l; medida.height = a;
    var mctx = medida.getContext('2d');
    mctx.fillStyle = '#ffffff';
    mctx.fillRect(0, 0, l, a);
    mctx.drawImage(img, 0, 0);

    var r = window.PharmaFitMedirFoto(mctx, l, a);
    var c = r.caixa;

    /* `base` é o lado do quadrado no zoom 1: o maior lado da foto, que
       é o que precisa caber para nada ficar de fora. */
    var base = Math.max(l, a);

    /* O zoom em que o produto, mais 6% de respiro de cada lado, enche o
       quadrado. É só a SUGESTÃO de onde a barrinha começa. */
    var maior = Math.max(c.l, c.a) * 1.12;
    var zoomAuto = maior > 0 ? base / maior : 1;
    if (!isFinite(zoomAuto) || zoomAuto < 1) zoomAuto = 1;
    /* O teto da SUGESTÃO é 4×, e o da barrinha é 5× (ver produtos.js).
       A diferença é de propósito: sugerir um zoom muito fechado é
       sugerir uma foto borrada, e isso eu não faço por ele. Chegar lá
       com a mão, vendo a prévia e o aviso de tamanho, é decisão dele. */
    if (zoomAuto > 4) zoomAuto = 4;

    return {
      fundo: r.fundo || [255, 255, 255],
      centro: { x: c.x + c.l / 2, y: c.y + c.a / 2 },
      base: base,
      zoomAuto: zoomAuto,
      achouProduto: !!r.fundo && (c.l < l || c.a < a),
      fonte: medida
    };
  };

  /* A foto desenhada num quadrado, no zoom pedido.
   *
   * `lado` é o tamanho do arquivo de saída (1200 ao salvar, ~300 na
   * prévia que acompanha a barrinha — a mesma conta, em dois tamanhos,
   * para o que se vê arrastando ser o que vai ser gravado).
   *
   * Tudo é UMA escala e UM deslocamento: a foto é desenhada `escala`
   * vezes maior e posicionada de modo que o centro do produto caia no
   * centro do quadrado. O que passar da beirada o próprio canvas corta.
   */
  window.PharmaFitFotoComZoom = function (img, lado, zoom, info) {
    info = info || window.PharmaFitZoom(img);

    var tela = document.createElement('canvas');
    tela.width = lado; tela.height = lado;
    var ctx = tela.getContext('2d');
    var f = info.fundo;
    ctx.fillStyle = 'rgb(' + f[0] + ',' + f[1] + ',' + f[2] + ')';
    ctx.fillRect(0, 0, lado, lado);

    var escala = (lado / info.base) * zoom;
    var dl = img.width * escala;
    var da = img.height * escala;
    var x = lado / 2 - info.centro.x * escala;
    var y = lado / 2 - info.centro.y * escala;

    ctx.drawImage(info.fonte, x, y, dl, da);
    return tela;
  };

  /* AQUI MORAVA `PharmaFitPrepararFoto`, que media a foto e devolvia
     ela já recortada no produto — o recorte automático de 19/09/2026.
     Ela saiu no mesmo dia, quando o Brian pediu a barrinha: com o zoom
     na mão dele, uma função que decide o recorte sozinha só pode
     discordar da barrinha. O que sobrou dela — a medida e o desenho no
     quadrado — está nas duas funções acima, e é o que a barrinha usa. */

})();
