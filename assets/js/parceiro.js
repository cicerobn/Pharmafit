/* =========================================================
   PHARMA FIT — área do parceiro

   O representante aprovado recebe o link desta página no
   WhatsApp (o painel gera o link com o nome dele). Aqui ele
   monta o pedido inteiro de uma vez, escolhendo a quantidade
   de cada produto, em vez de mandar item por item.

   O pedido chega no painel como orçamento, marcado como
   parceiro. Valor de parceiro não é combinado por aqui: quem
   fecha é a equipe, no WhatsApp.
   ========================================================= */
(function () {
  'use strict';

  var Preco = window.PharmaFitPreco;
  var Formularios = window.PharmaFitFormularios;

  var carrinho = {}; /* nome do produto -> quantidade */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg) {
    var el = document.getElementById('toast-site');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-site';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 3600);
  }

  function produtos() {
    return (window.PHARMAFIT_CATALOGO || []).filter(function (p) { return !p.foraDoSite; });
  }

  /* ---------- saudação com o nome que veio no link ---------- */

  function saudar() {
    var nome = String(new URLSearchParams(location.search).get('p') || '').trim();
    if (!nome) return;

    var primeiro = nome.split(' ')[0];
    document.getElementById('pc-titulo').innerHTML = 'Olá,<br>' + esc(primeiro);
    document.getElementById('pc-lead').textContent =
      'Monte seu pedido escolhendo as quantidades. A equipe responde no WhatsApp ' +
      'com o valor fechado nas suas condições.';

    var campo = document.getElementById('pc-nome');
    if (campo && !campo.value) campo.value = nome;
  }

  /* ---------- lista de produtos com quantidade ---------- */

  function pintarLista() {
    var caixa = document.getElementById('carrinho');

    caixa.innerHTML = produtos().map(function (p) {
      var qtd = carrinho[p.nome] || 0;

      return '<div class="linha-item' + (qtd ? ' is-escolhido' : '') + '" data-item="' + esc(p.nome) + '">' +
        '<div class="linha-item__info">' +
          '<p class="linha-item__nome">' + esc(p.nome) + '</p>' +
          '<p class="linha-item__preco">' + Preco.formatar(p.venda) +
            ' <span>na tabela</span></p>' +
        '</div>' +
        '<div class="contador-qtd">' +
          '<button class="contador-qtd__btn" type="button" data-menos aria-label="Tirar uma unidade de ' +
            esc(p.nome) + '">−</button>' +
          '<input class="contador-qtd__campo" type="number" min="0" max="999" step="1" ' +
            'inputmode="numeric" value="' + qtd + '" aria-label="Quantidade de ' + esc(p.nome) + '">' +
          '<button class="contador-qtd__btn" type="button" data-mais aria-label="Somar uma unidade de ' +
            esc(p.nome) + '">+</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function itensEscolhidos() {
    return produtos()
      .filter(function (p) { return carrinho[p.nome] > 0; })
      .map(function (p) {
        return { nome: p.nome, quantidade: carrinho[p.nome], venda: Number(p.venda || 0) };
      });
  }

  function pintarResumo() {
    var itens = itensEscolhidos();
    var unidades = itens.reduce(function (t, i) { return t + i.quantidade; }, 0);
    var total = itens.reduce(function (t, i) { return t + i.quantidade * i.venda; }, 0);

    var barra = document.getElementById('carrinho-barra');
    barra.hidden = !unidades;

    document.getElementById('cr-itens').textContent =
      unidades + (unidades === 1 ? ' unidade' : ' unidades') +
      ' · ' + itens.length + (itens.length === 1 ? ' produto' : ' produtos');
    document.getElementById('cr-total').textContent = Preco.formatar(total) + ' na tabela';

    document.getElementById('cr-conferir').innerHTML = itens.length
      ? '<p class="carrinho__titulo">Seu pedido</p>' +
        '<ul class="carrinho__lista">' +
          itens.map(function (i) {
            return '<li><span>' + esc(i.nome) + '</span><b>' + i.quantidade + ' un.</b></li>';
          }).join('') +
        '</ul>' +
        '<p class="carrinho__total">' + unidades + ' unidades · ' +
          Preco.formatar(total) + ' na tabela</p>'
      : '';
  }

  function mudar(nome, delta, valorDireto) {
    var atual = carrinho[nome] || 0;
    var novo = valorDireto === undefined ? atual + delta : Number(valorDireto);

    if (!(novo > 0)) delete carrinho[nome];
    else carrinho[nome] = Math.min(999, Math.round(novo));

    pintarLista();
    pintarResumo();
  }

  /* ---------- envio ---------- */

  function resumoTexto(itens) {
    return itens.map(function (i) { return i.nome + ' (' + i.quantidade + ')'; }).join(', ');
  }

  async function enviar(e) {
    e.preventDefault();

    var itens = itensEscolhidos();
    if (!itens.length) {
      toast('Escolha ao menos um produto.');
      document.getElementById('carrinho').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (!window.PharmaFitValidacao.conferir(document.getElementById('form-parceiro'))) return;

    var unidades = itens.reduce(function (t, i) { return t + i.quantidade; }, 0);
    var nome = document.getElementById('pc-nome').value.trim();
    var obs = document.getElementById('pc-obs').value.trim();

    var registro = {
      cliente: nome,
      empresa: document.getElementById('pc-empresa').value.trim(),
      telefone: document.getElementById('pc-zap').value.trim(),
      prazo: document.getElementById('pc-prazo').value,
      produto: itens.length === 1 ? itens[0].nome : itens.length + ' produtos',
      quantidade: unidades,
      observacao: 'Pedido de parceiro — ' + resumoTexto(itens) +
                  (obs ? '. Observação: ' + obs : ''),
      status: 'novo'
    };

    var botao = document.getElementById('pc-enviar');
    botao.disabled = true;

    var r = await Formularios.enviar('orcamentos', registro);

    if (!r.ok) {
      botao.disabled = false;
      toast('Não conseguimos enviar agora. Tente de novo em instantes.');
      return;
    }

    var caixa = document.querySelector('#form-parceiro [data-sucesso]');
    caixa.textContent = 'Pedido enviado! A equipe responde no seu WhatsApp com o valor fechado.';
    caixa.hidden = false;

    document.querySelectorAll('#form-parceiro input, #form-parceiro select, #form-parceiro textarea')
      .forEach(function (c) { c.disabled = true; });
    document.getElementById('carrinho-barra').hidden = true;

    caixa.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- eventos ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('carrinho')) return;

    saudar();
    pintarLista();
    pintarResumo();

    document.getElementById('carrinho').addEventListener('click', function (e) {
      var linha = e.target.closest('[data-item]');
      if (!linha) return;

      if (e.target.closest('[data-mais]')) mudar(linha.getAttribute('data-item'), 1);
      if (e.target.closest('[data-menos]')) mudar(linha.getAttribute('data-item'), -1);
    });

    document.getElementById('carrinho').addEventListener('change', function (e) {
      var campo = e.target.closest('.contador-qtd__campo');
      var linha = e.target.closest('[data-item]');
      if (!campo || !linha) return;
      mudar(linha.getAttribute('data-item'), 0, campo.value);
    });

    document.getElementById('cr-continuar').addEventListener('click', function () {
      var bloco = document.getElementById('bloco-dados');
      bloco.hidden = false;
      bloco.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { document.getElementById('pc-nome').focus(); }, 400);
    });

    document.getElementById('form-parceiro').addEventListener('submit', enviar);
    window.PharmaFitValidacao.ligar(document.getElementById('form-parceiro'));
  });
})();
