/* =========================================================
   PHARMA FIT — interações da interface
   ========================================================= */
(function () {
  'use strict';

  /* ---------- menu lateral ---------- */
  var drawer = document.querySelector('[data-drawer]');

  function toggleDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
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

  /* ---------- carrossel de protocolos ---------- */
  var carousel = document.querySelector('[data-carousel]');
  var dotsBox = document.querySelector('[data-dots]');

  if (carousel && dotsBox) {
    var slides = Array.prototype.slice.call(carousel.children);

    slides.forEach(function (slide, i) {
      var dot = document.createElement('button');
      dot.className = 'dot' + (i === 0 ? ' is-active' : '');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Ir para o protocolo ' + (i + 1));
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
        conferirVitrine();
      });
    }

    aviso.hidden = visiveis > 0;
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
      conferirVitrine();
    });
  });

  /* ---------- busca por texto nos produtos ---------- */
  var searchField = document.querySelector('[data-search-field]');

  if (searchField && products.length) {
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
