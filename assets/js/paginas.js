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

    /* O BOTÃO DE APAGAR SÓ APARECE QUANDO TEM O QUE APAGAR — E QUANDO
       O QUE ELE APAGA É O QUE ESTÁ NA TELA.
       Medido em 17/09/2026: com conta, a lista vem da conta, e apagar
       o aparelho não mudava nada na tela — que ainda por cima dizia
       "Histórico apagado". Sem pedido nenhum, ele oferecia apagar o
       vazio. As duas coisas são a mesma: botão que promete e não
       entrega. */
    var blocoLimpar = document.querySelector('[data-bloco-limpar]');
    if (blocoLimpar) blocoLimpar.hidden = !(de === 'aparelho' && pedidos.length > 0);

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

  /* ---------- minha conta ----------
   *
   * ESTE PEDAÇO FOI EMBORA em 17/09/2026, com o formulário "Meus dados"
   * que ele servia. O Brian pediu para tirar a tela, e código que
   * atende uma tela que não existe mais é pior do que código que
   * falta: ele parece feito.
   *
   * O que estava aqui e para onde foi:
   *
   *   - preencher os campos com o cadastro (e refazer isso quando a
   *     conta responde) -> não há campos para preencher. Quem lê o
   *     cadastro da conta continua sendo `Conta.sincronizarCadastro()`,
   *     que roda sozinho na abertura e alimenta o pedido.
   *   - salvar o cadastro na conta -> passou para a hora do PEDIDO,
   *     em `assets/js/pedido.js`. Era obrigatório mexer nisso junto:
   *     sem o formulário, o endereço novo digitado na compra ficaria
   *     só no aparelho e a sincronização da abertura seguinte o
   *     substituiria pelo antigo da conta, sem erro nenhum na tela.
   *   - "Apagar meus dados" -> saiu com o formulário. Quem quer sair
   *     de vez usa "Sair da conta", logo abaixo, que limpa o aparelho.
   *   - um resumo em `[data-resumo-conta]` que JÁ estava morto: esse
   *     atributo não existe em página nenhuma. Quem desenha o resumo
   *     da Conta é `assets/js/cliente.js`, em `[data-resumo-cliente]`.
   */

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

    /* O E-MAIL NÃO É ESCRITO AQUI DESDE 17/09/2026.
       Ele ficava na letra miúda acima deste botão, e era o único lugar
       da página que dizia em que conta a pessoa estava. Com a Conta
       refeita ele subiu para a ficha, no alto, junto do nome e da
       inicial (assets/js/cliente.js). Escrever nos dois seria manter
       a mesma verdade em dois lugares — e um dia um deles mente. */

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
    ligarFaq();
    ligarSair().catch(function () {});
  });
})();
