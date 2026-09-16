/* =========================================================
   PHARMA FIT — conexão do site com o banco

   Carrega o Supabase sem travar a página. Sem configuração,
   tudo continua funcionando em modo demonstração, guardando
   no próprio navegador.
   ========================================================= */
(function () {
  'use strict';

  var cfg = window.PHARMAFIT_CONFIG || {};

  /* A BIBLIOTECA VEM DO PRÓPRIO SITE, E NÃO DE UM CDN.
   *
   * Entrar e criar conta dependiam de `cdn.jsdelivr.net` responder em 6
   * segundos. Quando não respondia, `sb` ficava nulo e a tela dizia "A
   * conta ainda não está ligada neste site" — uma frase falsa, porque o
   * site está ligado; era a biblioteca que não tinha chegado. E numa
   * conexão de celular fraca 6 segundos passam fácil.
   *
   * Nada disso aparecia no servidor: sem a biblioteca, o pedido de
   * cadastro nem era feito, então o log do Supabase ficava em branco e
   * o defeito não deixava rastro em lugar nenhum.
   *
   * Agora o arquivo é servido daqui, do mesmo domínio que a pessoa já
   * abriu. A versão está NO NOME do arquivo de propósito: versão nova é
   * endereço novo, e nenhum cache guarda uma resposta velha para um
   * endereço que ainda não existia.
   *
   * O CDN continua como segunda tentativa, para o caso de alguém
   * publicar sem a pasta `vendor/`. */
  var LOCAL = 'assets/js/vendor/supabase-2.116.0.js';
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var PREFIXO = 'pharmafit_demo_';
  var sb = null;

  /* Por que a biblioteca não carregou. A tela usa isto para falar a
     verdade em vez de chutar um motivo. */
  var motivo = '';

  /** Quantos "../" para chegar à raiz do site a partir desta página.
   *
   *  As páginas do site ficam na raiz, mas o 404 pode ser servido em
   *  QUALQUER endereço — inclusive /pasta/que/nao/existe — e lá um
   *  caminho fixo apontaria para o lugar errado. Contar a profundidade
   *  do endereço atual acerta nos dois casos, e é o mesmo cálculo que o
   *  auth.js do painel faz (ele mora em /gestao/ e em /gestao/app/). */
  function daRaiz(caminho) {
    var pasta = location.pathname.replace(/[^/]*$/, '');
    var fundo = pasta.split('/').filter(Boolean).length;
    return new Array(fundo + 1).join('../') + caminho;
  }



  function carregar(src, limite) {
    return new Promise(function (resolve) {
      var pronto = false;
      function acabou(ok) {
        if (pronto) return;
        pronto = true;
        resolve(ok && !!(window.supabase && window.supabase.createClient));
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { acabou(true); };
      s.onerror = function () { acabou(false); };
      document.head.appendChild(s);
      setTimeout(function () { acabou(true); }, limite);
    });
  }

  var pronto = (async function () {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      motivo = 'sem-configuracao';
      return;
    }

    if (!(window.supabase && window.supabase.createClient)) {
      /* Do próprio site: 12 segundos, porque aqui a demora é a conexão da
         pessoa, e desistir rápido de um arquivo que vai chegar é pior
         que esperar. */
      var deu = await carregar(daRaiz(LOCAL), 12000);
      /* Só então o CDN, como reserva. */
      if (!deu) deu = await carregar(CDN, 8000);
      if (!deu) {
        motivo = 'biblioteca-nao-carregou';
        return;
      }
    }

    try {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    } catch (e) {
      motivo = 'biblioteca-nao-carregou';
      console.warn('[Pharma Fit] Supabase indisponível:', e);
    }
  })();

  function chaveLocal(colecao) {
    return PREFIXO + colecao;
  }

  /* O NOME DA TABELA NO BANCO, COM O PREFIXO DA PHARMA FIT.
   *
   * Isto estava faltando, e era um buraco grande: o site pedia
   * `pedidos`, `espera`, `orcamentos`, `representantes` e `produtos`
   * pelo nome cru.
   *
   * O banco é compartilhado por oito negócios. Quando as tabelas da
   * Pharma Fit ganharam o prefixo `pf_` (migração 02), o PAINEL foi
   * ajustado — ele tem o ajudante `T()` desde então. O SITE não. Ficou
   * pedindo nomes que não existem mais, e o resultado, medido no banco
   * de produção hoje:
   *
   *   pedidos, espera, orcamentos, representantes  ->  NÃO EXISTEM
   *   produtos                                     ->  existe, e é de
   *                                                    OUTRO negócio
   *
   * Ou seja: todo formulário do site tentava gravar num lugar que não
   * existe, e a vitrine tentava ler o catálogo do vizinho (que, por
   * sorte, tem a leitura fechada e devolvia vazio — senão o site
   * mostraria produto de outra empresa).
   *
   * Erro assim não aparece em teste de tela nenhum: o formulário abre,
   * valida, o botão responde. Só a gravação é que não chega.
   *
   * O prefixo vem do MESMO lugar que o do painel (config.js), para as
   * duas metades nunca mais discordarem. Se ele estiver vazio, o nome
   * sai cru — que é o certo para quem não usa prefixo. */
  function tabela(colecao) {
    return (cfg.PREFIXO_TABELAS || '') + colecao;
  }

  var Nuvem = {

    pronto: pronto,
    cliente: function () { return sb; },

    /**
     * Por que não há banco. Devolve 'sem-configuracao' (ninguém preencheu
     * a URL e a chave) ou 'biblioteca-nao-carregou' (está tudo
     * configurado, mas o arquivo não chegou). São problemas diferentes e
     * a pessoa merece saber qual é o dela: um é obra do dono do site, o
     * outro é conexão e resolve tentando de novo.
     */
    porQueNao: function () { return motivo; },

    /**
     * Tenta carregar outra vez, para o botão "Tentar de novo" existir de
     * verdade em vez de só recarregar a página e dar no mesmo.
     */
    tentarDeNovo: async function () {
      if (sb) return true;
      if (motivo === 'sem-configuracao') return false;
      motivo = '';
      var deu = (window.supabase && window.supabase.createClient)
        || await carregar(daRaiz(LOCAL), 12000)
        || await carregar(CDN, 8000);
      if (!deu) { motivo = 'biblioteca-nao-carregou'; return false; }
      try {
        sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        return true;
      } catch (e) {
        motivo = 'biblioteca-nao-carregou';
        return false;
      }
    },

    /** Lê uma coleção. Sem banco, lê do navegador. */
    buscar: async function (colecao, ordem) {
      await pronto;

      if (!sb) {
        try { return JSON.parse(localStorage.getItem(chaveLocal(colecao)) || '[]'); }
        catch (e) { return []; }
      }

      try {
        var q = sb.from(tabela(colecao)).select('*');
        if (ordem) q = q.order(ordem);
        var r = await q;
        if (r.error) { console.warn('[Pharma Fit] ' + colecao + ':', r.error.message); return null; }
        return r.data || [];
      } catch (e) {
        return null;
      }
    },

    /** Grava um registro. Sem banco, guarda no navegador. */
    inserir: async function (colecao, registro) {
      await pronto;

      if (!sb) {
        try {
          var chave = chaveLocal(colecao);
          var lista = JSON.parse(localStorage.getItem(chave) || '[]');
          registro = Object.assign({
            id: 'loc-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            criado_em: new Date().toISOString()
          }, registro);
          lista.unshift(registro);
          localStorage.setItem(chave, JSON.stringify(lista));
          window.dispatchEvent(new CustomEvent('pharmafit-dados', { detail: { chave: chave } }));
        } catch (e) {}
        return { ok: true, local: true };
      }

      try {
        var r = await sb.from(tabela(colecao)).insert(registro);
        if (r.error) return { ok: false, erro: r.error.message };
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: String(e && e.message || e) };
      }
    }
  };

  window.PharmaFitNuvem = Nuvem;
})();
