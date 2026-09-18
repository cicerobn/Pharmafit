/* =========================================================
   PHARMA FIT — área do cliente

   Desenha a tela da Conta: a saudação, o resumo e os últimos
   pedidos. Os pedidos vêm da CONTA quando há conta, e do aparelho
   como reserva — quem comprou nunca deve ver uma lista vazia.

   precisa: minha-area, conta, idioma
   enche: data-painel-equipe
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
    if (isNaN(d)) return '';
    try {
      return d.toLocaleDateString(idiomaLocal(), { day: '2-digit', month: '2-digit' });
    } catch (e) {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
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

  /* =========================================================
     A PÁGINA DE CONTA

     "Faça uma parte de conta bem feita, isso aqui tá horrível" —
     17/09/2026, com a foto da tela depois de ele criar a conta dele.

     Ele estava certo, e a culpa é da forma como eu trabalhei: ele
     mandou tirar três coisas daqui (o formulário "Meus dados", os dois
     atalhos e o rodapé), eu tirei, e não pus nada no lugar. Sobraram
     dois números soltos, uma lista vazia e um botão de sair flutuando
     num vazio de meia tela.

     E havia um caso pior, que a foto dele não mostra porque ele estava
     logado: SEM CONTA, esta página dizia "0 pedidos · 0 favoritos" e
     "Você ainda não fez pedidos por aqui", sem uma palavra sobre
     entrar. A aba "Conta" na barra de baixo leva todo mundo para cá,
     inclusive quem nunca criou conta.

     São três estados, e os três são desenhados aqui:

       1. com conta  -> quem você é, seus números, seus pedidos, a
                        troca de senha e o sair;
       2. sem conta  -> um convite com Entrar e Criar conta — e, se
                        houver pedidos NESTE aparelho, eles continuam
                        aparecendo, porque quem comprou sem conta
                        comprou de verdade;
       3. carregando -> a ficha do aparelho na hora, corrigida quando
                        a conta responde. Nada espera a rede.
     ========================================================= */

  /* O MÊS SAI NO IDIOMA DA PÁGINA, e não em português fixo.
     Com `'pt-BR'` cravado aqui, quem abrisse o site em espanhol leria
     "Cliente desde setembro de 2026" no meio de uma tela inteira em
     espanhol — e o dicionário não teria como consertar, porque a frase
     muda de mês em mês. O `lang` do documento é o que o motor de
     idioma escreve quando traduz a página. */
  function idiomaLocal() {
    var I = window.PharmaFitIdioma;
    if (I && I.local) return I.local();
    /* reserva: o atributo do documento. Ele chega tarde na abertura
       (medido), mas é melhor que cravar português. */
    return document.documentElement.getAttribute('lang') || 'pt-BR';
  }

  function mes(v) {
    var d = new Date(v);
    if (isNaN(d)) return '';
    try {
      return d.toLocaleDateString(idiomaLocal(), { month: 'long', year: 'numeric' });
    } catch (e) {
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
  }

  function desenhaFicha(dados) {
    var caixa = document.querySelector('[data-ficha-conta]');
    if (!caixa) return;

    var favoritos = window.PharmaFitFavoritos ? window.PharmaFitFavoritos.ler().length : 0;
    var pedidos = dados.pedidos;

    /* OS NÚMEROS MORAM DENTRO DA FICHA, e não soltos.
       Antes eram dois cartões brancos no meio do nada; ali em cima
       eles viram o pé da ficha de quem você é, que é o lugar deles.
       Continuam sendo LINKS: número que não leva a nada é enfeite. */
    var numeros =
      '<div class="ficha-conta__numeros">' +
        '<a class="ficha-conta__num" href="pedidos.html">' +
          '<b>' + pedidos + '</b><span>' + (pedidos === 1 ? 'pedido' : 'pedidos') + '</span>' +
        '</a>' +
        '<a class="ficha-conta__num" href="favoritos.html">' +
          '<b>' + favoritos + '</b><span>' + (favoritos === 1 ? 'favorito' : 'favoritos') + '</span>' +
        '</a>' +
      '</div>';

    if (!dados.usuario) {
      /* SEM CONTA: um convite, não uma tela vazia. */
      caixa.innerHTML =
        '<div class="ficha-conta ficha-conta--convite">' +
          '<span class="ficha-conta__inicial ficha-conta__inicial--vazia" aria-hidden="true">' +
            '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M16 20v-1.5a4 4 0 0 0-8 0V20"/><circle cx="12" cy="8" r="3.4"/></svg>' +
          '</span>' +
          '<p class="ficha-conta__chamada">Entre na sua conta</p>' +
          '<p class="ficha-conta__ajuda">Seus pedidos e seus dados de entrega ficam guardados e ' +
            'aparecem em qualquer aparelho — no celular e no computador.</p>' +
          '<div class="ficha-conta__botoes">' +
            '<a class="btn btn--primary" href="entrar.html">Entrar</a>' +
            '<a class="btn btn--outline" href="criar-conta.html">Criar minha conta</a>' +
          '</div>' +
          /* E QUEM NÃO QUER CONTA TAMBÉM TEM SAÍDA.
             Comprar sem conta funciona e vai continuar funcionando;
             uma tela que só oferece "entrar" e "criar conta" parece
             exigir cadastro para comprar, e isso faz a pessoa fechar. */
          '<a class="linkish ficha-conta__semconta" href="produtos.html">' +
            'Só quero ver os produtos</a>' +
        '</div>' +
        (pedidos || favoritos ? numeros.replace('ficha-conta__numeros',
          'ficha-conta__numeros ficha-conta__numeros--solto') : '');
      return;
    }

    var u = dados.usuario;
    var nome = (u.user_metadata && u.user_metadata.nome) || Area.dados().nome || '';
    nome = String(nome).trim();
    var inicial = (nome || u.email || '?').charAt(0).toUpperCase();
    var desde = mes(u.created_at);

    caixa.innerHTML =
      '<div class="ficha-conta">' +
        '<div class="ficha-conta__topo">' +
          '<span class="ficha-conta__inicial" aria-hidden="true">' + esc(inicial) + '</span>' +
          '<span class="ficha-conta__quem">' +
            (nome ? '<b class="ficha-conta__nome">' + esc(nome) + '</b>' : '') +
            '<span class="ficha-conta__email">' + esc(u.email || '') + '</span>' +
            (desde ? '<span class="ficha-conta__desde">Cliente desde ' + esc(desde) + '</span>' : '') +
          '</span>' +
        '</div>' +
        numeros +
      '</div>';
  }

  /* AQUI HAVIA `desenhaAcoes`, que desenhava a linha "Trocar minha
     senha". Ele mandou tirar em 17/09/2026 e a função foi com ela:
     função sem tela é código que parece feito e não faz nada.
     `Conta.esqueciSenha()` continua onde estava e continua sendo usada
     pela tela de entrar — é de lá que a troca de senha acontece. */

  function pintarUltimosPedidos(lista, temConta) {
    var caixa = document.getElementById('ultimos-pedidos');
    if (!caixa) return;

    var todos = lista || Area.pedidos();
    var pedidos = todos.slice(0, 2);
    var titulo = document.querySelector('[data-titulo-pedidos]');
    var bloco = caixa.closest('.bloco-cliente');

    /* SEM CONTA E SEM PEDIDO, ESTE BLOCO NÃO TEM O QUE DIZER.
       Quem chega aqui pela aba "Conta" sem nunca ter comprado nem
       criado conta lia duas coisas: o convite para entrar e, embaixo,
       um cartão avisando que não havia pedido. O segundo não informa
       nada que o primeiro já não resolva — e o convite já tem o
       caminho para a loja. Com conta ele fica, porque ali a frase é
       útil: explica ONDE o pedido vai aparecer. */
    if (!pedidos.length && !temConta) {
      if (titulo) titulo.hidden = true;
      caixa.innerHTML = '';
      if (bloco) bloco.hidden = true;
      return;
    }
    if (bloco) bloco.hidden = false;

    if (!pedidos.length) {
      /* O VAZIO PASSOU A TER SAÍDA.
         Antes: "Você ainda não fez pedidos por aqui." e mais nada. A
         conta recém-criada é justamente a de quem tem zero pedidos —
         era o pior caso que eu estava entregando, e é o que ele viu.
         O título também sai: "Meus pedidos" em cima de um bloco que
         diz que não há pedido nenhum é repetição. */
      if (titulo) titulo.hidden = true;
      caixa.innerHTML =
        '<div class="vazio-conta">' +
          '<span class="vazio-conta__ico" aria-hidden="true">' +
            '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
              '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>' +
              '<path d="M3 4h2l2.4 10.2a1.5 1.5 0 0 0 1.5 1.2h9.2a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/></svg>' +
          '</span>' +
          '<p class="vazio-conta__titulo">Você ainda não fez nenhum pedido</p>' +
          '<p class="vazio-conta__texto">' +
            (temConta
              ? 'Quando fizer, ele aparece aqui com o andamento — e em qualquer aparelho onde você entrar.'
              : 'Escolha um produto e a equipe fecha com você pelo WhatsApp.') +
          '</p>' +
          '<a class="btn btn--primary" href="produtos.html">Ver os produtos</a>' +
        '</div>';
      return;
    }

    if (titulo) titulo.hidden = false;
    caixa.innerHTML = pedidos.map(function (p) {
      /* `quando` é o nome no aparelho; `criado_em` é o nome no banco.
         Sem os dois, o pedido que vem da conta apareceria sem data. */
      var quando = p.quando || p.criado_em;
      return '<div class="pedido pedido--enxuto">' +
        '<div class="pedido__topo">' +
          '<p class="pedido__nome">' + esc(p.produto) + '</p>' +
          (p.quantidade > 1 ? '<span class="pedido__qtd">' + p.quantidade + ' un.</span>' : '') +
        '</div>' +
        (quando ? '<p class="pedido__data">Enviado em ' + dataCurta(quando) + '</p>' : '') +
        '<button class="linkish linkish--repetir" type="button" data-pedido="' + esc(p.produto) +
          '" data-quantidade="' + Number(p.quantidade || 1) + '">Pedir de novo</button>' +
      '</div>';
    }).join('') +
    (todos.length > 2
      ? '<a class="linkish" href="pedidos.html">Ver todos os ' + todos.length + ' pedidos</a>'
      : '<a class="linkish" href="pedidos.html">Ver todos os pedidos</a>');
  }

  /* MONTA A PÁGINA. DUAS VEZES, E DE PROPÓSITO.
   *
   * A primeira passada usa só o que já está no aparelho: desenha na
   * hora, sem esperar a rede. A segunda chega quando a conta responde
   * e corrige o que era do aparelho.
   *
   * Por que corrigir: `Area.pedidos()` é a lista guardada NESTE
   * navegador. Enquanto "Meus pedidos" tinha aba própria na barra de
   * baixo isso passava. Desde 17/09/2026 a Conta é a ÚNICA porta para
   * os pedidos — e uma porta escrita "0 pedidos" para quem tem três é
   * uma porta que ninguém abre. Quem comprou no celular e abrisse no
   * computador leria "você ainda não fez nenhum pedido", que é mentira,
   * e concluiria que o pedido sumiu.
   *
   * Se a conta não responder, fica valendo o do aparelho — como era
   * antes. O `catch` vazio é de propósito: esta página pode falhar em
   * ficar bonita, não em abrir. */
  /* É DA EQUIPE? A pergunta vai para o BANCO, e ele responde só sobre
   * quem está perguntando (`pf_e_equipe()` é `security definer` e olha
   * `auth.uid()`). Nenhum cliente consegue descobrir com isso quem é da
   * equipe — nem a lista, nem o tamanho dela.
   *
   * O PADRÃO É NÃO, ao contrário do painel, onde o padrão é deixar
   * passar. Aqui quem paga o preço da dúvida é o lado certo: se a
   * pergunta falhar, a pessoa da equipe digita o endereço da gestão (e
   * ela sabe o endereço), enquanto um cliente jamais vê um atalho que
   * não é dele. */
  async function souDaEquipe() {
    var N = window.PharmaFitNuvem;
    if (!N || !N.cliente) return false;
    try {
      await N.pronto;
      var sb = N.cliente();
      if (!sb || !sb.rpc) return false;
      var r = await sb.rpc('pf_e_equipe');
      return !!(r && !r.error && r.data === true);
    } catch (e) {
      return false;
    }
  }

  function mostrarAtalhoDaGestao() {
    var atalho = document.querySelector('[data-painel-equipe]');
    if (!atalho) return;
    souDaEquipe().then(function (sim) {
      atalho.hidden = !sim;
    }).catch(function () { atalho.hidden = true; });
  }

  function montarConta() {
    if (!document.querySelector('[data-ficha-conta]')) return;

    var doAparelho = [];
    try { doAparelho = Area.pedidos() || []; } catch (e) { doAparelho = []; }

    /* primeira passada: o que o aparelho sabe, agora */
    desenhaFicha({ usuario: null, pedidos: doAparelho.length });
    pintarUltimosPedidos(doAparelho, false);

    var Conta = window.PharmaFitConta;
    if (!Conta) return;

    Conta.usuario().then(function (u) {
      if (!u) return;                      /* sem conta, o convite fica */

      desenhaFicha({ usuario: u, pedidos: doAparelho.length });
      saudacao(u);
      mostrarAtalhoDaGestao();

      if (!Conta.pedidos) return;
      return Conta.pedidos().then(function (r) {
        var lista = (r && r.de === 'conta' && r.lista) ? r.lista : doAparelho;
        desenhaFicha({ usuario: u, pedidos: lista.length });
        pintarUltimosPedidos(lista, true);
      });
    }).catch(function () {});
  }

  /* A SAUDAÇÃO ACEITA O NOME DA CONTA, e não só o do aparelho.
     Ela lia apenas `Area.dados().nome`. Quem entra num aparelho novo
     tem o nome na CONTA e ainda não no navegador: a página dizia
     "Conta" seca para uma pessoa cujo nome o site sabe. */
  function saudacao(usuario) {
    var el = document.getElementById('saudacao');
    if (!el) return;

    var nome = '';
    if (usuario && usuario.user_metadata && usuario.user_metadata.nome) {
      nome = String(usuario.user_metadata.nome);
    } else {
      try { nome = String(Area.dados().nome || ''); } catch (e) { nome = ''; }
    }
    nome = nome.trim().split(/\s+/)[0];

    var hora = new Date().getHours();
    var parte = hora < 12 ? 'Bom dia' : (hora < 18 ? 'Boa tarde' : 'Boa noite');

    el.textContent = nome ? parte + ', ' + nome : 'Conta';
  }

  /* ---------- eventos ---------- */

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-aplicar]')) {
      Protocolo.registrar();
      pintarProtocolo();
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
    pintarProtocolo();
    montarConta();
  });

  window.PharmaFitProtocolo = Protocolo;
})();
