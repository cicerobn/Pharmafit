/* Cartão de produto. */

import { moeda, precoDoProduto, desconto } from './dinheiro.js';
import { IconeSemFoto } from './Icones.jsx';

export default function Cartao({ produto, t, cupomAplicado, noCarrinho, onAdicionar }) {
  const { vigente, antes, membro } = precoDoProduto(produto, cupomAplicado);
  const off = desconto(antes, vigente);

  const estoque = Number(produto.estoque || 0);
  const esgotado = estoque <= 0;
  const cheio = noCarrinho >= estoque;

  return (
    <article className="lj-cartao">
      {antes && !esgotado && (
        <span className="lj-selo">{off ? `-${off}%` : t.promocao}</span>
      )}

      <div className="lj-foto">
        {produto.imagem
          ? <img src={produto.imagem} alt={produto.nome} loading="lazy" />
          : <IconeSemFoto />}
      </div>

      <div className="lj-corpo">
        {produto.marca && <p className="lj-marca-item">{produto.marca}</p>}
        <h3 className="lj-nome">{produto.nome}</h3>

        {/* A apresentação em negrito é o que o cliente confere antes de comprar:
            uma ampola e quatro ampolas custam muito diferente. */}
        {produto.apresentacao && <p className="lj-apresentacao">{produto.apresentacao}</p>}

        {produto.descricao && <p className="lj-descricao">{produto.descricao}</p>}

        <div className="lj-precos">
          {antes && (
            <p className="lj-antes"><s>{moeda(antes)}</s></p>
          )}

          {vigente !== null
            ? <p className="lj-preco">{moeda(vigente)}</p>
            : <p className="lj-sem-preco">{t.semPreco}</p>}

          {membro !== null && (
            <span className="lj-selo-membro">{t.membro} {moeda(membro)}</span>
          )}

          {!esgotado && estoque <= 3 && (
            <p className="lj-estoque">
              {estoque === 1 ? t.ultimaUnidade : t.restam(estoque)}
            </p>
          )}
        </div>

        <button
          type="button"
          className={`lj-add${noCarrinho > 0 ? ' lj-add--no-carrinho' : ''}`}
          disabled={esgotado || vigente === null || cheio}
          onClick={() => onAdicionar(produto)}
        >
          {esgotado
            ? t.esgotado
            : noCarrinho > 0
              ? `${t.noCarrinho} · ${noCarrinho}`
              : t.adicionar}
        </button>
      </div>
    </article>
  );
}
