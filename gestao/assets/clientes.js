/* =========================================================
   PHARMA FIT — tela de clientes e parceiros

   Reúne o que precisa de resposta da equipe: clientes parados,
   cadastros de representantes, pedidos de atacado e a fila de
   interesse por produtos em falta.
   ========================================================= */
(function () {
  'use strict';

  var U = window.PharmaFitUtil;
  var moeda = U.moeda, data = U.data, hora = U.hora, esc = U.esc, toast = U.toast;

  var Auth = window.PharmaFitAuth;
  var Dados = window.PharmaFitDados;
  var Analise = window.PharmaFitAnalise;
  var cfg = window.PHARMAFIT_CONFIG || {};

  var PASSO_LISTA = 10;

  var estado = {
    pedidos: [], representantes: [], orcamentos: [], espera: [], atendimentos: [],
    busca: '', limiteTodos: PASSO_LISTA
  };

  /** Link para a ficha individual do cliente. */
  function linkFicha(nome, conteudo) {
    return '<a class="link-cliente" href="cliente.html?c=' + encodeURIComponent(nome) + '">' +
      (conteudo || esc(nome)) + '</a>';
  }

  /** Filtra qualquer lista pelos campos que interessam. */
  function filtrar(lista, campos) {
    var termo = U.normalizar(estado.busca);
    if (!termo) return lista;
    return lista.filter(function (item) {
      return U.normalizar(campos.map(function (c) { return item[c]; }).join(' ')).indexOf(termo) !== -1;
    });
  }

  /* ---------- utilidades ---------- */

  function contador(id, n) {
    var el = document.getElementById(id);
    el.textContent = n;
    el.hidden = !n;
  }

  /** Botão que abre o WhatsApp já com a mensagem escrita. */
  function botaoZap(telefone, texto, rotulo) {
    var link = U.linkZap(telefone, texto);
    if (!link) return '<span class="sem-zap">sem WhatsApp</span>';
    return '<a class="btn-mini btn-mini--zap" target="_blank" rel="noopener" href="' + link + '">' +
      (rotulo || 'Chamar') + '</a>';
  }

  /* ---------- todos os clientes ---------- */

  /** Junta as compras confirmadas por cliente, do que mais gastou para o que menos. */
  function agruparClientes() {
    var mapa = {};

    Analise.confirmados(estado.pedidos).forEach(function (p) {
      var nome = String(p.cliente || '').trim();
      if (!nome) return;

      var chave = U.normalizar(nome);
      var quando = new Date(p.confirmado_em || p.criado_em || 0).getTime();

      if (!mapa[chave]) {
        mapa[chave] = { cliente: nome, telefone: '', total: 0, compras: 0, ultima: 0, produtos: [] };
      }
      var c = mapa[chave];
      c.total += Number(p.valor || 0);
      c.compras++;
      c.produtos.push(p.produto || '');
      if (p.telefone) c.telefone = p.telefone;
      if (quando > c.ultima) { c.ultima = quando; c.cliente = nome; }
    });

    var dias = cfg.DIAS_INATIVIDADE || 60;

    return Object.keys(mapa).map(function (k) {
      var c = mapa[k];
      c.diasParado = Math.floor((Date.now() - c.ultima) / (24 * 60 * 60 * 1000));
      c.parado = c.diasParado > dias;
      return c;
    }).sort(function (a, b) { return b.total - a.total; });
  }

  function pintarTodos() {
    var termo = U.normalizar(estado.busca);
    var lista = agruparClientes().filter(function (c) {
      if (!termo) return true;
      return U.normalizar(c.cliente + ' ' + c.produtos.join(' ')).indexOf(termo) !== -1;
    });

    contador('todos-contador', lista.length);

    var vazio = document.getElementById('todos-vazio');
    vazio.hidden = lista.length > 0;
    vazio.textContent = estado.busca
      ? 'Nenhum cliente encontrado com esse termo.'
      : 'Nenhuma venda confirmada ainda.';

    var mais = document.getElementById('todos-mais');
    if (lista.length <= estado.limiteTodos) {
      mais.hidden = true;
    } else {
      mais.hidden = false;
      mais.innerHTML = '<button class="btn-ver-mais" type="button">Ver mais ' +
        Math.min(PASSO_LISTA, lista.length - estado.limiteTodos) + ' de ' + lista.length + '</button>';
      mais.querySelector('button').onclick = function () {
        estado.limiteTodos += PASSO_LISTA;
        pintarTodos();
      };
    }

    document.getElementById('tabela-todos').innerHTML =
      lista.slice(0, estado.limiteTodos).map(function (c) {
        var situacao = c.parado
          ? '<span class="tag tag--off">parado há ' + c.diasParado + ' dias</span>'
          : (c.compras === 1 ? '<span class="tag tag--promo">primeira compra</span>'
                             : '<span class="tag tag--pago">ativo</span>');

        return '<tr>' +
          '<td class="col-titulo"><b>' + linkFicha(c.cliente) + '</b></td>' +
          '<td data-rotulo="Compras" class="col-num">' + c.compras + '</td>' +
          '<td data-rotulo="Total" class="col-num num">' + moeda(c.total) + '</td>' +
          '<td data-rotulo="Última compra">' + data(c.ultima) + '</td>' +
          '<td data-rotulo="Situação">' + situacao + '</td>' +
          '<td class="col-num"><a class="btn-mini" href="cliente.html?c=' +
            encodeURIComponent(c.cliente) + '">Ver ficha</a></td>' +
          '</tr>';
      }).join('');
  }

  /* ---------- clientes parados ---------- */

  function pintarInativos() {
    var dias = cfg.DIAS_INATIVIDADE || 60;
    var lista = filtrar(Analise.inativos(estado.pedidos, dias), ['cliente', 'ultimoProduto']);

    document.getElementById('inativos-regra').textContent =
      'Sem comprar há mais de ' + dias + ' dias';

    contador('inativos-contador', lista.length);
    document.getElementById('inativos-vazio').hidden = lista.length > 0;

    document.getElementById('tabela-inativos').innerHTML = lista.map(function (c) {
      var texto = 'Olá ' + c.cliente + '! Aqui é da Pharma Fit. Faz um tempo que não falamos — ' +
        'quer retomar seu acompanhamento?';
      return '<tr>' +
        '<td><b>' + linkFicha(c.cliente) + '</b></td>' +
        '<td>' + data(c.ultima) + '</td>' +
        '<td class="destaque-alerta">' + c.diasParado + ' dias</td>' +
        '<td class="col-num num">' + moeda(c.total) + '</td>' +
        '<td>' + esc(c.ultimoProduto) + '</td>' +
        '<td class="col-num">' + botaoZap(c.telefone, texto, 'Chamar no WhatsApp') + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---------- representantes ---------- */

  function pintarRepresentantes() {
    var lista = filtrar(estado.representantes, ['nome', 'tipo', 'cidade', 'telefone', 'email'])
      .slice().sort(function (a, b) {
      return new Date(b.criado_em) - new Date(a.criado_em);
    });

    contador('rep-contador', lista.filter(function (r) {
      return String(r.status || 'novo') === 'novo';
    }).length);
    document.getElementById('rep-vazio').hidden = lista.length > 0;

    document.getElementById('tabela-representantes').innerHTML = lista.map(function (r) {
      var st = String(r.status || 'novo');
      var texto = 'Olá ' + r.nome + '! Recebemos seu cadastro de parceria com a Pharma Fit. ' +
        'Podemos conversar sobre as condições?';

      return '<tr>' +
        '<td><b>' + esc(r.nome) + '</b>' +
          (r.documento ? '<span class="sub">' + esc(r.documento) + '</span>' : '') + '</td>' +
        '<td>' + esc(r.tipo) + '</td>' +
        '<td>' + esc(r.cidade || '—') + '</td>' +
        '<td>' + esc(r.telefone || r.email || '—') + '</td>' +
        '<td><span class="tag tag--' + (st === 'aprovado' ? 'pago' : 'pendente') + '">' + esc(st) + '</span></td>' +
        '<td class="col-num acoes-linha">' +
          botaoZap(r.telefone, texto) +
          (st === 'aprovado'
            ? '<button class="btn-mini" type="button" data-link-parceiro="' + esc(r.nome) + '">Copiar link</button>'
            : '<button class="btn-mini btn-mini--ok" type="button" data-aprovar-rep="' + esc(r.id) + '">Aprovar</button>') +
          '<button class="btn-mini" type="button" data-excluir-rep="' + esc(r.id) + '">Excluir</button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---------- orçamentos ---------- */

  function pintarOrcamentos() {
    var lista = filtrar(estado.orcamentos, ['cliente', 'empresa', 'produto', 'telefone'])
      .slice().sort(function (a, b) {
      return new Date(b.criado_em) - new Date(a.criado_em);
    });

    contador('orc-contador', lista.filter(function (o) {
      return String(o.status || 'novo') === 'novo';
    }).length);
    document.getElementById('orc-vazio').hidden = lista.length > 0;

    document.getElementById('tabela-orcamentos').innerHTML = lista.map(function (o) {
      var st = String(o.status || 'novo');
      var texto = 'Olá ' + o.cliente + '! Sobre seu orçamento de ' + o.quantidade + ' unidades de ' +
        o.produto + ': posso te passar as condições?';

      return '<tr>' +
        '<td><b>' + esc(o.cliente) + '</b>' +
          (o.empresa ? '<span class="sub">' + esc(o.empresa) + '</span>' : '') + '</td>' +
        '<td>' + esc(o.produto) + '</td>' +
        '<td class="col-num"><b>' + esc(o.quantidade) + '</b></td>' +
        '<td>' + esc(o.telefone || o.email || '—') + '</td>' +
        '<td><span class="tag tag--' + (st === 'respondido' ? 'pago' : 'pendente') + '">' + esc(st) + '</span></td>' +
        '<td class="col-num acoes-linha">' +
          botaoZap(o.telefone, texto) +
          (st !== 'respondido'
            ? '<button class="btn-mini btn-mini--ok" type="button" data-responder-orc="' + esc(o.id) + '">Respondido</button>'
            : '') +
          '<button class="btn-mini" type="button" data-excluir-orc="' + esc(o.id) + '">Excluir</button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---------- fila de interesse ---------- */

  function pintarEspera() {
    var porProduto = {};

    filtrar(estado.espera, ['nome', 'produto', 'telefone']).forEach(function (e) {
      var p = e.produto || 'Produto';
      if (!porProduto[p]) porProduto[p] = [];
      porProduto[p].push(e);
    });

    var chaves = Object.keys(porProduto).sort(function (a, b) {
      return porProduto[b].length - porProduto[a].length;
    });

    contador('esp-contador', estado.espera.length);
    document.getElementById('esp-vazio').hidden = estado.espera.length > 0;

    document.getElementById('fila-espera').innerHTML = chaves.map(function (nome) {
      var pessoas = porProduto[nome];

      var linhas = pessoas.map(function (e) {
        var texto = 'Olá ' + e.nome + '! O ' + nome + ' chegou na Pharma Fit. Quer garantir o seu?';
        return '<li class="espera__item">' +
          '<span><b>' + esc(e.nome) + '</b><span class="sub">' + data(e.criado_em) + '</span></span>' +
          '<span class="acoes-linha">' +
            botaoZap(e.telefone, texto, 'Avisar') +
            '<button class="btn-mini" type="button" data-excluir-esp="' + esc(e.id) + '">Remover</button>' +
          '</span>' +
        '</li>';
      }).join('');

      return '<div class="espera">' +
        '<p class="espera__titulo">' + esc(nome) +
          '<span class="contador contador--claro">' + pessoas.length + '</span></p>' +
        '<ul class="espera__lista">' + linhas + '</ul>' +
      '</div>';
    }).join('');
  }

  /* ---------- ações ---------- */

  /** Endereço da área do parceiro, já com o nome dele. */
  function linkParceiro(nome) {
    var base = location.href.replace(/gestao\/[^/]*$/, '');
    return base + 'parceiro.html?p=' + encodeURIComponent(nome);
  }

  function ligarAcoes() {
    document.addEventListener('click', async function (e) {
      var copiar = e.target.closest('[data-link-parceiro]');
      if (copiar) {
        var link = linkParceiro(copiar.getAttribute('data-link-parceiro'));
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(function () {
            toast('Link copiado. Mande para o parceiro no WhatsApp.');
          }, function () { toast(link); });
        } else {
          toast(link);
        }
        return;
      }

      var alvo = e.target.closest('[data-aprovar-rep],[data-excluir-rep],[data-responder-orc],' +
        '[data-excluir-orc],[data-excluir-esp],[data-atendido],[data-excluir-at]');
      if (!alvo) return;

      var acoes = [
        ['data-atendido',      function (id) { return Dados.atualizar('atendimentos', id, { status: 'atendido' }); }, 'Atendimento marcado como atendido.', false],
        ['data-excluir-at',    function (id) { return Dados.excluir('atendimentos', id); },                           'Pedido excluído.',        true],
        ['data-aprovar-rep',   function (id) { return Dados.atualizar('representantes', id, { status: 'aprovado' }); },   'Representante aprovado.', false],
        ['data-excluir-rep',   function (id) { return Dados.excluir('representantes', id); },                            'Cadastro excluído.',      true],
        ['data-responder-orc', function (id) { return Dados.atualizar('orcamentos', id, { status: 'respondido' }); },     'Orçamento respondido.',   false],
        ['data-excluir-orc',   function (id) { return Dados.excluir('orcamentos', id); },                                 'Orçamento excluído.',     true],
        ['data-excluir-esp',   function (id) { return Dados.excluir('espera', id); },                                     'Removido da fila.',       true]
      ];

      for (var i = 0; i < acoes.length; i++) {
        var attr = acoes[i][0];
        if (!alvo.hasAttribute(attr)) continue;
        if (acoes[i][3]) {
          var certeza = await U.confirmar({
            titulo: 'Confirmar exclusão',
            texto: 'Este registro será removido do painel.',
            confirmar: 'Excluir', perigo: true
          });
          if (!certeza) return;
        }

        alvo.disabled = true;
        var r = await acoes[i][1](alvo.getAttribute(attr));
        if (!r.ok) { alvo.disabled = false; toast(r.erro || 'Não foi possível concluir.'); return; }
        toast(acoes[i][2]);
        await recarregar();
        return;
      }
    });
  }

  /* OS PEDIDOS DE ATENDIMENTO, vindos do formulário do site.
   *
   * Eles chegam mesmo quando a conversa não começa: o site grava no
   * momento em que a pessoa toca no botão, antes de abrir o WhatsApp. É
   * esse o caso que estava se perdendo — preencheu tudo, desistiu de
   * mandar a mensagem, e ninguém nunca soube que existiu um
   * interessado. */
  function pintarAtendimentos() {
    var lista = filtrar(estado.atendimentos, ['nome', 'telefone', 'cidade', 'objetivo'])
      .slice().sort(function (a, b) {
        return new Date(b.criado_em) - new Date(a.criado_em);
      });

    contador('at-contador', lista.filter(function (a) {
      return String(a.status || 'novo') === 'novo';
    }).length);
    document.getElementById('at-vazio').hidden = lista.length > 0;

    document.getElementById('tabela-atendimentos').innerHTML = lista.map(function (a) {
      var st = String(a.status || 'novo');
      var interesses = (a.interesses || []).join(', ');
      var primeiro = String(a.nome || '').trim().split(' ')[0];
      var texto = 'Olá ' + primeiro + '! Vi seu pedido de atendimento na Pharma Fit' +
        (interesses ? ' sobre ' + interesses : '') + '. Posso te ajudar por aqui?';

      return '<tr>' +
        '<td><b>' + data(a.criado_em) + '</b>' +
          '<span class="tag tag--' + (st === 'novo' ? 'pendente' : 'pago') + '">' +
            esc(st) + '</span></td>' +
        '<td><b>' + esc(a.nome) + '</b>' +
          (a.cidade ? '<span class="sub">' + esc(a.cidade) + '</span>' : '') + '</td>' +
        '<td>' + esc(interesses || '—') + '</td>' +
        '<td>' + esc(a.objetivo || '—') + '</td>' +
        '<td>' + esc(a.telefone || '—') + '</td>' +
        '<td class="col-num acoes-linha">' +
          botaoZap(a.telefone, texto) +
          (st === 'novo'
            ? '<button class="btn-mini btn-mini--ok" type="button" data-atendido="' +
                esc(a.id) + '">Atendido</button>'
            : '') +
          '<button class="btn-mini" type="button" data-excluir-at="' + esc(a.id) + '">Excluir</button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---------- carga ---------- */

  async function recarregar() {
    var painel = await Dados.listarPainel();
    estado.pedidos = painel.pedidos;
    estado.representantes = await Dados.listar('representantes');
    estado.orcamentos = await Dados.listar('orcamentos');
    estado.espera = await Dados.listar('espera');
    estado.atendimentos = await Dados.listar('atendimentos');

    pintarTudo();
  }

  function pintarTudo() {
    pintarTodos();
    pintarInativos();
    /* primeiro os atendimentos: é o contato mais novo e o mais quente —
       alguém que acabou de pedir para ser atendido */
    pintarAtendimentos();
    pintarRepresentantes();
    pintarOrcamentos();
    pintarEspera();
  }

  /** Busca única, valendo para todas as listas da tela. */
  function ligarBusca() {
    var campo = document.getElementById('busca-geral');
    if (!campo) return;

    campo.addEventListener('input', U.debounce(function () {
      estado.busca = campo.value.trim();
      estado.limiteTodos = PASSO_LISTA;
      pintarTudo();
    }, 200));
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

    try {
      await recarregar();
    } catch (e) {
      console.error('[Pharma Fit] falha ao carregar:', e);
      mostrarErro('Não conseguimos buscar os dados agora.', function () { location.reload(); });
      return;
    }
    ligarAcoes();
    ligarBusca();

    mostrarConteudo();
  })();
})();
