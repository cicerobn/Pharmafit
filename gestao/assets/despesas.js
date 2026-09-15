/* =========================================================
   PHARMA FIT — gastos da empresa

   Tudo que sai do caixa: pagamento de funcionários, compra de
   insumos (isopor, fita, embalagem), frete, anúncios, taxas.
   O total do mês entra direto no cálculo do lucro líquido.
   ========================================================= */
(function () {
  'use strict';

  var U = window.PharmaFitUtil;
  var moeda = U.moeda, data = U.data, hora = U.hora, esc = U.esc, toast = U.toast;

  var Auth = window.PharmaFitAuth;
  var Dados = window.PharmaFitDados;
  var Analise = window.PharmaFitAnalise;

  var CATEGORIAS = [
    'Funcionários', 'Compra de produto', 'Embalagem e insumos', 'Frete e entrega',
    'Anúncios', 'Taxas e impostos', 'Aluguel', 'Ferramentas e sistemas',
    'Viagem', 'Manutenção', 'Outros'
  ];

  var estado = { despesas: [], meses: [], atual: null, busca: '' };

  /* ---------- utilidades ---------- */

  function doMes(chave) {
    var termo = U.normalizar(estado.busca);
    return estado.despesas.filter(function (d) {
      if (Analise.chaveMes(new Date(d.data || d.criado_em)) !== chave) return false;
      if (!termo) return true;
      return U.normalizar([d.descricao, d.categoria].join(' ')).indexOf(termo) !== -1;
    });
  }

  function total(lista) {
    return lista.reduce(function (t, d) { return t + Number(d.valor || 0); }, 0);
  }

  /* ---------- tela ---------- */

  function pintarMes(chave) {
    estado.atual = chave;
    var lista = doMes(chave).sort(function (a, b) {
      return new Date(b.data || b.criado_em) - new Date(a.data || a.criado_em);
    });

    var soma = total(lista);
    document.getElementById('g-total').textContent = moeda(soma);
    document.getElementById('g-qtd').textContent =
      lista.length ? lista.length + (lista.length === 1 ? ' lançamento' : ' lançamentos') : 'nenhum lançamento';

    var folha = total(lista.filter(function (d) { return d.categoria === 'Funcionários'; }));
    document.getElementById('g-folha').textContent = moeda(folha);

    var maior = lista.slice().sort(function (a, b) { return Number(b.valor) - Number(a.valor); })[0];
    document.getElementById('g-maior').textContent = maior ? maior.descricao : '—';
    document.getElementById('g-maior-hint').textContent = maior ? moeda(maior.valor) : 'sem lançamentos';

    /* média por dia: só até hoje, se o mês for o atual */
    var partes = chave.split('-');
    var ano = Number(partes[0]);
    var mes = Number(partes[1]);
    var hoje = new Date();
    var diasNoMes = new Date(ano, mes, 0).getDate();
    var dias = (hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes) ? hoje.getDate() : diasNoMes;
    document.getElementById('g-media').textContent = moeda(soma / Math.max(1, dias));

    var vazio = document.getElementById('gastos-vazio');
    vazio.hidden = lista.length > 0;
    vazio.textContent = estado.busca
      ? 'Nenhum gasto encontrado com esse termo.'
      : 'Nenhum gasto lançado neste mês.';

    document.getElementById('tabela-gastos').innerHTML = lista.map(function (g) {
      return '<tr>' +
        '<td>' + data(g.data || g.criado_em) + '</td>' +
        '<td>' + esc(g.descricao) + '</td>' +
        '<td>' + esc(g.categoria || '—') + '</td>' +
        '<td class="col-num custo">' + moeda(g.valor) + '</td>' +
        '<td class="col-num"><button class="btn-mini" type="button" data-excluir="' + esc(g.id) + '">excluir</button></td>' +
        '</tr>';
    }).join('');

    pintarCategorias(lista, soma);
  }

  function pintarCategorias(lista, soma) {
    var mapa = {};
    lista.forEach(function (d) {
      var c = d.categoria || 'Outros';
      if (!mapa[c]) mapa[c] = { nome: c, total: 0, quantidade: 0 };
      mapa[c].total += Number(d.valor || 0);
      mapa[c].quantidade++;
    });

    var itens = Object.keys(mapa).map(function (k) { return mapa[k]; })
      .sort(function (a, b) { return b.total - a.total; });

    var caixa = document.getElementById('rk-categorias');
    if (!itens.length) {
      caixa.innerHTML = '<p class="empty">Nada lançado neste mês.</p>';
      return;
    }

    var topo = itens[0].total || 1;
    caixa.innerHTML = itens.map(function (item, i) {
      var largura = Math.max(4, Math.round((item.total / topo) * 100));
      var fatia = soma ? Math.round((item.total / soma) * 100) : 0;
      return '<div class="rank">' +
        '<span class="rank__pos">' + (i + 1) + '</span>' +
        '<div class="rank__corpo">' +
          '<p class="rank__topo"><span class="rank__nome">' + esc(item.nome) + '</span>' +
          '<span class="rank__valor">' + moeda(item.total) + '</span></p>' +
          '<div class="rank__barra"><span style="width:' + largura + '%"></span></div>' +
          '<p class="rank__meta">' + fatia + '% do mês · ' + item.quantidade +
            (item.quantidade === 1 ? ' lançamento' : ' lançamentos') + '</p>' +
        '</div></div>';
    }).join('');
  }

  function pintarHistorico() {
    document.getElementById('tabela-meses-gastos').innerHTML = estado.meses.map(function (m) {
      var lista = doMes(m.chave);
      return '<tr' + (m.chave === estado.atual ? ' class="is-atual"' : '') + '>' +
        '<td>' + m.rotulo + '</td>' +
        '<td class="col-num">' + lista.length + '</td>' +
        '<td class="col-num custo">' + moeda(total(lista)) + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---------- lançamento ---------- */

  function ligarFormulario() {
    document.getElementById('g-categoria').innerHTML =
      CATEGORIAS.map(function (c) { return '<option>' + c + '</option>'; }).join('');
    document.getElementById('g-data').value = new Date().toISOString().slice(0, 10);

    document.getElementById('form-gasto').addEventListener('submit', async function (e) {
      e.preventDefault();

      var descricao = document.getElementById('g-descricao').value.trim();
      var valor = Number(document.getElementById('g-valor').value || 0);

      if (!descricao) { toast('Escreva o que foi o gasto.'); return; }
      if (!(valor > 0)) { toast('Informe o valor.'); return; }

      var botao = document.getElementById('g-salvar');
      botao.disabled = true;

      var r = await Dados.inserir('despesas', {
        descricao: descricao,
        categoria: document.getElementById('g-categoria').value,
        valor: valor,
        data: document.getElementById('g-data').value
      });

      botao.disabled = false;
      if (!r.ok) { toast(r.erro || 'Não foi possível lançar.'); return; }

      document.getElementById('g-descricao').value = '';
      document.getElementById('g-valor').value = '';
      document.getElementById('g-descricao').focus();

      toast(descricao + ' lançado por ' + moeda(valor) + '.');
      await recarregar();
    });

    document.getElementById('tabela-gastos').addEventListener('click', async function (e) {
      var botao = e.target.closest('[data-excluir]');
      if (!botao) return;
      if (!await U.confirmar({ titulo: 'Excluir gasto', texto: 'Este lançamento sai do total do mês.', confirmar: 'Excluir', perigo: true })) return;

      var r = await Dados.excluir('despesas', botao.getAttribute('data-excluir'));
      if (!r.ok) { toast(r.erro || 'Não foi possível excluir.'); return; }
      toast('Gasto excluído.');
      await recarregar();
    });
  }

  /* ---------- carga ---------- */

  async function recarregar() {
    estado.despesas = await Dados.listar('despesas');

    /* o mês do lançamento pode não estar na lista ainda */
    var chave = estado.atual || estado.meses[0].chave;
    pintarMes(chave);
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

    var busca = document.getElementById('busca-gastos');
    if (busca) {
      busca.addEventListener('input', U.debounce(function () {
        estado.busca = busca.value.trim();
        pintarMes(estado.atual);
      }, 200));
    }

    try {
      await recarregar();
    } catch (e) {
      console.error('[Pharma Fit] falha ao carregar:', e);
      mostrarErro('Não conseguimos buscar os dados agora.', function () { location.reload(); });
      return;
    }
    ligarFormulario();

    mostrarConteudo();
  })();
})();
