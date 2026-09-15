/* =========================================================
   PHARMA FIT — camada de autenticação da gestão

   Usa Supabase Auth quando o projeto está configurado em
   config.js. Sem configuração (ou sem conseguir carregar a
   biblioteca), cai em modo demonstração — sessão local,
   apenas para visualizar as telas.

   Uso:
     await PharmaFitAuth.pronto;      // aguarda a inicialização
     PharmaFitAuth.modo               // 'supabase' | 'demo'
   ========================================================= */
(function () {
  'use strict';

  var cfg = window.PHARMAFIT_CONFIG || {};
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var TIMEOUT_LIB = 6000;

  var configurado = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  var DEMO_KEY = (cfg.STORAGE_KEY || 'pharmafit_gestao_auth') + '_demo';
  var sb = null;

  /* ---------- carga da biblioteca (não bloqueia a página) ---------- */

  function carregarLib() {
    return new Promise(function (resolve) {
      if (window.supabase && window.supabase.createClient) return resolve(true);

      var pronto = false;
      function fim(ok) { if (!pronto) { pronto = true; resolve(ok); } }

      var s = document.createElement('script');
      s.src = CDN;
      s.async = true;
      s.onload = function () { fim(!!(window.supabase && window.supabase.createClient)); };
      s.onerror = function () { fim(false); };
      document.head.appendChild(s);

      setTimeout(function () { fim(false); }, TIMEOUT_LIB);
    });
  }

  var pronto = (async function iniciar() {
    if (!configurado) return 'demo';

    var ok = await carregarLib();
    if (!ok) {
      console.warn('[Pharma Fit] Biblioteca do Supabase indisponível — modo demonstração.');
      return 'demo';
    }
    try {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: cfg.STORAGE_KEY || 'pharmafit_gestao_auth'
        }
      });
      Auth.modo = 'supabase';
      return 'supabase';
    } catch (e) {
      console.error('[Pharma Fit] Falha ao iniciar o Supabase:', e);
      return 'demo';
    }
  })();

  /* ---------- helpers ---------- */

  function emailPermitido(email) {
    var lista = cfg.EMAILS_AUTORIZADOS || [];
    if (!lista.length) return true;
    return lista.map(function (e) { return String(e).toLowerCase(); })
                .indexOf(String(email).toLowerCase()) !== -1;
  }

  function usuarioDemo() {
    try {
      var raw = sessionStorage.getItem(DEMO_KEY) || localStorage.getItem(DEMO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function traduzErro(msg) {
    msg = String(msg || '');
    if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
    if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.';
    if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas. Aguarde alguns minutos.';
    if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão com o servidor. Verifique sua internet.';
    return msg || 'Não foi possível entrar. Tente novamente.';
  }

  /* ---------- API pública ---------- */

  var Auth = {

    /** Promise resolvida quando a inicialização termina. */
    pronto: pronto,

    /** 'supabase' após inicializar com sucesso; 'demo' caso contrário. */
    modo: 'demo',

    /** true se config.js tem URL e chave preenchidas. */
    configurado: configurado,

    /** Usuário da sessão atual, ou null. */
    usuario: async function () {
      await pronto;
      if (!sb) return usuarioDemo();
      try {
        var r = await sb.auth.getSession();
        return (r.data && r.data.session) ? r.data.session.user : null;
      } catch (e) {
        return null;
      }
    },

    /** Entra com e-mail e senha. Retorna { ok, erro }. */
    entrar: async function (email, senha, lembrar) {
      await pronto;

      email = String(email || '').trim();
      senha = String(senha || '');

      if (!email || !senha) return { ok: false, erro: 'Preencha e-mail e senha.' };
      if (!emailPermitido(email)) return { ok: false, erro: 'Este e-mail não tem acesso à gestão.' };

      if (!sb) {
        var d = cfg.DEMO || {};
        if (email.toLowerCase() !== String(d.email).toLowerCase() || senha !== d.senha) {
          return { ok: false, erro: 'E-mail ou senha incorretos.' };
        }
        var user = { email: d.email, nome: d.nome || 'Gestão', demo: true };
        try {
          (lembrar ? localStorage : sessionStorage).setItem(DEMO_KEY, JSON.stringify(user));
        } catch (e) {}
        return { ok: true };
      }

      try {
        var r = await sb.auth.signInWithPassword({ email: email, password: senha });
        if (r.error) return { ok: false, erro: traduzErro(r.error.message) };
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: traduzErro(e && e.message) };
      }
    },

    /** Encerra a sessão. */
    sair: async function () {
      await pronto;
      try {
        sessionStorage.removeItem(DEMO_KEY);
        localStorage.removeItem(DEMO_KEY);
      } catch (e) {}
      if (sb) { try { await sb.auth.signOut(); } catch (e) {} }
    },

    /** Envia e-mail de redefinição de senha. */
    recuperarSenha: async function (email) {
      await pronto;

      email = String(email || '').trim();
      if (!email) return { ok: false, erro: 'Informe seu e-mail para receber o link.' };
      if (!sb) return { ok: false, erro: 'Recuperação de senha exige o Supabase configurado.' };

      try {
        var redirect = location.href.replace(/[^/]*$/, 'index.html');
        var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
        if (r.error) return { ok: false, erro: traduzErro(r.error.message) };
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: traduzErro(e && e.message) };
      }
    },

    /** Redireciona para o login se não houver sessão. Retorna o usuário. */
    exigirLogin: async function (destinoLogin) {
      var user = await Auth.usuario();
      if (!user) {
        location.replace(destinoLogin || 'login.html');
        return null;
      }
      if (user.email && !emailPermitido(user.email)) {
        await Auth.sair();
        location.replace((destinoLogin || 'login.html') + '?erro=sem-acesso');
        return null;
      }
      return user;
    },

    /** Cliente Supabase (null no modo demonstração), para consultas do painel. */
    cliente: function () { return sb; }
  };

  window.PharmaFitAuth = Auth;
})();
