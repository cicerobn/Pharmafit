/* =========================================================
   PHARMA FIT — tela de Pedidos

   Busca, ordenação, abas por situação e a lista. Tudo aqui mexe
   na mesma lista em memória: nenhum filtro vai ao banco de novo,
   então trocar de aba é instantâneo.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Moldura = window.PharmaFitMoldura;
  var U = window.PharmaFitUtil;
  var moeda = U.moeda;
  var esc = U.esc;

  var estado = {
    pedidos: [],
    ver: 'todos',
    ordem: 'recentes',
    busca: ''
  };

  var SITUACAO = {
    pendente: { rotulo: 'Pendente', classe: 'pendente' },
    confirmado: { rotulo: 'Pago', classe: 'pago' },
    pago: { rotulo: 'Pago', classe: 'pago' },
    separacao: { rotulo: 'Em separação', classe: 'separacao' },
    enviado: { rotulo: 'Enviado', classe: 'enviado' },
    cancelado: { rotulo: 'Cancelado', classe: 'cancelado' }
  };

  /* Que situações cada aba mostra. "Em andamento" é o que já foi pago
     mas ainda não saiu — é o trabalho que está na mão de alguém. */
  var ABA = {
    todos: null,
    pendentes: ['pendente'],
    andamento: ['confirmado', 'pago', 'separacao'],
    enviados: ['enviado']
  };

  function dataDe(p) {
    return new Date(p.confirmado_em || p.criado_em || 0);
  }

  function etiqueta(status) {
    var s = SITUACAO[String(status || 'pendente').toLowerCase()] || SITUACAO.pendente;
    return '<span class="marca marca--' + s.classe + '">' + s.rotulo + '</span>';
  }

  function quando(valor) {
    var d = new Date(valor);
    if (isNaN(d)) return '';
    var hoje0 = new Date();
    hoje0.setHours(0, 0, 0, 0);
    var hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (d >= hoje0) return 'Hoje, ' + hora;
    if (d >= new Date(hoje0.getTime() - 86400000)) return 'Ontem, ' + hora;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ', ' + hora;
  }

  function numeroDe(p) {
    return p.numero ? '#' + p.numero : '#' + String(p.id).slice(-4);
  }

  /* ---------- a lista, depois de aba, busca e ordem ---------- */

  function filtrar() {
    var situacoes = ABA[estado.ver];
    var termo = U.normalizar(estado.busca.trim());

    var lista = estado.pedidos.filter(function (p) {
      if (situacoes) {
        var s = String(p.status || 'pendente').toLowerCase();
        if (situacoes.indexOf(s) === -1) return false;
      }
      if (!termo) return true;

      /* A busca olha número, cliente, telefone e produto. Quem procura
         "1027" está procurando o pedido; quem digita "joão" está
         procurando a pessoa. Os dois têm de achar. */
      var alvo = U.normalizar([
        numeroDe(p), p.numero, p.cliente, p.telefone, p.produto
      ].join(' '));
      return alvo.indexOf(termo) !== -1;
    });

    lista.sort(function (a, b) {
      if (estado.ordem === 'antigos') return dataDe(a) - dataDe(b);
      if (estado.ordem === 'maior') return Number(b.valor || 0) - Number(a.valor || 0);
      if (estado.ordem === 'menor') return Number(a.valor || 0) - Number(b.valor || 0);
      return dataDe(b) - dataDe(a);
    });

    return lista;
  }

  function pintar() {
    var lista = filtrar();
    var alvo = document.querySelector('[data-pedidos]');
    var conta = document.querySelector('[data-conta]');

    if (!lista.length) {
      conta.textContent = '';
      var semNada = !estado.pedidos.length;
      alvo.innerHTML = '<li><div class="vazio">' +
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M21 8v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8"/><path d="M2 4h20v4H2z"/></svg>' +
        '<p class="vazio__titulo">' +
          (semNada ? 'Nenhum pedido ainda' : 'Nada com esse filtro') + '</p>' +
        '<p class="vazio__texto">' + (semNada
          ? 'Quando chegar o primeiro pedido pelo site, ele aparece aqui.'
          : 'Tente outra aba acima, ou limpe a busca.') + '</p>' +
      '</div></li>';
      return;
    }

    var soma = lista.reduce(function (t, p) { return t + Number(p.valor || 0); }, 0);
    conta.textContent = lista.length + (lista.length === 1 ? ' pedido' : ' pedidos') +
      ' · ' + moeda(soma);

    /* O QUE FOI PEDIDO, E NÃO SÓ QUANTO.
     *
     * A linha mostrava número, nome e valor — e mais nada. Medido em
     * 18/09/2026 com uma compra de três produtos feita pelo carrinho:
     * a fila ficou com três linhas iguais de ler,
     *   "#t-0 Compra de Tres R$ 0,00 Pendente Hoje, 16:36"
     * três vezes, sem dizer em nenhuma o que a pessoa comprou. Para
     * responder no WhatsApp a equipe tinha de abrir uma por uma.
     * O produto entra na mesma linha do valor, que já corta com "…"
     * quando não cabe (nome comprido em celular estreito). */
    function resumoDaLinha(p) {
      var valor = Number(p.valor || 0);
      var q = Number(p.quantidade || 0);
      var produto = p.produto
        ? p.produto + (q > 1 ? ' · ' + q + ' un.' : '')
        : '';

      /* A ORDEM IMPORTA, e eu descobri isso medindo em 320px: a linha
         corta com "…" quando não cabe, então o que vem por último é o
         que desaparece no celular estreito.
           · pedido JÁ FECHADO: o valor vem na frente. Ele é o número
             que a equipe procura, e num iPhone SE ele estava sendo
             cortado fora por um nome de produto comprido;
           · pedido PENDENTE: o valor é R$ 0,00 (quem preça é a equipe,
             na hora de confirmar). Mostrar zero não diz nada, e o
             produto diz tudo — então na fila de espera o produto vem
             sozinho. */
      if (valor > 0) return produto ? moeda(valor) + ' · ' + produto : moeda(valor);
      return produto || moeda(valor);
    }

    alvo.innerHTML = lista.map(function (p) {
      return '<li><a class="item" href="../index.html?pedido=' + encodeURIComponent(p.id) + '">' +
        '<span class="item__icone">' + Moldura.svg('caixa', 19, 1.6) + '</span>' +
        '<span class="item__corpo">' +
          '<span class="item__numero">' + esc(numeroDe(p)) +
            /* o cupom do carrinho do site, ao lado do número: é onde o
               olho passa antes de abrir o pedido (24/09/2026) */
            (p.cupom ? ' <span class="item__cupom">cupom ' + esc(p.cupom) + '</span>' : '') +
          '</span>' +
          '<span class="item__nome">' + esc(p.cliente || 'Sem nome') + '</span>' +
          '<span class="item__linha">' + esc(resumoDaLinha(p)) + '</span>' +
        '</span>' +
        '<span class="item__lado">' +
          etiqueta(p.status) +
          '<span class="item__hora">' + esc(quando(p.confirmado_em || p.criado_em)) + '</span>' +
        '</span>' +
        '<span class="item__seta">' + Moldura.svg('seta', 17, 1.9) + '</span>' +
      '</a></li>';
    }).join('');
  }

  function mostrarErro(msg) {
    document.getElementById('carregando').hidden = true;
    document.getElementById('conteudo').hidden = true;
    document.getElementById('erro').hidden = false;
    document.getElementById('erro-texto').textContent =
      msg || 'Confira a conexão e tente de novo.';
  }

  async function carregar() {
    try {
      var r = await Moldura.dados();
      estado.pedidos = r.pedidos || [];
      document.getElementById('carregando').hidden = true;
      document.getElementById('erro').hidden = true;
      document.getElementById('conteudo').hidden = false;
      pintar();
    } catch (e) {
      mostrarErro(String((e && e.message) || e));
    }
  }

  /* ---------- começo ---------- */

  (async function () {
    var user = await Auth.exigirLogin('../login.html');
    if (!user) return;

    await Moldura.montar({ aba: 'pedidos' });
    Moldura.aoNovo(function () { location.href = '../index.html#novo'; });

    /* O sino leva para cá com ?ver=pendentes. Sem isto, tocar no sino
       traria a lista inteira e a pessoa teria de filtrar na mão — o
       aviso diria "2 esperando" e não mostraria quais. */
    var busca = new URLSearchParams(location.search);
    var ver = busca.get('ver');
    if (ver && ABA[ver] !== undefined) estado.ver = ver;

    document.querySelectorAll('[data-ver]').forEach(function (b) {
      var meu = b.getAttribute('data-ver');
      b.classList.toggle('is-ativa', meu === estado.ver);
      b.setAttribute('aria-pressed', String(meu === estado.ver));
      b.addEventListener('click', function () {
        estado.ver = meu;
        document.querySelectorAll('[data-ver]').forEach(function (o) {
          o.classList.toggle('is-ativa', o === b);
          o.setAttribute('aria-pressed', String(o === b));
        });
        pintar();
      });
    });

    var campo = document.querySelector('[data-busca]');
    campo.addEventListener('input', U.debounce(function () {
      estado.busca = campo.value;
      pintar();
    }, 140));

    /* O filtro abre a caixa de ordenação. Ele fica marcado enquanto a
       ordem não é a normal, para a pessoa saber que a lista está
       ordenada de um jeito diferente do que ela espera. */
    var botaoFiltro = document.querySelector('[data-filtro]');
    var caixa = document.querySelector('[data-ordenacao]');

    botaoFiltro.addEventListener('click', function () {
      var abrindo = caixa.hidden;
      caixa.hidden = !abrindo;
      botaoFiltro.setAttribute('aria-expanded', String(abrindo));
    });

    document.querySelectorAll('[data-ordem]').forEach(function (b) {
      b.addEventListener('click', function () {
        estado.ordem = b.getAttribute('data-ordem');
        document.querySelectorAll('[data-ordem]').forEach(function (o) {
          o.classList.toggle('is-ativo', o === b);
        });
        botaoFiltro.classList.toggle('is-ativo', estado.ordem !== 'recentes');
        pintar();
      });
    });

    document.getElementById('de-novo').addEventListener('click', function () {
      document.getElementById('erro').hidden = true;
      document.getElementById('carregando').hidden = false;
      carregar();
    });

    await carregar();
  })();
})();
