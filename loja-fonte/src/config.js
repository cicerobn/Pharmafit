/* Endereco e chave publica do Supabase.
 *
 * Esta chave NAO e segredo: e a chave "publishable", feita para ficar no
 * navegador. Qualquer visitante pode ler o codigo de um site estatico, e por
 * isso quem protege os dados nao e a chave — e a RLS do banco, que ja foi
 * provada em loja-nova/prova-de-seguranca.sql.
 *
 * O que nunca pode aparecer aqui: chave de gateway de pagamento, service_role
 * e qualquer senha. Essas ficam em segredo de funcao de servidor.
 */
export const SUPABASE_URL = 'https://xqiujdwvmbaipxyzcpvt.supabase.co';
export const SUPABASE_CHAVE_PUBLICA = 'sb_publishable_Gq9WhodN8Dp1csDGSkvnzw_Kx8nXKvt';

/* Prefixo das tabelas desta loja. Provisorio ate a loja ter nome:
 * trocar aqui renomeia o acesso do site inteiro. */
export const T = (nome) => `loja2_${nome}`;
