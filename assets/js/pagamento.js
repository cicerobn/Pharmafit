/* =========================================================
   PHARMA FIT — pagar no site

   precisa: carrinho, minha-area, pedido, nuvem, conta, validacao

   O QUE ESTE ARQUIVO FAZ: abre a cobrança PIX da compra do carrinho e
   mostra o código na tela, sem a pessoa sair do site.

   ---------------------------------------------------------
   A REGRA QUE MANDA AQUI É A DO BRIAN:

     "Nunca me entregue um botão ou campo que não faz nada. Ou ele
      funciona, ou ele não aparece na tela."

   O pagamento depende de três coisas que não estão no site: a migração
   aplicada, as funções de servidor publicadas e a chave da Bras Pay no
   Secrets do Supabase. Enquanto faltar QUALQUER uma delas, este arquivo
   não desenha botão nenhum — o carrinho fica exatamente como está hoje,
   fechando no WhatsApp.

   Como ele sabe? Ele PERGUNTA, uma vez, ao abrir a tela. Um pedido vazio
   para `pf-cobranca-criar` responde:

     · 503 e `falta: PF_GATEWAY_CHAVE`  -> a chave não está lá. Sem botão.
     · 404 / erro de rede               -> a função não foi publicada. Sem botão.
     · 400 "compra invalida"            -> está tudo de pé. Botão na tela.

   O 400 é a resposta BOA aqui: significa que a função rodou, achou a
   chave e só reclamou de eu não ter mandado compra nenhuma — que é
   verdade, eu não mandei.

   ---------------------------------------------------------
   E O DINHEIRO NÃO VEM DAQUI

   Este arquivo manda o total para o banco, mas quem cobra é o servidor, e
   ele REFAZ a conta pelas linhas de item antes de gerar a cobrança. Se o
   que está escrito aqui discordar do que o servidor soma, não nasce
   cobrança nenhuma. É de propósito: o site é estático, e qualquer pessoa
   consegue mexer no que o navegador manda.
   ========================================================= */
(function () {
  'use strict';

  var C = window.PharmaFitCarrinho;
  var Nuvem = window.PharmaFitNuvem;
  var Pedido = window.PharmaFitPedido;
  var cfg = window.PHARMAFIT_CONFIG || {};

  var caixaBotao = document.querySelector('[data-pagar]');
  if (!C || !Nuvem || !caixaBotao) return;

  var BASE = String(cfg.SUPABASE_URL || '').replace(/\/+$/, '');
  if (!BASE) return;   /* modo demonstração: não existe função para chamar */

  var botao = document.querySelector('[data-pagar-pix]');
  var tela = document.querySelector('[data-pix]');
  var elQr = document.getElementById('pix-qr');
  var elValor = document.getElementById('pix-valor');
  var elCodigo = document.getElementById('pix-copia');
  var elCopiar = document.getElementById('pix-copiar');
  var elEstado = document.getElementById('pix-estado');
  var elPrazo = document.getElementById('pix-prazo');

  function moeda(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function chamar(funcao, corpo) {
    return fetch(BASE + '/functions/v1/' + funcao, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo || {})
    });
  }

  /* ---------- 1. o gateway está de pé? ---------- */

  async function gatewayDePe() {
    try {
      var r = await chamar('pf-cobranca-criar', {});
      /* 400 = a função rodou e tem chave. Qualquer outra coisa (503 sem
         chave, 404 não publicada, 500) conta como não estar pronta. */
      return r.status === 400;
    } catch (e) {
      return false;   /* sem rede até o Supabase: nada de botão */
    }
  }

  /* ---------- 2. gravar a compra ---------- */

  /** O ID NASCE AQUI, NO NAVEGADOR, e isso não é preguiça minha.
   *
   *  Quem compra sem conta não pode pedir o id de volta ao banco: devolver
   *  a linha gravada exige política de LEITURA, e visitante sem conta não
   *  lê `pf_compras` de propósito. Provado no banco (prova-15, tentativa
   *  19): `insert ... returning` é recusado para visitante.
   *
   *  Sem isto o pagamento quebraria só para quem NÃO tem conta — metade
   *  de quem compra — e passaria em qualquer teste feito logado. */
  function novoId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    /* navegador velho: monta um UUID v4 com números aleatórios de verdade */
    var b = new Uint8Array(16);
    window.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = [].map.call(b, function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' +
           h.slice(16, 20) + '-' + h.slice(20);
  }

  async function gravarCompra(conta, dados) {
    var id = novoId();

    var compra = {
      id: id,
      nome: dados.nome,
      telefone: dados.telefone || null,
      endereco: dados.endereco || null,
      total: conta.total,
      frete: 0,
      status: 'aguardando'
    };

    /* o dono, quando a pessoa está logada — a mesma regra do pedido.js */
    try {
      var Conta = window.PharmaFitConta;
      var u = Conta ? await Conta.usuario() : null;
      if (u && u.id) compra.cliente_id = u.id;
    } catch (e) { /* sem conta, a compra nasce sem dono */ }

    var r = await Nuvem.inserir('compras', compra);
    if (!r || !r.ok || r.local) return null;

    /* AS LINHAS DE ITEM SÃO O QUE O SERVIDOR VAI SOMAR. Se uma falhar, a
       soma não fecha com o total e a cobrança é recusada — então é melhor
       parar aqui e cair no WhatsApp do que mandar a pessoa para uma tela
       de pagamento que vai dizer "os valores não conferem". */
    for (var i = 0; i < conta.itens.length; i++) {
      var item = conta.itens[i];
      var linha = await Nuvem.inserir('compra_itens', {
        compra_id: id,
        produto: item.nome,
        quantidade: Number(item.quantidade),
        preco_unitario: Number(item.preco)
      });
      if (!linha || !linha.ok) return null;
    }

    /* E A FILA DO PAINEL, que é onde a equipe olha. Uma linha por produto,
       como sempre foi, agora apontando para a compra. O valor continua
       nascendo zero: quem escreve dinheiro no painel é o servidor, depois
       de o pagamento cair. */
    if (Pedido && Pedido.registrar) {
      for (var j = 0; j < conta.itens.length; j++) {
        try {
          await Pedido.registrar({
            cliente: dados.nome,
            telefone: dados.telefone,
            endereco: dados.endereco,
            produto: conta.itens[j].nome,
            quantidade: conta.itens[j].quantidade,
            compra_id: id
          });
        } catch (e) { /* a fila é registro interno; não barra o pagamento */ }
      }
    }

    return id;
  }

  /* ---------- 3. a tela do PIX ---------- */

  var vigiando = null;

  function mostrarEstado(texto, classe) {
    if (!elEstado) return;
    elEstado.textContent = texto;
    elEstado.className = 'pix__estado' + (classe ? ' pix__estado--' + classe : '');
  }

  function pararDeVigiar() {
    if (vigiando) { clearInterval(vigiando); vigiando = null; }
  }

  /** Pergunta ao servidor se o dinheiro caiu.
   *
   *  De quatro em quatro segundos, por quinze minutos. Não é o webhook —
   *  quem marca a compra como paga é ele, no servidor, e isto aqui só
   *  OLHA. Se o navegador fechar, o pagamento continua valendo. */
  function vigiarPagamento(id) {
    var comecou = Date.now();
    pararDeVigiar();
    vigiando = setInterval(async function () {
      if (Date.now() - comecou > 15 * 60 * 1000) {
        pararDeVigiar();
        mostrarEstado('O código venceu. Toque em "Pagar com PIX" para gerar outro.', 'frio');
        return;
      }
      try {
        var r = await chamar('pf-cobranca-status', { compra_id: id });
        var corpo = await r.json();
        if (corpo.status === 'pago') {
          pararDeVigiar();
          pagou(corpo.numero);
        }
      } catch (e) { /* uma falha de rede não desiste: tenta na próxima volta */ }
    }, 4000);
  }

  function pagou(numero) {
    if (elQr) elQr.hidden = true;
    var codigo = document.querySelector('.pix__codigo');
    if (codigo) codigo.hidden = true;
    if (elPrazo) elPrazo.hidden = true;
    mostrarEstado(
      'Pagamento confirmado' + (numero ? ' — compra nº ' + numero : '') +
      '. A equipe já está vendo o seu pedido.', 'pago');
    try { C.limpar(); } catch (e) {}
  }

  async function pagarComPix() {
    var form = document.getElementById('form-contato');
    if (form && window.PharmaFitValidacao &&
        !window.PharmaFitValidacao.conferir(form)) return;

    botao.disabled = true;
    var rotulo = botao.querySelector('[data-pagar-rotulo]');
    var antes = rotulo ? rotulo.textContent : '';
    if (rotulo) rotulo.textContent = 'Gerando o código…';

    function desistir(recado) {
      botao.disabled = false;
      if (rotulo) rotulo.textContent = antes;
      if (tela) tela.hidden = true;
      mostrarEstado(recado, 'frio');
      if (tela) { tela.hidden = false; }
    }

    try {
      var conta = C.conta();
      if (!conta.itens.length) return desistir('O carrinho está vazio.');

      var dados = {
        nome: valor('ct-nome'),
        telefone: valor('ct-zap'),
        endereco: valor('ct-endereco')
      };

      var id = await gravarCompra(conta, dados);
      if (!id) {
        return desistir('Não conseguimos abrir a compra agora. ' +
                        'Feche o pedido no WhatsApp, logo abaixo — a equipe resolve com você.');
      }

      var r = await chamar('pf-cobranca-criar', { compra_id: id, meio: 'pix' });
      var corpo = await r.json().catch(function () { return {}; });

      if (!r.ok || !corpo.copia_cola) {
        return desistir(corpo.erro
          ? 'Não deu para gerar o PIX: ' + corpo.erro + '. Feche no WhatsApp, logo abaixo.'
          : 'Não deu para gerar o PIX agora. Feche no WhatsApp, logo abaixo.');
      }

      if (tela) tela.hidden = false;
      if (elQr && corpo.qr) { elQr.src = corpo.qr; elQr.hidden = false; }
      if (elValor) elValor.textContent = moeda(corpo.valor);
      if (elCodigo) elCodigo.textContent = corpo.copia_cola;
      var codigo = document.querySelector('.pix__codigo');
      if (codigo) codigo.hidden = false;
      if (elPrazo) {
        elPrazo.hidden = false;
        elPrazo.textContent = 'Este código vale por uma hora.';
      }
      mostrarEstado('Esperando o pagamento…');
      botao.disabled = false;
      /* O RÓTULO VOLTA A SER O QUE ERA, e não "Gerar o código de novo".
         Medido em 320px: a frase mais longa quebra o botão em duas linhas,
         e botão principal em duas linhas fica desengonçado — é o mesmo
         problema que o "Fechar pedido no WhatsApp" já teve nesta tela.
         E "Pagar com PIX" continua verdade: tocar de novo devolve ESTE
         mesmo código, porque a cobrança é a mesma (a referência é o id da
         compra, e o servidor reaproveita em vez de abrir outra). */
      if (rotulo) rotulo.textContent = antes;
      tela.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      vigiarPagamento(id);
    } catch (e) {
      desistir('Não deu para gerar o PIX agora. Feche no WhatsApp, logo abaixo.');
    }
  }

  function valor(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  /* ---------- 4. ligar, se houver o que ligar ---------- */

  if (elCopiar && elCodigo) {
    elCopiar.addEventListener('click', function () {
      var texto = elCodigo.textContent || '';
      if (!texto) return;
      function avisar() {
        elCopiar.textContent = 'Copiado!';
        setTimeout(function () { elCopiar.textContent = 'Copiar código'; }, 2200);
      }
      /* `navigator.clipboard` não existe em http nem em navegador velho, e
         é justamente onde o cliente está. A seleção do texto é a reserva:
         pior que copiar sozinho, melhor que não dar para copiar. */
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(avisar, selecionar);
      } else {
        selecionar();
      }
      function selecionar() {
        try {
          var faixa = document.createRange();
          faixa.selectNodeContents(elCodigo);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(faixa);
          elCopiar.textContent = 'Copie o código selecionado';
        } catch (e) {}
      }
    });
  }

  if (botao) botao.addEventListener('click', pagarComPix);

  /* A PERGUNTA QUE DECIDE SE O BOTÃO EXISTE. Ela roda depois da tela
     montar, sem travar nada: o carrinho não espera por ela. */
  gatewayDePe().then(function (pronto) {
    if (pronto) caixaBotao.hidden = false;
  });

  window.PharmaFitPagamento = { gatewayDePe: gatewayDePe };
})();
