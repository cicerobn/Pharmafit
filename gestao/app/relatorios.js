/* =========================================================
   PHARMA FIT — tela "Relatórios" do painel em formato de app

   Feita a partir da foto do 595 Imports: dois números no topo com a
   variação contra o mês anterior, um gráfico de linha das vendas do
   mês e uma rosca de vendas por produto.

   TRÊS COISAS QUE EU NÃO COPIEI DA FOTO, DE PROPÓSITO

   1. Mês sem venda não ganha gráfico bonito com a linha no zero: ele
      diz que não houve venda. Gráfico de nada parece defeito.

   2. A variação ("+15% vs mês anterior") só aparece quando existe mês
      anterior COM faturamento. Porcentagem contra zero não quer dizer
      nada — de R$ 0 para R$ 100 não é "+100%", é a primeira venda.

   3. O "Lucro líquido" da foto é um número limpo. Aqui ele vem com
      aviso vermelho quando alguma venda do mês está sem custo
      cadastrado, porque nesse caso o lucro sai do tamanho do
      faturamento e PARECE certo. O número fica, o aviso qualifica.

   Os gráficos são desenhados aqui em SVG, e não pelo grafico.js do
   painel antigo: aquele usa as classes do gestao.css, que esta tela
   não carrega. Foi esse tipo de mistura que deixou os links do site
   parecendo texto morto.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Moldura = window.PharmaFitMoldura;
  var Analise = window.PharmaFitAnalise;
  var U = window.PharmaFitUtil;

  /* As cores das fatias. Fixas e nesta ordem, para o mesmo produto cair
     na mesma cor sempre que a tela abrir. */
  var CORES = ['#b08c4a', '#2b5fa8', '#1f7a4d', '#8a6320', '#6a4270', '#98928a'];

  function moeda(v) {
    if (U && U.moeda) return U.moeda(v);
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function achar(nome) { return document.querySelector('[data-' + nome + ']'); }

  /* ---------------- o gráfico de linha ---------------- */

  /**
   * Vendas dia a dia do mês, em SVG.
   * `dias` é [{dia, valor}] já na ordem.
   */
  function desenharLinha(dias) {
    var L = 300, A = 120, pad = { cima: 10, baixo: 18, esq: 6, dir: 6 };
    var largura = L - pad.esq - pad.dir;
    var altura = A - pad.cima - pad.baixo;

    var maximo = Math.max.apply(null, dias.map(function (d) { return d.valor; }));
    /* Teto nunca zero: dividir por zero jogaria a linha para fora. */
    if (!maximo) maximo = 1;

    var passo = dias.length > 1 ? largura / (dias.length - 1) : 0;
    var pontos = dias.map(function (d, i) {
      return {
        x: pad.esq + passo * i,
        y: pad.cima + altura - (d.valor / maximo) * altura,
        d: d
      };
    });

    var traco = pontos.map(function (p, i) {
      return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    }).join(' ');

    var area = traco +
      ' L' + pontos[pontos.length - 1].x.toFixed(1) + ' ' + (pad.cima + altura) +
      ' L' + pontos[0].x.toFixed(1) + ' ' + (pad.cima + altura) + ' Z';

    /* Três linhas de grade, e o valor do teto escrito — sem isso a
       linha sobe e desce sem dizer de quanto para quanto. */
    var grade = [0, 0.5, 1].map(function (f) {
      var y = pad.cima + altura * f;
      return '<line class="linha-graf__grade" x1="' + pad.esq + '" y1="' + y.toFixed(1) +
             '" x2="' + (L - pad.dir) + '" y2="' + y.toFixed(1) + '"/>';
    }).join('');

    /* Só o primeiro, o do meio e o último dia levam rótulo: em 30 dias
       os números viram borrão. */
    var quais = [0, Math.floor(dias.length / 2), dias.length - 1];
    var rotulos = pontos.map(function (p, i) {
      if (quais.indexOf(i) === -1) return '';
      var ancora = i === 0 ? 'start' : (i === dias.length - 1 ? 'end' : 'middle');
      return '<text class="linha-graf__eixo" x="' + p.x.toFixed(1) + '" y="' + (A - 5) +
             '" text-anchor="' + ancora + '">' + p.d.dia + '</text>';
    }).join('');

    /* O ponto do dia de maior venda, marcado. */
    var alto = pontos.reduce(function (a, b) { return b.d.valor > a.d.valor ? b : a; }, pontos[0]);
    var marca = alto.d.valor
      ? '<circle class="linha-graf__ponto" cx="' + alto.x.toFixed(1) + '" cy="' +
        alto.y.toFixed(1) + '" r="3.2"/>'
      : '';

    return '<svg class="linha-graf" viewBox="0 0 ' + L + ' ' + A + '" ' +
             'role="img" aria-label="Vendas dia a dia do mês">' +
        '<defs><linearGradient id="gradLinha" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="' + CORES[0] + '" stop-opacity=".22"/>' +
          '<stop offset="100%" stop-color="' + CORES[0] + '" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        grade +
        '<path class="linha-graf__area" d="' + area + '"/>' +
        '<path class="linha-graf__traco" d="' + traco + '"/>' +
        marca + rotulos +
      '</svg>' +
      '<p class="periodo__nota" style="margin:8px 0 0;white-space:normal">' +
        'Maior dia: ' + alto.d.dia + ' com ' + moeda(alto.d.valor) + ' · ' +
        'teto do gráfico ' + moeda(maximo) +
      '</p>';
  }

  /* ---------------- a rosca ---------------- */

  function desenharRosca(itens, total) {
    var R = 50, grossura = 13, meio = 60;
    var circunf = 2 * Math.PI * R;
    var acumulado = 0;

    var fatias = itens.map(function (it, i) {
      var parte = it.valor / total;
      var traco = circunf * parte;
      /* `stroke-dasharray` desenha a fatia; o `offset` gira ela até o
         lugar. Menos código que calcular arco à mão, e não sofre com
         fatia de 100% (que num arco viraria um ponto). */
      var el = '<circle class="rosca__fatia" cx="' + meio + '" cy="' + meio + '" r="' + R + '" ' +
        'fill="none" stroke="' + CORES[i % CORES.length] + '" stroke-width="' + grossura + '" ' +
        'stroke-dasharray="' + traco.toFixed(2) + ' ' + (circunf - traco).toFixed(2) + '" ' +
        'stroke-dashoffset="' + (-acumulado).toFixed(2) + '" ' +
        'transform="rotate(-90 ' + meio + ' ' + meio + ')"><title>' +
        esc(it.nome) + ': ' + moeda(it.valor) + '</title></circle>';
      acumulado += traco;
      return el;
    }).join('');

    var svg = '<svg class="rosca" viewBox="0 0 120 120" role="img" ' +
        'aria-label="Vendas por produto">' + fatias +
        '<text class="rosca__meio" x="60" y="59">' + itens.length + '</text>' +
        '<text class="rosca__meio-pe" x="60" y="70">' +
          (itens.length === 1 ? 'PRODUTO' : 'PRODUTOS') +
        '</text>' +
      '</svg>';

    var legenda = '<ul class="rosca__legenda">' + itens.map(function (it, i) {
      var pct = Math.round((it.valor / total) * 100);
      return '<li class="rosca__linha">' +
        '<span class="rosca__cor" style="background:' + CORES[i % CORES.length] + '"></span>' +
        '<span class="rosca__nome">' + esc(it.nome) + '</span>' +
        '<span class="rosca__fatia-pct">' + pct + '%</span>' +
        '<span class="rosca__valor">' + moeda(it.valor) + '</span>' +
      '</li>';
    }).join('') + '</ul>';

    return svg + legenda;
  }

  /* ---------------- a variação ---------------- */

  function pintarVariacao(el, agora, antes) {
    /* Sem mês anterior com faturamento não há comparação honesta.
       De R$ 0 para R$ 100 não é "+100%": é a primeira venda. */
    if (!antes) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    var pct = ((agora - antes) / Math.abs(antes)) * 100;
    var sobe = pct >= 0;
    el.className = 'numero__pe variacao variacao--' + (sobe ? 'sobe' : 'desce');
    el.innerHTML = (sobe ? '↑' : '↓') + ' <b>' + Math.abs(pct).toFixed(0) + '%</b> ' +
      '<span style="color:var(--muted-2)">vs mês anterior</span>';
  }

  /* ---------------- montar ---------------- */

  (async function () {
    var user = await Auth.exigirLogin('../login.html');
    if (!user) return;

    await Moldura.montar({ aba: 'mais' });
    Moldura.aoNovo(function () { location.href = '../index.html#novo'; });

    achar('volta').innerHTML = Moldura.svg('volta', 20, 1.9);
    achar('seta-completo').innerHTML = Moldura.svg('seta', 17, 1.9);

    var dados = await Moldura.dados();
    var meses = Analise.meses();

    /* DOIS NÍVEIS DE ACESSO.
       Faturamento fica para os dois: é a soma dos valores de pedido que
       o atendente já vê um por um, e esconder não protegeria nada.
       LUCRO é outra coisa — ele nasce do preço de compra, que é número
       de dono. Para o atendente o cartão inteiro sai da tela, junto do
       aviso de "venda sem custo", que fala do mesmo assunto.
       Sai da tela, e não fica em branco: cartão vazio com rótulo
       "Lucro líquido" é pior, porque parece defeito. */
    var verCusto = await Moldura.podeVerCusto();
    if (!verCusto) {
      var cartaoLucro = achar('lucro') && achar('lucro').closest('.numero');
      if (cartaoLucro) cartaoLucro.hidden = true;
      var avisoCusto = achar('sem-custo');
      if (avisoCusto) avisoCusto.hidden = true;
    }

    var seletor = achar('mes');
    seletor.innerHTML = meses.map(function (m, i) {
      return '<option value="' + m.chave + '">' +
        (i === 0 ? 'Este mês' : esc(m.rotulo)) + '</option>';
    }).join('');

    function pintar(chave) {
      var i = meses.findIndex(function (m) { return m.chave === chave; });
      var r = Analise.resumoMes(dados.pedidos, dados.despesas, chave);
      var anterior = meses[i + 1]
        ? Analise.resumoMes(dados.pedidos, dados.despesas, meses[i + 1].chave)
        : null;

      achar('faturamento').textContent = moeda(r.faturamento);
      pintarVariacao(achar('faturamento-delta'), r.faturamento, anterior && anterior.faturamento);

      /* O mês muda e esta função roda de novo: sem esta guarda ela
         reacenderia o lucro que o papel do atendente acabou de
         esconder. Esconder uma vez não basta quando a tela redesenha. */
      if (verCusto) {
        achar('lucro').textContent = moeda(r.lucro);
        pintarVariacao(achar('lucro-delta'), r.lucro, anterior && anterior.lucro);
      }

      /* O aviso de lucro por cima. Mesma conta da tela de relatórios
         antiga, para as duas dizerem a mesma coisa. */
      var aviso = achar('sem-custo');
      if (r.semCusto && verCusto) {
        aviso.hidden = false;
        aviso.textContent = r.semCusto === 1
          ? 'Uma venda deste mês (' + moeda(r.semCustoValor) + ') está sem custo ' +
            'cadastrado, então o lucro acima está por cima do real. Produto: ' +
            r.semCustoProdutos.join(', ') + '.'
          : r.semCusto + ' vendas deste mês (' + moeda(r.semCustoValor) + ') estão sem ' +
            'custo cadastrado, então o lucro acima está por cima do real. Produtos: ' +
            r.semCustoProdutos.join(', ') + '.';
      } else {
        aviso.hidden = true;
      }

      /* ---- linha: vendas dia a dia ---- */
      var caixaLinha = achar('linha');
      var vazioLinha = achar('linha-vazio');
      achar('vendas-total').textContent = r.vendas
        ? r.vendas + (r.vendas === 1 ? ' venda' : ' vendas')
        : '';

      if (!r.pedidos.length) {
        caixaLinha.innerHTML = '';
        vazioLinha.hidden = false;
        vazioLinha.textContent = 'Nenhuma venda confirmada neste mês. ' +
          'Quando houver, o gráfico aparece aqui.';
      } else {
        vazioLinha.hidden = true;
        /* Quantos dias tem este mês, para o gráfico cobrir o mês todo e
           não só até a última venda. */
        var partes = chave.split('-');
        var ano = Number(partes[0]), mes = Number(partes[1]);
        var quantos = new Date(ano, mes, 0).getDate();
        var hoje = new Date();
        /* No mês corrente, para no dia de hoje: desenhar o resto do mês
           em zero faz parecer que as vendas caíram. */
        if (ano === hoje.getFullYear() && mes === hoje.getMonth() + 1) {
          quantos = hoje.getDate();
        }

        var porDia = {};
        r.pedidos.forEach(function (p) {
          var d = new Date(p.data || p.criado_em);
          if (isNaN(d)) return;
          var dia = d.getDate();
          porDia[dia] = (porDia[dia] || 0) + Number(p.valor || 0);
        });

        var dias = [];
        for (var k = 1; k <= quantos; k++) dias.push({ dia: k, valor: porDia[k] || 0 });
        caixaLinha.innerHTML = desenharLinha(dias);
      }

      /* ---- rosca: vendas por produto ---- */
      var caixaRosca = achar('rosca');
      var vazioRosca = achar('rosca-vazio');
      /* O ranking do analise.js devolve `total`, e não `valor`. Eu havia
         chutado `valor`: a soma dava zero, a rosca não desenhava e a
         tela mostrava "sem venda por produto" num mês com sete vendas.
         Ler a função em vez de adivinhar o nome do campo custa menos. */
      var ranking = Analise.rankingProdutos(r.pedidos);
      var total = ranking.reduce(function (t, x) { return t + x.total; }, 0);

      if (!ranking.length || !total) {
        caixaRosca.innerHTML = '';
        vazioRosca.hidden = false;
        vazioRosca.textContent = 'Sem venda por produto neste mês.';
      } else {
        vazioRosca.hidden = true;
        /* Cinco fatias e "Outros": mais que isso a rosca fica ilegível e
           a legenda não cabe no celular. */
        var mostra = ranking.slice(0, 5).map(function (x) {
          return { nome: x.nome, valor: x.total };
        });
        var resto = ranking.slice(5);
        if (resto.length) {
          mostra.push({
            nome: 'Outros (' + resto.length + ')',
            valor: resto.reduce(function (t, x) { return t + x.total; }, 0)
          });
        }
        caixaRosca.innerHTML = desenharRosca(mostra, total);
      }
    }

    pintar(meses[0].chave);
    seletor.addEventListener('change', function () { pintar(seletor.value); });

    achar('carregando').hidden = true;
    achar('conteudo').hidden = false;
    Moldura.animarEntrada('.bloco, .numeros');
  })();
})();
