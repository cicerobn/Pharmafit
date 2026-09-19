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

  /* ---------- e a foto pronta para subir ----------
   *
   * Recebe a imagem já carregada e devolve o canvas do jeito que o
   * arquivo vai ser gravado: quadrado, com o produto grande e o fundo
   * da própria foto em volta.
   *
   * ESTA PARTE MORA AQUI, E NÃO NO `produtos.js`, PELO MESMO MOTIVO DA
   * MEDIDA: dentro do painel ela ficaria atrás de um login, de um
   * `FileReader` e de um `Image.onload`, e a conta de recorte e escala
   * — que é onde um sinal trocado estraga a foto de todo mundo — não
   * teria como ser conferida. Aqui o teste passa uma imagem e mede o
   * canvas que volta.
   *
   * `lado` é o teto do arquivo final (1200 no painel).
   */
  window.PharmaFitPrepararFoto = function (img, lado) {
    var l = img.width, a = img.height;

    /* A cópia achatada em branco: PNG com transparência viraria preto
       no WEBP, e é sobre ela que tudo é medido e recortado. */
    var medida = document.createElement('canvas');
    medida.width = l; medida.height = a;
    var mctx = medida.getContext('2d');
    mctx.fillStyle = '#ffffff';
    mctx.fillRect(0, 0, l, a);
    mctx.drawImage(img, 0, 0);

    var r = window.PharmaFitMedirFoto(mctx, l, a);
    var fundo = r.fundo || [255, 255, 255];
    var c = r.caixa;
    var recortou = (c.l < l || c.a < a);

    /* A margem de respiro em volta do produto: 6% do maior lado da
       caixa. Sem ela o produto encostaria na beirada do quadrado, e
       na vitrine ele encosta na beirada do cartão. */
    var margem = Math.round(Math.max(c.l, c.a) * 0.06);
    var bruto = Math.max(c.l, c.a) + margem * 2;
    var escala = Math.min(1, lado / bruto);
    var fim = Math.round(bruto * escala);

    var tela = document.createElement('canvas');
    tela.width = fim; tela.height = fim;
    var ctx = tela.getContext('2d');
    ctx.fillStyle = 'rgb(' + fundo[0] + ',' + fundo[1] + ',' + fundo[2] + ')';
    ctx.fillRect(0, 0, fim, fim);

    var dl = Math.round(c.l * escala);
    var da = Math.round(c.a * escala);
    ctx.drawImage(medida, c.x, c.y, c.l, c.a,
      Math.round((fim - dl) / 2), Math.round((fim - da) / 2), dl, da);

    return { tela: tela, recortou: recortou, fundo: fundo };
  };
})();
