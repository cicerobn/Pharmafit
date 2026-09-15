/* =========================================================
   PHARMA FIT — tela de Início do painel

   Todo número aqui vem do banco. Nenhum é enfeite: se não houver
   venda, a tela diz que não houve, em vez de desenhar uma barra
   bonita com altura inventada.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Moldura = window.PharmaFitMoldura;
  var Analise = window.PharmaFitAnalise;
  var U = window.PharmaFitUtil;
  var moeda = U.moeda;
  var esc = U.esc;

  var estado = { pedidos: [], produtos: [] };

  /* ---------- contas de tempo ---------- */

  function inicioDoDia(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function dataDe(p) {
    return new Date(p.confirmado_em || p.criado_em || Date.now());
  }

  function confirmados(lista) {
    return (lista || []).filter(function (p) {
      var s = String(p.status || '').toLowerCase();
      return s === 'confirmado' || s === 'pago' || s === 'separacao' || s === 'enviado';
    });
  }

  function somar(lista, de, ate) {
    return confirmados(lista).reduce(function (t, p) {
      var q = dataDe(p);
      return (q >= de && q <= ate) ? t + Number(p.valor || 0) : t;
    }, 0);
  }

  /* ---------- vendas de hoje, contra ontem no mesmo ponto ---------- */

  function pintarHoje() {
    var agora = new Date();
    var hoje0 = inicioDoDia(agora);

    var hoje = somar(estado.pedidos, hoje0, agora);

    /* Ontem NÃO é o dia inteiro de ontem: é ontem até a MESMA HORA.
       Comparar as 9 da manhã de hoje com as 24 horas de ontem faria
       todo dia começar com uma queda de 80%, e isso não é informação,
       é susto diário. */
    var ontemInicio = new Date(hoje0.getTime() - 86400000);
    var ontemAgora = new Date(agora.getTime() - 86400000);
    var ontem = somar(estado.pedidos, ontemInicio, ontemAgora);

    document.querySelector('[data-hoje]').textContent = moeda(hoje);

    var alvo = document.querySelector('[data-delta]');

    if (!ontem && !hoje) {
      alvo.className = 'destaque__delta';
      alvo.textContent = 'Nenhuma venda ainda hoje';
      return;
    }

    if (!ontem) {
      alvo.className = 'destaque__delta destaque__delta--sobe';
      alvo.textContent = 'Ontem, a esta hora, não havia venda';
      return;
    }

    var variacao = ((hoje - ontem) / ontem) * 100;
    var sobe = variacao >= 0;

    alvo.className = 'destaque__delta ' +
      (sobe ? 'destaque__delta--sobe' : 'destaque__delta--desce');
    alvo.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (sobe ? '<path d="M6 15l6-6 6 6"/>' : '<path d="M6 9l6 6 6-6"/>') + '</svg>' +
      '<b>' + (sobe ? '+' : '') + variacao.toFixed(0) + '%</b>' +
      '<span>vs ontem à mesma hora</span>';
  }

  /* ---------- as barrinhas: sete dias de verdade ---------- */

  function pintarBarras() {
    var alvo = document.querySelector('[data-barras]');
    var agora = new Date();
    var dias = [];

    for (var i = 6; i >= 0; i--) {
      var de = inicioDoDia(new Date(agora.getTime() - i * 86400000));
      var ate = new Date(de.getTime() + 86399999);
      dias.push(somar(estado.pedidos, de, i === 0 ? agora : ate));
    }

    var maior = Math.max.apply(null, dias);

    /* Sem venda na semana, nenhuma barra. Um gráfico com todas as
       barras no mesmo tamanho pareceria "vendas constantes", que é o
       oposto da verdade. */
    if (!maior) { alvo.innerHTML = ''; return; }

    alvo.innerHTML = dias.map(function (v) {
      var altura = Math.max(3, Math.round((v / maior) * 46));
      return '<span class="destaque__barra" style="height:' + altura + 'px"></span>';
    }).join('');
  }

  /* ---------- os quatro números ---------- */

  function pintarNumeros() {
    var emAndamento = estado.pedidos.filter(function (p) {
      var s = String(p.status || 'pendente').toLowerCase();
      return s === 'pendente' || s === 'pago' || s === 'separacao';
    }).length;

    var chave = Analise.chaveMes(new Date());
    var doMes = confirmados(estado.pedidos).filter(function (p) {
      return Analise.chaveMes(dataDe(p)) === chave;
    });
    var faturamento = doMes.reduce(function (t, p) { return t + Number(p.valor || 0); }, 0);

    /* "Clientes" conta quem JÁ COMPROU, e por telefone quando existe —
       o mesmo nome escrito de dois jeitos não pode virar dois clientes.
       O rótulo na tela diz "que já compraram" para o número não ser
       lido como "cadastrados no site", que é outra coisa. */
    var quem = {};
    confirmados(estado.pedidos).forEach(function (p) {
      var id = U.digitos(p.telefone || '') || U.normalizar(p.cliente || '');
      if (id) quem[id] = true;
    });

    var aVenda = estado.produtos.filter(function (p) {
      return p.ativo !== false;
    }).length;

    document.querySelector('[data-n-pedidos]').textContent = String(emAndamento);
    document.querySelector('[data-n-faturamento]').textContent = moeda(faturamento);
    document.querySelector('[data-n-clientes]').textContent = String(Object.keys(quem).length);
    document.querySelector('[data-n-produtos]').textContent = String(aVenda);
  }

  /* ---------- vendas por produto ---------- */

  function janela(periodo) {
    var agora = new Date();
    if (periodo === 'hoje') return { de: inicioDoDia(agora), ate: agora };
    if (periodo === '7') return { de: inicioDoDia(new Date(agora.getTime() - 6 * 86400000)), ate: agora };
    var d = new Date(agora.getFullYear(), agora.getMonth(), 1);
    return { de: d, ate: agora };
  }

  function pintarFatias() {
    var periodo = document.querySelector('[data-periodo]').value;
    var j = janela(periodo);
    var alvo = document.querySelector('[data-fatias]');

    var dentro = confirmados(estado.pedidos).filter(function (p) {
      var q = dataDe(p);
      return q >= j.de && q <= j.ate;
    });

    var mapa = {};
    dentro.forEach(function (p) {
      var nome = String(p.produto || 'Sem produto').trim();
      if (!mapa[nome]) mapa[nome] = { nome: nome, total: 0, unidades: 0 };
      mapa[nome].total += Number(p.valor || 0);
      mapa[nome].unidades += Number(p.quantidade || 1);
    });

    var lista = Object.keys(mapa).map(function (k) { return mapa[k]; })
      .sort(function (a, b) { return b.total - a.total; });

    if (!lista.length) {
      alvo.innerHTML =
        '<div class="vazio">' +
          '<p class="vazio__titulo">Sem vendas no período</p>' +
          '<p class="vazio__texto">Escolha outro período acima, ou confirme um pedido ' +
          'na tela de Pedidos para ele entrar aqui.</p>' +
        '</div>';
      return;
    }

    var soma = lista.reduce(function (t, i) { return t + i.total; }, 0);
    var maior = lista[0].total;

    /* Só os cinco primeiros: a lista existe para dizer o que puxa o
       faturamento, e uma lista de trinta produtos não diz isso. */
    alvo.innerHTML = lista.slice(0, 5).map(function (i, n) {
      var fatia = soma ? Math.round((i.total / soma) * 100) : 0;
      var largura = maior ? Math.max(3, Math.round((i.total / maior) * 100)) : 0;
      return '<div class="fatia">' +
        '<div class="fatia__topo">' +
          '<p class="fatia__nome">' + esc(i.nome) + '</p>' +
          '<span class="fatia__valor">' + moeda(i.total) + '</span>' +
        '</div>' +
        '<div class="fatia__pe">' +
          '<span>' + i.unidades + (i.unidades === 1 ? ' unidade' : ' unidades') + '</span>' +
          '<span>' + fatia + '%</span>' +
        '</div>' +
        '<div class="fatia__trilho">' +
          '<div class="fatia__barra" style="width:' + largura + '%;--i:' + n + '"></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ---------- pedidos recentes ---------- */

  var SITUACAO = {
    pendente: { rotulo: 'Pendente', classe: 'pendente' },
    confirmado: { rotulo: 'Pago', classe: 'pago' },
    pago: { rotulo: 'Pago', classe: 'pago' },
    separacao: { rotulo: 'Em separação', classe: 'separacao' },
    enviado: { rotulo: 'Enviado', classe: 'enviado' },
    cancelado: { rotulo: 'Cancelado', classe: 'cancelado' }
  };

  function etiqueta(status) {
    var s = SITUACAO[String(status || 'pendente').toLowerCase()] || SITUACAO.pendente;
    return '<span class="marca marca--' + s.classe + '">' + s.rotulo + '</span>';
  }

  /** "Hoje, 08:42" · "Ontem, 17:31" · "12/09, 14:20" */
  function quando(valor) {
    var d = new Date(valor);
    if (isNaN(d)) return '';
    var hoje0 = inicioDoDia(new Date());
    var hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (d >= hoje0) return 'Hoje, ' + hora;
    if (d >= new Date(hoje0.getTime() - 86400000)) return 'Ontem, ' + hora;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ', ' + hora;
  }

  function pintarRecentes() {
    var alvo = document.querySelector('[data-recentes]');

    var lista = estado.pedidos.slice().sort(function (a, b) {
      return dataDe(b) - dataDe(a);
    }).slice(0, 5);

    if (!lista.length) {
      alvo.innerHTML =
        '<li><div class="vazio">' +
          '<p class="vazio__titulo">Nenhum pedido ainda</p>' +
          '<p class="vazio__texto">Quando chegar o primeiro pedido pelo site, ele aparece aqui.</p>' +
        '</div></li>';
      return;
    }

    alvo.innerHTML = lista.map(function (p) {
      var numero = p.numero ? '#' + p.numero : ('#' + String(p.id).slice(-4));
      /* A ordem segue o desenho: numero pequeno em cima, nome do cliente,
         valor embaixo; do lado direito a etiqueta e a hora. */
      return '<li><a class="item" href="pedidos.html?pedido=' + encodeURIComponent(p.id) + '">' +
        '<span class="item__icone">' + Moldura.svg('caixa', 19, 1.6) + '</span>' +
        '<span class="item__corpo">' +
          '<span class="item__numero">' + esc(numero) + '</span>' +
          '<span class="item__nome">' + esc(p.cliente || 'Sem nome') + '</span>' +
          '<span class="item__linha">' + moeda(p.valor) + '</span>' +
        '</span>' +
        '<span class="item__lado">' +
          etiqueta(p.status) +
          '<span class="item__hora">' + esc(quando(p.confirmado_em || p.criado_em)) + '</span>' +
        '</span>' +
        '<span class="item__seta">' + Moldura.svg('seta', 17, 1.9) + '</span>' +
      '</a></li>';
    }).join('');
  }

  /* ---------- tudo junto ---------- */

  function pintar() {
    pintarHoje();
    pintarBarras();
    pintarNumeros();
    pintarFatias();
    pintarRecentes();

    document.getElementById('carregando').hidden = true;
    document.getElementById('erro').hidden = true;
    document.getElementById('conteudo').hidden = false;

    Moldura.animarEntrada('.destaque, .numero, .bloco');
  }

  function mostrarErro(msg) {
    document.getElementById('carregando').hidden = true;
    document.getElementById('conteudo').hidden = true;
    var caixa = document.getElementById('erro');
    caixa.hidden = false;
    document.getElementById('erro-texto').textContent =
      msg || 'Confira a conexão e tente de novo.';
  }

  async function carregar() {
    try {
      var r = await Moldura.dados();
      estado.pedidos = r.pedidos || [];
      estado.produtos = r.produtos || [];
      pintar();
    } catch (e) {
      mostrarErro(String((e && e.message) || e));
    }
  }

  /* ---------- começo ---------- */

  (async function () {
    var user = await Auth.exigirLogin('../login.html');
    if (!user) return;

    await Moldura.montar({ aba: 'inicio' });

    /* O "+" desta tela cria um pedido. Ele leva para a fila, que é onde
       o formulário de novo pedido já existe e funciona — em vez de eu
       desenhar um segundo formulário para manter. */
    Moldura.aoNovo(function () { location.href = '../index.html#novo'; });

    document.querySelector('[data-periodo]').addEventListener('change', pintarFatias);
    document.getElementById('de-novo').addEventListener('click', function () {
      document.getElementById('erro').hidden = true;
      document.getElementById('carregando').hidden = false;
      carregar();
    });

    await carregar();
  })();
})();
