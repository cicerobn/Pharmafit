/* =========================================================
   PHARMA FIT — o MODELO da mensagem que vai para o WhatsApp

   precisa: nada (é só texto e contas)

   Brian, 15/10/2026, colando a mensagem que a equipe recebe:
   "aqui tem que ter como editar no painel, a mensagem que aparece".

   O TEXTO ESTAVA ESCRITO DENTRO DO CARRINHO. Mudar uma vírgula exigia
   mexer no código e publicar — e quem sabe que palavra funciona na
   conversa é quem atende, não eu.

   Agora o texto é um MODELO guardado em `pf_configuracoes`, na chave
   `publico_mensagem_zap` (o prefixo `publico_` é o que a regra do banco
   usa para o site poder ler), e a equipe muda em Configurações →
   Mensagem do pedido.

   ESTE ARQUIVO É DOS DOIS LADOS, e é por isso que ele existe separado:
   o carrinho precisa montar a mensagem, e o painel precisa mostrar o
   texto de fábrica, a lista de peças e uma prévia. Se cada lado tivesse
   a sua cópia, no primeiro ajuste as duas discordariam — que é a doença
   que este site já pagou caro: menu em 16 cópias, script em 16 listas.

   O QUE VALE QUANDO NÃO HÁ NADA: o `padrao` abaixo é exatamente a
   mensagem que o site mandava antes desta mudança. Sem banco, com banco
   fora do ar, com a chave vazia ou com um modelo inútil, a mensagem sai
   igual. Nenhuma venda depende de alguém ter preenchido o painel.
   ========================================================= */
(function () {
  'use strict';

  /* O texto de fábrica — a mensagem na ordem que a equipe pediu em
     14/10/2026: 1 produto, 2 forma de pagamento, 3 entrega, 4 WhatsApp.
     Os asteriscos viram negrito no WhatsApp. */
  var PADRAO = [
    'Olá! Aqui é {nome}, quero fechar este pedido:',
    '',
    '*1. Produto*',
    '{produtos}',
    '{cupom}',
    'Total: {total}',
    '',
    '*2. Forma de pagamento*',
    '{pagamento}',
    '',
    '*3. Entrega*',
    '{entrega}',
    '',
    '*4. WhatsApp*',
    '{whatsapp}'
  ].join('\n');

  /* AS PEÇAS QUE EXISTEM, com o que cada uma quer dizer em português —
     o painel escreve esta lista na tela, para ninguém ter de adivinhar.
     Peça fora desta lista é recusada na hora de salvar: nome errado
     sairia escrito na mensagem do cliente, e ninguém perceberia até
     alguém perguntar. */
  var PECAS = [
    { chave: 'nome', diz: 'o nome de quem está comprando' },
    { chave: 'produtos', diz: 'a lista dos produtos, um por linha, com quantidade e preço' },
    { chave: 'cupom', diz: 'o subtotal e o desconto — some sozinho quando não há cupom' },
    { chave: 'total', diz: 'o total a pagar' },
    { chave: 'pagamento', diz: 'a forma de pagamento que a pessoa escolheu' },
    { chave: 'entrega', diz: 'o endereço de entrega' },
    { chave: 'whatsapp', diz: 'o WhatsApp de quem está comprando' }
  ];

  /* Um pedido de mentira, para a prévia do painel. Os valores são os de
     uma venda comum, para a prévia parecer com a mensagem de verdade. */
  var EXEMPLO = {
    nome: 'Erika Cristina',
    produtos: '• 1× Gluconex 15 mg — 4 ampolas — R$ 999,00',
    cupom: '',
    total: 'R$ 999,00',
    pagamento: 'PIX',
    entrega: 'Rua Acácia-Vermelha, 23 — Manaus',
    whatsapp: '(92) 98427-2567'
  };

  /* O mesmo exemplo, agora com cupom, para quem quiser ver como fica o
     bloco que aparece e some. */
  var EXEMPLO_COM_CUPOM = {
    nome: 'Erika Cristina',
    produtos: '• 1× Gluconex 15 mg — 4 ampolas — R$ 999,00',
    cupom: 'Subtotal: R$ 999,00\nCupom BEMVINDO (10% de desconto): − R$ 99,90',
    total: 'R$ 899,10',
    pagamento: 'PIX',
    entrega: 'Rua Acácia-Vermelha, 23 — Manaus',
    whatsapp: '(92) 98427-2567'
  };

  var CHAVES = PECAS.map(function (p) { return p.chave; });

  /** As peças escritas no modelo que não existem. */
  function desconhecidas(modelo) {
    var achadas = String(modelo || '').match(/\{[a-zA-Z_]+\}/g) || [];
    var ruins = [];
    achadas.forEach(function (m) {
      var nome = m.slice(1, -1);
      if (CHAVES.indexOf(nome) < 0 && ruins.indexOf(m) < 0) ruins.push(m);
    });
    return ruins;
  }

  /* UM MODELO SÓ SERVE SE TROUXER O PRODUTO E O TOTAL.
     Sem `{produtos}` a equipe recebe um pedido sem saber do quê; sem
     `{total}`, sem saber de quanto. As outras peças são gosto de cada
     um — estas duas são o pedido. */
  function serve(modelo) {
    modelo = String(modelo || '');
    if (!modelo.trim()) return false;
    if (modelo.indexOf('{produtos}') < 0) return false;
    if (modelo.indexOf('{total}') < 0) return false;
    return true;
  }

  /** Por que não serve, em português, para o painel dizer na tela. */
  function porQueNaoServe(modelo) {
    modelo = String(modelo || '');
    if (!modelo.trim()) return 'A mensagem está vazia.';
    var falta = [];
    if (modelo.indexOf('{produtos}') < 0) falta.push('{produtos}');
    if (modelo.indexOf('{total}') < 0) falta.push('{total}');
    if (falta.length) {
      return 'Falta ' + falta.join(' e ') + ' na mensagem. ' +
        'Sem isso a equipe recebe um pedido sem saber do quê ou de quanto.';
    }
    var ruins = desconhecidas(modelo);
    if (ruins.length) {
      return ruins.join(', ') + (ruins.length > 1 ? ' não existem' : ' não existe') +
        '. Use só as peças da lista — o que não existe sai escrito assim mesmo ' +
        'na mensagem do cliente.';
    }
    return '';
  }

  /* TROCA AS PEÇAS E APAGA AS LINHAS QUE FICARAM VAZIAS.
   *
   * Linha por linha do modelo, e não no texto inteiro de uma vez. A
   * primeira versão trocava tudo e depois tentava casar as linhas de
   * antes com as de depois pelo número — e `{produtos}` vira várias
   * linhas, então a contagem desandava. Assim cada linha é decidida
   * sozinha, e peça que virou várias linhas entra inteira.
   *
   * Linha que só existia por causa de uma peça, e a peça veio vazia,
   * some: é assim que o bloco do cupom desaparece sem deixar buraco.
   * Linha em branco de propósito (as que separam os blocos) nunca teve
   * peça, então fica. */
  function aplicar(modelo, valores) {
    valores = valores || {};
    var saida = [];
    String(modelo).split('\n').forEach(function (linha) {
      var tinhaPeca = /\{[a-zA-Z_]+\}/.test(linha);
      var trocada = linha.replace(/\{([a-zA-Z_]+)\}/g, function (todo, peca) {
        return Object.prototype.hasOwnProperty.call(valores, peca) ? valores[peca] : todo;
      });
      if (tinhaPeca && !trocada.trim()) return;
      saida.push(trocada);
    });
    return saida.join('\n');
  }

  /* O LIMITE DE TAMANHO. A mensagem viaja dentro do endereço do
     `wa.me`, e endereço muito comprido é recusado por navegador e por
     aparelho. 1200 caracteres é folgado para qualquer recado e fica
     longe do limite — e a lista de produtos entra DEPOIS, então o
     modelo precisa deixar espaço para ela. */
  var LIMITE = 1200;

  window.PharmaFitMensagemPedido = {
    padrao: PADRAO,
    pecas: PECAS,
    exemplo: EXEMPLO,
    exemploComCupom: EXEMPLO_COM_CUPOM,
    limite: LIMITE,
    chave: 'publico_mensagem_zap',
    serve: serve,
    porQueNaoServe: porQueNaoServe,
    desconhecidas: desconhecidas,
    aplicar: aplicar
  };
})();
