/* =========================================================
   PHARMA FIT — conta do cliente (entrar e criar)

   Usa o Supabase Auth pelo cliente que o nuvem.js já criou. NÃO
   cria um segundo cliente nem repete a chave em lugar nenhum.

   O QUE ESTA CONTA É, E O QUE ELA AINDA NÃO É

   Entrar e criar conta funcionam hoje. Ver os pedidos DA CONTA (os
   mesmos em qualquer aparelho) depende de uma coluna nova em
   pf_pedidos, que é mudança de estrutura no banco de produção — está
   escrita e pronta em gestao/supabase/migracao-03-conta-do-cliente.sql,
   e não foi aplicada, porque essa decisão é do Brian.

   Enquanto ela não for aplicada, a lista de pedidos é a deste
   aparelho, como já era antes desta tela existir. O código já tenta a
   conta primeiro e cai para o aparelho — no dia em que a migração
   entrar, ele passa a mostrar a conta sem eu mexer em nada.

   O FURO QUE EU NÃO FIZ

   Seria fácil ligar pedido e pessoa pelo TELEFONE do cadastro. Não
   dá: o telefone fica nos dados que a própria pessoa edita, então
   qualquer cliente poderia pôr o telefone de outro e ler os pedidos
   dele. O vínculo tem de ser o identificador da conta, que o
   servidor escreve e ninguém de fora consegue trocar.
   ========================================================= */
(function () {
  'use strict';

  var Nuvem = window.PharmaFitNuvem;
  var Area = window.PharmaFitArea;

  /** Traduz o recado do Supabase para português de gente. */
  function traduzir(msg) {
    var m = String(msg || '').toLowerCase();
    if (m.indexOf('invalid login') !== -1) return 'E-mail ou senha não conferem.';
    if (m.indexOf('email not confirmed') !== -1) {
      return 'Falta confirmar o e-mail. Procure a mensagem que enviamos para você.';
    }
    if (m.indexOf('already registered') !== -1 || m.indexOf('already been registered') !== -1) {
      return 'Já existe conta com este e-mail. Tente entrar.';
    }
    if (m.indexOf('password') !== -1 && m.indexOf('6') !== -1) {
      return 'A senha precisa de pelo menos 6 caracteres.';
    }
    if (m.indexOf('rate limit') !== -1 || m.indexOf('too many') !== -1) {
      return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
    }
    if (m.indexOf('failed to fetch') !== -1 || m.indexOf('network') !== -1) {
      return 'Não conseguimos falar com o servidor. Confira a conexão.';
    }
    return msg || 'Não deu certo. Tente de novo.';
  }

  async function cliente() {
    if (!Nuvem) return null;
    try { await Nuvem.pronto; } catch (e) {}
    return Nuvem.cliente();
  }

  /* O recado de quando não há banco.
   *
   * As três telas diziam a mesma frase: "A conta ainda não está ligada
   * neste site." Ela é FALSA no caso que acontece de verdade — o site
   * está ligado, e há 89 contas criadas para provar. O que falha é a
   * biblioteca não chegar; e aí a pessoa lê que o site não tem conta,
   * desiste, e nada aparece no log do servidor, porque sem a biblioteca
   * o pedido nem chega a ser feito. Defeito sem rastro nenhum.
   *
   * São dois problemas com donos diferentes, e cada um merece a frase
   * dele: um é obra de quem monta o site, o outro é conexão — e esse
   * resolve tentando de novo. */
  function recadoSemBanco() {
    var motivo = Nuvem && Nuvem.porQueNao ? Nuvem.porQueNao() : '';
    if (motivo === 'sem-configuracao') {
      return { ok: false, erro: 'A conta ainda não está ligada neste site.', podeTentar: false };
    }
    return {
      ok: false,
      erro: 'Não conseguimos carregar a área de conta agora. Isso quase sempre é a ' +
            'conexão — tente de novo em alguns segundos.',
      podeTentar: true
    };
  }

  var Conta = {

    /** A conta está ligada neste site? (sem Supabase, não está) */
    ligada: async function () {
      return !!(await cliente());
    },

    /** Quem está dentro, ou null. */
    usuario: async function () {
      var sb = await cliente();
      if (!sb) return null;
      try {
        var r = await sb.auth.getUser();
        return (r && r.data && r.data.user) || null;
      } catch (e) {
        return null;
      }
    },

    /** Nome de quem está dentro, ou o nome salvo no aparelho. */
    nome: async function () {
      var u = await Conta.usuario();
      var doServidor = u && u.user_metadata && u.user_metadata.nome;
      if (doServidor) return String(doServidor).trim();
      try { return String((Area && Area.dados().nome) || '').trim(); } catch (e) { return ''; }
    },

    entrar: async function (email, senha) {
      var sb = await cliente();
      if (!sb) return recadoSemBanco();

      try {
        var r = await sb.auth.signInWithPassword({
          email: String(email || '').trim(),
          password: String(senha || '')
        });
        if (r.error) return { ok: false, erro: traduzir(r.error.message) };

        /* O nome do cadastro passa a valer também no aparelho, para o
           botão do topo e a saudação não ficarem esperando. */
        var nome = r.data && r.data.user && r.data.user.user_metadata
          && r.data.user.user_metadata.nome;
        if (nome && Area) {
          var atual = Area.dados();
          Area.salvarDados({
            nome: nome,
            telefone: atual.telefone || (r.data.user.user_metadata.telefone || ''),
            endereco: atual.endereco || ''
          });
        }
        return { ok: true, user: r.data.user };
      } catch (e) {
        return { ok: false, erro: traduzir(e && e.message) };
      }
    },

    criar: async function (dados) {
      var sb = await cliente();
      if (!sb) return recadoSemBanco();

      try {
        var r = await sb.auth.signUp({
          email: String(dados.email || '').trim(),
          password: String(dados.senha || ''),
          options: {
            /* Nome e telefone ficam nos dados da própria conta. São dados
               DELA, que ela mesma edita — e por isso NUNCA servem para
               decidir o que ela pode ler. */
            data: {
              nome: String(dados.nome || '').trim(),
              telefone: String(dados.telefone || '').trim()
            }
          }
        });
        if (r.error) return { ok: false, erro: traduzir(r.error.message) };

        if (Area) {
          Area.salvarDados({
            nome: String(dados.nome || '').trim(),
            telefone: String(dados.telefone || '').trim(),
            endereco: Area.dados().endereco || ''
          });
        }

        /* Sem sessão de volta, o projeto pede confirmação por e-mail. É
           preciso dizer isso, senão a pessoa cria a conta, é jogada para
           o login, não consegue entrar e não entende por quê. */
        var temSessao = !!(r.data && r.data.session);
        return { ok: true, confirmarEmail: !temSessao, user: r.data && r.data.user };
      } catch (e) {
        return { ok: false, erro: traduzir(e && e.message) };
      }
    },

    sair: async function () {
      var sb = await cliente();
      if (sb) { try { await sb.auth.signOut(); } catch (e) {} }
    },

    esqueciSenha: async function (email) {
      var sb = await cliente();
      if (!sb) return recadoSemBanco();
      try {
        var volta = location.href.replace(/[^/]*$/, 'entrar.html');
        var r = await sb.auth.resetPasswordForEmail(String(email || '').trim(), {
          redirectTo: volta
        });
        if (r.error) return { ok: false, erro: traduzir(r.error.message) };
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: traduzir(e && e.message) };
      }
    },

    /**
     * Os pedidos da pessoa.
     *
     * Tenta a CONTA primeiro e cai para o aparelho. A coluna que liga
     * pedido e pessoa (`cliente_id`) entrou no banco em 16/09/2026, e o
     * pedido feito com a pessoa logada já nasce com o dono — então esta
     * consulta passou a trazer os pedidos da conta em qualquer aparelho.
     *
     * A lista do aparelho fica como reserva, de propósito: pedido feito
     * antes de a pessoa ter conta, ou feito sem login, só existe ali.
     * Quem comprou nunca deve ver uma lista vazia.
     */
    pedidos: async function () {
      var doAparelho = [];
      try { doAparelho = (Area && Area.pedidos()) || []; } catch (e) { doAparelho = []; }

      var u = await Conta.usuario();
      if (!u) return { lista: doAparelho, de: 'aparelho' };

      var sb = await cliente();
      if (!sb) return { lista: doAparelho, de: 'aparelho' };

      try {
        var r = await sb.from('pf_pedidos')
          .select('id,produto,quantidade,valor,status,criado_em,confirmado_em')
          .eq('cliente_id', u.id)
          .order('criado_em', { ascending: false });

        if (!r.error && r.data && r.data.length) {
          return { lista: r.data, de: 'conta' };
        }
      } catch (e) { /* cai para o aparelho, abaixo */ }

      return { lista: doAparelho, de: 'aparelho' };
    }
  };

  window.PharmaFitConta = Conta;
})();
