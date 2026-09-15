/* =========================================================
   PHARMA FIT — gráficos do painel

   SVG desenhado na mão, sem biblioteca externa: carrega rápido
   e continua funcionando sem internet. Todos os gráficos usam
   a mesma paleta da marca e se adaptam à largura disponível.
   ========================================================= */
(function () {
  'use strict';

  var U = window.PharmaFitUtil;

  var COR = {
    ouro: '#b08c4a',
    ouroClaro: '#d8bd83',
    verde: '#2c6338',
    vermelho: '#c0392b',
    linha: '#e8e1d6',
    texto: '#6e6a64'
  };

  /* paleta para categorias/fatias, na ordem */
  var PALETA = ['#b08c4a', '#2c6338', '#8a6320', '#5f7d8c', '#a15c4a', '#7a6f9b', '#c9a863'];

  function esc(s) { return U.esc(s); }

  function svg(largura, altura, conteudo, rotulo) {
    return '<svg class="gr" viewBox="0 0 ' + largura + ' ' + altura + '" ' +
      'preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(rotulo || 'gráfico') + '">' +
      conteudo + '</svg>';
  }

  var Grafico = {

    /**
     * Barras verticais comparando duas séries por período.
     * dados: [{ rotulo, a, b }] · nomes: { a, b }
     */
    barras: function (alvo, dados, nomes) {
      var el = document.getElementById(alvo);
      if (!el) return;

      if (!dados.length) {
        el.innerHTML = '<p class="empty">Sem dados para o gráfico ainda.</p>';
        return;
      }

      var L = 640, A = 260;
      var margemE = 56, margemB = 34, margemT = 16, margemD = 8;
      var largura = L - margemE - margemD;
      var altura = A - margemT - margemB;

      var maximo = Math.max.apply(null, dados.map(function (d) {
        return Math.max(Number(d.a || 0), Number(d.b || 0));
      })) || 1;

      /* escala arredondada para cima, para a régua ficar redonda */
      var passo = Math.pow(10, Math.floor(Math.log10(maximo)));
      var topo = Math.ceil(maximo / passo) * passo;

      var vaoGrupo = largura / dados.length;
      var larguraBarra = Math.min(dados.length <= 2 ? 52 : 26, vaoGrupo * 0.3);
      var partes = [];

      /* régua horizontal */
      for (var i = 0; i <= 4; i++) {
        var y = margemT + altura - (altura * i / 4);
        var valor = topo * i / 4;
        partes.push('<line x1="' + margemE + '" y1="' + y + '" x2="' + (L - margemD) + '" y2="' + y +
          '" stroke="' + COR.linha + '" stroke-width="1"/>');
        partes.push('<text x="' + (margemE - 8) + '" y="' + (y + 4) + '" text-anchor="end" ' +
          'font-size="11" fill="' + COR.texto + '">' +
          (valor >= 1000 ? Math.round(valor / 1000) + 'k' : Math.round(valor)) + '</text>');
      }

      dados.forEach(function (d, k) {
        var centro = margemE + vaoGrupo * k + vaoGrupo / 2;
        var alturaA = (Number(d.a || 0) / topo) * altura;
        var alturaB = (Number(d.b || 0) / topo) * altura;

        partes.push('<rect x="' + (centro - larguraBarra - 2) + '" y="' + (margemT + altura - alturaA) +
          '" width="' + larguraBarra + '" height="' + Math.max(0, alturaA) +
          '" rx="4" fill="' + COR.ouro + '"><title>' + esc(d.rotulo) + ': ' + U.moeda(d.a) + '</title></rect>');

        partes.push('<rect x="' + (centro + 2) + '" y="' + (margemT + altura - alturaB) +
          '" width="' + larguraBarra + '" height="' + Math.max(0, alturaB) +
          '" rx="4" fill="' + COR.verde + '" opacity=".85"><title>' + esc(d.rotulo) + ': ' +
          U.moeda(d.b) + '</title></rect>');

        partes.push('<text x="' + centro + '" y="' + (A - 12) + '" text-anchor="middle" ' +
          'font-size="11" fill="' + COR.texto + '">' + esc(d.rotulo) + '</text>');
      });

      el.innerHTML = svg(L, A, partes.join(''), 'Comparativo por mês') +
        '<div class="gr__legenda">' +
          '<span><i style="background:' + COR.ouro + '"></i>' + esc(nomes.a) + '</span>' +
          '<span><i style="background:' + COR.verde + '"></i>' + esc(nomes.b) + '</span>' +
        '</div>';
    },

    /**
     * Linha com área, para evolução diária.
     * dados: [{ rotulo, valor }]
     */
    linha: function (alvo, dados, titulo) {
      var el = document.getElementById(alvo);
      if (!el) return;

      if (!dados.length) {
        el.innerHTML = '<p class="empty">Sem movimento no período.</p>';
        return;
      }

      var L = 640, A = 220;
      var margemE = 52, margemB = 28, margemT = 14, margemD = 10;
      var largura = L - margemE - margemD;
      var altura = A - margemT - margemB;

      var maximo = Math.max.apply(null, dados.map(function (d) { return Number(d.valor || 0); })) || 1;
      var passo = Math.pow(10, Math.floor(Math.log10(maximo)));
      var topo = Math.max(passo, Math.ceil(maximo / passo) * passo);

      var vao = dados.length > 1 ? largura / (dados.length - 1) : 0;
      var pontos = dados.map(function (d, i) {
        var x = margemE + vao * i;
        var y = margemT + altura - (Number(d.valor || 0) / topo) * altura;
        return { x: x, y: y, d: d };
      });

      var partes = [];

      for (var i = 0; i <= 4; i++) {
        var y = margemT + altura - (altura * i / 4);
        var marca = topo * i / 4;
        partes.push('<line x1="' + margemE + '" y1="' + y + '" x2="' + (L - margemD) + '" y2="' + y +
          '" stroke="' + COR.linha + '" stroke-width="1"/>');
        partes.push('<text x="' + (margemE - 8) + '" y="' + (y + 4) + '" text-anchor="end" ' +
          'font-size="11" fill="' + COR.texto + '">' +
          (marca >= 1000 ? (marca / 1000).toFixed(marca % 1000 ? 1 : 0).replace('.', ',') + 'k'
                         : Math.round(marca)) + '</text>');
      }

      var caminho = pontos.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join(' ');
      var area = caminho + ' L' + pontos[pontos.length - 1].x + ' ' + (margemT + altura) +
                 ' L' + pontos[0].x + ' ' + (margemT + altura) + ' Z';

      partes.push('<defs><linearGradient id="gr-area" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + COR.ouro + '" stop-opacity=".28"/>' +
        '<stop offset="1" stop-color="' + COR.ouro + '" stop-opacity="0"/></linearGradient></defs>');
      partes.push('<path d="' + area + '" fill="url(#gr-area)"/>');
      partes.push('<path d="' + caminho + '" fill="none" stroke="' + COR.ouro +
        '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>');

      pontos.forEach(function (p, i) {
        var mostrar = dados.length <= 10 || i === 0 || i === pontos.length - 1 ||
                      i === Math.floor(pontos.length / 2);
        partes.push('<circle cx="' + p.x + '" cy="' + p.y + '" r="3.5" fill="#fff" stroke="' +
          COR.ouro + '" stroke-width="2"><title>' + esc(p.d.rotulo) + ': ' + U.moeda(p.d.valor) +
          '</title></circle>');
        if (mostrar) {
          partes.push('<text x="' + p.x + '" y="' + (A - 8) + '" text-anchor="middle" font-size="10.5" fill="' +
            COR.texto + '">' + esc(p.d.rotulo) + '</text>');
        }
      });

      el.innerHTML = svg(L, A, partes.join(''), titulo || 'Evolução diária');
    },

    /**
     * Rosca com legenda ao lado.
     * dados: [{ nome, total }]
     */
    rosca: function (alvo, dados, titulo) {
      var el = document.getElementById(alvo);
      if (!el) return;

      var total = dados.reduce(function (t, d) { return t + Number(d.total || 0); }, 0);

      if (!total) {
        el.innerHTML = '<p class="empty">Sem dados para o gráfico ainda.</p>';
        return;
      }

      var L = 220, A = 220, raio = 84, grossura = 30, centro = 110;
      var partes = [];
      var angulo = -Math.PI / 2;

      dados.forEach(function (d, i) {
        var fatia = (Number(d.total || 0) / total) * Math.PI * 2;
        var fim = angulo + fatia;
        var grande = fatia > Math.PI ? 1 : 0;

        var x1 = centro + raio * Math.cos(angulo), y1 = centro + raio * Math.sin(angulo);
        var x2 = centro + raio * Math.cos(fim), y2 = centro + raio * Math.sin(fim);
        var ri = raio - grossura;
        var x3 = centro + ri * Math.cos(fim), y3 = centro + ri * Math.sin(fim);
        var x4 = centro + ri * Math.cos(angulo), y4 = centro + ri * Math.sin(angulo);

        partes.push('<path d="M' + x1 + ' ' + y1 + ' A' + raio + ' ' + raio + ' 0 ' + grande + ' 1 ' +
          x2 + ' ' + y2 + ' L' + x3 + ' ' + y3 + ' A' + ri + ' ' + ri + ' 0 ' + grande + ' 0 ' +
          x4 + ' ' + y4 + ' Z" fill="' + PALETA[i % PALETA.length] + '">' +
          '<title>' + esc(d.nome) + ': ' + U.moeda(d.total) + '</title></path>');

        angulo = fim;
      });

      partes.push('<text x="' + centro + '" y="' + (centro - 4) + '" text-anchor="middle" ' +
        'font-size="13" fill="' + COR.texto + '">total</text>');
      partes.push('<text x="' + centro + '" y="' + (centro + 18) + '" text-anchor="middle" ' +
        'font-size="17" font-weight="700" fill="#101010">' +
        (total >= 1000 ? 'R$ ' + (total / 1000).toFixed(1).replace('.', ',') + 'k' : U.moeda(total)) + '</text>');

      var legenda = dados.map(function (d, i) {
        var fatia = Math.round((Number(d.total || 0) / total) * 100);
        return '<span><i style="background:' + PALETA[i % PALETA.length] + '"></i>' +
          esc(d.nome) + ' <b>' + fatia + '%</b></span>';
      }).join('');

      el.innerHTML = '<div class="gr__rosca">' + svg(L, A, partes.join(''), titulo || 'Distribuição') +
        '<div class="gr__legenda gr__legenda--coluna">' + legenda + '</div></div>';
    },

    /**
     * Barras horizontais — bom para ranking com nomes longos.
     * dados: [{ nome, total, meta }]
     */
    barrasHorizontais: function (alvo, dados) {
      var el = document.getElementById(alvo);
      if (!el) return;

      if (!dados.length) {
        el.innerHTML = '<p class="empty">Sem dados ainda.</p>';
        return;
      }

      var maximo = Math.max.apply(null, dados.map(function (d) { return Number(d.total || 0); })) || 1;

      el.innerHTML = '<div class="gr__barras">' + dados.map(function (d) {
        var largura = Math.max(3, Math.round((Number(d.total || 0) / maximo) * 100));
        return '<div class="gr__barra">' +
          '<p class="gr__barra-topo"><span>' + esc(d.nome) + '</span>' +
            '<b>' + U.moeda(d.total) + '</b></p>' +
          '<div class="gr__barra-trilho"><span style="width:' + largura + '%"></span></div>' +
          (d.meta ? '<p class="gr__barra-meta">' + esc(d.meta) + '</p>' : '') +
        '</div>';
      }).join('') + '</div>';
    }
  };

  window.PharmaFitGrafico = Grafico;
})();
