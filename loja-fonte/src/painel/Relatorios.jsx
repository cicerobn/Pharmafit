/* RELATÓRIOS.
 *
 * Cinco períodos, cada um comparado com o de mesma duração logo antes, e o
 * rótulo embaixo do número diz qual é a comparação. "Contra o mês passado" no
 * dia 3 compara três dias com trinta e faz qualquer mês parecer um desastre.
 *
 * O gráfico é fatiado no calendário — o dia em horas, a semana e o mês em dias,
 * o ano em meses — e a tela mostra a soma das barras ao lado do número do
 * cartão, para você conferir com os olhos que as duas coisas batem. */

import { useEffect, useMemo, useState } from 'react';
import { moeda } from '../dinheiro.js';
import { pedidos as buscarPedidos, itensDosPedidos, custosDosPedidos } from './dadosPainel.js';
import { montar, somar, serie } from './resumo.js';
import { periodos, fatias } from './periodos.js';
import { CartaoNumero } from './pecas.jsx';

export default function Relatorios() {
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [lista, setLista] = useState([]);
  const [qual, setQual] = useState('mes');
  const [agora] = useState(() => new Date());

  const faixas = useMemo(() => periodos(agora), [agora]);

  useEffect(() => {
    let vivo = true;

    (async () => {
      setCarregando(true);
      setErroCarga(null);
      try {
        /* Busca desde o começo do período mais antigo que a tela mostra — o
           ano passado — e faz todas as contas com esses mesmos pedidos. Uma ida
           ao banco em vez de dez. */
        const inicio = faixas.reduce((menor, f) => (f.antes.de < menor ? f.antes.de : menor), faixas[0].antes.de);
        const ps = await buscarPedidos({ de: inicio });
        const ids = ps.map((p) => p.id);
        const [itens, custos] = await Promise.all([itensDosPedidos(ids), custosDosPedidos(ids)]);
        if (vivo) setLista(montar(ps, itens, custos));
      } catch (e) {
        if (vivo) setErroCarga(String((e && e.message) || e));
      }
      if (vivo) setCarregando(false);
    })();

    return () => { vivo = false; };
  }, [faixas]);

  if (carregando) return <p className="pn-carregando">Somando os pedidos…</p>;
  if (erroCarga) return <div className="pn-erro"><strong>Não conseguimos ler os pedidos.</strong><br />{erroCarga}</div>;

  const faixa = faixas.find((f) => f.id === qual) || faixas[0];
  const hoje = somar(lista, faixa.de, faixa.ate);
  const antes = somar(lista, faixa.antes.de, faixa.antes.ate);

  const pedacos = fatias(faixa);
  const linhaFaturamento = serie(lista, pedacos, 'faturamento');
  const linhaLucro = serie(lista, pedacos, 'lucro');

  const semVenda = lista.length === 0;

  return (
    <>
      <h1 className="pn-titulo">Relatórios</h1>
      <p className="pn-ajuda">
        Só entra na conta pedido já pago. Pedido esperando pagamento e pedido
        cancelado ficam de fora.
      </p>

      <div className="pn-filtros">
        {faixas.map((f) => (
          <button key={f.id} type="button" aria-pressed={qual === f.id} onClick={() => setQual(f.id)}>
            {f.nome}
          </button>
        ))}
      </div>

      {semVenda ? (
        <div className="pn-vazio">
          <strong>Nenhuma venda registrada ainda.</strong>
          <p>Quando o primeiro pedido for pago, os números aparecem aqui.</p>
        </div>
      ) : (
        <>
          <div className="pn-cartoes">
            <CartaoNumero rotulo="Faturamento" valor={hoje.faturamento}
              antes={antes.faturamento} antesNome={faixa.antesNome} />
            <CartaoNumero rotulo="Lucro" valor={hoje.lucro}
              antes={antes.lucro} antesNome={faixa.antesNome}
              pe={hoje.lucroIncompleto ? 'Tem produto vendido sem preço de compra cadastrado: o lucro real é menor que esse.' : null} />
            <CartaoNumero rotulo="Pedidos" valor={hoje.pedidos} dinheiro={false}
              antes={antes.pedidos} antesNome={faixa.antesNome} />
            <CartaoNumero rotulo="Ticket médio" valor={hoje.ticket}
              antes={antes.ticket} antesNome={faixa.antesNome} />
          </div>

          <p className="pn-secao">De onde sai a conta</p>
          <div className="pn-bloco">
            <div className="pn-par"><span>Produtos vendidos</span><span>{moeda(hoje.produtos)}</span></div>
            <div className="pn-par"><span>Frete cobrado</span><span>{moeda(hoje.frete)}</span></div>
            <div className="pn-par pn-par--total"><span>Faturamento</span><span>{moeda(hoje.faturamento)}</span></div>

            <div className="pn-par" style={{ marginTop: 14 }}><span>Produtos vendidos</span><span>{moeda(hoje.produtos)}</span></div>
            <div className="pn-par"><span>Custo de compra do que saiu</span><span>− {moeda(hoje.custo)}</span></div>
            <div className="pn-par pn-par--total"><span>Lucro dos produtos</span><span>{moeda(hoje.lucro)}</span></div>

            <p className="pn-campo-dica" style={{ marginTop: 12 }}>
              O frete cobrado entra no faturamento porque é dinheiro que entrou, e
              fica fora do lucro porque a entrega também custa. Se ele entrasse no
              lucro, a loja pareceria mais lucrativa do que é.
            </p>
          </div>

          <Grafico titulo="Faturamento" faixa={faixa} linha={linhaFaturamento} total={hoje.faturamento} />
          <Grafico titulo="Lucro" faixa={faixa} linha={linhaLucro} total={hoje.lucro} />

          <p className="pn-secao">Mais vendidos no período</p>
          <MaisVendidos lista={lista} faixa={faixa} />
        </>
      )}
    </>
  );
}

/* ---------- gráfico de barras ---------- */

function Grafico({ titulo, faixa, linha, total }) {
  const maior = linha.reduce((m, p) => Math.max(m, p.valor), 0);
  const soma = Math.round(linha.reduce((s, p) => s + p.valor, 0) * 100) / 100;
  const bate = Math.abs(soma - total) < 0.01;

  /* "mês" não faz plural com s: mês/meses. Um só e uma dúzia se escrevem
     diferente, e escrever "9 mêss" na tela do dono é constrangedor. */
  const UNIDADES = {
    hora: ['hora', 'horas'],
    dia: ['dia', 'dias'],
    mes: ['mês', 'meses']
  };
  const par = UNIDADES[faixa.fatia] || UNIDADES.dia;
  const unidade = linha.length === 1 ? par[0] : par[1];

  return (
    <div className="pn-grafico">
      <div className="pn-grafico-topo">
        <h3>{titulo}</h3>
        <span>{linha.length} {unidade}</span>
      </div>

      <div className="pn-barras" role="img"
        aria-label={`${titulo} por ${par[0]}: ${linha.map((p) => `${p.rotulo} ${moeda(p.valor)}`).join(', ')}`}>
        {linha.map((p, i) => (
          <div key={i} className={`pn-barra${p.valor === 0 ? ' pn-barra--zero' : ''}`} title={`${p.rotulo}: ${moeda(p.valor)}`}>
            <i style={{ height: maior > 0 ? Math.max(2, Math.round((p.valor / maior) * 100)) + '%' : '2px' }} />
          </div>
        ))}
      </div>

      <div className="pn-eixo" aria-hidden="true">
        {linha.map((p, i) => (
          <span key={i}>{linha.length > 16 && i % 2 ? '' : p.curto}</span>
        ))}
      </div>

      {/* A conferência fica na tela, não só no teste: se um dia o gráfico for
          cortado num número fixo de pontos, esta linha denuncia na hora. */}
      <p className="pn-conferido">
        Soma das barras: <b>{moeda(soma)}</b>{' '}
        {bate ? '— o mesmo número do cartão acima.' : `— NÃO bate com ${moeda(total)}. Me avise.`}
      </p>
    </div>
  );
}

/* ---------- mais vendidos ---------- */

function MaisVendidos({ lista, faixa }) {
  const ranking = useMemo(() => {
    const por = {};
    lista.forEach((p) => {
      const t = p.quando.getTime();
      if (t < faixa.de.getTime() || t >= faixa.ate.getTime()) return;
      if (['pago', 'separacao', 'enviado'].indexOf(p.status) < 0) return;
      p.itens.forEach((i) => {
        const chave = i.produto_id;
        por[chave] = por[chave] || { nome: i.nome, apresentacao: i.apresentacao, pecas: 0, valor: 0 };
        por[chave].pecas += i.quantidade;
        por[chave].valor += i.recebido;
      });
    });
    return Object.values(por).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [lista, faixa]);

  if (ranking.length === 0) {
    return <div className="pn-vazio"><strong>Nenhuma venda neste período.</strong></div>;
  }

  return (
    <div className="pn-lista">
      {ranking.map((r, i) => (
        <div className="pn-item" key={i}>
          <div className="pn-item-corpo">
            <p className="pn-item-nome">{r.nome}</p>
            {r.apresentacao && <p className="pn-item-linha"><b>{r.apresentacao}</b></p>}
            <p className="pn-item-linha">{r.pecas} {r.pecas === 1 ? 'unidade' : 'unidades'}</p>
          </div>
          <div className="pn-item-lado">
            <p className="pn-item-valor">{moeda(r.valor)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
