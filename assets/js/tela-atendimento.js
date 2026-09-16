/* =========================================================
   PHARMA FIT — a tela de atendimento

   O formulário da foto do Brian. O botão diz "Quero falar com a
   equipe", e é isso que ele faz: leva a conversa para o WhatsApp
   já com tudo preenchido, para a equipe não precisar perguntar
   nada do começo.

   POR QUE NÃO GRAVA NO BANCO (AINDA)

   Os outros formulários do site (representante, atacado, fila de
   espera) gravam numa tabela e aparecem no painel. Este não, por um
   motivo simples: a tabela `pf_atendimentos` não existe, e apontar
   para uma tabela que não existe faria a pessoa preencher tudo e ler
   "não conseguimos enviar" — um formulário quebrado, que é
   exatamente o que a regra 1 proíbe.

   A migração está escrita e pronta em
   gestao/supabase/migracao-05-atendimentos.sql, e não foi aplicada
   porque mexer em produção é decisão do Brian. No dia em que entrar,
   o pedido também cai no painel; até lá ele vive na conversa do
   WhatsApp, que é onde este negócio fecha de qualquer jeito.

   OS INTERESSES

   Pelo menos um fica marcado. Enviar sem nenhum faria a equipe
   começar a conversa perguntando o que a pessoa quer — que é
   justamente o que este campo existe para evitar.
   ========================================================= */
(function () {
  'use strict';

  var form = document.getElementById('form-atendimento');
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
