/* =========================================================
   PHARMA FIT — tela de Clientes

   A lista nasce dos PEDIDOS, não de um cadastro: cliente é quem
   comprou. Duas compras da mesma pessoa contam como uma pessoa, e
   o que junta as duas é o telefone — nome escrito de dois jeitos
   ("joão silva" e "Joao Silva") não pode virar dois clientes.

   Sem foto, de propósito: foto de cliente é dado que ninguém
   precisa guardar para vender. As iniciais bastam.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Moldura = window.PharmaFitMoldura;
  var U = window.PharmaFitUtil;
  var moeda = U.moeda;
  var esc = U.esc;

  var estado = { clientes: [], ordem: 'mais', busca: '' };

  /* Uma cor por pessoa, tirada do nome. Sempre a mesma para o mesmo
     nome — é o que deixa a lista reconhecível ao rolar. */
  var CORES = [
    ['#2f6f62', '#e6f1ee'], ['#a4552f', '#f7ece6'], ['#6a4270', '#f2ecf4'],
    ['#3a5a7a', '#e9eff5'], ['#8a6320', '#f8f1e2'], ['#7a3a4f', '#f6eaee']
  ];

  function corDe(nome) {
    var soma = 0;
    for (var i = 0; i < nome.length; i++) soma += nome.charCodeAt(i);
    return CORES[soma % CORES.length];
  }

  function iniciais(nome) {
    var partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function dataDe(p) {
    return new Date(p.confirmado_em || p.criado_em || 0);
  }

  /** Junta os pedidos por pessoa. */
  function montar(pedidos) {
    var mapa = {};

    (pedidos || []).forEach(function (p) {
      var s = String(p.status || '').toLowerCase();
      if (s === 'cancelado') return;

      /* A chave é o telefone quando existe; quando não, o nome
         normalizado. Telefone é o que a pessoa tem de único. */
      var chave = U.digitos(p.telefone || '') || U.normalizar(p.cliente || '');
      if (!chave) return;

      if (!mapa[chave]) {
        mapa[chave] = {
          nome: String(p.cliente || 'Sem nome').trim(),
          telefone: p.telefone || '',
          pedidos: 0,
          total: 0,
          ultima: 0
        };
      }

      var c = mapa[chave];
      c.pedidos++;
      /* Só conta no total o que foi confirmado: pedido pendente ainda
         não é dinheiro, e somar como se fosse infla o valor do cliente. */
      if (s !== 'pendente') c.total += Number(p.valor || 0);
      var q = dataDe(p).getTime();
      if (q > c.ultima) c.ultima = q;
      /* O nome mais completo ganha: "João Silva" em vez de "João". */
      if (String(p.cliente || '').length > c.nome.length) c.nome = String(p.cliente).trim();
    });

    return Object.keys(mapa).map(function (k) { return mapa[k]; });
  }

  function filtrar() {
    var termo = U.normalizar(estado.busca.trim());

    var lista = estado.clientes.filter(function (c) {
      if (!termo) return true;
      return U.normalizar(c.nome + ' ' + c.telefone).indexOf(termo) !== -1;
    });

    lista.sort(function (a, b) {
      if (estado.ordem === 'pedidos') return b.pedidos - a.pedidos;
      if (estado.ordem === 'recentes') return b.ultima - a.ultima;
      if (estado.ordem === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
      return b.total - a.total;
    });

    return lista;
  }

  function pintar() {
    var lista = filtrar();
    var alvo = document.querySelector('[data-clientes]');
    var conta = document.querySelector('[data-conta]');

    if (!lista.length) {
      conta.textContent = '';
      var nenhum = !estado.clientes.length;
      alvo.innerHTML = '<li><div class="vazio">' +
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M16 20v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="8" r="4"/></svg>' +
        '<p class="vazio__titulo">' +
          (nenhum ? 'Nenhum cliente ainda' : 'Nada com essa busca') + '</p>' +
        '<p class="vazio__texto">' + (nenhum
          ? 'A lista se monta sozinha a partir dos pedidos: quem comprar aparece aqui.'
          : 'Tente outro nome ou telefone.') + '</p>' +
      '</div></li>';
      return;
    }

    conta.textContent = lista.length + (lista.length === 1 ? ' cliente' : ' clientes');

    alvo.innerHTML = lista.map(function (c) {
      var cor = corDe(c.nome);
      var tel = U.digitos(c.telefone);
      return '<li><a class="item" href="../cliente.html?telefone=' + encodeURIComponent(tel) +
        '&nome=' + encodeURIComponent(c.nome) + '">' +
        '<span class="item__inicial" style="color:' + cor[0] + ';background:' + cor[1] + '">' +
          esc(iniciais(c.nome)) + '</span>' +
        '<span class="item__corpo">' +
          '<span class="item__nome">' + esc(c.nome) + '</span>' +
          '<span class="item__linha">' + esc(c.telefone || 'sem telefone') + '</span>' +
        '</span>' +
        '<span class="item__lado">' +
          '<span class="item__valor">' + moeda(c.total) + '</span>' +
          '<span class="item__hora">' + c.pedidos +
            (c.pedidos === 1 ? ' pedido' : ' pedidos') + '</span>' +
        '</span>' +
        '<span class="item__seta">' + Moldura.svg('seta', 17, 1.9) + '</span>' +
      '</a></li>';
    }).join('');
  }

  async function carregar() {
    try {
      var r = await Moldura.dados();
      estado.clientes = montar(r.pedidos);
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

    await Moldura.montar({ aba: 'clientes' });
    Moldura.aoNovo(function () { location.href = '../index.html#novo'; });

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
        botaoFiltro.classList.toggle('is-ativo', estado.ordem !== 'mais');
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
