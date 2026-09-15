/* A loja, numa página só. */

import { useEffect, useMemo, useState } from 'react';
import {
  carregarLoja, freteDaLoja, cupomDaLoja, bannerDaLoja, nomeDaLoja,
  zapDaLoja, pagamentoDaLoja, meusDados, gravarPedido
} from './dados.js';
import { moeda, precoDoProduto, contaDoCarrinho } from './dinheiro.js';
import { idiomaGuardado, guardarIdioma, textos, IDIOMAS } from './idioma.js';
import { IconeBusca, IconeSacola, IconeCategoria } from './Icones.jsx';
import Cartao from './Cartao.jsx';
import Carrinho from './Carrinho.jsx';
import Checkout, { PedidoPronto } from './Checkout.jsx';

/** Texto sem acento e minúsculo, para a busca não depender de acentuação. */
function achatar(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [loja, setLoja] = useState({ categorias: [], produtos: [], ajustes: {} });

  const [idioma, setIdioma] = useState(idiomaGuardado);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState(null);

  const [carrinho, setCarrinho] = useState({});
  const [cupomTexto, setCupomTexto] = useState('');
  const [cupomAplicado, setCupomAplicado] = useState(false);
  const [recadoCupom, setRecadoCupom] = useState(null);

  const [gaveta, setGaveta] = useState(null); // 'carrinho' | 'checkout' | 'pronto'
  const [referencia, setReferencia] = useState(null);
  /* O total do pedido que acabou de sair. Guardado à parte porque o carrinho é
     esvaziado na hora, e a tela de pagamento ainda precisa dizer quanto pagar. */
  const [totalPago, setTotalPago] = useState(null);

  const t = textos(idioma);

  async function buscarLoja() {
    setCarregando(true);
    setErroCarga(null);
    try {
      setLoja(await carregarLoja());
    } catch (e) {
      setErroCarga(String((e && e.message) || e));
    }
    setCarregando(false);
  }

  useEffect(() => { buscarLoja(); }, []);

  function trocarIdioma(id) {
    setIdioma(id);
    guardarIdioma(id);
  }

  /* ---------- ajustes da loja ---------- */

  const frete = freteDaLoja(loja.ajustes);
  const cupomLoja = cupomDaLoja(loja.ajustes);
  const banner = bannerDaLoja(loja.ajustes);
  const nomeLoja = nomeDaLoja(loja.ajustes);
  const zapLoja = zapDaLoja(loja.ajustes);
  const pagamento = pagamentoDaLoja(loja.ajustes);

  /* O campo de cupom só aparece se a loja tiver um cupom E existir produto com
     preço de membro. Sem os dois, o campo não faria nada — e campo que não faz
     nada não vai à tela. */
  const temPrecoDeMembro = loja.produtos.some((p) => {
    const membro = Number(p.preco_vip);
    const normal = Number(p.preco);
    return Number.isFinite(membro) && membro > 0 && Number.isFinite(normal) && membro < normal;
  });
  const mostrarCupom = Boolean(cupomLoja) && temPrecoDeMembro;

  /* ---------- vitrine ---------- */

  const categoriasOrdenadas = useMemo(() => {
    // A categoria em destaque vem primeiro, mesmo que a ordem diga outra coisa.
    return [...loja.categorias].sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));
  }, [loja.categorias]);

  const visiveis = useMemo(() => {
    const termo = achatar(busca).trim();
    return loja.produtos.filter((p) => {
      if (categoria && p.categoria !== categoria) return false;
      if (!termo) return true;
      return achatar([p.nome, p.apresentacao, p.marca].join(' ')).includes(termo);
    });
  }, [loja.produtos, categoria, busca]);

  /* ---------- carrinho ---------- */

  const linhas = useMemo(() => {
    return Object.keys(carrinho)
      .map((id) => {
        const produto = loja.produtos.find((p) => p.produto_id === id);
        if (!produto) return null;
        const { vigente } = precoDoProduto(produto, cupomAplicado);
        if (vigente === null) return null;
        return {
          produto_id: id,
          nome: produto.nome,
          apresentacao: produto.apresentacao,
          imagem: produto.imagem,
          estoque: Number(produto.estoque || 0),
          preco: vigente,
          quantidade: carrinho[id]
        };
      })
      .filter(Boolean);
  }, [carrinho, loja.produtos, cupomAplicado]);

  const conta = contaDoCarrinho(linhas, frete);

  function adicionar(produto) {
    setCarrinho((atual) => {
      const tem = atual[produto.produto_id] || 0;
      const limite = Number(produto.estoque || 0);
      if (tem >= limite) return atual;
      return { ...atual, [produto.produto_id]: tem + 1 };
    });
  }

  function mais(id) {
    setCarrinho((atual) => {
      const produto = loja.produtos.find((p) => p.produto_id === id);
      const limite = Number((produto && produto.estoque) || 0);
      const tem = atual[id] || 0;
      if (tem >= limite) return atual;
      return { ...atual, [id]: tem + 1 };
    });
  }

  function menos(id) {
    setCarrinho((atual) => {
      const tem = atual[id] || 0;
      if (tem <= 1) {
        const copia = { ...atual };
        delete copia[id];
        return copia;
      }
      return { ...atual, [id]: tem - 1 };
    });
  }

  function remover(id) {
    setCarrinho((atual) => {
      const copia = { ...atual };
      delete copia[id];
      return copia;
    });
  }

  function aplicarCupom() {
    const digitado = cupomTexto.trim().toUpperCase();
    if (cupomLoja && digitado === String(cupomLoja).trim().toUpperCase()) {
      setCupomAplicado(true);
      setRecadoCupom({ tipo: 'ok', texto: t.cupomOk });
    } else {
      setCupomAplicado(false);
      setRecadoCupom({ tipo: 'erro', texto: t.cupomErro });
    }
  }

  async function enviarPedido(cliente) {
    const r = await gravarPedido({ cliente, linhas, conta });

    if (r.ok) {
      setReferencia(r.referencia);
      setTotalPago(conta.total);
      setCarrinho({});
      setGaveta('pronto');
      return r;
    }

    // Preço recusado pelo banco quer dizer catálogo mudado no meio da compra.
    if (r.precoMudou) {
      await buscarLoja();
      setCarrinho({});
      setGaveta(null);
    }
    return r;
  }

  /* ---------- tela ---------- */

  /* Texto de verdade, e não três pontinhos cinzas: num celular, "…" perdido no
     alto de uma tela branca não se distingue de um site quebrado. */
  if (carregando) {
    return (
      <div className="lj-casca">
        <p className="lj-carregando">Carregando os produtos…</p>
      </div>
    );
  }

  if (erroCarga) {
    return (
      <div className="lj-casca">
        <div className="lj-erro">
          <strong>Não conseguimos carregar a loja.</strong>
          {erroCarga}
          <p style={{ margin: '10px 0 0' }}>
            <a href="diagnostico.html">Conferir o que está faltando</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lj-casca">
      <header className="lj-topo">
        {/* O nome vem dos ajustes: quando estiver definido no painel, aparece
            aqui. Não invento nome de loja. */}
        {nomeLoja
          ? <h1 className="lj-marca">{nomeLoja}</h1>
          : <span className="lj-marca" aria-hidden="true" />}

        <div className="lj-topo-acoes">
          <div className="lj-idioma" role="group" aria-label="Idioma">
            {IDIOMAS.map((i) => (
              <button
                key={i.id}
                type="button"
                aria-pressed={idioma === i.id}
                onClick={() => trocarIdioma(i.id)}
                title={i.nome}
              >{i.rotulo}</button>
            ))}
          </div>

          <button
            type="button"
            className="lj-botao-carrinho"
            onClick={() => setGaveta('carrinho')}
            aria-label={t.carrinho}
          >
            <IconeSacola />
            {conta.pecas > 0 && <span className="lj-contador">{conta.pecas}</span>}
          </button>
        </div>
      </header>

      {banner && (
        <div className="lj-banner">
          {banner.imagem && <img src={banner.imagem} alt={banner.titulo || ''} />}
          {(banner.titulo || banner.texto) && (
            <div className="lj-banner-texto">
              {banner.titulo && <p className="lj-banner-titulo">{banner.titulo}</p>}
              {banner.texto && <p className="lj-banner-sub">{banner.texto}</p>}
            </div>
          )}
        </div>
      )}

      <div className="lj-busca">
        <IconeBusca />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t.buscar}
          aria-label={t.buscar}
        />
      </div>

      {categoriasOrdenadas.length > 0 && (
        <nav className="lj-categorias" aria-label="Categorias">
          <button
            type="button"
            className="lj-chip"
            aria-pressed={categoria === null}
            onClick={() => setCategoria(null)}
          >{t.verTudo}</button>

          {categoriasOrdenadas.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`lj-chip${c.destaque ? ' lj-chip--destaque' : ''}`}
              aria-pressed={categoria === c.id}
              onClick={() => setCategoria(categoria === c.id ? null : c.id)}
            >
              <IconeCategoria chave={c.icone} />
              {c.nome}
            </button>
          ))}
        </nav>
      )}

      {visiveis.length === 0 ? (
        <div className="lj-vazio">
          {loja.produtos.length === 0 ? (
            <>
              <strong>{t.catalogoVazio}</strong>
              <p>{t.catalogoVazioAjuda}</p>
            </>
          ) : (
            <strong>{t.buscarVazio} “{busca || (categoria || '')}”</strong>
          )}
        </div>
      ) : (
        <div className="lj-grade">
          {visiveis.map((p) => (
            <Cartao
              key={p.produto_id}
              produto={p}
              t={t}
              cupomAplicado={cupomAplicado}
              noCarrinho={carrinho[p.produto_id] || 0}
              onAdicionar={adicionar}
            />
          ))}
        </div>
      )}

      {conta.pecas > 0 && gaveta === null && (
        <div className="lj-barra">
          <div className="lj-barra-info">
            <b>{moeda(conta.total)}</b>
            <span>{conta.pecas} {conta.pecas === 1 ? 'item' : t.itens.toLowerCase()}</span>
          </div>
          <button type="button" onClick={() => setGaveta('carrinho')}>{t.carrinho}</button>
        </div>
      )}

      {gaveta === 'carrinho' && (
        <Carrinho
          t={t}
          linhas={linhas}
          conta={conta}
          mostrarCupom={mostrarCupom}
          cupomTexto={cupomTexto}
          setCupomTexto={setCupomTexto}
          cupomAplicado={cupomAplicado}
          recadoCupom={recadoCupom}
          onAplicarCupom={aplicarCupom}
          onMais={mais}
          onMenos={menos}
          onRemover={remover}
          onFechar={() => setGaveta(null)}
          onContinuar={() => setGaveta('checkout')}
        />
      )}

      {gaveta === 'checkout' && (
        <Checkout
          t={t}
          linhas={linhas}
          conta={conta}
          jaComprou={meusDados()}
          onVoltar={() => setGaveta('carrinho')}
          onFechar={() => setGaveta(null)}
          onEnviar={enviarPedido}
        />
      )}

      {gaveta === 'pronto' && (
        <PedidoPronto
          t={t}
          referencia={referencia}
          total={totalPago}
          pagamento={pagamento}
          zap={zapLoja}
          onNovo={() => setGaveta(null)}
          onFechar={() => setGaveta(null)}
        />
      )}
    </div>
  );
}
