/* =========================================================
   PHARMA FIT — a tela do carrinho

   precisa: carrinho, minha-area, pedido, cupom

   O `pedido.js` entrou nesta lista em 17/09/2026: o botão "Fechar
   pedido no WhatsApp" passou a REGISTRAR o pedido, e quem sabe gravar
   pedido é aquele arquivo. Ele se anuncia em `window.PharmaFitPedido`,
   então tem de rodar antes deste.

   O `cupom.js` entrou em 24/09/2026, com o cupom de desconto: o total
   do resumo, a mensagem do WhatsApp e o pedido gravado passam a levar
   o cupom, e quem sabe perguntar ao banco se um código vale é ele.
   ========================================================= */
(function () {
  'use strict';

  var C = window.PharmaFitCarrinho;
  var Moedas = window.PharmaFitMoedas;
  var Area = window.PharmaFitArea;
  var Cupom = window.PharmaFitCupom;
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

  /* ---------- para quem e para onde ----------
   *
   * Os três campos que o carrinho não tinha. O que eles resolvem está
   * escrito no `carrinho.html`, em cima do formulário.
   *
   * O formulário é a FONTE do nome, do WhatsApp e do endereço nesta
   * tela. O aparelho (e a conta, quando existe) só serve para PREENCHER
   * — quem digitou por último é quem manda, porque a pessoa pode estar
   * comprando para outro endereço hoje. */
  var form = document.getElementById('form-contato');
  var cNome = document.getElementById('ct-nome');
  var cZap = document.getElementById('ct-zap');
  var cEndereco = document.getElementById('ct-endereco');

  function valorDe(campo) {
    return campo ? String(campo.value || '').trim() : '';
  }

  /* ---------- PEDIR OS DADOS DEPOIS DO TOQUE ----------
   *
   * Brian, 22/09/2026: "Deixe pra colocar essas informacoes aqui depois de
   * ja ter clicar pra pagar". O formulário nasce escondido no HTML, e é
   * este pedaço que o mostra.
   *
   * Quem manda nisso é este arquivo, e não os dois botões, porque são DOIS
   * caminhos usando o mesmo formulário: o WhatsApp (aqui) e o PIX
   * (`pagamento.js`). Duas cópias da mesma revelação divergiriam na
   * primeira mudança — é a doença que eu passei dias consertando neste
   * site. Então fica num lugar só e os dois pedem emprestado.
   *
   * O PRIMEIRO TOQUE NÃO PINTA ERRO. Abrir o formulário já cheio de
   * vermelho, sem a pessoa ter digitado nada, é o que ele viu na foto e
   * não gostou — com razão. O primeiro toque mostra os campos e leva o
   * dedo ao primeiro vazio; o segundo, aí sim, cobra o que falta. */
  var Validacao = window.PharmaFitValidacao;

  function primeiroVazio() {
    var campos = [cNome, cZap, cEndereco];
    for (var i = 0; i < campos.length; i++) {
      if (campos[i] && !valorDe(campos[i])) return campos[i];
    }
    return null;
  }

  /** true = os dados estão completos, pode seguir.
   *  false = a tela pediu o que falta, e quem chamou deve parar. */
  function pedirDados() {
    if (!form) return true;

    /* Já está tudo lá? Então não mostra nada e deixa passar. Quem comprou
       antes tem os campos preenchidos pelo aparelho, e para essa pessoa o
       toque continua valendo de uma vez. */
    if (!primeiroVazio()) {
      return Validacao ? Validacao.conferir(form) : true;
    }

    var vazio = primeiroVazio();
    if (form.hidden) {
      form.hidden = false;
      try { form.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      try { vazio.focus({ preventScroll: true }); } catch (e) { vazio.focus(); }
      return false;
    }

    /* segundo toque com campo vazio: agora o recado em vermelho */
    if (Validacao) Validacao.conferir(form);
    try { vazio.focus({ preventScroll: true }); } catch (e) { vazio.focus(); }
    return false;
  }

  window.PharmaFitContato = { pedir: pedirDados };

  function contato() {
    if (!form) {
      /* sem formulário na tela, vale o que está guardado */
      try { return (Area && Area.dados()) || {}; } catch (e) { return {}; }
    }
    return {
      nome: valorDe(cNome),
      telefone: valorDe(cZap),
      endereco: valorDe(cEndereco)
    };
  }

  /* Preenche o que está VAZIO, e só isso.
   *
   * Isto roda duas vezes: quando a página abre e de novo quando o
   * cadastro desce da conta (`pharmafit-meus-dados`), que chega depois,
   * pela internet. Se eu escrevesse em cima de tudo, a segunda passada
   * apagaria o endereço que a pessoa já começou a digitar enquanto a
   * conta respondia — o dedo perde para a rede, e a pessoa não entende
   * por que o campo mudou sozinho. */
  function preencherContato() {
    if (!form) return;
    var dados = {};
    try { dados = (Area && Area.dados()) || {}; } catch (e) { dados = {}; }

    if (cNome && !cNome.value && dados.nome) cNome.value = dados.nome;
    if (cZap && !cZap.value && dados.telefone) {
      cZap.value = window.PharmaFitValidacao
        ? window.PharmaFitValidacao.mascaraTelefone(dados.telefone)
        : dados.telefone;
    }
    if (cEndereco && !cEndereco.value && dados.endereco) cEndereco.value = dados.endereco;
  }

  /* ---------- desenhar ---------- */

  async function pintar() {
    var conta = C.conta();

    /* A FRASE DO TOPO SOME QUANDO O CARRINHO ESTÁ VAZIO.
       Ela dizia "Escolha os produtos e eles aparecem aqui." — a MESMA
       frase, palavra por palavra, que o bloco de vazio diz dois dedos
       abaixo, com o desenho e o botão. Duas vezes o mesmo texto na
       mesma tela parece erro de montagem. */
    var lead = document.getElementById('carrinho-lead');
    lead.textContent = 'O que você escolheu até agora.';
    lead.hidden = !conta.itens.length;

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

    /* O AVISO DE "ENVIADO" NÃO SOBREVIVE A UMA MUDANÇA NO CARRINHO.
       Se a pessoa tirou um produto ou mexeu na quantidade depois de
       fechar, aquele "pedido enviado" passou a falar de um carrinho que
       não está mais na tela — e ficaria em cima da lista nova dizendo
       que ela já foi. */
    if (elEnviado && !elEnviado.hidden && assinaturaDo(conta) !== enviado) {
      elEnviado.hidden = true;
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
      /* A FRASE DA FAIXA VIROU UMA LINHA, NÃO UMA CAIXA VERDE.
         Ela era um retângulo verde de três linhas dentro da linha do
         produto — a coisa mais colorida da tela, gritando mais que o
         preço e que o botão de fechar o pedido. Continua dizendo a
         mesma coisa, agora como uma linha discreta com uma etiqueta
         dourada na frente.
         Só existe quando há faixa de atacado e falta pouco para a
         próxima; hoje só o Tirzec Pen tem faixa. */
      var faixa = '';
      if (i.proxima && i.faltam > 0) {
        faixa = '<p class="carrinho__faixa">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M20.6 13.4 13 21a2 2 0 0 1-2.8 0L3 13.8V3h10.8l6.8 6.8a2 2 0 0 1 0 2.8z"/>' +
          '<circle cx="8.2" cy="8.2" r="1.4"/></svg>' +
          '<span>Levando ' + i.faltam +
          (i.faltam === 1 ? ' unidade a mais' : ' unidades a mais') +
          ', cada uma sai por ' + moeda(i.proxima.preco) + '.</span></p>';
      }

      /* A LINHA DO PRODUTO É UMA GRADE, E NÃO TRÊS CAIXAS EM FILA.
       *
       * Em fila, a coluna do preço não tinha para onde ir: "R$ 2.198,00"
       * em 19px pedia 112px e não encolhe (é um número, não dá
       * para quebrar), então ele e o "tirar" saíam pela borda direita da
       * tela num celular de 390 — está na foto que o Brian mandou, com o
       * preço cortado no meio.
       *
       * São DUAS colunas: a foto (64px) e o resto, que encolhe
       * (`minmax(0,1fr)`). A quantidade e o preço descem para um rodapé
       * próprio da linha, onde um fica na esquerda e o outro na
       * direita, sem disputar coluna com o nome.
       *
       * Eu tinha feito com três colunas, e a terceira ficava do
       * tamanho do maior conteúdo dela — o preço, 112px — inclusive na
       * linha de cima, onde só tem o ×. A coluna do nome caía para
       * 52px num celular de 320. Contar a largura antes de desenhar é
       * o que evita esse tipo de coisa.
       *
       * O "tirar" escrito virou um × no canto: tirar item é a única
       * ação destrutiva da tela e ela estava na mesma coluna do preço,
       * disputando espaço com o número que importa. */
      return '<div class="carrinho__item" data-linha="' + esc(i.nome) + '">' +
        /* `data-fundo-da-foto` na própria miniatura: ela é a <img> e
           tem fundo creme com 6px de respiro, então com foto de fundo
           branco sobrava um anel creme em volta — a mesma borda de que
           ele reclamou na vitrine (19/09/2026). Quem pinta é o
           `PharmaFitFundoDaFoto`, do catalogo.js. */
        '<img class="carrinho__foto" src="' + esc(i.produto.imagem) + '" alt="" loading="lazy"' +
          (i.produto.fotoDeVerdade ? ' data-fundo-da-foto' : '') + '>' +

        '<h2 class="carrinho__nome">' + esc(i.nome) + '</h2>' +

        '<button class="carrinho__tirar" type="button" data-tirar="' + esc(i.nome) + '" ' +
          'aria-label="Tirar do carrinho">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
          '<path d="m6 6 12 12M18 6 6 18"/></svg>' +
        '</button>' +

        '<div class="carrinho__meta">' +
          '<p class="carrinho__unidade">' + esc(i.produto.categoria || '') + '</p>' +
          faixa +
        '</div>' +

        '<div class="carrinho__pe">' +

        '<div class="carrinho__quantidade">' +
          '<button class="carrinho__qbtn" type="button" data-menos="' + esc(i.nome) + '" ' +
            'aria-label="Tirar um"' + (i.quantidade <= 1 ? ' disabled' : '') + '>' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>' +
          '</button>' +
          '<span class="carrinho__qnum" data-qtd>' + i.quantidade + '</span>' +
          '<button class="carrinho__qbtn" type="button" data-mais="' + esc(i.nome) + '" ' +
            'aria-label="Pôr um a mais">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>' +
          '</button>' +
        '</div>' +

        '<div class="carrinho__lado">' +
          '<p class="carrinho__subtotal">' + moeda(i.subtotal) + '</p>' +
          (i.quantidade > 1
            ? '<p class="carrinho__cada">' + moeda(i.preco) + ' cada</p>'
            : '') +
        '</div>' +

        '</div>' +
      '</div>';
    }).join('');
    /* as miniaturas acabaram de nascer: cada moldura de FOTO toma a cor
       do fundo dela, para não sobrar o anel creme em volta (19/09/2026) */
    if (window.PharmaFitFundoDaFoto) window.PharmaFitFundoDaFoto(elItens);

    /* ---------- o resumo ---------- */

    document.getElementById('resumo-qtd').textContent =
      conta.unidades + (conta.unidades === 1 ? ' item' : ' itens');
    document.getElementById('resumo-soma').textContent = moeda(conta.total);

    /* O CUPOM, quando há um. O desconto sai do total dos produtos e o
       resumo mostra as duas coisas — o que custaria e o que sai —, que é
       o que faz a pessoa ver o cupom funcionando. */
    var cupom = Cupom ? Cupom.atual() : null;
    var desconto = cupom ? Cupom.desconto(conta.total, cupom) : 0;
    conta.cupom = cupom;
    conta.desconto = desconto;
    conta.aPagar = Math.max(0, Math.round((conta.total - desconto) * 100) / 100);

    var linhaDesconto = document.getElementById('resumo-desconto-linha');
    var formCupom = document.getElementById('cupom-form');
    if (linhaDesconto) {
      linhaDesconto.hidden = !cupom;
      if (cupom) {
        document.getElementById('resumo-cupom-codigo').textContent =
          cupom.codigo + ' (' + Cupom.rotulo(cupom) + ')';
        document.getElementById('resumo-desconto').textContent = '− ' + moeda(desconto);
      }
    }
    /* com cupom aplicado, o campo de digitar sai: um cupom por pedido */
    if (formCupom) formCupom.hidden = !!cupom;

    document.getElementById('resumo-total').textContent = moeda(conta.aPagar);

    /* As outras moedas, só se houver cotação. */
    var caixaMoedas = document.getElementById('resumo-moedas');
    var linhaCotacao = document.getElementById('resumo-cotacao');
    caixaMoedas.hidden = true;
    linhaCotacao.hidden = true;

    if (Moedas) {
      try {
        var outras = await Moedas.converter(conta.aPagar);
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
    var dados = contato();

    var linhas = ['Olá! Quero fechar este pedido:', ''];

    conta.itens.forEach(function (i) {
      linhas.push('• ' + i.quantidade + '× ' + i.nome + ' — ' + moeda(i.subtotal));
    });

    linhas.push('');
    if (conta.cupom && conta.desconto) {
      linhas.push('Subtotal: ' + moeda(conta.total));
      linhas.push('Cupom ' + conta.cupom.codigo + ' (' + Cupom.rotulo(conta.cupom) + '): − ' +
                  moeda(conta.desconto));
      linhas.push('Total: ' + moeda(conta.aPagar));
    } else {
      linhas.push('Total: ' + moeda(conta.total));
    }

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
    alvo.addEventListener('click', function (e) {
      var conta = alvo.__conta;
      var Pedido = window.PharmaFitPedido;

      /* PRIMEIRO A CHECAGEM, DEPOIS O WHATSAPP.
       *
       * Se faltar nome, WhatsApp ou endereço, o link NÃO abre: o recado
       * aparece embaixo do campo e o dedo volta para lá. É o mesmo que o
       * modal de um produto faz há meses.
       *
       * Abrir o WhatsApp de todo jeito seria pior do que parece: a
       * conversa começaria sem nome nem telefone, o pedido entraria na
       * fila anônimo, e a pessoa acharia que está tudo certo. Barrar
       * aqui é a única hora em que dá para pedir o que falta. */
      if (!pedirDados()) {
        e.preventDefault();
        return;
      }

      var dados = contato();

      /* O LINK É REFEITO AGORA, com o que está escrito nos campos.
         Ele já se refaz a cada tecla, mas refazer aqui é o que garante
         que a mensagem que abre é a da última letra digitada — inclusive
         quando o teclado do celular termina a palavra depois do toque. */
      if (conta) montarLinkZap(conta);

      /* guarda no aparelho para a próxima compra e para "Meus pedidos",
         e sobe para a conta quando existe conta — igual ao modal */
      try { if (Area) Area.salvarDados(dados); } catch (err) {}
      if (window.PharmaFitConta && window.PharmaFitConta.salvarCadastro) {
        window.PharmaFitConta.salvarCadastro({
          nome: dados.nome, telefone: dados.telefone, endereco: dados.endereco
        }).catch(function () {});
      }

      /* A TELA CONTA O QUE ACABOU DE FAZER.
         Vem antes do registro de propósito: o recado é sobre o pedido
         ter SAÍDO daqui (o WhatsApp está abrindo), e não sobre o banco
         ter respondido — a resposta do banco chega depois e a pessoa
         não fica esperando por ela. O porquê deste bloco existir está
         no `carrinho.html`, em cima dele. */
      avisarEnviado();

      if (!conta || !conta.itens || !conta.itens.length || !Pedido) return;

      /* mesmos itens e quantidades = mesmo pedido, e eu não registro
         de novo */
      var assinatura = assinaturaDo(conta);
      if (assinatura === jaRegistrei) return;
      jaRegistrei = assinatura;

      conta.itens.forEach(function (i) {
        Pedido.registrar({
          cliente: dados.nome || '',
          telefone: dados.telefone || '',
          endereco: dados.endereco || '',
          produto: i.nome,
          quantidade: i.quantidade,
          /* o código vai em cada linha do pedido, para a equipe ver o
             cupom no painel ao confirmar o valor */
          cupom: conta.cupom ? conta.cupom.codigo : ''
        }).catch(function () { /* o WhatsApp abre de todo jeito */ });

        /* e entra em "Meus pedidos" deste aparelho, como o modal faz */
        try {
          if (window.PharmaFitArea) {
            window.PharmaFitArea.registrarPedido({
              cliente: dados.nome || '', produto: i.nome,
              quantidade: i.quantidade, endereco: dados.endereco || ''
            });
          }
        } catch (e2) {}
      });
    });
  }

  /* ---------- "pedido enviado" ---------- */

  var elEnviado = document.getElementById('enviado');
  var enviado = '';

  /* A IDENTIDADE DE UM CARRINHO: os mesmos produtos nas mesmas
     quantidades. Serve para duas coisas que precisam concordar — não
     registrar o mesmo pedido duas vezes e não deixar o aviso de
     "enviado" pendurado num carrinho que a pessoa mudou depois. */
  function assinaturaDo(conta) {
    return (conta && conta.cupom ? conta.cupom.codigo + '|' : '') +
      (conta && conta.itens ? conta.itens : []).map(function (i) {
      return i.nome + 'x' + i.quantidade;
    }).join('|');
  }

  function avisarEnviado() {
    if (!elEnviado) return;
    try { enviado = assinaturaDo(C.conta()); } catch (e) { enviado = ''; }
    elEnviado.hidden = false;
    /* rola até ele quando ficou fora da vista: o botão de fechar o
       pedido está no fim da página e o aviso nasce em cima da lista,
       então em celular ele podia aparecer onde ninguém está olhando */
    try {
      var r = elEnviado.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        elEnviado.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    } catch (e) {}
  }

  if (elEnviado) {
    document.getElementById('enviado-limpar').addEventListener('click', function () {
      /* SEM PERGUNTAR DE NOVO, e aqui isso é diferente do outro botão:
         este aparece DEPOIS de o pedido sair, e é a resposta a um
         convite que a própria tela fez. O "Limpar o carrinho" lá
         embaixo continua perguntando, porque lá o toque pode ser
         engano e apagaria uma compra que ninguém fechou. */
      C.limpar();
      elEnviado.hidden = true;
      pintar();
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

  /* ---------- o cupom ---------- */

  var formCupom = document.getElementById('cupom-form');
  var campoCupom = document.getElementById('cupom-codigo');
  var recadoCupom = document.getElementById('cupom-recado');
  var botaoCupom = document.getElementById('cupom-aplicar');

  function recado(texto, bom) {
    if (!recadoCupom) return;
    recadoCupom.hidden = !texto;
    recadoCupom.className = 'cupom__recado' + (bom ? ' cupom__recado--ok' : ' cupom__recado--erro');
    recadoCupom.textContent = texto || '';
  }

  if (Cupom && formCupom) {
    formCupom.addEventListener('submit', async function (e) {
      e.preventDefault();
      botaoCupom.disabled = true;
      botaoCupom.textContent = 'Conferindo…';
      var r = await Cupom.aplicar(campoCupom.value);
      botaoCupom.disabled = false;
      botaoCupom.textContent = 'Aplicar';
      if (!r.ok) {
        recado(r.erro, false);
        campoCupom.focus();
        return;
      }
      campoCupom.value = '';
      recado('Cupom ' + r.cupom.codigo + ' aplicado: ' + Cupom.rotulo(r.cupom) + ' de desconto.', true);
      pintar();
    });

    document.getElementById('cupom-tirar').addEventListener('click', function () {
      Cupom.remover();
      recado('', true);
      pintar();
      campoCupom.focus();
    });

    /* O cupom guardado é conferido de novo a cada visita: a equipe pode
       ter desligado, ou ele pode ter vencido desde que a pessoa aplicou. */
    Cupom.reconferir().then(function (r) {
      if (r && r.saiu) {
        recado('O cupom ' + r.saiu + ' não vale mais e saiu do seu pedido.', false);
      }
      if (r && r.mudou) pintar();
    });
  }

  /* ---------- o formulário de contato, ligado ---------- */

  if (form) {
    preencherContato();

    /* O cadastro da conta chega depois, pela internet. Quando chega, o
       `minha-area.js` avisa, e aqui a gente preenche o que ainda está
       vazio (nunca o que a pessoa já digitou). */
    document.addEventListener('pharmafit-meus-dados', preencherContato);

    /* A mensagem do WhatsApp acompanha o que está escrito. Sem isto, o
       link guardaria o nome que existia quando a tela abriu — e quem
       toca e segura o botão no celular para "copiar o link" levaria a
       mensagem velha. */
    form.addEventListener('input', function () {
      var alvo = document.getElementById('fechar');
      if (alvo && alvo.__conta) montarLinkZap(alvo.__conta);
    });

    /* ENTER NÃO PODE RECARREGAR A PÁGINA.
       Um `<form>` sem botão de enviar ainda envia sozinho quando alguém
       aperta Enter dentro de um campo — e enviar aqui significaria
       recarregar `carrinho.html` com `?ct-nome=...` na barra de endereço,
       perdendo o que foi digitado e pondo o telefone da pessoa no
       histórico do navegador. */
    form.addEventListener('submit', function (e) { e.preventDefault(); });
  }

})();
