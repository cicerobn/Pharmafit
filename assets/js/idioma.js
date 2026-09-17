/* =========================================================
   PHARMA FIT — português do Brasil e espanhol do Paraguai

   O Brian vende para os dois lados da fronteira, então a loja
   precisa falar as duas línguas. As bandeiras ficam na barra
   lateral, com animação ao trocar.

   COMO A TRADUÇÃO FUNCIONA: POR TEXTO EXATO

   O dicionário é uma lista de pares "frase em português" →
   "frase em espanhol". Este arquivo percorre a tela e troca só o
   que está na lista.

   Isso é de propósito, e é a parte importante do desenho: nome de
   produto, marca e dose NÃO estão no dicionário, então eles nunca
   são traduzidos por acidente. "Tirzec Pen 15 mg" continua
   "Tirzec Pen 15 mg" nas duas línguas, porque é o nome da caixa
   que o cliente vai receber. Um tradutor automático escreveria
   "Bolígrafo Tirzec" e o cliente pediria a coisa errada.

   O outro jeito — marcar cada pedaço de texto com um código no
   HTML — daria o mesmo resultado e obrigaria a mexer nas 16
   páginas para acrescentar uma frase. Assim, acrescentar frase é
   acrescentar uma linha no dicionário.

   O TEXTO QUE O PROGRAMA ESCREVE DEPOIS

   Boa parte da tela não está no HTML: a vitrine, o carrinho, os
   recados de erro — tudo isso o JavaScript escreve na hora. Por
   isso existe o observador: quando algo novo aparece na tela, ele
   traduz o que apareceu. Sem ele, a pessoa trocaria para espanhol
   e o carrinho continuaria em português.

   POR QUE A ESCOLHA NÃO VAI PARA O SERVIDOR

   Fica no aparelho (localStorage). Idioma é preferência de quem
   está olhando, não dado de cadastro — e assim funciona antes de
   a pessoa ter conta, que é quando ela mais precisa entender o
   site.
   ========================================================= */
(function () {
  'use strict';

  var CHAVE = 'pharmafit_idioma';
  var PADRAO = 'pt';

  var IDIOMAS = {
    pt: { nome: 'Português', lang: 'pt-BR', bandeira: 'br' },
    es: { nome: 'Español',   lang: 'es-PY', bandeira: 'py' }
  };

  /* As bandeiras são desenhadas aqui, e não em arquivo de imagem:
     são duas, simples, e assim não há mais um pedido de rede para
     a barra lateral abrir. */
  var BANDEIRA = {
    br: '<svg viewBox="0 0 28 20" aria-hidden="true">' +
          '<rect width="28" height="20" rx="2.5" fill="#009b3a"/>' +
          '<path d="M14 2.6 25.4 10 14 17.4 2.6 10z" fill="#fedf00"/>' +
          '<circle cx="14" cy="10" r="4.3" fill="#002776"/>' +
          '<path d="M9.9 8.7a10 10 0 0 1 8.2 2.2" stroke="#fff" stroke-width="1.1" fill="none"/>' +
        '</svg>',
    py: '<svg viewBox="0 0 28 20" aria-hidden="true">' +
          '<rect width="28" height="20" rx="2.5" fill="#fff"/>' +
          '<path d="M0 2.5A2.5 2.5 0 0 1 2.5 0h23A2.5 2.5 0 0 1 28 2.5V6.7H0z" fill="#d52b1e"/>' +
          '<path d="M0 13.3h28v4.2A2.5 2.5 0 0 1 25.5 20h-23A2.5 2.5 0 0 1 0 17.5z" fill="#0038a8"/>' +
          '<circle cx="14" cy="10" r="2.4" fill="none" stroke="#0038a8" stroke-width=".8"/>' +
          '<circle cx="14" cy="10" r="1.2" fill="#fedf00"/>' +
        '</svg>'
  };

  var dicionario = window.PHARMAFIT_ES || {};

  /* OS PADRÕES, para frase com número ou nome dentro.
   *
   * "ou em até 3x sem juros de R$ 366,33" nunca casaria por texto
   * exato: o valor muda a cada produto. O mesmo vale para "Bom dia,
   * Brian" e "Pergunta 1 de 3".
   *
   * Cada padrão guarda o que varia em `$1`, `$2`… e devolve no lugar
   * certo — que em espanhol às vezes é outro lugar. */
  var PADROES = window.PHARMAFIT_ES_PADROES || [];

  /* NÃO EXISTE CAMINHO DE VOLTA, E ISSO É DE PROPÓSITO.
   *
   * A primeira versão montava um dicionário espanhol → português
   * para desfazer a tradução na tela. Duas coisas estavam erradas:
   *
   *   · os padrões guardam a busca como expressão e a saída como
   *     texto. Para desfazer, o motor usaria o TEXTO como expressão
   *     de busca — e texto não tem `.test()`. Trocar de volta para
   *     português daria erro;
   *   · duas frases diferentes em português podem virar a mesma em
   *     espanhol. Desfazendo, uma delas voltaria errada.
   *
   * Então trocar de língua guarda a escolha e RECARREGA a página. Ela
   * nasce em português no HTML, e o motor traduz na abertura se a
   * escolha for espanhol. Um caminho só, e certo por construção — em
   * vez de dois caminhos, um deles quebrado.
   */

  var atual = ler();
  var observador = null;

  function ler() {
    try {
      var v = localStorage.getItem(CHAVE);
      return IDIOMAS[v] ? v : PADRAO;
    } catch (e) { return PADRAO; }
  }

  function guardar(id) {
    try { localStorage.setItem(CHAVE, id); } catch (e) {}
  }

  /* ---------------- traduzir ---------------- */

  var ATRIBUTOS = ['placeholder', 'aria-label', 'title', 'alt', 'value'];

  /* Onde NÃO se entra: script e estilo não são texto de tela, e
     `data-nao-traduzir` é a saída de emergência para um bloco que
     precise ficar como está. */
  var PROIBIDO = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };

  function frase(texto) {
    var limpo = texto.replace(/\s+/g, ' ').trim();
    if (!limpo) return null;
    var achou = dicionario[limpo];

    /* Texto exato primeiro; padrão só quando não houver exato. A
       ordem importa: padrão é mais largo e engoliria uma frase que
       tem tradução própria. */
    if (!achou) {
      for (var i = 0; i < PADROES.length; i++) {
        var pd = PADROES[i];
        if (pd.pt.test(limpo)) {
          achou = limpo.replace(pd.pt, pd.es);
          break;
        }
      }
    }
    if (!achou) return null;
    /* Devolve com o espaço da borda preservado: "Início " sem o
       espaço encostaria no ícone do lado. */
    var antes = texto.match(/^\s*/)[0];
    var depois = texto.match(/\s*$/)[0];
    return antes + achou + depois;
  }

  function traduzirNo(raiz) {
    if (!raiz) return;

    /* texto */
    var caminhador = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: function (no) {
        var pai = no.parentElement;
        if (!pai) return NodeFilter.FILTER_REJECT;
        if (PROIBIDO[pai.tagName]) return NodeFilter.FILTER_REJECT;
        if (pai.closest('[data-nao-traduzir]')) return NodeFilter.FILTER_REJECT;
        return no.nodeValue && no.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nos = [];
    var n;
    while ((n = caminhador.nextNode())) nos.push(n);
    nos.forEach(function (no) {
      var novo = frase(no.nodeValue);
      if (novo !== null) no.nodeValue = novo;
    });

    /* atributos que aparecem na tela */
    var elementos = raiz.querySelectorAll ? raiz.querySelectorAll('*') : [];
    var lista = [].slice.call(elementos);
    if (raiz.nodeType === 1) lista.unshift(raiz);
    lista.forEach(function (el) {
      if (el.closest && el.closest('[data-nao-traduzir]')) return;
      ATRIBUTOS.forEach(function (a) {
        /* `value` só de botão: em campo de texto ele é o que a
           pessoa digitou, e trocar isso seria apagar o que ela
           escreveu. */
        if (a === 'value' && !(el.tagName === 'BUTTON' ||
            (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type)))) return;
        if (!el.hasAttribute(a)) return;
        var novo = frase(el.getAttribute(a));
        if (novo !== null) el.setAttribute(a, novo);
      });
    });
  }

  /* ---------------- o observador ---------------- */

  function observar(para) {
    if (observador) observador.disconnect();
    /* Em português não há o que observar: a página já nasce assim. */
    if (para === 'pt') { observador = null; return; }

    /* O que vigiar. `attributes` está aqui porque faltar ele foi um
       furo de verdade: o coração dos favoritos troca o `aria-label`
       para "Remover dos favoritos" DEPOIS da tradução, e a barra do
       topo escreve "Minha conta, Brian" no `aria-label` quando o
       nome chega. Vigiando só nó novo, esses dois ficavam em
       português com o site em espanhol — e ninguém veria, porque
       `aria-label` é o texto que o leitor de tela fala. */
    var OLHAR = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ATRIBUTOS
    };

    observador = new MutationObserver(function (mudancas) {
      /* Desligado enquanto traduz, senão a própria tradução entra
         como mudança e o observador chama a si mesmo sem parar. */
      observador.disconnect();
      mudancas.forEach(function (m) {
        if (m.type === 'attributes') {
          if (m.target.closest && m.target.closest('[data-nao-traduzir]')) return;
          var v = m.target.getAttribute(m.attributeName);
          if (v == null) return;
          var t2 = frase(v);
          if (t2 !== null) m.target.setAttribute(m.attributeName, t2);
          return;
        }
        [].slice.call(m.addedNodes).forEach(function (no) {
          if (no.nodeType === 3) {
            var novo = frase(no.nodeValue);
            if (novo !== null) no.nodeValue = novo;
          } else if (no.nodeType === 1) {
            traduzirNo(no);
          }
        });
      });
      observador.observe(document.body, OLHAR);
    });
    observador.observe(document.body, OLHAR);
  }

  /* ---------------- aplicar ---------------- */

  function aplicar(id) {
    if (!IDIOMAS[id]) id = PADRAO;
    atual = id;
    guardar(id);

    document.documentElement.lang = IDIOMAS[id].lang;
    document.documentElement.setAttribute('data-idioma', id);

    if (id === 'es') {
      traduzirNo(document.body);
      /* O TÍTULO DA ABA E O TEXTO DE COMPARTILHAR também.
       *
       * Eles moram no `<head>`, e `traduzirNo(document.body)` nunca
       * chegava lá: o site virava espanhol e a aba continuava
       * "Pharma Fit — Saúde, performance e bem-estar". Pior no
       * `og:`, que é o que o WhatsApp mostra quando o cliente manda
       * o link — e mandar link é o jeito como este negócio vende. */
      var tit = frase(document.title);
      if (tit !== null) document.title = tit.trim();

      document.querySelectorAll(
        'meta[name="description"],meta[property="og:title"],' +
        'meta[property="og:description"],meta[property="og:locale"]'
      ).forEach(function (m) {
        if (m.getAttribute('property') === 'og:locale') {
          m.setAttribute('content', 'es_PY');
          return;
        }
        var v = frase(m.getAttribute('content') || '');
        if (v !== null) m.setAttribute('content', v.trim());
      });
    }
    observar(id);
    pintarBotoes();
  }

  /**
   * Trocar de língua: guarda a escolha, dá o passo da animação e
   * recarrega a página.
   *
   * O recarregamento é o que garante a tradução certa nos dois
   * sentidos, e está explicado lá em cima, onde o caminho de volta
   * deixou de existir.
   */
  function trocar(id) {
    if (!IDIOMAS[id] || id === atual) return;
    guardar(id);
    atual = id;
    /* A pílula desliza ANTES de recarregar: o toque tem de responder
       na hora, senão parece que não funcionou. */
    pintarBotoes();

    var espera = piscar() ? 260 : 0;
    setTimeout(function () { location.reload(); }, espera);
  }

  /* A animação de troca: o conteúdo dá um passo curto e volta, para
     o olho perceber que a tela mudou de língua. Devolve se animou,
     para a espera antes de recarregar ser a real — e não um número
     chutado que deixaria a tela parada quem desligou animação. */
  function piscar() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    var alvo = document.querySelector('.shell') || document.body;
    alvo.classList.remove('is-trocando-idioma');
    /* força o navegador a recomeçar a animação */
    void alvo.offsetWidth;
    alvo.classList.add('is-trocando-idioma');
    return true;
  }

  /* ---------------- os botões na barra lateral ---------------- */

  function montarBotoes() {
    var gaveta = document.querySelector('.drawer__panel');
    if (!gaveta || gaveta.querySelector('.idiomas')) return;

    var caixa = document.createElement('div');
    caixa.className = 'idiomas';
    caixa.setAttribute('role', 'group');
    /* O RÓTULO do grupo se traduz; os NOMES das línguas não.
     *
     * A primeira versão pôs `data-nao-traduzir` no grupo inteiro, e
     * com isso o rótulo "Idioma do site" ficava em português com o
     * site em espanhol. Ninguém veria com o olho: `aria-label` é o
     * que o leitor de tela fala. Foi a conferência de cobertura que
     * achou — a última frase que faltava, das 1.415 da tela.
     *
     * Por que os nomes não: "Português" e "Español" se escrevem cada
     * um na sua própria língua, sempre. É assim que a pessoa acha a
     * dela sem saber ler a outra. */
    /* `frase()` traduz sempre, porque só existe um sentido — então
       quem decide se traduz aqui é a língua escolhida. Sem este
       `if`, o rótulo sairia em espanhol num site em português. */
    var rotulo = 'Idioma do site';
    if (atual === 'es') {
      var t = frase(rotulo);
      if (t !== null) rotulo = t.trim();
    }
    caixa.setAttribute('aria-label', rotulo);

    caixa.innerHTML =
      '<span class="idiomas__deslizante" aria-hidden="true"></span>' +
      Object.keys(IDIOMAS).map(function (id) {
        var i = IDIOMAS[id];
        return '<button class="idiomas__opcao" type="button" data-idioma-botao="' + id + '" ' +
            'aria-pressed="false" data-nao-traduzir>' +
            '<span class="idiomas__bandeira">' + BANDEIRA[i.bandeira] + '</span>' +
            '<span class="idiomas__nome">' + i.nome + '</span>' +
          '</button>';
      }).join('');

    /* LÁ NO FIM DA GAVETA, e não no meio dela.
     *
     * Antes esta caixa entrava ANTES do rodapé — e é o rodapé que tem o
     * `margin-top:auto`, o que empurra para baixo só o que vem depois
     * dele. Resultado: a troca de idioma ficava colada nos links do
     * menu, no meio da gaveta, disputando atenção com eles. O Brian
     * pediu "mais para baixo".
     *
     * Agora ela vai DEPOIS do rodapé: o rodapé continua empurrando o
     * par dos dois para o fim, e a troca de idioma fica a última coisa
     * da gaveta — que é onde se procura ajuste, não caminho. */
    var pe = gaveta.querySelector('.drawer__foot');
    if (pe && pe.parentNode) pe.parentNode.insertBefore(caixa, pe.nextSibling);
    else gaveta.appendChild(caixa);

    caixa.addEventListener('click', function (e) {
      var b = e.target.closest('[data-idioma-botao]');
      if (!b) return;
      trocar(b.getAttribute('data-idioma-botao'));
    });
  }

  function pintarBotoes() {
    var caixa = document.querySelector('.idiomas');
    if (!caixa) return;
    caixa.setAttribute('data-vale', atual);
    caixa.querySelectorAll('[data-idioma-botao]').forEach(function (b) {
      var meu = b.getAttribute('data-idioma-botao') === atual;
      b.classList.toggle('is-vale', meu);
      b.setAttribute('aria-pressed', String(meu));
    });
  }

  /* ---------------- ligar ---------------- */

  function comecar() {
    montarBotoes();
    aplicar(atual);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', comecar, { once: true });
  } else {
    comecar();
  }

  window.PharmaFitIdioma = {
    atual: function () { return atual; },

    /** O CÓDIGO DO IDIOMA, para datas e números: "pt-BR" ou "es-PY".
     *
     * Existe porque o `lang` do documento NÃO serve para isso, e eu
     * descobri medindo. Quem escreve texto na hora costuma ler
     * `document.documentElement.lang` — e na abertura da página esse
     * atributo ainda está em `pt-BR`: os avisos de DOMContentLoaded
     * rodam um por um, e as promessas de cada um são resolvidas ANTES
     * do aviso seguinte. Quem desenha a tela lendo o banco chega na
     * frente de quem traduz.
     *
     * O resultado era "Cliente desde setembro de 2026" no meio de uma
     * tela inteira em espanhol, e o dicionário não tem como consertar:
     * a frase muda de mês em mês. Aqui a resposta vem da escolha
     * guardada, que já existe antes de qualquer tela ser desenhada. */
    local: function () { return (IDIOMAS[atual] || IDIOMAS[PADRAO]).lang; },

    trocar: trocar,
    /** Traduz uma frase solta — para o JavaScript que monta texto. */
    diz: function (pt) {
      if (atual === 'pt') return pt;
      return (dicionario[String(pt).replace(/\s+/g, ' ').trim()]) || pt;
    },
    /** Quantas frases o dicionário conhece. Usado pela conferência. */
    tamanho: function () { return Object.keys(dicionario).length; }
  };
})();
