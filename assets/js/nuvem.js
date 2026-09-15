/* =========================================================
   PHARMA FIT — conexão do site com o banco

   Carrega o Supabase sem travar a página. Sem configuração,
   tudo continua funcionando em modo demonstração, guardando
   no próprio navegador.
   ========================================================= */
(function () {
  'use strict';

  var cfg = window.PHARMAFIT_CONFIG || {};
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var PREFIXO = 'pharmafit_demo_';
  var sb = null;

  var pronto = (async function () {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

    await new Promise(function (resolve) {
      if (window.supabase && window.supabase.createClient) return resolve();
      var s = document.createElement('script');
      s.src = CDN;
      s.async = true;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
      setTimeout(resolve, 6000);
    });

    try {
      if (window.supabase && window.supabase.createClient) {
        sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      }
    } catch (e) {
      console.warn('[Pharma Fit] Supabase indisponível:', e);
    }
  })();

  function chaveLocal(colecao) {
    return PREFIXO + colecao;
  }

  var Nuvem = {

    pronto: pronto,
    cliente: function () { return sb; },

    /** Lê uma coleção. Sem banco, lê do navegador. */
    buscar: async function (colecao, ordem) {
      await pronto;

      if (!sb) {
        try { return JSON.parse(localStorage.getItem(chaveLocal(colecao)) || '[]'); }
        catch (e) { return []; }
      }

      try {
        var q = sb.from(colecao).select('*');
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
        var r = await sb.from(colecao).insert(registro);
        if (r.error) return { ok: false, erro: r.error.message };
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: String(e && e.message || e) };
      }
    }
  };

  window.PharmaFitNuvem = Nuvem;
})();
