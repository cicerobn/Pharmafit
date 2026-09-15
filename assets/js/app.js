/* =========================================================
   PHARMA FIT — interações da interface
   ========================================================= */
(function () {
  'use strict';

  /* ---------- menu lateral ---------- */
  var drawer = document.querySelector('[data-drawer]');
  var quemAbriu = null;

  function toggleDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    drawer.setAttribute('aria-hidden', String(!open));

    document.querySelectorAll('[data-drawer-open]').forEach(function (b) {
      b.setAttribute('aria-expanded', String(open));
    });

    if (open) {
      /* Guarda quem abriu para devolver o foco na hora de fechar. Sem
         isso, quem usa teclado fecha o menu e o foco volta para o começo
         da página, perdendo o lugar onde estava. */
      quemAbriu = document.activeElement;
      var primeiro = drawer.querySelector('.drawer__nav a, .drawer__quem');
      if (primeiro) primeiro.focus({ preventScroll: true });
    } else if (quemAbriu && quemAbriu.focus) {
      quemAbriu.focus({ preventScroll: true });
      quemAbriu = null;
    }
  }

  document.querySelectorAll('[data-drawer-open]').forEach(function (el) {
    el.addEventListener('click', function () { toggleDrawer(true); });
  });
  document.querySelectorAll('[data-drawer-close]').forEach(function (el) {
    el.addEventListener('click', function () { toggleDrawer(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') toggleDrawer(false);
  });

  if (drawer) {
    /* Numera os itens para eles entrarem em cascata, e marca a página
       em que a pessoa já está. */
    var aqui = location.pathname.split('/').pop() || 'index.html';
    var itens = drawer.querySelectorAll('.drawer__nav a');

    Array.prototype.forEach.call(itens, function (a, i) {
      a.style.setProperty('--i', String(i));
      var destino = (a.getAttribute('href') || '').split(/[?#]/)[0];
      if (destino && destino === aqui) a.setAttribute('aria-current', 'page');
      /* Tocar num item fecha o menu: sem isto, quem clica em "Produtos"
         vê o menu continuar aberto por cima da página nova por um
         instante, e parece que o toque não pegou. */
      a.addEventListener('click', function () { toggleDrawer(false); });
    });

    /* Arrastar para a direita fecha — o menu entra por esse lado, então
       é o gesto que a mão espera. */
    var x0 = null;
    var painel = drawer.querySelector('.drawer__panel');
    if (painel) {
      painel.addEventListener('touchstart', function (e) {
        x0 = e.touches[0].clientX;
      }, { passive: true });
      painel.addEventListener('touchmove', function (e) {
        if (x0 === null) return;
        if (e.touches[0].clientX - x0 > 60) { toggleDrawer(false); x0 = null; }
      }, { passive: true });
    }
  }

  /* ---------- quem está usando: botão do topo e alto do menu ----------
   *
   * Hoje o site não tem senha: a "conta" é o nome e o WhatsApp guardados
   * no próprio aparelho (assets/js/minha-area.js). Então o botão mostra
   * "Entrar" para quem o site ainda não conhece, e o primeiro nome de
   * quem já se identificou — e leva para a conta, que existe e funciona.
   *
   * Quando a conta com e-mail e senha entrar no ar, é este mesmo botão
   * que passa a abrir o login de verdade. */
  /* ESTA PARTE ESPERA O RESTO CARREGAR.
   *
   * O app.js e incluido ANTES do minha-area.js nas paginas (linha 284
   * contra 290 no index). Lendo `window.PharmaFitArea` na hora, ele nao
   * existe ainda — e o botao ficava dizendo "Entrar" para quem o site
   * ja conhecia, sem erro nenhum na tela.
   *
   * Reordenar as tags seria mexer na ordem de dez arquivos por causa de
   * um; esperar o documento ficar pronto resolve num lugar so. E se o
   * PharmaFitArea nao aparecer nem assim, o botao continua dizendo
   * "Entrar", que e a verdade: o site nao sabe quem e. */
  function quandoPronto(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  quandoPronto(function () {
    var Area = window.PharmaFitArea;
    var nome = '';
    try { nome = String((Area && Area.dados().nome) || '').trim(); } catch (e) { nome = ''; }

    var primeiro = nome ? nome.split(/\s+/)[0] : '';
    if (primeiro) primeiro = primeiro.charAt(0).toUpperCase() + primeiro.slice(1);

    var paginaAtual = location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('[data-conta-botao]').forEach(function (b) {
      var alvo = b.querySelector('[data-conta-nome]');
      if (alvo) alvo.textContent = primeiro || 'Entrar';
      b.classList.toggle('is-dentro', !!primeiro);
      b.setAttribute('aria-label', primeiro ? 'Minha conta, ' + primeiro : 'Entrar na minha conta');

      /* Na propria pagina da conta ele nao se aponta a si mesmo: fica
         marcado como "voce esta aqui". Botao que recarrega a mesma
         pagina parece que nao funcionou. */
      if ((b.getAttribute('href') || '').split('/').pop() === paginaAtual) {
        b.setAttribute('aria-current', 'page');
      }
    });

    var caixa = drawer && drawer.querySelector('[data-drawer-quem]');
    if (caixa) {
      caixa.querySelector('[data-drawer-inicial]').textContent =
        primeiro ? primeiro.charAt(0).toUpperCase() : '?';
      caixa.querySelector('[data-drawer-nome]').textContent = primeiro || 'Entrar na conta';
      caixa.querySelector('[data-drawer-pe]').textContent = primeiro
        ? 'Ver meus pedidos'
        : 'Para acompanhar seus pedidos';
    }
  });

  /* ---------- busca ---------- */
  var searchToggle = document.querySelector('[data-search-toggle]');
  var searchBar = document.querySelector('[data-searchbar]');

  if (searchToggle && searchBar) {
    searchToggle.addEventListener('click', function () {
      var open = searchBar.classList.toggle('is-open');
      searchToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        var field = searchBar.querySelector('input');
        if (field) field.focus();
      }
    });
  }

  /* ---------- carrossel de produtos ---------- */
  var carousel = document.querySelector('[data-carousel]');
  var dotsBox = document.querySelector('[data-dots]');

  if (carousel && dotsBox) {
    var slides = Array.prototype.slice.call(carousel.children);

    slides.forEach(function (slide, i) {
      var dot = document.createElement('button');
      dot.className = 'dot' + (i === 0 ? ' is-active' : '');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Ir para o produto ' + (i + 1));
      dotsBox.appendChild(dot);
    });

    var dots = Array.prototype.slice.call(dotsBox.children);

    function irPara(i) {
      var slide = slides[i];
      if (!slide) return;
      carousel.scrollTo({ left: slide.offsetLeft - carousel.offsetLeft, behavior: 'smooth' });
    }

    /**
     * Escolhe a bolinha pela posição do toque, e não pelo alvo do
     * evento: as bolinhas são pequenas e ficam coladas, e nesse
     * caso o navegador às vezes entrega o clique para a vizinha —
     * o dedo acertava uma e o carrossel pulava para outra.
     */
    dotsBox.addEventListener('click', function (e) {
      var x = e.clientX;
      var escolhida = -1;
      var menor = Infinity;

      dots.forEach(function (d, i) {
        var r = d.getBoundingClientRect();
        var dist = Math.abs((r.left + r.right) / 2 - x);
        if (dist < menor) { menor = dist; escolhida = i; }
      });

      if (escolhida >= 0) irPara(escolhida);
    });

    /* teclado: o alvo do evento é confiável aqui */
    dotsBox.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var dot = e.target.closest('.dot');
      if (!dot) return;
      e.preventDefault();
      irPara(dots.indexOf(dot));
    });
    var raf = null;

    carousel.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var center = carousel.scrollLeft + carousel.clientWidth / 2;
        var current = 0;
        var best = Infinity;

        slides.forEach(function (slide, i) {
          var mid = slide.offsetLeft - carousel.offsetLeft + slide.offsetWidth / 2;
          var dist = Math.abs(mid - center);
          if (dist < best) { best = dist; current = i; }
        });

        dots.forEach(function (dot, i) {
          dot.classList.toggle('is-active', i === current);
        });
      });
    }, { passive: true });
  }

  /** Mostra um aviso quando nenhum produto sobra na vitrine. */
  function conferirVitrine() {
    var grade = document.querySelector('[data-grade]');
    if (!grade) return;

    var visiveis = grade.querySelectorAll('.product:not(.is-hidden)').length;
    var aviso = document.getElementById('vitrine-vazia');

    if (!aviso) {
      aviso = document.createElement('div');
      aviso.id = 'vitrine-vazia';
      aviso.className = 'vazio-bloco vazio-bloco--enxuto';
      aviso.innerHTML =
        '<p class="vazio-bloco__titulo">Nada encontrado</p>' +
        '<p class="vazio-bloco__texto">Tente outra busca ou veja todas as categorias.</p>' +
        '<button class="btn btn--outline" type="button" data-limpar-filtros>Ver tudo</button>';
      grade.parentNode.insertBefore(aviso, grade.nextSibling);

      aviso.querySelector('[data-limpar-filtros]').addEventListener('click', function () {
        var campo = document.querySelector('[data-search-field]');
        if (campo) campo.value = '';
        document.querySelectorAll('[data-chip]').forEach(function (c) {
          c.classList.remove('is-active');
          c.setAttribute('aria-pressed', 'false');
        });
        document.querySelectorAll('[data-category]').forEach(function (card) {
          card.classList.remove('is-hidden');
        });
        animarEntrada(document.querySelector('[data-grade]'));
        conferirVitrine();
      });
    }

    aviso.hidden = visiveis > 0;
  }

  /* ---------- movimento na troca de categoria ---------- */

  var MENOS_MOVIMENTO = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Reanima os cartoes que ficaram visiveis.
   *
   * A animacao e na ENTRADA, e nao na saida: o filtro esconde com
   * `display:none`, e display nao tem meio caminho para transicionar.
   *
   * O atraso cresce por cartao, para a grade se montar em cascata — mas
   * PARA de crescer no 12o. Sem esse limite, numa vitrine de cinquenta
   * produtos o ultimo apareceria mais de um segundo depois, e um site que
   * demora a desenhar nao parece elegante, parece quebrado.
   */
  function animarEntrada(grade) {
    if (MENOS_MOVIMENTO || !grade) return;

    var visiveis = grade.querySelectorAll('.product:not(.is-hidden)');

    Array.prototype.forEach.call(visiveis, function (card, i) {
      /* Tirar e repor a classe nao basta: o navegador junta as duas
         mudancas no mesmo quadro e a animacao nao recomeca. Ler uma
         medida do elemento no meio obriga ele a aplicar a remocao antes
         — e sem isso, filtrar duas vezes seguidas nao anima na segunda. */
      card.classList.remove('is-entrando');
      void card.offsetWidth;

      card.style.setProperty('--i', String(Math.min(i, 12)));
      card.classList.add('is-entrando');

      card.addEventListener('animationend', function () {
        card.classList.remove('is-entrando');
        card.style.removeProperty('--i');
      }, { once: true });
    });
  }

  /* ---------- filtro de categorias ---------- */
  var chips = document.querySelectorAll('[data-chip]');
  var products = document.querySelectorAll('[data-category]');

  if (chips.length && products.length) {
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var target = chip.getAttribute('data-chip');

        chips.forEach(function (other) {
          var active = other === chip;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', String(active));
        });

        products.forEach(function (card) {
          var cats = (card.getAttribute('data-category') || '').split(' ');
          var show = target === 'todos' || cats.indexOf(target) !== -1;
          card.classList.toggle('is-hidden', !show);
        });

        animarEntrada(document.querySelector('[data-grade]'));
        conferirVitrine();
      });
    });
  }

  /* ---------- atalhos para uma categoria (ex.: "Ver seleção") ---------- */
  document.querySelectorAll('[data-chip-jump]').forEach(function (el) {
    el.addEventListener('click', function () {
      var target = el.getAttribute('data-chip-jump');
      var chip = document.querySelector('[data-chip="' + target + '"]');

      if (chip) {
        chip.click();
        chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        return;
      }

      /* sem chip correspondente (ex.: "todos"): limpa o filtro */
      chips.forEach(function (other) {
        other.classList.remove('is-active');
        other.setAttribute('aria-pressed', 'false');
      });
      products.forEach(function (card) { card.classList.remove('is-hidden'); });
      animarEntrada(document.querySelector('[data-grade]'));
      conferirVitrine();
    });
  });

  /* ---------- busca por texto nos produtos ---------- */
  var searchField = document.querySelector('[data-search-field]');

  if (searchField && products.length) {
    /* A busca NAO anima, de proposito. Ela dispara a cada letra: animar
       aqui faria a grade tremer enquanto a pessoa digita, o que atrapalha
       exatamente quem esta procurando algo. Movimento na troca de
       categoria ajuda a entender que a lista mudou; na busca, estorva. */
    searchField.addEventListener('input', function () {
      var term = searchField.value.trim().toLowerCase();
      products.forEach(function (card) {
        var text = card.textContent.toLowerCase();
        card.classList.toggle('is-hidden', term !== '' && text.indexOf(term) === -1);
      });

      conferirVitrine();
    });
  }
})();
