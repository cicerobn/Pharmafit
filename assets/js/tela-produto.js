/* =========================================================
   PHARMA FIT — a página de um produto

   Chega por `produto.html?p=<nome>`. O nome vem do catálogo, que é
   a fonte única de produto e preço — esta tela não guarda nada.

   AS FAIXAS DE ATACADO

   Quando o produto tem faixas no catálogo, elas aparecem lado a
   lado e a faixa da quantidade escolhida fica marcada. Quando não
   tem, a tela mostra o preço normal e nenhuma faixa — faixa vazia não
   aparece. Hoje só o Tirzec Pen tem faixa.

   precisa: carrinho, favoritos, loja
   ========================================================= */
(function () {
  'use strict';

  var C = window.PharmaFitCarrinho;
  var Moedas = window.PharmaFitMoedas;
  var Favoritos = window.PharmaFitFavoritos;
  var Preco = window.PharmaFitPreco;
  if (!C || !document.getElementById('produto')) return;

  var cfg = window.PHARMAFIT_CONFIG || {};

  function moeda(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function achar(el) { return document.querySelector('[data-' + el + ']'); }

  /* ---------- qual produto ---------- */

  var pedido = new URLSearchParams(location.search).get('p') || '';
  var produto = C.doCatalogo(pedido);

  document.getElementById('carregando').hidden = true;

  if (!produto) {
    var caixa = document.getElementById('nao-achei');
    caixa.hidden = false;
    document.getElementById('nao-achei-texto').textContent = pedido
      ? '“' + pedido + '” não está no catálogo. Ele pode ter saído de linha.'
      : 'O endereço veio sem o nome do produto.';
    achar('caminho-nome').textContent = 'Não encontrado';
    return;
  }

  document.getElementById('produto').hidden = false;
  document.title = produto.nome + ' — Pharma Fit';

  var semEstoque = false;
  var temControle = false;
  var maximo = 999;

  var quantidade = 1;

  /* ---------- o que vem do produto ----------

     NUMA FUNÇÃO, e não escrito direto, porque isto precisa acontecer
     DUAS vezes: agora, com o que está no código, e de novo quando o
     banco responder. A equipe passou a mudar nome, descrição, foto e
     preço pelo painel — se esta tela desenhasse só na primeira vez, ela
     mostraria o preço velho enquanto a vitrine mostra o novo. Duas
     páginas do mesmo site com preços diferentes é pior que as duas
     erradas: o cliente vê e não confia em nenhuma. */
  function aplicarProduto() {
    semEstoque = produto.estoque !== null && produto.estoque !== undefined &&
                 produto.estoque !== '' && Number(produto.estoque) <= 0;
    temControle = !(produto.estoque === null || produto.estoque === undefined ||
                    produto.estoque === '');
    maximo = temControle ? Math.max(1, Number(produto.estoque)) : 999;
    if (quantidade > maximo) quantidade = maximo;

    achar('caminho-nome').textContent = produto.nome;
    achar('nome').textContent = produto.nome;
    achar('categoria').textContent = produto.categoria || '';
    achar('desc').textContent = produto.descricao || '';
    document.title = produto.nome + ' — Pharma Fit';

    /* Os três benefícios da categoria, desenhados pela MESMA função que
       desenha a faixa do cartão na vitrine (`catalogo.js`). Se a
       categoria não tiver benefício, a faixa não aparece — melhor sem
       ela que com um buraco na página. */
    var bene = achar('beneficios');
    var Beneficios = window.PharmaFitBeneficios;
    var htmlBene = (bene && Beneficios) ? Beneficios.html(produto.categoria) : '';
    if (bene) {
      bene.innerHTML = htmlBene;
      bene.hidden = !htmlBene;
    }

    var foto = achar('foto');
    foto.src = produto.imagem || 'assets/img/prod-frasco.svg';
    foto.alt = produto.nome + ' — Pharma Fit';

    /* A ETIQUETA VEM DE `loja.js`, A MESMA DA VITRINE.

       Aqui havia a regra escrita de novo — `produto.antes ? 'PROMOÇÃO'
       : produto.destaque` —, uma segunda cópia da decisão. Com duas
       cópias, hoje mesmo a lista mostraria a etiqueta nova e esta
       página a antiga, para o mesmo produto.

       O elemento no HTML virou um invólucro sem estilo: quem tem a
       classe, a cor e a animação é o `<span>` que a função devolve.
       Vazio, nada é desenhado — e é isso que tira o selo do produto que
       DEIXOU de estar em promoção (antes ele ficava na tela para
       sempre, porque só existia o caminho que ESCREVE o selo). */
    var selo = achar('selo');
    var Etiqueta = window.PharmaFitEtiqueta;
    selo.innerHTML = semEstoque
      ? '<span class="product__badge product__badge--off"><span>SEM ESTOQUE</span></span>'
      : (Etiqueta ? Etiqueta(produto, 'product__badge') : '');
  }

  aplicarProduto();

  /* ---------- as faixas ---------- */

  function pintarFaixas() {
    var r = C.precoPara(produto, quantidade);
    var caixa = achar('faixas');
    var simples = achar('preco-simples');

    if (!r.faixas.length) {
      /* Sem faixa cadastrada: o preço de sempre. */
      caixa.hidden = true;
      simples.hidden = false;

      var antes = achar('antes');
      if (produto.antes) {
        antes.hidden = false;
        antes.textContent = moeda(produto.antes);
      } else {
        antes.hidden = true;
      }
      achar('valor').textContent = moeda(produto.venda);
      achar('parcelas').textContent = Preco && Preco.textoParcelas
        ? Preco.textoParcelas(produto.venda) : '';
      return;
    }

    simples.hidden = true;
    caixa.hidden = false;

    caixa.innerHTML = r.faixas.map(function (f) {
      var valendo = r.faixa && Number(f.de) === Number(r.faixa.de);
      var ate = f.ate ? Number(f.ate) : null;
      var quantas = ate
        ? Number(f.de) + ' a ' + ate + ' unid.'
        : Number(f.de) + ' unid. ou mais';

      return '<div class="faixa' + (valendo ? ' is-valendo' : '') + '">' +
        '<p class="faixa__nome">' + esc(f.nome || 'Preço') + '</p>' +
        '<p class="faixa__valor">' + moeda(f.preco) + '</p>' +
        '<p class="faixa__quantas">' + quantas + '</p>' +
      '</div>';
    }).join('');
  }

  /* ---------- a conta da quantidade ---------- */

  /* O PREÇO NÃO ESPERA A COTAÇÃO DO DÓLAR.
   *
   * Esta função era `async` e a ÚLTIMA coisa que ela fazia era
   * `pintarFaixas()` — que é quem põe o preço na tela. Antes disso
   * havia um `await` buscando a cotação das outras moedas no banco.
   *
   * Resultado: se aquela busca demorasse, travasse ou nem respondesse,
   * `pintarFaixas()` nunca rodava e A PÁGINA DO PRODUTO FICAVA SEM
   * PREÇO. Os dois blocos de preço nascem `hidden` no HTML, então não
   * aparecia nem um valor errado: aparecia nada, com um buraco entre a
   * descrição e a quantidade. Sem erro no console, sem rastro.
   *
   * Medido em 17/09/2026, com o banco fora do ar: os dois blocos
   * escondidos, o preço só existindo na linha da conta lá embaixo.
   * Num celular com internet ruim é o mesmo efeito.
   *
   * Agora a ordem é a da importância: preço, parcelas, WhatsApp e
   * faixas primeiro, tudo sem esperar ninguém. A cotação das outras
   * moedas é um extra, roda depois e sozinha — se falhar, falha só
   * ela. Por isso a função deixou de ser `async`: não havia quem
   * esperasse por ela (nenhuma das quatro chamadas usava `await`), e
   * ser `async` só servia para esconder esta ordem errada. */
  function pintarConta() {
    var r = C.precoPara(produto, quantidade);
    var total = r.preco * quantidade;

    achar('qtd').textContent = String(quantidade);
    achar('menos').disabled = quantidade <= 1;
    achar('mais').disabled = quantidade >= maximo;

    var conta = achar('conta');
    conta.hidden = false;

    achar('conta-linha').textContent =
      quantidade + ' × ' + moeda(r.preco);
    achar('conta-total').textContent = moeda(total);

    /* "Falta X para a próxima faixa" só existe quando há próxima faixa.
       Sem faixas, esta frase nunca aparece. */
    var prox = achar('proxima');
    if (r.proxima && r.faltam > 0) {
      prox.hidden = false;
      prox.textContent = 'Levando ' + r.faltam +
        (r.faltam === 1 ? ' unidade a mais' : ' unidades a mais') +
        ', cada uma sai por ' + moeda(r.proxima.preco) + '.';
    } else {
      prox.hidden = true;
    }

    /* O QUE IMPORTA VAI PARA A TELA AGORA. */
    montarZap(r.preco, total);
    pintarFaixas();

    /* E o extra vai atrás, sem ninguém esperando por ele. */
    pintarMoedas(total);
  }

  /* As outras moedas, só com cotação — e só depois que o preço já está
     na tela. Esconde antes de pedir: sem isto, trocar a quantidade
     deixaria na tela a conversão da quantidade anterior enquanto a
     nova não chega. */
  async function pintarMoedas(total) {
    var caixa = achar('moedas');
    caixa.hidden = true;
    if (!Moedas) return;
    try {
      var outras = await Moedas.converter(total);
      if (!outras.length) return;
      caixa.innerHTML = outras.map(function (m) {
        return '≈ <b>' + esc(m.texto) + '</b>';
      }).join('<span class="ficha__sep">·</span>');
      caixa.hidden = false;
    } catch (e) {
      /* sem cotação a página fica completa do mesmo jeito: o preço em
         real, que é o que se paga, já está lá */
    }
  }

  /* ---------- WhatsApp ---------- */

  function montarZap(cada, total) {
    var numero = String(cfg.WHATSAPP || '559285904669').replace(/\D+/g, '');
    var texto = 'Olá! Tenho interesse em ' + quantidade + '× ' + produto.nome +
      ' (' + moeda(total) + ').';
    achar('zap').href = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  /* ---------- botões ---------- */

  achar('mais').addEventListener('click', function () {
    if (quantidade < maximo) { quantidade++; pintarConta(); }
  });
  achar('menos').addEventListener('click', function () {
    if (quantidade > 1) { quantidade--; pintarConta(); }
  });

  var botaoAdicionar = achar('adicionar');
  var botaoAvisar = achar('avisar');

  if (semEstoque) {
    /* Sem estoque não há o que pôr no carrinho: o botão sai e entra o de
       avisar. A regra é a mesma da vitrine — pôr no carrinho o que não
       pode ser entregue só empurra a decepção para o fim da compra. */
    botaoAdicionar.hidden = true;
    achar('bloco-quantidade').hidden = true;
    achar('conta').hidden = true;
    botaoAvisar.hidden = false;
    botaoAvisar.setAttribute('data-avise', produto.nome);
  } else {
    botaoAdicionar.addEventListener('click', function () {
      /* A foto desta página voa até o carrinho da barra de cima, pela
         mesma função que a vitrine usa (`app.js`) — uma animação só,
         para as duas telas não terem cada uma a sua.
         Chamada ANTES do `C.por`, porque ela mede a foto onde ela está
         e o `por` dispara o redesenho. */
      if (window.PharmaFitVoo) {
        window.PharmaFitVoo.aoCarrinho(achar('foto'));
      }
      C.por(produto.nome, quantidade);

      var texto = botaoAdicionar.querySelector('span');
      var antes = texto.textContent;
      botaoAdicionar.classList.add('is-feito');
      texto.textContent = quantidade + (quantidade === 1 ? ' no carrinho' : ' no carrinho');

      setTimeout(function () {
        botaoAdicionar.classList.remove('is-feito');
        texto.textContent = antes;
      }, 1500);
    });
  }

  achar('estoque').textContent = temControle
    ? (semEstoque ? 'Sem estoque' : Number(produto.estoque) + ' em estoque')
    : '';

  /* favoritar — usa o módulo que já existe, para o coração da vitrine e
     o daqui contarem a mesma coisa */
  var botaoFav = achar('favoritar');
  function pintarFav() {
    if (!Favoritos) { botaoFav.hidden = true; return; }
    var salvo = Favoritos.ler().indexOf(produto.nome) !== -1;
    achar('fav-texto').textContent = salvo ? 'Nos favoritos' : 'Favoritar';
    botaoFav.classList.toggle('is-salvo', salvo);
  }
  if (Favoritos) {
    botaoFav.addEventListener('click', function () {
      Favoritos.alternar(produto.nome);
      pintarFav();
    });
    pintarFav();
  } else {
    botaoFav.hidden = true;
  }

  /* compartilhar — usa o do aparelho quando existe; quando não, copia o
     endereço. Nunca fica sem fazer nada. */
  var botaoShare = achar('compartilhar');

  /* O RECADO VAI NO <span>, NÃO NO BOTÃO.
     O botão agora tem um desenho dentro dele, e `botaoShare.textContent
     = '...'` APAGA o desenho junto com o texto — o ícone sumiria no
     primeiro toque e não voltaria mais. Escrevo só no pedaço de texto. */
  function dizerNoShare(texto) {
    var alvo = botaoShare.querySelector('[data-share-texto]') || botaoShare;
    alvo.textContent = texto;
  }
  botaoShare.addEventListener('click', async function () {
    var dados = {
      title: produto.nome + ' — Pharma Fit',
      text: produto.nome,
      url: location.href
    };
    try {
      if (navigator.share) { await navigator.share(dados); return; }
      await navigator.clipboard.writeText(location.href);
      dizerNoShare('Endereço copiado');
      setTimeout(function () { dizerNoShare('Compartilhar'); }, 1600);
    } catch (e) {
      /* recusou o compartilhamento, ou o navegador não deixa copiar */
      dizerNoShare('Copie o endereço da barra acima');
      setTimeout(function () { dizerNoShare('Compartilhar'); }, 2600);
    }
  });

  /* ---------- produtos da mesma linha ----------

     A referência que o Brian mandou termina com "Produtos
     relacionados / Ver todos", e faz sentido: quem abriu um produto e
     não quis aquele não deveria ter de voltar e procurar de novo.

     O CARTÃO É O MESMO DA VITRINE, não uma cópia. `PharmaFitCartao`
     mora em `loja.js` e é a função que desenha a lista de produtos —
     por isso `loja.js` passou a ser carregado nesta página. Assim o
     coração, o "Adicionar" e o "Ver detalhes" funcionam aqui pelos
     mesmos ouvintes de sempre (eles ficam no `document`, não em cada
     botão), e no dia em que o cartão mudar, muda aqui também.

     Nasce escondida e só aparece se houver o que mostrar: categoria
     com um produto só não deve deixar um título com um vazio embaixo. */

  function pintarRelacionados() {
    var secao = achar('relacionados');
    var grade = achar('relacionados-grade');
    var Cartao = window.PharmaFitCartao;
    if (!secao || !grade || !Cartao) return;

    var iguais = (window.PHARMAFIT_CATALOGO || []).filter(function (o) {
      if (o.foraDoSite) return false;
      if (String(o.nome) === String(produto.nome)) return false;
      return String(o.categoria || '') === String(produto.categoria || '');
    }).slice(0, 4);

    if (!iguais.length) {
      secao.hidden = true;
      return;
    }

    grade.innerHTML = iguais.map(function (o) { return Cartao(o); }).join('');
    secao.hidden = false;

    /* Os corações recém-desenhados precisam nascer já marcados para
       quem já favoritou — o desenho é novo, o gosto da pessoa não. */
    if (Favoritos && Favoritos.pintar) {
      try { Favoritos.pintar(); } catch (e) {}
    }
  }

  pintarRelacionados();

  pintarConta();

  /* Quando o banco responde (catalogo-banco.js), redesenha com o que a
     equipe salvou: preço, descrição, foto, estoque. O objeto do produto
     é o mesmo do catálogo, então ele já vem atualizado — só falta pôr na
     tela. */
  document.addEventListener('pharmafit-catalogo', function () {
    aplicarProduto();
    pintarFaixas();
    pintarConta();
    pintarRelacionados();
  });
})();
