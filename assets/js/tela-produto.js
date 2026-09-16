/* =========================================================
   PHARMA FIT — a página de um produto

   Chega por `produto.html?p=<nome>`. O nome vem do catálogo, que é
   a fonte única de produto e preço — esta tela não guarda nada.

   AS FAIXAS DE ATACADO

   Quando o produto tem faixas no catálogo, elas aparecem lado a
   lado e a faixa da quantidade escolhida fica marcada. Quando não
   tem — e hoje nenhum tem, porque esses preços são números do
   negócio e o Brian ainda não passou —, a tela mostra o preço
   normal e nenhuma faixa. Faixa vazia não aparece.
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

    var foto = achar('foto');
    foto.src = produto.imagem || 'assets/img/prod-frasco.svg';
    foto.alt = produto.nome + ' — Pharma Fit';

    var selo = achar('selo');
    var textoSelo = semEstoque ? 'SEM ESTOQUE' : (produto.antes ? 'PROMOÇÃO' : produto.destaque);
    /* `hidden` nas duas direções: antes era só `if (textoSelo)`, então um
       produto que DEIXASSE de estar em promoção continuaria com o selo
       "PROMOÇÃO" na tela depois da atualização. */
    selo.hidden = !textoSelo;
    selo.textContent = textoSelo || '';
    selo.classList.toggle('product__badge--off', semEstoque);
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

  async function pintarConta() {
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

    /* As outras moedas, só com cotação. */
    var caixaMoedas = achar('moedas');
    caixaMoedas.hidden = true;
    if (Moedas) {
      try {
        var outras = await Moedas.converter(total);
        if (outras.length) {
          caixaMoedas.hidden = false;
          caixaMoedas.innerHTML = outras.map(function (m) {
            return '≈ <b>' + esc(m.texto) + '</b>';
          }).join('<span class="ficha__sep">·</span>');
        }
      } catch (e) {}
    }

    montarZap(r.preco, total);
    pintarFaixas();
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
  botaoShare.addEventListener('click', async function () {
    var dados = {
      title: produto.nome + ' — Pharma Fit',
      text: produto.nome,
      url: location.href
    };
    try {
      if (navigator.share) { await navigator.share(dados); return; }
      await navigator.clipboard.writeText(location.href);
      botaoShare.textContent = 'Endereço copiado';
      setTimeout(function () { botaoShare.textContent = 'Compartilhar'; }, 1600);
    } catch (e) {
      /* recusou o compartilhamento, ou o navegador não deixa copiar */
      botaoShare.textContent = 'Copie o endereço da barra acima';
      setTimeout(function () { botaoShare.textContent = 'Compartilhar'; }, 2600);
    }
  });

  pintarConta();

  /* Quando o banco responde (catalogo-banco.js), redesenha com o que a
     equipe salvou: preço, descrição, foto, estoque. O objeto do produto
     é o mesmo do catálogo, então ele já vem atualizado — só falta pôr na
     tela. */
  document.addEventListener('pharmafit-catalogo', function () {
    aplicarProduto();
    pintarFaixas();
    pintarConta();
  });
})();
