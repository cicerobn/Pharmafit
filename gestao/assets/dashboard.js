/* =========================================================
   PHARMA FIT — dashboard

   A tela de abertura do painel: como está o mês, o que precisa
   de atenção agora e para onde o dinheiro está indo.
   ========================================================= */
(function () {
  'use strict';

  var U = window.PharmaFitUtil;
  var moeda = U.moeda, esc = U.esc, toast = U.toast;

  var Auth = window.PharmaFitAuth;
  var Dados = window.PharmaFitDados;
  var Analise = window.PharmaFitAnalise;
  var Grafico = window.PharmaFitGrafico;
  var cfg = window.PHARMAFIT_CONFIG || {};

  var estado = { pedidos: [], produtos: [], despesas: [], meses: [], atual: null, meta: 0 };

  /* ---------- comparação com o mês anterior ---------- */

  function mesAnterior(chave) {
    var partes = chave.split('-');
    var d = new Date(Number(partes[0]), Number(partes[1]) - 1, 1);
    d.setMonth(d.getMonth() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function variacao(atual, anterior) {
    if (!anterior) return atual ? { texto: 'primeiro mês com movimento', classe: '' } : null;
    var pct = Math.round(((atual - anterior) / anterior) * 100);
    if (pct === 0) return { texto: 'igual ao mês passado', classe: '' };
    return {
      texto: (pct > 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '% em relação ao mês passado',
      classe: pct > 0 ? 'variacao--sobe' : 'variacao--desce'
    };
  }

  function pintarVariacao(id, atual, anterior) {
    var el = document.getElementById(id);
    var v = variacao(atual, anterior);
    el.className = 'kpi__hint ' + (v && v.classe ? v.classe : '');
    el.textContent = v ? v.texto : '';
  }

  /* ---------- avisos do topo ---------- */

  function pintarAvisos() {
    var caixa = document.getElementById('avisos');
    var itens = [];

    /* sem banco, tudo vive no navegador deste aparelho — e some se ele for limpo */
    if (!Auth.configurado && estado.pedidos.length) {
      var dias = 0;
      try {
        var ultimo = localStorage.getItem('pharmafit_ultimo_backup');
        dias = ultimo ? Math.floor((Date.now() - new Date(ultimo)) / 86400000) : 999;
      } catch (e) { dias = 999; }

      if (dias >= 7) {
        itens.push({
          cor: 'vermelho',
          titulo: 'Seus dados existem só neste aparelho',
          texto: 'O banco ainda não foi ligado. Baixe uma cópia de segurança para não perder ' +
                 'as vendas se este navegador for limpo.',
          link: 'ajustes.html', acao: 'Baixar cópia'
        });
      }
    }

    var pendentes = estado.pedidos.filter(function (p) {
      return String(p.status || 'pendente').toLowerCase() === 'pendente';
    });
    if (pendentes.length) {
      itens.push({
        cor: 'ouro',
        titulo: pendentes.length + (pendentes.length === 1 ? ' pedido aguardando' : ' pedidos aguardando'),
        texto: 'Confirme para entrar no faturamento.',
        link: 'index.html', acao: 'Ver fila'
      });
    }

    var semEstoque = estado.produtos.filter(function (p) {
      return p.estoque !== null && p.estoque !== undefined && p.estoque !== '' && Number(p.estoque) <= 0;
    });
    var poucoEstoque = estado.produtos.filter(function (p) {
      return p.estoque !== null && p.estoque !== undefined && p.estoque !== '' &&
             Number(p.estoque) > 0 && Number(p.estoque) <= 5;
    });

    if (semEstoque.length) {
      itens.push({
        cor: 'vermelho',
        titulo: semEstoque.length + (semEstoque.length === 1 ? ' produto sem estoque' : ' produtos sem estoque'),
        texto: semEstoque.slice(0, 2).map(function (p) { return p.nome; }).join(', ') +
               (semEstoque.length > 2 ? ' e mais' : ''),
        link: 'index.html', acao: 'Repor'
      });
    } else if (poucoEstoque.length) {
      itens.push({
        cor: 'ouro',
        titulo: 'Estoque baixo',
        texto: poucoEstoque.map(function (p) { return p.nome + ' (' + p.estoque + ')'; }).join(', '),
        link: 'index.html', acao: 'Ver produtos'
      });
    }

    /* Produto à venda sem custo cadastrado.
     *
     * Custo em branco a conta trata como zero, e aí o lucro daquela venda sai
     * do tamanho do preço. O número não fica esquisito: fica BOM. É o jeito
     * mais fácil de olhar um relatório e acreditar num lucro que não existe.
     *
     * O aviso é aqui, antes da primeira venda, porque depois o erro já entrou
     * no fechamento do mês. A tabela de produtos mostra "—" na margem — está
     * certo, mas quem está no relatório não passa por ela. */
    var semCusto = estado.produtos.filter(function (p) {
      return p.ativo !== false &&
             Number(p.preco || p.venda || 0) > 0 &&
             !Number(p.custo || 0);
    });
    if (semCusto.length) {
      itens.push({
        cor: 'vermelho',
        titulo: semCusto.length === 1
          ? '1 produto à venda sem custo cadastrado'
          : semCusto.length + ' produtos à venda sem custo cadastrado',
        texto: semCusto.slice(0, 2).map(function (p) { return p.nome; }).join(', ') +
               (semCusto.length > 2 ? ' e mais' : '') +
               ' — sem o custo, o lucro aparece maior do que é.',
        link: 'index.html', acao: 'Preencher'
      });
    }

    var parados = Analise.inativos(estado.pedidos, cfg.DIAS_INATIVIDADE || 60);
    if (parados.length) {
      itens.push({
        cor: 'neutro',
        titulo: parados.length + (parados.length === 1 ? ' cliente parado' : ' clientes parados'),
        texto: 'Sem comprar há mais de ' + (cfg.DIAS_INATIVIDADE || 60) + ' dias.',
        link: 'clientes.html', acao: 'Reativar'
      });
    }

    if (!itens.length) {
      caixa.innerHTML = '<div class="aviso aviso--ok">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>' +
        '<div><b>Tudo em dia</b><span>Nenhum pedido parado, estoque ok.</span></div></div>';
      return;
    }

    caixa.innerHTML = itens.map(function (a) {
      return '<a class="aviso aviso--' + a.cor + '" href="' + a.link + '">' +
        '<div><b>' + esc(a.titulo) + '</b><span>' + esc(a.texto) + '</span></div>' +
        '<span class="aviso__acao">' + esc(a.acao) +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>' +
        '</span></a>';
    }).join('');
  }

  /* ---------- caminho do dinheiro ---------- */

  function pintarCascata(r) {
    var caixa = document.getElementById('cascata');

    if (!r.faturamento) {
      caixa.innerHTML = '<p class="empty">Sem vendas confirmadas neste mês.</p>';
      return;
    }

    var etapas = [
      { nome: 'Faturamento', valor: r.faturamento, tipo: 'entrada' },
      { nome: 'Custo dos produtos', valor: -r.custo, tipo: 'saida' },
      { nome: 'Gastos da empresa', valor: -r.gasto, tipo: 'saida' },
      { nome: 'Lucro líquido', valor: r.lucro, tipo: 'final' }
    ];

    caixa.innerHTML = etapas.map(function (e) {
      var largura = Math.max(4, Math.round((Math.abs(e.valor) / r.faturamento) * 100));
      return '<div class="cascata__item cascata__item--' + e.tipo + '">' +
        '<p class="cascata__topo"><span>' + esc(e.nome) + '</span>' +
          '<b>' + (e.tipo === 'saida' ? '− ' : '') + moeda(Math.abs(e.valor)) + '</b></p>' +
        '<div class="cascata__trilho"><span style="width:' + largura + '%"></span></div>' +
      '</div>';
    }).join('') +
    '<p class="cascata__nota">De cada R$ 100 vendidos, sobraram <b>' +
      (r.faturamento ? (r.lucro / r.faturamento * 100).toFixed(0) : 0) + '</b> de lucro.</p>';
  }

  /* ---------- gráficos ---------- */

  function pintarGraficos(chave) {
    /* barras: faturamento x lucro nos últimos 6 meses */
    var ultimos = estado.meses.slice(0, 6).reverse();
    Grafico.barras('gr-meses', ultimos.map(function (m) {
      var r = Analise.resumoMes(estado.pedidos, estado.despesas, m.chave);
      return { rotulo: m.curto, a: r.faturamento, b: r.lucro };
    }), { a: 'Faturamento', b: 'Lucro líquido' });

    /* linha: vendas por dia do mês escolhido */
    var partes = chave.split('-');
    var ano = Number(partes[0]), mes = Number(partes[1]);
    var diasNoMes = new Date(ano, mes, 0).getDate();
    var hoje = new Date();
    var ateODia = (hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes) ? hoje.getDate() : diasNoMes;

    var vendas = Analise.confirmados(estado.pedidos).filter(function (p) {
      return Analise.chaveMes(new Date(p.confirmado_em || p.criado_em)) === chave;
    });

    var porDia = [];
    for (var d = 1; d <= ateODia; d++) {
      var total = vendas.filter(function (p) {
        return new Date(p.confirmado_em || p.criado_em).getDate() === d;
      }).reduce(function (t, p) { return t + Number(p.valor || 0); }, 0);
      porDia.push({ rotulo: String(d), valor: total });
    }

    var comMovimento = porDia.filter(function (d) { return d.valor > 0; }).length;
    document.getElementById('gr-dias-resumo').textContent =
      comMovimento ? comMovimento + (comMovimento === 1 ? ' dia com venda' : ' dias com venda') : '';
    Grafico.linha('gr-dias', porDia, 'Vendas por dia');

    /* rosca: meios de pagamento */
    Grafico.rosca('gr-pagamentos', Analise.rankingPagamentos(vendas).slice(0, 6), 'Meios de pagamento');

    /* rosca: gastos por categoria */
    var gastosMes = estado.despesas.filter(function (g) {
      return Analise.chaveMes(new Date(g.data || g.criado_em)) === chave;
    });
    var porCategoria = {};
    gastosMes.forEach(function (g) {
      var c = g.categoria || 'Outros';
      porCategoria[c] = (porCategoria[c] || 0) + Number(g.valor || 0);
    });
    Grafico.rosca('gr-gastos', Object.keys(porCategoria).map(function (k) {
      return { nome: k, total: porCategoria[k] };
    }).sort(function (a, b) { return b.total - a.total; }).slice(0, 6), 'Gastos por categoria');

    /* barras horizontais: produtos e clientes */
    Grafico.barrasHorizontais('gr-produtos', Analise.rankingProdutos(vendas).slice(0, 5).map(function (p) {
      return { nome: p.nome, total: p.total,
               meta: p.quantidade + (p.quantidade === 1 ? ' venda · lucro ' : ' vendas · lucro ') + moeda(p.lucro) };
    }));

    Grafico.barrasHorizontais('gr-clientes', Analise.rankingClientes(vendas).slice(0, 5).map(function (c) {
      return { nome: c.nome, total: c.total,
               meta: c.quantidade + (c.quantidade === 1 ? ' compra' : ' compras') };
    }));
  }

  /* ---------- meta do mês ---------- */

  /** Quantos dias o mês tem e quantos já passaram (se for o mês atual). */
  function andamentoDoMes(chave) {
    var partes = chave.split('-');
    var ano = Number(partes[0]), mes = Number(partes[1]);
    var total = new Date(ano, mes, 0).getDate();
    var hoje = new Date();

    var corrente = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;
    return { total: total, passados: corrente ? hoje.getDate() : total, corrente: corrente };
  }

  function pintarMeta(r) {
    var caixa = document.getElementById('meta');
    var meta = Number(estado.meta || 0);

    if (!meta) {
      caixa.innerHTML =
        '<p class="meta__convite">Defina uma meta de faturamento e o painel mostra, todo dia, ' +
          'quanto falta e quanto precisa vender por dia para chegar lá.</p>' +
        '<button class="btn btn--primary" type="button" id="definir-meta">Definir meta do mês</button>';
      return;
    }

    var pct = Math.min(100, Math.round((r.faturamento / meta) * 100));
    var falta = Math.max(0, meta - r.faturamento);
    var dias = andamentoDoMes(estado.atual);
    var restantes = Math.max(0, dias.total - dias.passados);

    var recado;
    if (falta === 0) {
      recado = 'Meta batida. ' + moeda(r.faturamento - meta) + ' acima do combinado.';
    } else if (!dias.corrente) {
      recado = 'O mês fechou ' + moeda(falta) + ' abaixo da meta.';
    } else if (restantes === 0) {
      recado = 'Último dia do mês: faltam ' + moeda(falta) + '.';
    } else {
      recado = 'Faltam ' + moeda(falta) + ' em ' + restantes +
        (restantes === 1 ? ' dia' : ' dias') + ' — ' + moeda(falta / restantes) + ' por dia.';
    }

    caixa.innerHTML =
      '<div class="meta__topo">' +
        '<span>' + moeda(r.faturamento) + ' de ' + moeda(meta) + '</span>' +
        '<b>' + pct + '%</b>' +
      '</div>' +
      '<div class="meta__trilho' + (falta === 0 ? ' meta__trilho--batida' : '') + '">' +
        '<span style="width:' + Math.max(2, pct) + '%"></span>' +
      '</div>' +
      '<p class="meta__recado">' + esc(recado) + '</p>';
  }

  function ligarMeta() {
    function abrir(aberto) {
      document.getElementById('modal-meta').classList.toggle('is-open', aberto);
      if (aberto) {
        var campo = document.getElementById('meta-valor');
        campo.value = estado.meta || '';
        setTimeout(function () { campo.focus(); campo.select(); }, 60);
      }
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('#editar-meta') || e.target.closest('#definir-meta')) abrir(true);
      if (e.target.closest('[data-fechar-meta]')) abrir(false);
    });

    document.getElementById('form-meta').addEventListener('submit', async function (e) {
      e.preventDefault();

      var botao = document.getElementById('meta-salvar');
      var valor = Math.max(0, Number(document.getElementById('meta-valor').value || 0));

      botao.disabled = true;
      var r = await Dados.salvarConfig('meta_mensal', valor);
      botao.disabled = false;

      if (!r.ok) { toast(r.erro || 'Não foi possível salvar a meta.'); return; }

      estado.meta = valor;
      abrir(false);
      pintarMeta(Analise.resumoMes(estado.pedidos, estado.despesas, estado.atual));

      toast(!valor ? 'Meta retirada.'
        : (r.local ? 'Meta salva neste aparelho. Rode a migração 01 para valer no painel todo.'
                   : 'Meta de ' + moeda(valor) + ' salva.'));
    });
  }

  /* ---------- mês ---------- */

  function pintarMes(chave) {
    estado.atual = chave;

    var r = Analise.resumoMes(estado.pedidos, estado.despesas, chave);
    var anterior = Analise.resumoMes(estado.pedidos, estado.despesas, mesAnterior(chave));

    var nomeMes = (estado.meses.filter(function (m) { return m.chave === chave; })[0] || {}).rotulo || '';
    document.getElementById('periodo-titulo').textContent = 'Como está ' + nomeMes + '.';

    document.getElementById('d-faturamento').textContent = moeda(r.faturamento);
    document.getElementById('d-lucro').textContent = moeda(r.lucro);
    document.getElementById('d-lucro').classList.toggle('is-negativo', r.lucro < 0);
    document.getElementById('d-vendas').textContent = r.vendas;
    document.getElementById('d-ticket').textContent = moeda(r.ticket);

    document.getElementById('d-margem').textContent = r.faturamento
      ? 'margem de ' + (r.lucro / r.faturamento * 100).toFixed(0) + '%'
      : 'sem vendas no mês';
    document.getElementById('d-ticket-hint').textContent = r.pagamentoTop
      ? 'maioria em ' + r.pagamentoTop.nome
      : '';

    pintarVariacao('d-faturamento-var', r.faturamento, anterior.faturamento);
    pintarVariacao('d-vendas-var', r.vendas, anterior.vendas);

    pintarMeta(r);
    pintarCascata(r);
    pintarGraficos(chave);
  }

  /* ---------- carga ---------- */

  async function recarregar() {
    var painel = await Dados.listarPainel();
    estado.pedidos = painel.pedidos;
    estado.produtos = painel.produtos;
    estado.despesas = await Dados.listarGastos();
    estado.meta = Number(await Dados.lerConfig('meta_mensal', 0)) || 0;

    pintarAvisos();
    pintarMes(estado.atual || estado.meses[0].chave);
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

    document.getElementById('tentar-de-novo').onclick = function () {
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

    document.getElementById('mes').addEventListener('change', function () {
      pintarMes(this.value);
    });

    try {
      await recarregar();
    } catch (e) {
      console.error('[Pharma Fit] falha ao carregar:', e);
      mostrarErro('Não conseguimos buscar os dados agora.', function () { location.reload(); });
      return;
    }
    ligarMeta();

    mostrarConteudo();
  })();
})();
