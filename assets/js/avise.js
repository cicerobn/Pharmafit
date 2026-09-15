/* =========================================================
   PHARMA FIT — fila de interesse

   Quando um produto está indisponível, o cliente deixa nome e
   WhatsApp e entra na fila. A equipe vê a fila no painel e
   avisa quando o produto voltar.
   ========================================================= */
(function () {
  'use strict';

  var Formularios = window.PharmaFitFormularios;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function montar() {
    if (document.getElementById('modal-avise')) return;

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal" id="modal-avise" role="dialog" aria-modal="true" aria-label="Avise-me quando chegar">' +
        '<div class="modal__scrim" data-fechar-avise></div>' +
        '<form class="modal__card" id="form-avise" novalidate>' +
          '<div class="modal__head">' +
            '<h2 class="modal__title">Avise-me quando chegar</h2>' +
            '<button class="icon-btn icon-btn--bare" type="button" data-fechar-avise aria-label="Fechar">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
            '</button>' +
          '</div>' +
          '<p class="modal__lead">Você entra na fila de <b id="av-produto"></b> e avisamos ' +
            'no WhatsApp assim que chegar. Sem cadastro e sem compromisso.</p>' +
          '<div class="field">' +
            '<label class="field__label" for="av-nome">Seu nome</label>' +
            '<div class="field__box"><input type="text" id="av-nome" placeholder="Nome completo" ' +
              'data-valida="obrigatorio" data-rotulo="seu nome" required></div>' +
          '</div>' +
          '<div class="field">' +
            '<label class="field__label" for="av-zap">Seu WhatsApp</label>' +
            '<div class="field__box"><input type="tel" id="av-zap" placeholder="(92) 99999-9999" ' +
              'data-valida="obrigatorio telefone" data-rotulo="seu WhatsApp" required></div>' +
          '</div>' +
          '<div class="modal__acoes">' +
            '<button class="btn btn--primary btn--block" type="submit" id="av-enviar">Entrar na fila</button>' +
          '</div>' +
        '</form>' +
      '</div>');
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
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 4000);
  }

  var produtoAtual = '';

  document.addEventListener('DOMContentLoaded', function () {
    montar();
    window.PharmaFitValidacao.ligar(document.getElementById('modal-avise'));

    document.addEventListener('click', function (e) {
      var gatilho = e.target.closest('[data-avise]');
      if (gatilho) {
        produtoAtual = gatilho.getAttribute('data-avise');
        document.getElementById('av-produto').textContent = produtoAtual;
        document.getElementById('modal-avise').classList.add('is-open');
        setTimeout(function () { document.getElementById('av-nome').focus(); }, 80);
        return;
      }
      if (e.target.closest('[data-fechar-avise]')) {
        document.getElementById('modal-avise').classList.remove('is-open');
      }
    });

    document.getElementById('form-avise').addEventListener('submit', async function (e) {
      e.preventDefault();

      var nome = document.getElementById('av-nome').value.trim();
      var zap = document.getElementById('av-zap').value.trim();

      if (!window.PharmaFitValidacao.conferir(document.getElementById('form-avise'))) return;

      var botao = document.getElementById('av-enviar');
      botao.disabled = true;

      var r = await Formularios.enviar('espera', {
        nome: nome, telefone: zap, produto: produtoAtual, status: 'aguardando'
      });

      botao.disabled = false;
      document.getElementById('modal-avise').classList.remove('is-open');

      toast(r.ok
        ? 'Pronto! Avisamos você assim que ' + produtoAtual + ' chegar.'
        : 'Não conseguimos registrar agora. Tente novamente em instantes.');

      document.getElementById('av-nome').value = '';
      document.getElementById('av-zap').value = '';
    });
  });
})();
