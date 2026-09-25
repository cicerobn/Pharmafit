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

    /* A VITRINE, E NÃO A TABELA.
     *
     * `pf_produtos` tem a coluna `custo` — quanto a Pharma Fit paga por
     * cada caixa. Este arquivo roda no navegador do visitante, com a
     * chave que está escrita dentro do código do site; então tudo que ele
     * consegue pedir é tudo que qualquer pessoa consegue pedir. Medido em
     * 17/09/2026: dava para ler a margem inteira, produto por produto.
     *
     * `pf_produtos_publico` é a mesma lista sem essa coluna. */
    /* AS OPÇÕES DE UM PRODUTO (25/09/2026).
     *
     * O cliente do Brian vende ampola avulsa de tirzepatida de sete
     * marcas e não queria sete produtos no catálogo: "criar uma aba de
     * um produto… clicava e apareciam lá as opções". Cada opção vira
     * aqui um item de venda ESCONDIDO da vitrine, com o nome
     * "<produto> (<opção>)". É esse nome que vai no carrinho, no pedido,
     * na mensagem do WhatsApp, no PIX e nos relatórios — o banco
     * reconhece o mesmo nome (`pf_produto_ou_opcao`). Assim nenhuma
     * dessas partes precisou aprender o que é "opção": para elas, é um
     * produto como outro qualquer, só que fora da vitrine.
     *
     * Na vitrine fica o produto principal, com `opcoes` apontando para
     * os itens escondidos; quem mostra a escolha é a página do produto.
     */
    function aplicarOpcoes(p, b) {
      if (!Object.prototype.hasOwnProperty.call(b, 'opcoes')) return;
      for (var k = catalogo.length - 1; k >= 0; k--) {
        if (catalogo[k].variante && catalogo[k].pai === p.nome) catalogo.splice(k, 1);
      }
      var lista = (Array.isArray(b.opcoes) ? b.opcoes : []).filter(function (o) {
        return o && String(o.nome || '').trim();
      });
      p.opcoesRotulo = b.opcoes_rotulo || 'Marca';
      p.opcoes = lista.map(function (o) {
        var preco = Number(o.preco) > 0 ? Number(o.preco) : Number(p.venda || 0);
        var estoque = (o.estoque === undefined || o.estoque === null || o.estoque === '')
          ? null : Number(o.estoque);
        var v = {
          nome: p.nome + ' (' + String(o.nome).trim() + ')',
          opcao: String(o.nome).trim(),
          pai: p.nome,
          variante: true,
          foraDoSite: true,
          categoria: p.categoria,
          descricao: p.descricao,
          venda: preco,
          /* o preço riscado do produto só vale para a opção que custa o
             mesmo que ele; opção com preço próprio não herda desconto */
          antes: Number(p.antes) > preco ? Number(p.antes) : 0,
          estoque: estoque,
          imagem: o.imagem || p.imagem,
          fotoDeVerdade: o.imagem ? true : !!p.fotoDeVerdade,
          parcelas: p.parcelas,
          parcelaValor: preco === Number(p.venda) ? p.parcelaValor : 0,
          destaque: ''
        };
        catalogo.push(v);
        return v;
      });
    }

    var doBanco = await Nuvem.buscar('produtos_publico', 'nome');
    if (!doBanco || !doBanco.length) return false;

    var porNome = {};
    doBanco.forEach(function (p) { porNome[p.nome] = p; });

    var mudou = false;

    catalogo.forEach(function (p) {
      var b = porNome[p.nome];

      /* PRODUTO QUE NÃO ESTÁ MAIS NO BANCO SAI DO SITE.
       *
       * Isto existe por causa da edição de nome no painel. O casamento
       * aqui é pelo NOME (é a única coisa que o catálogo do código e a
       * tabela têm em comum). Então, quando a equipe renomeia um
       * produto, o nome velho deixa de existir no banco e o nome novo
       * entra como se fosse outro produto — sem esta linha, o site
       * mostraria os DOIS: o antigo com o preço antigo, vindo do código,
       * e o novo, vindo do banco. Dois cards do mesmo produto, com
       * preços diferentes.
       *
       * Com ela, a lista da equipe manda: renomeado troca de nome,
       * apagado desaparece. `foraDoSite` é a marca que a vitrine, os
       * favoritos, o formulário de atacado e o modal de pedido já
       * respeitam.
       *
       * Vale só quando o banco RESPONDEU (lá em cima: lista vazia ou
       * erro faz esta função desistir antes). Sem isso, uma falha de
       * rede esvaziaria a loja. */
      if (!b) {
        if (!p.foraDoSite) { p.foraDoSite = true; mudou = true; }
        return;
      }

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
      /* `fotoDeVerdade` marca que a imagem é UMA FOTO que a equipe
         subiu, e não o desenho que o catálogo do código traz. A
         vitrine precisa saber a diferença: atrás de uma FOTO ela pinta
         a moldura com a própria foto desfocada, para a foto não
         aparecer como um retângulo com borda dentro dela (Brian,
         19/09/2026: "Alguns produtos ainda estao com a borda"). Atrás
         de um DESENHO isso não se faz — o desenho tem fundo
         transparente e ficaria duplicado, um por cima do outro. */
      if (b.imagem) { p.imagem = b.imagem; p.fotoDeVerdade = true; }

      /* A ETIQUETA DA VITRINE (MAIS VENDIDO / PROMOÇÃO).
       *
       * A conta é ao contrário das duas de cima: aqui o VAZIO do banco
       * vale. "Nenhuma etiqueta" é escolha da equipe tanto quanto "mais
       * vendido" — se o vazio não apagasse, tirar a etiqueta no painel
       * não tiraria nada do site, e o painel estaria mentindo.
       *
       * Mas só quando a COLUNA existe. Enquanto a migração 12 não
       * tivesse rodado, a vitrine viria sem esse campo e o `|| ''`
       * apagaria a etiqueta que o catálogo do código traz: o site
       * perderia etiqueta por causa de uma coluna que falta, sem erro
       * nenhum na tela. Com a pergunta, coluna que falta é ignorada. */
      if (Object.prototype.hasOwnProperty.call(b, 'destaque')) {
        p.destaque = b.destaque || '';
      }

      /* O PARCELAMENTO que a equipe escolhe no painel (24/09/2026).
         Mesma regra da etiqueta: só quando a coluna veio. `parcelas` 0
         é escolha ("não mostrar parcelamento"), e por isso vale mesmo
         sendo zero. */
      if (Object.prototype.hasOwnProperty.call(b, 'parcelas')) {
        p.parcelas = b.parcelas;
        p.parcelaValor = b.parcela_valor || 0;
      }
      aplicarOpcoes(p, b);

      mudou = true;
    });

    /* produto cadastrado só no banco também aparece */
    doBanco.forEach(function (b) {
      if (catalogo.some(function (p) { return p.nome === b.nome; })) return;
      if (b.ativo === false) return;
      var novo = {
        nome: b.nome, categoria: b.categoria || 'Outros',
        /* sem `custo`: a vitrine não traz esse número, e o site não tem
           o que fazer com ele. Quem precisa dele é o painel, que lê a
           tabela com o login da equipe. */
        descricao: b.descricao || '', venda: b.preco,
        antes: b.antes || 0, estoque: b.estoque,
        /* a foto que a equipe subiu; sem ela, o frasco genérico, que é
           melhor que um retângulo vazio do tamanho de uma foto */
        imagem: b.imagem || 'assets/img/prod-frasco.svg',
        fotoDeVerdade: !!b.imagem,
        destaque: b.destaque || '',
        parcelas: b.parcelas,
        parcelaValor: b.parcela_valor || 0
      };
      catalogo.push(novo);
      aplicarOpcoes(novo, b);
      mudou = true;
    });

    if (mudou) document.dispatchEvent(new CustomEvent('pharmafit-catalogo'));
    return mudou;
  }

  window.PharmaFitCatalogoBanco = { sincronizar: sincronizar };

  /* AVISAR QUE A CONSULTA TERMINOU, MESMO SEM TER MUDADO NADA.
   *
   * ACHADO EM 22/09/2026, medindo a página de produto com um endereço
   * errado: ela ficava OITO SEGUNDOS girando o "carregando" antes de
   * dizer "não achamos".
   *
   * O motivo: `pharmafit-catalogo` só é disparado quando o banco traz
   * alguma mudança. A tela do produto, quando não acha o nome no
   * catálogo do código, espera esse evento para não dar "não existe"
   * cedo demais — um produto renomeado pelo painel só aparece depois da
   * resposta do banco. Sem evento, ela caía no prazo de 8 segundos.
   *
   * Então agora existe um segundo aviso, `pharmafit-catalogo-pronto`,
   * que sai SEMPRE que a consulta acaba — trouxe mudança, não trouxe,
   * deu erro, ou nem havia banco configurado. Quem espera decide na
   * hora, e continua decidindo CERTO: o aviso só sai depois de o banco
   * ter respondido de verdade.
   *
   * São dois eventos, e não um, de propósito: `pharmafit-catalogo`
   * significa "redesenhe, mudou coisa", e várias telas escutam. Fazer
   * ele sair sem mudança nenhuma mandaria a vitrine inteira se
   * redesenhar à toa. */
  sincronizar()
    .catch(function () { /* o erro já é tratado dentro; aqui é só não deixar escapar */ })
    .then(function () {
      document.dispatchEvent(new CustomEvent('pharmafit-catalogo-pronto'));
    });
})();
