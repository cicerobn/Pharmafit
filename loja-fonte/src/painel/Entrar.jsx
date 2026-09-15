/* A porta do painel.
 *
 * Nenhuma senha, chave ou segredo mora neste arquivo — e não poderia, porque o
 * site é estático e qualquer visitante lê o código. Quem confere a senha é o
 * Supabase; quem decide o que o painel pode ver é a RLS do banco.
 *
 * O "esqueci minha senha" manda um e-mail de verdade pelo Supabase. Se o envio
 * de e-mail do projeto não estiver ligado, a tela diz o que aconteceu em vez de
 * ficar calada fingindo que deu certo. */

import { useState } from 'react';
import { entrar, pedirNovaSenha, trocarSenha } from './dadosPainel.js';
import { Campo } from './pecas.jsx';

export default function Entrar({ aoEntrar, recuperando }) {
  const [tela, setTela] = useState(recuperando ? 'nova_senha' : 'entrar');

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');

  const [erro, setErro] = useState(null);
  const [recado, setRecado] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function fazerEntrada(e) {
    e.preventDefault();
    setErro(null);
    setRecado(null);

    if (!email.trim()) return setErro({ campo: 'email', mensagem: 'Escreva o seu e-mail.' });
    if (!senha) return setErro({ campo: 'senha', mensagem: 'Escreva a sua senha.' });

    setOcupado(true);
    const r = await entrar(email, senha);
    setOcupado(false);

    if (!r.ok) {
      const errado = /invalid login|credentials/i.test(r.erro);
      return setErro({
        campo: 'senha',
        mensagem: errado ? 'E-mail ou senha não conferem.' : r.erro
      });
    }
    aoEntrar();
  }

  async function fazerPedido(e) {
    e.preventDefault();
    setErro(null);
    setRecado(null);

    if (!email.trim()) return setErro({ campo: 'email', mensagem: 'Escreva o seu e-mail.' });

    setOcupado(true);
    const r = await pedirNovaSenha(email);
    setOcupado(false);

    if (!r.ok) return setErro({ campo: 'email', mensagem: 'Não conseguimos enviar: ' + r.erro });
    setRecado('Enviamos um link para ' + email.trim() + '. Abra o e-mail e toque no link para escolher uma senha nova.');
  }

  async function fazerTroca(e) {
    e.preventDefault();
    setErro(null);
    setRecado(null);

    if (senha.length < 8) return setErro({ campo: 'senha', mensagem: 'A senha precisa ter pelo menos 8 letras ou números.' });
    if (senha !== senha2) return setErro({ campo: 'senha2', mensagem: 'As duas senhas não são iguais.' });

    setOcupado(true);
    const r = await trocarSenha(senha);
    setOcupado(false);

    if (!r.ok) return setErro({ campo: 'senha', mensagem: r.erro });
    aoEntrar();
  }

  return (
    <div className="pn-entrada">
      <div className="pn-entrada-caixa">
        {tela === 'entrar' && (
          <form onSubmit={fazerEntrada} noValidate>
            <h1>Painel de gestão</h1>
            <p className="pn-sub">Só quem tem acesso liberado entra aqui.</p>

            <Campo id="email" rotulo="E-mail" valor={email} aoMudar={setEmail}
              tipo="email" modo="email" erro={erro} autoFoco />
            <Campo id="senha" rotulo="Senha" valor={senha} aoMudar={setSenha}
              tipo="password" erro={erro} />

            <button type="submit" className="pn-botao pn-botao--largo" disabled={ocupado}>
              {ocupado ? 'Entrando…' : 'Entrar'}
            </button>

            <button type="button" className="pn-botao pn-botao--claro pn-botao--largo"
              style={{ marginTop: 8 }}
              onClick={() => { setTela('esqueci'); setErro(null); setRecado(null); }}>
              Esqueci minha senha
            </button>
          </form>
        )}

        {tela === 'esqueci' && (
          <form onSubmit={fazerPedido} noValidate>
            <h1>Nova senha</h1>
            <p className="pn-sub">Mandamos um link para o seu e-mail.</p>

            <Campo id="email" rotulo="E-mail" valor={email} aoMudar={setEmail}
              tipo="email" modo="email" erro={erro} autoFoco />

            {recado && <p className="pn-certo">{recado}</p>}

            <button type="submit" className="pn-botao pn-botao--largo" disabled={ocupado}>
              {ocupado ? 'Enviando…' : 'Enviar o link'}
            </button>

            <button type="button" className="pn-botao pn-botao--claro pn-botao--largo"
              style={{ marginTop: 8 }}
              onClick={() => { setTela('entrar'); setErro(null); setRecado(null); }}>
              Voltar
            </button>
          </form>
        )}

        {tela === 'nova_senha' && (
          <form onSubmit={fazerTroca} noValidate>
            <h1>Escolha a senha nova</h1>
            <p className="pn-sub">Pelo menos 8 letras ou números.</p>

            <Campo id="senha" rotulo="Senha nova" valor={senha} aoMudar={setSenha}
              tipo="password" erro={erro} autoFoco />
            <Campo id="senha2" rotulo="Repita a senha" valor={senha2} aoMudar={setSenha2}
              tipo="password" erro={erro} />

            <button type="submit" className="pn-botao pn-botao--largo" disabled={ocupado}>
              {ocupado ? 'Guardando…' : 'Guardar a senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
