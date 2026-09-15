/* =========================================================
   PHARMA FIT — cálculos dos relatórios

   Funções puras usadas pelo painel: fechamento por mês,
   rankings e lista de clientes inativos.
   ========================================================= */
(function () {
  'use strict';

  var cfg = window.PHARMAFIT_CONFIG || {};

  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function confirmados(pedidos) {
    return (pedidos || []).filter(function (p) {
      var s = String(p.status || '').toLowerCase();
      return s === 'confirmado' || s === 'enviado' || s === 'pago';
    });
  }

  function dataDe(p) {
    return new Date(p.confirmado_em || p.criado_em || p.data || 0);
  }

  function chaveMes(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  var Analise = {

    MESES: MESES,
    confirmados: confirmados,
    chaveMes: chaveMes,

    /** Meses do início configurado (agosto por padrão) até o mês atual. */
    meses: function (ate) {
      var inicio = cfg.MES_INICIAL || { ano: 2026, mes: 8 };
      var fim = ate || new Date();
      var lista = [];

      var ano = inicio.ano;
      var mes = inicio.mes - 1;

      /* segurança: no máximo 60 meses */
      for (var i = 0; i < 60; i++) {
        if (ano > fim.getFullYear() || (ano === fim.getFullYear() && mes > fim.getMonth())) break;
        lista.push({
          ano: ano,
          mes: mes + 1,
          chave: ano + '-' + String(mes + 1).padStart(2, '0'),
          rotulo: MESES[mes] + ' de ' + ano,
          curto: MESES[mes].slice(0, 3) + '/' + String(ano).slice(2)
        });
        mes++;
        if (mes > 11) { mes = 0; ano++; }
      }
      return lista.reverse(); /* mais recente primeiro */
    },

    /** Fechamento de um mês: faturamento, custo, gasto, lucro e pagamentos. */
    resumoMes: function (pedidos, despesas, chave) {
      var vendas = confirmados(pedidos).filter(function (p) {
        return chaveMes(dataDe(p)) === chave;
      });

      var faturamento = vendas.reduce(function (t, p) { return t + Number(p.valor || 0); }, 0);
      var custo = vendas.reduce(function (t, p) { return t + Number(p.custo || 0); }, 0);

      var gasto = (despesas || []).filter(function (d) {
        return chaveMes(new Date(d.data || d.criado_em)) === chave;
      }).reduce(function (t, d) { return t + Number(d.valor || 0); }, 0);

      var pagamentos = Analise.rankingPagamentos(vendas);

      /* Venda sem custo cadastrado.
       *
       * Custo zerado não quer dizer "custou zero": quer dizer que ninguém
       * preencheu. E a conta não sabe a diferença — ela subtrai zero e o lucro
       * sai INTEIRO, do tamanho do faturamento, com cara de número certo.
       *
       * O catálogo tem um produto assim hoje (Tirzedral 15 mg — 4 ampolas). Os
       * irmãos dele custam por volta de R$ 450, então o lucro dele apareceria
       * uns R$ 450 maior do que é, por venda. Ninguém olha um lucro bom
       * desconfiando dele.
       *
       * Eu não invento esse custo: é número do negócio, e quem sabe é o Brian.
       * O que a tela pode fazer é não afirmar o que não sabe — então a conta
       * continua igual, e vai junto o tamanho da dúvida. */
      var semCusto = vendas.filter(function (p) { return !Number(p.custo || 0); });
      var faturamentoSemCusto = semCusto.reduce(function (t, p) { return t + Number(p.valor || 0); }, 0);

      return {
        chave: chave,
        vendas: vendas.length,
        faturamento: faturamento,
        custo: custo,
        lucroBruto: faturamento - custo,
        gasto: gasto,
        lucro: faturamento - custo - gasto,
        ticket: vendas.length ? faturamento / vendas.length : 0,
        pagamentoTop: pagamentos.length ? pagamentos[0] : null,
        pagamentos: pagamentos,
        semCusto: semCusto.length,
        semCustoValor: faturamentoSemCusto,
        semCustoProdutos: Analise.ranking(semCusto, 'produto').map(function (i) { return i.nome; }),
        pedidos: vendas
      };
    },

    /** Agrupa vendas por um campo e soma valores. */
    ranking: function (pedidos, campo, rotuloVazio) {
      var mapa = {};

      confirmados(pedidos).forEach(function (p) {
        var chave = String(p[campo] || '').trim() || (rotuloVazio || 'Não informado');
        if (!mapa[chave]) mapa[chave] = { nome: chave, total: 0, quantidade: 0, lucro: 0 };
        mapa[chave].total += Number(p.valor || 0);
        mapa[chave].lucro += Number(p.valor || 0) - Number(p.custo || 0);
        mapa[chave].quantidade++;
      });

      return Object.keys(mapa).map(function (k) { return mapa[k]; })
        .sort(function (a, b) { return b.total - a.total; });
    },

    rankingClientes: function (pedidos) { return Analise.ranking(pedidos, 'cliente'); },
    rankingProdutos: function (pedidos) { return Analise.ranking(pedidos, 'produto'); },
    rankingVendedores: function (pedidos) { return Analise.ranking(pedidos, 'vendedor', 'Sem vendedor'); },
    rankingPagamentos: function (pedidos) { return Analise.ranking(pedidos, 'pagamento', 'Não informado'); },

    /** Maior venda individual já registrada. */
    maiorVenda: function (pedidos) {
      return confirmados(pedidos).slice().sort(function (a, b) {
        return Number(b.valor || 0) - Number(a.valor || 0);
      })[0] || null;
    },

    /**
     * Clientes sem comprar há mais de N dias, do mais antigo para o
     * mais recente — é a fila de recuperação.
     */
    inativos: function (pedidos, dias) {
      dias = dias || cfg.DIAS_INATIVIDADE || 60;
      var limite = Date.now() - dias * 24 * 60 * 60 * 1000;
      var mapa = {};

      confirmados(pedidos).forEach(function (p) {
        var nome = String(p.cliente || '').trim();
        if (!nome) return;
        var quando = dataDe(p).getTime();

        if (!mapa[nome]) {
          mapa[nome] = { cliente: nome, telefone: p.telefone || '', ultima: quando,
                         ultimoProduto: p.produto || '', total: 0, compras: 0 };
        }
        if (quando > mapa[nome].ultima) {
          mapa[nome].ultima = quando;
          mapa[nome].ultimoProduto = p.produto || '';
        }
        if (p.telefone) mapa[nome].telefone = p.telefone;
        mapa[nome].total += Number(p.valor || 0);
        mapa[nome].compras++;
      });

      return Object.keys(mapa).map(function (k) { return mapa[k]; })
        .filter(function (c) { return c.ultima < limite; })
        .map(function (c) {
          c.diasParado = Math.floor((Date.now() - c.ultima) / (24 * 60 * 60 * 1000));
          return c;
        })
        .sort(function (a, b) { return a.ultima - b.ultima; });
    }
  };

  window.PharmaFitAnalise = Analise;
})();
