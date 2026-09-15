/* =========================================================
   PHARMA FIT — tela "Configurações" do painel em formato de app

   Feita a partir da foto do 595 Imports: cartão do negócio no topo,
   depois as seções Geral e Sistema, cada linha com ícone e seta.

   O QUE MUDA EM RELAÇÃO À FOTO, E POR QUÊ

   A foto tem sete linhas. A Pharma Fit tem tela de verdade para
   quatro. As outras três — Usuários, Formas de pagamento, Frete e
   envios, Relatórios automáticos — não existem em lugar nenhum do
   painel hoje.

   A regra do Brian é "ou funciona, ou não aparece na tela". Então
   essas linhas NÃO foram desenhadas bonitas para abrir o vazio: elas
   estão no fim da tela, escritas, dizendo o que falta. Assim ele
   escolhe qual quer que eu faça, em vez de descobrir clicando.

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
    {
      rotulo: 'Cotação das moedas',
      pe: 'Quanto vale o dólar, o guarani e o peso',
      icone: 'moeda',
      href: '../ajustes.html#bloco-cotacao'
    },
    {
      rotulo: 'Como está agora',
      pe: 'Confere se o painel está falando com o banco',
      icone: 'engrenagem',
      href: '../ajustes.html#bloco-diagnostico'
    }
  ];

  var SISTEMA = [
    {
      rotulo: 'Cópia de segurança',
      pe: 'Baixar tudo num arquivo, e restaurar de um',
      icone: 'escudo',
      href: '../ajustes.html#bloco-backup'
    },
    {
      rotulo: 'Tabelas do banco',
      pe: 'Quais tabelas são desta gestão',
      icone: 'tabela',
      href: '../ajustes.html#bloco-tabelas'
    }
  ];

  /* ---------- o que a foto pede e ainda não existe ---------- */

  var FALTA = [
    {
      nome: 'Usuários',
      porque: 'hoje quem entra no painel é quem está na tabela da equipe, e ' +
              'pôr alguém lá é comando no banco. Para virar tela eu preciso do ' +
              'e-mail de cada pessoa e de decidir quem pode o quê.'
    },
    {
      nome: 'Formas de pagamento',
      porque: 'o painel já registra como cada pedido foi pago, mas não existe ' +
              'lugar para cadastrar a lista. Enquanto o PIX não estiver ligado, ' +
              'essa tela mandaria pouco.'
    },
    {
      nome: 'Frete e envios',
      porque: 'a entrega hoje é combinada no WhatsApp, caso a caso. Uma tela de ' +
              'frete só serve depois que houver regra de preço por região.'
    },
    {
      nome: 'Relatórios automáticos',
      porque: 'depende de enviar e-mail sozinho, que é função de servidor. ' +
              'Dá para fazer, e é um pedido seu, não meu.'
    }
  ];

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
    document.querySelector('[data-sistema]').innerHTML = linhas(SISTEMA);

    var caixaFalta = document.querySelector('[data-bloco-falta]');
    if (FALTA.length) {
      caixaFalta.hidden = false;
      document.querySelector('[data-falta]').innerHTML = FALTA.map(function (f) {
        return '<li class="falta__item">' +
          '<b>' + esc(f.nome) + '</b> — ' + esc(f.porque) +
        '</li>';
      }).join('');
    }

    document.querySelector('[data-sair-aqui]').addEventListener('click', async function () {
      try { await Auth.sair(); } catch (e) {}
      location.replace('../login.html');
    });

    Moldura.animarEntrada('.bloco');
  })();
})();
