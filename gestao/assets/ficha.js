/* =========================================================
   PHARMA FIT — ficha do cliente

   Tudo o que quem atende precisa saber antes de responder uma
   mensagem: quanto já comprou, o que costuma levar, como paga,
   para onde entregar e o que ficou anotado da última conversa.

   Abre por gestao/cliente.html?c=<nome do cliente>.
   ========================================================= */
(function () {
  'use strict';

  var U = window.PharmaFitUtil;
  var moeda = U.moeda, data = U.data, esc = U.esc, toast = U.toast;

  var Auth = window.PharmaFitAuth;
  var Dados = window.PharmaFitDados;
  var Analise = window.PharmaFitAnalise;
  var Grafico = window.PharmaFitGrafico;
  var cfg = window.PHARMAFIT_CONFIG || {};

  var DIA = 24 * 60 * 60 * 1000;

  var estado = {
    nome: '',        /* nome como veio na URL */
    exibicao: '',    /* nome como está gravado nos pedidos */
    pedidos: [],     /* só os deste cliente */
    produtos: [],
    resumo: null,
    nota: null
  };

  /* ---------- leitura dos dados ---------- */

  function nomeDaUrl() {
    var params = new URLSearchParams(location.search);
    return String(params.get('c') || params.get('cliente') || '').trim();
  }

  function mesmoCliente(a, b) {
    return U.normalizar(a).trim() === U.normalizar(b).trim();
  }

  function quando(p) {
    return new Date(p.confirmado_em || p.criado_em || p.data || 0).getTime();
  }

  /** O valor mais recente que não está vazio — telefone, endereço etc. */
  function ultimoPreenchido(pedidos, campo) {
    for (var i = 0; i < pedidos.length; i++) {
      var v = String(pedidos[i][campo] || '').trim();
      if (v) return v;
    }
    return '';
  }

  /** O que mais se repete numa lista de textos. */
  function maisComum(pedidos, campo) {
    var mapa = {};
    pedidos.forEach(function (p) {
      var v = String(p[campo] || '').trim();
      if (!v) return;
      mapa[v] = (mapa[v] || 0) + 1;
    });
    var chaves = Object.keys(mapa).sort(function (a, b) { return mapa[b] - mapa[a]; });
    return chaves.length ? { valor: chaves[0], vezes: mapa[chaves[0]] } : null;
  }

  /**
   * Números do cliente: quanto comprou, com que frequência e há
   * quanto tempo não aparece.
   */
  function resumir(pedidos) {
    var confirmadas = Analise.confirmados(pedidos).slice()
      .sort(function (a, b) { return quando(b) - quando(a); });

    var total = confirmadas.reduce(function (t, p) { return t + Number(p.valor || 0); }, 0);
    var custo = confirmadas.reduce(function (t, p) { return t + Number(p.custo || 0); }, 0);

    var ultima = confirmadas.length ? quando(confirmadas[0]) : 0;
    var primeira = confirmadas.length ? quando(confirmadas[confirmadas.length - 1]) : 0;

    /* média de dias entre uma compra e outra — serve para prever a próxima */
    var intervalo = 0;
    if (confirmadas.length > 1) {
      intervalo = Math.round(((ultima - primeira) / DIA) / (confirmadas.length - 1));
    }

    var diasParado = ultima ? Math.floor((Date.now() - ultima) / DIA) : null;
    var limite = cfg.DIAS_INATIVIDADE || 60;

    return {
      compras: confirmadas.length,
      pendentes: pedidos.filter(function (p) {
        return String(p.status || '').toLowerCase() === 'pendente';
      }).length,
      total: total,
      custo: custo,
      lucro: total - custo,
      ticket: confirmadas.length ? total / confirmadas.length : 0,
      primeira: primeira,
      ultima: ultima,
      diasParado: diasParado,
      intervalo: intervalo,
      parado: diasParado !== null && diasParado > limite,
      limite: limite,
      pagamento: maisComum(confirmadas, 'pagamento'),
      produto: maisComum(confirmadas, 'produto'),
      telefone: ultimoPreenchido(pedidos, 'telefone'),
      endereco: ultimoPreenchido(pedidos, 'endereco'),
      vendedor: maisComum(confirmadas, 'vendedor'),
      confirmadas: confirmadas
    };
  }

  /* ---------- cabeçalho ---------- */

  function iniciais(nome) {
    var partes = String(nome || '').trim().split(/\s+/);
    var texto = (partes[0] || '?').charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : '');
    return texto.toUpperCase();
  }

  function selo(r) {
    if (!r.compras) return { classe: 'pendente', texto: 'sem compra confirmada' };
    if (r.parado) return { classe: 'off', texto: 'parado há ' + r.diasParado + ' dias' };
    if (r.compras === 1) return { classe: 'promo', texto: 'primeira compra' };
    return { classe: 'pago', texto: 'cliente ativo' };
  }

  function mensagemZap(r) {
    if (r.parado) {
      return 'Olá ' + estado.exibicao + '! Aqui é da Pharma Fit. Faz um tempo que não falamos — ' +
        'quer retomar seu acompanhamento?';
    }
    if (r.produto) {
      return 'Olá ' + estado.exibicao + '! Aqui é da Pharma Fit. Como está indo com o ' +
        r.produto.valor + '? Precisa repor?';
    }
    return 'Olá ' + estado.exibicao + '! Aqui é da Pharma Fit. Como podemos ajudar?';
  }

  function pintarCabeca() {
    var r = estado.resumo;
    var s = selo(r);
    var link = U.linkZap(r.telefone, mensagemZap(r));

    document.getElementById('ficha-cabeca').innerHTML =
      '<div class="ficha__topo">' +
        '<span class="ficha__avatar" aria-hidden="true">' + esc(iniciais(estado.exibicao)) + '</span>' +
        '<div class="ficha__id">' +
          '<h1 class="ficha__nome">' + esc(estado.exibicao) + '</h1>' +
          '<p class="ficha__meta">' +
            '<span class="tag tag--' + s.classe + '">' + esc(s.texto) + '</span>' +
            (r.telefone ? '<span class="ficha__zap">' + esc(r.telefone) + '</span>'
                        : '<span class="sem-zap">sem WhatsApp cadastrado</span>') +
          '</p>' +
        '</div>' +
      '</div>' +

      '<div class="ficha__acoes">' +
        (link
          ? '<a class="btn btn--zap" target="_blank" rel="noopener" href="' + link +
              '">Chamar no WhatsApp</a>'
          : '') +
        '<button class="btn btn--outline" type="button" id="abrir-pedido">Lançar pedido</button>' +
      '</div>' +

      (r.pendentes
        ? '<p class="ficha__alerta">' + r.pendentes +
            (r.pendentes === 1 ? ' pedido pendente esperando confirmação. ' : ' pedidos pendentes esperando confirmação. ') +
            '<a class="linkish" href="index.html">Abrir a fila de vendas</a></p>'
        : '');
  }

  /* ---------- números ---------- */

  function pintarKpis() {
    var r = estado.resumo;

    var previsao = '';
    if (r.intervalo && r.diasParado !== null) {
      var faltam = r.intervalo - r.diasParado;
      previsao = faltam > 0
        ? 'próxima compra em ~' + faltam + (faltam === 1 ? ' dia' : ' dias')
        : 'já passou do costume em ' + Math.abs(faltam) + (Math.abs(faltam) === 1 ? ' dia' : ' dias');
    }

    var itens = [
      { rotulo: 'Total comprado', valor: moeda(r.total),
        dica: r.lucro ? moeda(r.lucro) + ' de lucro' : '' },
      { rotulo: 'Compras', valor: String(r.compras), destaque: true,
        dica: r.intervalo ? 'a cada ' + r.intervalo + ' dias, em média' : '' },
      { rotulo: 'Ticket médio', valor: moeda(r.ticket),
        dica: r.compras > 1 ? 'por compra' : '' },
      { rotulo: 'Última compra', valor: r.ultima ? data(r.ultima) : '—',
        dica: r.diasParado === null ? '' :
              (r.diasParado === 0 ? 'hoje' : 'há ' + r.diasParado + ' dias') +
              (previsao ? ' · ' + previsao : '') }
    ];

    document.getElementById('ficha-kpis').innerHTML = itens.map(function (i) {
      return '<article class="kpi' + (i.destaque ? ' kpi--destaque' : '') + '">' +
        '<p class="kpi__label">' + esc(i.rotulo) + '</p>' +
        '<p class="kpi__value">' + i.valor + '</p>' +
        '<p class="kpi__hint">' + esc(i.dica || '') + '</p>' +
      '</article>';
    }).join('');
  }

  /* ---------- dados de atendimento ---------- */

  function pintarDados() {
    var r = estado.resumo;

    var linhas = [
      ['WhatsApp', r.telefone || '—'],
      ['Entrega', r.endereco || 'Sem endereço registrado'],
      ['Como costuma pagar', r.pagamento ? r.pagamento.valor +
        (r.pagamento.vezes > 1 ? ' (' + r.pagamento.vezes + 'x)' : '') : '—'],
      ['Produto preferido', r.produto ? r.produto.valor +
        (r.produto.vezes > 1 ? ' (' + r.produto.vezes + 'x)' : '') : '—'],
      ['Primeira compra', r.primeira ? data(r.primeira) : '—'],
      ['Quem costuma atender', r.vendedor ? r.vendedor.valor : '—']
    ];

    document.getElementById('ficha-dados').innerHTML = linhas.map(function (l) {
      return '<div class="dados-lista__item">' +
        '<dt>' + esc(l[0]) + '</dt><dd>' + esc(l[1]) + '</dd>' +
      '</div>';
    }).join('');
  }

  /* ---------- gráfico de produtos ---------- */

  function pintarProdutos() {
    var ranking = Analise.rankingProdutos(estado.pedidos).slice(0, 6).map(function (p) {
      return { nome: p.nome, total: p.total,
               meta: p.quantidade + (p.quantidade === 1 ? ' compra' : ' compras') };
    });

    document.getElementById('ficha-produtos-hint').textContent =
      ranking.length ? 'Do que mais leva para o que menos leva' : '';

    Grafico.barrasHorizontais('gr-produtos-cliente', ranking);
  }

  /* ---------- histórico ---------- */

  function pintarHistorico() {
    var lista = estado.pedidos.slice().sort(function (a, b) { return quando(b) - quando(a); });
    var vazio = document.getElementById('hist-vazio');
    var contador = document.getElementById('hist-contador');

    contador.textContent = lista.length;
    contador.hidden = !lista.length;
    vazio.hidden = lista.length > 0;
    document.getElementById('baixar-ficha').disabled = !lista.length;

    document.getElementById('tabela-historico').innerHTML = lista.map(function (p) {
      var st = String(p.status || '').toLowerCase();
      var classe = st === 'pendente' ? 'pendente' : (st === 'enviado' ? 'enviado' : 'pago');

      return '<tr>' +
        '<td class="col-titulo"><b>' + data(p.confirmado_em || p.criado_em) + '</b></td>' +
        '<td data-rotulo="Produto">' + esc(p.produto) +
          (Number(p.quantidade) > 1 ? ' <span class="sub">' + p.quantidade + ' un.</span>' : '') + '</td>' +
        '<td data-rotulo="Valor" class="col-num num">' + moeda(p.valor) + '</td>' +
        '<td data-rotulo="Pagamento">' + esc(p.pagamento || '—') + '</td>' +
        '<td data-rotulo="Status"><span class="tag tag--' + classe + '">' + esc(st || 'pendente') + '</span></td>' +
        '</tr>';
    }).join('');
  }

  function baixarPlanilha() {
    U.baixarCSV('pharmafit-' + U.normalizar(estado.exibicao).replace(/\s+/g, '-') + '.csv', [
      { titulo: 'Data',      campo: function (p) { return data(p.confirmado_em || p.criado_em); } },
      { titulo: 'Produto',   campo: 'produto' },
      { titulo: 'Quantidade', campo: function (p) { return Number(p.quantidade || 1); } },
      { titulo: 'Valor',     campo: function (p) { return Number(p.valor || 0); } },
      { titulo: 'Pagamento', campo: 'pagamento' },
      { titulo: 'Status',    campo: 'status' }
    ], estado.pedidos.slice().sort(function (a, b) { return quando(b) - quando(a); }));
  }

  /* ---------- observações ---------- */

  async function carregarNota() {
    var notas = await Dados.listar('notas');
    estado.nota = (notas || []).filter(function (n) {
      return mesmoCliente(n.cliente, estado.exibicao);
    })[0] || null;

    document.getElementById('nota-texto').value = estado.nota ? (estado.nota.texto || '') : '';
    document.getElementById('nota-salvo').textContent = estado.nota && estado.nota.atualizado_em
      ? 'Última anotação em ' + data(estado.nota.atualizado_em)
      : '';
  }

  async function salvarNota(e) {
    e.preventDefault();

    var botao = document.getElementById('nota-salvar');
    var texto = document.getElementById('nota-texto').value.trim();
    var campos = { cliente: estado.exibicao, texto: texto, atualizado_em: new Date().toISOString() };

    botao.disabled = true;
    var r = estado.nota
      ? await Dados.atualizar('notas', estado.nota.id, campos)
      : await Dados.inserir('notas', campos);
    botao.disabled = false;

    if (!r.ok) { toast(r.erro || 'Não foi possível salvar a observação.'); return; }

    toast(r.local
      ? 'Observação salva neste aparelho. Rode a migração 01 para a equipe toda ver.'
      : (texto ? 'Observação salva.' : 'Observação apagada.'));
    await carregarNota();
  }

  /* ---------- lançar pedido para este cliente ---------- */

  function abrirPedido(aberto) {
    document.getElementById('modal-pedido').classList.toggle('is-open', aberto);
    if (aberto) {
      document.getElementById('np-quem').textContent = estado.exibicao;
      setTimeout(function () { document.getElementById('np-produto').focus(); }, 40);
    }
  }

  function encherProdutos() {
    var select = document.getElementById('np-produto');
    var ativos = estado.produtos.filter(function (p) { return p.ativo !== false; });

    select.innerHTML = '<option value="">Escolha o produto</option>' +
      ativos.map(function (p) {
        return '<option value="' + esc(p.nome) + '" data-preco="' + Number(p.preco || p.venda || 0) + '">' +
          esc(p.nome) + '</option>';
      }).join('');

    /* já sugere o preço de tabela quando escolhe o produto */
    select.addEventListener('change', function () {
      var opcao = select.options[select.selectedIndex];
      var preco = opcao ? Number(opcao.getAttribute('data-preco') || 0) : 0;
      var campo = document.getElementById('np-valor');
      if (preco && !Number(campo.value)) campo.value = preco;
    });
  }

  async function lancarPedido(e) {
    e.preventDefault();

    var produto = document.getElementById('np-produto').value;
    var valor = Number(document.getElementById('np-valor').value || 0);

    if (!produto) { toast('Escolha o produto.'); return; }

    var botao = document.getElementById('np-salvar');
    botao.disabled = true;

    var r = await Dados.criarPedido({
      cliente: estado.exibicao,
      telefone: estado.resumo.telefone,
      produto: produto,
      valor: valor,
      origem: 'painel'
    });

    botao.disabled = false;
    if (!r.ok) { toast(r.erro || 'Não foi possível lançar o pedido.'); return; }

    abrirPedido(false);
    document.getElementById('form-pedido').reset();
    toast('Pedido lançado. Confirme quando a venda fechar.');
    await recarregar();
  }

  /* ---------- carga ---------- */

  async function recarregar() {
    var painel = await Dados.listarPainel();

    estado.produtos = painel.produtos || [];
    estado.pedidos = (painel.pedidos || []).filter(function (p) {
      return mesmoCliente(p.cliente, estado.nome);
    });

    /* usa o nome exatamente como está gravado, não como veio na URL */
    estado.exibicao = estado.pedidos.length
      ? String(estado.pedidos[0].cliente).trim()
      : estado.nome;

    estado.resumo = resumir(estado.pedidos);

    document.title = estado.exibicao + ' — Gestão Pharma Fit';

    pintarCabeca();
    pintarKpis();
    pintarDados();
    pintarProdutos();
    pintarHistorico();
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
    document.getElementById('erro-carga-texto').textContent = mensagem;

    var botao = document.getElementById('tentar-de-novo');
    botao.textContent = tentarDeNovo ? 'Tentar de novo' : 'Ver todos os clientes';
    botao.onclick = tentarDeNovo || function () { location.href = 'clientes.html'; };
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

    estado.nome = nomeDaUrl();
    if (!estado.nome) {
      mostrarErro('Nenhum cliente foi escolhido. Volte para a lista e clique em um nome.', null);
      return;
    }

    try {
      await recarregar();
      await carregarNota();
    } catch (e) {
      console.error('[Pharma Fit] falha ao carregar a ficha:', e);
      mostrarErro('Não conseguimos buscar os dados agora.', function () { location.reload(); });
      return;
    }

    if (!estado.pedidos.length) {
      mostrarErro('Não encontramos compras de "' + estado.nome + '".', null);
      return;
    }

    encherProdutos();

    document.getElementById('form-nota').addEventListener('submit', salvarNota);
    document.getElementById('form-pedido').addEventListener('submit', lancarPedido);
    document.getElementById('baixar-ficha').addEventListener('click', baixarPlanilha);

    document.addEventListener('click', function (e) {
      if (e.target.closest('#abrir-pedido')) abrirPedido(true);
      if (e.target.closest('[data-fechar-pedido]')) abrirPedido(false);
    });

    mostrarConteudo();
  })();
})();
