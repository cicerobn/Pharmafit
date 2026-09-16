/* =========================================================
   PHARMA FIT — painel em formato de aplicativo: a moldura

   O que é igual em toda tela: o topo (menu, marca, sino), a
   gaveta que desliza pela esquerda e a barra de abas de baixo.

   Cada tela chama Moldura.montar({ aba: 'inicio' }) e recebe
   tudo pronto, já com o nome de quem entrou e a contagem de
   pedidos parados no sino.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Dados = window.PharmaFitDados;

  /* Ícones. Escritos uma vez aqui para a mesma forma não sair
     diferente de tela para tela. */
  var ICONE = {
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    sino: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    casa: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    caixa: '<path d="M21 8v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8"/><path d="M2 4h20v4H2z"/><path d="M10 12h4"/>',
    cubo: '<path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="M12 12 3 7M12 12l9-5M12 12v10"/>',
    gente: '<path d="M16 20v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="8" r="4"/>',
    pontos: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    dinheiro: '<path d="M3 7h18v10H3z"/><circle cx="12" cy="12" r="2.4"/>',
    engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    sair: '<path d="M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4"/><path d="M10 17l-5-5 5-5M5 12h10"/>',
    seta: '<path d="m9 5 7 7-7 7"/>',
    volta: '<path d="m14 5-7 7 7 7"/>',

    /* para a tela de Configurações e a de Relatórios */
    predio: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16"/><path d="M15 10h4a1 1 0 0 1 1 1v10"/><path d="M8 8h3M8 12h3M8 16h3"/><path d="M2 21h20"/>',
    moeda: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2a3 3 0 0 1-3-1.5"/>',
    escudo: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    tabela: '<path d="M3 5h18v14H3z"/><path d="M3 10h18M3 15h18M9 5v14M15 5v14"/>',
    calendario: '<path d="M4 6h16v14H4z"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    rosca: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6"/>'
  };

  function svg(nome, tamanho, grossura) {
    return '<svg width="' + (tamanho || 20) + '" height="' + (tamanho || 20) + '" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" ' +
      'stroke-width="' + (grossura || 1.7) + '" stroke-linecap="round" stroke-linejoin="round">' +
      ICONE[nome] + '</svg>';
  }

  /* As abas de baixo. Cinco espaços, e o do meio é o "+".
     Cada uma vai para uma tela que EXISTE — aba que não leva a
     nada é pior que aba que não existe. */
  var ABAS = [
    { id: 'inicio', rotulo: 'Início', icone: 'casa', href: 'inicio.html' },
    { id: 'pedidos', rotulo: 'Pedidos', icone: 'caixa', href: 'pedidos.html' },
    { id: 'novo', rotulo: '', icone: 'mais', acao: true },
    { id: 'produtos', rotulo: 'Produtos', icone: 'cubo', href: 'produtos.html' },
    { id: 'mais', rotulo: 'Mais', icone: 'pontos', href: 'mais.html' }
  ];

  /* A gaveta lista tudo, inclusive as telas do painel antigo que
     ainda não foram refeitas neste formato. Assim nada fica
     inalcançável enquanto o painel novo não está completo. */
  var GAVETA = [
    { secao: 'Painel' },
    { rotulo: 'Início', icone: 'casa', href: 'inicio.html', id: 'inicio' },
    { rotulo: 'Pedidos', icone: 'caixa', href: 'pedidos.html', id: 'pedidos' },
    { rotulo: 'Produtos', icone: 'cubo', href: 'produtos.html', id: 'produtos' },
    { rotulo: 'Clientes', icone: 'gente', href: 'clientes.html', id: 'clientes' },
    { secao: 'Números e ajustes' },
    { rotulo: 'Relatórios', icone: 'grafico', href: '../relatorios.html' },
    { rotulo: 'Gastos', icone: 'dinheiro', href: '../despesas.html' },
    { rotulo: 'Ajustes', icone: 'engrenagem', href: '../ajustes.html' }
  ];

  var Moldura = {
    svg: svg,
    ICONE: ICONE,

    /**
     * Desenha topo, gaveta e barra de abas na tela atual.
     * @param {{aba:string, tituloSino?:string}} opcoes
     */
    montar: async function (opcoes) {
      var op = opcoes || {};
      var abaAtual = op.aba || '';

      var app = document.querySelector('.app');
      if (!app) return null;

      /* ---------- topo ---------- */
      var topo = document.createElement('header');
      topo.className = 'topo';
      topo.innerHTML =
        '<button class="topo__botao" type="button" data-abrir-gaveta ' +
          'aria-label="Abrir o menu" aria-expanded="false">' + svg('menu', 22, 1.8) + '</button>' +
        '<a class="topo__marca" href="inicio.html">' +
          '<img src="../../assets/img/logo-pf-marca.png" alt="">' +
          '<span>PHARMA FIT</span>' +
        '</a>' +
        '<a class="topo__botao sino" href="pedidos.html?ver=pendentes" ' +
          'aria-label="Pedidos esperando">' + svg('sino', 21, 1.7) +
          '<span class="sino__conta" data-sino hidden>0</span>' +
        '</a>';
      app.insertBefore(topo, app.firstChild);

      /* ---------- gaveta e véu ---------- */
      var veu = document.createElement('div');
      veu.className = 'veu';
      veu.setAttribute('data-veu', '');

      var gaveta = document.createElement('nav');
      gaveta.className = 'gaveta';
      gaveta.setAttribute('aria-label', 'Menu do painel');
      gaveta.setAttribute('aria-hidden', 'true');

      var itens = GAVETA.map(function (i) {
        if (i.secao) return '<li class="gaveta__secao">' + i.secao + '</li>';
        var ativo = i.id && i.id === abaAtual ? ' is-ativo' : '';
        return '<li><a class="gaveta__item' + ativo + '" href="' + i.href + '"' +
          (ativo ? ' aria-current="page"' : '') + '>' +
          svg(i.icone, 19, 1.7) + '<span>' + i.rotulo + '</span></a></li>';
      }).join('');

      gaveta.innerHTML =
        '<div class="gaveta__topo">' +
          '<img src="../../assets/img/logo-pf-marca.png" alt="">' +
          '<span class="gaveta__marca">PHARMA FIT</span>' +
        '</div>' +
        '<div class="gaveta__quem">' +
          '<p class="gaveta__ola">Entrou como</p>' +
          '<p class="gaveta__nome" data-quem>…</p>' +
        '</div>' +
        '<ul class="gaveta__lista">' + itens + '</ul>' +
        '<div class="gaveta__pe">' +
          '<button class="gaveta__sair" type="button" data-sair>' +
            svg('sair', 18, 1.7) + '<span>Sair da conta</span>' +
          '</button>' +
        '</div>';

      document.body.appendChild(veu);
      document.body.appendChild(gaveta);

      /* ---------- barra de abas ---------- */
      var barra = document.createElement('nav');
      barra.className = 'barra';
      barra.setAttribute('aria-label', 'Seções do painel');
      barra.innerHTML = '<div class="barra__dentro">' + ABAS.map(function (a) {
        if (a.acao) {
          return '<div class="tab tab--mais">' +
            '<button class="mais-botao" type="button" data-novo ' +
              'aria-label="Novo">' + svg('mais', 24, 2.2) + '</button></div>';
        }
        var ativo = a.id === abaAtual ? ' is-ativa' : '';
        return '<a class="tab' + ativo + '" href="' + a.href + '"' +
          (ativo ? ' aria-current="page"' : '') + '>' +
          svg(a.icone, 21, 1.7) + '<span>' + a.rotulo + '</span></a>';
      }).join('') + '</div>';
      document.body.appendChild(barra);

      ligarGaveta(gaveta, veu);

      /* ---------- quem entrou ---------- */
      var user = null;
      try { user = await Auth.usuario(); } catch (e) { user = null; }

      var nome = (user && (user.nome || user.email)) || 'você';
      /* Só o primeiro nome na saudação: "Olá, Brian" e não o e-mail
         inteiro, que é feio e não diz nada a mais. */
      var primeiro = String(nome).split(/[@\s]/)[0];
      primeiro = primeiro.charAt(0).toUpperCase() + primeiro.slice(1);

      gaveta.querySelector('[data-quem]').textContent = (user && user.email) || nome;
      document.querySelectorAll('[data-primeiro-nome]').forEach(function (e) {
        e.textContent = primeiro;
      });

      gaveta.querySelector('[data-sair]').addEventListener('click', async function () {
        try { await Auth.sair(); } catch (e) {}
        location.replace('../login.html');
      });

      return { primeiro: primeiro, user: user };
    },

    /** Põe no sino a quantidade de pedidos esperando alguma ação. */
    marcarSino: function (pedidos) {
      var alvo = document.querySelector('[data-sino]');
      if (!alvo) return;
      var parados = (pedidos || []).filter(function (p) {
        return String(p.status || 'pendente').toLowerCase() === 'pendente';
      }).length;

      alvo.hidden = parados === 0;
      alvo.textContent = parados > 99 ? '99+' : String(parados);
    },

    /** O "+" muda de função conforme a tela. */
    aoNovo: function (fn) {
      var b = document.querySelector('[data-novo]');
      if (b) b.addEventListener('click', fn);
    },

    /** Faz os blocos entrarem em cascata. */
    animarEntrada: function (seletor, raiz) {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var alvos = (raiz || document).querySelectorAll(seletor);
      Array.prototype.forEach.call(alvos, function (e, i) {
        e.style.setProperty('--i', String(Math.min(i, 10)));
        e.classList.add('entra');
      });
    },

    /** Carrega pedidos e produtos, já cuidando do sino. */
    dados: async function () {
      var r = await Dados.listarPainel();
      Moldura.marcarSino(r.pedidos);
      return r;
    }
  };

  /* ---------------------------------------------------------
     A gaveta
     --------------------------------------------------------- */

  function ligarGaveta(gaveta, veu) {
    var botao = document.querySelector('[data-abrir-gaveta]');
    var aberta = false;

    function abrir() {
      aberta = true;
      gaveta.classList.add('is-aberta');
      veu.classList.add('is-aberto');
      gaveta.setAttribute('aria-hidden', 'false');
      if (botao) botao.setAttribute('aria-expanded', 'true');
      /* Trava o fundo: com a gaveta aberta, rolar a página atrás dá a
         impressão de que o toque errou o alvo. */
      document.body.classList.add('travado');
      /* O foco vai para dentro, senão quem usa teclado continua
         navegando na página escondida atrás do véu. */
      var primeiro = gaveta.querySelector('.gaveta__item');
      if (primeiro) primeiro.focus({ preventScroll: true });
    }

    function fechar() {
      aberta = false;
      gaveta.classList.remove('is-aberta');
      veu.classList.remove('is-aberto');
      gaveta.setAttribute('aria-hidden', 'true');
      if (botao) botao.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('travado');
      if (botao) botao.focus({ preventScroll: true });
    }

    if (botao) botao.addEventListener('click', function () { aberta ? fechar() : abrir(); });
    veu.addEventListener('click', fechar);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && aberta) fechar();
    });

    /* Arrastar para a esquerda fecha. É o gesto que a mão espera, e
       sem ele a gaveta parece presa no celular. */
    var x0 = null;
    gaveta.addEventListener('touchstart', function (e) {
      x0 = e.touches[0].clientX;
    }, { passive: true });
    gaveta.addEventListener('touchmove', function (e) {
      if (x0 === null) return;
      if (x0 - e.touches[0].clientX > 60) { fechar(); x0 = null; }
    }, { passive: true });
  }

  window.PharmaFitMoldura = Moldura;
})();
