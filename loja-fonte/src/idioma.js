/* Português e espanhol.
 *
 * Um dicionário simples, sem biblioteca: são duas línguas e um site de uma
 * página. A escolha fica guardada no aparelho de quem visita. */

const CHAVE = 'loja2_idioma';

export const IDIOMAS = [
  { id: 'pt', rotulo: 'PT', nome: 'Português' },
  { id: 'es', rotulo: 'ES', nome: 'Español' }
];

const TEXTOS = {
  pt: {
    buscar: 'Buscar produto',
    buscarVazio: 'Nada encontrado para',
    verTudo: 'Ver tudo',
    catalogoVazio: 'Nenhum produto na loja ainda.',
    catalogoVazioAjuda: 'Cadastre os produtos no painel para eles aparecerem aqui.',
    aPartirDe: 'a partir de',
    membro: 'Membro',
    promocao: 'Promoção',
    esgotado: 'Sem estoque',
    ultimaUnidade: 'última unidade',
    restam: (n) => `restam ${n}`,
    adicionar: 'Adicionar',
    noCarrinho: 'No carrinho',
    carrinho: 'Carrinho',
    carrinhoVazio: 'Seu carrinho está vazio.',
    carrinhoVazioAjuda: 'Escolha um produto para começar.',
    itens: 'Itens',
    frete: 'Frete',
    total: 'Total',
    cupom: 'Cupom de membro',
    cupomAplicar: 'Aplicar',
    cupomOk: 'Cupom aplicado. Preço de membro valendo.',
    cupomErro: 'Esse cupom não vale.',
    fechar: 'Fechar',
    continuar: 'Continuar',
    finalizar: 'Finalizar pedido',
    remover: 'Remover',
    seusDados: 'Seus dados',
    entrega: 'Entrega',
    nome: 'Nome completo',
    whatsapp: 'WhatsApp',
    cpf: 'CPF',
    nascimento: 'Data de nascimento',
    email: 'E-mail',
    cep: 'CEP',
    cidade: 'Cidade',
    rua: 'Rua',
    numeroCasa: 'Número',
    complemento: 'Complemento',
    complementoDica: 'Apartamento, bloco, ponto de referência (opcional)',
    voltar: 'Voltar',
    enviando: 'Enviando…',
    conferir: 'Confira seu pedido',
    pedidoFeito: 'Pedido registrado',
    pedidoFeitoTexto: 'Anotamos seu pedido. A equipe vai falar com você para combinar o pagamento e a entrega.',
    referencia: 'Referência do pedido',
    novoPedido: 'Fazer outro pedido',
    comoPagar: 'Como pagar',
    pixChave: 'Chave PIX',
    pixTitular: 'No nome de',
    pixBanco: 'Banco',
    pixCopiar: 'Copiar a chave',
    pixCopiado: 'Chave copiada!',
    pixValor: 'Valor a pagar',
    pixDepois: 'Depois de pagar, mande o comprovante no WhatsApp com a referência acima.',
    falarNoZap: 'Mandar o comprovante no WhatsApp',
    jaPreenchido: 'Usamos os dados da sua última compra. Toque em um campo para mudar.',
    erroNome: 'Escreva seu nome completo.',
    erroWhatsapp: 'Confira o WhatsApp com DDD.',
    erroCpf: 'Esse CPF não é válido.',
    erroNascimento: 'Confira a data de nascimento.',
    erroEmail: 'Confira o e-mail.',
    erroCep: 'O CEP tem 8 números.',
    erroCidade: 'Escreva a cidade.',
    erroRua: 'Escreva a rua.',
    erroNumero: 'Escreva o número.',
    erroEnvio: 'Não conseguimos registrar agora. Tente de novo em instantes.',
    semPreco: 'Preço a combinar'
  },
  es: {
    buscar: 'Buscar producto',
    buscarVazio: 'Nada encontrado para',
    verTudo: 'Ver todo',
    catalogoVazio: 'Todavía no hay productos en la tienda.',
    catalogoVazioAjuda: 'Cargue los productos en el panel para que aparezcan aquí.',
    aPartirDe: 'desde',
    membro: 'Socio',
    promocao: 'Promoción',
    esgotado: 'Sin stock',
    ultimaUnidade: 'última unidad',
    restam: (n) => `quedan ${n}`,
    adicionar: 'Agregar',
    noCarrinho: 'En el carrito',
    carrinho: 'Carrito',
    carrinhoVazio: 'Su carrito está vacío.',
    carrinhoVazioAjuda: 'Elija un producto para empezar.',
    itens: 'Artículos',
    frete: 'Envío',
    total: 'Total',
    cupom: 'Cupón de socio',
    cupomAplicar: 'Aplicar',
    cupomOk: 'Cupón aplicado. Precio de socio activo.',
    cupomErro: 'Ese cupón no es válido.',
    fechar: 'Cerrar',
    continuar: 'Continuar',
    finalizar: 'Finalizar pedido',
    remover: 'Quitar',
    seusDados: 'Sus datos',
    entrega: 'Entrega',
    nome: 'Nombre completo',
    whatsapp: 'WhatsApp',
    cpf: 'CPF',
    nascimento: 'Fecha de nacimiento',
    email: 'Correo electrónico',
    cep: 'Código postal',
    cidade: 'Ciudad',
    rua: 'Calle',
    numeroCasa: 'Número',
    complemento: 'Complemento',
    complementoDica: 'Departamento, bloque, punto de referencia (opcional)',
    voltar: 'Volver',
    enviando: 'Enviando…',
    conferir: 'Revise su pedido',
    pedidoFeito: 'Pedido registrado',
    pedidoFeitoTexto: 'Anotamos su pedido. El equipo se pondrá en contacto para acordar el pago y la entrega.',
    referencia: 'Referencia del pedido',
    novoPedido: 'Hacer otro pedido',
    comoPagar: 'Cómo pagar',
    pixChave: 'Clave PIX',
    pixTitular: 'A nombre de',
    pixBanco: 'Banco',
    pixCopiar: 'Copiar la clave',
    pixCopiado: '¡Clave copiada!',
    pixValor: 'Valor a pagar',
    pixDepois: 'Después de pagar, envíe el comprobante por WhatsApp con la referencia de arriba.',
    falarNoZap: 'Enviar el comprobante por WhatsApp',
    jaPreenchido: 'Usamos los datos de su última compra. Toque un campo para cambiarlo.',
    erroNome: 'Escriba su nombre completo.',
    erroWhatsapp: 'Revise el WhatsApp con código de área.',
    erroCpf: 'Ese CPF no es válido.',
    erroNascimento: 'Revise la fecha de nacimiento.',
    erroEmail: 'Revise el correo electrónico.',
    erroCep: 'El código postal tiene 8 números.',
    erroCidade: 'Escriba la ciudad.',
    erroRua: 'Escriba la calle.',
    erroNumero: 'Escriba el número.',
    erroEnvio: 'No pudimos registrar ahora. Intente de nuevo en unos instantes.',
    semPreco: 'Precio a acordar'
  }
};

export function idiomaGuardado() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo && TEXTOS[salvo]) return salvo;
  } catch (e) { /* navegador sem armazenamento */ }
  // Espanhol só se o navegador estiver em espanhol; o padrão é português.
  const navegador = (typeof navigator !== 'undefined' && navigator.language) || 'pt';
  return navegador.toLowerCase().startsWith('es') ? 'es' : 'pt';
}

export function guardarIdioma(id) {
  try { localStorage.setItem(CHAVE, id); } catch (e) { /* sem armazenamento */ }
}

export function textos(idioma) {
  return TEXTOS[idioma] || TEXTOS.pt;
}
