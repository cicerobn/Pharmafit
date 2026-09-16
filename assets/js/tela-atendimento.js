/* =========================================================
   PHARMA FIT — a tela de atendimento

   O formulário da foto do Brian. O botão diz "Quero falar com a
   equipe", e é isso que ele faz: leva a conversa para o WhatsApp
   já com tudo preenchido, para a equipe não precisar perguntar
   nada do começo.

   O PEDIDO TAMBÉM FICA GUARDADO

   Além de abrir a conversa, ele grava em `pf_atendimentos` e aparece
   no painel. Isso importa para o caso mais comum de perda: a pessoa
   preenche tudo e desiste antes de mandar a mensagem. Sem a gravação,
   aquele contato não existia para ninguém.

   A GRAVAÇÃO NÃO ESPERA, E ISSO É DE PROPÓSITO

   O WhatsApp abre primeiro, no mesmo toque. Se eu esperasse a resposta
   do banco para só depois abrir, o navegador trataria a janela como
   "não pedida pela pessoa" e o bloqueador de pop-up a mataria — o
   toque no botão não faria nada. Então a conversa abre na hora e a
   gravação segue por trás.

   Consequência assumida: se a gravação falhar (rede caiu no meio), o
   pedido não fica no painel. A pessoa não perde nada — ela está na
   conversa, com tudo preenchido, que é onde este negócio fecha.

   OS INTERESSES

   Pelo menos um fica marcado. Enviar sem nenhum faria a equipe
   começar a conversa perguntando o que a pessoa quer — que é
   justamente o que este campo existe para evitar.
   ========================================================= */
(function () {
  'use strict';

  /* `form-atend`, e NÃO `form-atendimento`.
   *
   * Eu batizei este formulário de `form-atendimento` — o mesmo id que o
   * `pedido.js` dá ao formulário DENTRO do modal de pedido, que ele
   * injeta em todas as páginas. Dois elementos com o mesmo id, e
   * `getElementById` devolve o primeiro: o desta página.
   *
   * O estrago era duplo, e nenhum dos dois aparecia na tela:
   *
   *   1. o `pedido.js` pendurava o "criar pedido" NESTE formulário. Cada
   *      pessoa que pedisse atendimento criava também um PEDIDO
   *      pendente, com produto qualquer, na fila da equipe.
   *   2. e o formulário do modal ficava sem ouvinte nenhum: o botão
   *      "Continuar no WhatsApp" recarregava a página e não gravava
   *      pedido nenhum. O modal de pedido estava morto nesta página.
   *
   * Achei medindo: o teste passou a deixar a biblioteca do Supabase
   * viva, e apareceu uma gravação em `pf_pedidos` que ninguém pediu. */
  var form = document.getElementById('form-atend');
  if (!form) return;

  var cfg = window.PHARMAFIT_CONFIG || {};
  var Validacao = window.PharmaFitValidacao;
  var Area = window.PharmaFitArea;

  var recado = document.getElementById('at-recado');
  var caixaInteresses = form.querySelector('[data-interesses]');

  function dizer(msg) {
    recado.hidden = false;
    recado.textContent = msg;
    recado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function calar() { recado.hidden = true; recado.textContent = ''; }

  /* ---------- os interesses ---------- */

  function marcados() {
    return [].slice.call(caixaInteresses.querySelectorAll('.is-vale'))
      .map(function (b) { return b.getAttribute('data-interesse'); });
  }

  caixaInteresses.addEventListener('click', function (e) {
    var b = e.target.closest('[data-interesse]');
    if (!b) return;

    var vale = b.classList.contains('is-vale');

    /* Desmarcar o último não é permitido: a tela ficaria sem resposta
       para "o que você quer", e o campo perderia a razão de existir.
       Em vez de recusar em silêncio, diz o porquê. */
    if (vale && marcados().length === 1) {
      dizer('Escolha pelo menos um interesse — é o que a equipe usa para saber ' +
            'por onde começar a conversa.');
      return;
    }

    calar();
    b.classList.toggle('is-vale', !vale);
    b.setAttribute('aria-pressed', String(!vale));
  });

  /* ---------- enviar ---------- */

  function so(el) { return String((el && el.value) || '').trim(); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    calar();

    /* A validação dos campos é a mesma do resto do site: obrigatório,
       telefone de verdade. Ela já escreve o erro embaixo do campo. */
    if (Validacao && !Validacao.conferir(form)) return;

    var interesses = marcados();
    if (!interesses.length) {
      return dizer('Escolha pelo menos um interesse.');
    }

    var nome = so(document.getElementById('at-nome'));
    var zap = so(document.getElementById('at-zap'));
    var objetivo = so(document.getElementById('at-objetivo'));
    var cidade = so(document.getElementById('at-cidade'));

    /* O nome e o WhatsApp passam a valer no aparelho, para a pessoa não
       digitar de novo no pedido. É o mesmo lugar onde o carrinho e a
       conta já guardam. */
    if (Area) {
      try {
        var atual = Area.dados();
        Area.salvarDados({
          nome: nome,
          telefone: zap,
          endereco: atual.endereco || ''
        });
      } catch (err) { /* sem os dados salvos, a conversa vai igual */ }
    }

    var numero = String(cfg.WHATSAPP || '559285904669').replace(/\D+/g, '');
    var linhas = [
      'Olá! Quero iniciar meu atendimento na Pharma Fit.',
      '',
      'Nome: ' + nome,
      'WhatsApp: ' + zap,
      'Cidade: ' + cidade,
      'Objetivo: ' + objetivo,
      'Interesse: ' + interesses.join(', ')
    ];

    var botao = form.querySelector('button[type=submit]');
    var texto = botao && botao.querySelector('[data-texto]');
    var antes = texto ? texto.textContent : '';
    if (texto) {
      botao.classList.add('is-feito');
      texto.textContent = 'Abrindo o WhatsApp…';
    }

    /* GUARDA O PEDIDO, SEM ESPERAR.
       Disparado antes de abrir a conversa e sem `await`: a janela do
       WhatsApp precisa nascer no mesmo toque do dedo (o porquê está no
       cabeçalho deste arquivo). O `catch` existe para uma falha de rede
       não virar um erro no console do cliente. */
    var Nuvem = window.PharmaFitNuvem;
    if (Nuvem) {
      try {
        Nuvem.inserir('atendimentos', {
          nome: nome,
          telefone: zap,
          cidade: cidade,
          objetivo: objetivo,
          interesses: interesses,
          status: 'novo'
        }).catch(function () { /* a conversa já está aberta com tudo dentro */ });
      } catch (err) { /* idem */ }
    }

    var url = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(linhas.join('\n'));

    /* `window.open` numa aba nova, e o endereço direto como reserva: em
       alguns navegadores de celular o bloqueador de pop-up recusa o
       open, e aí a pessoa clicaria no botão e nada aconteceria. */
    var aba = window.open(url, '_blank');
    if (!aba) location.href = url;

    setTimeout(function () {
      if (texto) {
        botao.classList.remove('is-feito');
        texto.textContent = antes;
      }
    }, 2500);
  });
})();
