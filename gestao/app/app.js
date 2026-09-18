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
    /* A LOJA: o toldo e a porta. É o ícone de "ver o site" — pedido do
       Brian em 18/09/2026, "Deixe icone pra voltar pro site do painel
       de gestao pro site". Vitrine desenhada diz "a loja" mais rápido
       que uma seta ou um globo, que podem ser qualquer coisa. */
    loja: '<path d="M4.5 9.5V20h15V9.5"/><path d="M3 9.5 5 4h14l2 5.5z"/>' +
          '<path d="M9.8 20v-5.4h4.4V20"/>',

    /* para a tela de Configurações e a de Relatórios */
    predio: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16"/><path d="M15 10h4a1 1 0 0 1 1 1v10"/><path d="M8 8h3M8 12h3M8 16h3"/><path d="M2 21h20"/>',
    moeda: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2a3 3 0 0 1-3-1.5"/>',
    escudo: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    tabela: '<path d="M3 5h18v14H3z"/><path d="M3 10h18M3 15h18M9 5v14M15 5v14"/>',
    calendario: '<path d="M4 6h16v14H4z"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    rosca: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6"/>',
    /* WhatsApp: a bolha com o rabicho e o fone dentro. Desenhado em
       traço, como todos os outros daqui, para herdar a cor e a grossura
       do lugar onde for usado — ícone de marca colado em cor fixa
       aparece errado no botão escuro e no claro. */
    zap: '<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.3A8.5 8.5 0 1 1 20.5 11.6Z"/>' +
         '<path d="M9.2 9.1c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.4.5c-.1.2-.2.3 0 .6a6 6 0 0 0 2.4 2.2c.3.1.4 0 .6-.1l.5-.5c.2-.2.4-.2.6-.1l1.6.8c.3.2.3.3.3.5v.5c0 .4-.4.8-.9.9-1.3.2-3-.4-4.6-1.8a9.2 9.2 0 0 1-2.5-3.5c-.4-1-.4-1.9-.1-2.6Z"/>'
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
  /* UM NOME, UM DESTINO.
   *
   * Brian, 18/09/2026: "melhore o painel, ele esta confuso, deixe ele
   * util, simples de usar e funcional". Medido antes de mexer, o mapa
   * do painel tinha isto:
   *
   *   "Relatórios" na gaveta      -> tela ANTIGA
   *   "Relatórios" no Mais        -> tela do aplicativo   (mesmo nome, dois lugares)
   *   "Ajustes" na gaveta         -> tela ANTIGA
   *   "Configurações" no Mais     -> tela do aplicativo   (duas telas de ajuste)
   *   "Pedidos" na barra          -> tela do aplicativo
   *   "Fila de pedidos" no Mais   -> tela ANTIGA          (duas filas do mesmo pedido)
   *   "Clientes" na gaveta e no Mais                      (repetido)
   *   "Dashboard" no Mais         -> terceira visão geral, além do Início
   *
   * Duas gerações de painel no mesmo menu, com nomes iguais levando a
   * lugares diferentes. Não era falta de tela: era excesso de caminho.
   * Agora a gaveta é o mapa do aplicativo, cada nome aparece uma vez, e
   * o "Ajustes" velho saiu (ele também não gostou dele: "tire isso ai
   * de ajustes, nao gostei").
   *
   * "Ver o site" fecha o círculo: o painel leva para a loja, e a Conta
   * da loja leva para o painel. Antes, do painel não havia volta. */
  var GAVETA = [
    { secao: 'Painel' },
    { rotulo: 'Início', icone: 'casa', href: 'inicio.html', id: 'inicio' },
    { rotulo: 'Pedidos', icone: 'caixa', href: 'pedidos.html', id: 'pedidos' },
    { rotulo: 'Produtos', icone: 'cubo', href: 'produtos.html', id: 'produtos' },
    { rotulo: 'Clientes', icone: 'gente', href: 'clientes.html', id: 'clientes' },
    { secao: 'Números e ajustes' },
    { rotulo: 'Relatórios', icone: 'grafico', href: 'relatorios.html' },
    { rotulo: 'Gastos', icone: 'dinheiro', href: '../despesas.html' },
    { rotulo: 'Configurações', icone: 'engrenagem', href: 'configuracoes.html' },
    { secao: 'A loja' },
    { rotulo: 'Ver o site', icone: 'loja', href: '../../index.html' }
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
        /* A MARCA DO PAINEL, refeita em 18/09/2026 a pedido do Brian
         * ("melhore a logo aqui", com o recorte do topo).
         * O que estava errado, medido: o desenho tinha 26px e o nome
         * vinha em serifa de 16px — o texto pesava mais que a marca, e
         * o conjunto ficava pequeno e solto no meio de uma barra de
         * 58px. Agora o desenho tem 30, o nome usa o MESMO tratamento
         * do site (sem serifa, 600, bem espaçado) e ganha embaixo a
         * palavra GESTÃO: o painel deixa de parecer o site e diz, na
         * primeira olhada, que ali é os bastidores. */
        '<a class="topo__marca" href="inicio.html" aria-label="Pharma Fit — painel de gestão">' +
          '<img src="../../assets/img/logo-pf-marca.png" alt="" width="30" height="30">' +
          '<span class="topo__marca-texto">' +
            '<span class="topo__marca-nome">PHARMA FIT</span>' +
            '<span class="topo__marca-tag">GESTÃO</span>' +
          '</span>' +
        '</a>' +
        /* O CAMINHO DE VOLTA PARA A LOJA, sempre à mão — pedido do
         * Brian: "Deixe icone pra voltar pro site do painel de gestao
         * pro site". Ele fica no topo, e não só na gaveta, porque é o
         * caminho que a equipe faz o dia inteiro: olhar o pedido aqui e
         * conferir o produto lá. */
        '<a class="topo__botao" href="../../index.html" ' +
          'aria-label="Ver o site da loja" data-ver-site>' + svg('loja', 21, 1.7) + '</a>' +
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

    /* -------------------------------------------------------
       QUEM ESTÁ OLHANDO: dono ou atendente

       `pf_equipe.papel` diz isso, e `pf_papel()` responde no
       banco. Duas respostas possíveis hoje:

         ceo       → vê preço de compra, lucro e margem
         atendente → vê o pedido; não vê dinheiro de dono

       O PADRÃO QUANDO NÃO DÁ PARA SABER É `ceo`, e isso é
       escolha, não descuido: se a resposta falhar por rede ou
       por o banco ainda não ter a coluna, quem paga o preço de
       "esconder por precaução" é o dono, que abre o painel e
       não acha os números dele. A proteção que vale contra
       curiosidade técnica é a do BANCO; esta aqui é a tela.

       Lido uma vez por carregamento de página e guardado: são
       várias telas perguntando a mesma coisa.
       ------------------------------------------------------- */
    papel: async function () {
      if (papelLido) return papelLido;
      if (papelPedido) return papelPedido;

      papelPedido = (async function () {
        var sb = Auth && Auth.cliente ? Auth.cliente() : null;
        if (!sb) {
          /* sem banco é modo demonstração: mostra tudo, senão o painel
             de demonstração esconderia justamente o que ele demonstra */
          papelLido = 'ceo';
          return papelLido;
        }
        try {
          var r = await sb.rpc('pf_papel');
          papelLido = (r && !r.error && r.data) ? String(r.data) : 'ceo';
        } catch (e) {
          papelLido = 'ceo';
        }
        return papelLido;
      })();

      return papelPedido;
    },

    /** Atalho: este login pode ver preço de compra, lucro e margem? */
    podeVerCusto: async function () {
      return (await Moldura.papel()) !== 'atendente';
    },

    /** Carrega pedidos e produtos, já cuidando do sino. */
    dados: async function () {
      var r = await Dados.listarPainel();
      Moldura.marcarSino(r.pedidos);
      Moldura.avisarSemBanco(r.exemplo);
      return r;
    },

    /* -------------------------------------------------------
       QUANDO O PAINEL NÃO ESTÁ LIGADO AO BANCO, ELE DIZ.

       A camada de dados já devolvia essa informação (`exemplo`),
       e o painel novo simplesmente não a usava: a tela ficava
       igualzinha, mostrando o que está guardado neste aparelho
       como se fosse o banco. Duas consequências, as duas ruins:

         · venda feita no site NÃO aparece, e ninguém entende por
           quê — o dono conclui que o site não está vendendo;
         · o que ele digitar aqui fica só neste aparelho, e
           desaparece no outro.

       Em 17/09/2026 isso apareceu junto com os sete clientes
       inventados: o Brian viu seis pessoas que não existem e
       nenhuma das vendas de verdade. Tela que esconde de qual
       fonte o dado veio é pior que tela vazia.
       ------------------------------------------------------- */
    avisarSemBanco: function (semBanco) {
      var jaTem = document.querySelector('[data-aviso-sem-banco]');

      if (!semBanco) {
        if (jaTem) jaTem.remove();
        return;
      }
      if (jaTem) return;

      var onde = document.querySelector('.pagina') || document.querySelector('.app');
      if (!onde) return;

      var aviso = document.createElement('div');
      aviso.className = 'aviso-banco';
      aviso.setAttribute('data-aviso-sem-banco', '');
      aviso.setAttribute('role', 'status');
      aviso.innerHTML =
        '<p class="aviso-banco__titulo">Este painel não está ligado ao banco de dados</p>' +
        '<p class="aviso-banco__texto">O que aparece nas telas é só o que está guardado ' +
        'neste aparelho. As vendas feitas no site <b>não chegam aqui</b>, e o que você ' +
        'digitar fica só neste navegador.</p>' +
        '<a class="aviso-banco__acao" href="configuracoes.html">Ligar ao banco</a>';

      onde.parentNode.insertBefore(aviso, onde.nextSibling);
    },

    /* -------------------------------------------------------
       O FOCO DAS JANELAS (a folha e a gaveta)

       Isto fica aqui, e não dentro de cada tela, porque cada
       tela que abre uma janela precisa exatamente das mesmas
       três coisas — e quando estava espalhado, duas telas
       fizeram de dois jeitos diferentes: o "editar produto"
       levava o foco para dentro, a "ficha do cliente" não
       levava para lugar nenhum. Uma janela abria certo e a
       outra errado pelo mesmo motivo de sempre: código igual
       escrito duas vezes envelhece diferente.
       ------------------------------------------------------- */
    foco: {
      /** Antes de abrir: lembra quem estava com o foco.
       *
       *  `reserva` (opcional) é para onde o foco vai quando quem abriu
       *  não puder mais receber foco na hora de fechar. Aceita seletor
       *  em texto, resolvido só no fechamento — a lista pode ter sido
       *  redesenhada com a janela aberta, e aí o elemento antigo já não
       *  é o que está na tela.
       *
       *  POR QUE ISTO EXISTE (18/09/2026): abrindo a folha de editar
       *  produto PELO MENU das três bolinhas, quem estava com o foco era
       *  o botão "Editar" DE DENTRO do menu. O menu fecha antes da folha
       *  abrir, e um elemento dentro de um painel fechado não recebe
       *  foco: `focus()` não faz nada, sem erro nenhum, e o foco cai no
       *  `body`. Quem usa teclado fechava a folha do sétimo produto e
       *  voltava para o começo da página. Medido por `teclado-folha`. */
      guardar: function (reserva) {
        var a = document.activeElement;
        quemAbriu = a && a !== document.body ? a : null;
        quemAbriuReserva = reserva || null;
      },

      /** Ao abrir: leva o foco para dentro da janela.
       *  Sem `alvo`, o foco vai para a própria janela — assim o
       *  leitor de tela anuncia o título dela antes de tudo. */
      entrar: function (janela, alvo) {
        if (!janela) return;
        if (alvo && alvo.focus) { alvo.focus({ preventScroll: true }); return; }
        if (!janela.hasAttribute('tabindex')) janela.setAttribute('tabindex', '-1');
        janela.focus({ preventScroll: true });
      },

      /** Ao fechar: devolve o foco para quem abriu. Sem isto o
       *  teclado recomeça do topo da página, e quem fechou a
       *  ficha do décimo cliente tem de descer tudo de novo. */
      devolver: function () {
        if (!tentarFocar(quemAbriu)) {
          var r = typeof quemAbriuReserva === 'string'
            ? document.querySelector(quemAbriuReserva)
            : quemAbriuReserva;
          tentarFocar(r);
        }
        quemAbriu = null;
        quemAbriuReserva = null;
      }
    }
  };

  /* ---------------------------------------------------------
     O Tab preso dentro da janela aberta

     Medido antes de escrever: com a ficha do cliente aberta,
     11 das 14 paradas do Tab caíam na página ATRÁS do véu —
     o dedo não alcança o que está atrás, mas o Tab alcançava.
     Vale para a folha e para a gaveta, e vale para qualquer
     janela futura que use a mesma classe.
     --------------------------------------------------------- */

  var FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), ' +
                 'select:not([disabled]), textarea:not([disabled]), ' +
                 '[tabindex]:not([tabindex="-1"])';
  var quemAbriu = null;
  var quemAbriuReserva = null;

  /* ESTAR NO DOCUMENTO NÃO É PODER RECEBER FOCO, e adivinhar POR QUE um
     elemento não recebe é onde eu errei duas vezes hoje: um botão dentro
     de um painel fechado continua no documento, ainda TEM caixa (a folha
     fechada só desce com `transform`) e mesmo assim `focus()` nele não
     faz nada — silenciosamente, porque a folha fechada leva
     `visibility:hidden`, e `getClientRects()` não sabe disso.
     Então eu paro de prever e MEÇO: tento focar e pergunto ao navegador
     quem ficou com o foco. Se não foi quem eu pedi, a tentativa falhou,
     qualquer que seja o motivo. */
  function tentarFocar(el) {
    if (!(el && el.focus && document.contains(el))) return false;
    try { el.focus({ preventScroll: true }); } catch (e) { return false; }
    return document.activeElement === el;
  }

  /* o papel de quem entrou, e a promessa em voo enquanto ele é lido —
     sem ela, três telas perguntando ao mesmo tempo fariam três
     consultas iguais */
  var papelLido = null;
  var papelPedido = null;

  function janelaDeCima() {
    var lista = document.querySelectorAll('.folha.is-aberta, .gaveta.is-aberta');
    return lista.length ? lista[lista.length - 1] : null;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var janela = janelaDeCima();
    if (!janela) return;

    var itens = [].slice.call(janela.querySelectorAll(FOCAVEIS)).filter(function (el) {
      return el.offsetParent !== null && !el.hidden;
    });
    if (!itens.length) return;

    var primeiro = itens[0];
    var ultimo = itens[itens.length - 1];
    var fora = !janela.contains(document.activeElement);

    if (e.shiftKey && (fora || document.activeElement === primeiro)) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && (fora || document.activeElement === ultimo)) {
      e.preventDefault(); primeiro.focus();
    }
  });

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
