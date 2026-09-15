/* Dinheiro e a regra de qual preço vale.
 *
 * Um lugar só para essa conta. Se ela viver espalhada, um dia a vitrine mostra
 * um preço e o carrinho cobra outro. */

/** 999 -> "R$ 999,00" */
export function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2
  });
}

function numero(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Decide o que aparece no cartão e o que vai para o carrinho.
 *
 * Regras do projeto:
 *  - o preço que vale é o MENOR entre normal, membro e promoção;
 *  - promoção maior ou igual ao preço normal é ignorada. Riscar um número por
 *    outro igual (ou maior) engana o cliente, e isso não vai ao ar;
 *  - o preço de membro só entra na conta quando o cupom está aplicado. Sem o
 *    cupom ele aparece como selo, para a pessoa saber que existe.
 *
 * Devolve { vigente, antes, membro } — `antes` só vem quando existe um preço
 * mais alto de verdade para riscar.
 */
export function precoDoProduto(produto, cupomAplicado) {
  const normal = numero(produto.preco);
  const promo = numero(produto.preco_promocional);
  const membro = numero(produto.preco_vip);

  // Só é promoção se for realmente menor.
  const promoVale = promo !== null && normal !== null && promo < normal;
  const membroVale = membro !== null && normal !== null && membro < normal;

  const candidatos = [];
  if (normal !== null) candidatos.push(normal);
  if (promoVale) candidatos.push(promo);
  if (membroVale && cupomAplicado) candidatos.push(membro);

  if (!candidatos.length) return { vigente: null, antes: null, membro: null };

  const vigente = Math.min(...candidatos);

  return {
    vigente,
    // Só risca se houver um preço maior de verdade.
    antes: normal !== null && vigente < normal ? normal : null,
    // O selo de membro só existe se o preço de membro for menor e ainda não
    // estiver valendo (se já está valendo, virou o preço da tela).
    membro: membroVale && !cupomAplicado ? membro : null
  };
}

/** Quanto por cento o cliente economiza. Só para o selo de promoção. */
export function desconto(antes, vigente) {
  if (!antes || !vigente || antes <= vigente) return 0;
  return Math.round((1 - vigente / antes) * 100);
}

/**
 * A conta do carrinho. O frete entra UMA vez por pedido, nunca por item.
 *
 * Não existe desconto no rodapé: o preço de membro já está dentro do preço de
 * cada linha. Somar itens e frete tem que dar o total, na tela e no papel.
 */
export function contaDoCarrinho(linhas, frete) {
  const itens = linhas.reduce((soma, l) => soma + l.preco * l.quantidade, 0);
  const entrega = Number(frete || 0);
  const subtotal = Math.round(itens * 100) / 100;
  const total = Math.round((subtotal + entrega) * 100) / 100;
  return { subtotal, frete: entrega, total, pecas: linhas.reduce((s, l) => s + l.quantidade, 0) };
}
