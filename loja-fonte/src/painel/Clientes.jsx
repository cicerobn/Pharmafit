/* CLIENTES.
 *
 * A lista nasce dos pedidos, não de um cadastro. A loja aceita comprar sem
 * criar conta — é o caminho que mais vende — então quem "é cliente" é quem
 * comprou. Cada pessoa é reconhecida pelo CPF; sem CPF, pelo WhatsApp.
 *
 * O botão de WhatsApp monta o link a partir do telefone guardado, com o 55 na
 * frente. Sem o 55 o número fica bonito na tela e o toque não abre conversa
 * nenhuma — e ninguém descobre isso até perder um cliente. */

import { useEffect, useMemo, useState } from 'react';
import { moeda } from '../dinheiro.js';
import { IconeBusca } from '../Icones.jsx';
import { pedidos as buscarPedidos, itensDosPedidos } from './dadosPainel.js';
import { montar, vendido } from './resumo.js';
import { Gaveta, Etiqueta, quando, achatar, linkZap } from './pecas.jsx';

function chaveDe(p) {
  const cpf = String(p.cpf || '').replace(/\D/g, '');
  if (cpf.length === 11) return 'cpf:' + cpf;
  const tel = String(p.telefone || '').replace(/\D/g, '');
  return 'tel:' + tel;
}

export default function Clientes() {
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('gastou');
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    let vivo = true;

    (async () => {
      setCarregando(true);
      setErroCarga(null);
      try {
        const ps = await buscarPedidos({});
        const itens = await itensDosPedidos(ps.map((p) => p.id));
        if (vivo) setLista(montar(ps, itens, []));
      } catch (e) {
        if (vivo) setErroCarga(String((e && e.message) || e));
      }
      if (vivo) setCarregando(false);
    })();

    return () => { vivo = false; };
  }, []);

  const pessoas = useMemo(() => {
    const por = {};

    lista.forEach((p) => {
      const k = chaveDe(p);
      if (!por[k]) {
        por[k] = {
          chave: k,
          nome: p.nome,
          telefone: p.telefone,
          cpf: p.cpf,
          email: p.email,
          nascimento: p.nascimento,
          cep: p.cep,
          cidade: p.cidade,
          rua: p.rua,
          numero_casa: p.numero_casa,
          complemento: p.complemento,
          pedidos: [],
          gastou: 0,
          compras: 0,
          primeira: p.quando,
          ultima: p.quando
        };
      }

      const c = por[k];
      c.pedidos.push(p);
      if (vendido(p)) { c.gastou += p.totalCobrado; c.compras++; }
      if (p.quando > c.ultima) {
        /* Os dados mais recentes valem: se a pessoa mudou de endereço, o
           endereço novo é o do último pedido. */
        c.ultima = p.quando;
        c.nome = p.nome;
        c.telefone = p.telefone;
        c.email = p.email || c.email;
        c.cep = p.cep || c.cep;
        c.cidade = p.cidade || c.cidade;
        c.rua = p.rua || c.rua;
        c.numero_casa = p.numero_casa || c.numero_casa;
        c.complemento = p.complemento;
      }
      if (p.quando < c.primeira) c.primeira = p.quando;
    });

    return Object.values(por);
  }, [lista]);

  const visiveis = useMemo(() => {
    const termo = achatar(busca).trim();
    const so = termo.replace(/\D/g, '');

    const filtradas = pessoas.filter((c) => {
      if (!termo) return true;
      if (achatar(c.nome).includes(termo)) return true;
      if (achatar(c.cidade).includes(termo)) return true;
      if (so && String(c.telefone || '').replace(/\D/g, '').includes(so)) return true;
      if (so && String(c.cpf || '').replace(/\D/g, '').includes(so)) return true;
      return false;
    });

    return filtradas.sort((a, b) => {
      if (ordem === 'gastou') return b.gastou - a.gastou;
      if (ordem === 'recente') return b.ultima - a.ultima;
      return achatar(a.nome).localeCompare(achatar(b.nome));
    });
  }, [pessoas, busca, ordem]);

  if (carregando) return <p className="pn-carregando">Carregando os clientes…</p>;
  if (erroCarga) return <div className="pn-erro"><strong>Não conseguimos ler os pedidos.</strong><br />{erroCarga}</div>;

  if (pessoas.length === 0) {
    return (
      <>
        <h1 className="pn-titulo">Clientes</h1>
        <div className="pn-vazio">
          <strong>Ninguém comprou ainda.</strong>
          <p>Esta lista se monta sozinha a partir dos pedidos.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="pn-titulo">Clientes</h1>
      <p className="pn-ajuda">
        {pessoas.length} {pessoas.length === 1 ? 'pessoa' : 'pessoas'} já compraram.
        A lista se monta a partir dos pedidos.
      </p>

      <div className="pn-busca">
        <IconeBusca />
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome, cidade, WhatsApp ou CPF" aria-label="Buscar cliente" />
      </div>

      <div className="pn-filtros">
        {[
          { id: 'gastou', nome: 'Quem gastou mais' },
          { id: 'recente', nome: 'Compra mais recente' },
          { id: 'nome', nome: 'Por nome' }
        ].map((o) => (
          <button key={o.id} type="button" aria-pressed={ordem === o.id} onClick={() => setOrdem(o.id)}>
            {o.nome}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <div className="pn-vazio">
          <strong>Ninguém com esse termo.</strong>
        </div>
      ) : (
        <div className="pn-lista">
          {visiveis.map((c) => (
            <button key={c.chave} type="button" className="pn-item pn-item--clicavel" onClick={() => setAberto(c)}>
              <div className="pn-item-corpo">
                <p className="pn-item-nome">{c.nome}</p>
                <p className="pn-item-linha">{c.telefone}{c.cidade ? ` · ${c.cidade}` : ''}</p>
                <p className="pn-item-linha">
                  {c.compras === 0
                    ? 'Nenhuma compra paga ainda'
                    : `${c.compras} compra${c.compras > 1 ? 's' : ''} · última ${c.ultima.toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <div className="pn-item-lado">
                <p className="pn-item-valor">{moeda(c.gastou)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {aberto && <FichaCliente c={aberto} aoFechar={() => setAberto(null)} />}
    </>
  );
}

function FichaCliente({ c, aoFechar }) {
  const zap = linkZap(c.telefone, `Oi ${String(c.nome || '').split(' ')[0]}, aqui é da loja.`);

  const endereco = [
    [c.rua, c.numero_casa].filter(Boolean).join(', '),
    c.complemento,
    [c.cidade, c.cep].filter(Boolean).join(' · ')
  ].filter(Boolean).join('\n');

  return (
    <Gaveta titulo={c.nome} aoFechar={aoFechar}
      rodape={
        zap ? (
          <a className="pn-botao" href={zap} target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: 'none', textAlign: 'center' }}>
            Falar no WhatsApp
          </a>
        ) : (
          <button type="button" className="pn-botao pn-botao--claro" onClick={aoFechar}>Fechar</button>
        )
      }>

      <div className="pn-bloco">
        <h3>Dados</h3>
        <div className="pn-par"><span>WhatsApp</span><span>{c.telefone || '—'}</span></div>
        <div className="pn-par"><span>CPF</span><span>{c.cpf || '—'}</span></div>
        <div className="pn-par"><span>Nascimento</span><span>
          {c.nascimento ? new Date(c.nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
        </span></div>
        <div className="pn-par"><span>E-mail</span><span>{c.email || '—'}</span></div>
      </div>

      <div className="pn-bloco">
        <h3>Endereço da última compra</h3>
        <p className="pn-endereco">{endereco || '—'}</p>
      </div>

      <div className="pn-bloco">
        <h3>Resumo</h3>
        <div className="pn-par"><span>Compras pagas</span><span>{c.compras}</span></div>
        <div className="pn-par"><span>Primeira vez</span><span>{c.primeira.toLocaleDateString('pt-BR')}</span></div>
        <div className="pn-par"><span>Última vez</span><span>{c.ultima.toLocaleDateString('pt-BR')}</span></div>
        <div className="pn-par pn-par--total"><span>Total gasto</span><span>{moeda(c.gastou)}</span></div>
      </div>

      <p className="pn-secao">Pedidos desta pessoa</p>
      <div className="pn-lista">
        {c.pedidos.slice().sort((a, b) => b.quando - a.quando).map((p) => (
          <div className="pn-item" key={p.id}>
            <div className="pn-item-corpo">
              <p className="pn-item-nome">#{p.numero}</p>
              <p className="pn-item-linha">{quando(p.criado_em)}</p>
              <p className="pn-item-linha"><Etiqueta status={p.status} /></p>
            </div>
            <div className="pn-item-lado">
              <p className="pn-item-valor">{moeda(p.totalCobrado)}</p>
              <p className="pn-item-linha">{p.pecas} {p.pecas === 1 ? 'item' : 'itens'}</p>
            </div>
          </div>
        ))}
      </div>
    </Gaveta>
  );
}
