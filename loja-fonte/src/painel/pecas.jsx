/* Peças que várias telas do painel usam.
 *
 * Todas vivem no nível do arquivo, nunca dentro de outro componente: declarado
 * lá dentro, o React remonta o campo a cada tecla e o foco se perde no meio da
 * palavra. Já aconteceu no checkout e custou uma tarde. */

import { IconeFechar } from '../Icones.jsx';
import { moeda } from '../dinheiro.js';
import { variacao } from './periodos.js';

/** Um campo de formulário do painel. */
export function Campo({
  id, rotulo, valor, aoMudar, tipo = 'text', modo, dica, erro,
  refs, mascara, opcoes, linhas, placeholder, autoFoco
}) {
  const comErro = erro && erro.campo === id;
  const guardar = (el) => { if (refs) refs[id] = el; };
  const mudou = (e) => aoMudar(mascara ? mascara(e.target.value) : e.target.value);

  return (
    <div className={`pn-campo${comErro ? ' pn-campo--erro' : ''}`}>
      <label className="pn-rotulo" htmlFor={`pn-${id}`}>{rotulo}</label>

      {opcoes ? (
        <select id={`pn-${id}`} ref={guardar} value={valor} onChange={mudou}>
          {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.nome}</option>)}
        </select>
      ) : linhas ? (
        <textarea id={`pn-${id}`} ref={guardar} value={valor} onChange={mudou} placeholder={placeholder} />
      ) : (
        <input
          id={`pn-${id}`}
          ref={guardar}
          type={tipo}
          inputMode={modo}
          value={valor}
          onChange={mudou}
          placeholder={placeholder}
          autoFocus={autoFoco}
          aria-invalid={comErro ? 'true' : undefined}
        />
      )}

      {comErro && <p className="pn-campo-erro">{erro.mensagem}</p>}
      {!comErro && dica && <p className="pn-campo-dica">{dica}</p>}
    </div>
  );
}

/** Gaveta: usada por todo formulário que abre por cima de uma lista. */
export function Gaveta({ titulo, children, rodape, aoFechar }) {
  return (
    <div className="pn-fundo" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="pn-painel">
        <div className="pn-painel-cabeca">
          <h2 className="pn-painel-titulo">{titulo}</h2>
          <button type="button" className="pn-fechar" onClick={aoFechar} aria-label="Fechar">
            <IconeFechar />
          </button>
        </div>
        <div className="pn-painel-rolagem">{children}</div>
        {rodape && <div className="pn-painel-rodape">{rodape}</div>}
      </div>
    </div>
  );
}

/** Cartão de número, com a comparação embaixo dizendo contra o que é. */
export function CartaoNumero({ rotulo, valor, antes, antesNome, pe, dinheiro = true }) {
  const v = antes === undefined ? null : variacao(valor, antes);
  const classe = !v ? '' : v.sinal > 0 ? 'pn-variacao--sobe' : v.sinal < 0 ? 'pn-variacao--desce' : 'pn-variacao--igual';

  return (
    <div className="pn-cartao">
      <p className="pn-cartao-rotulo">{rotulo}</p>
      <p className="pn-cartao-valor">{dinheiro ? moeda(valor) : valor}</p>
      {v && (
        <p className="pn-cartao-pe">
          <span className={`pn-variacao ${classe}`}>{v.texto}</span>
          contra {antesNome} ({dinheiro ? moeda(antes) : antes})
        </p>
      )}
      {pe && <p className="pn-cartao-pe">{pe}</p>}
    </div>
  );
}

export const NOMES_STATUS = {
  aguardando: 'Aguardando pagamento',
  pendente: 'Pagamento pendente',
  pago: 'Pago',
  separacao: 'Em separação',
  enviado: 'Enviado',
  cancelado: 'Cancelado'
};

export function Etiqueta({ status }) {
  return (
    <span className={`pn-etiqueta pn-etiqueta--${status}`}>
      {NOMES_STATUS[status] || status}
    </span>
  );
}

/** Data e hora do jeito que se lê em voz alta. */
export function quando(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Texto sem acento e minúsculo, para a busca não depender de acentuação. */
export function achatar(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Número digitado com vírgula ou ponto vira número de verdade. */
export function paraNumero(texto) {
  if (texto === '' || texto === null || texto === undefined) return null;
  const limpo = String(texto).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) ? n : NaN;
}

/** Número para dentro do campo: vírgula, como se escreve em português. */
export function paraCampo(n) {
  if (n === null || n === undefined || n === '') return '';
  const x = Number(n);
  if (!Number.isFinite(x)) return '';
  return String(x).replace('.', ',');
}

/** O link de conversa a partir do telefone guardado. */
export function linkZap(telefone, recado) {
  const so = String(telefone || '').replace(/\D/g, '');
  if (so.length < 10) return null;
  /* Sem o 55 na frente o WhatsApp não abre conversa nenhuma: o número fica
     válido na tela e o toque não faz nada. */
  const cheio = so.startsWith('55') ? so : '55' + so;
  const texto = recado ? '?text=' + encodeURIComponent(recado) : '';
  return `https://wa.me/${cheio}${texto}`;
}
