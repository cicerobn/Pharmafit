/* Confere que o código de um projeto só fala com as tabelas DELE.
 *
 * POR QUE ISTO EXISTE
 *
 * O banco do Supabase é compartilhado por oito negócios. Cada um tem o seu
 * prefixo — `loja2_`, `loja595_`, `dreams_`, `med_`, `aldea_`, `intervalo_`,
 * `cambio_`, `pf_` — e ainda há 81 tabelas SEM prefixo, de um sistema pessoal,
 * com nomes genéricos: `produtos`, `notas`, `leads`, `metas`, `tarefas`.
 *
 * Em 15/09/2026 eu fui ligar a gestão da Pharma Fit e quase gravei nas tabelas
 * `produtos` e `notas` de outro negócio. Elas já existiam, com 40 linhas
 * dentro, e o schema usava `create table if not exists` — teria passado batido,
 * e a gestão ficaria lendo e gravando no lugar errado SEM DAR UM ÚNICO ERRO NA
 * TELA. Alguém descobriria semanas depois, com dado de dois negócios misturado.
 *
 * Cuidado não é defesa: cuidado falha num dia corrido. Isto é a defesa.
 *
 * O QUE ELE OLHA, E POR QUE ASSIM
 *
 * Só a FRONTEIRA: os lugares onde o código entrega um nome de tabela ao
 * Supabase. Ali, o nome tem que ser uma de três coisas:
 *
 *   1. um texto que já começa com o prefixo do projeto        .from('pf_pedidos')
 *   2. uma chamada ao ajudante que põe o prefixo              .from(T('pedidos'))
 *   3. uma variável que, no mesmo arquivo, recebeu 1 ou 2     .from(tabPedidos)
 *
 * Qualquer outra coisa para a publicação — inclusive uma variável que ele não
 * consegue provar que passou pelo prefixo.
 *
 * Tentei antes uma regra mais larga: procurar o NOME de qualquer tabela
 * vizinha escrito em qualquer lugar do código. Deu vinte alarmes falsos de uma
 * vez, porque `'produtos'` é o nome interno que o ajudante prefixa depois.
 * Verificador com vinte alarmes falsos a gente aprende a ignorar — e aí ele
 * deixa de proteger. Por isso a regra olha a fronteira, e só ela.
 *
 * COMO USAR
 *
 *   node conferir-tabelas.mjs <pasta> <prefixo>[,<prefixo2>]
 *
 * Exceção consciente: `tabela-ok: motivo` num comentário na linha ou até seis
 * linhas acima.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ALVO = process.argv[2];
const PREFIXOS = (process.argv[3] || '').split(',').map((p) => p.trim()).filter(Boolean);

if (!ALVO || !PREFIXOS.length) {
  console.error('uso: node conferir-tabelas.mjs <pasta> <prefixo>[,<prefixo2>]');
  process.exit(2);
}

const EXTENSOES = ['.js', '.jsx', '.ts', '.tsx', '.html', '.mjs'];
/* `vendor` entra aqui porque é código de terceiro, não meu: a biblioteca
 * do Supabase vem minificada e tem `from(new Set(t))` dentro, que o
 * conferidor leu como nome de tabela impossível de provar. Acusar o que
 * não é meu ensina a ignorar o vermelho — e foi passando o olho por um
 * alarme falso que o furo do prefixo no site ficou escondido. */
const IGNORAR = ['node_modules', 'dist', '.git', '.github', 'vendor'];
const MARCA_LIBERADA = /tabela-ok:/;

/* As tabelas dos outros negócios. Serve só para o recado ficar específico
 * quando o nome flagrado é de um vizinho de verdade.
 *
 * Para atualizar, rode no SQL Editor:
 *   select string_agg(quote_literal(relname), ', ' order by relname)
 *     from pg_class c join pg_namespace n on n.oid=c.relnamespace
 *    where n.nspname='public' and c.relkind='r';
 */
const VIZINHOS = new Set([
  'agenda', 'alvos', 'atalhos', 'checkins', 'componentes', 'contas_a_pagar',
  'conversa', 'crm_pessoal', 'diario', 'dividas', 'faltas', 'lancamentos',
  'leads', 'listas', 'materias', 'memoria', 'metas', 'msg_processadas',
  'notas', 'objetivo_itens', 'objetivos', 'pc_comandos', 'pendencias',
  'prioridade_max', 'prioridades', 'produtos', 'projeto_itens', 'projetos',
  'provas', 'sessoes', 'sono', 'tarefas'
]);

const PREFIXOS_VIZINHOS = ['aldea_', 'cambio_', 'dreams_', 'intervalo_', 'med_',
  'medfoco_', 'loja595_', 'loja2_', 'pf_'];

/* A fronteira: onde um nome de tabela é entregue ao Supabase.
 * O grupo 1 é o que foi entregue, do jeito que está escrito. */
const FRONTEIRA = [
  /* `(?<!storage)` fica de fora de propósito: `sb.storage.from('loja2-fotos')`
   * é BALDE DE FOTOS, não tabela — outro espaço de nomes, outra regra. Sem
   * esta exceção o verificador acusava o balde da loja e virava alarme falso. */
  { nome: ".from(...)",        regra: /(?<!storage)\.from\(\s*([^),]+?)\s*\)/g },
  { nome: "table: ...",        regra: /\btable:\s*([^,}]+?)\s*[,}]/g },
  { nome: "endereço /rest/v1", regra: /\/rest\/v1\/([a-zA-Z_][\w]*)/g }
];

/* Ajudantes aceitos: uma chamada a eles prova que o prefixo foi posto. */
const AJUDANTES = /^(T|TABELA|tabela|comPrefixo)\s*\(/;

function arquivos(pasta, fundo = 0) {
  if (fundo > 8) return [];
  const saida = [];

  /* Aceita arquivo tambem, e nao so pasta. Antes ele so sabia ler pasta:
   * quando recebia um arquivo, o readdirSync falhava, a funcao devolvia lista
   * vazia e o verificador anunciava "nenhuma tabela fora do prefixo" DEPOIS DE
   * NAO OLHAR NADA. Aprovar por nao ter olhado e a pior falha que um
   * verificador pode ter. */
  try {
    if (statSync(pasta).isFile()) {
      return EXTENSOES.includes(extname(pasta)) ? [pasta] : [];
    }
  } catch (e) { return saida; }

  let dentro;
  try { dentro = readdirSync(pasta); } catch (e) { return saida; }

  for (const nome of dentro) {
    if (IGNORAR.includes(nome)) continue;
    const caminho = join(pasta, nome);
    let info;
    try { info = statSync(caminho); } catch (e) { continue; }
    if (info.isDirectory()) saida.push(...arquivos(caminho, fundo + 1));
    else if (EXTENSOES.includes(extname(nome))) saida.push(caminho);
  }
  return saida;
}

/** A variável recebeu, neste arquivo, um nome já prefixado ou o ajudante? */
function variavelSegura(nome, texto) {
  if (!/^[A-Za-z_$][\w$]*$/.test(nome)) return false;
  const atribuicoes = new RegExp(
    '(?:var|let|const)\\s+' + nome.replace(/\$/g, '\\$') + '\\s*=\\s*([^;\\n]+)', 'g');
  let m;
  let achou = false;
  while ((m = atribuicoes.exec(texto)) !== null) {
    const valor = m[1].trim();
    const prefixado = PREFIXOS.some((p) => valor.includes("'" + p) || valor.includes('"' + p));
    const viaAjudante = AJUDANTES.test(valor) || /PREFIXO_TABELAS/.test(valor);
    if (!prefixado && !viaAjudante) return false;
    achou = true;
  }
  return achou;
}

const certas = new Set();
const erradas = [];
const lidos = arquivos(ALVO);

/* Segunda metade da mesma licao: se nao havia nada para ler, isso e um erro de
 * uso, nao um "tudo certo". Caminho errado passaria batido para sempre. */
if (!lidos.length) {
  console.error(`PAREI: nao achei arquivo nenhum para conferir em "${ALVO}".`);
  console.error('Um verificador que aprova sem ter olhado nada e pior que nenhum.');
  process.exit(2);
}

for (const caminho of lidos) {
  const texto = readFileSync(caminho, 'utf8');
  const linhas = texto.split('\n');

  const liberada = (n) => {
    for (let i = n; i >= Math.max(1, n - 6); i--) {
      if (MARCA_LIBERADA.test(linhas[i - 1] || '')) return true;
    }
    return false;
  };

  for (const forma of FRONTEIRA) {
    forma.regra.lastIndex = 0;
    let m;
    while ((m = forma.regra.exec(texto)) !== null) {
      /* A captura para no primeiro `)` ou `,`, então uma chamada como
         T('pedidos') chega aqui sem o fecha-parêntese. Para a decisão isso não
         muda nada, mas o relatório fica feio — então arredondo aqui. */
      let bruto = m[1].trim();
      const abertos = (bruto.match(/\(/g) || []).length - (bruto.match(/\)/g) || []).length;
      if (abertos > 0) bruto = bruto + ')'.repeat(abertos);
      if (/^[A-Za-z_$][\w$]*\(['"][^'"]*$/.test(bruto)) bruto = bruto + "')";
      const n = texto.slice(0, m.index).split('\n').length;
      if (liberada(n)) continue;

      /* 1. texto já prefixado */
      const literal = /^['"]([^'"]+)['"]$/.exec(bruto);
      if (literal) {
        const t = literal[1];
        if (PREFIXOS.some((p) => t.startsWith(p))) { certas.add(t); continue; }
        erradas.push({
          arquivo: relative(process.cwd(), caminho), linha: n, entregue: t,
          forma: forma.nome, porque: 'texto sem o prefixo do projeto',
          trecho: (linhas[n - 1] || '').trim().slice(0, 90)
        });
        continue;
      }

      /* o endereço /rest/v1/x vem sem aspas */
      if (forma.nome === 'endereço /rest/v1') {
        if (PREFIXOS.some((p) => bruto.startsWith(p))) { certas.add(bruto); continue; }
        erradas.push({
          arquivo: relative(process.cwd(), caminho), linha: n, entregue: bruto,
          forma: forma.nome, porque: 'endereço sem o prefixo do projeto',
          trecho: (linhas[n - 1] || '').trim().slice(0, 90)
        });
        continue;
      }

      /* 2. passou pelo ajudante */
      if (AJUDANTES.test(bruto) || /PREFIXO_TABELAS/.test(bruto)) { certas.add(bruto); continue; }

      /* 3. variável que recebeu 1 ou 2 no mesmo arquivo */
      if (variavelSegura(bruto, texto)) { certas.add(bruto); continue; }

      erradas.push({
        arquivo: relative(process.cwd(), caminho), linha: n, entregue: bruto,
        forma: forma.nome,
        porque: 'não dá para provar que passou pelo prefixo',
        trecho: (linhas[n - 1] || '').trim().slice(0, 90)
      });
    }
  }
}

if (!erradas.length) {
  const lista = [...certas].sort();
  console.log(`Nenhuma tabela fora do prefixo ${PREFIXOS.join(' ou ')}. ${lidos.length} arquivos conferidos.`);
  console.log(lista.length
    ? `Entregue ao banco: ${lista.join(', ')}`
    : 'Nenhuma conversa com o banco neste código.');
  process.exit(0);
}

console.error('\nPAREI: este código pode estar falando com a tabela de outro negócio.\n');
console.error('O banco é compartilhado por oito negócios. Gravar na tabela do vizinho');
console.error('não dá erro na tela — só mistura os dados, e depois não separa.\n');

for (const e of erradas) {
  const vizinho = VIZINHOS.has(e.entregue) || PREFIXOS_VIZINHOS.some((p) => e.entregue.startsWith(p));
  console.error(`  ${e.arquivo}:${e.linha}`);
  console.error(`    ${e.forma} recebeu "${e.entregue}" — ${e.porque}`);
  if (vizinho) console.error('    ATENÇÃO: esse nome É de outro negócio deste banco.');
  console.error(`    ${e.trecho}\n`);
}

console.error(`Conserto: passe pelo ajudante — .from(T('${erradas[0].entregue.replace(/['"]/g, '')}')) —`);
console.error(`ou escreva o nome com o prefixo: '${PREFIXOS[0]}...'.`);
console.error('Se for de propósito, escreva `tabela-ok: motivo` num comentário junto da linha.');
process.exit(1);
