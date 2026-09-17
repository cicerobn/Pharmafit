/* =========================================================
   PHARMA FIT — formulários do site

   Cuida dos envios públicos que caem no painel de gestão:
     representantes  cadastro de parceiros
     orcamentos      pedidos de atacado
     espera          fila de interesse por produto em falta

   Com Supabase configurado grava no banco; sem ele, guarda no
   navegador (modo demonstração) — o painel lê do mesmo lugar.

   precisa: nuvem, validacao
   enche: data-colecao

   `precisa` importa mais aqui do que na maioria: a linha
   `var Nuvem = window.PharmaFitNuvem` roda NA HORA em que o arquivo
   carrega, não quando a pessoa clica. Se `nuvem.js` vier depois,
   `Nuvem` fica `undefined` para sempre e todo envio da página morre
   no clique, sem nada na tela.

   `enche: data-colecao` cobra o contrário: página que tem
   `<form data-colecao="…">` no HTML e não carrega este arquivo é uma
   página com botão Enviar que não faz absolutamente nada.
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

  /* `data-sucesso`, no <p>, marca A CAIXA onde a mensagem aparece.
   * `data-recado-ok`, no <form>, é O TEXTO da mensagem.
   *
   * Os dois já se chamaram `data-sucesso`, um dentro do outro, e
   * funcionava só por um detalhe fino: `form.querySelector` não
   * enxerga o próprio form. Quem lesse o HTML via o mesmo nome
   * querendo dizer duas coisas — e foi exatamente o que me enganou
   * quando fui medir esta tela: o meu teste pegou o form, achou que
   * era a caixa de sucesso, e me acusou o site de mentir. */
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

        sucesso(form, form.getAttribute('data-recado-ok') ||
          'Recebemos seus dados! Nossa equipe entra em contato em breve.');
      });
    });
  });
})();
