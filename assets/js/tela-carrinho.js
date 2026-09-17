/* =========================================================
   PHARMA FIT — a tela do carrinho

   precisa: carrinho, minha-area, pedido

   O `pedido.js` entrou nesta lista em 17/09/2026: o botão "Fechar
   pedido no WhatsApp" passou a REGISTRAR o pedido, e quem sabe gravar
   pedido é aquele arquivo. Ele se anuncia em `window.PharmaFitPedido`,
   então tem de rodar antes deste.
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
         faixa cadastrada ela não aparece; hoje só o Tirzec Pen tem. */
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
    alvo.__conta = conta;
  }

  /* O PEDIDO DO CARRINHO PASSA A SER REGISTRADO.
   *
   * ACHADO EM 17/09/2026, medindo o caminho do dinheiro de ponta a
   * ponta: este botão abria o WhatsApp e NÃO gravava nada. O modal de
   * um produto grava (pedido pendente, que a equipe confirma na fila);
   * o carrinho não gravava. Dois caminhos de compra no mesmo site, um
   * com registro e outro sem.
   *
   * O que isso custava:
   *   · o pedido não entrava na "Fila de pedidos" do painel. Se a
   *     equipe perdesse a mensagem do WhatsApp, não havia rastro
   *     NENHUM de que alguém quis comprar;
   *   · nem aparecia em "Meus pedidos" do cliente;
   *   · e o carimbo do dono (`cliente_id`), que eu pus hoje justamente
   *     para os pedidos seguirem a pessoa de aparelho em aparelho, era
   *     pulado por inteiro nessa metade das compras.
   *
   * COMO FICOU, e por que assim:
   *
   *   · uma linha por produto, que é a forma da tabela e do painel —
   *     igual ao que o modal já faz;
   *   · `valor: 0`, decidido lá dentro do `pedido.js`: preço não vem do
   *     navegador de quem compra, quem põe é a equipe;
   *   · NÃO espero a resposta do banco. O link tem `target="_blank"`,
   *     então a página fica de pé e o pedido termina de subir sozinho.
   *     Esperar atrasaria o WhatsApp, e o WhatsApp é o que a pessoa
   *     está querendo abrir;
   *   · NÃO limpo o carrinho. Se o WhatsApp não abrir, a pessoa perderia
   *     a escolha dela sem ter comprado nada;
   *   · e uma trava para o toque duplo, só nesta visita: dois toques
   *     seguidos no mesmo carrinho não viram dois pedidos na fila. */
  var jaRegistrei = '';

  function registrarAoFechar(alvo) {
    alvo.addEventListener('click', function () {
      var conta = alvo.__conta;
      var Pedido = window.PharmaFitPedido;
      if (!conta || !conta.itens || !conta.itens.length || !Pedido) return;

      /* a assinatura do carrinho: mesmos itens e quantidades = mesmo
         pedido, e eu não registro de novo */
      var assinatura = conta.itens.map(function (i) {
        return i.nome + 'x' + i.quantidade;
      }).join('|');
      if (assinatura === jaRegistrei) return;
      jaRegistrei = assinatura;

      var dados = {};
      try { dados = (Area && Area.dados()) || {}; } catch (e) { dados = {}; }

      conta.itens.forEach(function (i) {
        Pedido.registrar({
          cliente: dados.nome || '',
          telefone: dados.telefone || '',
          endereco: dados.endereco || '',
          produto: i.nome,
          quantidade: i.quantidade
        }).catch(function () { /* o WhatsApp abre de todo jeito */ });

        /* e entra em "Meus pedidos" deste aparelho, como o modal faz */
        try {
          if (window.PharmaFitArea) {
            window.PharmaFitArea.registrarPedido({
              cliente: dados.nome || '', produto: i.nome,
              quantidade: i.quantidade, endereco: dados.endereco || ''
            });
          }
        } catch (e) {}
      });
    });
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

  /* Quando o banco responde (catalogo-banco.js), refaz a conta: o preço,
     a foto e o nome dos itens vêm do catálogo, e a equipe muda os três
     pelo painel. Sem isto, o carrinho continuaria somando o preço que
     estava no código quando a página abriu — e o total é o número que a
     pessoa leva para a conversa do WhatsApp. */
  document.addEventListener('pharmafit-catalogo', function () { pintar(); });
  registrarAoFechar(document.getElementById('fechar'));

})();
