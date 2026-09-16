/* =========================================================
   PHARMA FIT — a tela do carrinho
   ========================================================= */
(function () {
  'use strict';

  var C = window.PharmaFitCarrinho;
  var Moedas = window.PharmaFitMoedas;
  var Area = window.PharmaFitArea;
  if (!C || !document.getElementById('itens')) return;

  var cfg = window.PHARMAFIT_CONFIG || {};

  function moeda(v) {
    return Number(v || 0).toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL'
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var elItens = document.getElementById('itens');
  var elVazio = document.getElementById('vazio');
  var elCheio = document.getElementById('cheio');

  /* ---------- desenhar ---------- */

  async function pintar() {
    var conta = C.conta();

    document.getElementById('carrinho-lead').textContent = conta.itens.length
      ? 'O que você escolheu até agora.'
      : 'Escolha os produtos e eles aparecem aqui.';

    /* Produto que saiu do catálogo depois de entrar no carrinho. Não dá
       para somar como zero nem ignorar em silêncio: a pessoa escolheu
       aquilo e tem de saber que não está mais lá.
       
       ESTE AVISO VEM ANTES do desvio para a tela de vazio, de propósito.
       Na primeira versão ele vinha depois: quando TODOS os itens tinham
       saído de linha, a tela dizia "carrinho vazio" e a pessoa nunca
       ficava sabendo que o que ela escolheu havia sumido. Perda em
       silêncio é o pior jeito de perder. */
    var perdidos = document.getElementById('perdidos');
    if (conta.perdidos.length) {
      perdidos.hidden = false;
      perdidos.textContent = conta.perdidos.length === 1
        ? '“' + conta.perdidos[0] + '” não está mais no catálogo, e por isso saiu do seu carrinho.'
        : conta.perdidos.length + ' produtos não estão mais no catálogo e saíram do seu ' +
          'carrinho: ' + conta.perdidos.join(', ') + '.';
    } else {
      perdidos.hidden = true;
    }

    elVazio.hidden = conta.itens.length > 0;
    elCheio.hidden = conta.itens.length === 0;

    if (!conta.itens.length) {
      /* Esvaziar a lista ANTES de sair. O bloco fica com `hidden`, então
         nada disso aparece — mas as linhas antigas continuavam
         penduradas no HTML. Invisível não é o mesmo que ausente: basta
         alguém tirar o `hidden` um dia, ou uma busca pegar uma dessas
         linhas velhas, para o carrinho vazio voltar a mostrar produto
         que a pessoa já tirou. */
      elItens.innerHTML = '';

      /* Se houve perda, o recado tem de ficar na tela. Ele vive dentro
         do bloco "cheio", então o bloco aparece só com ele dentro. */
      if (conta.perdidos.length) {
        elCheio.hidden = false;
        document.querySelector('.resumo').hidden = true;
      }
      return;
    }
    document.querySelector('.resumo').hidden = false;

    elItens.innerHTML = conta.itens.map(function (i) {
      /* A frase da faixa só existe quando há faixa e falta pouco. Sem
         faixa cadastrada ela não aparece — e hoje nenhum produto tem,
         porque os preços de atacado são decisão do Brian. */
      var faixa = '';
      if (i.proxima && i.faltam > 0) {
        faixa = '<p class="carrinho__faixa">Levando ' + i.faltam +
          (i.faltam === 1 ? ' unidade a mais' : ' unidades a mais') +
          ', cada uma sai por ' + moeda(i.proxima.preco) + '.</p>';
      }

      return '<div class="carrinho__item" data-linha="' + esc(i.nome) + '">' +
        '<img class="carrinho__foto" src="' + esc(i.produto.imagem) + '" alt="" loading="lazy">' +
        '<div class="carrinho__corpo">' +
          '<h2 class="carrinho__nome">' + esc(i.nome) + '</h2>' +
          '<p class="carrinho__unidade">' + esc(i.produto.categoria || '') + '</p>' +
          faixa +
          '<div class="carrinho__quantidade">' +
            '<button class="carrinho__qbtn" type="button" data-menos="' + esc(i.nome) + '" ' +
              'aria-label="Tirar um"' + (i.quantidade <= 1 ? ' disabled' : '') + '>' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>' +
            '</button>' +
            '<span class="carrinho__qnum" data-qtd>' + i.quantidade + '</span>' +
            '<button class="carrinho__qbtn" type="button" data-mais="' + esc(i.nome) + '" ' +
              'aria-label="Pôr um a mais">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="carrinho__lado">' +
          '<p class="carrinho__subtotal">' + moeda(i.subtotal) + '</p>' +
          (i.quantidade > 1
            ? '<p class="carrinho__cada">' + moeda(i.preco) + ' cada</p>'
            : '') +
          '<button class="carrinho__tirar" type="button" data-tirar="' + esc(i.nome) + '">tirar</button>' +
        '</div>' +
      '</div>';
    }).join('');

    /* ---------- o resumo ---------- */

    document.getElementById('resumo-qtd').textContent =
      conta.unidades + (conta.unidades === 1 ? ' item' : ' itens');
    document.getElementById('resumo-soma').textContent = moeda(conta.total);
    document.getElementById('resumo-total').textContent = moeda(conta.total);

    /* As outras moedas, só se houver cotação. */
    var caixaMoedas = document.getElementById('resumo-moedas');
    var linhaCotacao = document.getElementById('resumo-cotacao');
    caixaMoedas.hidden = true;
    linhaCotacao.hidden = true;

    if (Moedas) {
      try {
        var outras = await Moedas.converter(conta.total);
        if (outras.length) {
          caixaMoedas.hidden = false;
          caixaMoedas.innerHTML = outras.map(function (m) {
            return '<span class="resumo__moeda">≈ <b>' + esc(m.texto) + '</b></span>';
          }).join('');

          var quando = await Moedas.desdeQuando();
          linhaCotacao.hidden = false;
          linhaCotacao.textContent = 'Valor de referência' +
            (quando ? ', ' + quando : '') +
            '. O que vale é o total em real, confirmado com a equipe.';
        }
      } catch (e) { /* sem cotação, fala só em real */ }
    }

    montarLinkZap(conta);
  }

  /* ---------- o WhatsApp ---------- */

  function montarLinkZap(conta) {
    var numero = String(cfg.WHATSAPP || '559285904669').replace(/\D+/g, '');
    var dados = {};
    try { dados = (Area && Area.dados()) || {}; } catch (e) { dados = {}; }

    var linhas = ['Olá! Quero fechar este pedido:', ''];

    conta.itens.forEach(function (i) {
      linhas.push('• ' + i.quantidade + '× ' + i.nome + ' — ' + moeda(i.subtotal));
    });

    linhas.push('');
    linhas.push('Total: ' + moeda(conta.total));

    if (dados.nome) linhas.push('Nome: ' + dados.nome);
    if (dados.telefone) linhas.push('WhatsApp: ' + dados.telefone);
    if (dados.endereco) linhas.push('Entrega: ' + dados.endereco);

    var alvo = document.getElementById('fechar');
    alvo.href = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(linhas.join('\n'));
  }

  /* ---------- os botões ---------- */

  elItens.addEventListener('click', function (e) {
    var mais = e.target.closest('[data-mais]');
    var menos = e.target.closest('[data-menos]');
    var tirar = e.target.closest('[data-tirar]');

    if (mais) {
      var nome = mais.getAttribute('data-mais');
      C.trocarQuantidade(nome, quantidadeDe(nome) + 1);
      return pintar();
    }
    if (menos) {
      var n2 = menos.getAttribute('data-menos');
      C.trocarQuantidade(n2, quantidadeDe(n2) - 1);
      return pintar();
    }
    if (tirar) {
      C.tirar(tirar.getAttribute('data-tirar'));
      return pintar();
    }
  });

  function quantidadeDe(nome) {
    var achado = 1;
    C.itens().forEach(function (i) {
      if (i.nome.toLowerCase() === String(nome).toLowerCase()) achado = i.quantidade;
    });
    return achado;
  }

  document.getElementById('limpar').addEventListener('click', async function () {
    /* Pergunta antes: limpar o carrinho sem confirmar é o tipo de toque
       errado que faz a pessoa recomeçar a compra do zero.

       Usa a caixa do próprio site, e não o `confirm()` do navegador.
       Era `confirm()` aqui, e o comentário do modal.js já dizia por que
       isso é ruim: no celular ele aparece como uma caixa cinza do
       sistema, sem relação nenhuma com o site, mostrando o endereço da
       página. Na hora de apagar a compra da pessoa, é o pior momento
       possível para o site parecer outro. */
    var limpar = window.PharmaFitConfirmar
      ? await window.PharmaFitConfirmar({
          titulo: 'Tirar tudo do carrinho?',
          texto: 'Os produtos que você escolheu saem da lista. Dá para escolher de novo depois.',
          confirmar: 'Tirar tudo',
          cancelar: 'Deixar como está'
        })
      /* Se por algum motivo o modal do site não carregou, ainda
         pergunta — o que não pode é apagar sem perguntar. */
      : window.confirm('Tirar todos os itens do carrinho?');

    if (!limpar) return;
    C.limpar();
    pintar();
  });

  pintar();
})();
