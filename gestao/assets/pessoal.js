/* =========================================================
   PHARMA FIT — painel pessoal do dono

   Fica separado das contas da empresa: aqui entram as suas
   entradas e saídas. O lucro da empresa aparece só como
   comparação, sem se misturar com o seu saldo.
   ========================================================= */
(function () {
  'use strict';

  var U = window.PharmaFitUtil;
  var moeda = U.moeda, data = U.data, hora = U.hora, esc = U.esc, toast = U.toast;

  var Auth = window.PharmaFitAuth;
  var Dados = window.PharmaFitDados;
  var Analise = window.PharmaFitAnalise;

  var CATEGORIAS = {
    saida: ['Moradia', 'Mercado', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Cartão', 'Outros'],
    entrada: ['Retirada da empresa', 'Salário', 'Investimentos', 'Extra', 'Outros']
  };

  var estado = { lancamentos: [], pedidos: [], despesas: [], meses: [], atual: null, tipo: 'saida' };

  /* ---------- utilidades ---------- */

  function doMes(lista, chave) {
    return lista.filter(function (l) {
      return Analise.chaveMes(new Date(l.data || l.criado_em)) === chave;
    });
  }

  function soma(lista, tipo) {
    return lista.filter(function (l) { return (l.tipo || 'saida') === tipo; })
                .reduce(function (t, l) { return t + Number(l.valor || 0); }, 0);
  }

  /* ---------- resumo ---------- */

  function pintarMes(chave) {
    estado.atual = chave;
    var lista = doMes(estado.lancamentos, chave);

    var entrou = soma(lista, 'entrada');
    var saiu = soma(lista, 'saida');
    var saldo = entrou - saiu;

    document.getElementById('p-entrou').textContent = moeda(entrou);
    document.getElementById('p-saiu').textContent = moeda(saiu);
    document.getElementById('p-saldo').textContent = moeda(saldo);
    document.getElementById('p-saldo').classList.toggle('is-negativo', saldo < 0);

    var nEnt = lista.filter(function (l) { return l.tipo === 'entrada'; }).length;
    var nSai = lista.length - nEnt;
    document.getElementById('p-entrou-hint').textContent = nEnt + (nEnt === 1 ? ' lançamento' : ' lançamentos');
    document.getElementById('p-saiu-hint').textContent = nSai + (nSai === 1 ? ' lançamento' : ' lançamentos');

    var empresa = Analise.resumoMes(estado.pedidos, estado.despesas, chave);
    document.getElementById('p-lucro-empresa').textContent = moeda(empresa.lucro);

    /* lançamentos */
    var ordenados = lista.slice().sort(function (a, b) {
      return new Date(b.data || b.criado_em) - new Date(a.data || a.criado_em);
    });

    document.getElementById('pessoal-vazio').hidden = ordenados.length > 0;
    document.getElementById('p-total-lancamentos').textContent =
      ordenados.length ? ordenados.length + (ordenados.length === 1 ? ' lançamento' : ' lançamentos') : '';

    document.getElementById('tabela-pessoal').innerHTML = ordenados.map(function (l) {
      var entrada = (l.tipo || 'saida') === 'entrada';
      return '<tr>' +
        '<td>' + data(l.data || l.criado_em) + '</td>' +
        '<td>' + esc(l.descricao) + '</td>' +
        '<td>' + esc(l.categoria || '—') + '</td>' +
        '<td class="col-num ' + (entrada ? 'margem' : 'custo') + '">' +
          (entrada ? '+ ' : '− ') + moeda(l.valor) + '</td>' +
        '<td class="col-num"><button class="btn-mini" type="button" data-excluir-pl="' + esc(l.id) + '">excluir</button></td>' +
        '</tr>';
    }).join('');

    pintarCategorias(lista);
  }

  function pintarCategorias(lista) {
    var mapa = {};
    lista.filter(function (l) { return (l.tipo || 'saida') === 'saida'; })
      .forEach(function (l) {
        var c = l.categoria || 'Outros';
        mapa[c] = (mapa[c] || 0) + Number(l.valor || 0);
      });

    var itens = Object.keys(mapa).map(function (k) { return { nome: k, total: mapa[k] }; })
      .sort(function (a, b) { return b.total - a.total; });

    var caixa = document.getElementById('rk-categorias');
    if (!itens.length) {
      caixa.innerHTML = '<p class="empty">Nenhuma saída lançada neste mês.</p>';
      return;
    }

    var topo = itens[0].total || 1;
    var total = itens.reduce(function (t, i) { return t + i.total; }, 0);

    caixa.innerHTML = itens.map(function (item, i) {
      var largura = Math.max(4, Math.round((item.total / topo) * 100));
      var fatia = Math.round((item.total / total) * 100);
      return '<div class="rank">' +
        '<span class="rank__pos">' + (i + 1) + '</span>' +
        '<div class="rank__corpo">' +
          '<p class="rank__topo"><span class="rank__nome">' + esc(item.nome) + '</span>' +
          '<span class="rank__valor">' + moeda(item.total) + '</span></p>' +
          '<div class="rank__barra"><span style="width:' + largura + '%"></span></div>' +
          '<p class="rank__meta">' + fatia + '% do que saiu</p>' +
        '</div></div>';
    }).join('');
  }

  function pintarHistorico() {
    document.getElementById('tabela-meses-pessoal').innerHTML = estado.meses.map(function (m) {
      var lista = doMes(estado.lancamentos, m.chave);
      var entrou = soma(lista, 'entrada');
      var saiu = soma(lista, 'saida');
      var saldo = entrou - saiu;

      return '<tr' + (m.chave === estado.atual ? ' class="is-atual"' : '') + '>' +
        '<td>' + m.rotulo + '</td>' +
        '<td class="col-num margem">' + moeda(entrou) + '</td>' +
        '<td class="col-num custo">' + moeda(saiu) + '</td>' +
        '<td class="col-num ' + (saldo < 0 ? 'margem-negativa' : 'margem') + '">' + moeda(saldo) + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---------- lançamentos ---------- */

  function categoriasDoTipo() {
    document.getElementById('pl-categoria').innerHTML =
      CATEGORIAS[estado.tipo].map(function (c) { return '<option>' + c + '</option>'; }).join('');
  }

  function abrirModal(aberto) {
    document.getElementById('modal-pessoal').classList.toggle('is-open', aberto);
    if (aberto) {
      document.getElementById('pl-descricao').value = '';
      document.getElementById('pl-valor').value = '';
      document.getElementById('pl-data').value = new Date().toISOString().slice(0, 10);
      categoriasDoTipo();
      setTimeout(function () { document.getElementById('pl-descricao').focus(); }, 60);
    }
  }

  function ligarModal() {
    document.getElementById('novo-lancamento').addEventListener('click', function () { abrirModal(true); });
    document.querySelectorAll('[data-fechar-pessoal]').forEach(function (el) {
      el.addEventListener('click', function () { abrirModal(false); });
    });

    document.querySelectorAll('[data-tipo]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        estado.tipo = botao.getAttribute('data-tipo');
        document.querySelectorAll('[data-tipo]').forEach(function (b) {
          b.classList.toggle('is-active', b === botao);
        });
        categoriasDoTipo();
      });
    });

    document.getElementById('form-pessoal').addEventListener('submit', async function (e) {
      e.preventDefault();

      var descricao = document.getElementById('pl-descricao').value.trim();
      var valor = Number(document.getElementById('pl-valor').value || 0);

      if (!descricao) { toast('Escreva uma descrição.'); return; }
      if (!(valor > 0)) { toast('Informe o valor.'); return; }

      var botao = document.getElementById('pl-salvar');
      botao.disabled = true;

      var r = await Dados.inserir('pessoal', {
        tipo: estado.tipo,
        descricao: descricao,
        categoria: document.getElementById('pl-categoria').value,
        valor: valor,
        data: document.getElementById('pl-data').value
      });

      botao.disabled = false;
      if (!r.ok) { toast(r.erro || 'Não foi possível salvar.'); return; }

      abrirModal(false);
      toast('Lançamento salvo.');
      await recarregar();
    });

    document.getElementById('tabela-pessoal').addEventListener('click', async function (e) {
      var botao = e.target.closest('[data-excluir-pl]');
      if (!botao) return;
      if (!await U.confirmar({ titulo: 'Excluir lançamento', texto: 'Ele sai do seu resumo do mês.', confirmar: 'Excluir', perigo: true })) return;

      var r = await Dados.excluir('pessoal', botao.getAttribute('data-excluir-pl'));
      if (!r.ok) { toast(r.erro || 'Não foi possível excluir.'); return; }
      toast('Lançamento excluído.');
      await recarregar();
    });
  }

  /* ---------- carga ---------- */

  async function recarregar() {
    estado.lancamentos = await Dados.listar('pessoal');
    var painel = await Dados.listarPainel();
    estado.pedidos = painel.pedidos;
    estado.despesas = await Dados.listar('despesas');

    pintarMes(estado.atual || estado.meses[0].chave);
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

    /* tela exclusiva do dono */
    if (!window.PharmaFitMenu.éDono(user)) {
      location.replace('index.html');
      return;
    }

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
      pintarHistorico();
    });

    try {
      await recarregar();
    } catch (e) {
      console.error('[Pharma Fit] falha ao carregar:', e);
      mostrarErro('Não conseguimos buscar os dados agora.', function () { location.reload(); });
      return;
    }
    ligarModal();

    mostrarConteudo();
  })();
})();
