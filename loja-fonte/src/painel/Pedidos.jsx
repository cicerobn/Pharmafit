/* PEDIDOS.
 *
 * A conta que aparece aqui é a que está gravada no pedido, não uma conta nova
 * feita na tela: itens + frete = total, sempre, do jeito que o banco fechou no
 * momento da venda. Reajuste de preço de hoje não mexe em pedido de ontem.
 *
 * Os botões de andamento não decidem nada: eles pedem, e o banco aceita ou
 * recusa. Voltar atrás num pagamento que já aconteceu é recusado pelo banco,
 * não por um "if" desta tela. */

import { useEffect, useMemo, useState } from 'react';
import { moeda } from '../dinheiro.js';
import { IconeBusca } from '../Icones.jsx';
import { pedidos as buscarPedidos, itensDosPedidos, mudarStatus } from './dadosPainel.js';
import { montar, vendido } from './resumo.js';
import { Gaveta, Etiqueta, NOMES_STATUS, quando, achatar, linkZap } from './pecas.jsx';
import NotaImpressa from './NotaImpressa.jsx';

const DIA = 86400000;

const JANELAS = [
  { id: 'hoje', nome: 'Hoje', dias: 0 },
  { id: '7', nome: '7 dias', dias: 7 },
  { id: '30', nome: '30 dias', dias: 30 },
  { id: 'tudo', nome: 'Tudo', dias: null }
];

const FILTROS_STATUS = [
  { id: 'andando', nome: 'Em andamento', status: ['aguardando', 'pendente', 'pago', 'separacao'] },
  { id: 'aguardando', nome: 'Esperando pagar', status: ['aguardando', 'pendente'] },
  { id: 'pago', nome: 'Pagos', status: ['pago'] },
  { id: 'separacao', nome: 'Separando', status: ['separacao'] },
  { id: 'enviado', nome: 'Enviados', status: ['enviado'] },
  { id: 'cancelado', nome: 'Cancelados', status: ['cancelado'] },
  { id: 'todos', nome: 'Todos', status: null }
];

/** A referência curta que o cliente vê na tela de pedido registrado. */
export function referencia(id) {
  return String(id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
}

export default function Pedidos({ inicial }) {
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [lista, setLista] = useState([]);

  const [janela, setJanela] = useState('30');
  const [filtro, setFiltro] = useState(inicial === 'andando' ? 'andando' : 'todos');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);
  const [imprimindo, setImprimindo] = useState(null);

  async function buscar() {
    setCarregando(true);
    setErroCarga(null);
    try {
      const j = JANELAS.find((x) => x.id === janela);
      let de = null;
      if (j.dias === 0) { de = new Date(); de.setHours(0, 0, 0, 0); }
      else if (j.dias) { de = new Date(Date.now() - j.dias * DIA); }

      const ps = await buscarPedidos({ de });
      const itens = await itensDosPedidos(ps.map((p) => p.id));
      setLista(montar(ps, itens, []));
    } catch (e) {
      setErroCarga(String((e && e.message) || e));
    }
    setCarregando(false);
  }

  useEffect(() => { buscar(); }, [janela]);

  const visiveis = useMemo(() => {
    const f = FILTROS_STATUS.find((x) => x.id === filtro);
    const termo = achatar(busca).trim();
    const so = termo.replace(/\D/g, '');

    return lista.filter((p) => {
      if (f.status && f.status.indexOf(p.status) < 0) return false;
      if (!termo) return true;

      /* O cliente cita a referência curta ("93938E"); você procura pelo número
         do pedido. As duas coisas têm que achar o mesmo pedido. */
      if (referencia(p.id).toLowerCase().includes(termo)) return true;
      if (String(p.numero) === so) return true;
      if (achatar(p.nome).includes(termo)) return true;
      if (so && String(p.telefone || '').replace(/\D/g, '').includes(so)) return true;
      if (so && String(p.cpf || '').replace(/\D/g, '').includes(so)) return true;
      return false;
    });
  }, [lista, filtro, busca]);

  const emAndamento = lista.filter((p) => ['aguardando', 'pendente', 'pago', 'separacao'].indexOf(p.status) >= 0);
  const recebido = visiveis.filter(vendido).reduce((s, p) => s + p.totalCobrado, 0);

  if (carregando) return <p className="pn-carregando">Carregando os pedidos…</p>;
  if (erroCarga) return <div className="pn-erro"><strong>Não conseguimos ler os pedidos.</strong><br />{erroCarga}</div>;

  return (
    <>
      <h1 className="pn-titulo">Pedidos</h1>
      <p className="pn-ajuda">
        {emAndamento.length === 0
          ? 'Nada em andamento agora.'
          : `${emAndamento.length} pedido${emAndamento.length > 1 ? 's' : ''} esperando alguma coisa sua.`}
      </p>

      <div className="pn-filtros">
        {JANELAS.map((j) => (
          <button key={j.id} type="button" aria-pressed={janela === j.id} onClick={() => setJanela(j.id)}>
            {j.nome}
          </button>
        ))}
      </div>

      <div className="pn-busca">
        <IconeBusca />
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Número, referência, nome, WhatsApp ou CPF" aria-label="Buscar pedido" />
      </div>

      <div className="pn-filtros">
        {FILTROS_STATUS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
            {f.nome}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <div className="pn-vazio">
          <strong>Nenhum pedido aqui.</strong>
          <p>Troque o período ou o filtro acima.</p>
        </div>
      ) : (
        <>
          <p className="pn-ajuda">
            {visiveis.length} pedido{visiveis.length > 1 ? 's' : ''} na tela
            {recebido > 0 && <> · {moeda(recebido)} já pagos</>}
          </p>

          <div className="pn-lista">
            {visiveis.map((p) => (
              <button key={p.id} type="button" className="pn-item pn-item--clicavel" onClick={() => setAberto(p)}>
                <div className="pn-item-corpo">
                  <p className="pn-item-nome">#{p.numero} · {p.nome}</p>
                  <p className="pn-item-linha">
                    {quando(p.criado_em)} · {p.pecas} {p.pecas === 1 ? 'item' : 'itens'}
                  </p>
                  <p className="pn-item-linha"><Etiqueta status={p.status} /></p>
                </div>
                <div className="pn-item-lado">
                  <p className="pn-item-valor">{moeda(p.totalCobrado)}</p>
                  <p className="pn-item-linha">ref. {referencia(p.id)}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {aberto && (
        <Detalhe
          pedido={aberto}
          aoFechar={() => setAberto(null)}
          aoMudar={async () => { setAberto(null); await buscar(); }}
          aoImprimir={() => setImprimindo(aberto)}
        />
      )}

      {imprimindo && <NotaImpressa pedido={imprimindo} aoTerminar={() => setImprimindo(null)} />}
    </>
  );
}

/* ---------- o detalhe ---------- */

const PROXIMOS = {
  aguardando: [{ para: 'pago', nome: 'Marcar como pago' }, { para: 'cancelado', nome: 'Cancelar' }],
  pendente: [{ para: 'pago', nome: 'Marcar como pago' }, { para: 'cancelado', nome: 'Cancelar' }],
  pago: [{ para: 'separacao', nome: 'Começar a separar' }, { para: 'cancelado', nome: 'Cancelar e devolver' }],
  separacao: [{ para: 'enviado', nome: 'Marcar como enviado' }, { para: 'cancelado', nome: 'Cancelar e devolver' }],
  enviado: [],
  cancelado: []
};

function enderecoInteiro(p) {
  const linhas = [
    p.nome,
    [p.rua, p.numero_casa].filter(Boolean).join(', '),
    p.complemento,
    [p.cidade, p.cep].filter(Boolean).join(' · '),
    p.telefone,
    p.cpf ? 'CPF ' + p.cpf : null
  ];
  return linhas.filter(Boolean).join('\n');
}

function Detalhe({ pedido: p, aoFechar, aoMudar, aoImprimir }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(null);

  const passos = PROXIMOS[p.status] || [];
  const zap = linkZap(p.telefone, `Oi ${String(p.nome || '').split(' ')[0]}, aqui é da loja. Sobre o seu pedido ${referencia(p.id)}:`);

  async function andar(para) {
    setErro(null);
    setOcupado(true);
    const r = await mudarStatus(p.id, para);
    setOcupado(false);
    setConfirmando(null);
    if (!r.ok) return setErro(r.erro);
    aoMudar();
  }

  async function copiar() {
    const texto = enderecoInteiro(p);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
      setErro('O navegador não deixou copiar. O endereço está aí em cima para selecionar na mão.');
    }
  }

  return (
    <Gaveta
      titulo={`Pedido #${p.numero}`}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="pn-botao pn-botao--claro" onClick={aoImprimir}>
            Imprimir a nota
          </button>
          {passos.length > 0 && (
            confirmando ? (
              <button type="button" className="pn-botao" onClick={() => andar(confirmando)} disabled={ocupado}>
                {ocupado ? 'Gravando…' : `Confirmo: ${NOMES_STATUS[confirmando]}`}
              </button>
            ) : (
              <button type="button" className="pn-botao" onClick={() => setConfirmando(passos[0].para)} disabled={ocupado}>
                {passos[0].nome}
              </button>
            )
          )}
        </>
      }
    >
      {erro && <p className="pn-erro">{erro}</p>}

      <div className="pn-bloco">
        <h3>Situação</h3>
        <Etiqueta status={p.status} />
        <div className="pn-linha-tempo" style={{ marginTop: 12 }}>
          <div><b>Pedido feito</b> <span>{quando(p.criado_em)}</span></div>
          {p.pago_em && <div><b>Pago</b> <span>{quando(p.pago_em)}</span></div>}
          {p.separacao_em && <div><b>Separando</b> <span>{quando(p.separacao_em)}</span></div>}
          {p.enviado_em && <div><b>Enviado</b> <span>{quando(p.enviado_em)}</span></div>}
          {p.cancelado_em && <div><b>Cancelado</b> <span>{quando(p.cancelado_em)}</span></div>}
        </div>

        {passos.length > 1 && (
          <div className="pn-botoes" style={{ marginTop: 12 }}>
            {passos.slice(1).map((s) => (
              confirmando === s.para ? (
                <button key={s.para} type="button" className="pn-botao pn-botao--perigo"
                  onClick={() => andar(s.para)} disabled={ocupado}>
                  Confirmo: {s.nome}
                </button>
              ) : (
                <button key={s.para} type="button" className="pn-botao pn-botao--claro"
                  onClick={() => setConfirmando(s.para)} disabled={ocupado}>
                  {s.nome}
                </button>
              )
            ))}
          </div>
        )}

        {p.status === 'enviado' && (
          <p className="pn-campo-dica" style={{ marginTop: 10 }}>
            Pedido enviado não muda mais de situação. Se precisar tratar devolução,
            resolva com o cliente — a história do pedido fica como está.
          </p>
        )}
      </div>

      <div className="pn-bloco">
        <h3>Para onde vai</h3>
        <p className="pn-endereco">{enderecoInteiro(p)}</p>

        <div className="pn-botoes" style={{ marginTop: 12 }}>
          <button type="button" className="pn-botao pn-botao--claro" onClick={copiar}>
            {copiado ? 'Copiado!' : 'Copiar tudo'}
          </button>
          {zap && (
            <a className="pn-botao pn-botao--claro" href={zap} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Falar no WhatsApp
            </a>
          )}
        </div>

        {p.email && <p className="pn-campo-dica" style={{ marginTop: 10 }}>{p.email}</p>}
      </div>

      <div className="pn-bloco">
        <h3>O que ele comprou</h3>
        {p.itens.map((i) => (
          <div className="pn-par" key={i.id}>
            <span>{i.quantidade} × {i.nome}{i.apresentacao ? ` · ${i.apresentacao}` : ''}</span>
            <span>{moeda(i.recebido)}</span>
          </div>
        ))}

        <div className="pn-par" style={{ marginTop: 6 }}>
          <span>Itens</span><span>{moeda(p.subtotal)}</span>
        </div>
        <div className="pn-par">
          <span>Frete</span><span>{moeda(p.frete)}</span>
        </div>
        <div className="pn-par pn-par--total">
          <span>Total</span><span>{moeda(p.totalCobrado)}</span>
        </div>

        <p className="pn-campo-dica" style={{ marginTop: 10 }}>
          Referência que o cliente vê: <b>{referencia(p.id)}</b> · forma de pagamento
          registrada: {p.metodo_pagamento === 'a_combinar' ? 'a combinar' : p.metodo_pagamento}
        </p>
      </div>

      <p className="pn-campo-dica">
        A taxa do gateway, o valor líquido e o código PIX do extrato vão aparecer
        aqui quando o pagamento automático existir. Hoje não há gateway ligado,
        então não há esse número para mostrar — e número inventado é pior que
        número ausente.
      </p>
    </Gaveta>
  );
}
