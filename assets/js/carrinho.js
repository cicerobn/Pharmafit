/* =========================================================
   PHARMA FIT — carrinho

   Guarda no próprio aparelho o que a pessoa escolheu. Nada vai
   para servidor nenhum antes de ela fechar o pedido.

   O QUE ELE GUARDA, E O QUE NÃO GUARDA

   Guarda o NOME do produto e a QUANTIDADE. Não guarda preço.

   Isso não é descuido, é de propósito. Preço guardado no aparelho
   envelhece: a pessoa põe no carrinho hoje, volta semana que vem,
   o preço mudou e ela vê o antigo. Pior: quem mexer no navegador
   consegue trocar o número. Então o preço é sempre lido do
   catálogo na hora de mostrar — e o pedido sai para a equipe com
   valor zero, como o site já fazia, porque quem diz quanto custa
   é a equipe no painel, nunca o navegador do cliente.
   ========================================================= */
(function () {
  'use strict';

  var CHAVE = 'pharmafit_carrinho';
  var EVENTO = 'pharmafit-carrinho';

  function ler() {
    try {
      var raw = localStorage.getItem(CHAVE);
      var lista = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(lista)) return [];
      /* Limpa o que não tem forma de item: um localStorage editado à mão
         não pode derrubar a página. */
      return lista.filter(function (i) {
        return i && typeof i.nome === 'string' && i.nome.trim();
      }).map(function (i) {
        return { nome: i.nome.trim(), quantidade: Math.max(1, Math.min(999, Number(i.quantidade) || 1)) };
      });
    } catch (e) {
      return [];
    }
  }

  function gravar(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent(EVENTO, { detail: { itens: lista.length } }));
    } catch (e) {}
  }

  /** O produto do catálogo, pelo nome. O catálogo é a fonte do preço. */
  function doCatalogo(nome) {
    var alvo = String(nome || '').trim().toLowerCase();
    var achado = null;
    (window.PHARMAFIT_CATALOGO || []).forEach(function (p) {
      if (String(p.nome).trim().toLowerCase() === alvo) achado = p;
    });
    return achado;
  }

  /**
   * O preço de um produto para uma quantidade.
   *
   * Quando o produto tem faixas de atacado no catálogo, a faixa manda.
   * Quando não tem, vale o preço de venda e a tela não mostra faixa
   * nenhuma — faixa vazia não aparece. Hoje só o Tirzec Pen tem faixa.
   */
  function precoPara(produto, quantidade) {
    if (!produto) return { preco: 0, faixa: null, faixas: [] };

    var faixas = Array.isArray(produto.atacado) ? produto.atacado.slice() : [];
    var q = Math.max(1, Number(quantidade) || 1);

    if (!faixas.length) {
      return { preco: Number(produto.venda || 0), faixa: null, faixas: [] };
    }

    /* Ordena pela quantidade mínima, para a busca não depender da ordem
       em que alguém escreveu no catálogo. */
    faixas.sort(function (a, b) { return Number(a.de || 1) - Number(b.de || 1); });

    var valendo = null;
    faixas.forEach(function (f) {
      if (q >= Number(f.de || 1)) valendo = f;
    });
    if (!valendo) valendo = faixas[0];

    /* A próxima faixa, para a tela poder dizer quanto falta para ela. */
    var proxima = null;
    faixas.forEach(function (f) {
      if (Number(f.de || 1) > q && (!proxima || Number(f.de) < Number(proxima.de))) proxima = f;
    });

    return {
      preco: Number(valendo.preco || produto.venda || 0),
      faixa: valendo,
      proxima: proxima,
      faltam: proxima ? Number(proxima.de) - q : 0,
      faixas: faixas
    };
  }

  var Carrinho = {
    EVENTO: EVENTO,
    precoPara: precoPara,
    doCatalogo: doCatalogo,

    itens: ler,

    /** Quantos itens (somando as quantidades). */
    quantos: function () {
      return ler().reduce(function (t, i) { return t + i.quantidade; }, 0);
    },

    /** Põe no carrinho. Se já estiver lá, soma à quantidade. */
    por: function (nome, quantidade) {
      var lista = ler();
      var q = Math.max(1, Number(quantidade) || 1);
      var achou = false;

      lista.forEach(function (i) {
        if (i.nome.toLowerCase() === String(nome).trim().toLowerCase()) {
          i.quantidade = Math.min(999, i.quantidade + q);
          achou = true;
        }
      });

      if (!achou) lista.push({ nome: String(nome).trim(), quantidade: q });
      gravar(lista);
      return lista;
    },

    trocarQuantidade: function (nome, quantidade) {
      var q = Number(quantidade) || 0;
      if (q < 1) return Carrinho.tirar(nome);
      var lista = ler();
      lista.forEach(function (i) {
        if (i.nome.toLowerCase() === String(nome).trim().toLowerCase()) {
          i.quantidade = Math.min(999, q);
        }
      });
      gravar(lista);
      return lista;
    },

    tirar: function (nome) {
      var alvo = String(nome).trim().toLowerCase();
      var lista = ler().filter(function (i) { return i.nome.toLowerCase() !== alvo; });
      gravar(lista);
      return lista;
    },

    limpar: function () { gravar([]); },

    /**
     * O carrinho com os preços de agora.
     *
     * Devolve também o que NÃO foi achado no catálogo: produto que saiu
     * de linha depois de entrar no carrinho tem de ser dito, e não
     * somado como se valesse zero.
     */
    conta: function () {
      var itens = [];
      var perdidos = [];
      var total = 0;
      var unidades = 0;

      ler().forEach(function (i) {
        var p = doCatalogo(i.nome);
        if (!p) { perdidos.push(i.nome); return; }

        var r = precoPara(p, i.quantidade);
        var subtotal = r.preco * i.quantidade;

        itens.push({
          nome: i.nome,
          quantidade: i.quantidade,
          produto: p,
          preco: r.preco,
          subtotal: subtotal,
          faixa: r.faixa,
          proxima: r.proxima,
          faltam: r.faltam,
          semEstoque: p.estoque !== null && p.estoque !== undefined &&
                      p.estoque !== '' && Number(p.estoque) <= 0
        });

        total += subtotal;
        unidades += i.quantidade;
      });

      return { itens: itens, perdidos: perdidos, total: total, unidades: unidades };
    }
  };

  window.PharmaFitCarrinho = Carrinho;
})();
