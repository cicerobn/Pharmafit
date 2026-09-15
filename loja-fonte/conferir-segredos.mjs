/* Confere que nenhum segredo entrou no código antes de publicar.
 *
 * O site é estático: tudo que estiver no código dele qualquer visitante lê.
 * Uma chave de serviço vazada aí dentro dá acesso total ao banco, ignorando a
 * RLS — é o pior acidente possível neste projeto, e é um acidente silencioso:
 * o site continua funcionando igual.
 *
 * Então isto roda antes de publicar e derruba a publicação se achar qualquer
 * coisa parecida com segredo. Falso alarme custa dois minutos; vazamento custa
 * o banco inteiro.
 *
 * A chave "publishable" (sb_publishable_… ou o JWT com role "anon") NÃO é
 * segredo: ela é feita para ficar no navegador. Quem protege os dados é a RLS.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/* Aceita a pasta por argumento: `node conferir-segredos.mjs ../alguma-pasta`.
 * Sem argumento, confere este projeto. Serve para varrer qualquer coisa antes
 * de publicar, não só a loja. */
const ALVO = process.argv[2] || '.';
const PASTAS = process.argv[2] ? [ALVO] : ['src', '.'];
const EXTENSOES = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json'];
const IGNORAR = ['node_modules', 'dist', '.git', 'package-lock.json'];

const SUSPEITOS = [
  {
    nome: 'chave de serviço do Supabase (service_role)',
    regra: /\bsb_secret_[A-Za-z0-9_-]{8,}/
  },
  {
    nome: 'segredo de JWT do Supabase',
    regra: /\bSUPABASE_JWT_SECRET\b|\bjwt_secret\s*[:=]\s*['"][^'"]{16,}/i
  },
  {
    nome: 'chave de gateway de pagamento',
    regra: /\b(sk_live|sk_test|rk_live|access_token_prod|API_SECRET|SECRET_KEY|CLIENT_SECRET|GATEWAY_KEY|WEBHOOK_SECRET)\b/
  },
  {
    nome: 'senha escrita no código',
    regra: /\b(senha|password|passwd)\s*[:=]\s*['"][^'"]{6,}['"]/i
  },
  {
    nome: 'string de conexão de banco com senha',
    regra: /postgres(ql)?:\/\/[^\s:'"]+:[^\s@'"]+@/
  },
  {
    nome: 'chave privada',
    regra: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  }
];

/* Uma linha pode ser liberada de propósito, escrevendo `segredo-ok: motivo`
 * num comentário na própria linha ou na linha de cima.
 *
 * Isto existe porque alarme falso que a gente aprende a ignorar deixa de
 * proteger: na primeira vez você confere, na terceira você passa direto, e na
 * décima o vazamento de verdade passa junto. Marcar a exceção obriga a escrever
 * o motivo ao lado dela, e deixa o verificador voltando a zero achado. */
const MARCA_LIBERADA = /segredo-ok:/;

/* Arquivos que falam SOBRE segredo em vez de guardar um. */
const PERDOADOS = [
  'conferir-segredos.mjs',
  'LEIA-ME.md',
  'AS-QUINZE-ARMADILHAS.md',
  'HOSPEDAGEM.md'
];

/**
 * Procura JWT do Supabase e abre cada um para ver que papel ele carrega.
 *
 * Tentei antes procurar o pedaço "service_role" já codificado em base64, e
 * quase deixei passar: o base64 muda de forma conforme a posição em que o
 * texto começa, então o mesmo papel tem três escritas diferentes. Decodificar
 * é o único jeito honesto.
 *
 * O papel "anon" passa de propósito: essa chave é feita para ficar no
 * navegador.
 */
function jwtsPerigosos(texto) {
  const achados = [];
  const regra = /eyJ[A-Za-z0-9_-]{6,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{6,}/g;
  let m;

  while ((m = regra.exec(texto)) !== null) {
    let corpo;
    try {
      corpo = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
    } catch (e) {
      continue; // não era um JWT de verdade
    }

    const papel = String((corpo && corpo.role) || '');
    if (papel && papel !== 'anon') {
      achados.push({
        indice: m.index,
        nome: `JWT do Supabase com papel "${papel}"`,
        trecho: m[0].slice(0, 24)
      });
    }
  }

  return achados;
}

function arquivos(pasta, fundo = 0) {
  if (fundo > 8) return [];
  const saida = [];

  let dentro;
  try {
    dentro = readdirSync(pasta);
  } catch (e) {
    /* Pasta que não existe não é erro: o alvo pode não ter `src`. */
    return saida;
  }

  for (const nome of dentro) {
    if (IGNORAR.includes(nome)) continue;
    const caminho = join(pasta, nome);
    const info = statSync(caminho);

    if (info.isDirectory()) {
      saida.push(...arquivos(caminho, fundo + 1));
    } else if (EXTENSOES.includes(extname(nome)) && !PERDOADOS.includes(nome)) {
      saida.push(caminho);
    }
  }

  return saida;
}

const vistos = new Set();
const achados = [];

for (const pasta of PASTAS) {
  for (const caminho of arquivos(pasta)) {
    if (vistos.has(caminho)) continue;
    vistos.add(caminho);

    const texto = readFileSync(caminho, 'utf8');

    const linhas = texto.split('\n');

    /** A linha (1-based) foi liberada com o motivo escrito junto?
     *
     * Vale a própria linha e as seis de cima, porque o motivo quase sempre é um
     * parágrafo de comentário e não caberia numa linha só. Seis é perto o
     * bastante para a marca continuar falando daquele trecho. */
    const liberada = (n) => {
      for (let i = n; i >= Math.max(1, n - 6); i--) {
        if (MARCA_LIBERADA.test(linhas[i - 1] || '')) return true;
      }
      return false;
    };

    for (const s of SUSPEITOS) {
      const m = s.regra.exec(texto);
      if (!m) continue;
      const linha = texto.slice(0, m.index).split('\n').length;
      if (liberada(linha)) continue;
      achados.push({ caminho, linha, nome: s.nome, trecho: m[0].slice(0, 24) });
    }

    for (const j of jwtsPerigosos(texto)) {
      const linha = texto.slice(0, j.indice).split('\n').length;
      if (liberada(linha)) continue;
      achados.push({ caminho, linha, nome: j.nome, trecho: j.trecho });
    }
  }
}

if (achados.length === 0) {
  console.log(`Nenhum segredo em ${ALVO}. ${vistos.size} arquivos conferidos.`);
  process.exit(0);
}

console.error('\nPAREI A PUBLICAÇÃO: achei coisa que parece segredo no código do site.\n');
console.error('O site é estático — qualquer visitante lê tudo que estiver aqui dentro.');
console.error('Segredo tem que ficar em segredo de função de servidor, no painel do Supabase.\n');

for (const a of achados) {
  console.error(`  ${a.caminho}:${a.linha}`);
  console.error(`    ${a.nome} → "${a.trecho}…"\n`);
}

process.exit(1);
