/* =========================================================
   PHARMA FIT — área do cliente

   Simples de propósito: sem cadastro, sem senha. Tudo fica
   guardado no aparelho de quem usa — inclusive o controle das
   aplicações, que é a parte que mais ajuda no dia a dia.
   ========================================================= */
(function () {
  'use strict';

  var Area = window.PharmaFitArea;
  var CHAVE_APLICACOES = 'pharmafit_aplicacoes';
  var CHAVE_PROTOCOLO = 'pharmafit_protocolo';

  var INTERVALO_PADRAO = 7; /* dias entre aplicações */
  var DIA = 24 * 60 * 60 * 1000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ler(chave, padrao) {
    try {
      var raw = localStorage.getItem(chave);
      return raw ? JSON.parse(raw) : padrao;
    } catch (e) { return padrao; }
  }

  function gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {}
  }

  function toast(msg) {
    var el = document.getElementById('toast-site');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-site';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 3000);
  }

  function soData(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function dataCurta(v) {
    var d = new Date(v);
    return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  /** "sexta-feira" -> "Sexta-feira" (só a primeira letra) */
  function diaSemana(v) {
    var nome = new Date(v).toLocaleDateString('pt-BR', { weekday: 'long' });
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  }

  /* ---------- protocolo ---------- */

  var Protocolo = {
    config: function () {
      return ler(CHAVE_PROTOCOLO, { intervalo: INTERVALO_PADRAO, produto: '' });
    },
    salvarConfig: function (c) { gravar(CHAVE_PROTOCOLO, c); },

    aplicacoes: function () {
      return ler(CHAVE_APLICACOES, []).sort(function (a, b) { return new Date(b) - new Date(a); });
    },

    registrar: function (quando) {
      var lista = ler(CHAVE_APLICACOES, []);
      var dia = soData(quando || new Date()).toISOString();
      if (lista.indexOf(dia) === -1) lista.push(dia);
      gravar(CHAVE_APLICACOES, lista);
    },

    desfazerUltima: function () {
      var lista = Protocolo.aplicacoes();
      if (!lista.length) return;
      var resto = ler(CHAVE_APLICACOES, []).filter(function (d) { return d !== lista[0]; });
      gravar(CHAVE_APLICACOES, resto);
    },

    /** Situação de hoje: em dia, chegou o dia ou atrasado. */
    situacao: function () {
      var lista = Protocolo.aplicacoes();
      if (!lista.length) return { estado: 'sem-inicio' };

      var ultima = soData(lista[0]);
      var intervalo = Number(Protocolo.config().intervalo) || INTERVALO_PADRAO;
      var proxima = new Date(ultima.getTime() + intervalo * DIA);
      var hoje = soData(new Date());
      var faltam = Math.round((proxima - hoje) / DIA);

      return {
        estado: faltam > 0 ? 'em-dia' : (faltam === 0 ? 'hoje' : 'atrasado'),
        ultima: ultima,
        proxima: proxima,
        faltam: faltam,
        semana: lista.length,
        intervalo: intervalo
      };
    }
  };

  /* ---------- lembrete no calendário ---------- */

  function dois(n) { return String(n).padStart(2, '0'); }

  /** Data no horário do aparelho: 20260828T090000 */
  function carimbo(d, hora) {
    var x = new Date(d);
    if (hora !== undefined) x.setHours(hora, 0, 0, 0);
    return x.getFullYear() + dois(x.getMonth() + 1) + dois(x.getDate()) +
      'T' + dois(x.getHours()) + dois(x.getMinutes()) + '00';
  }

  /** Data em UTC, exigida pelo DTSTAMP: 20260821T040200Z */
  function carimboUTC(d) {
    var x = new Date(d);
    return x.getUTCFullYear() + dois(x.getUTCMonth() + 1) + dois(x.getUTCDate()) +
      'T' + dois(x.getUTCHours()) + dois(x.getUTCMinutes()) + dois(x.getUTCSeconds()) + 'Z';
  }

  /**
   * Monta um arquivo .ics com as próximas aplicações. Funciona no
   * calendário do iPhone e do Android sem precisar de conta nem de
   * permissão de notificação.
   */
  function arquivoCalendario(s) {
    var produto = (Protocolo.config().produto || '').trim();
    var titulo = produto ? 'Aplicação — ' + produto : 'Aplicação Pharma Fit';

    var linhas = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Pharma Fit//Protocolo//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:pharmafit-' + carimbo(s.proxima, 9) + '@pharmafit',
      'DTSTAMP:' + carimboUTC(new Date()),
      'DTSTART:' + carimbo(s.proxima, 9),
      'DURATION:PT15M',
      'RRULE:FREQ=DAILY;INTERVAL=' + s.intervalo + ';COUNT=12',
      'SUMMARY:' + titulo,
      'DESCRIPTION:Lembrete criado no site da Pharma Fit.',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + titulo,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    return linhas.join('\r\n');
  }

  function baixarCalendario() {
    var s = Protocolo.situacao();
    if (s.estado === 'sem-inicio') { toast('Marque a primeira aplicação para criar o lembrete.'); return; }

    var blob = new Blob([arquivoCalendario(s)], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'aplicacoes-pharma-fit.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

    toast('Lembrete criado. Abra o arquivo para salvar no seu calendário.');
  }

  /* ---------- desenho da tela ---------- */

  function pintarProtocolo() {
    var caixa = document.getElementById('protocolo');
    if (!caixa) return;

    var s = Protocolo.situacao();
    var config = Protocolo.config();

    if (s.estado === 'sem-inicio') {
      caixa.innerHTML =
        '<div class="protocolo protocolo--vazio">' +
          '<p class="protocolo__titulo">Acompanhe suas aplicações</p>' +
          '<p class="protocolo__texto">Marque o dia em que aplicar: a gente calcula a próxima e ' +
            'você pode salvar o lembrete no calendário do celular. Fica só no seu aparelho.</p>' +
          '<button class="btn btn--primary btn--block" type="button" data-aplicar>Apliquei hoje</button>' +
        '</div>';
      return;
    }

    var cor = s.estado === 'atrasado' ? 'atrasado' : (s.estado === 'hoje' ? 'hoje' : 'em-dia');
    var titulo = s.estado === 'atrasado'
      ? 'Aplicação atrasada'
      : (s.estado === 'hoje' ? 'Sua aplicação é hoje' : 'Próxima aplicação');

    var detalhe = s.estado === 'atrasado'
      ? Math.abs(s.faltam) + (Math.abs(s.faltam) === 1 ? ' dia de atraso' : ' dias de atraso')
      : (s.estado === 'hoje' ? 'É hoje — bom protocolo!' :
         'em ' + s.faltam + (s.faltam === 1 ? ' dia' : ' dias'));

    var historico = Protocolo.aplicacoes().slice(0, 8).map(function (d) {
      return '<li>' + dataCurta(d) + '</li>';
    }).join('');

    caixa.innerHTML =
      '<div class="protocolo protocolo--' + cor + '">' +
        '<div class="protocolo__cabeca">' +
          '<div>' +
            '<p class="protocolo__rotulo">' + esc(titulo) + '</p>' +
            '<p class="protocolo__data">' + dataCurta(s.proxima) +
              '<span>' + esc(diaSemana(s.proxima)) + '</span></p>' +
          '</div>' +
          '<span class="protocolo__selo">' + esc(detalhe) + '</span>' +
        '</div>' +

        '<div class="protocolo__linha">' +
          '<span>Aplicação nº ' + s.semana + '</span>' +
          '<span>Última: ' + dataCurta(s.ultima) + '</span>' +
          '<span>A cada ' + s.intervalo + ' dias</span>' +
          (config.produto ? '<span>' + esc(config.produto) + '</span>' : '') +
        '</div>' +

        (historico ? '<ul class="protocolo__historico">' + historico + '</ul>' : '') +

        '<div class="protocolo__acoes">' +
          '<button class="btn btn--primary" type="button" data-aplicar>Apliquei hoje</button>' +
          '<button class="btn btn--outline" type="button" data-calendario>Lembrar no celular</button>' +
        '</div>' +

        '<button class="linkish protocolo__desfazer" type="button" data-desfazer>Desfazer última</button>' +

        '<label class="protocolo__intervalo">' +
          'A cada quantos dias?' +
          '<select data-intervalo>' +
            [3, 7, 14, 15, 21, 30].map(function (n) {
              return '<option value="' + n + '"' + (n === Number(config.intervalo) ? ' selected' : '') +
                '>' + n + ' dias</option>';
            }).join('') +
          '</select>' +
        '</label>' +

        '<label class="protocolo__intervalo">' +
          'Qual produto?' +
          '<select data-produto-protocolo>' +
            '<option value="">Não informar</option>' +
            (window.PHARMAFIT_CATALOGO || []).map(function (p) {
              return '<option value="' + esc(p.nome) + '"' +
                (p.nome === config.produto ? ' selected' : '') + '>' + esc(p.nome) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
      '</div>';
  }

  function pintarResumo() {
    var caixa = document.querySelector('[data-resumo-cliente]');
    if (!caixa) return;

    var pedidos = Area.pedidos();
    var favoritos = window.PharmaFitFavoritos ? window.PharmaFitFavoritos.ler().length : 0;
    var s = Protocolo.situacao();

    var itens = [
      { valor: pedidos.length, rotulo: pedidos.length === 1 ? 'pedido' : 'pedidos', href: 'pedidos.html' },
      { valor: favoritos, rotulo: favoritos === 1 ? 'favorito' : 'favoritos', href: 'favoritos.html' },
      { valor: s.estado === 'sem-inicio' ? '—' : s.semana,
        rotulo: 'aplicações', href: '#protocolo' }
    ];

    caixa.innerHTML = itens.map(function (i) {
      return '<a class="resumo-item" href="' + i.href + '"><b>' + i.valor + '</b><span>' +
        esc(i.rotulo) + '</span></a>';
    }).join('');
  }

  function pintarUltimosPedidos() {
    var caixa = document.getElementById('ultimos-pedidos');
    if (!caixa) return;

    var pedidos = Area.pedidos().slice(0, 2);

    if (!pedidos.length) {
      caixa.innerHTML = '<p class="empty">Você ainda não fez pedidos por aqui.</p>';
      return;
    }

    caixa.innerHTML = pedidos.map(function (p) {
      return '<div class="pedido pedido--enxuto">' +
        '<div class="pedido__topo">' +
          '<p class="pedido__nome">' + esc(p.produto) + '</p>' +
          (p.quantidade > 1 ? '<span class="pedido__qtd">' + p.quantidade + ' un.</span>' : '') +
        '</div>' +
        '<p class="pedido__data">Enviado em ' + dataCurta(p.quando) + '</p>' +
        '<button class="linkish linkish--repetir" type="button" data-pedido="' + esc(p.produto) +
          '" data-quantidade="' + Number(p.quantidade || 1) + '">Pedir de novo</button>' +
      '</div>';
    }).join('') +
    '<a class="linkish" href="pedidos.html">Ver todos os pedidos</a>';
  }

  function saudacao() {
    var el = document.getElementById('saudacao');
    if (!el) return;

    var nome = (Area.dados().nome || '').trim().split(' ')[0];
    var hora = new Date().getHours();
    var parte = hora < 12 ? 'Bom dia' : (hora < 18 ? 'Boa tarde' : 'Boa noite');

    el.textContent = nome ? parte + ', ' + nome : 'Minha área';
  }

  /* ---------- eventos ---------- */

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-aplicar]')) {
      Protocolo.registrar();
      pintarProtocolo();
      pintarResumo();
      toast('Aplicação registrada. Próxima em ' + Protocolo.situacao().intervalo + ' dias.');
      return;
    }

    if (e.target.closest('[data-calendario]')) {
      baixarCalendario();
      return;
    }

    if (e.target.closest('[data-desfazer]')) {
      Protocolo.desfazerUltima();
      pintarProtocolo();
      pintarResumo();
      toast('Última aplicação desfeita.');
    }
  });

  document.addEventListener('change', function (e) {
    var intervalo = e.target.closest('[data-intervalo]');
    if (intervalo) {
      var config = Protocolo.config();
      config.intervalo = Number(intervalo.value);
      Protocolo.salvarConfig(config);
      pintarProtocolo();
      toast('Agora contamos ' + config.intervalo + ' dias entre as aplicações.');
      return;
    }

    var produto = e.target.closest('[data-produto-protocolo]');
    if (produto) {
      var c = Protocolo.config();
      c.produto = produto.value;
      Protocolo.salvarConfig(c);
      pintarProtocolo();
      toast(c.produto ? 'Protocolo do ' + c.produto + '.' : 'Produto retirado do protocolo.');
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    saudacao();
    pintarResumo();
    pintarProtocolo();
    pintarUltimosPedidos();
  });

  window.PharmaFitProtocolo = Protocolo;
})();
