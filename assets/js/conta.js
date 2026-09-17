/* =========================================================
   PHARMA FIT — conta do cliente (entrar e criar)

   Usa o Supabase Auth pelo cliente que o nuvem.js já criou. NÃO
   cria um segundo cliente nem repete a chave em lugar nenhum.

   O QUE ESTA CONTA FAZ

   Entrar, criar conta e ver os pedidos DA CONTA, os mesmos em qualquer
   aparelho. A coluna que liga pedido e pessoa (`cliente_id`) entrou no
   banco em 16/09/2026 (migracao-03-conta-do-cliente.sql), e desde
   17/09/2026 a lista vem de `pf_pedidos_meus` — uma vista que já filtra
   pela conta e não tem a coluna de custo dentro.

   A lista deste APARELHO fica como reserva, de propósito: pedido feito
   antes de a pessoa ter conta, ou feito sem login, só existe ali. Quem
   comprou nunca deve ver uma lista vazia.

   O FURO QUE EU NÃO FIZ

   Seria fácil ligar pedido e pessoa pelo TELEFONE do cadastro. Não
   dá: o telefone fica nos dados que a própria pessoa edita, então
   qualquer cliente poderia pôr o telefone de outro e ler os pedidos
   dele. O vínculo tem de ser o identificador da conta, que o
   servidor escreve e ninguém de fora consegue trocar.

   precisa: nuvem, minha-area
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
        /* E o cadastro da conta desce agora, não na próxima página:
           quem acabou de entrar vai direto comprar, e o formulário do
           pedido lê o aparelho. */
        try { await Conta.sincronizarCadastro(); } catch (e) {}

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

        var cadastro = {
          nome: String(dados.nome || '').trim(),
          telefone: String(dados.telefone || '').trim(),
          endereco: (Area && Area.dados().endereco) || ''
        };
        if (Area) Area.salvarDados(cadastro);

        /* O cadastro já nasce NA CONTA, e não só no aparelho: é o que
           faz o nome e o WhatsApp aparecerem quando a pessoa abrir o
           site no computador depois de criar a conta no celular.
           Só quando a criação já devolveu sessão — sem sessão não há
           permissão para gravar, e aí quem sobe é a sincronização do
           primeiro login. */
        if (r.data && r.data.session) {
          await Conta.salvarCadastro(cadastro);
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

    /* =========================================================
       O CADASTRO DA PESSOA FICA NA CONTA

       "Meus dados" — nome, WhatsApp e endereço — era guardado só
       no navegador. Quem criava conta no celular, preenchia e
       comprava, ao abrir no computador achava o formulário vazio
       de novo; e limpar o navegador apagava tudo. A conta existia
       e não carregava nada.

       Agora o cadastro mora em `pf_clientes`, ligado à conta, com
       a regra "cada um só o seu" provada no banco.

       O APARELHO CONTINUA SENDO USADO, como ESPELHO.
       `Area.dados()` é chamado em dez lugares do site, todos de
       forma imediata (a tela desenha com o dado na mão). Tornar
       tudo isso assíncrono para ir ao servidor seria mexer em dez
       telas para resolver uma. Então a conta é a fonte: ao abrir,
       o que está na conta é copiado para o aparelho, e o resto do
       site continua lendo do aparelho como sempre.

       E quem não tem conta continua comprando igual, com os dados
       no aparelho — que é como era antes desta tela existir.
       ========================================================= */

    /** O cadastro que está na conta, ou null. */
    cadastro: async function () {
      var u = await Conta.usuario();
      if (!u) return null;
      var sb = await cliente();
      if (!sb) return null;
      try {
        var r = await sb.from('pf_clientes')
          .select('nome,telefone,endereco')
          .eq('user_id', u.id)
          .maybeSingle();
        if (r.error || !r.data) return null;
        return r.data;
      } catch (e) {
        return null;
      }
    },

    /** Grava o cadastro na conta. Sem conta, não faz nada — e diz. */
    salvarCadastro: async function (dados) {
      var u = await Conta.usuario();
      if (!u) return { ok: false, semConta: true };
      var sb = await cliente();
      if (!sb) return { ok: false, semConta: true };
      try {
        var r = await sb.from('pf_clientes').upsert({
          user_id: u.id,
          nome: String(dados.nome || '').trim(),
          telefone: String(dados.telefone || '').trim(),
          endereco: String(dados.endereco || '').trim(),
          atualizado_em: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (r.error) return { ok: false, erro: r.error.message };
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: String((e && e.message) || e) };
      }
    },

    /**
     * Põe conta e aparelho de acordo, na abertura da página.
     *
     * Três casos, e nenhum deles perde o que a pessoa já digitou:
     *
     *   1. a conta TEM cadastro  -> ele desce para o aparelho. É o
     *      caso de abrir num aparelho novo.
     *   2. a conta NÃO tem, e o aparelho tem -> sobe. É o caso de
     *      quem já usava o site antes desta tabela existir: os
     *      dados dele entram na conta na primeira abertura.
     *   3. nenhum dos dois tem -> usa o nome e o telefone que a
     *      pessoa digitou ao criar a conta, que já estavam
     *      guardados na conta dela.
     */
    sincronizarCadastro: async function () {
      var u = await Conta.usuario();
      if (!u || !Area) return false;

      var noAparelho = Area.dados();
      var naConta = await Conta.cadastro();

      if (naConta && (naConta.nome || naConta.telefone || naConta.endereco)) {
        Area.salvarDados({
          nome: naConta.nome || noAparelho.nome || '',
          telefone: naConta.telefone || noAparelho.telefone || '',
          endereco: naConta.endereco || noAparelho.endereco || ''
        });
        return true;
      }

      var meta = u.user_metadata || {};
      var subir = {
        nome: noAparelho.nome || meta.nome || '',
        telefone: noAparelho.telefone || meta.telefone || '',
        endereco: noAparelho.endereco || ''
      };
      if (!subir.nome && !subir.telefone && !subir.endereco) return false;

      Area.salvarDados(subir);
      await Conta.salvarCadastro(subir);
      return true;
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
        /* A VISTA, E NÃO A TABELA.
         *
         * Esta consulta já pedia colunas nomeadas, sem custo. Mas quem
         * manda é a REGRA do banco, e ela entregava a LINHA INTEIRA ao
         * dono do pedido: bastava pedir `custo` na mão para saber quanto
         * aquele pedido custou para a Pharma Fit.
         *
         * `pf_pedidos_meus` não tem a coluna, e o filtro por conta mora
         * DENTRO dela. Por isso o `.eq('cliente_id', …)` saiu: a vista
         * não expõe essa coluna, e pedir o id de outra pessoa não traria
         * nada de todo modo. */
        var r = await sb.from('pf_pedidos_meus')
          .select('id,produto,quantidade,valor,status,criado_em,confirmado_em')
          .order('criado_em', { ascending: false });

        if (!r.error && r.data && r.data.length) {
          return { lista: r.data, de: 'conta' };
        }
      } catch (e) { /* cai para o aparelho, abaixo */ }

      return { lista: doAparelho, de: 'aparelho' };
    }
  };

  window.PharmaFitConta = Conta;

  /* PÕE CONTA E APARELHO DE ACORDO NA ABERTURA.
     Sem esperar ninguém e sem barrar nada: se der erro, a tela continua
     com o que está no aparelho, que é como era antes. O `catch` vazio é
     de propósito — esta é a única coisa na página que pode falhar sem
     consequência para quem está comprando. */
  document.addEventListener('DOMContentLoaded', function () {
    Conta.sincronizarCadastro().catch(function () {});
  });
})();
