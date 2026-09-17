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

  /* A LISTA VEM DA CONTA QUANDO HÁ CONTA.
   *
   * Era só `Area.pedidos()`: a lista deste navegador. Quem comprava no
   * celular e abria no computador não achava o pedido — e concluía que o
   * pedido havia sumido.
   *
   * `Conta.pedidos()` tenta a conta e cai para o aparelho. A coluna que
   * liga pedido e pessoa entrou no banco em 16/09/2026, e o pedido feito
   * com login já nasce com dono.
   *
   * As duas formas de pedido convivem aqui de propósito: o do banco tem
   * `criado_em` e `status` (é ele que sabe se a equipe já confirmou), e o
   * do aparelho tem `quando` e `endereco`. Cada pedaço só aparece quando
   * existe — em vez de escrever "Invalid Date" ou inventar um status. */
  async function pintarPedidos() {
    var lista = document.querySelector('[data-meus-pedidos]');
    if (!lista) return;

    var Conta = window.PharmaFitConta;
    var pedidos = [];
    var de = 'aparelho';
    try {
      if (Conta && Conta.pedidos) {
        var r = await Conta.pedidos();
        pedidos = (r && r.lista) || [];
        de = (r && r.de) || 'aparelho';
      } else {
        pedidos = Area.pedidos();
      }
    } catch (e) {
      pedidos = Area.pedidos();
    }

    /* O aviso passa a dizer a verdade sobre ESTA lista. Dizer "deste
       aparelho" para quem está vendo a lista da conta é mentira pequena,
       e mentira pequena faz desconfiar do resto. */
    var aviso = document.querySelector('[data-aviso-lista]');
    if (aviso) {
      aviso.innerHTML = de === 'conta'
        ? 'Estes são os pedidos da <b>sua conta</b>, e aparecem em qualquer aparelho. ' +
          'O andamento de cada um a gente confirma pelo WhatsApp.'
        : 'Estes são os pedidos feitos <b>neste aparelho</b>. Entre na sua conta para ' +
          'vê-los em qualquer lugar.';
    }

    document.querySelector('[data-pedidos-vazio]').hidden = pedidos.length > 0;
    lista.hidden = !pedidos.length;

    lista.innerHTML = pedidos.map(function (p) {
      var texto = 'Olá! Queria saber do meu pedido de ' + p.produto +
        (p.quantidade > 1 ? ' (' + p.quantidade + ' unidades)' : '') + '.';
      var link = Area.linkLoja(texto);
      var quando = p.quando || p.criado_em;
      var st = String(p.status || '').toLowerCase();

      return '' +
        '<article class="pedido">' +
          '<div class="pedido__topo">' +
            '<p class="pedido__nome">' + esc(p.produto) + '</p>' +
            (p.quantidade > 1 ? '<span class="pedido__qtd">' + p.quantidade + ' un.</span>' : '') +
          '</div>' +
          (quando ? '<p class="pedido__data">Enviado em ' + data(quando) + '</p>' : '') +
          (st
            ? '<p class="pedido__estado">' +
                (st === 'pendente' ? 'Esperando a confirmação da equipe'
                  : st === 'cancelado' ? 'Cancelado'
                  : 'Confirmado pela equipe') +
              '</p>'
            : '') +
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

    function preencher() {
      var meus = Area.dados();
      document.getElementById('c-nome').value = meus.nome;
      document.getElementById('c-zap').value = meus.telefone;
      document.getElementById('c-endereco').value = meus.endereco;
    }
    preencher();

    /* O CADASTRO DA CONTA CHEGA DEPOIS, e o formulário precisa saber.
       A tela desenha na hora com o que está no aparelho; a leitura da
       conta é uma ida ao servidor e termina depois. Sem isto, quem
       abrisse num aparelho novo veria os campos vazios mesmo tendo
       cadastro guardado na conta, e concluiria que a conta não guarda
       nada. O aviso não sobrescreve o que a pessoa já estiver
       digitando: se algum campo está com o foco, ele fica como está. */
    document.addEventListener('pharmafit-meus-dados', function () {
      var focado = document.activeElement;
      if (focado && form.contains(focado)) return;
      preencher();
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var dados = {
        nome: document.getElementById('c-nome').value,
        telefone: document.getElementById('c-zap').value,
        endereco: document.getElementById('c-endereco').value
      };
      Area.salvarDados(dados);

      /* Com conta, sobe para a conta e o recado diz isso — "salvo neste
         aparelho" para quem tem conta seria mentira pela metade, e é
         justamente a dúvida que faz a pessoa digitar tudo de novo no
         outro aparelho. */
      var Conta = window.PharmaFitConta;
      if (Conta) {
        var r = await Conta.salvarCadastro(dados);
        if (r && r.ok) { toast('Dados salvos na sua conta.'); return; }
      }
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

    /* O RESUMO, E A CONTAGEM DE PEDIDOS VEM DA CONTA.
     *
     * Ela vinha de `Area.pedidos()`, que é a lista DESTE APARELHO.
     * Enquanto os pedidos tinham aba própria embaixo, isso passava: quem
     * quisesse ver ia direto. Desde 17/09/2026 a Conta é a ÚNICA porta
     * para os pedidos — e uma porta escrita "0 pedidos" para quem tem
     * três é uma porta que ninguém abre.
     *
     * A conta primeiro, o aparelho como reserva: é a mesma ordem da
     * tela de pedidos, para as duas nunca dizerem números diferentes. */
    var resumo = document.querySelector('[data-resumo-conta]');
    if (resumo) {
      var favoritos = window.PharmaFitFavoritos ? window.PharmaFitFavoritos.ler().length : 0;

      function desenharResumo(quantos) {
        resumo.innerHTML =
          '<a class="resumo-item" href="favoritos.html"><b>' + favoritos + '</b><span>' +
            (favoritos === 1 ? 'favorito' : 'favoritos') + '</span></a>' +
          '<a class="resumo-item" href="pedidos.html"><b>' + quantos + '</b><span>' +
            (quantos === 1 ? 'pedido' : 'pedidos') + '</span></a>';
      }

      /* desenha na hora com o que o aparelho tem, e corrige quando a
         conta responder — a tela não espera a rede para aparecer */
      desenharResumo(Area.pedidos().length);

      var Conta = window.PharmaFitConta;
      if (Conta && Conta.pedidos) {
        Conta.pedidos().then(function (r) {
          desenharResumo((r && r.lista ? r.lista : []).length);
        }).catch(function () {});
      }
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

  /* ---------- sair da conta ---------- */

  /* A FUNÇÃO DE SAIR EXISTIA E NENHUM BOTÃO CHAMAVA ELA.
   *
   * `Conta.sair()` está escrito desde o começo, e em 17/09/2026 o Brian
   * descobriu do pior jeito: entrou e não tinha como sair. Não dava para
   * trocar de conta, nem para deixar o telefone de outra pessoa sem a
   * conta aberta. Código que existe sem porta é a mesma coisa que código
   * que não existe — só pior, porque parece feito.
   *
   * O bloco nasce escondido e só aparece para quem está logado: sem
   * conta não há de onde sair.
   */
  async function ligarSair() {
    var bloco = document.querySelector('[data-sair-bloco]');
    if (!bloco) return;

    var Conta = window.PharmaFitConta;
    if (!Conta) return;

    var u = null;
    try { u = await Conta.usuario(); } catch (e) { u = null; }
    if (!u) return;

    bloco.hidden = false;
    var onde = bloco.querySelector('[data-sair-email]');
    if (onde) onde.textContent = u.email || '';

    bloco.querySelector('[data-sair-conta]').addEventListener('click', async function () {
      var certeza = await window.PharmaFitConfirmar({
        titulo: 'Sair da conta?',
        texto: 'Seus pedidos e seus dados continuam guardados na conta e voltam ' +
               'quando você entrar de novo. Deste aparelho eles saem.',
        confirmar: 'Sair da conta',
        cancelar: 'Continuar na conta'
      });
      if (!certeza) return;

      /* PRIMEIRO SAIR, DEPOIS LIMPAR. A ORDEM IMPORTA.
         Eu havia escrito o contrário, e a medição mostrou a fresta:
         enquanto a sessão ainda existe, qualquer sincronização que
         rode nesse intervalo baixa o cadastro da conta e reescreve o
         que eu acabei de apagar. Saindo primeiro, não existe intervalo
         — não há sessão para sincronizar nada. */
      await Conta.sair();

      /* O ESPELHO DO APARELHO SAI TAMBÉM.
         Nome, WhatsApp e endereço neste navegador foram copiados DA
         CONTA. Deixá-los aqui depois de sair entrega os dados de uma
         pessoa para a próxima que pegar o telefone — e o pedido de
         "sair" é justamente o de não deixar rastro. Na conta eles
         continuam, e voltam no próximo login. */
      try { if (Area && Area.limparDados) Area.limparDados(); } catch (e) {}

      location.href = 'index.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    pintarPedidos();
    ligarPedidos();
    ligarConta();
    ligarFaq();
    ligarSair().catch(function () {});
  });
})();
