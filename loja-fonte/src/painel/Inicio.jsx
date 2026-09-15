/* INÍCIO.
 *
 * A primeira tela responde três perguntas e nada mais: quanto entrou hoje
 * contra ontem no mesmo ponto do dia, o que está esperando alguma coisa sua, e
 * o caminho para os relatórios. */

import { useEffect, useState } from 'react';
import { moeda } from '../dinheiro.js';
import { pedidos as buscarPedidos, itensDosPedidos, custosDosPedidos } from './dadosPainel.js';
import { montar, somar } from './resumo.js';
import { periodos } from './periodos.js';
import { CartaoNumero, Etiqueta, quando } from './pecas.jsx';

const ESPERANDO = {
  aguardando: 'Confirmar o pagamento',
  pendente: 'Confirmar o pagamento',
  pago: 'Separar',
  separacao: 'Enviar'
};

export default function Inicio({ irPara }) {
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [lista, setLista] = useState([]);
  const [agora] = useState(() => new Date());

  useEffect(() => {
    let vivo = true;

    (async () => {
      setCarregando(true);
      setErroCarga(null);
      try {
        /* Ontem inteiro já dá para comparar com hoje; os pedidos em andamento
           podem ser mais antigos, então busca os últimos 60 dias. */
        const de = new Date(agora.getTime() - 60 * 86400000);
        const ps = await buscarPedidos({ de });
        const ids = ps.map((p) => p.id);
        const [itens, custos] = await Promise.all([itensDosPedidos(ids), custosDosPedidos(ids)]);
        if (vivo) setLista(montar(ps, itens, custos));
      } catch (e) {
        if (vivo) setErroCarga(String((e && e.message) || e));
      }
      if (vivo) setCarregando(false);
    })();

    return () => { vivo = false; };
  }, [agora]);

  if (carregando) return <p className="pn-carregando">Carregando…</p>;
  if (erroCarga) return <div className="pn-erro"><strong>Não conseguimos ler os pedidos.</strong><br />{erroCarga}</div>;

  const hojeFaixa = periodos(agora)[0];
  const hoje = somar(lista, hojeFaixa.de, hojeFaixa.ate);
  const ontem = somar(lista, hojeFaixa.antes.de, hojeFaixa.antes.ate);

  const andando = lista
    .filter((p) => ESPERANDO[p.status])
    .sort((a, b) => a.quando - b.quando);

  return (
    <>
      <h1 className="pn-titulo">Início</h1>
      <p className="pn-ajuda">
        {agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        {' · '}{agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </p>

      <div className="pn-cartoes">
        <CartaoNumero rotulo="Faturamento de hoje" valor={hoje.faturamento}
          antes={ontem.faturamento} antesNome={hojeFaixa.antesNome} />
        <CartaoNumero rotulo="Lucro de hoje" valor={hoje.lucro}
          antes={ontem.lucro} antesNome={hojeFaixa.antesNome} />
        <CartaoNumero rotulo="Pedidos de hoje" valor={hoje.pedidos} dinheiro={false}
          antes={ontem.pedidos} antesNome={hojeFaixa.antesNome} />
      </div>

      <p className="pn-secao">Esperando você</p>

      {andando.length === 0 ? (
        <div className="pn-vazio">
          <strong>Nada pendente.</strong>
          <p>Todo pedido está resolvido.</p>
        </div>
      ) : (
        <div className="pn-lista">
          {andando.map((p) => (
            <button key={p.id} type="button" className="pn-item pn-item--clicavel"
              onClick={() => irPara('pedidos')}>
              <div className="pn-item-corpo">
                <p className="pn-item-nome">#{p.numero} · {p.nome}</p>
                <p className="pn-item-linha"><b>{ESPERANDO[p.status]}</b></p>
                <p className="pn-item-linha">{quando(p.criado_em)}</p>
              </div>
              <div className="pn-item-lado">
                <p className="pn-item-valor">{moeda(p.totalCobrado)}</p>
                <p className="pn-item-linha"><Etiqueta status={p.status} /></p>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="pn-secao">Números</p>
      <div className="pn-botoes">
        <button type="button" className="pn-botao pn-botao--claro" onClick={() => irPara('relatorios')}>
          Ver os relatórios
        </button>
        <button type="button" className="pn-botao pn-botao--claro" onClick={() => irPara('pedidos')}>
          Ver todos os pedidos
        </button>
      </div>
    </>
  );
}
