/* =========================================================
   PHARMA FIT — tela "Vendas por período"

   Brian, 24/09/2026, dois pedidos que são o mesmo relatório:

     "alterar tipo um calendário, exemplo. Vendas do dia 01 ao 10
      quanto eu vendi, quanto eu lucrei e tudo o que saiu de cada
      pedidos. Exemplo: 200 Tg, 20 Tirzec, 10 lipoles"

     "Relatorio diario, lucro diario, selecionar data, ver quantos
      vendeu, ver fulano comprou x tg, pedro comprou 5 tirzec e ter
      como imprimir esse relatorio"

   Um DIA é um período que começa e termina na mesma data. Então é uma
   tela só: escolhe-se o começo e o fim (ou um atalho — hoje, ontem,
   7 dias, este mês, mês passado) e ela responde, nesta ordem:

     1. quanto vendeu, quanto lucrou, quantos pedidos e quantas unidades;
     2. O QUE SAIU — cada produto com a quantidade ("200 TG");
     3. QUEM COMPROU — cada cliente com o que levou ("Pedro: 5 Tirzec");
     4. pedido por pedido, para conferir linha a linha.

   E imprime: o botão chama a impressão do navegador, e a folha sai sem
   o menu, sem os botões e com um cabeçalho dizendo a loja e o período
   (ver `@media print` no app.css).

   O QUE CONTA COMO VENDA é o mesmo que o resto do painel conta: pedido
   confirmado, enviado ou pago (`Analise.confirmados`). Pendente ainda
   não é dinheiro, e cancelado nunca foi. A data da venda é a data em
   que ela foi CONFIRMADA — a mesma regra dos outros relatórios, para os
   números baterem entre as telas.

   LUCRO aqui é o vendido menos o custo dos produtos. Os gastos da loja
   (aluguel, frete, anúncio) ficam de fora de propósito: eles são do
   mês, não de um dia — um aluguel lançado no dia 5 faria o dia 5 dar
   prejuízo. O lucro do mês com os gastos continua na tela Relatórios.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Moldura = window.PharmaFitMoldura;
  var Analise = window.PharmaFitAnalise;
  var Dados = window.PharmaFitDados;
  var U = window.PharmaFitUtil;
  var moeda = U.moeda;
  var esc = U.esc;

  function achar(nome) { return document.querySelector('[data-' + nome + ']'); }

  var verCusto = true;

  /* ---------- datas ---------- */

  function paraCampo(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /** "2026-09-10" -> Date à meia-noite LOCAL (e não UTC, que no
      Brasil cairia no dia anterior às 21h). */
  function doCampo(texto) {
    var p = String(texto || '').split('-').map(Number);
    if (p.length !== 3 || !p[0]) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function dataBonita(d) {
    return String(d.getDate()).padStart(2, '0') + '/' +
      String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function horaBonita(d) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function atalho(nome) {
    var hoje = new Date();
    var h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    if (nome === 'ontem') {
      var o = new Date(h); o.setDate(o.getDate() - 1);
      return [o, o];
    }
    if (nome === '7dias') {
      var s = new Date(h); s.setDate(s.getDate() - 6);
      return [s, h];
    }
    if (nome === 'mes') return [new Date(h.getFullYear(), h.getMonth(), 1), h];
    if (nome === 'mespassado') {
      return [new Date(h.getFullYear(), h.getMonth() - 1, 1),
              new Date(h.getFullYear(), h.getMonth(), 0)];
    }
    return [h, h];
  }

  /* ---------- buscar ---------- */

  /**
   * Os pedidos do período, direto do banco e já filtrados pela data.
   *
   * NÃO usa a lista que as outras telas carregam, e isto importa: aquela
   * traz só os 500 pedidos mais recentes. Para "hoje" tanto faz; para o
   * relatório de um mês de três meses atrás, ela chegaria vazia ou pela
   * metade, e a tela diria "vendeu pouco" quando a verdade é "não li".
   *
   * O filtro do banco pega o pedido pela data de confirmação OU pela de
   * criação; o corte exato (confirmação, e criação só quando não há
   * confirmação) é feito aqui, com a mesma regra dos outros relatórios.
   */
  async function buscar(inicio, fimExclusivo) {
    var a = inicio.toISOString();
    var b = fimExclusivo.toISOString();
    var sb = Auth.cliente();

    var lista;
    if (sb) {
      var r = await sb.from('pf_pedidos').select('*')
        .or('and(confirmado_em.gte.' + a + ',confirmado_em.lt.' + b + '),' +
            'and(criado_em.gte.' + a + ',criado_em.lt.' + b + ')')
        .order('criado_em', { ascending: true })
        .limit(5000);
      if (r.error) throw new Error(r.error.message);
      lista = r.data || [];
    } else {
      /* modo demonstração: o que o aparelho tem */
      lista = (await Dados.listarPainel()).pedidos || [];
    }

    return Analise.confirmados(lista).filter(function (p) {
      var d = new Date(p.confirmado_em || p.criado_em || 0);
      return d >= inicio && d < fimExclusivo;
    }).sort(function (x, y) {
      return new Date(x.confirmado_em || x.criado_em) - new Date(y.confirmado_em || y.criado_em);
    });
  }

  /* ---------- as contas ---------- */

  function chaveCliente(p) {
    return U.digitos(p.telefone || '') || U.normalizar(p.cliente || '') || 'sem-nome';
  }

  function resumir(vendas) {
    var r = { vendido: 0, custo: 0, unidades: 0, semCusto: 0, semCustoValor: 0,
              produtos: {}, clientes: {} };

    vendas.forEach(function (p) {
      var valor = Number(p.valor || 0);
      var custo = Number(p.custo || 0);
      var q = Math.max(1, Number(p.quantidade || 1));
      r.vendido += valor;
      r.custo += custo;
      r.unidades += q;
      if (!custo) { r.semCusto++; r.semCustoValor += valor; }

      var nome = String(p.produto || 'Produto sem nome').trim();
      var prod = r.produtos[nome] || (r.produtos[nome] = { nome: nome, unidades: 0, valor: 0, custo: 0 });
      prod.unidades += q;
      prod.valor += valor;
      prod.custo += custo;

      var k = chaveCliente(p);
      var cli = r.clientes[k] || (r.clientes[k] = {
        nome: String(p.cliente || 'Sem nome').trim(), telefone: p.telefone || '',
        valor: 0, itens: {}
      });
      if (String(p.cliente || '').trim().length > cli.nome.length) cli.nome = String(p.cliente).trim();
      cli.valor += valor;
      cli.itens[nome] = (cli.itens[nome] || 0) + q;
    });

    r.lucro = r.vendido - r.custo;
    r.listaProdutos = Object.keys(r.produtos).map(function (k) { return r.produtos[k]; })
      .sort(function (x, y) { return y.unidades - x.unidades || y.valor - x.valor; });
    r.listaClientes = Object.keys(r.clientes).map(function (k) { return r.clientes[k]; })
      .sort(function (x, y) { return y.valor - x.valor; });
    return r;
  }

  /* ---------- desenhar ---------- */

  function pintar(vendas, inicio, fim) {
    var r = resumir(vendas);
    var mesmoDia = paraCampo(inicio) === paraCampo(fim);

    achar('periodo-texto').textContent = mesmoDia
      ? 'Dia ' + dataBonita(inicio)
      : 'De ' + dataBonita(inicio) + ' a ' + dataBonita(fim);
    achar('gerado').textContent = 'Gerado em ' + dataBonita(new Date()) + ' às ' + horaBonita(new Date());

    achar('vendido').textContent = moeda(r.vendido);
    achar('pedidos').textContent = String(vendas.length);
    achar('unidades').textContent = String(r.unidades);
    if (verCusto) achar('lucro').textContent = moeda(r.lucro);

    var aviso = achar('sem-custo');
    if (verCusto && r.semCusto) {
      aviso.hidden = false;
      aviso.textContent = (r.semCusto === 1 ? 'Uma venda' : r.semCusto + ' vendas') +
        ' do período (' + moeda(r.semCustoValor) + ') ' + (r.semCusto === 1 ? 'está' : 'estão') +
        ' sem custo cadastrado, então o lucro acima está maior que o real.';
    } else {
      aviso.hidden = true;
    }

    var vazio = !vendas.length;
    achar('vazio').hidden = !vazio;
    achar('bloco-clientes').hidden = vazio;
    achar('bloco-pedidos').hidden = vazio;

    /* O QUE SAIU: a quantidade vem primeiro, porque a pergunta dele é
       "200 TG, 20 Tirzec" — unidade, e não dinheiro. */
    /* O LUCRO DESCE PARA BAIXO DO VENDIDO, na mesma célula. Em colunas
       separadas, dois valores de seis dígitos lado a lado passavam da
       borda num celular de 320px — medido. Assim são três colunas, e o
       lucro continua ao lado do número de que ele sai. */
    function celulaValor(valor, custo) {
      return '<td class="num">' + moeda(valor) +
        (verCusto ? '<span class="tabela-relatorio__lucro">lucro ' + moeda(valor - custo) + '</span>' : '') +
        '</td>';
    }
    achar('produtos').innerHTML = vazio ? '' :
      '<thead><tr><th class="num">Qtd.</th><th>Produto</th><th class="num">' +
        (verCusto ? 'Vendido / lucro' : 'Vendido') + '</th></tr></thead>' +
      '<tbody>' + r.listaProdutos.map(function (p) {
        return '<tr><td class="num forte">' + p.unidades + '</td>' +
          '<td>' + esc(p.nome) + '</td>' + celulaValor(p.valor, p.custo) + '</tr>';
      }).join('') + '</tbody>' +
      '<tfoot><tr><td class="num forte">' + r.unidades + '</td><td>Total</td>' +
        celulaValor(r.vendido, r.custo) + '</tr></tfoot>';

    /* QUEM COMPROU: "Pedro — 5× Tirzec Pen 15 mg". */
    achar('clientes').innerHTML = r.listaClientes.map(function (c) {
      var itens = Object.keys(c.itens).map(function (nome) {
        return '<li><b>' + c.itens[nome] + '×</b> ' + esc(nome) + '</li>';
      }).join('');
      return '<li class="quem-comprou__pessoa">' +
        '<div class="quem-comprou__topo">' +
          '<span class="quem-comprou__nome">' + esc(c.nome) +
            (c.telefone ? ' <span class="quem-comprou__tel">' + esc(c.telefone) + '</span>' : '') +
          '</span>' +
          '<span class="quem-comprou__valor">' + moeda(c.valor) + '</span>' +
        '</div>' +
        '<ul class="quem-comprou__itens">' + itens + '</ul>' +
      '</li>';
    }).join('');

    /* PEDIDO POR PEDIDO, na ordem em que foram confirmados. Em mais de
       um dia a data entra junto da hora. */
    /* QUATRO COLUNAS, e não cinco: cliente e produto dividem a mesma
       célula, um embaixo do outro. Com cinco, num celular de 390px a
       coluna do valor saía cortada pela borda da tela — medido na
       primeira versão desta tela. */
    achar('pedidos-lista').innerHTML = vazio ? '' :
      '<thead><tr><th>' + (mesmoDia ? 'Hora' : 'Quando') + '</th><th>Pedido</th>' +
        '<th class="num">Qtd.</th><th class="num">Valor</th></tr></thead>' +
      '<tbody>' + vendas.map(function (p) {
        var d = new Date(p.confirmado_em || p.criado_em);
        var quando = mesmoDia ? horaBonita(d)
          : String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') +
            ' ' + horaBonita(d);
        return '<tr><td class="nowrap">' + quando + '</td>' +
          '<td><span class="tabela-relatorio__quem">' + esc(p.cliente || '—') + '</span>' +
            '<span class="tabela-relatorio__oque">' + esc(p.produto || '—') +
            (p.cupom ? ' <span class="tabela-relatorio__cupom">cupom ' + esc(p.cupom) + '</span>' : '') +
            '</span></td>' +
          '<td class="num">' + Math.max(1, Number(p.quantidade || 1)) + '</td>' +
          '<td class="num">' + moeda(p.valor) + '</td></tr>';
      }).join('') + '</tbody>';
  }

  /* ---------- montar ---------- */

  (async function () {
    var user = await Auth.exigirLogin('../login.html');
    if (!user) return;

    await Moldura.montar({ aba: 'mais' });
    Moldura.aoNovo(function () { location.href = '../index.html#novo'; });
    achar('volta').innerHTML = Moldura.svg('volta', 20, 1.9);

    /* Lucro é número de dono: o atendente não vê o cartão nem a coluna
       (a mesma regra da tela Relatórios). */
    verCusto = await Moldura.podeVerCusto();
    if (!verCusto) achar('cartao-lucro').hidden = true;

    var campoDe = achar('de');
    var campoAte = achar('ate');
    var erro = achar('erro');
    var vez = 0;

    async function atualizar() {
      var inicio = doCampo(campoDe.value);
      var fim = doCampo(campoAte.value);
      if (!inicio || !fim) return;
      /* datas trocadas viram o período certo, em vez de um relatório vazio */
      if (fim < inicio) { var t = inicio; inicio = fim; fim = t; }
      var fimExclusivo = new Date(fim); fimExclusivo.setDate(fimExclusivo.getDate() + 1);

      var minha = ++vez;
      try {
        var vendas = await buscar(inicio, fimExclusivo);
        if (minha !== vez) return;       /* chegou a resposta de uma escolha antiga */
        erro.hidden = true;
        pintar(vendas, inicio, fim);
      } catch (e) {
        if (minha !== vez) return;
        erro.hidden = false;
        erro.textContent = 'Não consegui ler as vendas do período: ' +
          (e && e.message ? e.message : 'erro desconhecido') + '. Tente de novo.';
      }
    }

    function usarAtalho(nome) {
      var p = atalho(nome);
      campoDe.value = paraCampo(p[0]);
      campoAte.value = paraCampo(p[1]);
      document.querySelectorAll('[data-atalho]').forEach(function (b) {
        b.classList.toggle('is-ativo', b.getAttribute('data-atalho') === nome);
      });
      atualizar();
    }

    document.querySelectorAll('[data-atalho]').forEach(function (b) {
      b.addEventListener('click', function () { usarAtalho(b.getAttribute('data-atalho')); });
    });
    [campoDe, campoAte].forEach(function (c) {
      c.addEventListener('change', function () {
        /* data escolhida à mão: nenhum atalho fica marcado */
        document.querySelectorAll('[data-atalho]').forEach(function (b) { b.classList.remove('is-ativo'); });
        atualizar();
      });
    });
    achar('imprimir').addEventListener('click', function () { window.print(); });

    usarAtalho('hoje');
    Moldura.animarEntrada('.bloco, .numeros');
  })();
})();
