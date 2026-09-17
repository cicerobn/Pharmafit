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
    /* O CAMINHO ATÉ O QUE CHEGA DO SITE — ele NÃO existia.
     *
     * Achado em 17/09/2026: o site tem quatro formulários que gravam no
     * banco — orçamento de atacado, cadastro de representante,
     * "avise-me quando chegar" e o pedido de atendimento. As quatro
     * tabelas existem, têm RLS ligada e a regra deixa o visitante
     * gravar (conferido no banco). E as quatro listas só aparecem na
     * tela ANTIGA de clientes, que não tinha link de lugar nenhum
     * daqui.
     *
     * Quer dizer: o formulário funcionava, o dado chegava, e o painel
     * que ele usa não tinha como mostrar. A primeira pessoa a pedir
     * orçamento de atacado ia ficar esperando resposta para sempre.
     * (Medido no mesmo dia: as quatro estavam em ZERO, então nenhum
     * contato foi perdido — o furo era para a frente.) */
    { rotulo: 'Contatos do site', pe: 'Atacado, representantes, avise-me e atendimento',
      icone: 'sino', href: '../clientes.html', contar: true },
    { rotulo: 'Fila de pedidos', pe: 'Confirmar, separar e enviar', icone: 'caixa', href: '../index.html' },
    { rotulo: 'Configurações', pe: 'Dados da empresa, cotação e cópia de segurança', icone: 'engrenagem', href: 'configuracoes.html' }
  ];

  /* QUANTOS ESTÃO ESPERANDO RESPOSTA.
   *
   * Link que ele nunca toca é a mesma coisa que link que não existe.
   * O número ao lado é o que faz ele tocar — e ele só aparece quando
   * há alguém esperando.
   *
   * "Esperando" é definido por tabela, porque cada uma marca o fim de
   * um jeito diferente: atendimento vira 'atendido', representante
   * vira 'aprovado', orçamento vira 'respondido', e a fila de
   * interesse é APAGADA quando resolvida (então toda linha conta).
   * Status vazio conta como esperando: é o que o site grava. */
  var ESPERANDO = [
    { colecao: 'espera',         pronto: null },
    { colecao: 'atendimentos',   pronto: 'atendido' },
    { colecao: 'representantes', pronto: 'aprovado' },
    { colecao: 'orcamentos',     pronto: 'respondido' }
  ];

  async function quantosEsperando() {
    var Dados = window.PharmaFitDados;
    if (!Dados || !Dados.listar) return 0;
    var total = 0;
    for (var i = 0; i < ESPERANDO.length; i++) {
      var alvo = ESPERANDO[i];
      try {
        var lista = await Dados.listar(alvo.colecao);
        total += (lista || []).filter(function (r) {
          if (!alvo.pronto) return true;
          return String((r && r.status) || '').toLowerCase() !== alvo.pronto;
        }).length;
      } catch (e) { /* uma tabela que não responde não some com o resto */ }
    }
    return total;
  }

  function linhas(lista) {
    return lista.map(function (i) {
      return '<li><a class="item" href="' + i.href + '">' +
        '<span class="item__icone">' + Moldura.svg(i.icone, 19, 1.6) + '</span>' +
        '<span class="item__corpo">' +
          '<span class="item__nome">' + i.rotulo + '</span>' +
          '<span class="item__linha">' + i.pe + '</span>' +
        '</span>' +
        (i.contar
          ? '<span class="item__aviso" data-esperando hidden>0</span>'
          : '') +
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

    /* O número vem DEPOIS da tela aparecer, e sem travar nada: contar
       são quatro leituras no banco, e a tela não pode esperar por
       elas. Se o banco não responder, fica o link sem número — que é
       como estava antes. */
    (async function () {
      var quantos = await quantosEsperando();
      var onde = document.querySelector('[data-esperando]');
      if (!onde || !quantos) return;
      onde.textContent = quantos > 99 ? '99+' : String(quantos);
      onde.hidden = false;
    })();

    document.querySelector('[data-sair-aqui]').addEventListener('click', async function () {
      try { await Auth.sair(); } catch (e) {}
      location.replace('../login.html');
    });

    Moldura.animarEntrada('.bloco');
  })();
})();
