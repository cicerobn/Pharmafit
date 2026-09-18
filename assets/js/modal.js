/* =========================================================
   PHARMA FIT — comportamento comum dos modais

   Fecha no Esc, devolve o foco para quem abriu e mantém a
   navegação por teclado presa dentro da janela enquanto ela
   estiver aberta.
   ========================================================= */
(function () {
  'use strict';

  var FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  var ultimoFoco = null;

  function abertos() {
    return [].slice.call(document.querySelectorAll('.modal.is-open, .drawer.is-open'));
  }

  function topo() {
    var lista = abertos();
    return lista.length ? lista[lista.length - 1] : null;
  }

  document.addEventListener('keydown', function (e) {
    var modal = topo();
    if (!modal) return;

    if (e.key === 'Escape') {
      var fechar = modal.querySelector('[data-fechar-pedido],[data-fechar-avise],[data-fechar-modal],' +
        '[data-fechar-valor],[data-fechar-produto],[data-fechar-venda],[data-fechar-despesa],' +
        '[data-fechar-pessoal],[data-drawer-close],[data-cancelar]');
      if (fechar) fechar.click();
      else modal.classList.remove('is-open');
      return;
    }

    if (e.key !== 'Tab') return;

    var itens = [].slice.call(modal.querySelectorAll(FOCAVEIS)).filter(function (el) {
      return el.offsetParent !== null;
    });
    if (!itens.length) return;

    var primeiro = itens[0];
    var ultimo = itens[itens.length - 1];

    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault(); primeiro.focus();
    }
  });

  /* guarda quem abriu, para devolver o foco ao fechar */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-pedido],[data-avise],[data-drawer-open],[data-editar-produto],[data-editar-venda]')) {
      ultimoFoco = document.activeElement;
    }
  }, true);

  var observador = new MutationObserver(function () {
    if (!abertos().length && ultimoFoco && document.contains(ultimoFoco)) {
      ultimoFoco.focus();
      ultimoFoco = null;
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    observador.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  });

  /* ---------- confirmação com a cara do site ---------- */

  function escapar(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * Substitui o confirm() do navegador, que no celular aparece
   * como uma caixa cinza sem relação nenhuma com o site.
   * Retorna uma Promise que resolve true/false.
   */
  window.PharmaFitConfirmar = function (opcoes) {
    opcoes = typeof opcoes === 'string' ? { texto: opcoes } : (opcoes || {});

    return new Promise(function (resolve) {
      var fundo = document.createElement('div');
      fundo.className = 'modal is-open confirmacao-site';
      fundo.innerHTML =
        '<div class="modal__scrim" data-cancelar></div>' +
        /* A caixa estreita vem de `.confirmacao-site .modal__card`, que esta
           no fundo do styles.css — `modal__card--pequeno` nao tem regra
           em folha nenhuma e nunca teve: era uma promessa que so o
           nome cumpria. Tirei o nome, a caixa continua com os mesmos
           380px de largura. */
        '<div class="modal__card" role="alertdialog" aria-modal="true">' +
          '<h2 class="modal__title">' + escapar(opcoes.titulo || 'Tem certeza?') + '</h2>' +
          '<p class="modal__lead">' + escapar(opcoes.texto || '') + '</p>' +
          '<div class="modal__acoes modal__acoes--empilha">' +
            '<button class="btn btn--primary btn--block" type="button" data-confirmar>' +
              escapar(opcoes.confirmar || 'Confirmar') + '</button>' +
            '<button class="linkish" type="button" data-cancelar>' +
              escapar(opcoes.cancelar || 'Cancelar') + '</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(fundo);

      function fechar(valor) {
        document.removeEventListener('keydown', aoTeclar);
        fundo.remove();
        resolve(valor);
      }
      function aoTeclar(e) {
        if (e.key === 'Escape') fechar(false);
      }

      fundo.addEventListener('click', function (e) {
        if (e.target.closest('[data-cancelar]')) fechar(false);
        if (e.target.closest('[data-confirmar]')) fechar(true);
      });
      document.addEventListener('keydown', aoTeclar);

      setTimeout(function () { fundo.querySelector('[data-confirmar]').focus(); }, 40);
    });
  };
})();
