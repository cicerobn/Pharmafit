/* =========================================================
   PHARMA FIT — tela de relatórios
   Fechamento por mês, gastos e rankings.
   ========================================================= */
(function () {
  'use strict';

  var U = window.PharmaFitUtil;
  var moeda = U.moeda, data = U.data, hora = U.hora, esc = U.esc, toast = U.toast;

  var Auth = window.PharmaFitAuth;
  var Dados = window.PharmaFitDados;
  var Analise = window.PharmaFitAnalise;

  var estado = { pedidos: [], despesas: [], meses: [], atual: null };

  /* ---------- utilidades ---------- */

  /* ---------- rankings ---------- */

  function pintarRanking(alvo, lista, opcoes) {
    opcoes = opcoes || {};
    var caixa = document.getElementById(alvo);

    if (!lista.length) {
      caixa.innerHTML = '<p class="empty">Ainda sem dados para este ranking.</p>';
      return;
    }

    var topo = lista[0].total || 1;

    caixa.innerHTML = lista.slice(0, opcoes.limite || 6).map(function (item, i) {
      var largura = Math.max(4, Math.round((item.total / topo) * 100));
      var complemento = opcoes.sufixo
        ? opcoes.sufixo(item)
        : item.quantidade + (item.quantidade === 1 ? ' venda' : ' vendas');

      return '' +
        '<div class="rank">' +
          '<span class="rank__pos">' + (i + 1) + '</span>' +
          '<div class="rank__corpo">' +
            '<p class="rank__topo">' +
              '<span class="rank__nome">' + (opcoes.ficha
                ? '<a class="link-cliente" href="cliente.html?c=' + encodeURIComponent(item.nome) + '">' +
                    esc(item.nome) + '</a>'
                : esc(item.nome)) + '</span>' +
              '<span class="rank__valor">' + moeda(item.total) + '</span>' +
            '</p>' +
            '<div class="rank__barra"><span style="width:' + largura + '%"></span></div>' +
            '<p class="rank__meta">' + esc(complemento) + '</p>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  /* ---------- mês selecionado ---------- */

  function pintarMes(chave) {
    estado.atual = chave;
    var r = Analise.resumoMes(estado.pedidos, estado.despesas, chave);

    document.getElementById('m-faturamento').textContent = moeda(r.faturamento);
    document.getElementById('m-vendas').textContent =
      r.vendas + (r.vendas === 1 ? ' venda confirmada' : ' vendas confirmadas');
    document.getElementById('m-ticket').textContent = moeda(r.ticket);
    document.getElementById('m-custo').textContent = moeda(r.custo);
    document.getElementById('m-gasto').textContent = moeda(r.gasto);
    document.getElementById('m-lucro-bruto').textContent = moeda(r.lucroBruto);
    document.getElementById('m-lucro').textContent = moeda(r.lucro);
    document.getElementById('m-lucro-bruto').classList.toggle('is-negativo', r.lucroBruto < 0);

    var lucro = document.getElementById('m-lucro');
    lucro.classList.toggle('is-negativo', r.lucro < 0);

    /* O lucro só é confiável se toda venda do mês tiver custo cadastrado.
       Quando não tem, a conta subtrai zero e o lucro aparece maior do que é —
       então o aviso diz de quanto é a dúvida, em reais. */
    var semCusto = document.getElementById('m-sem-custo');
    if (r.semCusto) {
      semCusto.hidden = false;
      semCusto.textContent =
        (r.semCusto === 1
          ? '1 venda deste mês está sem o custo cadastrado'
          : r.semCusto + ' vendas deste mês estão sem o custo cadastrado') +
        ' (' + moeda(r.semCustoValor) + ' em ' + r.semCustoProdutos.join(', ') + '). ' +
        'Custo em branco a conta trata como zero, então o lucro acima está MAIOR do que o real. ' +
        'Para corrigir: Painel → Produtos → editar o produto e preencher o custo.';
    } else {
      semCusto.hidden = true;
      semCusto.textContent = '';
    }

    var pg = document.getElementById('m-pagamento');
    var hint = document.getElementById('m-pagamento-hint');
    if (r.pagamentoTop) {
      pg.textContent = r.pagamentoTop.nome;
      hint.textContent = r.pagamentoTop.quantidade +
        (r.pagamentoTop.quantidade === 1 ? ' venda · ' : ' vendas · ') + moeda(r.pagamentoTop.total);
    } else {
      pg.textContent = '—';
      hint.textContent = 'sem vendas no mês';
    }

    /* gastos do mês */
    var gastos = estado.despesas.filter(function (d) {
      return Analise.chaveMes(new Date(d.data || d.criado_em)) === chave;
    }).sort(function (a, b) { return new Date(b.data) - new Date(a.data); });

    document.getElementById('m-gasto-hint').textContent =
      gastos.length ? gastos.length + (gastos.length === 1 ? ' lançamento' : ' lançamentos') : 'nenhum lançamento';

    var corpo = document.getElementById('tabela-gastos');
    document.getElementById('gastos-vazio').hidden = gastos.length > 0;

    corpo.innerHTML = gastos.map(function (g) {
      return '<tr>' +
        '<td>' + data(g.data || g.criado_em) + '</td>' +
        '<td>' + esc(g.descricao) + '</td>' +
        '<td>' + esc(g.categoria) + '</td>' +
        '<td class="col-num custo">' + moeda(g.valor) + '</td>' +
        '<td class="col-num"><button class="btn-mini" type="button" data-excluir-gasto="' + esc(g.id) + '">excluir</button></td>' +
        '</tr>';
    }).join('');

    /* rankings do mês escolhido */
    var doMes = r.pedidos;
    pintarRanking('rk-clientes', Analise.rankingClientes(doMes), { ficha: true });
    pintarRanking('rk-produtos', Analise.rankingProdutos(doMes), {
      sufixo: function (i) {
        return i.quantidade + (i.quantidade === 1 ? ' unidade · lucro ' : ' unidades · lucro ') + moeda(i.lucro);
      }
    });
    pintarRanking('rk-vendedores', Analise.rankingVendedores(doMes));
    pintarRanking('rk-pagamentos', Analise.rankingPagamentos(doMes));

    var maior = Analise.maiorVenda(doMes);
    document.getElementById('bloco-maior').hidden = !maior;
    if (maior) {
      document.getElementById('maior-venda').innerHTML =
        '<b>' + esc(maior.cliente) + '</b> — ' + esc(maior.produto) +
        ' <span class="destaque-venda__valor">' + moeda(maior.valor) + '</span>' +
        '<span class="destaque-venda__meta">' + data(maior.confirmado_em || maior.criado_em) +
        (maior.pagamento ? ' · ' + esc(maior.pagamento) : '') + '</span>';
    }
  }

  /* ---------- histórico mês a mês ---------- */

  function pintarHistorico() {
    var corpo = document.getElementById('tabela-meses');

    corpo.innerHTML = estado.meses.map(function (m) {
      var r = Analise.resumoMes(estado.pedidos, estado.despesas, m.chave);
      return '<tr' + (m.chave === estado.atual ? ' class="is-atual"' : '') + '>' +
        '<td>' + m.rotulo + '</td>' +
        '<td class="col-num">' + r.vendas + '</td>' +
        '<td class="col-num num">' + moeda(r.faturamento) + '</td>' +
        '<td class="col-num">' + moeda(r.ticket) + '</td>' +
        '<td class="col-num custo">' + moeda(r.gasto) + '</td>' +
        '<td class="col-num ' + (r.lucro < 0 ? 'margem-negativa' : 'margem') + '">' + moeda(r.lucro) + '</td>' +
        '<td>' + (r.pagamentoTop ? esc(r.pagamentoTop.nome) : '—') + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---------- carga ---------- */

  async function recarregar() {
    var painel = await Dados.listarPainel();
    estado.pedidos = painel.pedidos;
    estado.despesas = await Dados.listar('despesas');
    pintarMes(estado.atual || estado.meses[0].chave);
    pintarHistorico();
  }

  /* ---------- exclusão rápida de gasto ---------- */

  function ligarDespesas() {
    document.getElementById('tabela-gastos').addEventListener('click', async function (e) {
      var botao = e.target.closest('[data-excluir-gasto]');
      if (!botao) return;
      if (!await U.confirmar({ titulo: 'Excluir gasto', texto: 'Este lançamento sai do total do mês.', confirmar: 'Excluir', perigo: true })) return;

      var r = await Dados.excluir('despesas', botao.getAttribute('data-excluir-gasto'));
      if (!r.ok) { toast(r.erro || 'Não foi possível excluir.'); return; }
      toast('Gasto excluído.');
      await recarregar();
    });
  }

  /* ---------- exportar ---------- */

  function ligarExportacao() {
    document.getElementById('baixar-csv').addEventListener('click', function () {
      var r = Analise.resumoMes(estado.pedidos, estado.despesas, estado.atual);

      if (!r.pedidos.length) { toast('Este mês ainda não tem vendas para exportar.'); return; }

      U.baixarCSV('pharmafit-vendas-' + estado.atual + '.csv', [
        { titulo: 'Data',       campo: function (p) { return data(p.confirmado_em || p.criado_em); } },
        { titulo: 'Cliente',    campo: 'cliente' },
        { titulo: 'Produto',    campo: 'produto' },
        { titulo: 'Quantidade', campo: function (p) { return Number(p.quantidade || 1); } },
        { titulo: 'Valor',      campo: function (p) { return Number(p.valor || 0); } },
        { titulo: 'Custo',      campo: function (p) { return Number(p.custo || 0); } },
        { titulo: 'Lucro',      campo: function (p) { return Number(p.valor || 0) - Number(p.custo || 0); } },
        /* A planilha sai da tela e vive sozinha. Sem esta coluna, a linha sem
           custo fica com o lucro inteiro e ninguém tem como saber, meses
           depois, que aquele lucro era só custo não preenchido. */
        { titulo: 'Custo informado', campo: function (p) { return Number(p.custo || 0) ? 'sim' : 'NÃO'; } },
        { titulo: 'Pagamento',  campo: 'pagamento' },
        { titulo: 'Vendedor',   campo: 'vendedor' }
      ], r.pedidos);

      toast('Planilha baixada com ' + r.pedidos.length + ' vendas.');
    });
  }

  /* ---------- comparar dois meses ---------- */

  /** Linhas do comparativo, na ordem em que fazem sentido ler. */
  var COMPARAR = [
    { rotulo: 'Faturamento',      campo: 'faturamento', tipo: 'dinheiro', maiorEMelhor: true },
    { rotulo: 'Vendas',           campo: 'vendas',      tipo: 'numero',   maiorEMelhor: true },
    { rotulo: 'Ticket médio',     campo: 'ticket',      tipo: 'dinheiro', maiorEMelhor: true },
    { rotulo: 'Custo dos produtos', campo: 'custo',     tipo: 'dinheiro', maiorEMelhor: false },
    { rotulo: 'Gastos da empresa', campo: 'gasto',      tipo: 'dinheiro', maiorEMelhor: false },
    { rotulo: 'Lucro líquido',    campo: 'lucro',       tipo: 'dinheiro', maiorEMelhor: true, destaque: true }
  ];

  function formatar(valor, tipo) {
    return tipo === 'dinheiro' ? moeda(valor) : String(Math.round(valor));
  }

  function pintarComparativo() {
    var chaveA = estado.atual;
    var chaveB = document.getElementById('mes-comparar').value;

    var corpo = document.getElementById('tabela-comparativo');
    var vazio = document.getElementById('cmp-vazio');
    var recado = document.getElementById('cmp-recado');

    if (!chaveB || chaveB === chaveA) {
      corpo.innerHTML = '';
      vazio.hidden = false;
      recado.textContent = '';
      return;
    }
    vazio.hidden = true;

    var a = Analise.resumoMes(estado.pedidos, estado.despesas, chaveA);
    var b = Analise.resumoMes(estado.pedidos, estado.despesas, chaveB);

    function nome(chave) {
      return (estado.meses.filter(function (m) { return m.chave === chave; })[0] || {}).rotulo || chave;
    }

    document.getElementById('cmp-titulo-a').textContent = nome(chaveA);
    document.getElementById('cmp-titulo-b').textContent = nome(chaveB);

    corpo.innerHTML = COMPARAR.map(function (linha) {
      var va = Number(a[linha.campo] || 0);
      var vb = Number(b[linha.campo] || 0);
      var dif = va - vb;

      var pct = vb ? Math.round((dif / Math.abs(vb)) * 100) : null;
      var melhorou = linha.maiorEMelhor ? dif > 0 : dif < 0;

      var classe = dif === 0 ? '' : (melhorou ? ' class="variacao--sobe"' : ' class="variacao--desce"');
      var seta = dif === 0 ? '' : (dif > 0 ? '▲ ' : '▼ ');

      return '<tr' + (linha.destaque ? ' class="linha-destaque"' : '') + '>' +
        '<td class="col-titulo"><b>' + esc(linha.rotulo) + '</b></td>' +
        '<td data-rotulo="' + esc(nome(chaveA)) + '" class="col-num num">' +
          formatar(va, linha.tipo) + '</td>' +
        '<td data-rotulo="' + esc(nome(chaveB)) + '" class="col-num">' +
          formatar(vb, linha.tipo) + '</td>' +
        '<td data-rotulo="Diferença" class="col-num"><span' + classe + '>' +
          (dif === 0 ? 'igual'
            : seta + formatar(Math.abs(dif), linha.tipo) +
              (pct === null ? '' : ' (' + Math.abs(pct) + '%)')) +
        '</span></td>' +
      '</tr>';
    }).join('');

    /* uma frase em português para não precisar interpretar a tabela */
    var difLucro = a.lucro - b.lucro;
    recado.textContent = difLucro === 0
      ? 'O lucro ficou igual nos dois meses.'
      : (difLucro > 0
          ? 'Você lucrou ' + moeda(difLucro) + ' a mais em ' + nome(chaveA) + '.'
          : 'Você lucrou ' + moeda(Math.abs(difLucro)) + ' a menos em ' + nome(chaveA) + '.');
  }

  /* ---------- estados da tela ---------- */

  function mostrarConteudo() {
    document.getElementById('conteudo').hidden = false;
    document.getElementById('carregando').hidden = true;
    document.getElementById('erro-carga').hidden = true;
  }

  function mostrarErro(mensagem, tentarDeNovo) {
    document.getElementById('carregando').hidden = true;
    document.getElementById('conteudo').hidden = true;

    var caixa = document.getElementById('erro-carga');
    caixa.hidden = false;
    document.getElementById('erro-carga-texto').textContent =
      mensagem || 'Verifique sua conexão e tente de novo.';

    var botao = document.getElementById('tentar-de-novo');
    botao.onclick = function () {
      caixa.hidden = true;
      document.getElementById('carregando').hidden = false;
      tentarDeNovo();
    };
  }

  /* ---------- início ---------- */

  (async function () {
    await Auth.pronto;

    var user = await Auth.exigirLogin('login.html');
    if (!user) return;

    document.getElementById('usuario').textContent = user.nome || user.email || 'Equipe';
    window.PharmaFitMenu.montar(user);

    document.getElementById('sair').addEventListener('click', async function () {
      await Auth.sair();
      location.replace('login.html');
    });

    estado.meses = Analise.meses();
    document.getElementById('mes').innerHTML = estado.meses.map(function (m) {
      return '<option value="' + m.chave + '">' + m.rotulo + '</option>';
    }).join('');

    var comparar = document.getElementById('mes-comparar');
    comparar.innerHTML = '<option value="">Escolha um mês</option>' +
      estado.meses.map(function (m) {
        return '<option value="' + m.chave + '">' + m.rotulo + '</option>';
      }).join('');

    /* já começa comparando com o mês anterior, quando existe */
    if (estado.meses.length > 1) comparar.value = estado.meses[1].chave;

    document.getElementById('mes').addEventListener('change', function () {
      pintarMes(this.value);
      pintarHistorico();
      pintarComparativo();
    });

    comparar.addEventListener('change', pintarComparativo);

    try {
      await recarregar();
    } catch (e) {
      console.error('[Pharma Fit] falha ao carregar:', e);
      mostrarErro('Não conseguimos buscar os dados agora.', function () { location.reload(); });
      return;
    }
    ligarDespesas();
    ligarExportacao();
    pintarComparativo();

    mostrarConteudo();
  })();
})();
