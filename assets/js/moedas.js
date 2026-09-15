/* =========================================================
   PHARMA FIT — as outras moedas

   O preço do site é em real. Esta parte mostra o mesmo valor em
   dólar, guarani e peso, para o cliente de fora ter ideia do que
   vai pagar.

   DE ONDE VEM A COTAÇÃO

   Do painel: o Brian digita e ela vale até ele trocar. Não busco
   cotação automática — sem ele me dizer qual fonte aceita como
   boa, eu estaria escolhendo por ele um número que vira preço.

   SEM COTAÇÃO, NENHUMA MOEDA APARECE

   Não mostro "G$ 0" nem "—". Valor de dinheiro zerado na tela é
   pior que ausência: a pessoa acha que é de graça, ou acha que o
   site está quebrado. Enquanto a cotação não estiver preenchida,
   a tela fala só em real.

   POR QUE A COTAÇÃO AINDA NÃO CHEGA AO SITE

   Ela é guardada em pf_configuracoes, que hoje só a equipe lê — e
   está certo assim, porque essa tabela vai guardar coisas que não
   podem ser públicas. A regra que libera SÓ as chaves de cotação
   está escrita e pronta em
   gestao/supabase/migracao-04-cotacao-publica.sql, e não foi
   aplicada. Até lá, este arquivo devolve "sem cotação" e a tela
   fala só em real — que é a verdade, e não um erro.
   ========================================================= */
(function () {
  'use strict';

  var Nuvem = window.PharmaFitNuvem;

  /* As moedas que a loja mostra. `casas` é quantos centavos a moeda
     tem: guarani não tem centavo, então mostrar "G$ 1.516,62" seria
     escrever um valor que não existe. */
  var MOEDAS = [
    { id: 'usd', simbolo: 'US$', nome: 'dólar',   casas: 2, local: 'en-US' },
    { id: 'pyg', simbolo: 'G$',  nome: 'guarani', casas: 0, local: 'es-PY' },
    { id: 'ars', simbolo: 'AR$', nome: 'peso',    casas: 2, local: 'es-AR' }
  ];

  /* A chave no banco leva o prefixo `publico_` de propósito: é ele que
     a regra do banco usa para liberar a leitura. Privado por padrão,
     público por exceção — e a exceção fica visível no nome. */
  function chaveDe(id) { return 'publico_cotacao_' + id; }

  var cache = null;

  /** Lê as cotações. Devolve { usd: 5.4, ... , _quando: '2026-09-15' }. */
  async function ler() {
    if (cache) return cache;
    cache = {};

    if (!Nuvem) return cache;
    try { await Nuvem.pronto; } catch (e) {}
    var sb = Nuvem.cliente();
    if (!sb) return cache;

    try {
      var r = await sb.from('pf_configuracoes')
        .select('chave,valor,atualizado_em')
        .like('chave', 'publico_cotacao_%');

      if (r.error || !r.data) return cache;

      r.data.forEach(function (linha) {
        var id = String(linha.chave).replace('publico_cotacao_', '');
        var n = Number(String(linha.valor).replace(',', '.'));
        /* Cotação tem de ser um número positivo. Zero, vazio ou texto
           não viram "grátis": viram "sem cotação". */
        if (isFinite(n) && n > 0) {
          cache[id] = n;
          if (linha.atualizado_em && (!cache._quando || linha.atualizado_em < cache._quando)) {
            cache._quando = linha.atualizado_em;
          }
        }
      });
    } catch (e) { /* fica sem cotação, e a tela fala só em real */ }

    return cache;
  }

  var Moedas = {
    MOEDAS: MOEDAS,
    chaveDe: chaveDe,
    ler: ler,

    /** Esquece o que leu — para o painel ver o efeito ao salvar. */
    recarregar: function () { cache = null; },

    /**
     * Converte reais para as moedas que TÊM cotação.
     * Devolve [] quando nenhuma tem — e a tela não desenha nada.
     */
    converter: async function (reais) {
      var taxas = await ler();
      var saida = [];

      MOEDAS.forEach(function (m) {
        var taxa = taxas[m.id];
        if (!taxa) return;

        /* A taxa é "quantos reais custa 1 unidade desta moeda". Então
           dividir: R$ 1.099 / 5,40 = US$ 203,52. */
        var valor = Number(reais) / taxa;
        saida.push({
          id: m.id,
          simbolo: m.simbolo,
          nome: m.nome,
          valor: valor,
          texto: m.simbolo + ' ' + valor.toLocaleString(m.local, {
            minimumFractionDigits: m.casas,
            maximumFractionDigits: m.casas
          })
        });
      });

      return saida;
    },

    /** Desde quando a cotação está lá, em texto curto. */
    desdeQuando: async function () {
      var taxas = await ler();
      if (!taxas._quando) return '';
      var d = new Date(taxas._quando);
      if (isNaN(d)) return '';

      var dias = Math.floor((Date.now() - d.getTime()) / 86400000);
      if (dias <= 0) return 'cotação de hoje';
      if (dias === 1) return 'cotação de ontem';
      return 'cotação de ' + d.toLocaleDateString('pt-BR');
    }
  };

  window.PharmaFitMoedas = Moedas;
})();
