/* Checkout.
 *
 * Duas coisas aqui não são detalhe:
 *
 * 1. As máscaras se montam digitando e desmontam apagando. Um cliente já
 *    desistiu de comprar porque o campo de data exigia as barras e não as
 *    montava — ele teve que copiar e colar a data de outro lugar.
 *
 * 2. Uma mensagem de erro por vez, na ordem da tela, e a tela rola até o
 *    campo errado. Lista de erros de uma vez é mais fácil de programar e
 *    mais difícil de resolver para quem está com o celular na mão. */

import { useRef, useState } from 'react';
import { moeda } from './dinheiro.js';
import { IconeFechar, IconeCerto } from './Icones.jsx';
import {
  formatarCpf, cpfValido, formatarCep, cepValido,
  formatarNascimento, nascimentoParaBanco, nascimentoParaTela,
  formatarTelefone, telefoneValido, emailValido
} from './documento.js';

/* Um campo do formulário. Vive fora do Checkout de propósito: declarado lá
 * dentro, seria um componente novo a cada tecla, o React remontaria o input e
 * o foco se perderia no meio da palavra. */
function Campo({ id, rotulo, valor, aoMudar, tipo = 'text', modo, auto, dica, mascara, campos, erro }) {
  const comErro = erro && erro.campo === id;
  return (
    <div className={`ck-campo${comErro ? ' ck-campo--erro' : ''}`}>
      <label className="ck-rotulo" htmlFor={`ck-${id}`}>{rotulo}</label>
      <input
        id={`ck-${id}`}
        ref={campos[id]}
        type={tipo}
        inputMode={modo}
        autoComplete={auto}
        value={valor}
        onChange={(e) => aoMudar(mascara ? mascara(e.target.value) : e.target.value)}
        aria-invalid={comErro ? 'true' : undefined}
        aria-describedby={comErro ? `ck-${id}-erro` : undefined}
      />
      {comErro && <p className="ck-erro" id={`ck-${id}-erro`}>{erro.mensagem}</p>}
      {!comErro && dica && <p className="ck-dica">{dica}</p>}
    </div>
  );
}

export default function Checkout({ t, linhas, conta, jaComprou, onVoltar, onFechar, onEnviar }) {
  const antigo = jaComprou || {};

  const [nome, setNome] = useState(antigo.nome || '');
  const [telefone, setTelefone] = useState(formatarTelefone(antigo.telefone || ''));
  const [cpf, setCpf] = useState(formatarCpf(antigo.cpf || ''));
  const [nascimento, setNascimento] = useState(nascimentoParaTela(antigo.nascimento) || '');
  const [email, setEmail] = useState(antigo.email || '');
  const [cep, setCep] = useState(formatarCep(antigo.cep || ''));
  const [cidade, setCidade] = useState(antigo.cidade || '');
  const [rua, setRua] = useState(antigo.rua || '');
  const [numeroCasa, setNumeroCasa] = useState(antigo.numero_casa || '');
  const [complemento, setComplemento] = useState(antigo.complemento || '');

  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [recado, setRecado] = useState(null);

  const campos = {
    nome: useRef(null), telefone: useRef(null), cpf: useRef(null),
    nascimento: useRef(null), email: useRef(null), cep: useRef(null),
    cidade: useRef(null), rua: useRef(null), numero_casa: useRef(null)
  };

  /** Mostra um erro só, e leva a tela até ele. */
  function acusar(campo, mensagem) {
    setErro({ campo, mensagem });
    const alvo = campos[campo] && campos[campo].current;
    if (alvo) {
      alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => alvo.focus({ preventScroll: true }), 320);
    }
    return false;
  }

  /** Na ordem da tela: o primeiro problema é o que a pessoa vê. */
  function conferir() {
    if (nome.trim().split(/\s+/).length < 2) return acusar('nome', t.erroNome);
    if (!telefoneValido(telefone)) return acusar('telefone', t.erroWhatsapp);
    if (!cpfValido(cpf)) return acusar('cpf', t.erroCpf);
    if (!nascimentoParaBanco(nascimento)) return acusar('nascimento', t.erroNascimento);
    if (!emailValido(email)) return acusar('email', t.erroEmail);
    if (!cepValido(cep)) return acusar('cep', t.erroCep);
    if (cidade.trim().length < 2) return acusar('cidade', t.erroCidade);
    if (rua.trim().length < 3) return acusar('rua', t.erroRua);
    if (!numeroCasa.trim()) return acusar('numero_casa', t.erroNumero);
    setErro(null);
    return true;
  }

  async function enviar(evento) {
    evento.preventDefault();
    setRecado(null);
    if (!conferir()) return;

    setEnviando(true);
    const r = await onEnviar({
      nome: nome.trim(),
      telefone: telefone.trim(),
      cpf: cpf.trim(),
      nascimento: nascimentoParaBanco(nascimento),
      email: email.trim(),
      cep: cep.trim(),
      cidade: cidade.trim(),
      rua: rua.trim(),
      numero_casa: numeroCasa.trim(),
      complemento: complemento.trim() || null
    });
    setEnviando(false);

    if (!r || !r.ok) setRecado(t.erroEnvio);
  }

  return (
    <div className="cr-fundo" role="dialog" aria-modal="true" aria-label={t.finalizar}>
      <div className="cr-painel">
        <div className="cr-cabeca">
          <h2 className="cr-titulo">{t.finalizar}</h2>
          <button type="button" className="cr-fechar" onClick={onFechar} aria-label={t.fechar}>
            <IconeFechar />
          </button>
        </div>

        <form className="cr-rolagem" onSubmit={enviar} noValidate>
          <p className="ck-secao">{t.conferir}</p>
          <div className="ck-resumo">
            {linhas.map((l) => (
              <div className="ck-resumo-item" key={l.produto_id}>
                <span>{l.quantidade} × {l.nome}{l.apresentacao ? ` · ${l.apresentacao}` : ''}</span>
                <span>{moeda(l.preco * l.quantidade)}</span>
              </div>
            ))}
            <div className="ck-resumo-item"><span>{t.frete}</span><span>{moeda(conta.frete)}</span></div>
            <div className="ck-resumo-item"><span><b>{t.total}</b></span><span><b>{moeda(conta.total)}</b></span></div>
          </div>

          {jaComprou && <p className="ck-aviso">{t.jaPreenchido}</p>}

          <p className="ck-secao">{t.seusDados}</p>

          <Campo campos={campos} erro={erro} id="nome" rotulo={t.nome} valor={nome} aoMudar={setNome} auto="name" />
          <Campo campos={campos} erro={erro} id="telefone" rotulo={t.whatsapp} valor={telefone} aoMudar={setTelefone}
            tipo="tel" modo="numeric" auto="tel" mascara={formatarTelefone} />
          <Campo campos={campos} erro={erro} id="cpf" rotulo={t.cpf} valor={cpf} aoMudar={setCpf}
            modo="numeric" mascara={formatarCpf} />
          <Campo campos={campos} erro={erro} id="nascimento" rotulo={t.nascimento} valor={nascimento} aoMudar={setNascimento}
            modo="numeric" auto="bday" mascara={formatarNascimento} dica="00/00/0000" />
          <Campo campos={campos} erro={erro} id="email" rotulo={t.email} valor={email} aoMudar={setEmail}
            tipo="email" modo="email" auto="email" />

          <p className="ck-secao">{t.entrega}</p>

          <div className="ck-dupla">
            <Campo campos={campos} erro={erro} id="cep" rotulo={t.cep} valor={cep} aoMudar={setCep}
              modo="numeric" auto="postal-code" mascara={formatarCep} />
            <Campo campos={campos} erro={erro} id="cidade" rotulo={t.cidade} valor={cidade} aoMudar={setCidade}
              auto="address-level2" />
          </div>

          <Campo campos={campos} erro={erro} id="rua" rotulo={t.rua} valor={rua} aoMudar={setRua} auto="address-line1" />

          <div className="ck-dupla">
            <Campo campos={campos} erro={erro} id="numero_casa" rotulo={t.numeroCasa} valor={numeroCasa} aoMudar={setNumeroCasa}
              modo="numeric" />
            <Campo campos={campos} erro={erro} id="complemento" rotulo={t.complemento} valor={complemento} aoMudar={setComplemento}
              auto="address-line2" />
          </div>
          <p className="ck-dica">{t.complementoDica}</p>

          {recado && <p className="ck-erro" style={{ marginTop: 14 }}>{recado}</p>}

          <button type="submit" className="cr-principal" style={{ marginTop: 18 }} disabled={enviando}>
            {enviando ? t.enviando : `${t.finalizar} · ${moeda(conta.total)}`}
          </button>

          <button type="button" className="cr-remover" style={{ margin: '12px auto 4px', display: 'block' }}
            onClick={onVoltar}>
            {t.voltar}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Tela de "pronto".
 *
 * Mostra como pagar quando a loja tiver chave PIX configurada, e o botão de
 * WhatsApp quando a loja tiver telefone. Sem essas duas coisas, nenhum dos dois
 * aparece: botão que não leva a lugar nenhum é pior que botão que falta.
 */
export function PedidoPronto({ t, referencia, total, pagamento, zap, onNovo, onFechar }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pagamento.chave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
      /* Sem permissão de copiar, a chave continua na tela para selecionar. */
    }
  }

  const linkZap = zap
    ? `https://wa.me/${zap}?text=${encodeURIComponent(
      `Olá! Acabei de fazer o pedido ${referencia}` +
      (total ? ` de ${moeda(total)}` : '') + '. Segue o comprovante.'
    )}`
    : null;

  return (
    <div className="cr-fundo" role="dialog" aria-modal="true" aria-label={t.pedidoFeito}>
      <div className="cr-painel">
        <div className="cr-cabeca">
          <h2 className="cr-titulo">{t.pedidoFeito}</h2>
          <button type="button" className="cr-fechar" onClick={onFechar} aria-label={t.fechar}>
            <IconeFechar />
          </button>
        </div>

        <div className="cr-rolagem">
          <div className="ck-pronto">
            <p className="ck-pronto-marca"><IconeCerto /></p>
            <h2>{t.pedidoFeito}</h2>
            <p>{t.pedidoFeitoTexto}</p>
            <div className="ck-referencia">
              <span>{t.referencia}</span>
              <b>{referencia}</b>
            </div>
          </div>

          {pagamento && (
            <div className="ck-pagar">
              <p className="ck-secao" style={{ marginTop: 0 }}>{t.comoPagar}</p>

              {total ? (
                <div className="ck-resumo-item">
                  <span>{t.pixValor}</span>
                  <span><b>{moeda(total)}</b></span>
                </div>
              ) : null}

              <div className="ck-resumo-item">
                <span>{t.pixChave}</span>
                <span className="ck-chave">{pagamento.chave}</span>
              </div>

              {pagamento.titular && (
                <div className="ck-resumo-item"><span>{t.pixTitular}</span><span>{pagamento.titular}</span></div>
              )}
              {pagamento.banco && (
                <div className="ck-resumo-item"><span>{t.pixBanco}</span><span>{pagamento.banco}</span></div>
              )}

              <button type="button" className="cr-principal" style={{ marginTop: 14 }} onClick={copiar}>
                {copiado ? t.pixCopiado : t.pixCopiar}
              </button>

              <p className="ck-dica" style={{ marginTop: 10 }}>{t.pixDepois}</p>
            </div>
          )}
        </div>

        <div className="cr-rodape">
          {linkZap && (
            <a className="cr-principal" href={linkZap} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none', textAlign: 'center', display: 'block', marginBottom: 8 }}>
              {t.falarNoZap}
            </a>
          )}
          <button type="button" className="cr-principal cr-secundario" onClick={onNovo}>{t.novoPedido}</button>
        </div>
      </div>
    </div>
  );
}
