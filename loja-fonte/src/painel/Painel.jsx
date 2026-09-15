/* A casca do painel.
 *
 * O painel é a mesma página da loja: ele só aparece quando o endereço tem
 * #/painel E a pessoa entrou com um acesso liberado. Não existe "esconder" o
 * painel — o código dele está no mesmo arquivo que qualquer visitante pode ler,
 * e sempre vai estar, porque o site é estático. Quem protege os dados é a RLS
 * do banco: sem acesso liberado, as telas abaixo carregam vazias.
 *
 * Todo nome de classe aqui leva o prefixo pn-. */

import { useEffect, useState } from 'react';
import { sb } from '../supabase.js';
import { sessaoAtual, souAdmin, sair } from './dadosPainel.js';
import { nomeDaLoja } from '../dados.js';
import { ajustes } from './dadosPainel.js';
import Entrar from './Entrar.jsx';
import Inicio from './Inicio.jsx';
import Pedidos from './Pedidos.jsx';
import Produtos from './Produtos.jsx';
import Clientes from './Clientes.jsx';
import Relatorios from './Relatorios.jsx';
import AjustesTela from './Ajustes.jsx';
import './painel.css';

const TELAS = [
  { id: 'inicio', nome: 'Início' },
  { id: 'pedidos', nome: 'Pedidos' },
  { id: 'produtos', nome: 'Produtos' },
  { id: 'clientes', nome: 'Clientes' },
  { id: 'relatorios', nome: 'Relatórios' },
  { id: 'ajustes', nome: 'Configurações' }
];

/** O link de recuperação de senha chega com type=recovery no fim do endereço. */
function chegouParaTrocarSenha() {
  const pedaco = window.location.hash || '';
  return /type=recovery/.test(pedaco) || /type=recovery/.test(window.location.search || '');
}

export default function Painel({ aoVoltarParaLoja }) {
  const [conferindo, setConferindo] = useState(true);
  const [sessao, setSessao] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [tela, setTela] = useState('inicio');
  const [nome, setNome] = useState(null);
  const [recuperando, setRecuperando] = useState(chegouParaTrocarSenha);

  async function conferir() {
    setConferindo(true);
    const s = await sessaoAtual();
    setSessao(s);
    if (s) {
      setAdmin(await souAdmin());
      try { setNome(nomeDaLoja(await ajustes())); } catch (e) { setNome(null); }
    } else {
      setAdmin(false);
    }
    setConferindo(false);
  }

  useEffect(() => {
    conferir();
    /* Quando a sessão expira sozinha, a tela volta para a entrada em vez de
       ficar mostrando telas vazias. */
    const { data } = sb.auth.onAuthStateChange(() => { conferir(); });
    return () => { if (data && data.subscription) data.subscription.unsubscribe(); };
  }, []);

  if (conferindo) return <p className="pn-carregando">Conferindo o seu acesso…</p>;

  /* Chegou pelo link do e-mail: a única coisa a fazer aqui é escolher a senha
     nova. Depois de escolher, o pedaço "type=recovery" sai do endereço, senão a
     tela voltaria para cá no próximo recarregamento. */
  if (recuperando) {
    return (
      <Entrar
        recuperando
        aoEntrar={() => {
          window.history.replaceState(null, '', window.location.origin + window.location.pathname + '#/painel');
          setRecuperando(false);
          conferir();
        }}
      />
    );
  }

  if (!sessao) return <Entrar aoEntrar={conferir} />;

  if (!admin) {
    return (
      <div className="pn-entrada">
        <div className="pn-entrada-caixa">
          <h1>Sem acesso ao painel</h1>
          <p className="pn-sub">
            A sua conta está válida, mas ela não tem acesso de administrador.
            Quem já tem acesso pode liberar o seu em Configurações.
          </p>
          <button type="button" className="pn-botao pn-botao--largo" onClick={aoVoltarParaLoja}>
            Ir para a loja
          </button>
          <button type="button" className="pn-botao pn-botao--claro pn-botao--largo" style={{ marginTop: 8 }}
            onClick={async () => { await sair(); conferir(); }}>
            Sair desta conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pn-casca">
      <header className="pn-topo">
        <div className="pn-topo-linha">
          <h1 className="pn-topo-marca">{nome || 'Painel'}</h1>
          <span className="pn-topo-quem">{sessao.user.email}</span>
          <button type="button" className="pn-sair" onClick={aoVoltarParaLoja}>Loja</button>
          <button type="button" className="pn-sair" onClick={async () => { await sair(); conferir(); }}>
            Sair
          </button>
        </div>

        <nav className="pn-menu" aria-label="Telas do painel">
          {TELAS.map((t) => (
            <button key={t.id} type="button"
              aria-current={tela === t.id ? 'page' : undefined}
              onClick={() => setTela(t.id)}>
              {t.nome}
            </button>
          ))}
        </nav>
      </header>

      <main className="pn-corpo">
        {tela === 'inicio' && <Inicio irPara={setTela} />}
        {tela === 'pedidos' && <Pedidos />}
        {tela === 'produtos' && <Produtos />}
        {tela === 'clientes' && <Clientes />}
        {tela === 'relatorios' && <Relatorios />}
        {tela === 'ajustes' && <AjustesTela />}
      </main>
    </div>
  );
}
