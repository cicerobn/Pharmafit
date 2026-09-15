/* CONFIGURAÇÕES.
 *
 * Cada coisa guardada aqui tem uma tela onde aparece, e a tela está dita ao
 * lado do campo. Se um dia alguém quiser guardar algo aqui que não aparece em
 * lugar nenhum, esse algo não precisa ser guardado.
 *
 * Nenhum segredo mora aqui. Chave de gateway de pagamento fica em segredo de
 * função de servidor, no painel do Supabase, e nunca passa por este
 * formulário — porque o que este formulário grava vai para uma tabela que a
 * loja lê, e a loja é pública. A chave PIX da loja é diferente: ela é feita
 * para ser mostrada a quem vai pagar. */

import { useEffect, useRef, useState } from 'react';
import { moeda } from '../dinheiro.js';
import { IconeSemFoto } from '../Icones.jsx';
import { formatarTelefone, telefoneValido } from '../documento.js';
import { ajustes, salvarAjuste, equipe, darAcesso, tirarAcesso, subirFoto, catalogoCompleto, salvarProduto } from './dadosPainel.js';
import { Campo, paraNumero, paraCampo, quando } from './pecas.jsx';

export default function Ajustes() {
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [cfg, setCfg] = useState({});
  const [time, setTime] = useState([]);

  /* `apagandoATela` só na primeira vez. Depois de salvar, recarregar sem
     apagar a tela: senão o painel pisca em "Carregando" e o aviso de "salvo"
     morre junto com o pedaço de tela que o mostrava. */
  async function buscar(apagandoATela = false) {
    if (apagandoATela) setCarregando(true);
    setErroCarga(null);
    try {
      const [a, e] = await Promise.all([ajustes(), equipe()]);
      setCfg(a);
      setTime(e);
    } catch (err) {
      setErroCarga(String((err && err.message) || err));
    }
    if (apagandoATela) setCarregando(false);
  }

  useEffect(() => { buscar(true); }, []);

  if (carregando) return <p className="pn-carregando">Carregando as configurações…</p>;
  if (erroCarga) return <div className="pn-erro"><strong>Não conseguimos ler as configurações.</strong><br />{erroCarga}</div>;

  return (
    <>
      <h1 className="pn-titulo">Configurações</h1>
      <p className="pn-ajuda">
        Ao lado de cada campo está escrito <b>onde ele aparece</b>. Salvar aqui muda
        a loja na hora.
      </p>

      <Empresa cfg={cfg} aoSalvar={() => buscar()} />
      <Frete cfg={cfg} aoSalvar={() => buscar()} />
      <Pagamento cfg={cfg} aoSalvar={() => buscar()} />
      <Banner cfg={cfg} aoSalvar={() => buscar()} />
      <Membro cfg={cfg} aoSalvar={() => buscar()} />
      <Acesso time={time} aoMudar={() => buscar()} />
    </>
  );
}

/** Molde de uma seção que salva uma chave de configuração. */
function Secao({ titulo, onde, children, aoSalvar, montar, chave, ocupadoFora }) {
  const [ocupado, setOcupado] = useState(false);
  const [recado, setRecado] = useState(null);
  const [erro, setErro] = useState(null);

  async function salvar() {
    const pronto = montar();
    if (pronto.erro) { setErro(pronto.erro); setRecado(null); return; }

    setErro(null);
    setOcupado(true);
    const r = await salvarAjuste(chave, pronto.valor);
    setOcupado(false);

    if (!r.ok) return setErro(r.erro);
    setRecado('Salvo. ' + onde);
    aoSalvar();
  }

  return (
    <>
      <p className="pn-secao">{titulo}</p>
      <div className="pn-bloco">
        {children}
        {erro && <p className="pn-erro">{erro}</p>}
        {recado && <p className="pn-certo">{recado}</p>}
        <button type="button" className="pn-botao" onClick={salvar} disabled={ocupado || ocupadoFora}>
          {ocupado ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </>
  );
}

/* ---------- dados da empresa ---------- */

function Empresa({ cfg, aoSalvar }) {
  const atual = cfg.empresa || {};
  const [nome, setNome] = useState(atual.nome || '');
  const [zap, setZap] = useState(formatarTelefone(atual.whatsapp || ''));
  const [cidade, setCidade] = useState(atual.cidade || '');
  const [instagram, setInstagram] = useState(atual.instagram || '');

  return (
    <Secao
      titulo="A loja"
      chave="empresa"
      onde="O nome já está no topo da loja."
      aoSalvar={aoSalvar}
      montar={() => {
        if (!nome.trim()) return { erro: 'Escreva o nome da loja. Enquanto ele estiver vazio, o topo da loja fica sem nome.' };
        if (zap.trim() && !telefoneValido(zap)) return { erro: 'Confira o WhatsApp com DDD.' };
        return {
          valor: {
            nome: nome.trim(),
            whatsapp: zap.trim() || null,
            cidade: cidade.trim() || null,
            instagram: instagram.trim().replace(/^@/, '') || null
          }
        };
      }}
    >
      <Campo id="emp_nome" rotulo="Nome da loja" valor={nome} aoMudar={setNome}
        dica="Aparece no topo da loja e no cabeçalho da nota que vai na caixa." />
      <Campo id="emp_zap" rotulo="WhatsApp da loja" valor={zap} aoMudar={setZap}
        tipo="tel" modo="numeric" mascara={formatarTelefone}
        dica="Aparece na tela de pedido registrado, para o cliente falar com você." />
      <div className="pn-dupla">
        <Campo id="emp_cidade" rotulo="Cidade" valor={cidade} aoMudar={setCidade}
          dica="Vai no pé da nota." />
        <Campo id="emp_insta" rotulo="Instagram" valor={instagram} aoMudar={setInstagram}
          dica="Vai no pé da nota." />
      </div>
    </Secao>
  );
}

/* ---------- frete ---------- */

function Frete({ cfg, aoSalvar }) {
  const atual = (cfg.frete && cfg.frete.valor) || 0;
  const [valor, setValor] = useState(paraCampo(atual));

  const n = paraNumero(valor);

  return (
    <Secao
      titulo="Frete"
      chave="frete"
      onde="A loja já está somando esse valor uma vez por pedido."
      aoSalvar={aoSalvar}
      montar={() => {
        const x = paraNumero(valor);
        if (x === null || Number.isNaN(x) || x < 0) return { erro: 'O frete é um número, pode ser 0.' };
        return { valor: { valor: x } };
      }}
    >
      <Campo id="frete_valor" rotulo="Valor do frete" valor={valor} aoMudar={setValor}
        modo="decimal" placeholder="0,00"
        dica="Entra UMA vez por pedido, no rodapé do carrinho, não por item." />

      {Number.isFinite(n) && n > 0 ? (
        <p className="pn-campo-dica">Um pedido de {moeda(200)} vai fechar em {moeda(200 + n)}.</p>
      ) : (
        <p className="pn-aviso" style={{ marginTop: 0 }}>
          <strong>O frete está em zero.</strong> O banco obriga o pedido a usar
          exatamente este valor, então hoje a loja vende com frete grátis. Se não é
          isso que você quer, ponha o valor antes de divulgar a loja.
        </p>
      )}
    </Secao>
  );
}

/* ---------- pagamento ---------- */

function Pagamento({ cfg, aoSalvar }) {
  const atual = cfg.pagamento || {};
  const [chave, setChave] = useState(atual.chave_pix || '');
  const [titular, setTitular] = useState(atual.titular || '');
  const [banco, setBanco] = useState(atual.banco || '');

  return (
    <>
      <Secao
        titulo="Pagamento"
        chave="pagamento"
        onde="A chave já aparece na tela de pedido registrado, para o cliente pagar."
        aoSalvar={aoSalvar}
        montar={() => {
          if (chave.trim() && !titular.trim()) {
            return { erro: 'Escreva o nome do titular. O cliente confere o nome antes de pagar; sem ele muita gente desiste.' };
          }
          return {
            valor: {
              chave_pix: chave.trim() || null,
              titular: titular.trim() || null,
              banco: banco.trim() || null
            }
          };
        }}
      >
        <Campo id="pag_chave" rotulo="Chave PIX da loja" valor={chave} aoMudar={setChave}
          dica="Aparece para o cliente copiar depois de fechar o pedido. Deixe vazio e essa parte da tela não aparece." />
        <Campo id="pag_titular" rotulo="Nome do titular" valor={titular} aoMudar={setTitular}
          dica="Aparece junto da chave, para o cliente conferir antes de pagar." />
        <Campo id="pag_banco" rotulo="Banco" valor={banco} aoMudar={setBanco}
          dica="Opcional. Aparece junto da chave." />
      </Secao>

      <p className="pn-campo-dica" style={{ margin: '-4px 0 0' }}>
        O PIX automático — aquele que gera o código com o valor dentro, conta o
        tempo de validade e vira “pago” sozinho — ainda não existe aqui. Ele
        depende da documentação do seu novo gateway, e nenhuma linha dele foi
        escrita para não sair adivinhando nome de campo. Enquanto isso, o
        caminho acima funciona: o cliente paga na chave e manda o comprovante.
      </p>
    </>
  );
}

/* ---------- banner ---------- */

function Banner({ cfg, aoSalvar }) {
  const atual = cfg.banner || {};
  const [imagem, setImagem] = useState(atual.imagem || '');
  const [titulo, setTitulo] = useState(atual.titulo || '');
  const [texto, setTexto] = useState(atual.texto || '');
  const [subindo, setSubindo] = useState(false);
  const [erroFoto, setErroFoto] = useState(null);
  const arquivo = useRef(null);

  async function escolher(e) {
    const arq = e.target.files && e.target.files[0];
    if (!arq) return;
    setSubindo(true);
    setErroFoto(null);
    const r = await subirFoto(arq, 'banner');
    setSubindo(false);
    if (!r.ok) return setErroFoto('A imagem não subiu: ' + r.erro);
    setImagem(r.url);
  }

  return (
    <Secao
      titulo="Banner do topo"
      chave="banner"
      onde="Já está no topo da loja."
      aoSalvar={aoSalvar}
      ocupadoFora={subindo}
      montar={() => ({
        valor: {
          imagem: imagem.trim() || null,
          titulo: titulo.trim() || null,
          texto: texto.trim() || null
        }
      })}
    >
      <div className="pn-foto-area">
        <div className="pn-foto-previa" style={{ width: 120, height: 66 }}>
          {imagem ? <img src={imagem} alt="" /> : <IconeSemFoto tamanho={22} />}
        </div>
        <div>
          <button type="button" className="pn-botao pn-botao--claro"
            onClick={() => arquivo.current && arquivo.current.click()} disabled={subindo}>
            {subindo ? 'Subindo…' : imagem ? 'Trocar a imagem' : 'Escolher a imagem'}
          </button>
          {imagem && (
            <button type="button" className="pn-botao pn-botao--perigo" style={{ marginLeft: 6 }}
              onClick={() => setImagem('')}>
              Tirar
            </button>
          )}
          <input ref={arquivo} type="file" accept="image/*" hidden onChange={escolher} />
        </div>
      </div>

      {erroFoto && <p className="pn-erro">{erroFoto}</p>}

      <Campo id="ban_titulo" rotulo="Título" valor={titulo} aoMudar={setTitulo}
        dica="Opcional. Sem imagem e sem título, o banner não aparece." />
      <Campo id="ban_texto" rotulo="Linha de baixo" valor={texto} aoMudar={setTexto} />
    </Secao>
  );
}

/* ---------- preço de membro ---------- */

function Membro({ cfg, aoSalvar }) {
  const atual = cfg.membro || {};
  const [cupom, setCupom] = useState(atual.cupom || '');
  const [pct, setPct] = useState(paraCampo(atual.percentual));
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  /* Aplicar a porcentagem em todos os produtos muda o preço de venda de toda a
     loja de uma vez. É você quem aperta, e só depois de confirmar. */
  async function aplicarEmTodos() {
    const p = paraNumero(pct);
    if (p === null || Number.isNaN(p) || p <= 0 || p >= 100) {
      setResultado({ erro: 'A porcentagem tem que ser entre 1 e 99.' });
      return;
    }

    setAplicando(true);
    setResultado(null);

    try {
      const { produtos } = await catalogoCompleto();
      const alvos = produtos.filter((x) => Number(x.preco) > 0);
      let feitos = 0;
      let falhas = 0;

      for (const x of alvos) {
        const novo = Math.round(Number(x.preco) * (1 - p / 100) * 100) / 100;
        const r = await salvarProduto({ ...x, preco_vip: novo }, undefined);
        if (r.ok) feitos++; else falhas++;
      }

      setResultado({ feitos, falhas, total: alvos.length, pct: p });
      aoSalvar();
    } catch (e) {
      setResultado({ erro: String((e && e.message) || e) });
    }

    setAplicando(false);
    setConfirmando(false);
  }

  return (
    <>
      <Secao
        titulo="Preço de membro"
        chave="membro"
        onde="Com cupom salvo E algum produto com preço de membro, o campo de cupom aparece no carrinho."
        aoSalvar={aoSalvar}
        ocupadoFora={aplicando}
        montar={() => {
          const p = paraNumero(pct);
          if (pct.trim() && (Number.isNaN(p) || p <= 0 || p >= 100)) {
            return { erro: 'A porcentagem tem que ser entre 1 e 99.' };
          }
          return {
            valor: {
              cupom: cupom.trim().toUpperCase() || null,
              percentual: pct.trim() ? p : null
            }
          };
        }}
      >
        <Campo id="mem_cupom" rotulo="Cupom de membro" valor={cupom} aoMudar={setCupom}
          dica="O cliente digita isso no carrinho para o preço de membro valer. Sem cupom salvo, o campo não aparece na loja." />
        <Campo id="mem_pct" rotulo="Desconto de membro (%)" valor={pct} aoMudar={setPct}
          modo="decimal" placeholder="ex.: 10"
          dica="Guardar aqui não muda preço nenhum. Serve para o botão abaixo." />
      </Secao>

      <div className="pn-bloco">
        <h3>Aplicar em todos os produtos</h3>
        <p className="pn-campo-dica" style={{ marginTop: 0 }}>
          Escreve o preço de membro de <b>todos</b> os produtos com preço, como a
          porcentagem acima abaixo do preço normal. Mexe na loja de verdade, por
          isso pede confirmação. Depois você pode ajustar produto por produto.
        </p>

        {resultado && resultado.erro && <p className="pn-erro">{resultado.erro}</p>}

        {resultado && !resultado.erro && (
          <p className="pn-certo">
            {resultado.feitos} de {resultado.total} produtos ficaram com preço de
            membro {resultado.pct}% abaixo do normal.
            {resultado.falhas > 0 && ` ${resultado.falhas} não deu.`}
          </p>
        )}

        {!confirmando ? (
          <button type="button" className="pn-botao pn-botao--claro" onClick={() => setConfirmando(true)}
            disabled={!pct.trim() || aplicando}>
            Aplicar {pct.trim() ? pct + '%' : ''} em todos
          </button>
        ) : (
          <div className="pn-botoes">
            <button type="button" className="pn-botao pn-botao--claro" onClick={() => setConfirmando(false)}>
              Não, deixa
            </button>
            <button type="button" className="pn-botao" onClick={aplicarEmTodos} disabled={aplicando}>
              {aplicando ? 'Aplicando…' : 'Confirmo, aplicar em todos'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- quem entra no painel ---------- */

function Acesso({ time, aoMudar }) {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState(null);
  const [recado, setRecado] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function dar() {
    setErro(null);
    setRecado(null);
    if (!email.trim()) return setErro('Escreva o e-mail da pessoa.');

    setOcupado(true);
    const r = await darAcesso(email);
    setOcupado(false);

    if (!r.ok) {
      if (r.erro === 'sem_conta') {
        return setErro('Ninguém com esse e-mail tem conta aqui ainda. A pessoa precisa criar a conta primeiro — não dá para criar acesso do nada.');
      }
      if (r.erro === 'sem_permissao') return setErro('Você não tem permissão para isso.');
      return setErro(r.erro);
    }

    setEmail('');
    setRecado('Acesso liberado.');
    aoMudar();
  }

  async function tirar(user_id, quem) {
    setErro(null);
    setRecado(null);
    setOcupado(true);
    const r = await tirarAcesso(user_id);
    setOcupado(false);

    if (!r.ok) {
      if (r.erro === 'ultimo') {
        return setErro('Esse é o último acesso ao painel. Tirar ele trancaria todo mundo do lado de fora.');
      }
      return setErro(r.erro);
    }
    setRecado('Acesso de ' + quem + ' removido.');
    aoMudar();
  }

  return (
    <>
      <p className="pn-secao">Quem entra no painel</p>
      <div className="pn-bloco">
        {erro && <p className="pn-erro">{erro}</p>}
        {recado && <p className="pn-certo">{recado}</p>}

        <div className="pn-lista" style={{ marginBottom: 14 }}>
          {time.map((a) => (
            <div className="pn-item" key={a.user_id}>
              <div className="pn-item-corpo">
                <p className="pn-item-nome">{a.nome || a.email}</p>
                <p className="pn-item-linha">{a.email}</p>
                <p className="pn-item-linha">desde {quando(a.criado_em)}</p>
              </div>
              <div className="pn-item-lado">
                <button type="button" className="pn-botao pn-botao--perigo"
                  onClick={() => tirar(a.user_id, a.email)} disabled={ocupado || time.length <= 1}>
                  Tirar
                </button>
              </div>
            </div>
          ))}
        </div>

        <Campo id="acesso_email" rotulo="Liberar acesso para" valor={email} aoMudar={setEmail}
          tipo="email" modo="email"
          dica="A pessoa precisa já ter conta. Quem entra no painel vê preço de compra, lucro e os dados de todos os clientes." />

        <button type="button" className="pn-botao" onClick={dar} disabled={ocupado || !email.trim()}>
          Liberar acesso
        </button>
      </div>
    </>
  );
}
