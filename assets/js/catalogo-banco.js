/* =========================================================
   PHARMA FIT — o banco manda no catálogo

   Uma coisa só: pegar o que a equipe salvou no painel (preço,
   preço antigo, descrição, foto, estoque, "aparecer no site") e
   pôr no catálogo que as telas usam. Depois avisa a tela, com o
   evento `pharmafit-catalogo`, para ela se redesenhar.

   POR QUE ISTO SAIU DE DENTRO DA LOJA

   Esta conta morava no fim de `loja.js`, que só é carregado em
   quatro páginas. A página de UM produto (`produto.html`) não
   carrega `loja.js` — então ela nunca lia o banco, e mostrava
   para sempre o preço escrito no código.

   Não era grave enquanto ninguém mudava preço pelo painel. Passou
   a ser no momento em que o painel ganhou "mudar preço, nome,
   descrição e foto": a vitrine mostraria R$ 1.234 e a página do
   produto, R$ 1.099. Duas páginas do mesmo site com preços
   diferentes é pior que as duas erradas — o cliente vê e não
   confia em nenhuma.

   Agora a conta é uma, num arquivo só, e toda tela que mostra
   produto o carrega.

   O QUE ELE NÃO FAZ

   Ele não decide preço. O navegador nunca decide dinheiro: o que
   está aqui é o que a equipe gravou, e o pedido continua indo para
   a equipe com valor 0 para ela confirmar.
   ========================================================= */
(function () {
  'use strict';

  var Nuvem = window.PharmaFitNuvem;
  var catalogo = window.PHARMAFIT_CATALOGO || [];
  var jaFoi = false;

  async function sincronizar() {
    if (!Nuvem || jaFoi) return false;
    jaFoi = true;

    var doBanco = await Nuvem.buscar('produtos', 'nome');
    if (!doBanco || !doBanco.length) return false;

    var porNome = {};
    doBanco.forEach(function (p) { porNome[p.nome] = p; });

    var mudou = false;

    catalogo.forEach(function (p) {
      var b = porNome[p.nome];
      if (!b) return;
      p.venda = Number(b.preco != null ? b.preco : p.venda);
      p.antes = Number(b.antes != null ? b.antes : p.antes);
      p.estoque = b.estoque;
      p.foraDoSite = b.ativo === false;

      /* Descrição e foto só entram quando o banco tem algo: vazias, elas
         não apagam o texto e o desenho que o catálogo do código traz.
         Sem estas duas linhas a equipe mudaria a descrição e a foto no
         painel, veria "Salvo", e o site continuaria igual para sempre —
         painel que aceita a mudança e não muda nada é pior que painel
         sem o campo. */
      if (b.descricao) p.descricao = b.descricao;
      if (b.imagem) p.imagem = b.imagem;
      mudou = true;
    });

    /* produto cadastrado só no banco também aparece */
    doBanco.forEach(function (b) {
      if (catalogo.some(function (p) { return p.nome === b.nome; })) return;
      if (b.ativo === false) return;
      catalogo.push({
        nome: b.nome, categoria: b.categoria || 'Outros',
        descricao: b.descricao || '', custo: b.custo, venda: b.preco,
        antes: b.antes || 0, estoque: b.estoque,
        /* a foto que a equipe subiu; sem ela, o frasco genérico, que é
           melhor que um retângulo vazio do tamanho de uma foto */
        imagem: b.imagem || 'assets/img/prod-frasco.svg'
      });
      mudou = true;
    });

    if (mudou) document.dispatchEvent(new CustomEvent('pharmafit-catalogo'));
    return mudou;
  }

  window.PharmaFitCatalogoBanco = { sincronizar: sincronizar };

  /* Começa sozinho: a tela desenha com o que tem no código (imediato) e
     se corrige quando o banco responde. O contrário — esperar o banco
     para desenhar — deixaria a loja em branco em conexão ruim. */
  sincronizar();
})();
