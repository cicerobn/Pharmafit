/* =========================================================
   PHARMA FIT — formulários do site

   Cuida dos envios públicos que caem no painel de gestão:
     representantes  cadastro de parceiros
     orcamentos      pedidos de atacado
     espera          fila de interesse por produto em falta

   Com Supabase configurado grava no banco; sem ele, guarda no
   navegador (modo demonstração) — o painel lê do mesmo lugar.
   ========================================================= */
(function () {
  'use strict';

  var Nuvem = window.PharmaFitNuvem;

  /** Envia um registro para a coleção indicada. */
  function enviar(colecao, registro) {
    return Nuvem.inserir(colecao, registro);
  }

  window.PharmaFitFormularios = { enviar: enviar };

  /* ---------- aviso na tela ---------- */

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
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 4500);
  }

  function sucesso(form, mensagem) {
    var caixa = form.querySelector('[data-sucesso]');
    if (!caixa) { toast(mensagem); return; }
    caixa.textContent = mensagem;
    caixa.hidden = false;
    form.querySelectorAll('input, select, textarea, button[type=submit]').forEach(function (c) {
      c.disabled = true;
    });
  }

  /* ---------- ligação automática dos formulários ---------- */

  document.addEventListener('DOMContentLoaded', function () {

    document.querySelectorAll('form[data-colecao]').forEach(function (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!window.PharmaFitValidacao.conferir(form)) return;

        var colecao = form.getAttribute('data-colecao');
        var registro = {};

        form.querySelectorAll('[data-campo]').forEach(function (campo) {
          registro[campo.getAttribute('data-campo')] = String(campo.value || '').trim();
        });

        registro.status = 'novo';

        var botao = form.querySelector('button[type=submit]');
        if (botao) botao.disabled = true;

        var r = await enviar(colecao, registro);

        if (!r.ok) {
          if (botao) botao.disabled = false;
          toast('Não conseguimos enviar agora. Tente de novo em instantes.');
          return;
        }

        sucesso(form, form.getAttribute('data-sucesso') ||
          'Recebemos seus dados! Nossa equipe entra em contato em breve.');
      });
    });
  });
})();
