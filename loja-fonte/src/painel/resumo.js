/* Faturamento e lucro a partir dos pedidos.
 *
 * Duas decisões que valem ser ditas em voz alta:
 *
 * 1. Só entra na conta pedido PAGO (pago, em separação ou enviado). Pedido
 *    esperando pagamento não é faturamento, e cancelado saiu da conta.
 *
 * 2. O frete aparece separado, e NÃO entra no lucro. O cliente paga o frete e a
 *    transportadora cobra o frete: pôr esse dinheiro no lucro faria a loja
 *    parecer mais lucrativa do que é. Faturamento = produtos + frete, porque é
 *    o que entrou na conta; lucro = produtos − custo dos produtos.
 */

export const STATUS_VENDIDO = ['pago', 'separacao', 'enviado'];

/** Um pedido conta como venda? */
export function vendido(pedido) {
  return STATUS_VENDIDO.indexOf(pedido.status) >= 0;
}

/**
 * Junta pedido, itens e custo congelado numa estrutura só, para as contas não
 * precisarem procurar nada depois.
 */
export function montar(listaPedidos, listaItens, listaCustos) {
  const itensPor = {};
  listaItens.forEach((i) => {
    (itensPor[i.pedido_id] = itensPor[i.pedido_id] || []).push(i);
  });

  const custoPor = {};
  listaCustos.forEach((c) => {
    custoPor[c.pedido_id + '|' + c.produto_id] = Number(c.custo_unitario) || 0;
  });

  return listaPedidos.map((p) => {
    const itens = (itensPor[p.id] || []).map((i) => {
      const quantidade = Number(i.quantidade) || 0;
      const preco = Number(i.preco_unitario) || 0;
      const custoUnitario = custoPor[p.id + '|' + i.produto_id];
      const temCusto = custoUnitario !== undefined;
      return {
        ...i,
        quantidade,
        preco,
        recebido: Math.round(preco * quantidade * 100) / 100,
        custoUnitario: temCusto ? custoUnitario : null,
        custo: temCusto ? Math.round(custoUnitario * quantidade * 100) / 100 : null
      };
    });

    return {
      ...p,
      quando: new Date(p.criado_em),
      itens,
      produtos: arredonda(itens.reduce((s, i) => s + i.recebido, 0)),
      custo: arredonda(itens.reduce((s, i) => s + (i.custo || 0), 0)),
      semCusto: itens.some((i) => i.custo === null),
      freteCobrado: Number(p.frete) || 0,
      totalCobrado: Number(p.total) || 0,
      pecas: itens.reduce((s, i) => s + i.quantidade, 0)
    };
  });
}

function arredonda(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Soma de um intervalo. Só pedidos que contam como venda. */
export function somar(pedidosMontados, de, ate) {
  const dentro = pedidosMontados.filter((p) => {
    if (!vendido(p)) return false;
    const t = p.quando.getTime();
    return t >= de.getTime() && t < ate.getTime();
  });

  const produtos = arredonda(dentro.reduce((s, p) => s + p.produtos, 0));
  const custo = arredonda(dentro.reduce((s, p) => s + p.custo, 0));
  const frete = arredonda(dentro.reduce((s, p) => s + p.freteCobrado, 0));

  return {
    pedidos: dentro.length,
    pecas: dentro.reduce((s, p) => s + p.pecas, 0),
    produtos,
    frete,
    faturamento: arredonda(produtos + frete),
    custo,
    lucro: arredonda(produtos - custo),
    /* Se algum produto vendido não tinha preço de compra cadastrado, o lucro
       daquele pedido está mais alto do que a verdade. A tela avisa em vez de
       mostrar um número bonito. */
    lucroIncompleto: dentro.some((p) => p.semCusto),
    ticket: dentro.length ? arredonda((produtos + frete) / dentro.length) : 0
  };
}

/**
 * O gráfico. Uma barra por fatia do calendário — nunca um número fixo de
 * pontos. A soma das barras é, por construção, a mesma conta do cartão: as
 * fatias cobrem o período inteiro sem sobrepor e sem deixar buraco.
 */
export function serie(pedidosMontados, listaFatias, qual = 'faturamento') {
  return listaFatias.map((f) => {
    const s = somar(pedidosMontados, f.de, f.ate);
    return { rotulo: f.rotulo, curto: f.curto, valor: s[qual], pedidos: s.pedidos };
  });
}
