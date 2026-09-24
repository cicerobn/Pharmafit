/* =========================================================
   PHARMA FIT — painel de gestão

   Fluxo da venda:
     1. A venda é fechada no WhatsApp.
     2. O pedido entra aqui como PENDENTE (pelo site ou lançado
        à mão) e a equipe Confirma ou Exclui.
     3. Só o pedido confirmado entra nos indicadores.
   ========================================================= */
(function () {
  'use strict';

  var U = window.PharmaFitUtil;
  var moeda = U.moeda, data = U.data, hora = U.hora, esc = U.esc, toast = U.toast;

  var Auth = window.PharmaFitAuth;
  var Dados = window.PharmaFitDados;
  var Avisos = window.PharmaFitNotificacoes;

  var cfg = window.PHARMAFIT_CONFIG || {};
  var estado = { pedidos: [], produtos: [], exemplo: false,
                 buscaVendas: '', periodo: 'tudo', vendedor: '', buscaProdutos: '',
                 limiteVendas: 6, limiteProdutos: 6 };

  var PASSO_LISTA = 6;

  /** Mostra o botão "ver mais" quando a lista foi cortada. */
  function pintarVerMais(id, total, limite, acao) {
    var caixa = document.getElementById(id);
    if (!caixa) return;

    if (total <= limite) { caixa.hidden = true; return; }
    caixa.hidden = false;
    caixa.innerHTML = '<button class="btn-ver-mais" type="button">Ver mais ' +
      Math.min(PASSO_LISTA, total - limite) + ' de ' + total + '</button>';
    caixa.querySelector('button').onclick = acao;
  }
  var vistos = {};
  var usuarioAtual = '';

  /* ---------- utilidades ---------- */

  function mesmoDia(v, ref) {
    var d = new Date(v);
    return !isNaN(d) && d.toDateString() === ref.toDateString();
  }

  function mesmoMes(v, ref) {
    var d = new Date(v);
    return !isNaN(d) && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  }

  function confirmados(lista) {
    return lista.filter(function (p) {
      var s = String(p.status || '').toLowerCase();
      return s === 'confirmado' || s === 'enviado' || s === 'pago';
    });
  }

  function pendentes(lista) {
    return lista.filter(function (p) {
      return String(p.status || 'pendente').toLowerCase() === 'pendente';
    });
  }

  /* ---------- indicadores ---------- */

  function pintarKpis() {
    var hoje = new Date();
    var ok = confirmados(estado.pedidos);
    var doDia = ok.filter(function (p) { return mesmoDia(p.criado_em, hoje); });
    var doMes = ok.filter(function (p) { return mesmoMes(p.criado_em, hoje); });
    var faturamento = doMes.reduce(function (t, p) { return t + Number(p.valor || 0); }, 0);
    var ticket = doMes.length ? faturamento / doMes.length : 0;
    var ativos = estado.produtos.filter(function (p) { return p.ativo !== false; }).length;
    var fila = pendentes(estado.pedidos);

    document.getElementById('kpi-pedidos').textContent = doDia.length;
    document.getElementById('kpi-pedidos-hint').textContent =
      fila.length ? fila.length + ' aguardando confirmação' : 'nenhum pedido aguardando';
    document.getElementById('kpi-faturamento').textContent = moeda(faturamento);
    document.getElementById('kpi-ticket').textContent = moeda(ticket);
    document.getElementById('kpi-produtos').textContent = ativos;
  }

  /* ---------- fila de confirmação ---------- */

  function pintarFila() {
    var caixa = document.getElementById('fila');
    var vazio = document.getElementById('fila-vazia');
    var contador = document.getElementById('fila-contador');
    var lista = pendentes(estado.pedidos).sort(function (a, b) {
      return new Date(b.criado_em) - new Date(a.criado_em);
    });

    contador.textContent = lista.length;
    contador.hidden = !lista.length;

    if (!lista.length) {
      caixa.innerHTML = '';
      vazio.hidden = false;
      return;
    }
    vazio.hidden = true;

    caixa.innerHTML = lista.map(function (p) {
      var zap = U.linkZap(p.telefone, '');
      return '' +
        '<article class="fila__item" data-id="' + esc(p.id) + '">' +
          '<div class="fila__info">' +
            '<p class="fila__nome">' +
              '<a class="link-cliente" href="cliente.html?c=' + encodeURIComponent(p.cliente) + '">' +
                esc(p.cliente) + '</a>' +
              '<span class="fila__quando">' + data(p.criado_em) + ' às ' + hora(p.criado_em) + '</span>' +
            '</p>' +
            '<p class="fila__produto">' + esc(p.produto) +
              (Number(p.quantidade) > 1 ? ' · <b>' + p.quantidade + ' un.</b>' : '') +
              (Number(p.valor) ? ' · <b>' + moeda(p.valor) + '</b>' : '') +
            '</p>' +
            /* o cupom que o cliente usou no carrinho (24/09/2026) */
            (p.cupom ? '<p class="fila__cupom">Cupom <b>' + esc(p.cupom) + '</b>' +
              (regraDoCupom(p.cupom) ? ' · ' + esc(textoDoCupom(regraDoCupom(p.cupom))) : '') +
            '</p>' : '') +
            (p.endereco ? '<p class="fila__endereco">📍 ' + esc(p.endereco) + '</p>' : '') +
            (zap
              ? '<a class="fila__zap" href="' + zap + '" target="_blank" rel="noopener">' +
                  'Abrir conversa no WhatsApp</a>'
              : '') +
          '</div>' +
          '<div class="fila__acoes">' +
            '<button class="btn-acao btn-acao--ok" type="button" data-confirmar="' + esc(p.id) + '">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>' +
              'Confirmar' +
            '</button>' +
            '<button class="btn-acao btn-acao--no" type="button" data-excluir="' + esc(p.id) + '">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
              'Excluir' +
            '</button>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  /* ---------- tabelas ---------- */

  function dentroDoPeriodo(p, periodo) {
    if (periodo === 'tudo') return true;
    var quando = new Date(p.confirmado_em || p.criado_em);
    var hoje = new Date();

    if (periodo === 'hoje') return quando.toDateString() === hoje.toDateString();
    if (periodo === 'semana') return (hoje - quando) <= 7 * 24 * 60 * 60 * 1000;
    if (periodo === 'mes') {
      return quando.getMonth() === hoje.getMonth() && quando.getFullYear() === hoje.getFullYear();
    }
    return true;
  }

  function pintarPedidos() {
    var corpo = document.getElementById('tabela-pedidos');
    var vazio = document.getElementById('pedidos-vazio');
    var busca = U.normalizar(estado.buscaVendas);

    var lista = confirmados(estado.pedidos)
      .filter(function (p) { return dentroDoPeriodo(p, estado.periodo); })
      .filter(function (p) {
        if (!estado.vendedor) return true;
        return String(p.vendedor || '') === estado.vendedor;
      })
      .filter(function (p) {
        if (!busca) return true;
        return U.normalizar([p.cliente, p.produto, p.pagamento, p.vendedor].join(' ')).indexOf(busca) !== -1;
      })
      .sort(function (a, b) { return new Date(b.criado_em) - new Date(a.criado_em); });

    document.getElementById('vendas-resumo').textContent = lista.length
      ? lista.length + (lista.length === 1 ? ' venda · ' : ' vendas · ') +
        moeda(lista.reduce(function (t, p) { return t + Number(p.valor || 0); }, 0))
      : '';

    if (!lista.length) {
      corpo.innerHTML = '';
      vazio.hidden = false;
      vazio.textContent = (estado.buscaVendas || estado.periodo !== 'tudo' || estado.vendedor)
        ? 'Nenhuma venda encontrada com esse filtro.'
        : 'Nenhuma venda confirmada ainda.';
      return;
    }
    vazio.hidden = true;

    pintarVerMais('vendas-mais', lista.length, estado.limiteVendas, function () {
      estado.limiteVendas += PASSO_LISTA;
      pintarPedidos();
    });

    corpo.innerHTML = lista.slice(0, estado.limiteVendas).map(function (p) {
      var st = String(p.status || '').toLowerCase();
      var classe = st === 'enviado' ? 'enviado' : 'pago';
      var rotulo = st === 'enviado' ? 'enviado' : 'confirmado';

      return '<tr>' +
        '<td class="col-titulo"><b><a class="link-cliente" href="cliente.html?c=' +
            encodeURIComponent(p.cliente) + '">' + esc(p.cliente) + '</a></b>' +
          (p.pagamento ? '<span class="sub">' + esc(p.pagamento) + '</span>' : '') + '</td>' +
        '<td data-rotulo="Produto">' + esc(p.produto) +
          (Number(p.quantidade) > 1 ? ' <span class="sub">' + p.quantidade + ' un.</span>' : '') + '</td>' +
        '<td data-rotulo="Valor" class="col-num num">' + moeda(p.valor) + '</td>' +
        '<td data-rotulo="Status"><span class="tag tag--' + classe + '">' + rotulo + '</span></td>' +
        '<td data-rotulo="Data">' + data(p.confirmado_em || p.criado_em) + '</td>' +
        '<td class="col-num acoes-linha">' +
          (p.endereco
            ? '<button class="btn-mini" type="button" data-etiqueta="' + esc(p.id) + '">etiqueta</button>'
            : '') +
          '<button class="btn-mini" type="button" data-editar-venda="' + esc(p.id) + '">editar</button>' +
          '<button class="btn-mini" type="button" data-excluir-venda="' + esc(p.id) + '">excluir</button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  /** Mostra "sem controle" quando o produto não usa estoque. */
  function rotuloEstoque(p) {
    if (p.estoque === null || p.estoque === undefined || p.estoque === '') {
      return '<span class="sub">sem controle</span>';
    }
    var n = Number(p.estoque);
    return n + ' un.' + (n === 0 ? ' <span class="tag tag--promo">acabou</span>' : '');
  }

  function pintarProdutos() {
    var corpo = document.getElementById('tabela-produtos');
    var vazio = document.getElementById('produtos-vazio');
    var busca = U.normalizar(estado.buscaProdutos);

    var lista = estado.produtos.filter(function (p) {
      if (!busca) return true;
      return U.normalizar([p.nome, p.categoria].join(' ')).indexOf(busca) !== -1;
    });

    if (!lista.length) {
      corpo.innerHTML = '';
      vazio.hidden = false;
      vazio.textContent = busca ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.';
      return;
    }
    vazio.hidden = true;

    pintarVerMais('produtos-mais', lista.length, estado.limiteProdutos, function () {
      estado.limiteProdutos += PASSO_LISTA;
      pintarProdutos();
    });

    corpo.innerHTML = lista.slice(0, estado.limiteProdutos).map(function (p) {
      var custo = Number(p.custo || 0);
      var venda = Number(p.preco || p.venda || 0);
      var margem = venda - custo;
      var temControle = !(p.estoque === null || p.estoque === undefined || p.estoque === '');
      var estoque = Number(p.estoque || 0);
      var alerta = temControle && estoque <= 10 ? ' class="alerta-estoque"' : '';
      var inativo = p.ativo === false;

      return '<tr' + (inativo ? ' class="linha-inativa"' : '') + '>' +
        '<td class="col-titulo"><b>' + esc(p.nome) + '</b>' +
          (Number(p.antes) ? ' <span class="tag tag--promo">promo</span>' : '') +
          (inativo ? ' <span class="tag tag--off">fora do site</span>' : '') + '</td>' +
        '<td data-rotulo="Categoria">' + esc(p.categoria) + '</td>' +
        '<td data-rotulo="Custo" class="col-num custo">' + (custo ? moeda(custo) : '—') + '</td>' +
        '<td data-rotulo="Venda" class="col-num num">' + moeda(venda) + '</td>' +
        '<td data-rotulo="Margem" class="col-num margem">' + (custo ? moeda(margem) : '—') + '</td>' +
        '<td data-rotulo="Estoque"' + alerta + '>' + rotuloEstoque(p) + '</td>' +
        '<td class="col-num"><button class="btn-mini" type="button" data-editar-produto="' + esc(p.id) + '">editar</button></td>' +
        '</tr>';
    }).join('');
  }

  /**
   * O filtro por vendedor só faz sentido quando mais de uma pessoa
   * já vendeu — com uma pessoa só, é caixa a mais na tela sem uso.
   */
  function pintarVendedores() {
    var caixa = document.getElementById('caixa-vendedor');
    var select = document.getElementById('vendedor-vendas');
    if (!caixa || !select) return;

    var nomes = [];
    confirmados(estado.pedidos).forEach(function (p) {
      var nome = String(p.vendedor || '').trim();
      if (nome && nomes.indexOf(nome) === -1) nomes.push(nome);
    });
    nomes.sort();

    caixa.hidden = nomes.length < 2;
    if (caixa.hidden) {
      if (estado.vendedor) { estado.vendedor = ''; select.value = ''; }
      return;
    }

    var escolhido = estado.vendedor;
    select.innerHTML = '<option value="">Todo mundo</option>' +
      nomes.map(function (n) {
        return '<option value="' + esc(n) + '">' + esc(n) + '</option>';
      }).join('');

    /* se quem estava filtrado sumiu da lista, volta para todo mundo */
    select.value = nomes.indexOf(escolhido) !== -1 ? escolhido : '';
    estado.vendedor = select.value;
  }

  function pintarTudo() {
    pintarKpis();
    pintarVendedores();
    pintarFila();
    pintarPedidos();
    pintarProdutos();
  }

  /* ---------- os cupons ----------
   *
   * O pedido que vem do site guarda só o CÓDIGO do cupom (24/09/2026). A
   * regra — quanto ele desconta — mora em `pf_cupons`, que a equipe lê.
   * Ler aqui serve para duas coisas: escrever a regra ao lado do pedido
   * e já descontar na sugestão de valor da confirmação. */
  var cupons = {};

  async function carregarCupons() {
    try {
      var sb = window.PharmaFitAuth && window.PharmaFitAuth.cliente();
      if (!sb) return;
      var r = await sb.from('pf_cupons').select('codigo,tipo,valor');
      if (r.error || !r.data) return;
      cupons = {};
      r.data.forEach(function (x) { cupons[x.codigo] = x; });
    } catch (e) { /* sem a regra, o código aparece sozinho */ }
  }

  function regraDoCupom(codigo) { return codigo ? cupons[codigo] || null : null; }

  function textoDoCupom(r) {
    return r.tipo === 'porcentagem'
      ? String(Number(r.valor)).replace('.', ',') + '% de desconto'
      : moeda(r.valor) + ' de desconto no pedido todo';
  }

  async function recarregar() {
    await carregarCupons();
    var d = await Dados.listarPainel();
    estado.pedidos = d.pedidos;
    estado.produtos = d.produtos;
    estado.exemplo = d.exemplo;
    d.pedidos.forEach(function (p) { vistos[p.id] = true; });
    pintarTudo();
  }

  /* ---------- lançamento manual ---------- */

  function abrirModal(aberto) {
    document.getElementById('modal-pedido').classList.toggle('is-open', aberto);
    if (aberto) {
      var opcoes = estado.produtos.map(function (p) {
        return '<option value="' + esc(p.nome) + '" data-preco="' + Number(p.preco || 0) + '">' + esc(p.nome) + '</option>';
      }).join('');
      document.getElementById('np-produto').innerHTML = '<option value="">Selecione…</option>' + opcoes;
      document.getElementById('np-cliente').value = '';
      document.getElementById('np-telefone').value = '';
      document.getElementById('np-valor').value = '';
      setTimeout(function () { document.getElementById('np-cliente').focus(); }, 60);
    }
  }

  function ligarModal() {
    document.getElementById('novo-pedido').addEventListener('click', function () { abrirModal(true); });

    /* Chegando por `index.html#novo`, o formulário abre sozinho.
       É por aqui que o botão "+" do painel novo entra: sem isto ele
       levaria para a fila e não abriria nada, e botão que não faz o que
       promete é pior que botão que não existe. */
    /* Chegando por `index.html?pedido=ID`, a fila rola até aquele pedido
       e o destaca. A lista do painel novo manda esse endereço; sem isto,
       tocar em qualquer linha cairia no topo da fila e a pessoa teria de
       procurar na mão o pedido que ela acabou de tocar. */
    var quero = new URLSearchParams(location.search).get('pedido');
    if (quero) {
      /* A fila é desenhada depois; espera o elemento existir. */
      var tentativas = 0;
      var procurar = setInterval(function () {
        var alvo = document.querySelector('.fila__item[data-id="' + quero.replace(/"/g, '') + '"]');
        if (alvo) {
          clearInterval(procurar);
          alvo.classList.add('is-alvo');
          alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (++tentativas > 40) {
          clearInterval(procurar);
        }
      }, 120);
    }

    if (location.hash === '#novo') {
      abrirModal(true);
      /* Tira o #novo do endereço para um F5 não reabrir o formulário
         sem a pessoa ter pedido. */
      history.replaceState(null, '', location.pathname + location.search);
    }
    document.querySelectorAll('[data-fechar-modal]').forEach(function (el) {
      el.addEventListener('click', function () { abrirModal(false); });
    });

    document.getElementById('np-produto').addEventListener('change', function () {
      var opt = this.options[this.selectedIndex];
      var preco = opt && opt.getAttribute('data-preco');
      if (preco && !document.getElementById('np-valor').value) {
        document.getElementById('np-valor').value = preco;
      }
    });

    document.getElementById('form-pedido').addEventListener('submit', async function (e) {
      e.preventDefault();
      var botao = document.getElementById('np-salvar');
      botao.disabled = true;

      var r = await Dados.criarPedido({
        cliente: document.getElementById('np-cliente').value,
        telefone: document.getElementById('np-telefone').value,
        produto: document.getElementById('np-produto').value,
        valor: document.getElementById('np-valor').value,
        origem: 'painel'
      });

      botao.disabled = false;

      if (!r.ok) { toast(r.erro || 'Não foi possível lançar o pedido.'); return; }

      abrirModal(false);
      toast('Pedido lançado. Confirme quando a venda fechar.');
      await recarregar();
    });
  }

  /* ---------- confirmação com valor da venda ---------- */

  var pedidoEmConfirmacao = null;

  /* O VALOR SUGERIDO TEM DE CONTAR A QUANTIDADE.
   *
   * Isto sugeria `produto.preco` — o preço de UMA unidade — mesmo num
   * pedido de duas, cinco ou dez. E o campo abre já preenchido com a
   * sugestão, selecionada, para quem quiser só apertar Enter. Quem
   * fizesse isso num pedido de 2 registrava R$ 1.099 numa venda de
   * R$ 2.198: metade do faturamento, para sempre, sem nada na tela
   * dizendo que estava errado. E o Brian pediu o preço de compra
   * justamente "pra ver o lucro e a receita" — receita pela metade
   * estraga exatamente aquilo.
   *
   * Medido em 17/09/2026, com um pedido de 2 unidades do Tirzec Pen:
   * sugeria 1099, e o certo era 2198.
   *
   * E conta a FAIXA DE ATACADO quando o produto tem: acima de certa
   * quantidade o preço por unidade cai, e multiplicar o preço de
   * varejo por dez erraria para o outro lado, a mais. As faixas moram
   * no catálogo do site (`catalogo.js`), que esta página já carrega.
   *
   * Continua sendo SUGESTÃO: o que vale é o valor fechado na conversa,
   * e o campo segue aberto para mudar. */
  function precoSugerido(pedido) {
    var qtd = Math.max(1, Number(pedido.quantidade || 1));

    var produto = estado.produtos.filter(function (p) { return p.nome === pedido.produto; })[0];
    var unitario = produto ? Number(produto.preco || 0) : 0;

    var noCatalogo = (window.PHARMAFIT_CATALOGO || []).filter(function (p) {
      return p.nome === pedido.produto;
    })[0];
    var faixas = (noCatalogo && noCatalogo.atacado) || [];
    for (var i = 0; i < faixas.length; i++) {
      var de = Number(faixas[i].de || 1);
      var ate = faixas[i].ate ? Number(faixas[i].ate) : Infinity;
      if (qtd >= de && qtd <= ate && Number(faixas[i].preco) > 0) {
        unitario = Number(faixas[i].preco);
        break;
      }
    }

    var total = unitario * qtd;

    /* O CUPOM DE PORCENTAGEM ENTRA NA SUGESTÃO. Porcentagem vale linha a
       linha: 10% do pedido é 10% de cada produto dele. O de VALOR FIXO
       não entra — ele é do pedido inteiro, e um pedido de três produtos
       vira três linhas aqui; descontar em cada uma daria o triplo. Esse
       a caixa só avisa, e quem confirma desconta uma vez. */
    var regra = regraDoCupom(pedido.cupom);
    if (regra && regra.tipo === 'porcentagem' && total > 0) {
      total = Math.round(total * (1 - Number(regra.valor) / 100) * 100) / 100;
    }
    return total;
  }

  function abrirValor(pedido) {
    pedidoEmConfirmacao = pedido;

    var sugestao = precoSugerido(pedido);

    document.getElementById('cv-quem').textContent = pedido.cliente || 'cliente';
    /* A QUANTIDADE APARECE AQUI, junto do produto. Sem ela a caixa
       mostrava só "Tirzec Pen 15 mg" e um valor, e quem conferisse não
       tinha como saber se aquele número era de uma unidade ou de dez —
       nem perceber que a sugestão estava errada, como estava. */
    var qtd = Math.max(1, Number(pedido.quantidade || 1));
    document.getElementById('cv-produto').textContent =
      (pedido.produto || '') + (qtd > 1 ? ' · ' + qtd + ' unidades' : '');
    var campo = document.getElementById('cv-valor');
    campo.value = Number(pedido.valor) > 0 ? Number(pedido.valor) : (sugestao > 0 ? sugestao : '');

    var elCupom = document.getElementById('cv-cupom');
    if (elCupom) {
      var regra = regraDoCupom(pedido.cupom);
      elCupom.hidden = !pedido.cupom;
      elCupom.textContent = !pedido.cupom ? '' :
        !regra ? 'O cliente usou o cupom ' + pedido.cupom + ', que não existe mais no painel. ' +
                 'Confira o desconto combinado no WhatsApp.' :
        regra.tipo === 'porcentagem'
          ? 'Cupom ' + pedido.cupom + ': ' + textoDoCupom(regra) + ' — já descontado no valor sugerido.'
          : 'Cupom ' + pedido.cupom + ': ' + textoDoCupom(regra) + '. Se o pedido tiver mais de um ' +
            'produto, desconte só em um deles.';
    }

    var pag = document.getElementById('cv-pagamento');
    pag.innerHTML = (cfg.PAGAMENTOS || ['Pix']).map(function (m) {
      return '<option value="' + m + '">' + m + '</option>';
    }).join('');
    document.getElementById('modal-valor').classList.add('is-open');
    setTimeout(function () { campo.focus(); campo.select(); }, 60);
  }

  function fecharValor() {
    document.getElementById('modal-valor').classList.remove('is-open');
    pedidoEmConfirmacao = null;
  }

  function ligarValor() {
    document.querySelectorAll('[data-fechar-valor]').forEach(function (el) {
      el.addEventListener('click', fecharValor);
    });

    document.getElementById('form-valor').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!pedidoEmConfirmacao) return;

      var valor = Number(document.getElementById('cv-valor').value || 0);
      if (!(valor > 0)) { toast('Informe o valor fechado com o cliente.'); return; }

      var botao = document.getElementById('cv-salvar');
      var nome = pedidoEmConfirmacao.cliente || 'cliente';
      botao.disabled = true;

      var produto = estado.produtos.filter(function (x) {
        return x.nome === pedidoEmConfirmacao.produto;
      })[0];

      var r = await Dados.confirmarPedido(pedidoEmConfirmacao.id, {
        valor: valor,
        custo: produto ? Number(produto.custo || 0) : Number(pedidoEmConfirmacao.custo || 0),
        pagamento: document.getElementById('cv-pagamento').value,
        vendedor: usuarioAtual,
        produto: pedidoEmConfirmacao.produto,
        quantidade: Number(pedidoEmConfirmacao.quantidade || 1)
      });
      botao.disabled = false;

      if (!r.ok) { toast(r.erro || 'Não foi possível confirmar.'); return; }

      /* guarda antes de fechar: fecharValor() limpa pedidoEmConfirmacao */
      var pedidoConfirmado = pedidoEmConfirmacao;
      fecharValor();

      var venda = {
        id: pedidoConfirmado.id,
        criado_em: pedidoConfirmado.criado_em,
        confirmado_em: new Date().toISOString(),
        cliente: nome,
        telefone: pedidoConfirmado.telefone,
        produto: pedidoConfirmado.produto,
        quantidade: Number(pedidoConfirmado.quantidade || 1),
        endereco: pedidoConfirmado.endereco,
        valor: valor,
        pagamento: document.getElementById('cv-pagamento').value
      };

      toast('Venda de ' + nome + ' confirmada por ' + moeda(valor) + '.');
      abrirComprovante(venda, r.estoque);
      await recarregar();
    });
  }

  /* ---------- comprovante da venda ---------- */

  /**
   * Monta o texto que vai para o cliente. Nada é enviado sozinho:
   * o WhatsApp abre com a mensagem pronta e quem envia é você.
   */
  function textoComprovante(v) {
    var linhas = [
      'Pedido confirmado — Pharma Fit',
      '',
      'Cliente: ' + v.cliente,
      'Produto: ' + v.produto
    ];

    if (Number(v.quantidade) > 1) linhas.push('Quantidade: ' + v.quantidade);

    linhas.push('Valor: ' + moeda(v.valor));
    if (v.pagamento) linhas.push('Pagamento: ' + v.pagamento);
    linhas.push('Data: ' + data(new Date()));

    if (v.endereco) linhas.push('', 'Entrega: ' + v.endereco);

    linhas.push('', 'Qualquer dúvida é só chamar por aqui. Obrigado pela confiança!');
    return linhas.join('\n');
  }

  var vendaDoComprovante = null;

  function abrirComprovante(venda, estoque) {
    var texto = textoComprovante(venda);
    vendaDoComprovante = venda;
    document.getElementById('cp-etiqueta').hidden = !String(venda.endereco || '').trim();
    var link = U.linkZap(venda.telefone, texto);

    document.getElementById('cp-resumo').innerHTML = link
      ? 'Mande o comprovante para <b>' + esc(venda.cliente) + '</b>. ' +
        'Você confere a mensagem antes de enviar.'
      : '<b>' + esc(venda.cliente) + '</b> não tem WhatsApp cadastrado. ' +
        'Copie o texto e mande pelo canal que vocês usam.';

    var aviso = document.getElementById('cp-estoque');
    if (estoque && estoque.controlado) {
      aviso.hidden = false;
      aviso.textContent = estoque.acabou
        ? 'Atenção: o estoque de ' + estoque.produto + ' zerou.'
        : 'Restam ' + estoque.restante + ' unidades de ' + estoque.produto + '.';
      aviso.classList.toggle('comprovante__estoque--alerta', !!estoque.acabou);
    } else {
      aviso.hidden = true;
    }

    document.getElementById('cp-texto').textContent = texto;

    var enviar = document.getElementById('cp-enviar');
    enviar.hidden = !link;
    if (link) enviar.href = link;

    document.getElementById('modal-comprovante').classList.add('is-open');
  }

  function ligarComprovante() {
    document.querySelectorAll('[data-fechar-comprovante]').forEach(function (el) {
      el.addEventListener('click', function () {
        document.getElementById('modal-comprovante').classList.remove('is-open');
      });
    });

    document.getElementById('cp-copiar').addEventListener('click', function () {
      var texto = document.getElementById('cp-texto').textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function () {
          toast('Comprovante copiado.');
        }, function () { toast('Não foi possível copiar. Selecione o texto na tela.'); });
      } else {
        toast('Selecione o texto na tela para copiar.');
      }
    });

    document.getElementById('cp-enviar').addEventListener('click', function () {
      document.getElementById('modal-comprovante').classList.remove('is-open');
    });

    document.getElementById('cp-etiqueta').addEventListener('click', function () {
      document.getElementById('modal-comprovante').classList.remove('is-open');
      imprimirEtiqueta(vendaDoComprovante);
    });
  }

  /* ---------- etiqueta de envio ---------- */

  /**
   * Monta a etiqueta e manda imprimir. De propósito, o nome do
   * produto não vai na etiqueta: o que a pessoa comprou não
   * precisa ficar escrito do lado de fora da caixa.
   */
  /** 559285904669 -> "+55 (92) 8590-4669" */
  function telefoneLegivel(numero) {
    var n = U.digitos(numero);
    var m = n.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
    return m ? '+' + m[1] + ' (' + m[2] + ') ' + m[3] + '-' + m[4] : String(numero || '');
  }

  function imprimirEtiqueta(pedido) {
    if (!pedido) return;

    if (!String(pedido.endereco || '').trim()) {
      toast('Esta venda não tem endereço de entrega. Edite a venda para incluir.');
      return;
    }

    document.getElementById('et-nome').textContent = pedido.cliente || '';
    document.getElementById('et-endereco').textContent = pedido.endereco;
    document.getElementById('et-contato').textContent = pedido.telefone
      ? 'Tel.: ' + pedido.telefone : '';
    document.getElementById('et-zap').textContent = cfg.WHATSAPP
      ? 'WhatsApp ' + telefoneLegivel(cfg.WHATSAPP) : '';
    document.getElementById('et-ref').textContent =
      'Pedido ' + String(pedido.id).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() + ' · ' +
      data(pedido.confirmado_em || pedido.criado_em);

    document.body.classList.add('imprimindo-etiqueta');

    function limpar() {
      document.body.classList.remove('imprimindo-etiqueta');
      window.removeEventListener('afterprint', limpar);
    }
    window.addEventListener('afterprint', limpar);
    /* alguns navegadores não disparam afterprint */
    setTimeout(limpar, 4000);

    window.print();
  }

  /* ---------- ações da fila ---------- */

  function ligarAcoes() {
    document.getElementById('fila').addEventListener('click', async function (e) {
      var btnOk = e.target.closest('[data-confirmar]');
      var btnNo = e.target.closest('[data-excluir]');
      if (!btnOk && !btnNo) return;

      var id = (btnOk || btnNo).getAttribute(btnOk ? 'data-confirmar' : 'data-excluir');
      var pedido = estado.pedidos.filter(function (p) { return String(p.id) === String(id); })[0] || {};

      if (btnOk) {
        /* o valor e o meio de pagamento são fechados na conversa */
        abrirValor(pedido);
        return;
      } else {
        var certeza = await U.confirmar({
          titulo: 'Excluir pedido',
          texto: 'O pedido de ' + (pedido.cliente || 'cliente') + ' será removido da fila.',
          confirmar: 'Excluir', perigo: true
        });
        if (!certeza) return;
        btnNo.disabled = true;
        var rx = await Dados.excluirPedido(id);
        if (!rx.ok) { btnNo.disabled = false; toast(rx.erro || 'Não foi possível excluir.'); return; }
        toast('Pedido excluído.');
      }

      await recarregar();
    });
  }

  /* ---------- editar venda confirmada ---------- */

  var vendaEmEdicao = null;

  function abrirVenda(venda) {
    vendaEmEdicao = venda;
    document.getElementById('ev-cliente').value = venda.cliente || '';
    document.getElementById('ev-valor').value = Number(venda.valor || 0);
    document.getElementById('ev-produto').textContent = venda.produto || '';

    var pag = document.getElementById('ev-pagamento');
    pag.innerHTML = (cfg.PAGAMENTOS || ['Pix']).map(function (m) {
      return '<option value="' + m + '"' + (m === venda.pagamento ? ' selected' : '') + '>' + m + '</option>';
    }).join('');

    var st = document.getElementById('ev-status');
    st.value = String(venda.status || 'confirmado').toLowerCase() === 'enviado' ? 'enviado' : 'confirmado';

    document.getElementById('modal-venda').classList.add('is-open');
    setTimeout(function () { document.getElementById('ev-valor').focus(); }, 60);
  }

  function ligarVenda() {
    document.querySelectorAll('[data-fechar-venda]').forEach(function (el) {
      el.addEventListener('click', function () {
        document.getElementById('modal-venda').classList.remove('is-open');
      });
    });

    document.getElementById('tabela-pedidos').addEventListener('click', async function (e) {
      var editar = e.target.closest('[data-editar-venda]');
      var excluir = e.target.closest('[data-excluir-venda]');
      var etiqueta = e.target.closest('[data-etiqueta]');
      if (!editar && !excluir && !etiqueta) return;

      var alvo = editar || excluir || etiqueta;
      var attr = editar ? 'data-editar-venda' : (excluir ? 'data-excluir-venda' : 'data-etiqueta');
      var id = alvo.getAttribute(attr);
      var venda = estado.pedidos.filter(function (p) { return String(p.id) === String(id); })[0];
      if (!venda) return;

      if (etiqueta) { imprimirEtiqueta(venda); return; }
      if (editar) { abrirVenda(venda); return; }

      var certeza = await U.confirmar({
        titulo: 'Excluir venda',
        texto: 'A venda de ' + (venda.cliente || 'cliente') + ' (' + moeda(venda.valor) +
               ') sai do faturamento e dos relatórios.',
        confirmar: 'Excluir', perigo: true
      });
      if (!certeza) return;

      var r = await Dados.excluirPedido(id);
      if (!r.ok) { toast(r.erro || 'Não foi possível excluir.'); return; }
      toast('Venda excluída.');
      await recarregar();
    });

    document.getElementById('form-venda').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!vendaEmEdicao) return;

      var valor = Number(document.getElementById('ev-valor').value || 0);
      if (!(valor > 0)) { toast('Informe o valor da venda.'); return; }

      var botao = document.getElementById('ev-salvar');
      botao.disabled = true;

      var r = await Dados.atualizar('pedidos', vendaEmEdicao.id, {
        cliente: document.getElementById('ev-cliente').value.trim() || vendaEmEdicao.cliente,
        valor: valor,
        pagamento: document.getElementById('ev-pagamento').value,
        status: document.getElementById('ev-status').value
      });

      botao.disabled = false;
      if (!r.ok) { toast(r.erro || 'Não foi possível salvar.'); return; }

      document.getElementById('modal-venda').classList.remove('is-open');
      toast('Venda atualizada.');
      await recarregar();
    });
  }

  /* ---------- filtros e busca ---------- */

  function ligarFiltros() {
    var busca = document.getElementById('busca-vendas');
    busca.addEventListener('input', U.debounce(function () {
      estado.buscaVendas = busca.value;
      estado.limiteVendas = PASSO_LISTA;
      pintarPedidos();
    }, 200));

    document.getElementById('periodo-vendas').addEventListener('change', function () {
      estado.periodo = this.value;
      estado.limiteVendas = PASSO_LISTA;
      pintarPedidos();
    });

    document.getElementById('vendedor-vendas').addEventListener('change', function () {
      estado.vendedor = this.value;
      estado.limiteVendas = PASSO_LISTA;
      pintarPedidos();
    });

    var buscaProd = document.getElementById('busca-produtos');
    buscaProd.addEventListener('input', U.debounce(function () {
      estado.buscaProdutos = buscaProd.value;
      estado.limiteProdutos = PASSO_LISTA;
      pintarProdutos();
    }, 200));
  }

  /* ---------- editar produto ---------- */

  var produtoEmEdicao = null;

  function abrirProduto(produto) {
    produtoEmEdicao = produto;
    var novo = !produto.id;

    document.getElementById('ep-titulo').textContent = novo ? 'Novo produto' : 'Editar produto';
    document.getElementById('ep-nome-campo').hidden = !novo;
    document.getElementById('ep-nome').textContent = novo ? '' : produto.nome;
    document.getElementById('ep-nome').hidden = novo;
    document.getElementById('ep-nome-input').value = produto.nome || '';
    document.getElementById('ep-categoria').value = produto.categoria || 'Tirzepatida';
    document.getElementById('ep-ativo').checked = produto.ativo !== false;
    document.getElementById('ep-excluir').hidden = novo;
    document.getElementById('ep-custo').value = Number(produto.custo || 0);
    document.getElementById('ep-venda').value = Number(produto.preco || produto.venda || 0);
    document.getElementById('ep-antes').value = Number(produto.antes || 0);
    document.getElementById('ep-estoque').value =
      (produto.estoque === null || produto.estoque === undefined || produto.estoque === '') ? '' : Number(produto.estoque);
    document.getElementById('modal-produto').classList.add('is-open');
    setTimeout(function () { document.getElementById('ep-estoque').focus(); }, 60);
  }

  function ligarProduto() {
    document.querySelectorAll('[data-fechar-produto]').forEach(function (el) {
      el.addEventListener('click', function () {
        document.getElementById('modal-produto').classList.remove('is-open');
      });
    });

    document.getElementById('tabela-produtos').addEventListener('click', function (e) {
      var botao = e.target.closest('[data-editar-produto]');
      if (!botao) return;
      var id = botao.getAttribute('data-editar-produto');
      var produto = estado.produtos.filter(function (p) { return String(p.id) === String(id); })[0];
      if (produto) abrirProduto(produto);
    });

    function produtoEmBranco() {
      abrirProduto({ nome: '', categoria: 'Tirzepatida', custo: 0, preco: 0, antes: 0, estoque: null, ativo: true });
    }

    document.getElementById('novo-produto').addEventListener('click', produtoEmBranco);

    /* Os dois atalhos que a tela de Produtos do painel novo usa.
       Sem eles, o "+" e o botão de editar de lá levariam para esta
       página e não abririam nada — e botão que não faz o que promete é
       pior que botão que não existe. */
    if (location.hash === '#novo-produto') {
      produtoEmBranco();
      history.replaceState(null, '', location.pathname + location.search);
    }

    var queroProduto = new URLSearchParams(location.search).get('produto');
    if (queroProduto) {
      /* Espera os produtos chegarem do banco. Este trecho roda na
         montagem da página, ANTES da lista existir — na primeira versão
         eu lia `estado.produtos` aqui e ela estava vazia, então o link
         de editar não abria nada e não dava erro nenhum. */
      var voltas = 0;
      var esperar = setInterval(function () {
        var achado = (estado.produtos || []).filter(function (p) {
          return String(p.id) === String(queroProduto);
        })[0];
        if (achado) {
          clearInterval(esperar);
          abrirProduto(achado);
        } else if (++voltas > 40) {
          clearInterval(esperar);
        }
      }, 120);
    }

    document.getElementById('ep-excluir').addEventListener('click', async function () {
      if (!produtoEmEdicao || !produtoEmEdicao.id) return;

      var certeza = await U.confirmar({
        titulo: 'Excluir produto',
        texto: produtoEmEdicao.nome + ' sai do site e do painel. As vendas já feitas continuam nos relatórios.',
        confirmar: 'Excluir', perigo: true
      });
      if (!certeza) return;

      var r = await Dados.excluir('produtos', produtoEmEdicao.id);
      if (!r.ok) { toast(r.erro || 'Não foi possível excluir.'); return; }

      document.getElementById('modal-produto').classList.remove('is-open');
      toast('Produto excluído.');
      await recarregar();
    });

    document.getElementById('form-produto').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!produtoEmEdicao) return;

      var estoqueTexto = document.getElementById('ep-estoque').value.trim();

      var botao = document.getElementById('ep-salvar');
      botao.disabled = true;

      var campos = {
        custo: Number(document.getElementById('ep-custo').value || 0),
        preco: Number(document.getElementById('ep-venda').value || 0),
        antes: Number(document.getElementById('ep-antes').value || 0),
        estoque: estoqueTexto === '' ? null : Number(estoqueTexto),
        categoria: document.getElementById('ep-categoria').value,
        ativo: document.getElementById('ep-ativo').checked
      };

      var r;
      if (produtoEmEdicao.id) {
        r = await Dados.salvarProduto(produtoEmEdicao.id, campos);
      } else {
        campos.nome = document.getElementById('ep-nome-input').value.trim();
        if (!campos.nome) { botao.disabled = false; toast('Dê um nome ao produto.'); return; }
        r = await Dados.inserir('produtos', campos);
      }

      botao.disabled = false;
      if (!r.ok) { toast(r.erro || 'Não foi possível salvar.'); return; }

      document.getElementById('modal-produto').classList.remove('is-open');
      toast((campos.nome || produtoEmEdicao.nome) + (produtoEmEdicao.id ? ' atualizado.' : ' cadastrado.'));
      await recarregar();
    });
  }

  /* ---------- notificações ---------- */

  function atualizarBotaoAviso() {
    var botao = document.getElementById('ativar-avisos');
    var estadoAviso = Avisos.estado();

    if (estadoAviso === 'indisponivel') { botao.hidden = true; return; }
    botao.hidden = false;

    if (estadoAviso === 'granted') {
      botao.textContent = 'Avisos ativados';
      botao.classList.add('is-ativo');
      botao.disabled = true;
    } else if (estadoAviso === 'denied') {
      botao.textContent = 'Avisos bloqueados';
      botao.disabled = true;
    } else {
      botao.textContent = 'Ativar avisos';
      botao.disabled = false;
    }
  }

  function ligarAvisos() {
    var botao = document.getElementById('ativar-avisos');
    atualizarBotaoAviso();

    botao.addEventListener('click', async function () {
      botao.disabled = true;
      var r = await Avisos.ativar();
      atualizarBotaoAviso();
      if (!r.ok) { toast(r.erro); return; }
      toast(r.aviso || 'Avisos de novo pedido ativados neste aparelho.');
      Avisos.novoPedido({ cliente: 'Tudo certo', produto: 'você será avisado a cada novo pedido' });
    });

    Dados.aoMudar(async function (evento) {
      if (evento.tipo === 'novo' && evento.pedido && !vistos[evento.pedido.id]) {
        vistos[evento.pedido.id] = true;
        Avisos.novoPedido(evento.pedido);
        toast('Novo pedido de ' + (evento.pedido.cliente || 'cliente') + '.');
      }
      await recarregar();
    });
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

    usuarioAtual = user.nome || user.email || 'Equipe';
    document.getElementById('usuario').textContent = usuarioAtual;
    window.PharmaFitMenu.montar(user);

    if (Auth.modo === 'demo') document.getElementById('banner-demo').hidden = false;

    document.getElementById('sair').addEventListener('click', async function () {
      await Auth.sair();
      location.replace('login.html');
    });

    try {
      await recarregar();
    } catch (e) {
      console.error('[Pharma Fit] falha ao carregar:', e);
      mostrarErro('Não conseguimos buscar os dados agora.', function () { location.reload(); });
      return;
    }

    if (estado.exemplo && Auth.modo !== 'demo') {
      document.getElementById('banner-dados').hidden = false;
    }

    ligarModal();
    ligarValor();
    ligarComprovante();
    ligarVenda();
    ligarFiltros();
    ligarProduto();
    ligarAcoes();
    ligarAvisos();

    mostrarConteudo();
  })();
})();
