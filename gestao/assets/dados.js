/* =========================================================
   PHARMA FIT — camada de dados

   Fala com o Supabase quando ele está configurado; caso
   contrário guarda tudo no navegador (modo demonstração),
   para que os fluxos possam ser testados sem servidor.

   Coleções:
     pedidos        vendas (pendentes e confirmadas)
     produtos       catálogo com custo, preço e estoque
     representantes cadastros de revendedores/clínicas/parceiros
     orcamentos     pedidos de atacado
     espera         fila de interesse por produto em falta
     despesas       gastos da empresa
     pessoal        finanças pessoais do dono
     notas          observações da ficha de cada cliente
     configuracoes  ajustes do painel (meta do mês)

   Ciclo de um pedido:
     pendente  -> criado (site ou lançamento manual), aguarda a
                  equipe confirmar no painel
     confirmado-> venda válida; entra nos indicadores
     (excluir) -> remove o pedido
   ========================================================= */
(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var cfg = window.PHARMAFIT_CONFIG || {};

  var PREFIXO = 'pharmafit_demo_';

  /* O nome da tabela no banco, com o prefixo desta gestão.
   *
   * Um lugar só, de propósito. Este banco é compartilhado por vários
   * sistemas, e `produtos` e `notas` já existiam lá, de outro negócio, com 40
   * linhas dentro de `produtos`. Sem o prefixo a gestão leria e gravaria na
   * tabela do vizinho sem dar um único erro na tela — o tipo de estrago que
   * não se desfaz depois. */
  function T(colecao) {
    return (cfg.PREFIXO_TABELAS || '') + colecao;
  }
  var CHAVE_PEDIDOS = PREFIXO + 'pedidos';
  var CHAVE_PRODUTOS = PREFIXO + 'produtos';
  var CHAVE_SEED = PREFIXO + 'seed';

  /* ---------- dados iniciais do modo demonstração ---------- */

  /* preços e custos reais vêm de assets/js/catalogo.js */
  var PRODUTOS_BASE = (window.PHARMAFIT_CATALOGO || []).map(function (p, i) {
    return {
      id: i + 1,
      nome: p.nome,
      categoria: p.categoria,
      custo: p.custo,
      preco: p.venda,
      antes: p.antes,
      estoque: (p.estoque === undefined ? null : p.estoque),
      indisponivel: !!p.indisponivel,
      /* A imagem ia junto a partir daqui: sem ela, o painel novo mostrava
         os onze produtos com a mesma foto. */
      imagem: p.imagem || null,
      ativo: true
    };
  });

  function pedidosBase() {
    var hoje = new Date();
    function dia(menos) {
      var d = new Date(hoje);
      d.setDate(d.getDate() - menos);
      return d.toISOString();
    }
    return [
      { id: 'dem-1', cliente: 'Ana Ribeiro',     telefone: '(92) 99145-2201', produto: 'Tirzec Pen 15 mg',           valor: 1099, custo: 520, pagamento: 'Pix',            vendedor: 'Equipe Pharma Fit', status: 'confirmado', criado_em: dia(0) },
      { id: 'dem-2', cliente: 'Marcos Teixeira', telefone: '(92) 98832-1140', produto: 'Tirzec 15 mg — 4 ampolas',   valor: 999,  custo: 450, pagamento: 'Cartão de crédito', vendedor: 'Equipe Pharma Fit', status: 'confirmado', criado_em: dia(1) },
      { id: 'dem-3', cliente: 'Juliana Alves',   telefone: '(92) 99610-7788', produto: 'Lipoless 15 mg — 4 ampolas', valor: 999,  custo: 435, pagamento: '',                vendedor: '', status: 'pendente',   criado_em: dia(0) },
      { id: 'dem-4', cliente: 'Rafael Souza',    telefone: '(92) 99312-4590', produto: 'GHK-Cu 100 mg',              valor: 799,  custo: 200, pagamento: 'Pix',             vendedor: 'Equipe Pharma Fit', status: 'confirmado', criado_em: dia(2) },
      { id: 'dem-5', cliente: 'Carla Menezes',   telefone: '(92) 98477-3021', produto: 'Klow 70 mg',                 valor: 870,  custo: 300, pagamento: '',                vendedor: '', status: 'pendente',   criado_em: dia(0) },
      { id: 'dem-6', cliente: 'Ana Ribeiro',     telefone: '(92) 99145-2201', produto: 'Gluconex 15 mg — 4 ampolas', valor: 999,  custo: 450, pagamento: 'Pix',             vendedor: 'Equipe Pharma Fit', status: 'confirmado', criado_em: dia(9) },
      { id: 'dem-7', cliente: 'Paula Nogueira',  telefone: '(92) 99208-6633', produto: 'Retatrutide ZPHC 120 mg',    valor: 3249, custo: 2060, pagamento: 'Transferência',  vendedor: 'Equipe Pharma Fit', status: 'confirmado', criado_em: dia(75) }
    ];
  }

  /* ---------- armazenamento local (demonstração) ---------- */

  /** Na primeira abertura do painel, junta os pedidos de exemplo aos que já existirem. */
  function lerPedidos() {
    try {
      var atual = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) || '[]');
      if (!localStorage.getItem(CHAVE_SEED)) {
        atual = atual.concat(pedidosBase());
        localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify(atual));
        localStorage.setItem(CHAVE_SEED, '1');
      }
      return atual;
    } catch (e) {
      return pedidosBase();
    }
  }

  function ler(chave, padrao) {
    try {
      var raw = localStorage.getItem(chave);
      if (!raw) {
        if (padrao && padrao.length) localStorage.setItem(chave, JSON.stringify(padrao));
        return padrao || [];
      }
      return JSON.parse(raw);
    } catch (e) {
      return padrao || [];
    }
  }

  function gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      /* avisa outras abas e esta mesma aba */
      window.dispatchEvent(new CustomEvent('pharmafit-dados', { detail: { chave: chave } }));
    } catch (e) {}
  }

  function novoId() {
    return 'loc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }

  /**
   * Coleções acessórias. Se a tabela ainda não existe no Supabase
   * (banco antigo, migração 01 não rodada), elas continuam
   * funcionando guardadas no aparelho em vez de dar erro na cara
   * de quem está usando.
   */
  var ACESSORIAS = ['notas', 'configuracoes'];

  function tabelaFaltando(erro) {
    var texto = String((erro && (erro.message || erro.details)) || erro || '').toLowerCase();
    return (erro && erro.code === '42P01') ||
           texto.indexOf('does not exist') !== -1 ||
           texto.indexOf('schema cache') !== -1;
  }

  function localDe(colecao) {
    if (colecao === 'pedidos') return lerPedidos();
    if (colecao === 'produtos') return ler(CHAVE_PRODUTOS, PRODUTOS_BASE);
    return ler(PREFIXO + colecao, []);
  }

  function gravarLocal(colecao, lista) {
    gravar(colecao === 'pedidos' ? CHAVE_PEDIDOS
         : colecao === 'produtos' ? CHAVE_PRODUTOS
         : PREFIXO + colecao, lista);
  }

  /* ---------- API genérica ---------- */

  var Dados = {

    /** Lê uma coleção inteira. */
    listar: async function (colecao, ordem) {
      await Auth.pronto;
      var sb = Auth.cliente();
      if (!sb) return localDe(colecao);

      try {
        var q = sb.from(T(colecao)).select('*');
        if (ordem) q = q.order(ordem.campo, { ascending: ordem.crescente !== false });
        var r = await q;
        if (r.error) {
          console.warn('[Pharma Fit] ' + colecao + ':', r.error.message);
          return localDe(colecao);
        }
        return r.data || [];
      } catch (e) {
        return localDe(colecao);
      }
    },

    /** Insere um registro. Retorna { ok, registro, erro }. */
    inserir: async function (colecao, registro) {
      await Auth.pronto;
      var sb = Auth.cliente();

      /* `recuo` = o banco existe mas a tabela ainda não; quem chamou
         avisa o usuário de que aquilo ficou só neste aparelho. */
      function noAparelho(recuo) {
        var lista = localDe(colecao);
        var copia = Object.assign({}, registro);
        copia.id = copia.id || novoId();
        copia.criado_em = copia.criado_em || new Date().toISOString();
        lista.unshift(copia);
        gravarLocal(colecao, lista);
        return { ok: true, registro: copia, local: !!recuo };
      }

      if (!sb) return noAparelho();

      try {
        var r = await sb.from(T(colecao)).insert(registro).select().single();
        if (r.error) {
          if (ACESSORIAS.indexOf(colecao) !== -1 && tabelaFaltando(r.error)) return noAparelho(true);
          return { ok: false, erro: r.error.message };
        }
        return { ok: true, registro: r.data };
      } catch (e) {
        if (ACESSORIAS.indexOf(colecao) !== -1) return noAparelho(true);
        return { ok: false, erro: String(e && e.message || e) };
      }
    },

    /** Atualiza campos de um registro. */
    atualizar: async function (colecao, id, campos) {
      await Auth.pronto;
      var sb = Auth.cliente();

      function noAparelho(recuo) {
        var lista = localDe(colecao).map(function (r) {
          return String(r.id) === String(id) ? Object.assign({}, r, campos) : r;
        });
        gravarLocal(colecao, lista);
        return { ok: true, local: !!recuo };
      }

      if (!sb) return noAparelho();

      try {
        var r = await sb.from(T(colecao)).update(campos).eq('id', id);
        if (r.error) {
          if (ACESSORIAS.indexOf(colecao) !== -1 && tabelaFaltando(r.error)) return noAparelho(true);
          return { ok: false, erro: r.error.message };
        }
        return { ok: true };
      } catch (e) {
        if (ACESSORIAS.indexOf(colecao) !== -1) return noAparelho(true);
        return { ok: false, erro: String(e && e.message || e) };
      }
    },

    /** Exclui um registro. */
    excluir: async function (colecao, id) {
      await Auth.pronto;
      var sb = Auth.cliente();

      if (!sb) {
        gravarLocal(colecao, localDe(colecao).filter(function (r) {
          return String(r.id) !== String(id);
        }));
        return { ok: true };
      }

      try {
        var r = await sb.from(T(colecao)).delete().eq('id', id);
        if (r.error) return { ok: false, erro: r.error.message };
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: String(e && e.message || e) };
      }
    },

    /* ---------- atalhos de pedidos e produtos ---------- */

    /** Pedidos + produtos de uma vez. Retorna { pedidos, produtos, exemplo }. */
    listarPainel: async function () {
      await Auth.pronto;
      var sb = Auth.cliente();

      if (!sb) {
        return { pedidos: lerPedidos(), produtos: localDe('produtos'), exemplo: true };
      }

      try {
        var rp = await sb.from(T('pedidos')).select('*').order('criado_em', { ascending: false }).limit(500);
        var rd = await sb.from(T('produtos')).select('*').order('nome');

        if (rp.error || rd.error) {
          console.warn('[Pharma Fit] Tabelas indisponíveis:', (rp.error || rd.error).message);
          return { pedidos: lerPedidos(), produtos: localDe('produtos'), exemplo: true };
        }
        return { pedidos: rp.data || [], produtos: rd.data || [], exemplo: false };
      } catch (e) {
        console.warn('[Pharma Fit] Falha ao consultar:', e);
        return { pedidos: lerPedidos(), produtos: localDe('produtos'), exemplo: true };
      }
    },

    /** Cria um pedido pendente. */
    criarPedido: async function (dados) {
      var pedido = {
        cliente: String(dados.cliente || '').trim(),
        telefone: String(dados.telefone || '').trim(),
        produto: String(dados.produto || '').trim(),
        valor: Number(dados.valor || 0),
        status: 'pendente',
        origem: dados.origem || 'site'
      };

      if (!pedido.cliente) return { ok: false, erro: 'Informe o nome do cliente.' };
      if (!pedido.produto) return { ok: false, erro: 'Escolha o produto.' };

      var r = await Dados.inserir('pedidos', pedido);
      return r.ok ? { ok: true, pedido: r.registro } : r;
    },

    /**
     * Confirma a venda: passa a contar nos indicadores e baixa o
     * estoque do produto.
     * extras: { valor, pagamento, vendedor, custo, produto, quantidade }
     */
    confirmarPedido: async function (id, extras) {
      extras = extras || {};

      var campos = { status: 'confirmado', confirmado_em: new Date().toISOString() };
      if (Number(extras.valor) > 0) campos.valor = Number(extras.valor);
      if (Number(extras.custo) > 0) campos.custo = Number(extras.custo);
      if (extras.pagamento) campos.pagamento = extras.pagamento;
      if (extras.vendedor) campos.vendedor = extras.vendedor;

      var r = await Dados.atualizar('pedidos', id, campos);
      if (!r.ok) return r;

      var baixa = await Dados.baixarEstoque(extras.produto, extras.quantidade || 1);
      return { ok: true, estoque: baixa };
    },

    /**
     * Tira do estoque o que foi vendido. Produto sem controle de
     * estoque (valor vazio) fica como está.
     * Retorna { controlado, restante, acabou }.
     */
    baixarEstoque: async function (nomeProduto, quantidade) {
      if (!nomeProduto) return { controlado: false };

      var produtos = await Dados.listar('produtos');
      var produto = produtos.filter(function (p) { return p.nome === nomeProduto; })[0];

      if (!produto) return { controlado: false };
      if (produto.estoque === null || produto.estoque === undefined || produto.estoque === '') {
        return { controlado: false };
      }

      var restante = Math.max(0, Number(produto.estoque) - Number(quantidade || 1));
      await Dados.atualizar('produtos', produto.id, { estoque: restante });

      return { controlado: true, restante: restante, acabou: restante === 0, produto: nomeProduto };
    },

    /**
     * Ajustes que o dono muda pelo painel (meta do mês, por
     * enquanto). Guardados em `configuracoes` como chave/valor.
     */
    lerConfig: async function (chave, padrao) {
      var lista = await Dados.listar('configuracoes');
      var achado = (lista || []).filter(function (c) { return c.chave === chave; })[0];
      return achado ? achado.valor : padrao;
    },

    salvarConfig: async function (chave, valor) {
      var lista = await Dados.listar('configuracoes');
      var achado = (lista || []).filter(function (c) { return c.chave === chave; })[0];

      return achado
        ? Dados.atualizar('configuracoes', achado.id, { valor: String(valor) })
        : Dados.inserir('configuracoes', { chave: chave, valor: String(valor) });
    },

    /** Repõe ou corrige o estoque de um produto. */
    salvarProduto: function (id, campos) {
      return Dados.atualizar('produtos', id, campos);
    },

    /** Exclui o pedido. */
    excluirPedido: function (id) {
      return Dados.excluir('pedidos', id);
    },

    /**
     * Avisa quando algo muda. callback(evento) recebe
     * { tipo: 'novo' | 'mudou', pedido }.
     */
    aoMudar: async function (callback) {
      await Auth.pronto;
      var sb = Auth.cliente();

      if (!sb) {
        /* demonstração: mudanças nesta aba e em outras abas */
        window.addEventListener('pharmafit-dados', function () { callback({ tipo: 'mudou' }); });
        window.addEventListener('storage', function (e) {
          if (e.key !== CHAVE_PEDIDOS) return;
          var novo = null;
          try {
            var antes = JSON.parse(e.oldValue || '[]');
            var agora = JSON.parse(e.newValue || '[]');
            if (agora.length > antes.length) novo = agora[0];
          } catch (err) {}
          callback(novo ? { tipo: 'novo', pedido: novo } : { tipo: 'mudou' });
        });
        return;
      }

      /* O tempo real tambem precisa do prefixo. Sem ele o painel ficaria
         escutando a tabela `pedidos` de OUTRO negocio deste banco — ou
         escutando o vazio, sem avisar que nao esta escutando nada. */
      var tabPedidos = T('pedidos');

      try {
        sb.channel('pedidos-painel')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tabPedidos },
            function (msg) { callback({ tipo: 'novo', pedido: msg.new }); })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tabPedidos },
            function () { callback({ tipo: 'mudou' }); })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: tabPedidos },
            function () { callback({ tipo: 'mudou' }); })
          .subscribe();
      } catch (e) {
        console.warn('[Pharma Fit] Tempo real indisponível:', e);
      }
    },

    /** Restaura os dados de demonstração (só no modo demo). */
    reiniciarDemo: function () {
      try {
        Object.keys(localStorage).forEach(function (k) {
          if (k.indexOf(PREFIXO) === 0) localStorage.removeItem(k);
        });
      } catch (e) {}
    }
  };

  window.PharmaFitDados = Dados;
})();
