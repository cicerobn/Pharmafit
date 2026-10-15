/* =========================================================
   PHARMA FIT — tela "Configurações" do painel em formato de app

   Feita a partir da foto do 595 Imports: cartão do negócio no topo,
   depois as seções Geral e Sistema, cada linha com ícone e seta.

   O QUE A FOTO TEM E ESTA TELA NÃO TEM

   A foto tem sete linhas; a Pharma Fit tem tela de verdade para
   quatro. As outras — Usuários, Formas de pagamento, Frete e envios,
   Relatórios automáticos — não existem no painel, e por isso não
   estão aqui: a regra é "ou funciona, ou não aparece na tela".

   Eu tinha escrito um cartão no fim da tela listando essas quatro com
   o motivo de cada uma. Brian, 18/09/2026: "Tire isso aqui". A tela
   de configuração é para configurar, não para eu conversar com ele —
   o que falta fica no meu relatório.

   E o CNPJ da foto não está aqui de propósito: eu não tenho o CNPJ da
   Pharma Fit. Número de documento inventado numa tela de cadastro é o
   tipo de coisa que alguém copia acreditando.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Moldura = window.PharmaFitMoldura;
  var cfg = window.PHARMAFIT_CONFIG || {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- as linhas que LEVAM a algo que funciona ---------- */

  var GERAL = [
    {
      rotulo: 'Dados da empresa',
      pe: 'WhatsApp que recebe as vendas e e-mail do dono',
      icone: 'predio',
      href: '../ajustes.html#bloco-banco'
    },
    /* "COTAÇÃO DAS MOEDAS" E "COMO ESTÁ AGORA" SAÍRAM DAQUI, na mesma
       leva dos dois de baixo (Brian, 19/09/2026: "isso tambem").

       De novo: o atalho saiu, a função ficou. As duas moram em
       `ajustes.html` — a MESMA página que a linha acima abre. Quem
       entra em "Dados da empresa" cai na página onde as quatro coisas
       estão, uma embaixo da outra.

       A cotação não é enfeite: é ela que o site usa para mostrar preço
       em dólar, guarani e peso. Ela continua valendo e continua
       editável; só não tem mais uma linha própria neste menu. */
  ];

  /* AQUI MORAVA A SEÇÃO "SISTEMA", com dois atalhos: "Cópia de
     segurança" e "Tabelas do banco". Brian, 19/09/2026, com a foto do
     cartão: "Tire isso".

     AS DUAS COISAS CONTINUAM EXISTINDO, e isto não é descuido: o que
     saiu foi o ATALHO, não a função. Os dois blocos moram em
     `ajustes.html`, a MESMA página que as três linhas de "Geral" abrem
     — quem entra em "Dados da empresa" está na página onde eles estão,
     um pouco abaixo. Nenhuma tela ficou sem porta, que é o defeito que
     este painel passou uma semana caçando.

     Se um dia for para tirar de verdade, o que se apaga são os blocos
     em `ajustes.html` — e aí vale lembrar que a cópia de segurança é
     como este negócio se recupera se o banco sumir. */

  function linhas(lista) {
    return lista.map(function (i) {
      return '<li><a class="item" href="' + esc(i.href) + '">' +
        '<span class="item__icone">' + Moldura.svg(i.icone, 19, 1.6) + '</span>' +
        '<span class="item__corpo">' +
          '<span class="item__nome">' + esc(i.rotulo) + '</span>' +
          '<span class="item__linha">' + esc(i.pe) + '</span>' +
        '</span>' +
        '<span class="item__seta">' + Moldura.svg('seta', 17, 1.9) + '</span>' +
      '</a></li>';
    }).join('');
  }

  /* ---------- o WhatsApp do site ----------

     Brian, 24/09/2026: "editável o número para se esse for banido".
     A chave leva o prefixo `publico_` porque é ele que a regra do banco
     usa para o SITE poder ler (quem lê é o `assets/js/zap.js`). O resto
     da tabela de configurações continua só da equipe. */
  var CHAVE_ZAP = 'publico_whatsapp';
  var Dados = window.PharmaFitDados;
  var U = window.PharmaFitUtil;

  function bonito(n) {
    n = U.digitos(n);
    if (n.length === 13) return '+' + n.slice(0, 2) + ' (' + n.slice(2, 4) + ') ' + n.slice(4, 9) + '-' + n.slice(9);
    if (n.length === 12) return '+' + n.slice(0, 2) + ' (' + n.slice(2, 4) + ') ' + n.slice(4, 8) + '-' + n.slice(8);
    return n;
  }

  function ligarFormularioZap(doBanco, doArquivo, aoSalvar) {
    var form = document.querySelector('[data-zap-form]');
    if (!form) return;
    var campo = form.querySelector('[data-zap-numero]');
    var recado = form.querySelector('[data-zap-recado]');
    var botao = form.querySelector('[data-zap-salvar]');

    function dizer(texto, bom) {
      recado.hidden = false;
      recado.className = 'folha__recado folha__recado--' + (bom ? 'bom' : 'ruim');
      recado.textContent = texto;
    }

    /* O campo mostra o número que está valendo. Quando é o do arquivo,
       o campo vem com ele escrito — ninguém precisa adivinhar qual é. */
    campo.value = bonito(doBanco || doArquivo);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var bruto = campo.value.trim();

      /* Campo vazio é um pedido de verdade: "volte para o número de
         sempre". Salvo vazio, e o site cai no número do arquivo. */
      var numero = bruto ? U.whatsapp(bruto) : '';
      if (bruto && !numero) {
        dizer('Esse número não serve para o WhatsApp. Escreva com o DDD, ' +
              'por exemplo (92) 99999-9999.', false);
        campo.focus();
        return;
      }

      botao.disabled = true;
      botao.textContent = 'Salvando…';
      try {
        var r = await Dados.salvarConfig(CHAVE_ZAP, numero);
        if (r && r.ok === false) throw new Error(r.erro || 'o banco recusou');
        campo.value = bonito(numero || doArquivo);
        aoSalvar(numero || doArquivo);
        dizer(numero
          ? 'Salvo. O site passa a usar ' + bonito(numero) + ' — em quem já está ' +
            'com uma página aberta, a partir da próxima que abrir.'
          : 'Número apagado. O site volta a usar o número padrão, ' + bonito(doArquivo) + '.', true);
      } catch (err) {
        dizer('Não consegui salvar: ' + (err && err.message ? err.message : 'erro desconhecido') +
              '. O número antigo continua valendo.', false);
      } finally {
        botao.disabled = false;
        botao.textContent = 'Salvar número';
      }
    });
  }

  /* ---------- a mensagem que chega no WhatsApp ----------

     Brian, 15/10/2026: "aqui tem que ter como editar no painel, a
     mensagem que aparece".

     O texto de fábrica, a lista de peças e a troca das peças vêm de
     `assets/js/mensagem-pedido.js` — o MESMO arquivo que o carrinho usa
     para montar a mensagem de verdade. Por isso a prévia daqui não é uma
     imitação: é a mesma conta, com um pedido de exemplo no lugar do
     pedido real. Se um dia a montagem mudar, a prévia muda junto,
     sozinha.

     A CHAVE leva o prefixo `publico_` porque é ele que a regra do banco
     usa para o SITE poder ler. */
  function ligarFormularioMensagem() {
    var form = document.querySelector('[data-msg-form]');
    var M = window.PharmaFitMensagemPedido;
    if (!form) return;

    /* Sem o arquivo do modelo não há o que editar, e um formulário que
       não faz nada é pior que formulário nenhum: some da tela. */
    if (!M) {
      form.closest('section').hidden = true;
      var rotulo = form.closest('section').previousElementSibling;
      if (rotulo && rotulo.classList.contains('rotulo-secao')) rotulo.hidden = true;
      return;
    }

    var campo = form.querySelector('[data-msg-texto]');
    var previa = form.querySelector('[data-msg-previa]');
    var recado = form.querySelector('[data-msg-recado]');
    var botao = form.querySelector('[data-msg-salvar]');
    var comCupom = form.querySelector('[data-msg-com-cupom]');

    form.querySelector('[data-msg-pecas]').innerHTML = M.pecas.map(function (p) {
      return '<li><code>{' + p.chave + '}</code> <span>' + esc(p.diz) + '</span></li>';
    }).join('');

    function dizer(texto, bom) {
      recado.hidden = !texto;
      recado.className = 'folha__recado folha__recado--' + (bom ? 'bom' : 'ruim');
      recado.textContent = texto || '';
    }

    /* A PRÉVIA, com a mesma função que monta a mensagem de verdade. */
    function pintarPrevia() {
      var exemplo = comCupom.checked ? M.exemploComCupom : M.exemplo;
      previa.textContent = M.aplicar(campo.value, exemplo);
      /* o aviso do que está errado aparece enquanto se escreve, e não só
         ao tentar salvar — assim ninguém digita trinta linhas para
         descobrir no fim que faltava uma peça */
      var porque = M.porQueNaoServe(campo.value);
      if (porque) dizer(porque, false);
      else if (campo.value.length > M.limite) {
        dizer('A mensagem está com ' + campo.value.length + ' caracteres, e o limite é ' +
              M.limite + '. Mensagem muito comprida é recusada pelo WhatsApp.', false);
      } else dizer('', true);
    }

    campo.addEventListener('input', pintarPrevia);
    comCupom.addEventListener('change', pintarPrevia);

    form.querySelector('[data-msg-padrao]').addEventListener('click', function () {
      campo.value = M.padrao;
      pintarPrevia();
      dizer('Este é o texto de fábrica. Toque em "Salvar mensagem" para valer no site.', true);
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var texto = campo.value;

      /* NÃO SALVA MENSAGEM QUEBRADA. Mensagem sem produto ou sem total
         chega na conversa sem dizer o quê nem quanto — e quem ia
         descobrir é quem atende, no meio de um atendimento. */
      var porque = M.porQueNaoServe(texto);
      if (porque) { dizer(porque, false); campo.focus(); return; }
      if (texto.length > M.limite) {
        dizer('A mensagem está com ' + texto.length + ' caracteres, e o limite é ' +
              M.limite + '.', false);
        campo.focus();
        return;
      }

      botao.disabled = true;
      var antes = botao.textContent;
      botao.textContent = 'Salvando…';
      try {
        /* Texto igual ao de fábrica é salvo VAZIO: assim o site usa o de
           fábrica de verdade, e uma melhoria futura no texto padrão
           chega para quem nunca editou nada. */
        var guardar = (texto.trim() === M.padrao.trim()) ? '' : texto;
        var r = await Dados.salvarConfig(M.chave, guardar);
        if (r && r.ok === false) throw new Error(r.erro || 'o banco recusou');
        dizer(guardar
          ? 'Salvo. A próxima pessoa que abrir o carrinho já manda a mensagem nova.'
          : 'Salvo — a mensagem voltou a ser a de fábrica.', true);
      } catch (err) {
        dizer('Não consegui salvar: ' + (err && err.message ? err.message : 'erro desconhecido') +
              '. A mensagem antiga continua valendo.', false);
      } finally {
        botao.disabled = false;
        botao.textContent = antes;
      }
    });

    /* o que está valendo hoje; vazio no banco significa "a de fábrica" */
    return async function carregar() {
      var doBanco = '';
      try { doBanco = await Dados.lerConfig(M.chave, ''); } catch (e) { doBanco = ''; }
      campo.value = M.serve(doBanco) ? doBanco : M.padrao;
      pintarPrevia();
    };
  }

  /* ---------- montar ---------- */

  /* ---------- VERIFICAÇÃO EM DUAS ETAPAS (25/09/2026) ---------- */
  function ligarDuasEtapas() {
    var q = function (n) { return document.querySelector('[data-2e-' + n + ']'); };
    var botao = q('botao');
    var fase = 'carregando';   /* desligada | ativando | ligada */
    var fatorNovo = null;
    var fatorAtivo = null;

    function dizer(texto, bom) {
      var r = q('recado');
      r.hidden = !texto;
      r.className = 'folha__recado folha__recado--' + (bom ? 'bom' : 'ruim');
      r.textContent = texto || '';
    }

    async function pintar() {
      var estado = await Auth.duasEtapas();
      q('passos').hidden = true;
      if (!estado) {
        q('estado').textContent = 'Não consegui conferir agora (sem conexão com o banco).';
        botao.hidden = true;
        return;
      }
      fatorAtivo = estado.fator;
      if (estado.ativa) {
        fase = 'ligada';
        q('estado').innerHTML = '<span class="marca marca--pago">Ativa</span> Entrar no painel pede o código do celular.';
        botao.textContent = 'Desativar verificação em duas etapas';
        botao.className = 'botao';
      } else {
        fase = 'desligada';
        q('estado').innerHTML = '<span class="marca marca--pendente">Desligada</span> Hoje só a senha protege o painel.';
        botao.textContent = 'Ativar verificação em duas etapas';
        botao.className = 'botao botao--forte';
      }
      botao.hidden = false;
    }

    botao.addEventListener('click', async function () {
      dizer('');
      botao.disabled = true;
      try {
        if (fase === 'desligada') {
          var r = await Auth.iniciarDuasEtapas();
          if (!r.ok) return dizer('Não consegui começar: ' + r.erro, false);
          fatorNovo = r.id;
          q('qr').src = r.qr;
          q('chave').textContent = r.segredo;
          q('passos').hidden = false;
          q('codigo').value = '';
          q('codigo').focus();
          fase = 'ativando';
          botao.textContent = 'Confirmar e ativar';
        } else if (fase === 'ativando') {
          var c = await Auth.confirmarDuasEtapas(fatorNovo, q('codigo').value);
          if (!c.ok) return dizer(c.erro, false);
          dizer('Pronto: a verificação em duas etapas está ativa. Da próxima vez que entrar, o painel ' +
                'vai pedir o código do app. Guarde o celular com cuidado.', true);
          await pintar();
        } else if (fase === 'ligada') {
          if (!window.confirm('Desativar a verificação em duas etapas? O painel volta a ser protegido só pela senha.')) return;
          var d = await Auth.desligarDuasEtapas(fatorAtivo && fatorAtivo.id);
          if (!d.ok) return dizer('Não desativei: ' + d.erro, false);
          dizer('Verificação em duas etapas desativada.', true);
          await pintar();
        }
      } finally {
        botao.disabled = false;
      }
    });

    pintar();
  }

  (async function () {
    var user = await Auth.exigirLogin('../login.html');
    if (!user) return;

    await Moldura.montar({ aba: 'mais' });
    Moldura.aoNovo(function () { location.href = '../index.html#novo'; });

    /* setas e ícone de voltar, do mesmo desenho do resto do painel */
    document.querySelector('[data-volta]').innerHTML = Moldura.svg('volta', 20, 1.9);
    document.querySelector('[data-empresa-seta]').innerHTML = Moldura.svg('seta', 17, 1.9);

    /* O cartão do negócio mostra o que ESTÁ cadastrado. Campo sem valor
       não vira "—" nem texto de exemplo: ele sai da tela, senão parece
       cadastro pronto quando não está.
       O WhatsApp é o que o SITE usa de fato: o do banco quando a equipe
       salvou um (bloco logo abaixo), senão o do arquivo de configuração. */
    var DO_ARQUIVO = U.digitos(cfg.WHATSAPP);
    var elZap = document.querySelector('[data-empresa-zap]');
    function pintarCartaoZap(numero) {
      if (numero) {
        elZap.hidden = false;
        elZap.textContent = 'WhatsApp ' + bonito(numero);
      } else {
        elZap.hidden = true;
      }
    }

    var doBanco = '';
    try { doBanco = U.digitos(await Dados.lerConfig(CHAVE_ZAP, '')); } catch (e) { doBanco = ''; }
    pintarCartaoZap(doBanco || DO_ARQUIVO);
    ligarFormularioZap(doBanco, DO_ARQUIVO, pintarCartaoZap);

    var carregarMensagem = ligarFormularioMensagem();
    if (carregarMensagem) await carregarMensagem();

    var elDono = document.querySelector('[data-empresa-dono]');
    if (cfg.EMAIL_DONO) elDono.textContent = cfg.EMAIL_DONO;
    else elDono.hidden = true;

    document.querySelector('[data-geral]').innerHTML = linhas(GERAL);

    ligarDuasEtapas();

    document.querySelector('[data-sair-todos]').addEventListener('click', async function () {
      if (!window.confirm('Encerrar o acesso ao painel em TODOS os aparelhos (este também)? ' +
                          'Use se perdeu o celular ou acha que a senha vazou.')) return;
      var r = await Auth.sairDeTodos();
      if (!r.ok) { window.alert('Não consegui: ' + r.erro); return; }
      location.replace('../login.html');
    });

    document.querySelector('[data-sair-aqui]').addEventListener('click', async function () {
      try { await Auth.sair(); } catch (e) {}
      location.replace('../login.html');
    });

    Moldura.animarEntrada('.bloco');
  })();
})();
