/* =========================================================
   PHARMA FIT — o número do WhatsApp, e a bolinha que leva até ele

   precisa: nuvem

   Brian, 24/09/2026: "Adiciona a bolinha flutuante para levar ao
   nosso WhatsApp (editável o número para se esse for banido)".

   O NÚMERO MORAVA NUM ARQUIVO, e é isso que este arquivo resolve.
   Ele estava escrito em `gestao/assets/config.js` e em mais três
   lugares como reserva. Trocar exigia mexer no código e publicar —
   e o motivo de trocar é justamente o pior momento para depender de
   alguém: o número foi banido e as vendas estão caindo num número que
   ninguém lê.

   Agora a equipe troca pelo painel (Configurações → WhatsApp do site),
   o valor vai para `pf_configuracoes` com a chave `publico_whatsapp` —
   o prefixo `publico_` é o que a regra do banco usa para deixar o site
   ler —, e este arquivo faz o resto:

     1. ASSIM QUE CARREGA, antes de qualquer outro script da página
        montar um link, ele põe em `PHARMAFIT_CONFIG.WHATSAPP` o último
        número que este aparelho viu no banco. Os outros scripts já leem
        de lá, então nenhum deles precisou mudar.
     2. DEPOIS, pergunta ao banco. Se o número mudou, reescreve todos os
        links `wa.me/` que já estão na tela e guarda o novo para a
        próxima visita.

   Sem número no banco, vale o do `config.js` — o site nunca fica sem
   WhatsApp por causa desta troca.

   A BOLINHA é desenhada aqui também, e não em cada uma das 16 páginas:
   um lugar só para existir, um lugar só para mudar.
   ========================================================= */
(function () {
  'use strict';

  var cfg = window.PHARMAFIT_CONFIG = window.PHARMAFIT_CONFIG || {};
  var Nuvem = window.PharmaFitNuvem;

  var CHAVE_BANCO = 'publico_whatsapp';
  var CHAVE_APARELHO = 'pharmafit_whatsapp';
  var DO_ARQUIVO = digitos(cfg.WHATSAPP);

  function digitos(v) { return String(v || '').replace(/\D+/g, ''); }

  /* Número de WhatsApp com código do país: 12 a 13 dígitos no Brasil
     (55 + DDD + 8 ou 9), e até 15 é o limite do padrão internacional.
     Abaixo de 10 é número sem DDD ou sem país — o link abriria conversa
     com ninguém, e é melhor ficar com o número antigo. */
  function valido(n) { return n.length >= 10 && n.length <= 15; }

  function lerDoAparelho() {
    try { return digitos(localStorage.getItem(CHAVE_APARELHO)); } catch (e) { return ''; }
  }
  function guardarNoAparelho(n) {
    try {
      if (n) localStorage.setItem(CHAVE_APARELHO, n);
      else localStorage.removeItem(CHAVE_APARELHO);
    } catch (e) { /* aba anônima: vale só nesta visita */ }
  }

  /* ---------- 1. o número de agora, já na primeira linha ---------- */

  var guardado = lerDoAparelho();
  if (valido(guardado)) cfg.WHATSAPP = guardado;

  function atual() { return digitos(cfg.WHATSAPP) || DO_ARQUIVO; }

  /* ---------- 2. os links que já estão na tela ---------- */

  /** Troca o número em todo link `wa.me/` da página, mantendo a
      mensagem pronta de cada um. */
  function reescrever(antigo, novo) {
    if (!antigo || !novo || antigo === novo) return;
    document.querySelectorAll('a[href*="wa.me/' + antigo + '"]').forEach(function (a) {
      a.href = a.href.replace('wa.me/' + antigo, 'wa.me/' + novo);
    });
  }

  async function perguntarAoBanco() {
    if (!Nuvem || !Nuvem.cliente) return;
    try { await Nuvem.pronto; } catch (e) { return; }
    var sb = Nuvem.cliente();
    if (!sb) return;

    var r;
    try {
      r = await sb.from('pf_configuracoes').select('valor').eq('chave', CHAVE_BANCO).maybeSingle();
    } catch (e) { return; }
    /* Erro de rede ou de banco NÃO apaga o que o aparelho sabe: na
       dúvida, fica o último número que funcionou. */
    if (!r || r.error) return;

    var doBanco = digitos(r.data && r.data.valor);
    var antes = atual();

    if (valido(doBanco)) {
      cfg.WHATSAPP = doBanco;
      guardarNoAparelho(doBanco);
    } else {
      /* A equipe apagou o número do painel: volta o do arquivo. */
      cfg.WHATSAPP = DO_ARQUIVO;
      guardarNoAparelho('');
    }

    reescrever(antes, atual());
    pintarBolinha();
  }

  /* ---------- 3. a bolinha ---------- */

  var bolinha = null;

  function linkDaBolinha() {
    return 'https://wa.me/' + atual() + '?text=' +
      encodeURIComponent('Olá! Vim pelo site da Pharma Fit e gostaria de atendimento.');
  }

  function pintarBolinha() {
    if (bolinha) bolinha.href = linkDaBolinha();
  }

  function criarBolinha() {
    if (bolinha || !atual()) return;
    bolinha = document.createElement('a');
    bolinha.className = 'zap-flutuante';
    bolinha.href = linkDaBolinha();
    bolinha.target = '_blank';
    bolinha.rel = 'noopener';
    bolinha.setAttribute('aria-label', 'Falar com a Pharma Fit no WhatsApp');
    /* a marca do WhatsApp, a mesma do rodapé */
    bolinha.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41z"/></svg>';
    document.body.appendChild(bolinha);
  }

  document.addEventListener('DOMContentLoaded', function () {
    criarBolinha();
    perguntarAoBanco();
  });

  /* Para o painel mostrar o número que o site está usando de fato. */
  window.PharmaFitZap = { numero: atual, CHAVE_BANCO: CHAVE_BANCO, valido: valido };
})();
