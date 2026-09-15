/* =========================================================
   PHARMA FIT — preenche selects de produto com o catálogo
   Usado nos formulários que precisam da lista (atacado).
   ========================================================= */
(function () {
  'use strict';

  var catalogo = window.PHARMAFIT_CATALOGO || [];

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-produtos]').forEach(function (select) {
      select.innerHTML = catalogo.map(function (p) {
        return '<option value="' + p.nome.replace(/"/g, '&quot;') + '">' + p.nome + '</option>';
      }).join('') + '<option value="Vários produtos">Vários produtos</option>';

      /* respeita ?produto=... na URL, vindo de um card */
      var url = new URLSearchParams(location.search);
      var escolhido = url.get('produto');
      if (escolhido) select.value = escolhido;
    });
  });
})();
