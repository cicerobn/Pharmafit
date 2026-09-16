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
          chave: chave,
          nome: String(p.cliente || 'Sem nome').trim(),
          telefone: p.telefone || '',
          pedidos: 0,
          total: 0,
          ultima: 0,
          /* OS PEDIDOS DA PESSOA FICAM GUARDADOS AQUI.
             É o que a ficha mostra: o que cada um pediu e quanto pagou.
             Guardar na hora de agrupar sai de graça — o contrário seria
             varrer a lista toda de novo a cada toque. */
          lista: []
        };
      }
      mapa[chave].lista.push(p);

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
      /* BOTÃO, E NÃO LINK PARA OUTRA PÁGINA.
         Era um link para `../cliente.html?telefone=…&nome=…`, e ele
         estava QUEBRADO: aquela página espera `?c=<nome>` e, recebendo
         `telefone` e `nome`, respondia "Nenhum cliente foi escolhido.
         Volte para a lista e clique em um nome". Ou seja: entrar no
         cliente não funcionava. Agora a ficha abre aqui mesmo. */
      return '<li><button class="item" type="button" data-cliente="' + esc(c.chave) + '">' +
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
      '</button></li>';
    }).join('');
  }

  /* =========================================================
     A FICHA DO CLIENTE

     Brian: "na parte de clientes quero que tenha como entrar em cada
     cliente e ver o que cada um pediu e quanto pagou".

     Entrar no cliente NÃO funcionava: a lista levava para
     `../cliente.html?telefone=…&nome=…` e aquela página pede
     `?c=<nome>` — ela respondia "Nenhum cliente foi escolhido". Medido
     no navegador antes de escrever qualquer coisa.

     Agora a ficha abre aqui, sem sair da tela, e mostra exatamente o
     que ele pediu: cada pedido com data, produto, quantidade, quanto
     pagou, forma de pagamento e situação. Em cima, os três números que
     resumem a pessoa.

     O TOTAL SÓ CONTA O CONFIRMADO, e a ficha diz isso na tela. Pedido
     pendente ainda não é dinheiro; somar como se fosse infla o valor do
     cliente e a decisão de quanto investir nele sai errada. É a mesma
     regra da lista, e agora está escrita onde o número aparece.
     ========================================================= */

  var folha = null;
  var veu = null;

  function dataCurta(p) {
    var d = dataDe(p);
    if (!d || isNaN(d.getTime()) || !d.getTime()) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function situacaoDe(p) {
    var s = String(p.status || '').toLowerCase();
    if (s === 'pendente') return ['pendente', 'Pendente'];
    if (s === 'enviado') return ['enviado', 'Enviado'];
    if (s === 'cancelado') return ['cancelado', 'Cancelado'];
    return ['pago', 'Confirmado'];
  }

  function montarFolha() {
    if (folha) return;

    veu = document.createElement('div');
    veu.className = 'veu';
    document.body.appendChild(veu);

    folha = document.createElement('div');
    folha.className = 'folha';
    folha.setAttribute('role', 'dialog');
    folha.setAttribute('aria-modal', 'true');
    folha.setAttribute('aria-label', 'Ficha do cliente');
    folha.innerHTML =
      '<div class="folha__topo">' +
        '<h2 class="folha__titulo" data-ficha-nome>Cliente</h2>' +
        '<button class="folha__fechar" type="button" data-fechar-ficha aria-label="Fechar">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="folha__corpo">' +
        '<p class="ficha-tel" data-ficha-tel></p>' +
        '<div class="ficha-numeros">' +
          /* O DINHEIRO OCUPA A LINHA INTEIRA.
             Os três números dividiam a largura em três, e eu medi com um
             cliente grande: "R$ 110.090,00" precisa de 98px e tinha 69
             em tela de 320px — o número mais importante da ficha saía
             cortado. Pior: eu tinha tirado justamente esse campo da
             conferência de texto cortado, "porque ele tem reticências de
             propósito". Era eu escondendo defeito de mim mesmo. */
          '<div class="ficha-num ficha-num--dinheiro">' +
            '<span class="ficha-num__rotulo">Pagou</span>' +
            '<span class="ficha-num__valor" data-ficha-total></span>' +
            '<span class="ficha-num__pe">só o que já foi confirmado</span>' +
          '</div>' +
          '<div class="ficha-num">' +
            '<span class="ficha-num__rotulo">Pedidos</span>' +
            '<span class="ficha-num__valor" data-ficha-qtd></span>' +
            '<span class="ficha-num__pe" data-ficha-pendentes></span>' +
          '</div>' +
          '<div class="ficha-num">' +
            '<span class="ficha-num__rotulo">Último</span>' +
            '<span class="ficha-num__valor ficha-num__valor--data" data-ficha-ultima></span>' +
            '<span class="ficha-num__pe" data-ficha-desde></span>' +
          '</div>' +
        '</div>' +
        '<h3 class="rotulo-secao">O que pediu</h3>' +
        '<ul class="ficha-pedidos" data-ficha-pedidos></ul>' +
      '</div>' +
      '<div class="folha__acoes">' +
        '<a class="botao" data-ficha-zap target="_blank" rel="noopener">WhatsApp</a>' +
        '<a class="botao botao--forte" data-ficha-completa>Ficha completa</a>' +
      '</div>';
    document.body.appendChild(folha);

    folha.querySelector('[data-fechar-ficha]').addEventListener('click', fechar);
    veu.addEventListener('click', fechar);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && folha.classList.contains('is-aberta')) fechar();
    });
  }

  function abrir(c) {
    montarFolha();

    var lista = (c.lista || []).slice().sort(function (a, b) {
      return dataDe(b).getTime() - dataDe(a).getTime();
    });
    var pendentes = lista.filter(function (p) {
      return String(p.status || '').toLowerCase() === 'pendente';
    }).length;

    folha.querySelector('[data-ficha-nome]').textContent = c.nome;
    folha.querySelector('[data-ficha-tel]').textContent = c.telefone || 'sem telefone';
    folha.querySelector('[data-ficha-total]').textContent = moeda(c.total);
    folha.querySelector('[data-ficha-qtd]').textContent = c.pedidos;
    folha.querySelector('[data-ficha-pendentes]').textContent =
      pendentes ? (pendentes === 1 ? '1 pendente' : pendentes + ' pendentes') : 'todos confirmados';
    folha.querySelector('[data-ficha-ultima]').textContent =
      lista.length ? dataCurta(lista[0]) : '—';
    folha.querySelector('[data-ficha-desde]').textContent =
      lista.length > 1 ? 'primeiro em ' + dataCurta(lista[lista.length - 1]) : '';

    folha.querySelector('[data-ficha-pedidos]').innerHTML = lista.length
      ? lista.map(function (p) {
          var st = situacaoDe(p);
          var q = Number(p.quantidade || 1);
          return '<li class="ficha-pedido">' +
            '<div class="ficha-pedido__topo">' +
              '<span class="ficha-pedido__produto">' + esc(p.produto || 'Produto') +
                (q > 1 ? ' <span class="ficha-pedido__qtd">' + q + ' un.</span>' : '') +
              '</span>' +
              '<span class="ficha-pedido__valor">' + moeda(p.valor) + '</span>' +
            '</div>' +
            '<div class="ficha-pedido__pe">' +
              '<span>' + dataCurta(p) + '</span>' +
              (p.pagamento ? '<span>· ' + esc(p.pagamento) + '</span>' : '') +
              '<span class="marca marca--' + st[0] + '">' + st[1] + '</span>' +
            '</div>' +
          '</li>';
        }).join('')
      : '<li class="ficha-pedido ficha-pedido--vazio">Nenhum pedido registrado.</li>';

    /* O WhatsApp abre a conversa, e NADA é enviado: quem escreve é a
       equipe. Sem telefone, o botão sai da tela em vez de ficar ali sem
       fazer nada. */
    var zap = folha.querySelector('[data-ficha-zap]');
    var digitos = U.digitos(c.telefone || '');
    if (digitos.length >= 10) {
      zap.hidden = false;
      zap.href = 'https://wa.me/' + (digitos.length <= 11 ? '55' + digitos : digitos);
    } else {
      zap.hidden = true;
    }

    /* A ficha completa (gráfico do que ele mais leva, anotações e a
       planilha) continua no painel antigo — e agora com o endereço que
       ela realmente entende: `?c=<nome>`. */
    folha.querySelector('[data-ficha-completa]').href =
      '../cliente.html?c=' + encodeURIComponent(c.nome);

    veu.classList.add('is-aberto');
    folha.classList.add('is-aberta');
    document.body.style.overflow = 'hidden';
  }

  function fechar() {
    if (!folha) return;
    folha.classList.remove('is-aberta');
    veu.classList.remove('is-aberto');
    document.body.style.overflow = '';
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

    /* clique delegado: a lista é redesenhada a cada busca e a cada
       ordenação, e ouvinte posto em cada item morreria no primeiro
       redesenho */
    document.querySelector('[data-clientes]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cliente]');
      if (!b) return;
      var chave = b.getAttribute('data-cliente');
      var c = estado.clientes.filter(function (o) { return String(o.chave) === String(chave); })[0];
      if (c) abrir(c);
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
