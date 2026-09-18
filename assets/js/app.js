/* =========================================================
   PHARMA FIT — interações da interface
   ========================================================= 
   precisa: carrinho
   enche: data-carrinho-contador

   O CONTADOR DO CARRINHO LÊ `window.PharmaFitCarrinho` NA HORA em que
   este arquivo roda, e desiste em silêncio se ele não existir. Em
   `carrinho.html` o `carrinho.js` vinha DEPOIS deste — então, na
   própria página do carrinho, o contador nunca rodou. Ninguém notou
   porque ali a lista está na tela; ficou visível em 17/09/2026, quando
   o ícone do carrinho saiu da barra de cima e o número passou a ser o
   único aviso. Defeito antigo, achado por uma medição nova.
*/
(function () {
  'use strict';

  /* ---------- menu lateral ---------- */
  var drawer = document.querySelector('[data-drawer]');
  var quemAbriu = null;

  function toggleDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    drawer.setAttribute('aria-hidden', String(!open));

    document.querySelectorAll('[data-drawer-open]').forEach(function (b) {
      b.setAttribute('aria-expanded', String(open));
    });

    if (open) {
      /* Guarda quem abriu para devolver o foco na hora de fechar. Sem
         isso, quem usa teclado fecha o menu e o foco volta para o começo
         da página, perdendo o lugar onde estava. */
      quemAbriu = document.activeElement;
      var primeiro = drawer.querySelector('.drawer__nav a, .drawer__quem');
      if (primeiro) primeiro.focus({ preventScroll: true });
    } else if (quemAbriu && quemAbriu.focus) {
      quemAbriu.focus({ preventScroll: true });
      quemAbriu = null;
    }
  }

  document.querySelectorAll('[data-drawer-open]').forEach(function (el) {
    el.addEventListener('click', function () { toggleDrawer(true); });
  });
  document.querySelectorAll('[data-drawer-close]').forEach(function (el) {
    el.addEventListener('click', function () { toggleDrawer(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') toggleDrawer(false);
  });

  /* ---------------------------------------------------------------
     A GESTÃO NÃO APARECE PARA TODO MUNDO

     O item "Gestão (equipe)" estava na barra lateral de todas as
     páginas, visível para qualquer visitante. Ele saiu do HTML e
     passa a ser posto aqui, e só quando existe sessão do painel NESTE
     APARELHO — ou seja, só para quem já entrou com o login da equipe.

     DUAS COISAS QUE ISTO NÃO É, e é importante não confundir:

     1. NÃO é segurança. Quem proteje o painel é a tela de login e as
        regras do banco (a RLS, provada em gestao/supabase/PROVA.md).
        Esconder o link só faz o painel parar de ser anunciado a quem
        não tem nada a ver com ele. Alguém que descubra o endereço
        continua sendo barrado no login, como antes.

     2. NÃO é um jeito de saber quem é da equipe. É só um sinal deste
        navegador. Se a equipe limpar os dados do navegador, o link
        desaparece e o caminho é digitar o endereço do painel
        (/gestao/login.html) — o que continua funcionando.
     --------------------------------------------------------------- */
  function porGestaoSeForDaEquipe() {
    var nav_ = drawer && drawer.querySelector('.drawer__nav');
    if (!nav_) return;

    var cfg = window.PHARMAFIT_CONFIG || {};
    var chave = cfg.STORAGE_KEY || 'pharmafit_gestao_auth';

    var entrou = false;
    try {
      /* O painel guarda a sessão de verdade no localStorage, e a de
         demonstração no sessionStorage. Qualquer uma das duas quer
         dizer "esta pessoa usa o painel neste aparelho". */
      entrou = !!(localStorage.getItem(chave) || sessionStorage.getItem(chave + '_demo'));
    } catch (e) { entrou = false; }

    if (!entrou) return;

    /* O caminho depende da profundidade da página: o 404 pode ser
       servido em qualquer endereço. */
    var pasta = location.pathname.replace(/[^/]*$/, '');
    var fundo = pasta.split('/').filter(Boolean).length;
    var destino = new Array(fundo + 1).join('../') + 'gestao/login.html';

    var a = document.createElement('a');
    a.href = destino;
    a.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 ' +
      '2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg><span>Gestão (equipe)</span>';
    nav_.appendChild(a);
  }

  if (drawer) {
    porGestaoSeForDaEquipe();

    /* Numera os itens para eles entrarem em cascata, e marca a página
       em que a pessoa já está. A numeração vem DEPOIS de pôr a gestão,
       senão o item novo ficaria sem atraso e entraria antes dos
       outros, fora da cascata. */
    var aqui = location.pathname.split('/').pop() || 'index.html';
    var itens = drawer.querySelectorAll('.drawer__nav a');

    Array.prototype.forEach.call(itens, function (a, i) {
      a.style.setProperty('--i', String(i));
      var destino = (a.getAttribute('href') || '').split(/[?#]/)[0];
      if (destino && destino === aqui) a.setAttribute('aria-current', 'page');
      /* Tocar num item fecha o menu: sem isto, quem clica em "Produtos"
         vê o menu continuar aberto por cima da página nova por um
         instante, e parece que o toque não pegou. */
      a.addEventListener('click', function () { toggleDrawer(false); });
    });

    /* Arrastar para a direita fecha — o menu entra por esse lado, então
       é o gesto que a mão espera. */
    var x0 = null;
    var painel = drawer.querySelector('.drawer__panel');
    if (painel) {
      painel.addEventListener('touchstart', function (e) {
        x0 = e.touches[0].clientX;
      }, { passive: true });
      painel.addEventListener('touchmove', function (e) {
        if (x0 === null) return;
        if (e.touches[0].clientX - x0 > 60) { toggleDrawer(false); x0 = null; }
      }, { passive: true });
    }
  }

  /* ---------- o carrinho ----------
   *
   * O contador do topo e o botão "Adicionar" dos cartões. Ficam aqui, no
   * app.js, porque o topo existe em toda página — e não só nas que têm
   * grade de produtos.
   */
  (function () {
    var C = window.PharmaFitCarrinho;
    if (!C) return;

    function contar() {
      var quantos = C.quantos();
      document.querySelectorAll('[data-carrinho-contador]').forEach(function (b) {
        b.hidden = quantos === 0;
        b.textContent = quantos > 99 ? '99+' : String(quantos);
      });
    }

    contar();
    window.addEventListener(C.EVENTO, contar);
    /* Outra aba mexeu no carrinho: o contador desta também acompanha. */
    window.addEventListener('storage', function (e) {
      if (e.key === 'pharmafit_carrinho') contar();
    });

    /* O botão é delegado no documento porque a grade de produtos é
       desenhada depois deste código rodar — ligar um a um pegaria só os
       cartões que já existissem. */
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-por-no-carrinho]');
      if (!b) return;

      C.por(b.getAttribute('data-por-no-carrinho'), 1);

      /* O aviso vai no próprio botão, por um instante. Somar ao carrinho
         sem nenhum sinal deixa a pessoa clicando de novo e levando três. */
      var texto = b.querySelector('span');
      if (b.dataset.ocupado === '1') return;
      b.dataset.ocupado = '1';

      var antes = texto ? texto.textContent : '';
      b.classList.add('is-feito');
      if (texto) texto.textContent = 'No carrinho';

      setTimeout(function () {
        b.classList.remove('is-feito');
        if (texto) texto.textContent = antes;
        b.dataset.ocupado = '0';
      }, 1400);
    });
  })();

  /* ---------- quem está usando: botão do topo e alto do menu ----------
   *
   * Hoje o site não tem senha: a "conta" é o nome e o WhatsApp guardados
   * no próprio aparelho (assets/js/minha-area.js). Então o botão mostra
   * "Entrar" para quem o site ainda não conhece, e o primeiro nome de
   * quem já se identificou — e leva para a conta, que existe e funciona.
   *
   * Quando a conta com e-mail e senha entrar no ar, é este mesmo botão
   * que passa a abrir o login de verdade. */
  /* ESTA PARTE ESPERA O RESTO CARREGAR.
   *
   * O app.js e incluido ANTES do minha-area.js nas paginas (linha 284
   * contra 290 no index). Lendo `window.PharmaFitArea` na hora, ele nao
   * existe ainda — e o botao ficava dizendo "Entrar" para quem o site
   * ja conhecia, sem erro nenhum na tela.
   *
   * Reordenar as tags seria mexer na ordem de dez arquivos por causa de
   * um; esperar o documento ficar pronto resolve num lugar so. E se o
   * PharmaFitArea nao aparecer nem assim, o botao continua dizendo
   * "Entrar", que e a verdade: o site nao sabe quem e. */
  function quandoPronto(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  quandoPronto(function () {
    var Area = window.PharmaFitArea;
    var nome = '';
    try { nome = String((Area && Area.dados().nome) || '').trim(); } catch (e) { nome = ''; }

    var primeiro = nome ? nome.split(/\s+/)[0] : '';
    if (primeiro) primeiro = primeiro.charAt(0).toUpperCase() + primeiro.slice(1);

    var paginaAtual = location.pathname.split('/').pop() || 'index.html';

    /* Sem nome, o botão leva para ENTRAR; com nome, para a conta. O
       destino tem de combinar com o que está escrito nele: "Entrar"
       levando para uma tela de dados já preenchidos confunde, e "Brian"
       levando para o login parece que o site esqueceu quem ele é. */
    var destinoConta = primeiro ? 'conta.html' : 'entrar.html';

    document.querySelectorAll('[data-conta-botao]').forEach(function (b) {
      /* No 404 os caminhos são absolutos: ele é servido em qualquer
         endereço, e um caminho relativo ali aponta para o vazio. */
      var absoluto = (b.getAttribute('href') || '').charAt(0) === '/';
      b.setAttribute('href', (absoluto ? '/' : '') + destinoConta);

      var alvo = b.querySelector('[data-conta-nome]');
      if (alvo) alvo.textContent = primeiro || 'Entrar';
      b.classList.toggle('is-dentro', !!primeiro);
      b.setAttribute('aria-label', primeiro ? 'Minha conta, ' + primeiro : 'Entrar na minha conta');

      /* Na propria pagina da conta ele nao se aponta a si mesmo: fica
         marcado como "voce esta aqui". Botao que recarrega a mesma
         pagina parece que nao funcionou. */
      if ((b.getAttribute('href') || '').split('/').pop() === paginaAtual) {
        b.setAttribute('aria-current', 'page');
      }
    });

    var caixa = drawer && drawer.querySelector('[data-drawer-quem]');
    if (caixa) {
      var absolutoGaveta = (caixa.getAttribute('href') || '').charAt(0) === '/';
      caixa.setAttribute('href', (absolutoGaveta ? '/' : '') + destinoConta);
      caixa.querySelector('[data-drawer-inicial]').textContent =
        primeiro ? primeiro.charAt(0).toUpperCase() : '?';
      caixa.querySelector('[data-drawer-nome]').textContent = primeiro || 'Entrar na conta';
      caixa.querySelector('[data-drawer-pe]').textContent = primeiro
        ? 'Ver meus pedidos'
        : 'Para acompanhar seus pedidos';
    }
  });

  /* ---------- busca ---------- */
  var searchToggle = document.querySelector('[data-search-toggle]');
  var searchBar = document.querySelector('[data-searchbar]');

  if (searchToggle && searchBar) {
    searchToggle.addEventListener('click', function () {
      var open = searchBar.classList.toggle('is-open');
      searchToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        var field = searchBar.querySelector('input');
        if (field) field.focus();
      }
    });
  }

  /* ---------- a foto do produto atravessa as duas telas ----------

     Brian, 18/09/2026: "Deixe animacao legal ao entrar e sair de um
     produto". O navegador já cruza as duas telas (a regra
     `@view-transition` no CSS). Isto aqui é o detalhe que faz parecer
     um aplicativo: a foto do cartão TOCADO recebe o mesmo nome de
     transição que a foto da página do produto, e o navegador entende
     que é a mesma coisa — ela voa da vitrine para a ficha e cresce no
     caminho, em vez de piscar.

     SÓ UM CARTÃO POR VEZ, e isso não é detalhe: dois elementos com o
     mesmo nome de transição fazem o navegador desistir da animação
     inteira. Por isso eu limpo o nome antes de pôr, e limpo de novo
     quando a pessoa volta (o navegador guarda a página como estava, e
     sem isso o segundo toque não animaria).

     Não mexe em navegação nenhuma: só marca o elemento e deixa o link
     seguir. Se o aparelho não souber fazer transição, o clique continua
     sendo um clique comum. */

  var NOME_FOTO = 'produto-foto';

  function limparFotoVoando() {
    var antes = document.querySelector('[data-foto-voando]');
    if (!antes) return;
    antes.style.removeProperty('view-transition-name');
    antes.removeAttribute('data-foto-voando');
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="produto.html?p="]');
    if (!link) return;
    /* abrir em outra aba não troca esta tela; animar aqui seria mentira */
    if (e.metaKey || e.ctrlKey || e.shiftKey || link.target === '_blank') return;

    var foto = link.matches('.protocol')
      ? link.querySelector('.protocol__media img')
      : (link.closest('.product') || link).querySelector('.product__media img, img');
    if (!foto) return;

    limparFotoVoando();
    foto.style.setProperty('view-transition-name', NOME_FOTO);
    foto.setAttribute('data-foto-voando', '');
  });

  /* Voltar traz a página do jeito que ela estava, com o nome ainda
     posto. Limpo aqui para o toque seguinte animar igual. */
  window.addEventListener('pageshow', limparFotoVoando);
  window.addEventListener('popstate', limparFotoVoando);

  /* ---------- o botão de voltar ----------

     Brian, 18/09/2026: "ao clicar em algum produto que tenha icone de
     voltar".

     `history.back()` quando há para onde voltar DENTRO do site, e o
     endereço da lista de produtos quando não há — quem abriu o link
     direto do WhatsApp não tem história nenhuma, e um botão de voltar
     que não faz nada é pior que nenhum botão. O `referrer` diz se a
     tela anterior era nossa. */
  document.querySelectorAll('[data-voltar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var deCasa = document.referrer &&
        document.referrer.indexOf(location.origin) === 0;
      if (deCasa && history.length > 1) history.back();
      else location.href = b.getAttribute('data-voltar') || 'produtos.html';
    });
  });

  /* ---------- carrossel de produtos ---------- */
  var carousel = document.querySelector('[data-carousel]');
  var dotsBox = document.querySelector('[data-dots]');

  if (carousel && dotsBox) {
    var slides = Array.prototype.slice.call(carousel.children);

    slides.forEach(function (slide, i) {
      var dot = document.createElement('button');
      dot.className = 'dot' + (i === 0 ? ' is-active' : '');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Ir para o produto ' + (i + 1));
      dotsBox.appendChild(dot);
    });

    var dots = Array.prototype.slice.call(dotsBox.children);

    function irPara(i) {
      var slide = slides[i];
      if (!slide) return;
      carousel.scrollTo({ left: slide.offsetLeft - carousel.offsetLeft, behavior: 'smooth' });
    }

    /**
     * Escolhe a bolinha pela posição do toque, e não pelo alvo do
     * evento: as bolinhas são pequenas e ficam coladas, e nesse
     * caso o navegador às vezes entrega o clique para a vizinha —
     * o dedo acertava uma e o carrossel pulava para outra.
     */
    dotsBox.addEventListener('click', function (e) {
      var x = e.clientX;
      var escolhida = -1;
      var menor = Infinity;

      dots.forEach(function (d, i) {
        var r = d.getBoundingClientRect();
        var dist = Math.abs((r.left + r.right) / 2 - x);
        if (dist < menor) { menor = dist; escolhida = i; }
      });

      if (escolhida >= 0) irPara(escolhida);
    });

    /* teclado: o alvo do evento é confiável aqui */
    dotsBox.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var dot = e.target.closest('.dot');
      if (!dot) return;
      e.preventDefault();
      irPara(dots.indexOf(dot));
    });
    var raf = null;

    carousel.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var center = carousel.scrollLeft + carousel.clientWidth / 2;
        var current = 0;
        var best = Infinity;

        slides.forEach(function (slide, i) {
          var mid = slide.offsetLeft - carousel.offsetLeft + slide.offsetWidth / 2;
          var dist = Math.abs(mid - center);
          if (dist < best) { best = dist; current = i; }
        });

        dots.forEach(function (dot, i) {
          dot.classList.toggle('is-active', i === current);
        });
      });
    }, { passive: true });
  }

  /** Mostra um aviso quando nenhum produto sobra na vitrine. */
  function conferirVitrine() {
    var grade = document.querySelector('[data-grade]');
    if (!grade) return;

    var visiveis = grade.querySelectorAll('.product:not(.is-hidden)').length;
    var aviso = document.getElementById('vitrine-vazia');

    if (!aviso) {
      aviso = document.createElement('div');
      aviso.id = 'vitrine-vazia';
      aviso.className = 'vazio-bloco vazio-bloco--enxuto';
      aviso.innerHTML =
        '<p class="vazio-bloco__titulo">Nada encontrado</p>' +
        '<p class="vazio-bloco__texto">Tente outra busca ou veja todas as categorias.</p>' +
        '<button class="btn btn--outline" type="button" data-limpar-filtros>Ver tudo</button>';
      grade.parentNode.insertBefore(aviso, grade.nextSibling);

      aviso.querySelector('[data-limpar-filtros]').addEventListener('click', function () {
        var campo = document.querySelector('[data-search-field]');
        if (campo) campo.value = '';
        /* "Ver tudo" deixava a fila de categorias SEM NENHUM marcado —
           nem o "Todos". A lista voltava a mostrar tudo e a barra em
           cima não dizia o que estava mostrando. Agora ele passa pelo
           mesmo caminho do toque em "Todos": marca o chip, esquece a
           categoria escolhida e refaz o filtro.
           Limpar na mão, como era aqui, deixava a categoria ESCOLHIDA
           na memória — e ela voltava sozinha no próximo redesenho. */
        escolherCategoria('todos');
      });
    }

    aviso.hidden = visiveis > 0;
  }

  /* ---------- movimento na troca de categoria ---------- */

  var MENOS_MOVIMENTO = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Reanima os cartoes que ficaram visiveis.
   *
   * A animacao e na ENTRADA, e nao na saida: o filtro esconde com
   * `display:none`, e display nao tem meio caminho para transicionar.
   *
   * O atraso cresce por cartao, para a grade se montar em cascata — mas
   * PARA de crescer no 12o. Sem esse limite, numa vitrine de cinquenta
   * produtos o ultimo apareceria mais de um segundo depois, e um site que
   * demora a desenhar nao parece elegante, parece quebrado.
   */
  function animarEntrada(grade) {
    if (MENOS_MOVIMENTO || !grade) return;

    var visiveis = grade.querySelectorAll('.product:not(.is-hidden)');

    Array.prototype.forEach.call(visiveis, function (card, i) {
      /* Tirar e repor a classe nao basta: o navegador junta as duas
         mudancas no mesmo quadro e a animacao nao recomeca. Ler uma
         medida do elemento no meio obriga ele a aplicar a remocao antes
         — e sem isso, filtrar duas vezes seguidas nao anima na segunda. */
      card.classList.remove('is-entrando');
      void card.offsetWidth;

      card.style.setProperty('--i', String(Math.min(i, 12)));
      card.classList.add('is-entrando');

      card.addEventListener('animationend', function () {
        card.classList.remove('is-entrando');
        card.style.removeProperty('--i');
      }, { once: true });
    });
  }

  /* =========================================================
     FILTRO DE CATEGORIA E BUSCA

     PERGUNTAR PELOS ELEMENTOS NA HORA DE USAR — NUNCA GUARDAR A LISTA.

     Aqui morava `var chips = querySelectorAll(...)` e
     `var products = querySelectorAll(...)`, lidos UMA vez, no
     carregamento, com um `addEventListener` em cada chip.

     E a vitrine é redesenhada depois disso. Quando o banco responde
     (`pharmafit-catalogo`), `loja.js` monta de novo a barra de chips e
     a grade de produtos: os elementos que estavam nestas duas listas
     deixam de existir, e os novos nascem SEM o clique preso neles.

     O tamanho do estrago, medido em 18/09/2026 em produtos.html:

       · sem banco (que é como as minhas medições rodavam): tocar em
         "Retatrutida" filtra — 1 produto na tela;
       · com o banco respondendo, que é o site NO AR: tocar em qualquer
         categoria não faz nada. Nada. Os 11 produtos ficam, o chip não
         marca;
       · e a BUSCA POR TEXTO também morre, pelo mesmo motivo: digitar
         "Klow" deixava os 11 na tela.

     Ninguém vê erro: o dedo toca, o site pisca e continua igual. É o
     pior tipo de defeito, e estava no ar.

     Duas mudanças consertam a classe inteira do problema:

       1. o clique é ouvido no DOCUMENTO, não em cada chip. Documento
          não é redesenhado;
       2. a lista de produtos é lida DENTRO de cada função, no momento
          do uso.

     E, como a barra renasce marcando "Todos", a escolha da pessoa é
     reaplicada depois do redesenho — senão o banco respondendo no meio
     do caminho desfazia o filtro que ela acabou de escolher.
     ========================================================= */

  function osChips() { return document.querySelectorAll('[data-chip]'); }
  function osProdutos() { return document.querySelectorAll('[data-category]'); }

  var categoriaEscolhida = 'todos';

  function marcarChip(valor) {
    osChips().forEach(function (c) {
      var ativo = c.getAttribute('data-chip') === valor;
      c.classList.toggle('is-active', ativo);
      c.setAttribute('aria-pressed', String(ativo));
    });
  }

  /* UM FILTRO SÓ, COM AS DUAS CONTAS JUNTAS.
     A categoria e a busca mexiam no mesmo `is-hidden`, cada uma por
     sua conta, e a última a rodar apagava a outra: com "Retatrutida"
     marcado, procurar "Klow" (que é um peptídeo) mostrava o Klow — e o
     chip continuava dizendo Retatrutida. O chip mentia.
     Agora um cartão aparece se passar nas DUAS, e quando nada passa o
     aviso "Nada encontrado" explica, com o botão de ver tudo. */
  function aplicarFiltro() {
    var busca = document.querySelector('[data-search-field]');
    var termo = busca ? busca.value.trim().toLowerCase() : '';

    osProdutos().forEach(function (card) {
      var cats = (card.getAttribute('data-category') || '').split(' ');
      var daCategoria = categoriaEscolhida === 'todos' ||
        cats.indexOf(categoriaEscolhida) !== -1;
      var daBusca = termo === '' ||
        card.textContent.toLowerCase().indexOf(termo) !== -1;
      card.classList.toggle('is-hidden', !(daCategoria && daBusca));
    });
  }

  /* MARCAR O CHIP ENTRA NA MESMA ANIMAÇÃO QUE FILTRAR.

     Isto acontecia antes de a animação começar — e a animação funciona
     tirando um retrato do "antes" e outro do "depois". Marcado antes,
     os dois retratos já saíam com a pílula colorida no chip novo: ela
     trocava de lugar num quadro só, e apenas a lista se movia.

     Dentro da animação, o "antes" tem a pílula no chip velho, o
     "depois" tem no novo, e o navegador cruza as duas — é essa a
     animação da troca de categoria que o Brian pediu.

     `startViewTransition` também MOVE os cartões que ficaram para o
     lugar novo, em vez de eles saltarem de posição. Onde ele não
     existe, cai na cascata de sempre (`animarEntrada`). */
  function escolherCategoria(valor) {
    categoriaEscolhida = valor;

    function agora() {
      marcarChip(valor);
      aplicarFiltro();
      conferirVitrine();
    }

    if (!MENOS_MOVIMENTO && document.startViewTransition) {
      document.startViewTransition(agora);
    } else {
      agora();
      animarEntrada(document.querySelector('[data-grade]'));
    }
  }

  /* O clique vive no documento: chip redesenhado continua funcionando. */
  document.addEventListener('click', function (e) {
    var chip = e.target.closest ? e.target.closest('[data-chip]') : null;
    if (!chip) return;
    escolherCategoria(chip.getAttribute('data-chip'));
  });

  /* Depois de o banco redesenhar a vitrine, a escolha da pessoa volta.
     `loja.js` registra o ouvinte dele antes deste arquivo, então
     quando este roda a grade nova já está na tela. */
  document.addEventListener('pharmafit-catalogo', function () {
    if (!osProdutos().length) return;
    marcarChip(categoriaEscolhida);
    aplicarFiltro();
    conferirVitrine();
  });

  /* ---------- chegar já filtrado por categoria ----------

     Aqui morava `data-chip-jump`, que procurava esse atributo no HTML
     para pular de um atalho da página para uma categoria. NINGUÉM o
     usava: nenhum arquivo do site tinha esse atributo. Eram vinte
     linhas de código sem porta nenhuma.

     E a porta que faltava é outra: os ícones de categoria da página
     inicial (18/09/2026, "deixe icones de cada categoria de produtos")
     levam para `produtos.html#tirzepatida`. Sem alguém lendo esse
     pedaço do endereço, o toque cairia na lista inteira e a pessoa
     teria de filtrar de novo na mão — o ícone prometeria uma coisa e
     entregaria outra.

     Então o código dos vinte sem porta virou o que tem porta: ler a
     categoria do endereço e aplicar o filtro. O `#` também faz o
     endereço poder ser guardado e mandado para alguém, que é de graça
     e não existia. */

  function aplicarCategoriaDoEndereco() {
    if (!osChips().length || !osProdutos().length) return;

    var pedida = String(location.hash || '').replace(/^#/, '').trim().toLowerCase();
    if (!pedida) return;

    var chip = document.querySelector('[data-chip="' + pedida.replace(/["\\]/g, '') + '"]');
    if (!chip) return;   /* categoria que não existe: deixa a lista inteira */

    chip.click();
    /* Sem rolar, a barra de categorias pode estar mostrando outra
       parte dela e a pessoa não vê qual ficou marcada. */
    chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  aplicarCategoriaDoEndereco();

  /* E de novo se a pessoa trocar o endereço sem recarregar (voltar,
     avançar, ou tocar em outro ícone de categoria vindo de fora). */
  window.addEventListener('hashchange', aplicarCategoriaDoEndereco);

  /* ---------- busca por texto nos produtos ---------- */
  var searchField = document.querySelector('[data-search-field]');

  if (searchField) {
    /* O CAMPO é do HTML e não é redesenhado, então o ouvinte dele
       sobrevive. Quem morria era a LISTA de produtos que ele varria —
       está tudo dentro de `aplicarFiltro()` agora, que lê a grade na
       hora.

       A busca NAO anima, de proposito. Ela dispara a cada letra: animar
       aqui faria a grade tremer enquanto a pessoa digita, o que atrapalha
       exatamente quem esta procurando algo. Movimento na troca de
       categoria ajuda a entender que a lista mudou; na busca, estorva. */
    searchField.addEventListener('input', function () {
      aplicarFiltro();
      conferirVitrine();
    });
  }
})();
