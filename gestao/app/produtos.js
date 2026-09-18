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

  /* DOIS NÍVEIS DE ACESSO, no que esta tela mostra.
     `ceo` vê preço de compra e lucro; `atendente` vê nome, preço de
     venda, estoque e foto — o que ele precisa para atender — e não vê
     dinheiro de dono. Começa `true` para o painel de demonstração (sem
     banco) continuar mostrando tudo; o valor de verdade chega em
     `carregar()`, antes do primeiro desenho. */
  var verCusto = true;

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

  /* Venda menos compra, por unidade, na linha do produto.
   *
   * Três respostas possíveis, e nenhuma delas é o silêncio:
   *   · tem os dois números  -> o lucro em reais e em porcento;
   *   · falta o de compra    -> diz que falta, e é clicável logo ali;
   *   · compra >= venda      -> avisa, porque isso custa dinheiro.
   *
   * Esta linha só existe no painel, que roda com o login da equipe. O
   * site não recebe a coluna de custo — é o que a migração 08 fechou. */
  function lucroDoProduto(p, preco) {
    var compra = Number(p.custo || 0);
    var venda = Number(preco || 0);

    if (!venda) return '';
    if (!compra) {
      return '<p class="prod__lucro prod__lucro--falta">Falta o preço de compra</p>';
    }

    var lucro = venda - compra;
    if (lucro <= 0) {
      return '<p class="prod__lucro prod__lucro--ruim">' +
        (lucro === 0 ? 'Lucro zero' : 'Prejuízo de ' + moeda(Math.abs(lucro))) +
        '</p>';
    }
    return '<p class="prod__lucro">Lucro ' + moeda(lucro) +
      ' · ' + Math.round((lucro / venda) * 100) + '%</p>';
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

  /* A etiqueta escolhida, ao lado da situação, na lista. */
  var NOME_ETIQUETA = {
    'mais-vendido': { texto: 'Mais vendido', classe: 'vendido' },
    'promocao': { texto: 'Promoção', classe: 'promo' }
  };

  function etiquetaDoProduto(p) {
    var e = NOME_ETIQUETA[String(p.destaque || '')];
    if (!e) return '';
    return ' <span class="marca marca--' + e.classe + '">' + esc(e.texto) + '</span>';
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
          /* O LUCRO DE CADA PRODUTO, NA LISTA.
             O Brian pediu o preço de compra "pra ver o lucro e a
             receita". Faturamento e lucro do mês já estão em
             Relatórios; o que faltava era por produto, onde a decisão
             de preço acontece. E quando falta o preço de compra a
             linha DIZ que falta, em vez de calar: produto sem preço
             de compra é o que faz o lucro do relatório sair por cima
             do real. */
          (verCusto ? lucroDoProduto(p, preco) : '') +
          '<p class="prod__marca">' + situacao(p) + etiquetaDoProduto(p) + '</p>' +
        '</div>' +
        /* AS TRÊS BOLINHAS ABREM O MENU DO PRODUTO.
           Antes eram um link para `../index.html?produto=…`: saía do
           painel novo, caía no antigo (outro desenho) e, ao voltar, a
           lista de produtos recarregava do zero e perdia o filtro e a
           busca. Depois passaram a abrir a edição direto. Agora abrem
           o menu — editar, arquivar e excluir —, porque arquivar
           estava escondido numa caixinha no fim da folha de edição e
           excluir não existia. */
        '<button class="prod__editar" type="button" data-acoes="' + esc(p.id) + '" ' +
          'aria-label="Opções de ' + esc(p.nome) + '">' +
          Moldura.svg('pontos', 19, 1.9) +
        '</button>' +
      '</article>';
    }).join('');
  }

  /* =========================================================
     EDITAR O PRODUTO

     O que se muda aqui: nome, preço, descrição, foto — e também
     custo, preço antigo, estoque, categoria e "aparecer no site",
     que é o que o formulário do painel antigo já fazia. Se eu
     tivesse trazido só os quatro que o Brian pediu, as três
     bolinhas passariam a fazer MENOS do que faziam antes.

     A FOTO É CONDICIONAL, E ISSO TEM MOTIVO

     Guardar foto precisa de duas coisas no Supabase que hoje não
     existem: a coluna `imagem` em `pf_produtos` e o balde
     `pf-produtos` no armazenamento. As duas estão escritas em
     gestao/supabase/migracao-07-foto-do-produto.sql (no
     repositório medgroup) e NÃO foram aplicadas — mexer na
     estrutura do banco de produção é decisão do Brian.

     Então o bloco da foto só aparece quando dá para funcionar:
     quando existe banco de verdade (não é o modo demonstração) e
     quando a linha do produto vem com a chave `imagem`. O
     PostgREST devolve todas as colunas da tabela, então a chave
     existir é a prova de que a coluna existe — sem pedido extra
     nenhum.

     Botão que não funciona não fica na tela. É a regra 1.
     ========================================================= */

  var folha = null;
  var veu = null;
  var editando = null;
  var fotoNova = null;      /* {blob, url} escolhida mas ainda não salva */
  var fotoTirar = false;    /* pediu para voltar ao desenho padrão */

  /* A ETIQUETA DA VITRINE SEGUE A MESMA REGRA DA FOTO.
   *
   * Ela mora na coluna `destaque` de `pf_produtos` (migração 12). A
   * chave existir na linha é a prova de que a coluna existe — o
   * PostgREST devolve todas as colunas da tabela. Se um dia a coluna
   * for embora, o campo desaparece da folha em vez de dar erro na cara
   * da equipe ao salvar.
   *
   * Diferente da foto, aqui não exijo banco de verdade: no modo
   * demonstração a escolha é gravada no próprio navegador e a vitrine
   * de demonstração mostra a etiqueta. Funciona, então aparece. */
  function podeEtiquetar(p) {
    return !!p && Object.prototype.hasOwnProperty.call(p, 'destaque');
  }

  function podeTrocarFoto(p) {
    var sb = window.PharmaFitAuth && window.PharmaFitAuth.cliente
      ? window.PharmaFitAuth.cliente() : null;
    return !!sb && p && Object.prototype.hasOwnProperty.call(p, 'imagem');
  }

  var BALDE = 'pf-produtos';

  function montarFolha() {
    if (folha) return;

    veu = document.createElement('div');
    veu.className = 'veu';
    veu.setAttribute('data-veu-folha', '');
    document.body.appendChild(veu);

    folha = document.createElement('div');
    folha.className = 'folha';
    folha.setAttribute('role', 'dialog');
    folha.setAttribute('aria-modal', 'true');
    folha.setAttribute('aria-label', 'Editar produto');
    folha.innerHTML =
      '<div class="folha__topo">' +
        '<h2 class="folha__titulo" data-folha-titulo>Editar produto</h2>' +
        '<button class="folha__fechar" type="button" data-fechar-folha aria-label="Fechar">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="folha__corpo">' +
        '<p class="folha__recado" data-recado hidden></p>' +

        '<div class="campo" data-bloco-foto hidden>' +
          '<span class="campo__rotulo">Foto do produto</span>' +
          '<div class="foto-troca">' +
            '<img class="foto-troca__vista" data-foto-vista alt="">' +
            '<div class="foto-troca__lado">' +
              '<div class="foto-troca__botoes">' +
                '<button class="botao" type="button" data-escolher-foto>Escolher foto</button>' +
                '<button class="botao" type="button" data-tirar-foto hidden>Voltar ao desenho</button>' +
              '</div>' +
              '<p class="campo__nota" data-foto-nota>JPG, PNG ou WEBP. Eu reduzo e converto ' +
                'antes de enviar, para a página do cliente não ficar pesada.</p>' +
            '</div>' +
          '</div>' +
          '<input type="file" accept="image/jpeg,image/png,image/webp" data-arquivo-foto>' +
        '</div>' +

        '<div class="campo" data-campo="nome">' +
          '<label class="campo__rotulo" for="ed-nome">Nome do produto</label>' +
          '<input type="text" id="ed-nome" maxlength="120" placeholder="Ex.: Tirzec Pen 15 mg">' +
          '<p class="campo__erro" data-erro hidden></p>' +
        '</div>' +

        '<div class="campo">' +
          '<label class="campo__rotulo" for="ed-categoria">Categoria</label>' +
          '<select id="ed-categoria" data-categoria></select>' +
        '</div>' +

        '<div class="folha__linha">' +
          '<div class="campo" data-campo="preco">' +
            '<label class="campo__rotulo" for="ed-preco">Preço de venda (R$)</label>' +
            '<input type="number" id="ed-preco" min="0" step="0.01" inputmode="decimal">' +
            '<p class="campo__erro" data-erro hidden></p>' +
          '</div>' +
          /* "PREÇO DE COMPRA", E NÃO "CUSTO".
             O campo existia desde o começo, com o rótulo "Custo (R$)" —
             e o Brian pediu "uma opção pra colocar o preço de compra,
             atualmente só tem o preço de venda". Ele não achou o campo
             que estava na tela. Rótulo que o dono não reconhece é campo
             que não existe. */
          '<div class="campo" data-campo="custo">' +
            '<label class="campo__rotulo" for="ed-custo">Preço de compra (R$)</label>' +
            '<input type="number" id="ed-custo" min="0" step="0.01" inputmode="decimal" ' +
              'placeholder="quanto você paga">' +
            '<p class="campo__erro" data-erro hidden></p>' +
          '</div>' +
        '</div>' +

        /* O LUCRO APARECE ENQUANTO ELE DIGITA.
           O número que interessa não é nenhum dos dois campos, é a
           diferença — e obrigar o dono a fazer a conta de cabeça a cada
           produto é o painel devolvendo trabalho para ele. Some da tela
           quando falta um dos dois: linha de lucro com metade da conta
           mentiria. */
        '<p class="folha__conta" data-lucro hidden></p>' +

        '<div class="folha__linha">' +
          '<div class="campo" data-campo="antes">' +
            '<label class="campo__rotulo" for="ed-antes">Preço antigo (R$)</label>' +
            '<input type="number" id="ed-antes" min="0" step="0.01" inputmode="decimal" ' +
              'placeholder="0 = sem promoção">' +
            '<p class="campo__erro" data-erro hidden></p>' +
          '</div>' +
          '<div class="campo" data-campo="estoque">' +
            '<label class="campo__rotulo" for="ed-estoque">Estoque</label>' +
            '<input type="number" id="ed-estoque" min="0" step="1" inputmode="numeric" ' +
              'placeholder="vazio = sem controle">' +
            '<p class="campo__erro" data-erro hidden></p>' +
          '</div>' +
        '</div>' +

        /* A ETIQUETA QUE O CLIENTE VÊ NO CARTÃO.
           Brian, 18/09/2026: "Deixe que essas barras de 'mais vendido,
           promocao' esteja so em alguns produtos especificos que eu
           selecionar no painel".
           São três opções fixas e não texto livre porque cada uma tem
           cor e animação próprias no site: escrever "QUEIMA DE
           ESTOQUE" aqui apareceria na vitrine como um retângulo sem
           estilo. O banco recusa o que não está nesta lista. */
        '<div class="campo" data-campo="destaque" hidden>' +
          '<label class="campo__rotulo" for="ed-destaque">Etiqueta na vitrine</label>' +
          '<select id="ed-destaque" data-destaque>' +
            '<option value="">Nenhuma</option>' +
            '<option value="mais-vendido">Mais vendido (dourada)</option>' +
            '<option value="promocao">Promoção (vermelha)</option>' +
          '</select>' +
          '<p class="campo__nota">Aparece em cima da foto, no cartão do site. ' +
            'Use em poucos produtos: etiqueta em tudo não destaca nada.</p>' +
          '<p class="campo__erro" data-erro hidden></p>' +
        '</div>' +

        '<div class="campo" data-campo="descricao">' +
          '<label class="campo__rotulo" for="ed-descricao">Descrição</label>' +
          '<textarea id="ed-descricao" maxlength="400" ' +
            'placeholder="A frase que o cliente lê embaixo do nome, no site."></textarea>' +
          '<p class="campo__nota"><span data-conta-descricao>0</span>/400 · é este texto que ' +
            'aparece no site, embaixo do nome do produto.</p>' +
          '<p class="campo__erro" data-erro hidden></p>' +
        '</div>' +

        '<label class="campo campo--liga">' +
          '<input type="checkbox" data-ativo>' +
          '<span>Aparecer no site</span>' +
        '</label>' +
      '</div>' +
      '<div class="folha__acoes">' +
        '<button class="botao" type="button" data-fechar-folha>Cancelar</button>' +
        '<button class="botao botao--forte" type="button" data-salvar>Salvar</button>' +
      '</div>';
    document.body.appendChild(folha);

    folha.querySelectorAll('[data-fechar-folha]').forEach(function (b) {
      b.addEventListener('click', fechar);
    });
    veu.addEventListener('click', fechar);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && folha.classList.contains('is-aberta')) fechar();
    });

    folha.querySelector('[data-salvar]').addEventListener('click', salvar);

    var desc = folha.querySelector('#ed-descricao');
    var conta = folha.querySelector('[data-conta-descricao]');
    desc.addEventListener('input', function () { conta.textContent = desc.value.length; });

    folha.querySelector('#ed-preco').addEventListener('input', pintarLucro);
    folha.querySelector('#ed-custo').addEventListener('input', pintarLucro);

    var arquivo = folha.querySelector('[data-arquivo-foto]');
    folha.querySelector('[data-escolher-foto]').addEventListener('click', function () {
      arquivo.value = '';
      arquivo.click();
    });
    arquivo.addEventListener('change', function () {
      if (arquivo.files && arquivo.files[0]) escolheuFoto(arquivo.files[0]);
    });
    folha.querySelector('[data-tirar-foto]').addEventListener('click', function () {
      fotoNova = null;
      fotoTirar = true;
      folha.querySelector('[data-foto-vista]').src = '../../assets/img/prod-frasco.svg';
      folha.querySelector('[data-tirar-foto]').hidden = true;
      dizer('A foto sai quando você salvar. O produto volta a mostrar o desenho.', 'bom');
    });
  }

  function dizer(msg, tipo) {
    var el = folha.querySelector('[data-recado]');
    el.hidden = false;
    el.textContent = msg;
    el.className = 'folha__recado folha__recado--' + (tipo === 'bom' ? 'bom' : 'ruim');
    el.scrollIntoView({ block: 'nearest' });
  }
  function calar() {
    var el = folha.querySelector('[data-recado]');
    el.hidden = true;
    el.textContent = '';
  }

  function erroNo(campo, msg) {
    var caixa = folha.querySelector('[data-campo="' + campo + '"]');
    if (!caixa) return;
    caixa.classList.toggle('is-erro', !!msg);
    var p = caixa.querySelector('[data-erro]');
    p.hidden = !msg;
    p.textContent = msg || '';
  }
  function limparErros() {
    folha.querySelectorAll('[data-campo]').forEach(function (c) {
      c.classList.remove('is-erro');
      var p = c.querySelector('[data-erro]');
      if (p) { p.hidden = true; p.textContent = ''; }
    });
  }

  /* A FOTO É REDUZIDA AQUI, ANTES DE SUBIR.
   *
   * Foto de celular hoje tem 4000px e 5MB. Subir do jeito que vem
   * estouraria o limite do balde (3MB) e, pior, a página do cliente
   * baixaria 5MB para mostrar num quadrado de 300px — no 4G isso é a
   * diferença entre a loja abrir e a pessoa desistir.
   *
   * 1200px no maior lado e WEBP com qualidade 0,82: na tela não se vê
   * diferença e o arquivo cai para uns 80KB. Se ainda passar de 2,8MB
   * (foto gigante e cheia de detalhe), cai a qualidade até caber. */
  function reduzir(arq) {
    return new Promise(function (ok, falhou) {
      var leitor = new FileReader();
      leitor.onerror = function () { falhou(new Error('não consegui ler o arquivo')); };
      leitor.onload = function () {
        var img = new Image();
        img.onerror = function () { falhou(new Error('esse arquivo não parece uma imagem')); };
        img.onload = function () {
          var LADO = 1200;
          var escala = Math.min(1, LADO / Math.max(img.width, img.height));
          var l = Math.round(img.width * escala);
          var a = Math.round(img.height * escala);
          var tela = document.createElement('canvas');
          tela.width = l; tela.height = a;
          var ctx = tela.getContext('2d');
          /* fundo branco: PNG com transparência viraria preto no WEBP
             achatado, e foto de produto com fundo preto não é o que
             ninguém quis. */
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, l, a);
          ctx.drawImage(img, 0, 0, l, a);

          var tentar = function (q) {
            tela.toBlob(function (blob) {
              if (!blob) return falhou(new Error('não consegui converter a imagem'));
              if (blob.size > 2.8 * 1024 * 1024 && q > 0.4) return tentar(q - 0.15);
              ok(blob);
            }, 'image/webp', q);
          };
          tentar(0.82);
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arq);
    });
  }

  async function escolheuFoto(arq) {
    calar();
    try {
      var blob = await reduzir(arq);
      if (fotoNova && fotoNova.url) URL.revokeObjectURL(fotoNova.url);
      fotoNova = { blob: blob, url: URL.createObjectURL(blob) };
      fotoTirar = false;
      folha.querySelector('[data-foto-vista]').src = fotoNova.url;
      folha.querySelector('[data-tirar-foto]').hidden = false;
      var kb = Math.round(blob.size / 1024);
      folha.querySelector('[data-foto-nota]').textContent =
        'Pronta (' + kb + ' KB). Ela sobe quando você salvar.';
    } catch (e) {
      dizer(String((e && e.message) || e), 'ruim');
    }
  }

  /** Sobe a foto e devolve o endereço público dela. */
  async function subirFoto(id) {
    var sb = window.PharmaFitAuth.cliente();
    /* O nome leva a hora: endereço novo a cada troca. Com nome fixo, o
       cache do navegador e o do Supabase continuariam entregando a foto
       antiga por horas, e a troca pareceria não ter funcionado. */
    var nome = String(id).replace(/[^a-zA-Z0-9-]/g, '') + '-' + Date.now() + '.webp';
    var r = await sb.storage.from(BALDE).upload(nome, fotoNova.blob, {
      contentType: 'image/webp',
      cacheControl: '31536000'
    });
    if (r.error) throw new Error('a foto não subiu: ' + r.error.message);
    var pub = sb.storage.from(BALDE).getPublicUrl(nome);
    return (pub && pub.data && pub.data.publicUrl) || '';
  }

  /** Apaga do balde a foto que acabou de ser substituída. */
  async function apagarFotoVelha(url) {
    try {
      if (!url || url.indexOf('/' + BALDE + '/') === -1) return;
      var nome = url.split('/' + BALDE + '/')[1].split('?')[0];
      if (!nome) return;
      await window.PharmaFitAuth.cliente().storage.from(BALDE).remove([nome]);
    } catch (e) {
      /* foto órfã no balde não quebra nada; não vale falhar o salvamento
         por causa da limpeza. */
    }
  }

  function numero(el) {
    var t = String(el.value || '').trim().replace(',', '.');
    if (t === '') return null;
    var n = Number(t);
    return isNaN(n) ? NaN : n;
  }

  /* ---------------------------------------------------------
     O LUCRO DESTE PRODUTO, ENQUANTO ELE DIGITA

     Venda menos compra, em reais e em porcento, embaixo dos dois
     campos. Não é enfeite: é a pergunta que o dono faz ao digitar
     o preço, e sem isto ele faz a conta de cabeça produto por
     produto — ou não faz, e vende no prejuízo sem perceber.

     Ela SOME quando falta um dos dois números, em vez de mostrar
     "lucro R$ 1.099,00" para quem ainda não pôs o preço de compra.
     E fala claro quando o lucro é negativo, que é o caso que
     custa dinheiro.
     --------------------------------------------------------- */

  function pintarLucro() {
    if (!folha) return;
    var alvo = folha.querySelector('[data-lucro]');
    if (!alvo) return;

    if (!verCusto) { alvo.hidden = true; return; }

    var venda = numero(folha.querySelector('#ed-preco'));
    var compra = numero(folha.querySelector('#ed-custo'));

    if (venda === null || compra === null || isNaN(venda) || isNaN(compra) ||
        venda <= 0 || compra <= 0) {
      alvo.hidden = true;
      alvo.className = 'folha__conta';
      return;
    }

    var lucro = venda - compra;
    var porcento = Math.round((lucro / venda) * 100);

    alvo.hidden = false;
    if (lucro < 0) {
      alvo.className = 'folha__conta folha__conta--ruim';
      alvo.textContent = 'Atenção: vendendo a ' + moeda(venda) + ' e comprando a ' +
        moeda(compra) + ', cada unidade dá PREJUÍZO de ' + moeda(Math.abs(lucro)) + '.';
    } else if (lucro === 0) {
      alvo.className = 'folha__conta folha__conta--ruim';
      alvo.textContent = 'Vendendo pelo mesmo preço da compra: lucro zero por unidade.';
    } else {
      alvo.className = 'folha__conta folha__conta--bom';
      alvo.textContent = 'Lucro de ' + moeda(lucro) + ' por unidade (' + porcento +
        '% do preço de venda).';
    }
  }

  async function salvar() {
    limparErros();
    calar();

    var nome = String(folha.querySelector('#ed-nome').value || '').trim();
    var preco = numero(folha.querySelector('#ed-preco'));
    var custo = numero(folha.querySelector('#ed-custo'));
    var antes = numero(folha.querySelector('#ed-antes'));
    var estoque = numero(folha.querySelector('#ed-estoque'));
    var descricao = String(folha.querySelector('#ed-descricao').value || '').trim();
    var categoria = folha.querySelector('[data-categoria]').value;
    var ativo = folha.querySelector('[data-ativo]').checked;
    var destaque = String(folha.querySelector('[data-destaque]').value || '');

    var ruim = false;
    if (nome.length < 2) { erroNo('nome', 'Escreva o nome do produto.'); ruim = true; }
    if (preco === null || isNaN(preco) || preco < 0) {
      erroNo('preco', 'Ponha o preço de venda (pode ser 0).'); ruim = true;
    }
    if (custo !== null && (isNaN(custo) || custo < 0)) {
      erroNo('custo', 'Custo inválido.'); ruim = true;
    }
    if (antes !== null && (isNaN(antes) || antes < 0)) {
      erroNo('antes', 'Preço antigo inválido.'); ruim = true;
    }
    if (estoque !== null && (isNaN(estoque) || estoque < 0)) {
      erroNo('estoque', 'Estoque inválido.'); ruim = true;
    }
    /* Preço antigo MENOR que o de venda viraria "-12% OFF" negativo na
       vitrine. Barra aqui e explica, em vez de publicar um desconto que
       não existe. */
    if (antes !== null && antes > 0 && preco !== null && !isNaN(preco) && antes <= preco) {
      erroNo('antes', 'O preço antigo tem de ser MAIOR que o de venda — é ele que forma o ' +
                      'desconto que o cliente vê. Deixe 0 se não há promoção.');
      ruim = true;
    }
    /* ETIQUETA DE PROMOÇÃO SEM DESCONTO NÃO SAI DAQUI.
       Uma tarja vermelha escrita PROMOÇÃO num produto que está pelo
       preço normal é propaganda enganosa — e é o tipo de coisa que dá
       problema de verdade, não só de gosto. O desconto do site nasce do
       preço antigo; sem ele, não existe promoção para anunciar. */
    if (destaque === 'promocao' &&
        !(antes !== null && antes > 0 && preco !== null && !isNaN(preco) && antes > preco)) {
      erroNo('destaque', 'Para anunciar PROMOÇÃO o produto precisa de um preço antigo maior ' +
                         'que o de venda — é ele que forma o desconto. Preencha "Preço antigo" ' +
                         'ou escolha outra etiqueta.');
      ruim = true;
    }
    if (ruim) return;

    var botao = folha.querySelector('[data-salvar]');
    botao.disabled = true;
    botao.textContent = 'Salvando…';

    try {
      var campos = {
        nome: nome,
        categoria: categoria,
        preco: preco,
        custo: custo === null ? 0 : custo,
        antes: antes === null ? 0 : antes,
        estoque: estoque,
        descricao: descricao,
        ativo: ativo
      };

      /* A etiqueta só entra no que vai para o banco quando a coluna
         existe. Mandar um campo que não existe faz o PostgREST recusar
         o salvar INTEIRO — a equipe perderia a mudança de preço por
         causa de uma coluna que falta. */
      if (podeEtiquetar(editando)) campos.destaque = destaque || null;

      var urlVelha = editando.imagem || '';
      if (podeTrocarFoto(editando)) {
        if (fotoNova) {
          botao.textContent = 'Enviando a foto…';
          campos.imagem = await subirFoto(editando.id);
        } else if (fotoTirar) {
          campos.imagem = null;
        }
      }

      var r = await window.PharmaFitDados.salvarProduto(editando.id, campos);
      if (r && r.ok === false) throw new Error(r.erro || 'não deu para salvar');

      if (campos.imagem !== undefined && urlVelha && urlVelha !== campos.imagem) {
        await apagarFotoVelha(urlVelha);
      }

      /* Atualiza a lista na memória e redesenha, em vez de recarregar a
         página: recarregar perderia a busca e o filtro que a pessoa
         acabou de usar. */
      Object.keys(campos).forEach(function (k) { editando[k] = campos[k]; });
      pintar();

      dizer('Salvo. O site já mostra assim.', 'bom');
      setTimeout(fechar, 900);
    } catch (e) {
      dizer(String((e && e.message) || e), 'ruim');
    } finally {
      botao.disabled = false;
      botao.textContent = 'Salvar';
    }
  }

  function abrir(p) {
    /* Guardo quem estava com o foco para devolver o foco ali quando a
       folha fechar — e, como reserva, as TRÊS BOLINHAS deste produto.
       A reserva não é luxo: quando a folha é aberta pelo menu, quem
       estava com o foco era o "Editar" de dentro do menu, que fecha
       antes da folha abrir e deixa de poder receber foco. */
    Moldura.foco.guardar('[data-acoes="' + String(p.id).replace(/"/g, '') + '"]');
    montarFolha();
    editando = p;
    fotoNova = null;
    fotoTirar = false;
    limparErros();
    calar();

    folha.querySelector('[data-folha-titulo]').textContent = p.nome || 'Produto';
    folha.querySelector('#ed-nome').value = p.nome || '';
    folha.querySelector('#ed-preco').value = (p.preco != null ? p.preco : (p.venda != null ? p.venda : ''));
    folha.querySelector('#ed-custo').value = (p.custo != null ? p.custo : '');
    folha.querySelector('#ed-antes').value = (p.antes != null ? p.antes : '');
    folha.querySelector('#ed-estoque').value =
      (p.estoque === null || p.estoque === undefined || p.estoque === '') ? '' : p.estoque;
    var desc = folha.querySelector('#ed-descricao');
    desc.value = p.descricao || '';
    folha.querySelector('[data-conta-descricao]').textContent = desc.value.length;
    folha.querySelector('[data-ativo]').checked = p.ativo !== false;

    /* A etiqueta, quando a coluna existe. `|| ''` cai em "Nenhuma", que
       é o que o banco guarda como vazio. */
    var caixaEtiqueta = folha.querySelector('[data-campo="destaque"]');
    caixaEtiqueta.hidden = !podeEtiquetar(p);
    folha.querySelector('[data-destaque]').value = String(p.destaque || '');

    /* Atendente não vê o preço de compra: o campo sai da folha, e a
       linha de lucro com ele. Campo escondido também não é enviado no
       salvar — o `numero()` de um campo escondido devolve o que estiver
       nele, e ele continua com o valor que veio do banco, então o custo
       é gravado igual ao que já era. Atendente não apaga o custo do
       dono por descuido. */
    folha.querySelector('[data-campo="custo"]').hidden = !verCusto;
    pintarLucro();

    /* As categorias que já existem, mais a do produto, para a lista não
       inventar categoria nem perder a que ele tem. */
    var vistas = [];
    estado.produtos.forEach(function (o) {
      var c = String(o.categoria || '').trim();
      if (c && vistas.indexOf(c) === -1) vistas.push(c);
    });
    ['Tirzepatida', 'Peptídeos', 'Retatrutida', 'Outros'].forEach(function (c) {
      if (vistas.indexOf(c) === -1) vistas.push(c);
    });
    var sel = folha.querySelector('[data-categoria]');
    sel.innerHTML = vistas.map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');
    sel.value = String(p.categoria || 'Outros');

    var bloco = folha.querySelector('[data-bloco-foto]');
    bloco.hidden = !podeTrocarFoto(p);
    if (!bloco.hidden) {
      folha.querySelector('[data-foto-vista]').src = fotoDe(p);
      folha.querySelector('[data-tirar-foto]').hidden = !p.imagem;
      folha.querySelector('[data-foto-nota]').textContent =
        'JPG, PNG ou WEBP. Eu reduzo e converto antes de enviar, para a página do ' +
        'cliente não ficar pesada.';
    }

    veu.classList.add('is-aberto');
    folha.classList.add('is-aberta');
    document.body.style.overflow = 'hidden';
    /* O foco vai para o nome do produto na hora. Antes ele esperava os
       320ms da animação, e nessa fresta o Tab ainda andava na página de
       trás. `preventScroll` é o que tira a necessidade da espera: o
       navegador não pula a tela para mostrar o campo. */
    Moldura.foco.entrar(folha, folha.querySelector('#ed-nome'));
  }

  function fechar() {
    if (!folha) return;
    folha.classList.remove('is-aberta');
    veu.classList.remove('is-aberto');
    document.body.style.overflow = '';
    Moldura.foco.devolver();
    if (fotoNova && fotoNova.url) URL.revokeObjectURL(fotoNova.url);
    fotoNova = null;
    fotoTirar = false;
    editando = null;
  }

  /* =========================================================
     AS TRÊS BOLINHAS: EDITAR, ARQUIVAR, EXCLUIR

     Brian, 17/09/2026: "acho que nao da pra arquivar nem excluir
     produtos, deixe essa opcao no painel de gestao".

     Ele tinha razão na prática. Dava para tirar um produto do site —
     havia uma caixinha "Aparecer no site" dentro da folha de edição —
     mas para achar isso a pessoa tinha de abrir a edição, descer a
     folha inteira e entender que desmarcar uma caixinha era o mesmo
     que arquivar. E excluir não existia de jeito nenhum.

     Agora as três bolinhas abrem um menu com as três coisas, cada uma
     dizendo o que faz antes de ser tocada.

     ARQUIVAR É `ativo = false`, e não uma coluna nova. É a mesma
     chave que a caixinha "Aparecer no site" já mexia, com o nome que
     o dono usa. Produto arquivado NÃO desaparece daqui: a lista do
     painel lê a tabela inteira e ele continua na tela, marcado "Fora
     do site", com a opção de voltar a vender. Desaparecer seria pior
     que não arquivar — o dono acharia que tinha excluído sem querer.

     EXCLUIR APAGA A LINHA MESMO, e isso é seguro para o histórico:
     `pf_pedidos.produto` guarda o NOME do produto como texto e não há
     chave estrangeira apontando para `pf_produtos` (conferido no
     banco). Pedido antigo continua dizendo o que foi vendido depois
     do produto sumir do catálogo.

     E não precisou de nada no banco: a equipe já tem permissão de
     apagar em `pf_produtos` (a política "equipe gerencia produtos"
     vale para todos os comandos, e `authenticated` tem o DELETE).
     Conferido antes de escrever a tela, para eu não entregar um botão
     que o banco recusa.
     ========================================================= */

  var menu = null;
  var menuVeu = null;
  var noMenu = null;        /* produto que o menu está tratando */

  var LAPIS = '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m14 6 4 4"/>';
  var CAIXA_ARQ = '<path d="M3.5 6.5h17v3.5h-17z"/><path d="M5.2 10v8.5h13.6V10"/>' +
                  '<path d="M10 13.2h4"/>';
  var DESARQ = '<path d="M3.5 6.5h17v3.5h-17z"/><path d="M5.2 10v8.5h13.6V10"/>' +
               '<path d="M12 16.6v-4.4m0 0-1.8 1.8M12 12.2l1.8 1.8"/>';
  var LIXO = '<path d="M4.5 7h15"/><path d="M9.5 7V4.8h5V7"/>' +
             '<path d="m6.6 7 .9 12.2h9l.9-12.2"/><path d="M10.4 10.6v6M13.6 10.6v6"/>';

  function opcao(acao, icone, nome, pe, perigo) {
    return '<button class="opcao' + (perigo ? ' opcao--perigo' : '') + '" type="button" ' +
      'data-acao="' + acao + '">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      icone + '</svg>' +
      '<span class="opcao__texto">' +
        '<span class="opcao__nome">' + nome + '</span>' +
        '<span class="opcao__pe">' + pe + '</span>' +
      '</span>' +
    '</button>';
  }

  function montarMenu() {
    if (menu) return;

    menuVeu = document.createElement('div');
    menuVeu.className = 'veu';
    document.body.appendChild(menuVeu);

    menu = document.createElement('div');
    menu.className = 'folha';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.innerHTML =
      '<div class="folha__topo">' +
        '<h2 class="folha__titulo" data-menu-titulo>Produto</h2>' +
        '<button class="folha__fechar" type="button" data-fechar-menu aria-label="Fechar">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="folha__corpo">' +
        '<p class="folha__recado" data-menu-recado hidden></p>' +
        '<div class="folha__opcoes" data-menu-opcoes></div>' +
      '</div>';
    document.body.appendChild(menu);

    menu.querySelector('[data-fechar-menu]').addEventListener('click', function () {
      fecharMenu(true);
    });
    menuVeu.addEventListener('click', function () { fecharMenu(true); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-aberta')) fecharMenu(true);
    });

    /* Clique delegado: o conteúdo do menu é remontado a cada produto
       (e a confirmação de excluir troca os botões no lugar). */
    menu.querySelector('[data-menu-opcoes]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-acao]');
      if (!b) return;
      var acao = b.getAttribute('data-acao');
      if (acao === 'editar') return editarDoMenu();
      if (acao === 'arquivar') return mudarAtivo(false);
      if (acao === 'reativar') return mudarAtivo(true);
      if (acao === 'excluir') return pedirConfirmacao();
      if (acao === 'excluir-mesmo') return excluirDeVerdade();
      if (acao === 'voltar') return pintarMenu();
    });
  }

  function recadoMenu(msg, tipo) {
    var el = menu.querySelector('[data-menu-recado]');
    el.hidden = false;
    el.textContent = msg;
    el.className = 'folha__recado folha__recado--' + (tipo || 'bom');
  }

  function calarMenu() {
    var el = menu.querySelector('[data-menu-recado]');
    el.hidden = true;
    el.textContent = '';
  }

  function pintarMenu() {
    calarMenu();
    var arquivado = noMenu.ativo === false;
    menu.querySelector('[data-menu-opcoes]').innerHTML =
      opcao('editar', LAPIS, 'Editar produto',
            'Nome, preço, foto, estoque e descrição.') +
      (arquivado
        ? opcao('reativar', DESARQ, 'Voltar a vender',
                'O produto aparece no site outra vez, na hora.')
        : opcao('arquivar', CAIXA_ARQ, 'Arquivar',
                'Sai do site e para de ser vendido, mas fica aqui e você ' +
                'pode voltar a vender quando quiser.')) +
      opcao('excluir', LIXO, 'Excluir',
            'Apaga o produto do catálogo para sempre. Os pedidos antigos ' +
            'continuam no lugar.', true);
  }

  function abrirMenu(p) {
    Moldura.foco.guardar();
    montarMenu();
    noMenu = p;
    menu.setAttribute('aria-label', 'Opções de ' + (p.nome || 'produto'));
    menu.querySelector('[data-menu-titulo]').textContent = p.nome || 'Produto';
    pintarMenu();
    menuVeu.classList.add('is-aberto');
    menu.classList.add('is-aberta');
    document.body.style.overflow = 'hidden';
    Moldura.foco.entrar(menu, menu.querySelector('[data-acao]'));
  }

  /* `devolver` é falso quando quem fecha o menu vai abrir a folha de
     edição em seguida: ali o foco tem de ir para o campo do nome, e
     não voltar para as três bolinhas. */
  function fecharMenu(devolver) {
    if (!menu) return;
    menu.classList.remove('is-aberta');
    menuVeu.classList.remove('is-aberto');
    document.body.style.overflow = '';
    if (devolver) Moldura.foco.devolver();
    noMenu = null;
  }

  function editarDoMenu() {
    var p = noMenu;
    fecharMenu(false);
    abrir(p);
  }

  async function mudarAtivo(ligar) {
    var p = noMenu;
    var botoes = menu.querySelectorAll('[data-acao]');
    botoes.forEach(function (b) { b.disabled = true; });
    recadoMenu(ligar ? 'Voltando a vender…' : 'Arquivando…', 'bom');
    try {
      var r = await window.PharmaFitDados.salvarProduto(p.id, { ativo: ligar });
      if (r && r.ok === false) throw new Error(r.erro || 'não deu para salvar');
      p.ativo = ligar;
      pintar();
      recadoMenu(ligar
        ? 'Pronto. O produto já aparece no site.'
        : 'Arquivado. Ele saiu do site e continua aqui, marcado "Fora do site".', 'bom');
      setTimeout(function () { fecharMenu(true); }, 1100);
    } catch (e) {
      recadoMenu(String((e && e.message) || e), 'ruim');
      botoes.forEach(function (b) { b.disabled = false; });
    }
  }

  /* CONFIRMAR ANTES DE APAGAR, no lugar de um `confirm()` do
     navegador: aquele não diz o nome do produto direito no celular e
     não dá para explicar o que acontece com os pedidos antigos. */
  function pedirConfirmacao() {
    calarMenu();
    menu.querySelector('[data-menu-opcoes]').innerHTML =
      '<p class="folha__conta folha__conta--ruim">Excluir <b>' + esc(noMenu.nome) +
        '</b> do catálogo? Isto não dá para desfazer. Os pedidos antigos deste ' +
        'produto continuam onde estão — eles guardam o nome, não o cadastro.</p>' +
      opcao('voltar', DESARQ, 'Não, voltar',
            'Nada é apagado.') +
      opcao('excluir-mesmo', LIXO, 'Sim, excluir para sempre',
            'O produto sai do catálogo e do site agora.', true);
  }

  async function excluirDeVerdade() {
    var p = noMenu;
    var botoes = menu.querySelectorAll('[data-acao]');
    botoes.forEach(function (b) { b.disabled = true; });
    recadoMenu('Excluindo…', 'bom');
    try {
      var r = await window.PharmaFitDados.excluir('produtos', p.id);
      if (r && r.ok === false) throw new Error(r.erro || 'não deu para excluir');
      estado.produtos = estado.produtos.filter(function (o) {
        return String(o.id) !== String(p.id);
      });
      montarCategorias();
      pintar();
      recadoMenu('Excluído.', 'bom');
      setTimeout(function () { fecharMenu(true); }, 800);
    } catch (e) {
      recadoMenu(String((e && e.message) || e), 'ruim');
      botoes.forEach(function (b) { b.disabled = false; });
    }
  }

  async function carregar() {
    try {
      /* Antes de desenhar, saber quem está olhando: atendente não vê
         preço de compra nem lucro, e é mais honesto não desenhar do que
         desenhar e apagar depois. */
      verCusto = await Moldura.podeVerCusto();
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

    /* Clique delegado no container: os cartões são redesenhados a cada
       filtro e busca, e ouvinte posto em cada botão morreria no
       primeiro redesenho. */
    document.querySelector('[data-produtos]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-acoes]');
      if (!b) return;
      var id = b.getAttribute('data-acoes');
      var p = estado.produtos.filter(function (o) { return String(o.id) === String(id); })[0];
      if (p) abrirMenu(p);
    });

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
