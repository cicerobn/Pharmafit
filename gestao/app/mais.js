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

  /* CADA COISA UMA VEZ, E EM UM LUGAR SÓ.
   *
   * Brian, 18/09/2026: "melhore o painel, ele esta confuso". Esta tela
   * tinha três atalhos que repetiam o que já existe na barra de baixo
   * ou na gaveta, dois deles levando para telas da geração ANTIGA:
   *
   *   "Fila de pedidos" -> ../index.html   (a aba Pedidos já é a fila)
   *   "Clientes"        -> repetido aqui e na gaveta
   *   "Dashboard"       -> uma terceira visão geral, além do Início
   *
   * A fila velha saiu da lista, e não do site: ela continua sendo onde
   * a venda é confirmada, e o caminho até lá é tocar no pedido — que é
   * como se chega a um pedido de qualquer jeito.
   * O Dashboard ficou, num bloco próprio e com o nome honesto do que
   * ele é: a mesma visão geral desenhada para tela grande. */
  var NUMEROS = [
    /* Relatórios abre a tela do aplicativo (gráficos, no celular). O
       relatório completo, com comparação de meses e planilha, continua
       na tela grande e está linkado lá dentro. */
    { rotulo: 'Relatórios', pe: 'Faturamento, lucro e gráficos do mês', icone: 'grafico', href: 'relatorios.html' },
    /* Brian, 24/09/2026: "Vendas do dia 01 ao 10 quanto eu vendi, quanto
       eu lucrei" e "relatorio diario (...) e ter como imprimir". */
    { rotulo: 'Vendas por período', pe: 'Escolher as datas, ver o que saiu e imprimir', icone: 'calendario', href: 'vendas.html' },
    { rotulo: 'Gastos', pe: 'Lançar e ver as despesas', icone: 'dinheiro', href: '../despesas.html' },
    /* Brian, 24/09/2026: "cupons para fazer promoção". Fica junto do
       dinheiro, porque cupom é desconto — é assunto de venda, não de
       ajuste do sistema. */
    { rotulo: 'Cupons', pe: 'Criar e desligar cupons de desconto do site', icone: 'etiqueta', href: 'cupons.html' }
  ];

  /* A REGRA DESTA TELA, escrita para eu não errar de novo: aqui fica o
     que NÃO está na barra de baixo. Clientes é uma tela principal e não
     tem lugar na barra (que tem quatro), então o caminho dela é este —
     eu havia tirado junto com as duplicatas e deixei a tela sem porta
     no Mais. */
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
    { rotulo: 'Configurações', pe: 'Dados da empresa, cotação e cópia de segurança', icone: 'engrenagem', href: 'configuracoes.html' }
  ];

  /* A geração anterior do painel, desenhada para computador. Não é
     "outro painel": é a MESMA visão geral do Início, na tela grande. */
  var TELA_GRANDE = [
    { rotulo: 'Dashboard', pe: 'A mesma visão geral, desenhada para o computador',
      icone: 'tabela', href: '../dashboard.html' }
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
    var caixaGrande = document.querySelector('[data-atalhos-tela-grande]');
    if (caixaGrande) caixaGrande.innerHTML = linhas(TELA_GRANDE);

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
