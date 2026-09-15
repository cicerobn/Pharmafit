/* Gaveta do carrinho.
 *
 * O frete entra UMA vez, no rodapé, nunca por item. As três linhas ficam
 * visíveis de propósito: itens, frete e total. A conta tem que fechar na tela
 * do mesmo jeito que fecha no papel. */

import { moeda } from './dinheiro.js';
import { IconeFechar, IconeSemFoto } from './Icones.jsx';

export default function Carrinho({
  t, linhas, conta, mostrarCupom, cupomTexto, setCupomTexto,
  cupomAplicado, recadoCupom, onAplicarCupom,
  onMais, onMenos, onRemover, onFechar, onContinuar
}) {
  const vazio = linhas.length === 0;

  return (
    <div className="cr-fundo" role="dialog" aria-modal="true" aria-label={t.carrinho}>
      <div className="cr-painel">
        <div className="cr-cabeca">
          <h2 className="cr-titulo">{t.carrinho}</h2>
          <button type="button" className="cr-fechar" onClick={onFechar} aria-label={t.fechar}>
            <IconeFechar />
          </button>
        </div>

        <div className="cr-rolagem">
          {vazio ? (
            <div className="lj-vazio">
              <strong>{t.carrinhoVazio}</strong>
              <p>{t.carrinhoVazioAjuda}</p>
            </div>
          ) : (
            <>
              {linhas.map((l) => (
                <div className="cr-linha" key={l.produto_id}>
                  <div className="cr-linha-foto">
                    {l.imagem ? <img src={l.imagem} alt="" /> : <IconeSemFoto tamanho={22} />}
                  </div>

                  <div className="cr-linha-corpo">
                    <p className="cr-linha-nome">{l.nome}</p>
                    {l.apresentacao && <p className="cr-linha-apresentacao">{l.apresentacao}</p>}
                    <p className="cr-linha-preco">
                      {l.quantidade} × {moeda(l.preco)} = <b>{moeda(l.preco * l.quantidade)}</b>
                    </p>

                    <div className="cr-qtd">
                      <button type="button" onClick={() => onMenos(l.produto_id)} aria-label="-">−</button>
                      <span>{l.quantidade}</span>
                      <button
                        type="button"
                        onClick={() => onMais(l.produto_id)}
                        disabled={l.quantidade >= l.estoque}
                        aria-label="+"
                      >+</button>
                    </div>

                    <button type="button" className="cr-remover" onClick={() => onRemover(l.produto_id)}>
                      {t.remover}
                    </button>
                  </div>
                </div>
              ))}

              {/* O campo de cupom só existe se a loja tiver um cupom configurado
                  E houver produto com preço de membro. Campo que não faz nada
                  não vai à tela. */}
              {mostrarCupom && (
                <>
                  <div className="cr-cupom">
                    <input
                      type="text"
                      value={cupomTexto}
                      onChange={(e) => setCupomTexto(e.target.value)}
                      placeholder={t.cupom}
                      aria-label={t.cupom}
                      autoComplete="off"
                      disabled={cupomAplicado}
                    />
                    <button type="button" onClick={onAplicarCupom} disabled={cupomAplicado}>
                      {t.cupomAplicar}
                    </button>
                  </div>
                  {recadoCupom && (
                    <p className={`cr-cupom-recado cr-cupom-recado--${recadoCupom.tipo}`}>
                      {recadoCupom.texto}
                    </p>
                  )}
                </>
              )}

              <div className="cr-conta">
                <div className="cr-conta-linha">
                  <span>{t.itens} ({conta.pecas})</span>
                  <b>{moeda(conta.subtotal)}</b>
                </div>
                <div className="cr-conta-linha">
                  <span>{t.frete}</span>
                  <b>{moeda(conta.frete)}</b>
                </div>
                <div className="cr-conta-linha cr-conta-total">
                  <span>{t.total}</span>
                  <b>{moeda(conta.total)}</b>
                </div>
              </div>
            </>
          )}
        </div>

        {!vazio && (
          <div className="cr-rodape">
            <button type="button" className="cr-principal" onClick={onContinuar}>
              {t.continuar} · {moeda(conta.total)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
