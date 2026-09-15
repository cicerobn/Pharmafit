/* =========================================================
   PHARMA FIT — telas de Atendimento, Pedidos e Conta

   São as três abas da barra inferior. Tudo funciona sem
   cadastro: o que precisa ficar guardado fica no aparelho.
   ========================================================= */
(function () {
  'use strict';

  var Area = window.PharmaFitArea;
  var cfg = window.PHARMAFIT_CONFIG || {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function data(v) {
    var d = new Date(v);
    return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
      ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 3200);
  }

  /* ---------- meus pedidos ---------- */

  function pintarPedidos() {
    var lista = document.querySelector('[data-meus-pedidos]');
    if (!lista) return;

    var pedidos = Area.pedidos();
    document.querySelector('[data-pedidos-vazio]').hidden = pedidos.length > 0;
    lista.hidden = !pedidos.length;

    lista.innerHTML = pedidos.map(function (p) {
      var texto = 'Olá! Queria saber do meu pedido de ' + p.produto +
        (p.quantidade > 1 ? ' (' + p.quantidade + ' unidades)' : '') + '.';
      var link = Area.linkLoja(texto);

      return '' +
        '<article class="pedido">' +
          '<div class="pedido__topo">' +
            '<p class="pedido__nome">' + esc(p.produto) + '</p>' +
            (p.quantidade > 1 ? '<span class="pedido__qtd">' + p.quantidade + ' un.</span>' : '') +
          '</div>' +
          '<p class="pedido__data">Enviado em ' + data(p.quando) + '</p>' +
          (p.endereco ? '<p class="pedido__endereco">📍 ' + esc(p.endereco) + '</p>' : '') +
          '<div class="pedido__acoes">' +
            '<button class="btn btn--primary" type="button" data-pedido="' + esc(p.produto) +
              '" data-quantidade="' + Number(p.quantidade || 1) + '">Pedir de novo</button>' +
            (link
              ? '<a class="btn btn--outline" href="' + link + '" target="_blank" rel="noopener">Falar sobre este pedido</a>'
              : '') +
          '</div>' +
        '</article>';
    }).join('');
  }

  function ligarPedidos() {
    var limpar = document.querySelector('[data-limpar-pedidos]');
    if (!limpar) return;

    limpar.addEventListener('click', async function () {
      var certeza = await window.PharmaFitConfirmar({
        titulo: 'Apagar o histórico?',
        texto: 'Os pedidos somem desta lista, mas continuam valendo com a gente. ' +
               'Isso mexe só neste aparelho.',
        confirmar: 'Apagar histórico'
      });
      if (!certeza) return;

      Area.limparPedidos();
      pintarPedidos();
      toast('Histórico apagado.');
    });
  }

  /* ---------- minha conta ---------- */

  function ligarConta() {
    var form = document.getElementById('form-conta');
    if (!form) return;

    var meus = Area.dados();
    document.getElementById('c-nome').value = meus.nome;
    document.getElementById('c-zap').value = meus.telefone;
    document.getElementById('c-endereco').value = meus.endereco;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      Area.salvarDados({
        nome: document.getElementById('c-nome').value,
        telefone: document.getElementById('c-zap').value,
        endereco: document.getElementById('c-endereco').value
      });
      toast('Dados salvos neste aparelho.');
    });

    var apagar = document.querySelector('[data-apagar-dados]');
    if (apagar) {
      apagar.addEventListener('click', async function () {
        var certeza = await window.PharmaFitConfirmar({
          titulo: 'Apagar seus dados?',
          texto: 'Nome, WhatsApp e endereço saem deste aparelho. Você vai precisar ' +
                 'digitar de novo no próximo pedido.',
          confirmar: 'Apagar dados'
        });
        if (!certeza) return;

        Area.limparDados();
        document.getElementById('c-nome').value = '';
        document.getElementById('c-zap').value = '';
        document.getElementById('c-endereco').value = '';
        toast('Dados apagados.');
      });
    }

    /* resumo do que está guardado */
    var resumo = document.querySelector('[data-resumo-conta]');
    if (resumo) {
      var favoritos = window.PharmaFitFavoritos ? window.PharmaFitFavoritos.ler().length : 0;
      var pedidos = Area.pedidos().length;
      resumo.innerHTML =
        '<a class="resumo-item" href="favoritos.html"><b>' + favoritos + '</b><span>' +
          (favoritos === 1 ? 'favorito' : 'favoritos') + '</span></a>' +
        '<a class="resumo-item" href="pedidos.html"><b>' + pedidos + '</b><span>' +
          (pedidos === 1 ? 'pedido' : 'pedidos') + '</span></a>';
    }
  }

  /* ---------- perguntas frequentes ---------- */

  function ligarFaq() {
    document.querySelectorAll('.faq__pergunta').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var item = botao.closest('.faq__item');
        var aberto = item.classList.toggle('is-aberto');
        botao.setAttribute('aria-expanded', String(aberto));
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    pintarPedidos();
    ligarPedidos();
    ligarConta();
    ligarFaq();
  });
})();
