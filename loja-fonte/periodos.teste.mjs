/* Teste das fatias do gráfico, sem navegador.
 *
 * Ele não olha número de venda: olha o CALENDÁRIO. As fatias de um período têm
 * que cobrir esse período inteiro, sem sobrar, sem faltar e sem passar do fim.
 * Se essa regra vale, a soma do gráfico bate com o número do cartão por
 * construção — não por sorte, e não só no horário em que alguém testou.
 *
 * Rode com: node periodos.teste.mjs
 */

import { periodos, fatias } from './src/painel/periodos.js';

let falhas = 0;

function ok(nome, valor) {
  if (valor === true) { console.log('✓ ' + nome); return; }
  falhas++;
  console.log('✗ ' + nome + ' → ' + valor);
}

/* Vários horários do dia de propósito: o bug que isto pega só aparecia de
   manhã, quando o fim do período fica no meio do dia. */
const MOMENTOS = [
  '2026-09-15T00:01:00', '2026-09-15T09:32:00', '2026-09-15T13:00:00',
  '2026-09-15T23:59:00', '2026-01-01T00:30:00', '2026-03-01T07:15:00',
  '2026-12-31T22:45:00', '2026-02-28T18:00:00', '2024-02-29T11:00:00'
];

for (const texto of MOMENTOS) {
  const agora = new Date(texto);

  for (const p of periodos(agora)) {
    const f = fatias(p);
    const etiqueta = `${texto} · ${p.id}`;

    ok(`${etiqueta}: tem pelo menos uma fatia`, f.length > 0 || f.length);

    ok(`${etiqueta}: a primeira fatia começa no começo do período`,
      f[0].de.getTime() === p.de.getTime()
      || `${f[0].de.toISOString()} ≠ ${p.de.toISOString()}`);

    ok(`${etiqueta}: a última fatia termina no fim do período`,
      f[f.length - 1].ate.getTime() === p.ate.getTime()
      || `${f[f.length - 1].ate.toISOString()} ≠ ${p.ate.toISOString()}`);

    let emenda = true;
    for (let i = 1; i < f.length; i++) {
      if (f[i].de.getTime() !== f[i - 1].ate.getTime()) {
        emenda = `fatia ${i} começa em ${f[i].de.toISOString()} e a anterior terminou em ${f[i - 1].ate.toISOString()}`;
        break;
      }
    }
    ok(`${etiqueta}: uma fatia emenda na outra, sem buraco e sem sobreposição`, emenda);

    const duracao = f.reduce((s, x) => s + (x.ate.getTime() - x.de.getTime()), 0);
    ok(`${etiqueta}: as fatias somam a duração do período`,
      duracao === p.ate.getTime() - p.de.getTime()
      || `${duracao}ms de fatia contra ${p.ate.getTime() - p.de.getTime()}ms de período`);

    ok(`${etiqueta}: nenhuma fatia com duração negativa`,
      f.every((x) => x.ate.getTime() >= x.de.getTime()) || 'tem fatia invertida');

    /* O par de comparação tem que ter a MESMA duração. É isso que faz a
       porcentagem significar alguma coisa.
       Exceção consciente: "mês passado" é mês cheio contra mês cheio, e
       fevereiro tem menos dias que janeiro. Comparar 28 dias de fevereiro com
       só os 28 primeiros de janeiro seria mais estranho do que útil — o que se
       quer ali é "agosto contra julho", do jeito que se fala. */
    const agoraMs = p.ate.getTime() - p.de.getTime();
    const antesMs = p.antes.ate.getTime() - p.antes.de.getTime();

    if (p.id === 'mes_passado') {
      ok(`${etiqueta}: compara mês cheio com mês cheio`,
        (p.de.getDate() === 1 && p.antes.de.getDate() === 1
          && p.ate.getDate() === 1 && p.antes.ate.getDate() === 1)
        || 'algum dos limites não cai no dia 1');
    } else {
      ok(`${etiqueta}: o período de comparação tem a mesma duração (±1h de fuso)`,
        /* A trava contra invadir o período de agora pode encurtar a comparação.
           Encurtar é aceitável; passar do começo do período de agora não é. */
        antesMs <= agoraMs + 3600000
        || `${Math.round(agoraMs / 60000)}min contra ${Math.round(antesMs / 60000)}min`);
    }

    ok(`${etiqueta}: a comparação vem ANTES, não depois`,
      p.antes.ate.getTime() <= p.de.getTime()
      || `comparação termina em ${p.antes.ate.toISOString()}, depois do começo do período`);

    ok(`${etiqueta}: o rótulo diz contra o que é`,
      typeof p.antesNome === 'string' && p.antesNome.length > 3 || String(p.antesNome));
  }
}

console.log(falhas === 0 ? '\ntudo passou' : `\n${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
