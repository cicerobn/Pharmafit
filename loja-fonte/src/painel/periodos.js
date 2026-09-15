/* Os cinco períodos do relatório, e com quem cada um se compara.
 *
 * Duas coisas aqui são regra, não gosto:
 *
 * 1. Cada período se compara com o de MESMA DURAÇÃO logo antes, e o rótulo diz
 *    qual é. "Este mês contra o mês passado" é fácil de programar e mentiroso
 *    no dia 3, quando você compara três dias com trinta.
 *
 * 2. O gráfico é fatiado na unidade que faz sentido para o período — dia em
 *    horas, semana e mês em dias, ano em meses — e NUNCA num número fixo de
 *    pontos. Teto de pontos é o que faz a soma do gráfico não bater com o
 *    número do cartão.
 *
 * Tudo é calculado no horário do aparelho de quem está olhando. O dono está em
 * Manaus; o dia dele começa à meia-noite dele, não em Londres.
 */

const DIA = 86400000;

function meiaNoite(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Segunda-feira da semana daquela data. */
function segunda(d) {
  const x = meiaNoite(d);
  const dia = x.getDay(); // 0 = domingo
  x.setDate(x.getDate() - (dia === 0 ? 6 : dia - 1));
  return x;
}

function primeiroDoMes(d) {
  const x = meiaNoite(d);
  x.setDate(1);
  return x;
}

function primeiroDoAno(d) {
  const x = primeiroDoMes(d);
  x.setMonth(0);
  return x;
}

/** Quanto tempo já se passou desde o começo do período. */
function decorrido(inicio, agora) {
  return Math.max(0, agora.getTime() - inicio.getTime());
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function hora(d) {
  return String(d.getHours()).padStart(2, '0') + 'h' +
    (d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : '');
}

function dataCurta(d) {
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

/**
 * Monta um período: o intervalo de agora, o intervalo de antes (mesma duração,
 * logo antes) e como o gráfico deve ser fatiado.
 */
export function periodos(agora = new Date()) {
  const hojeInicio = meiaNoite(agora);
  const semanaInicio = segunda(agora);
  const mesInicio = primeiroDoMes(agora);
  const anoInicio = primeiroDoAno(agora);

  /* Mês passado inteiro, e o mês antes dele inteiro. */
  const mesPassadoInicio = new Date(mesInicio);
  mesPassadoInicio.setMonth(mesPassadoInicio.getMonth() - 1);
  const mesAntesInicio = new Date(mesPassadoInicio);
  mesAntesInicio.setMonth(mesAntesInicio.getMonth() - 1);

  /**
   * O mesmo ponto do período anterior — mas nunca passando do começo do período
   * de agora.
   *
   * A trava não é preciosismo. Em 31 de dezembro, "este mês" tem 30 dias e
   * pouco decorridos; jogar esse mesmo tanto a partir de 1º de novembro cai em
   * 1º de dezembro, porque novembro tem 30 dias e dezembro tem 31. Sem a trava,
   * a comparação invade dezembro e conta as vendas do dia 1º nos DOIS lados:
   * o mês aparece crescendo contra si mesmo. O mesmo acontece no ano bissexto e
   * em qualquer 31 comparado com um mês de 30.
   *
   * Quando a trava age, a comparação fica um pouco mais curta que o período de
   * agora. É o lado certo para errar: melhor comparar com um pedaço menor do que
   * contar a mesma venda duas vezes.
   */
  function mesmoPontoAntes(inicioAnterior, inicioAtual, limite) {
    const alvo = inicioAnterior.getTime() + decorrido(inicioAtual, agora);
    return new Date(Math.min(alvo, limite.getTime()));
  }

  /* Ontem, no mesmo ponto do dia. */
  const ontemInicio = new Date(hojeInicio.getTime() - DIA);
  const ontemFim = mesmoPontoAntes(ontemInicio, hojeInicio, hojeInicio);

  /* Semana passada, no mesmo ponto da semana. */
  const semanaPassadaInicio = new Date(semanaInicio.getTime() - 7 * DIA);
  const semanaPassadaFim = mesmoPontoAntes(semanaPassadaInicio, semanaInicio, semanaInicio);

  /* Mês passado, no mesmo ponto do mês. */
  const mesPassadoMesmoPonto = mesmoPontoAntes(mesPassadoInicio, mesInicio, mesInicio);

  /* Ano passado, no mesmo ponto do ano. */
  const anoPassadoInicio = new Date(anoInicio);
  anoPassadoInicio.setFullYear(anoPassadoInicio.getFullYear() - 1);
  const anoPassadoFim = mesmoPontoAntes(anoPassadoInicio, anoInicio, anoInicio);

  /* O rótulo sai do intervalo que a comparação REALMENTE tem, não do que ela
     teria se o calendário fosse regular. Quando a trava acima age, dizer "até o
     dia 31" de um mês que tem 30 seria mentira na cara do dono. */
  const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const inteiro = (fim, limite) => fim.getTime() >= limite.getTime();

  return [
    {
      id: 'hoje',
      nome: 'Hoje',
      de: hojeInicio,
      ate: agora,
      antes: { de: ontemInicio, ate: ontemFim },
      antesNome: inteiro(ontemFim, hojeInicio)
        ? 'ontem inteiro'
        : `ontem até as ${hora(ontemFim)}`,
      fatia: 'hora'
    },
    {
      id: 'semana',
      nome: 'Esta semana',
      de: semanaInicio,
      ate: agora,
      antes: { de: semanaPassadaInicio, ate: semanaPassadaFim },
      antesNome: inteiro(semanaPassadaFim, semanaInicio)
        ? 'a semana passada inteira'
        : `semana passada, até ${DIAS_SEMANA[semanaPassadaFim.getDay()]} ${hora(semanaPassadaFim)}`,
      fatia: 'dia'
    },
    {
      id: 'mes',
      nome: 'Este mês',
      de: mesInicio,
      ate: agora,
      antes: { de: mesPassadoInicio, ate: mesPassadoMesmoPonto },
      antesNome: inteiro(mesPassadoMesmoPonto, mesInicio)
        ? `${MESES[mesPassadoInicio.getMonth()]} inteiro`
        : `${MESES[mesPassadoInicio.getMonth()]}, até o dia ${mesPassadoMesmoPonto.getDate()}`,
      fatia: 'dia'
    },
    {
      id: 'mes_passado',
      nome: `Mês passado (${MESES[mesPassadoInicio.getMonth()]})`,
      de: mesPassadoInicio,
      ate: mesInicio,
      antes: { de: mesAntesInicio, ate: mesPassadoInicio },
      antesNome: `${MESES[mesAntesInicio.getMonth()]} inteiro`,
      fatia: 'dia'
    },
    {
      id: 'ano',
      nome: `Este ano (${agora.getFullYear()})`,
      de: anoInicio,
      ate: agora,
      antes: { de: anoPassadoInicio, ate: anoPassadoFim },
      antesNome: inteiro(anoPassadoFim, anoInicio)
        ? `${anoPassadoInicio.getFullYear()} inteiro`
        : `${anoPassadoInicio.getFullYear()}, até ${dataCurta(anoPassadoFim)}`,
      fatia: 'mes'
    }
  ];
}

/**
 * As fatias do gráfico daquele período.
 *
 * O número de fatias sai do calendário: as horas do dia, os dias que o mês tem,
 * os meses do ano. Não existe um máximo aqui de propósito — teto de pontos é o
 * que faz a soma do gráfico não fechar com o total.
 *
 * E toda fatia é APERTADA dentro do período. Isso não é detalhe: a última fatia
 * do dia de hoje vai naturalmente até a meia-noite, enquanto o cartão de cima
 * para na hora atual. Quando as duas coisas discordam, o gráfico soma mais que o
 * cartão e ninguém sabe em qual dos dois acreditar. Apertar aqui faz a conta
 * fechar por construção, e não por sorte.
 */
function apertar(de, ate, periodo) {
  const inicio = Math.max(de.getTime(), periodo.de.getTime());
  const fim = Math.min(ate.getTime(), periodo.ate.getTime());
  return { de: new Date(inicio), ate: new Date(Math.max(inicio, fim)) };
}

export function fatias(periodo) {
  const saida = [];

  if (periodo.fatia === 'hora') {
    const base = meiaNoite(periodo.de);
    const ultima = periodo.ate.getHours();
    for (let h = 0; h <= ultima; h++) {
      const de = new Date(base);
      de.setHours(h, 0, 0, 0);
      const ate = new Date(de.getTime() + 3600000);
      saida.push({
        rotulo: String(h).padStart(2, '0') + 'h',
        curto: String(h),
        ...apertar(de, ate, periodo)
      });
    }
    return saida;
  }

  if (periodo.fatia === 'dia') {
    const de = meiaNoite(periodo.de);
    const limite = periodo.ate.getTime();
    for (let d = new Date(de); d.getTime() < limite; d.setDate(d.getDate() + 1)) {
      const inicio = new Date(d);
      const fim = new Date(d);
      fim.setDate(fim.getDate() + 1);
      saida.push({
        rotulo: dataCurta(inicio),
        curto: String(inicio.getDate()),
        ...apertar(inicio, fim, periodo)
      });
    }
    return saida;
  }

  // meses
  const de = primeiroDoMes(periodo.de);
  const limite = periodo.ate.getTime();
  for (let m = new Date(de); m.getTime() < limite; m.setMonth(m.getMonth() + 1)) {
    const inicio = new Date(m);
    const fim = new Date(m);
    fim.setMonth(fim.getMonth() + 1);
    saida.push({
      rotulo: MESES[inicio.getMonth()].slice(0, 3),
      curto: MESES[inicio.getMonth()].slice(0, 3),
      ...apertar(inicio, fim, periodo)
    });
  }
  return saida;
}

/** De quantos por cento uma coisa cresceu em relação à outra. */
export function variacao(agora, antes) {
  const a = Number(agora) || 0;
  const b = Number(antes) || 0;
  if (b === 0) return a === 0 ? { texto: 'igual', sinal: 0 } : { texto: 'primeira vez', sinal: 1 };
  const pct = ((a - b) / b) * 100;
  const arredondado = Math.round(pct);
  if (arredondado === 0) return { texto: 'igual', sinal: 0 };
  return {
    texto: (arredondado > 0 ? '+' : '') + arredondado + '%',
    sinal: arredondado > 0 ? 1 : -1
  };
}
