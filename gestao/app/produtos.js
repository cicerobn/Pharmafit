/* =========================================================
   PHARMA FIT — tela de Produtos

   Cartão por produto, com foto, estoque, preço e situação. Os
   chips de categoria vêm dos produtos que existem — categoria
   vazia não aparece como filtro.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Moldura = window.PharmaFitMoldura;
  var U = window.PharmaFitUtil;
  var moeda = U.moeda;
  var esc = U.esc;

  var estado = { produtos: [], ordem: 'ordem', busca: '', categoria: 'todos' };

  function chave(s) {
    return U.normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  /* A FOTO VEM DO CATALOGO, casada pelo nome.
   *
   * A tabela `pf_produtos` nao tem coluna de imagem, e a camada de dados
   * nao carrega a do catalogo — na primeira versao desta tela TODOS os
   * onze produtos apareciam com a mesma foto genérica, o que faz a lista
   * inteira parecer um produto repetido. Só vi abrindo a tela.
   *
   * Casar pelo nome, e nao criar coluna nova: a foto ja existe em
   * assets/js/catalogo.js, que e a fonte unica de produto e preco. Uma
   * coluna nova no banco seria mudanca de estrutura em producao para
   * resolver algo que ja esta resolvido em outro lugar. */
  var FOTOS = {};
  (window.PHARMAFIT_CATALOGO || []).forEach(function (p) {
    if (p.imagem) FOTOS[U.normalizar(p.nome)] = p.imagem;
  });

  /* O catalogo guarda o caminho a partir da RAIZ do site
   * ("assets/img/prod-caneta.svg"), e esta pagina mora duas pastas
   * abaixo, em gestao/app/. Sem ajustar, o navegador procura em
   * gestao/app/assets/img/ e nao acha.
   *
   * E o pior: a foto quebrada NAO da erro na tela, so aparece um
   * retangulo vazio. Na primeira versao as onze fotos estavam no HTML e
   * nenhuma carregava — o teste so pegou porque ele olha o codigo da
   * resposta de cada arquivo, e nao se a tag existe. Contar foto nao e
   * olhar se a foto chegou. */
  function daRaiz(caminho) {
    if (/^(https?:)?\/\//.test(caminho) || caminho.startsWith('data:')) return caminho;
    if (caminho.startsWith('/') || caminho.startsWith('../')) return caminho;
    return '../../' + caminho;
  }

  function fotoDe(p) {
    if (p.imagem) return daRaiz(p.imagem);
    var achada = FOTOS[U.normalizar(p.nome || '')];
    /* Sem foto conhecida, o frasco generico — melhor um desenho neutro
       que um espaco vazio do tamanho de uma foto. */
    return achada ? daRaiz(achada) : '../../assets/img/prod-frasco.svg';
  }

  /** O que a tela mostra no lugar do estoque. */
  function estoqueTexto(p) {
    var tem = !(p.estoque === null || p.estoque === undefined || p.estoque === '');
    if (!tem) return 'Estoque não controlado';
    var n = Number(p.estoque);
    if (n <= 0) return 'Sem estoque';
    return 'Estoque: ' + n + (n === 1 ? ' unidade' : ' unidades');
  }

  function situacao(p) {
    if (p.ativo === false) return '<span class="marca marca--off">Fora do site</span>';
    var tem = !(p.estoque === null || p.estoque === undefined || p.estoque === '');
    if (tem && Number(p.estoque) <= 0) {
      return '<span class="marca marca--cancelado">Sem estoque</span>';
    }
    if (tem && Number(p.estoque) <= 5) {
      return '<span class="marca marca--pendente">Estoque baixo</span>';
    }
    return '<span class="marca marca--ativo">Ativo</span>';
  }

  function montarCategorias() {
    var vistas = [];
    estado.produtos.forEach(function (p) {
      var c = String(p.categoria || '').trim();
      if (c && vistas.indexOf(c) === -1) vistas.push(c);
    });

    var barra = document.querySelector('[data-categorias]');
    barra.innerHTML = ['<button class="chip-cat is-ativo" type="button" ' +
      'data-cat="todos" aria-pressed="true">Todos</button>']
      .concat(vistas.map(function (c, i) {
        return '<button class="chip-cat" type="button" data-cor="' + ((i % 4) + 1) + '" ' +
          'data-cat="' + chave(c) + '" aria-pressed="false">' + esc(c) + '</button>';
      })).join('');

    barra.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () {
        estado.categoria = b.getAttribute('data-cat');
        barra.querySelectorAll('[data-cat]').forEach(function (o) {
          var eu = o === b;
          o.classList.toggle('is-ativo', eu);
          o.setAttribute('aria-pressed', String(eu));
        });
        pintar();
      });
    });
  }

  function filtrar() {
    var termo = U.normalizar(estado.busca.trim());

    var lista = estado.produtos.filter(function (p) {
      if (estado.categoria !== 'todos' && chave(p.categoria || '') !== estado.categoria) return false;
      if (!termo) return true;
      return U.normalizar([p.nome, p.categoria].join(' ')).indexOf(termo) !== -1;
    });

    lista.sort(function (a, b) {
      var pa = Number(a.preco || a.venda || 0);
      var pb = Number(b.preco || b.venda || 0);
      if (estado.ordem === 'maior') return pb - pa;
      if (estado.ordem === 'menor') return pa - pb;
      if (estado.ordem === 'estoque') {
        /* Quem não controla estoque vai para o fim: ele nunca vai acabar,
           então não é ele que a pessoa está procurando aqui. */
        var ea = (a.estoque === null || a.estoque === undefined || a.estoque === '')
          ? Infinity : Number(a.estoque);
        var eb = (b.estoque === null || b.estoque === undefined || b.estoque === '')
          ? Infinity : Number(b.estoque);
        return ea - eb;
      }
      return 0;
    });

    return lista;
  }

  function pintar() {
    var lista = filtrar();
    var alvo = document.querySelector('[data-produtos]');
    var conta = document.querySelector('[data-conta]');

    if (!lista.length) {
      conta.textContent = '';
      alvo.innerHTML = '<div class="bloco"><div class="vazio">' +
        '<p class="vazio__titulo">Nada com esse filtro</p>' +
        '<p class="vazio__texto">Tente outra categoria acima, ou limpe a busca.</p>' +
      '</div></div>';
      return;
    }

    conta.textContent = lista.length + (lista.length === 1 ? ' produto' : ' produtos');

    alvo.innerHTML = lista.map(function (p) {
      var preco = Number(p.preco || p.venda || 0);
      var foto = fotoDe(p);
      return '<article class="prod">' +
        '<img class="prod__foto" src="' + esc(foto) + '" alt="" loading="lazy">' +
        '<div class="prod__corpo">' +
          '<h3 class="prod__nome">' + esc(p.nome) + '</h3>' +
          '<p class="prod__estoque">' + esc(estoqueTexto(p)) + '</p>' +
          '<p class="prod__preco">' + moeda(preco) + '</p>' +
          '<p class="prod__marca">' + situacao(p) + '</p>' +
        '</div>' +
        '<a class="prod__editar" href="../index.html?produto=' + encodeURIComponent(p.id) + '" ' +
          'aria-label="Editar ' + esc(p.nome) + '">' +
          Moldura.svg('pontos', 19, 1.9) +
        '</a>' +
      '</article>';
    }).join('');
  }

  async function carregar() {
    try {
      var r = await Moldura.dados();
      estado.produtos = r.produtos || [];
      montarCategorias();
      document.getElementById('carregando').hidden = true;
      document.getElementById('erro').hidden = true;
      document.getElementById('conteudo').hidden = false;
      pintar();
    } catch (e) {
      document.getElementById('carregando').hidden = true;
      document.getElementById('conteudo').hidden = true;
      document.getElementById('erro').hidden = false;
      document.getElementById('erro-texto').textContent = String((e && e.message) || e);
    }
  }

  (async function () {
    var user = await Auth.exigirLogin('../login.html');
    if (!user) return;

    await Moldura.montar({ aba: 'produtos' });

    /* Nesta tela o "+" cria PRODUTO, e não pedido: é o que a pessoa
       espera do botão na tela de produtos. Leva ao formulário que já
       existe e funciona no painel, em vez de eu desenhar um segundo. */
    function novoProduto() { location.href = '../index.html#novo-produto'; }
    Moldura.aoNovo(novoProduto);
    document.querySelector('[data-novo-produto]').addEventListener('click', novoProduto);

    var campo = document.querySelector('[data-busca]');
    campo.addEventListener('input', U.debounce(function () {
      estado.busca = campo.value;
      pintar();
    }, 140));

    var botaoFiltro = document.querySelector('[data-filtro]');
    var caixa = document.querySelector('[data-ordenacao]');
    botaoFiltro.addEventListener('click', function () {
      var abrindo = caixa.hidden;
      caixa.hidden = !abrindo;
      botaoFiltro.setAttribute('aria-expanded', String(abrindo));
    });

    document.querySelectorAll('[data-ordem]').forEach(function (b) {
      b.addEventListener('click', function () {
        estado.ordem = b.getAttribute('data-ordem');
        document.querySelectorAll('[data-ordem]').forEach(function (o) {
          o.classList.toggle('is-ativo', o === b);
        });
        botaoFiltro.classList.toggle('is-ativo', estado.ordem !== 'ordem');
        pintar();
      });
    });

    document.getElementById('de-novo').addEventListener('click', function () {
      document.getElementById('erro').hidden = true;
      document.getElementById('carregando').hidden = false;
      carregar();
    });

    await carregar();
  })();
})();
