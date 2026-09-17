/* =========================================================
   PHARMA FIT — pedido pelo site

   O cliente escolhe o produto, deixa nome e WhatsApp e é
   levado para a conversa com a mensagem pronta. O pedido fica
   registrado como PENDENTE e aparece no painel de gestão para
   a equipe confirmar depois de fechar a venda no WhatsApp.

   Sem Supabase configurado, o pedido é guardado neste
   navegador (modo demonstração) — o painel lê do mesmo lugar.

   precisa: nuvem, minha-area, conta

   Esta linha é lida por `conferir-scripts.mjs`, e ela existe porque o
   `conta.js` estava em 4 das 16 páginas enquanto este arquivo estava
   em todas: o pedido nascia sem dono em 12 delas, calado. A ordem
   também conta — os três se anunciam em `window.…` e têm de rodar
   antes deste.
   ========================================================= */
(function () {
  'use strict';

  var cfg = window.PHARMAFIT_CONFIG || {};
  var Nuvem = window.PharmaFitNuvem;

  /** Grava o pedido como pendente, para a equipe confirmar depois. */
  async function registrarPedido(pedido) {
    var registro = {
      cliente: pedido.cliente,
      telefone: pedido.telefone,
      endereco: pedido.endereco,
      produto: pedido.produto,
      quantidade: Number(pedido.quantidade || 1),
      valor: 0,
      status: 'pendente',
      origem: 'site'
    };

    /* DE QUEM É O PEDIDO, quando a pessoa está logada.
     *
     * Sem isto, "Meus pedidos" só mostra o que está guardado NESTE
     * navegador: a pessoa compra no celular e não acha o pedido no
     * computador. A coluna `cliente_id` entrou no banco hoje, e a regra
     * de lá exige que, havendo conta, o dono seja quem está enviando —
     * ninguém carimba pedido no nome de outro.
     *
     * Quem compra SEM conta continua comprando: o campo vai vazio, que é
     * o que a regra do banco permite.
     *
     * O telefone NÃO serve para isso, e é por isso que existe a coluna:
     * o telefone fica no cadastro que a própria pessoa edita, então
     * qualquer um trocaria pelo telefone de outro e leria os pedidos do
     * outro. Já está provado no banco que esse caminho está fechado. */
    try {
      var Conta = window.PharmaFitConta;
      var u = Conta ? await Conta.usuario() : null;
      if (u && u.id) registro.cliente_id = u.id;
    } catch (e) { /* sem conta, o pedido nasce sem dono */ }

    return Nuvem.inserir('pedidos', registro);
  }

  /* ---------- interface ---------- */

  /* Catálogo padrão, completado com o que estiver na página atual,
     para que a lista seja a mesma no site inteiro. */
  function produtosDoSite() {
    var nomes = (window.PHARMAFIT_CATALOGO || [])
      .filter(function (p) { return !p.foraDoSite; })
      .map(function (p) { return p.nome; });
    document.querySelectorAll('.product__name, .protocol__name').forEach(function (el) {
      var nome = el.textContent.trim();
      if (nome && nomes.indexOf(nome) === -1) nomes.push(nome);
    });
    return nomes;
  }

  function montarModal() {
    var opcoes = produtosDoSite().map(function (n) {
      return '<option value="' + n.replace(/"/g, '&quot;') + '">' + n + '</option>';
    }).join('');

    var html = '' +
      '<div class="modal" id="modal-atendimento" role="dialog" aria-modal="true" aria-label="Solicitar atendimento">' +
        '<div class="modal__scrim" data-fechar-pedido></div>' +
        '<form class="modal__card" id="form-atendimento" novalidate>' +
          '<div class="modal__head">' +
            '<h2 class="modal__title">Quero meu atendimento</h2>' +
            '<button class="icon-btn icon-btn--bare" type="button" data-fechar-pedido aria-label="Fechar">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="resumo-produto" id="pd-resumo" hidden></div>' +
          '<p class="modal__lead">Deixe seus dados e continue no WhatsApp. ' +
            'Confirmamos tudo por lá antes de separar o pedido.</p>' +
          '<div class="field">' +
            '<label class="field__label" for="pd-nome">Seu nome</label>' +
            '<div class="field__box"><input type="text" id="pd-nome" placeholder="Nome completo" ' +
              'autocomplete="name" data-valida="obrigatorio" data-rotulo="seu nome" required></div>' +
          '</div>' +
          '<div class="field">' +
            '<label class="field__label" for="pd-zap">Seu WhatsApp</label>' +
            '<div class="field__box"><input type="tel" id="pd-zap" placeholder="(92) 99999-9999" ' +
              'autocomplete="tel" data-valida="obrigatorio telefone" data-rotulo="seu WhatsApp" required></div>' +
          '</div>' +
          '<div class="field">' +
            '<label class="field__label" for="pd-produto">Produto de interesse</label>' +
            '<div class="field__box"><select id="pd-produto">' + opcoes + '</select></div>' +
          '</div>' +
          '<div class="field">' +
            '<label class="field__label" for="pd-qtd">Quantidade</label>' +
            '<div class="field__box"><input type="number" id="pd-qtd" min="1" max="99" step="1" ' +
              'inputmode="numeric" value="1"></div>' +
          '</div>' +
          '<div class="field">' +
            '<label class="field__label" for="pd-endereco">Endereço de entrega</label>' +
            '<div class="field__box"><textarea id="pd-endereco" rows="2" autocomplete="street-address" ' +
              'placeholder="Rua, número, bairro e complemento" data-valida="obrigatorio" ' +
              'data-rotulo="o endereço de entrega" required></textarea></div>' +
          '</div>' +
          '<div class="modal__acoes">' +
            '<button class="btn btn--primary btn--block" type="submit" id="pd-enviar">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
                '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.8l-.3-.2-2.6.7.7-2.5-.2-.3A8 8 0 0 1 12 4zm4.3 10.1c-.2-.1-1.3-.7-1.5-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5 0a6.5 6.5 0 0 1-1.9-1.2 7.2 7.2 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11 11 0 0 0 4.3 3.8c1.5.6 2.1.7 2.8.6a2.4 2.4 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1z"/>' +
              '</svg>' +
              'Continuar no WhatsApp' +
            '</button>' +
          '</div>' +
          '<p class="modal__lead" style="margin:0;text-align:center">Atendimento em Manaus · AM 🇧🇷</p>' +
        '</form>' +

        '<div class="modal__card" id="pd-sucesso" hidden>' +
          '<div class="modal__head">' +
            '<h2 class="modal__title">Pedido registrado</h2>' +
            '<button class="icon-btn icon-btn--bare" type="button" data-fechar-pedido aria-label="Fechar">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
            '</button>' +
          '</div>' +

          '<p class="sucesso__marca" aria-hidden="true">' +
            '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>' +
          '</p>' +

          '<p class="modal__lead" id="pd-sucesso-texto"></p>' +
          '<div class="resumo-produto" id="pd-sucesso-resumo" hidden></div>' +

          '<p class="sucesso__aviso">Falta o último passo: mande a mensagem para a equipe. ' +
            'O pedido só é fechado depois que a gente confirma com você no WhatsApp.</p>' +

          '<div class="modal__acoes modal__acoes--empilha">' +
            '<a class="btn btn--primary btn--block" id="pd-abrir-zap" target="_blank" rel="noopener">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
                '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.8l-.3-.2-2.6.7.7-2.5-.2-.3A8 8 0 0 1 12 4zm4.3 10.1c-.2-.1-1.3-.7-1.5-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5 0a6.5 6.5 0 0 1-1.9-1.2 7.2 7.2 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11 11 0 0 0 4.3 3.8c1.5.6 2.1.7 2.8.6a2.4 2.4 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1z"/>' +
              '</svg>' +
              'Abrir conversa no WhatsApp' +
            '</a>' +
            '<a class="linkish" href="pedidos.html">Ver meus pedidos</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="toast" id="toast-site" role="status"></div>';

    document.body.insertAdjacentHTML('beforeend', html);
  }

  function toast(msg) {
    var el = document.getElementById('toast-site');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 4000);
  }

  /** Mostra o que a pessoa escolheu: foto, preço e parcelas. */
  function pintarResumo(nome) {
    var caixa = document.getElementById('pd-resumo');
    var Preco = window.PharmaFitPreco;
    var item = (window.PHARMAFIT_CATALOGO || []).filter(function (p) { return p.nome === nome; })[0];

    if (!item || !Preco) { caixa.hidden = true; return; }

    var desconto = Preco.desconto(item.antes, item.venda);
    caixa.hidden = false;
    caixa.innerHTML =
      '<img src="' + item.imagem + '" alt="">' +
      '<div>' +
        '<p class="resumo-produto__nome">' + item.nome + '</p>' +
        (item.antes
          ? '<p class="product__antes"><s>' + Preco.formatar(item.antes) + '</s>' +
            (desconto ? '<span class="selo-off">-' + desconto + '%</span>' : '') + '</p>'
          : '') +
        '<p class="product__price">' + Preco.formatar(item.venda) + '</p>' +
        '<p class="product__installment">' + Preco.textoParcelas(item.venda) + '</p>' +
      '</div>';
  }

  function abrir(produto, quantidade) {
    var modal = document.getElementById('modal-atendimento');
    modal.classList.add('is-open');
    pintarResumo(produto);

    if (window.PharmaFitArea) {
      var meus = window.PharmaFitArea.dados();
      if (meus.nome && !document.getElementById('pd-nome').value) {
        document.getElementById('pd-nome').value = meus.nome;
        document.getElementById('pd-zap').value = meus.telefone;
        document.getElementById('pd-endereco').value = meus.endereco;
      }
    }
    if (produto) {
      var select = document.getElementById('pd-produto');
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === produto) { select.selectedIndex = i; break; }
      }
    }
    if (Number(quantidade) > 1) document.getElementById('pd-qtd').value = Number(quantidade);
    setTimeout(function () { document.getElementById('pd-nome').focus(); }, 80);
  }

  function ligarTrocaDeProduto() {
    var select = document.getElementById('pd-produto');
    if (select) select.addEventListener('change', function () { pintarResumo(select.value); });
  }

  function fechar() {
    document.getElementById('modal-atendimento').classList.remove('is-open');
    /* volta para o formulário, para a próxima abertura começar do começo */
    setTimeout(function () {
      var form = document.getElementById('form-atendimento');
      var ok = document.getElementById('pd-sucesso');
      if (form && ok) { form.hidden = false; ok.hidden = true; }
    }, 260);
  }

  /**
   * Confirmação depois de enviar. Existe porque abrir o WhatsApp
   * sozinho não é confiável: no iPhone o navegador bloqueia a
   * janela nova quando ela vem depois de uma espera, e a pessoa
   * ficava sem saber se o pedido tinha ido. Aqui ela vê que deu
   * certo e toca no link quando quiser.
   */
  function mostrarSucesso(dados) {
    var form = document.getElementById('form-atendimento');
    var caixa = document.getElementById('pd-sucesso');

    var primeiro = String(dados.nome || '').trim().split(' ')[0];
    document.getElementById('pd-sucesso-texto').textContent = dados.salvou
      ? 'Tudo certo, ' + primeiro + '. Já anotamos seu pedido de ' + dados.produto + '.'
      : 'Anotamos seu pedido de ' + dados.produto + ' aqui no aparelho. ' +
        'Mande a mensagem para a equipe receber.';

    var resumo = document.getElementById('pd-sucesso-resumo');
    var origem = document.getElementById('pd-resumo');
    if (origem && !origem.hidden) {
      resumo.innerHTML = origem.innerHTML;
      resumo.hidden = false;
    } else {
      resumo.hidden = true;
    }

    var botao = document.getElementById('pd-abrir-zap');
    if (dados.link) {
      botao.href = dados.link;
      botao.hidden = false;
    } else {
      botao.hidden = true;
    }

    form.hidden = true;
    caixa.hidden = false;
    caixa.scrollTop = 0;

    /* no computador a janela nova costuma passar; no celular o
       botão acima resolve */
    if (dados.link) {
      try { window.open(dados.link, '_blank', 'noopener'); } catch (e) {}
    }
  }

  function linkWhatsApp(dados) {
    var numero = String(cfg.WHATSAPP || '').replace(/\D/g, '');
    if (!numero) return null;

    var texto = 'Olá! Sou ' + dados.cliente + ' e fiz um pedido pelo site da Pharma Fit.' +
      '\n\nProduto: ' + dados.produto +
      '\nQuantidade: ' + dados.quantidade +
      '\nEntrega: ' + dados.endereco;

    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  /* ---------- ligação com a página ---------- */

  /** Deixa clicáveis os links marcados com data-zap-link. */
  function ligarLinksDoZap() {
    var numero = String(cfg.WHATSAPP || '').replace(/\D/g, '');
    if (!numero) return;

    var texto = 'Olá! Vim pelo site da Pharma Fit e gostaria de atendimento.';
    document.querySelectorAll('[data-zap-link]').forEach(function (el) {
      el.href = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
      el.target = '_blank';
      el.rel = 'noopener';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    montarModal();
    ligarLinksDoZap();
    ligarTrocaDeProduto();
    window.PharmaFitValidacao.ligar(document.getElementById('modal-atendimento'));

    document.addEventListener('click', function (e) {
      var gatilho = e.target.closest('[data-pedido]');
      if (gatilho) {
        e.preventDefault();
        var card = gatilho.closest('.product, .protocol');
        var nomeProduto = gatilho.getAttribute('data-pedido') ||
          (card && card.querySelector('.product__name, .protocol__name')
            ? card.querySelector('.product__name, .protocol__name').textContent.trim()
            : '');
        abrir(nomeProduto, gatilho.getAttribute('data-quantidade'));
        return;
      }
      if (e.target.closest('[data-fechar-pedido]')) fechar();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fechar();
    });

    document.getElementById('form-atendimento').addEventListener('submit', async function (e) {
      e.preventDefault();

      var nome = document.getElementById('pd-nome').value.trim();
      var zap = document.getElementById('pd-zap').value.trim();
      var endereco = document.getElementById('pd-endereco').value.trim();
      var quantidade = Number(document.getElementById('pd-qtd').value || 1);
      var produto = document.getElementById('pd-produto').value;
      var botao = document.getElementById('pd-enviar');

      if (!window.PharmaFitValidacao.conferir(document.getElementById('form-atendimento'))) return;

      botao.disabled = true;
      var r = await registrarPedido({
        cliente: nome, telefone: zap, endereco: endereco,
        produto: produto, quantidade: quantidade
      });
      botao.disabled = false;

      /* guarda no aparelho para "Meus pedidos" e para preencher da próxima vez */
      if (window.PharmaFitArea) {
        window.PharmaFitArea.salvarDados({ nome: nome, telefone: zap, endereco: endereco });
        window.PharmaFitArea.registrarPedido({
          cliente: nome, produto: produto, quantidade: quantidade, endereco: endereco
        });
      }

      /* E SOBE PARA A CONTA, quando existe conta.
       *
       * Desde 17/09/2026 o pedido é o ÚNICO lugar onde a pessoa digita
       * nome, WhatsApp e endereço — a tela "Meus dados" saiu da Conta.
       * Sem esta linha havia um defeito silencioso: o endereço novo
       * ficava só no navegador, e na abertura seguinte a sincronização
       * (que dá razão à conta) o trocaria pelo endereço ANTIGO. A
       * pessoa mudou de casa, comprou no endereço certo, e o site
       * voltaria a mostrar o velho sem nenhum erro na tela.
       *
       * Vai depois do pedido já estar registrado e sem `await` na
       * frente do que o cliente vê: se falhar, o pedido está feito e a
       * tela de sucesso aparece igual. */
      if (window.PharmaFitConta && window.PharmaFitConta.salvarCadastro) {
        window.PharmaFitConta
          .salvarCadastro({ nome: nome, telefone: zap, endereco: endereco })
          .catch(function () {});
      }

      var link = linkWhatsApp({
        cliente: nome, produto: produto, quantidade: quantidade, endereco: endereco
      });

      mostrarSucesso({ nome: nome, produto: produto, link: link, salvou: r.ok });
    });
  });
})();
