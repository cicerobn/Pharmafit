/* =========================================================
   PHARMA FIT — tela "Mais"

   Os atalhos para o resto do painel. Ela existe porque a barra de
   baixo só tem cinco espaços, e o painel tem mais telas que isso —
   é melhor uma lista honesta aqui do que abas escondidas.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Moldura = window.PharmaFitMoldura;

  var NUMEROS = [
    /* Relatórios agora abre a tela do app (gráficos, no celular). O
       relatório completo, com comparação de meses e planilha, continua
       na tela grande e está linkado lá dentro. */
    { rotulo: 'Relatórios', pe: 'Faturamento, lucro e gráficos do mês', icone: 'grafico', href: 'relatorios.html' },
    { rotulo: 'Gastos', pe: 'Lançar e ver as despesas', icone: 'dinheiro', href: '../despesas.html' },
    { rotulo: 'Dashboard', pe: 'A visão geral em tela grande', icone: 'casa', href: '../dashboard.html' }
  ];

  var AJUSTES = [
    { rotulo: 'Clientes', pe: 'Quem já comprou', icone: 'gente', href: 'clientes.html' },
    { rotulo: 'Fila de pedidos', pe: 'Confirmar, separar e enviar', icone: 'caixa', href: '../index.html' },
    { rotulo: 'Configurações', pe: 'Dados da empresa, cotação e cópia de segurança', icone: 'engrenagem', href: 'configuracoes.html' }
  ];

  function linhas(lista) {
    return lista.map(function (i) {
      return '<li><a class="item" href="' + i.href + '">' +
        '<span class="item__icone">' + Moldura.svg(i.icone, 19, 1.6) + '</span>' +
        '<span class="item__corpo">' +
          '<span class="item__nome">' + i.rotulo + '</span>' +
          '<span class="item__linha">' + i.pe + '</span>' +
        '</span>' +
        '<span class="item__seta">' + Moldura.svg('seta', 17, 1.9) + '</span>' +
      '</a></li>';
    }).join('');
  }

  (async function () {
    var user = await Auth.exigirLogin('../login.html');
    if (!user) return;

    await Moldura.montar({ aba: 'mais' });
    Moldura.aoNovo(function () { location.href = '../index.html#novo'; });

    document.querySelector('[data-atalhos-numeros]').innerHTML = linhas(NUMEROS);
    document.querySelector('[data-atalhos-ajustes]').innerHTML = linhas(AJUSTES);

    document.querySelector('[data-sair-aqui]').addEventListener('click', async function () {
      try { await Auth.sair(); } catch (e) {}
      location.replace('../login.html');
    });

    Moldura.animarEntrada('.bloco');
  })();
})();
