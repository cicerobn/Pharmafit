/* PRODUTOS.
 *
 * Aqui mora a regra da armadilha 5: todo campo deste formulário é lido na hora
 * de montar o produto na vitrine. Não existe campo que só grava. Quando você
 * salvar, a lista recarrega do banco — o que aparece na tela é o que o banco
 * devolveu, não o que você digitou. Se algo não pegou, você vê na hora.
 *
 * O preço de compra e a margem só existem nesta tela. A loja não consegue nem
 * ler a tabela onde eles moram: a RLS dela só libera para administrador. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { moeda } from '../dinheiro.js';
import { IconeSemFoto, IconeBusca, IconeCategoria } from '../Icones.jsx';
import {
  catalogoCompleto, salvarProduto, arquivarProduto, apagarProduto,
  salvarCategoria, apagarCategoria, subirFoto
} from './dadosPainel.js';
import { Campo, Gaveta, Etiqueta, achatar, paraNumero, paraCampo } from './pecas.jsx';

const ICONES = ['caixa', 'ampola', 'seringa', 'gota', 'frasco', 'capsula', 'halter'];

const VAZIO = {
  produto_id: '', nome: '', apresentacao: '', descricao: '', categoria: '',
  marca: '', sku: '', imagem: '', preco: '', preco_vip: '', preco_promocional: '',
  custo: '', estoque: '0', situacao: 'ativo', ordem: '0'
};

/** Nome vira identificador: "*Tirzec 15mg" → "tirzec-15mg". */
function apelido(nome) {
  return achatar(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export default function Produtos() {
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [dados, setDados] = useState({ produtos: [], categorias: [] });

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('ativos');

  const [editando, setEditando] = useState(null);
  const [verCategorias, setVerCategorias] = useState(false);
  const [recado, setRecado] = useState(null);

  /* Apagar a tela só na primeira carga. Recarregar depois de salvar sem
     apagar nada: piscar em "Carregando" esconde justamente o aviso de que
     salvou, que é a coisa que você quer ler naquele momento. */
  async function buscar(apagandoATela = false) {
    if (apagandoATela) setCarregando(true);
    setErroCarga(null);
    try {
      setDados(await catalogoCompleto());
    } catch (e) {
      setErroCarga(String((e && e.message) || e));
    }
    if (apagandoATela) setCarregando(false);
  }

  useEffect(() => { buscar(true); }, []);

  const semPreco = dados.produtos.filter((p) => !(Number(p.preco) > 0));
  const semFoto = dados.produtos.filter((p) => !p.imagem);

  const visiveis = useMemo(() => {
    const termo = achatar(busca).trim();
    return dados.produtos.filter((p) => {
      if (filtro === 'ativos' && p.situacao !== 'ativo') return false;
      if (filtro === 'arquivados' && p.situacao !== 'arquivado') return false;
      if (filtro === 'sem_preco' && Number(p.preco) > 0) return false;
      if (filtro === 'sem_foto' && p.imagem) return false;
      if (!termo) return true;
      return achatar([p.nome, p.apresentacao, p.marca, p.sku].join(' ')).includes(termo);
    });
  }, [dados.produtos, busca, filtro]);

  function abrirNovo() {
    setEditando({ ...VAZIO, novo: true });
  }

  function abrirProduto(p) {
    setEditando({
      novo: false,
      produto_id: p.produto_id,
      nome: p.nome || '',
      apresentacao: p.apresentacao || '',
      descricao: p.descricao || '',
      categoria: p.categoria || '',
      marca: p.marca || '',
      sku: p.sku || '',
      imagem: p.imagem || '',
      preco: paraCampo(p.preco),
      preco_vip: paraCampo(p.preco_vip),
      preco_promocional: paraCampo(p.preco_promocional),
      custo: paraCampo(p.custo),
      estoque: String(p.estoque || 0),
      situacao: p.situacao,
      ordem: String(p.ordem || 0),
      piso: p.piso
    });
  }

  async function depoisDeSalvar(mensagem) {
    setEditando(null);
    setRecado(mensagem);
    await buscar();
  }

  if (carregando) return <p className="pn-carregando">Carregando os produtos…</p>;

  if (erroCarga) {
    return <div className="pn-erro"><strong>Não conseguimos ler o catálogo.</strong><br />{erroCarga}</div>;
  }

  return (
    <>
      <h1 className="pn-titulo">Produtos</h1>
      <p className="pn-ajuda">
        {dados.produtos.length} produtos cadastrados. O preço de compra e a margem
        só aparecem aqui — a loja nem consegue ler essa informação.
      </p>

      {recado && <p className="pn-certo">{recado}</p>}

      {semPreco.length > 0 && (
        <div className="pn-aviso">
          <strong>{semPreco.length} produto{semPreco.length > 1 ? 's' : ''} sem preço.</strong>{' '}
          O banco não deixa publicar produto sem preço, então {semPreco.length > 1 ? 'eles estão' : 'ele está'} arquivado
          {semPreco.length > 1 ? 's' : ''} e fora da loja. Toque em <b>Sem preço</b> abaixo para resolver.
        </div>
      )}

      <div className="pn-botoes" style={{ marginBottom: 14 }}>
        <button type="button" className="pn-botao" onClick={abrirNovo}>Cadastrar produto</button>
        <button type="button" className="pn-botao pn-botao--claro" onClick={() => setVerCategorias(true)}>
          Categorias ({dados.categorias.length})
        </button>
      </div>

      <div className="pn-busca">
        <IconeBusca />
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, marca ou código" aria-label="Buscar produto" />
      </div>

      <div className="pn-filtros">
        {[
          { id: 'ativos', nome: 'Na loja' },
          { id: 'arquivados', nome: 'Arquivados' },
          { id: 'sem_preco', nome: `Sem preço (${semPreco.length})` },
          { id: 'sem_foto', nome: `Sem foto (${semFoto.length})` },
          { id: 'todos', nome: 'Todos' }
        ].map((f) => (
          <button key={f.id} type="button" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
            {f.nome}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <div className="pn-vazio">
          <strong>Nenhum produto aqui.</strong>
          <p>Troque o filtro ou apague o que está escrito na busca.</p>
        </div>
      ) : (
        <div className="pn-lista">
          {visiveis.map((p) => <LinhaProduto key={p.produto_id} p={p} aoAbrir={abrirProduto} />)}
        </div>
      )}

      {editando && (
        <FormularioProduto
          inicial={editando}
          categorias={dados.categorias}
          aoFechar={() => setEditando(null)}
          aoSalvar={depoisDeSalvar}
        />
      )}

      {verCategorias && (
        <FormularioCategorias
          categorias={dados.categorias}
          produtos={dados.produtos}
          aoFechar={() => setVerCategorias(false)}
          aoMudar={() => buscar()}
        />
      )}
    </>
  );
}

/* ---------- uma linha da lista ---------- */

function LinhaProduto({ p, aoAbrir }) {
  const preco = Number(p.preco);
  const custo = p.custo === null ? null : Number(p.custo);
  const margem = custo !== null && custo > 0 && preco > 0
    ? Math.round(((preco - custo) / custo) * 100)
    : null;

  return (
    <button type="button" className="pn-item pn-item--clicavel" onClick={() => aoAbrir(p)}>
      <div className="pn-item-foto">
        {p.imagem ? <img src={p.imagem} alt="" /> : <IconeSemFoto tamanho={20} />}
      </div>

      <div className="pn-item-corpo">
        <p className="pn-item-nome">{p.nome}</p>
        {p.apresentacao && <p className="pn-item-linha"><b>{p.apresentacao}</b></p>}
        <p className="pn-item-linha">
          Estoque {p.estoque}
          {custo !== null && custo > 0 && <> · compra {moeda(custo)}</>}
          {margem !== null && <> · margem {margem}%</>}
        </p>
        {p.situacao !== 'ativo' && <p className="pn-item-linha"><Etiqueta status="arquivado" /></p>}
      </div>

      <div className="pn-item-lado">
        <p className="pn-item-valor">{preco > 0 ? moeda(preco) : '—'}</p>
        {Number(p.preco_promocional) > 0 && (
          <p className="pn-item-linha">promo {moeda(p.preco_promocional)}</p>
        )}
        {Number(p.preco_vip) > 0 && (
          <p className="pn-item-linha">membro {moeda(p.preco_vip)}</p>
        )}
      </div>
    </button>
  );
}

/* ---------- o formulário ---------- */

function FormularioProduto({ inicial, categorias, aoFechar, aoSalvar }) {
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const refs = useRef({}).current;
  const arquivo = useRef(null);

  const muda = (campo) => (v) => setF((a) => ({ ...a, [campo]: v }));

  function acusar(campo, mensagem) {
    setErro({ campo, mensagem });
    const alvo = refs[campo];
    if (alvo) {
      alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => alvo.focus({ preventScroll: true }), 300);
    }
    return false;
  }

  /** Um erro por vez, na ordem da tela. */
  function conferir() {
    if (!f.nome.trim()) return acusar('nome', 'Escreva o nome do produto.');

    const preco = paraNumero(f.preco);
    const vip = paraNumero(f.preco_vip);
    const promo = paraNumero(f.preco_promocional);
    const custo = paraNumero(f.custo);
    const estoque = paraNumero(f.estoque);

    if (preco !== null && Number.isNaN(preco)) return acusar('preco', 'O preço só aceita números.');
    if (f.situacao === 'ativo' && !(preco > 0)) {
      return acusar('preco', 'Produto na loja precisa de preço. Ou põe um preço, ou deixa arquivado.');
    }
    if (vip !== null && Number.isNaN(vip)) return acusar('preco_vip', 'O preço de membro só aceita números.');
    if (vip !== null && vip > 0 && preco > 0 && vip >= preco) {
      return acusar('preco_vip', 'O preço de membro tem que ser MENOR que o normal, senão ser membro não vale nada.');
    }
    if (promo !== null && Number.isNaN(promo)) return acusar('preco_promocional', 'A promoção só aceita números.');
    if (promo !== null && promo > 0 && preco > 0 && promo >= preco) {
      return acusar('preco_promocional', 'A promoção tem que ser MENOR que o preço normal. Riscar um número por outro igual engana o cliente.');
    }
    if (inicial.piso && promo !== null && promo > 0 && promo < Number(inicial.piso)) {
      /* Não é proibido, mas é bom ele saber: o piso desce junto e não sobe
         mais. */
      setErro(null);
    }
    if (custo !== null && Number.isNaN(custo)) return acusar('custo', 'O preço de compra só aceita números.');
    if (estoque === null || Number.isNaN(estoque) || estoque < 0) {
      return acusar('estoque', 'O estoque é um número, pode ser 0.');
    }

    setErro(null);
    return true;
  }

  async function escolherFoto(e) {
    const arq = e.target.files && e.target.files[0];
    if (!arq) return;
    setSubindo(true);
    const r = await subirFoto(arq, 'produtos');
    setSubindo(false);
    if (!r.ok) return setErro({ campo: 'nome', mensagem: 'A foto não subiu: ' + r.erro });
    setF((a) => ({ ...a, imagem: r.url }));
  }

  async function salvar() {
    if (!conferir()) return;

    const id = f.novo ? (apelido(f.nome) || 'produto-' + Date.now()) : f.produto_id;

    setOcupado(true);
    const r = await salvarProduto({
      produto_id: id,
      nome: f.nome.trim(),
      apresentacao: f.apresentacao.trim(),
      descricao: f.descricao.trim(),
      categoria: f.categoria || null,
      marca: f.marca.trim(),
      sku: f.sku.trim(),
      imagem: f.imagem.trim(),
      preco: paraNumero(f.preco),
      preco_vip: paraNumero(f.preco_vip),
      preco_promocional: paraNumero(f.preco_promocional),
      estoque: paraNumero(f.estoque),
      situacao: f.situacao,
      ordem: paraNumero(f.ordem) || 0
    }, paraNumero(f.custo));
    setOcupado(false);

    if (!r.ok) {
      const amigavel = /promo_menor/.test(r.erro)
        ? 'A promoção tem que ser menor que o preço normal.'
        : /ativo_tem_preco/.test(r.erro)
          ? 'Produto na loja precisa de preço.'
          : r.erro;
      return setErro({ campo: 'nome', mensagem: amigavel });
    }

    aoSalvar(f.novo ? 'Produto cadastrado.' : 'Produto salvo. A lista abaixo é o que o banco devolveu.');
  }

  async function alternarArquivo() {
    setOcupado(true);
    const r = await arquivarProduto(f.produto_id, f.situacao === 'ativo');
    setOcupado(false);
    if (!r.ok) return setErro({ campo: 'nome', mensagem: r.erro });
    aoSalvar(f.situacao === 'ativo' ? 'Produto arquivado: saiu da loja.' : 'Produto de volta à loja.');
  }

  async function apagar() {
    setOcupado(true);
    const r = await apagarProduto(f.produto_id);
    setOcupado(false);
    setConfirmando(false);

    if (!r.ok) {
      return setErro({
        campo: 'nome',
        mensagem: r.jaVendido
          ? 'Este produto já foi vendido, então não pode ser apagado: apagar junto o custo daquela venda mudaria o lucro de um mês já fechado. Arquive — ele sai da loja e a história fica de pé.'
          : r.erro
      });
    }
    aoSalvar('Produto apagado.');
  }

  const preco = paraNumero(f.preco);
  const custo = paraNumero(f.custo);
  const margem = custo > 0 && preco > 0 ? Math.round(((preco - custo) / custo) * 100) : null;
  const lucro = custo > 0 && preco > 0 ? preco - custo : null;

  return (
    <Gaveta
      titulo={f.novo ? 'Cadastrar produto' : f.nome || 'Produto'}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="pn-botao pn-botao--claro" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="pn-botao" onClick={salvar} disabled={ocupado || subindo}>
            {ocupado ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      {erro && erro.campo === 'nome' && erro.mensagem.length > 60 && (
        <p className="pn-erro">{erro.mensagem}</p>
      )}

      <p className="pn-secao" style={{ marginTop: 0 }}>O que o cliente vê</p>

      <div className="pn-foto-area">
        <div className="pn-foto-previa">
          {f.imagem ? <img src={f.imagem} alt="" /> : <IconeSemFoto tamanho={24} />}
        </div>
        <div>
          <button type="button" className="pn-botao pn-botao--claro"
            onClick={() => arquivo.current && arquivo.current.click()} disabled={subindo}>
            {subindo ? 'Subindo…' : f.imagem ? 'Trocar a foto' : 'Escolher a foto'}
          </button>
          {f.imagem && (
            <button type="button" className="pn-botao pn-botao--perigo" style={{ marginLeft: 6 }}
              onClick={() => setF((a) => ({ ...a, imagem: '' }))}>
              Tirar
            </button>
          )}
          <input ref={arquivo} type="file" accept="image/*" hidden onChange={escolherFoto} />
        </div>
      </div>

      <Campo id="nome" rotulo="Nome" valor={f.nome} aoMudar={muda('nome')} erro={erro} refs={refs} />
      <Campo id="apresentacao" rotulo="Apresentação" valor={f.apresentacao} aoMudar={muda('apresentacao')}
        erro={erro} refs={refs} dica="Aparece em negrito embaixo do nome. Ex.: 4 ampolas" />
      <Campo id="descricao" rotulo="Descrição curta" valor={f.descricao} aoMudar={muda('descricao')}
        erro={erro} refs={refs} linhas
        dica="Duas linhas no máximo. Vazio não deixa linha em branco no cartão." />

      <div className="pn-dupla">
        <Campo id="categoria" rotulo="Categoria" valor={f.categoria} aoMudar={muda('categoria')}
          erro={erro} refs={refs}
          opcoes={[{ valor: '', nome: 'Sem categoria' }].concat(
            categorias.map((c) => ({ valor: c.id, nome: c.nome }))
          )} />
        <Campo id="marca" rotulo="Marca" valor={f.marca} aoMudar={muda('marca')} erro={erro} refs={refs} />
      </div>

      <p className="pn-secao">Preços</p>

      <div className="pn-tripla">
        <Campo id="preco" rotulo="Preço normal" valor={f.preco} aoMudar={muda('preco')}
          modo="decimal" erro={erro} refs={refs} placeholder="0,00" />
        <Campo id="preco_vip" rotulo="Preço de membro" valor={f.preco_vip} aoMudar={muda('preco_vip')}
          modo="decimal" erro={erro} refs={refs} placeholder="deixe vazio" />
        <Campo id="preco_promocional" rotulo="Promoção" valor={f.preco_promocional} aoMudar={muda('preco_promocional')}
          modo="decimal" erro={erro} refs={refs} placeholder="deixe vazio" />
      </div>

      <p className="pn-campo-dica" style={{ marginTop: -4, marginBottom: 14 }}>
        Quem manda é sempre o <b>menor</b> preço que valer. Promoção igual ou maior
        que o normal não aparece na loja.
      </p>

      {inicial.piso !== undefined && inicial.piso !== null && (
        <p className="pn-campo-dica" style={{ marginBottom: 14 }}>
          Piso deste produto: <b>{moeda(inicial.piso)}</b>. É o menor preço que este
          produto já teve. O banco recusa pedido abaixo do piso, e o piso só desce —
          nunca sobe — para não barrar uma venda pelo preço que você já praticou.
        </p>
      )}

      <p className="pn-secao">Só você vê</p>

      <div className="pn-dupla">
        <Campo id="custo" rotulo="Preço de compra" valor={f.custo} aoMudar={muda('custo')}
          modo="decimal" erro={erro} refs={refs} placeholder="0,00" />
        <Campo id="estoque" rotulo="Estoque" valor={f.estoque} aoMudar={muda('estoque')}
          modo="numeric" erro={erro} refs={refs} />
      </div>

      {margem !== null && (
        <p className="pn-campo-dica" style={{ marginBottom: 14 }}>
          Lucro por unidade: <b>{moeda(lucro)}</b> · margem <b>{margem}%</b>
        </p>
      )}

      <div className="pn-dupla">
        <Campo id="situacao" rotulo="Situação" valor={f.situacao} aoMudar={muda('situacao')}
          erro={erro} refs={refs}
          opcoes={[
            { valor: 'ativo', nome: 'Na loja' },
            { valor: 'arquivado', nome: 'Arquivado (fora da loja)' }
          ]} />
        <Campo id="ordem" rotulo="Ordem na vitrine" valor={f.ordem} aoMudar={muda('ordem')}
          modo="numeric" erro={erro} refs={refs} dica="Menor aparece antes." />
      </div>

      <Campo id="sku" rotulo="Código interno" valor={f.sku} aoMudar={muda('sku')} erro={erro} refs={refs} />

      {erro && erro.mensagem.length <= 60 && erro.campo === 'nome' && (
        <p className="pn-erro">{erro.mensagem}</p>
      )}

      {!f.novo && (
        <>
          <p className="pn-secao">Tirar da loja</p>
          <div className="pn-botoes">
            <button type="button" className="pn-botao pn-botao--claro" onClick={alternarArquivo} disabled={ocupado}>
              {f.situacao === 'ativo' ? 'Arquivar' : 'Voltar para a loja'}
            </button>
            {!confirmando ? (
              <button type="button" className="pn-botao pn-botao--perigo" onClick={() => setConfirmando(true)}>
                Apagar de vez
              </button>
            ) : (
              <button type="button" className="pn-botao pn-botao--perigo" onClick={apagar} disabled={ocupado}>
                Confirmo, apagar
              </button>
            )}
          </div>
          <p className="pn-campo-dica" style={{ marginTop: 8 }}>
            Arquivar tira da loja e mantém a história. Apagar só funciona em produto
            que nunca foi vendido.
          </p>
        </>
      )}
    </Gaveta>
  );
}

/* ---------- categorias ---------- */

function FormularioCategorias({ categorias, produtos, aoFechar, aoMudar }) {
  const [lista, setLista] = useState(categorias);
  const [nova, setNova] = useState('');
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function gravar(cat) {
    setOcupado(true);
    const r = await salvarCategoria(cat);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    setErro(null);
    setLista((a) => a.map((c) => (c.id === cat.id ? { ...c, ...cat } : c)));
    aoMudar();
  }

  async function criar() {
    const nome = nova.trim();
    if (!nome) return;
    const id = apelido(nome);
    if (!id) return setErro('Esse nome não dá um endereço válido. Use letras e números.');
    if (lista.some((c) => c.id === id)) return setErro('Já existe uma categoria com esse nome.');

    const cat = { id, nome, icone: 'caixa', tom: 'ouro', ordem: lista.length, oculta: false, destaque: false };
    setOcupado(true);
    const r = await salvarCategoria(cat);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    setErro(null);
    setNova('');
    setLista((a) => a.concat(cat));
    aoMudar();
  }

  async function apagar(id) {
    setOcupado(true);
    const r = await apagarCategoria(id);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    setErro(null);
    setLista((a) => a.filter((c) => c.id !== id));
    aoMudar();
  }

  return (
    <Gaveta titulo="Categorias" aoFechar={aoFechar}
      rodape={<button type="button" className="pn-botao" onClick={aoFechar}>Pronto</button>}>

      {erro && <p className="pn-erro">{erro}</p>}

      <p className="pn-ajuda" style={{ marginBottom: 14 }}>
        Esconder tira a categoria da loja sem apagar nada. Destacar põe ela primeiro
        na fila. Apagar só é possível quando nenhum produto está nela.
      </p>

      <div className="pn-lista">
        {lista.map((c) => {
          const quantos = produtos.filter((p) => p.categoria === c.id).length;
          return (
            <div className="pn-item" key={c.id} style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <IconeCategoria chave={c.icone} tamanho={19} />
                <input
                  value={c.nome}
                  onChange={(e) => setLista((a) => a.map((x) => (x.id === c.id ? { ...x, nome: e.target.value } : x)))}
                  onBlur={() => gravar({ ...c, nome: c.nome })}
                  aria-label={`Nome da categoria ${c.nome}`}
                  style={{ flex: '1 1 auto', border: '1px solid var(--linha)', borderRadius: 10, padding: '9px 11px', fontSize: 16 }}
                />
              </div>

              <div className="pn-filtros" style={{ marginBottom: 8 }}>
                {ICONES.map((i) => (
                  <button key={i} type="button" aria-pressed={c.icone === i} aria-label={`Ícone ${i}`}
                    onClick={() => gravar({ ...c, icone: i })} style={{ padding: '8px 11px' }}>
                    <IconeCategoria chave={i} tamanho={17} />
                  </button>
                ))}
              </div>

              <label className="pn-marcar">
                <input type="checkbox" checked={!c.oculta}
                  onChange={(e) => gravar({ ...c, oculta: !e.target.checked })} />
                Aparece na loja
              </label>

              <label className="pn-marcar">
                <input type="checkbox" checked={!!c.destaque}
                  onChange={(e) => gravar({ ...c, destaque: e.target.checked })} />
                Em destaque (aparece primeiro)
              </label>

              <p className="pn-item-linha">
                {quantos === 0 ? 'Nenhum produto nesta categoria' : `${quantos} produto${quantos > 1 ? 's' : ''}`}
              </p>

              {quantos === 0 && (
                <button type="button" className="pn-botao pn-botao--perigo" style={{ marginTop: 8 }}
                  onClick={() => apagar(c.id)} disabled={ocupado}>
                  Apagar categoria
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="pn-secao">Criar categoria</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nome da categoria"
          aria-label="Nome da nova categoria"
          style={{ flex: '1 1 auto', border: '1px solid var(--linha)', borderRadius: 12, padding: '12px 13px', fontSize: 16 }} />
        <button type="button" className="pn-botao" onClick={criar} disabled={ocupado || !nova.trim()}>
          Criar
        </button>
      </div>
    </Gaveta>
  );
}
