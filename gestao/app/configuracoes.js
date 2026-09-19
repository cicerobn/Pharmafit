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

  /* ---------- montar ---------- */

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
       cadastro pronto quando não está. */
    var zap = String(cfg.WHATSAPP || '').replace(/\D+/g, '');
    var elZap = document.querySelector('[data-empresa-zap]');
    if (zap) {
      var bonito = zap.length >= 12
        ? '+' + zap.slice(0, 2) + ' (' + zap.slice(2, 4) + ') ' +
          zap.slice(4, 9) + '-' + zap.slice(9)
        : zap;
      elZap.textContent = 'WhatsApp ' + bonito;
    } else {
      elZap.hidden = true;
    }

    var elDono = document.querySelector('[data-empresa-dono]');
    if (cfg.EMAIL_DONO) elDono.textContent = cfg.EMAIL_DONO;
    else elDono.hidden = true;

    document.querySelector('[data-geral]').innerHTML = linhas(GERAL);

    document.querySelector('[data-sair-aqui]').addEventListener('click', async function () {
      try { await Auth.sair(); } catch (e) {}
      location.replace('../login.html');
    });

    Moldura.animarEntrada('.bloco');
  })();
})();
