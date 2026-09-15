/* A folha que vai dentro da caixa.
 *
 * Não é nota fiscal, e isso está escrito em cima, dentro de uma moldura, para
 * ninguém confundir. O que ela precisa fazer bem é uma coisa só: o nome e o
 * endereço grandes o suficiente para o entregador ler de longe.
 *
 * A folha é desenhada fora da casca do painel (por isso o portal): na hora de
 * imprimir, o estilo esconde o painel inteiro e deixa só ela na página. */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { moeda } from '../dinheiro.js';
import { ajustes } from './dadosPainel.js';

function referencia(id) {
  return String(id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
}

export default function NotaImpressa({ pedido: p, aoTerminar }) {
  const [empresa, setEmpresa] = useState(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    ajustes()
      .then((a) => { if (vivo) { setEmpresa(a.empresa || {}); setPronto(true); } })
      .catch(() => { if (vivo) { setEmpresa({}); setPronto(true); } });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!pronto) return;
    /* Um quadro de espera para o navegador terminar de desenhar antes de abrir
       a janela de impressão — sem isso, a primeira impressão sai em branco. */
    const t = setTimeout(() => {
      window.print();
      aoTerminar();
    }, 120);
    return () => clearTimeout(t);
  }, [pronto]);

  if (!pronto) return null;

  const endereco = [
    [p.rua, p.numero_casa].filter(Boolean).join(', '),
    p.complemento,
    [p.cidade, p.cep].filter(Boolean).join(' · ')
  ].filter(Boolean).join('\n');

  const somaItens = p.itens.reduce((s, i) => s + i.recebido, 0);

  return createPortal(
    <div className="pn-nota">
      <div className="pn-nota-aviso">
        Este papel não é nota fiscal — é só a conferência do que vai na caixa
      </div>

      <div className="pn-nota-para">
        <h2>Entregar a</h2>
        <p className="pn-nota-nome">{p.nome}</p>
        <p className="pn-nota-endereco">{endereco}</p>
        {p.telefone && <p className="pn-nota-zap">WhatsApp {p.telefone}</p>}
      </div>

      <table>
        <thead>
          <tr>
            <th>Qtd</th>
            <th>Produto</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {p.itens.map((i) => (
            <tr key={i.id}>
              <td>{i.quantidade}</td>
              <td>{i.nome}{i.apresentacao ? ` — ${i.apresentacao}` : ''}</td>
              <td>{moeda(i.recebido)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Itens</td>
            <td>{moeda(somaItens)}</td>
          </tr>
          <tr>
            <td colSpan={2}>Frete</td>
            <td>{moeda(p.frete)}</td>
          </tr>
          <tr>
            <td colSpan={2}>Total</td>
            <td>{moeda(p.totalCobrado)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="pn-nota-pe">
        Pedido #{p.numero} · referência {referencia(p.id)} ·{' '}
        {new Date(p.criado_em).toLocaleDateString('pt-BR')}
        {empresa && empresa.nome ? ` · ${empresa.nome}` : ''}
        {empresa && empresa.cidade ? ` · ${empresa.cidade}` : ''}
        {empresa && empresa.instagram ? ` · @${empresa.instagram}` : ''}
      </p>
    </div>,
    document.body
  );
}
