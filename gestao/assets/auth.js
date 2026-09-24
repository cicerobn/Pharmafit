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

  /* A BIBLIOTECA VEM DO PRÓPRIO SITE.
   *
   * Antes ela vinha só de `cdn.jsdelivr.net`, com 6 segundos de paciência.
   * Aqui isso é pior que no site do cliente: quando a biblioteca não
   * chegava, o painel caía em MODO DEMONSTRAÇÃO — a equipe abriria a
   * tela, veria dados que não são do negócio e poderia achar que não
   * houve venda nenhuma. Falha que mostra número errado sem dizer que
   * está errado é a pior que existe num painel.
   *
   * Agora o arquivo é servido do mesmo domínio, e o CDN é só reserva.
   * A versão está no NOME do arquivo: versão nova é endereço novo, e
   * nenhum cache guarda resposta velha de endereço que não existia. */
  var ARQUIVO = 'assets/js/vendor/supabase-2.116.0.js';
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var TIMEOUT_LOCAL = 12000;
  var TIMEOUT_CDN = 8000;

  /** Quantos "../" para chegar à raiz do site a partir desta página.
      O painel mora em /gestao/ e o painel novo em /gestao/app/, então o
      caminho não pode ser fixo. */
  function daRaiz(caminho) {
    var pasta = location.pathname.replace(/[^/]*$/, '');
    var fundo = pasta.split('/').filter(Boolean).length;
    return new Array(fundo + 1).join('../') + caminho;
  }

  var configurado = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  var DEMO_KEY = (cfg.STORAGE_KEY || 'pharmafit_gestao_auth') + '_demo';
  var sb = null;

  /* ---------- carga da biblioteca (não bloqueia a página) ---------- */



  function buscar(src, limite) {
    return new Promise(function (resolve) {
      var pronto = false;
      function fim(ok) {
        if (pronto) return;
        pronto = true;
        resolve(ok && !!(window.supabase && window.supabase.createClient));
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { fim(true); };
      s.onerror = function () { fim(false); };
      document.head.appendChild(s);
      /* Estourar o tempo não é "não veio": o arquivo pode ter chegado
         logo depois. Por isso fim(true) aqui — quem decide é a checagem
         de `window.supabase` lá dentro. */
      setTimeout(function () { fim(true); }, limite);
    });
  }

  async function carregarLib() {
    if (window.supabase && window.supabase.createClient) return true;
    if (await buscar(daRaiz(ARQUIVO), TIMEOUT_LOCAL)) return true;
    return await buscar(CDN, TIMEOUT_CDN);
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

        /* SENHA CERTA NÃO É A MESMA COISA QUE TER ACESSO.
         *
         * Brian, 18/09/2026: "essa conta de davis robert tem que ser a
         * unica conta com acesso ao painel adm, mais nenhuma outra
         * conta". Só que a porta da gestão abria para QUALQUER conta do
         * Supabase — inclusive a de um cliente que criou conta no site
         * para acompanhar os pedidos dele. A lista de e-mails do
         * `config.js` está vazia de propósito (quem decide é o banco), e
         * `exigirLogin` só olhava essa lista: o estranho entrava, o
         * painel montava, e as telas vinham VAZIAS — porque aí sim a RLS
         * barrava a leitura. Dado nenhum vazava, e ainda assim estava
         * errado: quem não tem acesso tem de ouvir "não tem acesso", e
         * não achar que o painel está quebrado.
         *
         * Pergunto ao banco quem é da equipe (`pf_e_equipe()`, que
         * responde só sobre quem está perguntando). Se a resposta for um
         * NÃO claro, eu encerro a sessão e devolvo o recado aqui mesmo,
         * no formulário. Se a pergunta falhar (rede, função fora do ar),
         * eu deixo passar: a proteção que vale é a do banco, e trancar
         * por dúvida técnica trancaria o dono do lado de fora. */
        var daEquipe = await Auth.daEquipe();
        if (daEquipe === false) {
          try { await sb.auth.signOut(); } catch (e2) {}
          return { ok: false, erro: 'Sua conta não tem permissão para acessar a gestão.' };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: traduzErro(e && e.message) };
      }
    },

    /** É da equipe? true, false, ou null quando não deu para saber. */
    daEquipe: async function () {
      await pronto;
      /* sem banco é modo demonstração: não há a quem perguntar */
      if (!sb) return null;
      try {
        var r = await sb.rpc('pf_e_equipe');
        if (!r || r.error) return null;
        return typeof r.data === 'boolean' ? r.data : null;
      } catch (e) {
        return null;
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
        /* O LINK DO E-MAIL VOLTA PARA A TELA DE SENHA NOVA (24/09/2026).
           Antes voltava para `index.html`: a pessoa entrava no painel
           pelo link e nunca criava a senha nova — no próximo acesso,
           continuava sem saber a senha. */
        var redirect = location.href.replace(/[^/]*$/, 'login.html?nova-senha=1');
        var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
        if (r.error) return { ok: false, erro: traduzErro(r.error.message) };
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: traduzErro(e && e.message) };
      }
    },

    /** Grava a senha nova de quem chegou pelo link do e-mail. */
    novaSenha: async function (senha) {
      await pronto;
      if (!sb) return { ok: false, erro: 'Sem conexão com o banco.' };
      try {
        var s = await sb.auth.getSession();
        if (!s || !s.data || !s.data.session) {
          return { ok: false, erro: 'O link expirou ou já foi usado. Peça outro em "Esqueci minha senha".' };
        }
        var r = await sb.auth.updateUser({ password: senha });
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

      /* E A MESMA PERGUNTA EM TODA TELA, não só no login: a pessoa pode
         ter sido tirada da equipe depois de entrar, e a sessão dura
         dias. `Auth.sair()` ANTES de mandar para o login é o que evita
         o pingue-pongue — a tela de login manda quem está logado direto
         para o painel, e sem encerrar a sessão os dois ficariam se
         empurrando para sempre. */
      if ((await Auth.daEquipe()) === false) {
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
