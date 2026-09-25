/* =========================================================
   PHARMA FIT — tela "Contas a pagar" do painel

   Brian, 25/09/2026: "Crie uma aba no painel de contas a pagar (nome,
   descrição em baixo do nome com uma cor mais clara, valor em
   vermelho, vencimento, data do pagamento quando eu pagar, forma do
   pagamento, status se foi paga ou não, e se não foi pago deixe uma
   abinha pra eu marcar que paguei, editar, excluir)" e "ter um
   histórico de contas também".

   A conta vive em `pf_contas_pagar`. "Paga" é ter `pago_em`: não há
   uma coluna de status separada, porque aí seria possível uma conta
   "paga" sem data de pagamento, ou com data e "em aberto" — duas
   verdades para a mesma coisa. O status que aparece na tela (a vencer,
   vence hoje, atrasada, paga) é CALCULADO a partir das datas.

   ESTA TELA FALA COM O BANCO DIRETO, como a de cupons: erro é erro, e
   aparece. Conta "salva" que não chegou ao banco é o pior tipo de
   mentira num controle de dinheiro.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Moldura = window.PharmaFitMoldura;
  var U = window.PharmaFitUtil;
  var esc = U.esc;

  var FORMAS = ['PIX', 'Boleto', 'Cartão de crédito', 'Cartão de débito',
                'Dinheiro', 'Transferência', 'Débito automático', 'Outro'];

  var contas = [];
  var aba = 'abertas';
  var editando = null;   /* id da conta em edição, ou null */
  var pagando = null;    /* id da conta com a "abinha" de pagar aberta */

  function achar(sel) { return document.querySelector(sel); }

  function hoje() {
    /* o dia de Manaus, igual ao resto do painel */
    return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
  }

  function dataBonita(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function numero(texto) {
    var s = String(texto || '').trim().replace(/\s/g, '').replace(/^R\$/i, '');
    if (s.indexOf(',') !== -1) s = s.replace(/\./g, '').replace(',', '.');
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  function opcoesDeForma(escolhida) {
    return '<option value="">Escolha…</option>' + FORMAS.map(function (f) {
      return '<option' + (f === escolhida ? ' selected' : '') + '>' + esc(f) + '</option>';
    }).join('');
  }

  /** Em que pé a conta está, calculado pelas datas. */
  function situacao(c) {
    if (c.pago_em) return { texto: 'Paga', classe: 'pago' };
    var h = hoje();
    if (c.vencimento < h) return { texto: 'Atrasada', classe: 'cancelado' };
    if (c.vencimento === h) return { texto: 'Vence hoje', classe: 'pendente' };
    return { texto: 'A pagar', classe: 'pendente' };
  }

  function dizer(texto, bom) {
    var r = achar('[data-recado]');
    r.hidden = !texto;
    r.className = 'folha__recado folha__recado--' + (bom ? 'bom' : 'ruim');
    r.textContent = texto || '';
  }

  /* ---------- carregar ---------- */

  async function carregar() {
    var sb = Auth.cliente();
    if (!sb) return 'Sem conexão com o banco.';
    var r = await sb.from('pf_contas_pagar').select('*').order('vencimento', { ascending: true });
    if (r.error) return r.error.message;
    contas = r.data || [];
    return '';
  }

  /* ---------- desenhar ---------- */

  function pintarResumo() {
    var abertas = contas.filter(function (c) { return !c.pago_em; });
    var total = abertas.reduce(function (t, c) { return t + Number(c.valor); }, 0);
    var atrasadas = abertas.filter(function (c) { return c.vencimento < hoje(); });
    var totalAtraso = atrasadas.reduce(function (t, c) { return t + Number(c.valor); }, 0);

    achar('[data-resumo]').hidden = false;
    achar('[data-resumo-valor]').textContent = U.moeda(total);
    achar('[data-resumo-pe]').textContent = !abertas.length
      ? 'Nenhuma conta em aberto.'
      : abertas.length + (abertas.length === 1 ? ' conta em aberto' : ' contas em aberto') +
        (atrasadas.length
          ? ' · ' + atrasadas.length + (atrasadas.length === 1 ? ' atrasada' : ' atrasadas') +
            ' (' + U.moeda(totalAtraso) + ')'
          : '');
  }

  function linhaDaConta(c) {
    var s = situacao(c);
    var detalhes = c.pago_em
      ? 'Venceu ' + dataBonita(c.vencimento) + ' · paga em ' + dataBonita(c.pago_em) +
        (c.forma_pagamento ? ' · ' + c.forma_pagamento : '')
      : 'Vence ' + dataBonita(c.vencimento);

    var abinha = pagando === c.id
      ? '<div class="conta-pagar" data-abinha>' +
          '<label class="campo"><span class="campo__rotulo">Pago em</span>' +
            '<input type="date" data-pagar-data value="' + hoje() + '"></label>' +
          '<label class="campo"><span class="campo__rotulo">Forma do pagamento</span>' +
            '<select data-pagar-forma>' + opcoesDeForma('') + '</select></label>' +
          '<div class="conta-pagar__botoes">' +
            '<button class="botao botao--forte" type="button" data-confirmar-pago>Confirmar pagamento</button>' +
            '<button class="botao" type="button" data-fechar-abinha>Cancelar</button>' +
          '</div>' +
        '</div>'
      : '';

    return '<li class="item cpagar-linha' + (s.classe === 'cancelado' ? ' cpagar-linha--atrasada' : '') +
        '" data-id="' + esc(c.id) + '">' +
      '<span class="item__corpo">' +
        '<span class="cpagar-linha__topo">' +
          '<span class="item__nome">' + esc(c.nome) + '</span>' +
          '<span class="cpagar-linha__valor">' + U.moeda(c.valor) + '</span>' +
        '</span>' +
        (c.descricao ? '<span class="cpagar-linha__descricao">' + esc(c.descricao) + '</span>' : '') +
        '<span class="cpagar-linha__pe">' +
          '<span class="marca marca--' + s.classe + '">' + s.texto + '</span>' +
          '<span class="item__linha">' + esc(detalhes) + '</span>' +
        '</span>' +
        '<span class="cupom-linha__acoes">' +
          (c.pago_em
            ? '<button class="cupom-linha__botao" type="button" data-desfazer>Desmarcar paga</button>'
            : '<button class="cupom-linha__botao cpagar-linha__paguei" type="button" data-abrir-abinha>Marcar como paga</button>') +
          '<button class="cupom-linha__botao" type="button" data-editar>Editar</button>' +
          '<button class="cupom-linha__botao cupom-linha__botao--perigo" type="button" data-excluir>Excluir</button>' +
        '</span>' +
        abinha +
      '</span>' +
    '</li>';
  }

  function pintarLista() {
    var lista;
    if (aba === 'abertas') {
      lista = contas.filter(function (c) { return !c.pago_em; });
    } else {
      /* histórico: a mais recente em cima, com o total pago de cada mês */
      lista = contas.filter(function (c) { return c.pago_em; })
        .sort(function (a, b) { return String(b.pago_em).localeCompare(String(a.pago_em)); });
    }

    var vazio = achar('[data-vazio]');
    vazio.hidden = lista.length > 0;
    achar('[data-vazio-titulo]').textContent = aba === 'abertas'
      ? 'Nenhuma conta em aberto' : 'Nenhuma conta paga ainda';
    achar('[data-vazio-texto]').textContent = aba === 'abertas'
      ? 'As contas que você adicionar aparecem aqui até serem pagas.'
      : 'Quando você marcar uma conta como paga, ela vem para cá.';

    if (aba === 'abertas') {
      achar('[data-lista]').innerHTML = lista.map(linhaDaConta).join('');
      return;
    }

    var html = '';
    var mesAtual = '';
    var nomesMes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
                    'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    lista.forEach(function (c) {
      var mes = String(c.pago_em).slice(0, 7);
      if (mes !== mesAtual) {
        mesAtual = mes;
        var doMes = lista.filter(function (x) { return String(x.pago_em).slice(0, 7) === mes; });
        var soma = doMes.reduce(function (t, x) { return t + Number(x.valor); }, 0);
        html += '<li class="conta-mes"><span>' +
          nomesMes[Number(mes.slice(5, 7)) - 1] + ' de ' + mes.slice(0, 4) +
          '</span><span>' + U.moeda(soma) + ' pagos</span></li>';
      }
      html += linhaDaConta(c);
    });
    achar('[data-lista]').innerHTML = html;
  }

  function pintar() {
    pintarResumo();
    pintarLista();
  }

  async function recarregar() {
    var erro = await carregar();
    if (erro) {
      achar('[data-lista]').innerHTML = '';
      achar('[data-vazio]').hidden = false;
      achar('[data-vazio-titulo]').textContent = 'Não consegui ler as contas';
      achar('[data-vazio-texto]').textContent = erro;
      return;
    }
    pintar();
  }

  /* ---------- criar e editar ---------- */

  function limparForm() {
    editando = null;
    document.querySelectorAll('[data-form] [data-f]').forEach(function (el) { el.value = ''; });
    achar('[data-form-pago]').hidden = true;
    achar('[data-form-titulo]').textContent = 'Nova conta';
    achar('[data-salvar]').textContent = 'Adicionar conta';
    achar('[data-cancelar]').hidden = true;
  }

  function abrirEdicao(c) {
    editando = c.id;
    var f = function (n) { return achar('[data-form] [data-f="' + n + '"]'); };
    f('nome').value = c.nome || '';
    f('descricao').value = c.descricao || '';
    f('valor').value = String(Number(c.valor).toFixed(2)).replace('.', ',');
    f('vencimento').value = c.vencimento || '';
    achar('[data-form-pago]').hidden = !c.pago_em;
    f('pago_em').value = c.pago_em || '';
    achar('[data-formas]').innerHTML = opcoesDeForma(c.forma_pagamento || '');
    achar('[data-form-titulo]').textContent = 'Editando: ' + c.nome;
    achar('[data-salvar]').textContent = 'Salvar alterações';
    achar('[data-cancelar]').hidden = false;
    dizer('');
    achar('[data-form]').scrollIntoView({ behavior: 'smooth', block: 'start' });
    f('nome').focus({ preventScroll: true });
  }

  async function salvar(e) {
    e.preventDefault();
    var f = function (n) { return achar('[data-form] [data-f="' + n + '"]'); };
    var nome = f('nome').value.trim();
    var descricao = f('descricao').value.trim();
    var valor = numero(f('valor').value);
    var vencimento = f('vencimento').value;

    if (!nome) { f('nome').focus(); return dizer('Escreva o nome da conta.', false); }
    if (!(valor > 0)) { f('valor').focus(); return dizer('Escreva o valor — um número maior que zero.', false); }
    if (!vencimento) { f('vencimento').focus(); return dizer('Escolha a data de vencimento.', false); }

    var campos = {
      nome: nome,
      descricao: descricao || null,
      valor: Math.round(valor * 100) / 100,
      vencimento: vencimento
    };
    if (editando && !achar('[data-form-pago]').hidden) {
      if (!f('pago_em').value) { f('pago_em').focus(); return dizer('Escolha a data do pagamento.', false); }
      campos.pago_em = f('pago_em').value;
      campos.forma_pagamento = f('forma_pagamento').value || null;
    }

    var botao = achar('[data-salvar]');
    botao.disabled = true;
    try {
      var sb = Auth.cliente();
      if (!sb) throw new Error('sem conexão com o banco');
      var r = editando
        ? await sb.from('pf_contas_pagar').update(campos).eq('id', editando)
        : await sb.from('pf_contas_pagar').insert(campos);
      if (r.error) throw new Error(r.error.message);
      var eraEdicao = !!editando;
      limparForm();
      dizer(eraEdicao ? 'Conta atualizada.' : 'Conta ' + nome + ' adicionada: ' + U.moeda(campos.valor) +
            ', vence ' + dataBonita(vencimento) + '.', true);
      if (!eraEdicao) trocarAba('abertas');
      await recarregar();
    } catch (err) {
      dizer('Não salvei: ' + (err && err.message ? err.message : 'erro desconhecido') + '.', false);
    } finally {
      botao.disabled = false;
    }
  }

  /* ---------- a lista: pagar, desfazer, editar, excluir ---------- */

  async function atualizar(id, campos, recadoBom) {
    var sb = Auth.cliente();
    if (!sb) return dizer('Sem conexão com o banco.', false);
    var r = await sb.from('pf_contas_pagar').update(campos).eq('id', id);
    if (r.error) return dizer('Não consegui: ' + r.error.message + '.', false);
    dizer(recadoBom, true);
    await recarregar();
  }

  async function agirNaLista(e) {
    var botao = e.target.closest('button');
    if (!botao) return;
    var linha = botao.closest('[data-id]');
    if (!linha) return;
    var c = contas.filter(function (x) { return String(x.id) === linha.getAttribute('data-id'); })[0];
    if (!c) return;

    if (botao.hasAttribute('data-abrir-abinha')) {
      pagando = c.id;
      pintarLista();
      var campo = document.querySelector('[data-abinha] [data-pagar-forma]');
      if (campo) campo.focus();
      return;
    }
    if (botao.hasAttribute('data-fechar-abinha')) {
      pagando = null;
      pintarLista();
      return;
    }
    if (botao.hasAttribute('data-confirmar-pago')) {
      var data = linha.querySelector('[data-pagar-data]').value;
      var forma = linha.querySelector('[data-pagar-forma]').value;
      if (!data) return dizer('Escolha a data do pagamento.', false);
      if (!forma) {
        linha.querySelector('[data-pagar-forma]').focus();
        return dizer('Escolha a forma do pagamento.', false);
      }
      botao.disabled = true;
      pagando = null;
      return atualizar(c.id, { pago_em: data, forma_pagamento: forma },
        c.nome + ' marcada como paga (' + U.moeda(c.valor) + ', ' + forma + '). Está no histórico.');
    }
    if (botao.hasAttribute('data-desfazer')) {
      return atualizar(c.id, { pago_em: null, forma_pagamento: null },
        c.nome + ' voltou para as contas a pagar.');
    }
    if (botao.hasAttribute('data-editar')) {
      return abrirEdicao(c);
    }
    if (botao.hasAttribute('data-excluir')) {
      if (!window.confirm('Excluir a conta "' + c.nome + '" (' + U.moeda(c.valor) + ')? Isso não tem volta.')) return;
      var sb = Auth.cliente();
      var r = sb ? await sb.from('pf_contas_pagar').delete().eq('id', c.id) : { error: { message: 'sem conexão' } };
      if (r.error) return dizer('Não consegui excluir: ' + r.error.message + '.', false);
      if (editando === c.id) limparForm();
      dizer('Conta ' + c.nome + ' excluída.', true);
      await recarregar();
    }
  }

  function trocarAba(nova) {
    aba = nova;
    pagando = null;
    document.querySelectorAll('[data-aba]').forEach(function (b) {
      var sim = b.getAttribute('data-aba') === nova;
      b.classList.toggle('is-ativo', sim);
      b.setAttribute('aria-selected', String(sim));
    });
    pintarLista();
  }

  /* ---------- montar ---------- */

  (async function () {
    var user = await Auth.exigirLogin('../login.html');
    if (!user) return;

    await Moldura.montar({ aba: 'mais' });
    Moldura.aoNovo(function () { location.href = '../index.html#novo'; });
    achar('[data-volta]').innerHTML = Moldura.svg('volta', 20, 1.9);

    achar('[data-formas]').innerHTML = opcoesDeForma('');
    achar('[data-form]').addEventListener('submit', salvar);
    achar('[data-cancelar]').addEventListener('click', function () { limparForm(); dizer(''); });
    achar('[data-lista]').addEventListener('click', agirNaLista);
    document.querySelectorAll('[data-aba]').forEach(function (b) {
      b.addEventListener('click', function () { trocarAba(b.getAttribute('data-aba')); });
    });

    await recarregar();
    Moldura.animarEntrada('.bloco');
  })();
})();
