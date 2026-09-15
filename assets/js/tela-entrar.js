/* =========================================================
   PHARMA FIT — tela de entrar
   ========================================================= */
(function () {
  'use strict';

  var Nuvem = window.PharmaFitNuvem;

  var Conta = window.PharmaFitConta;
  var form = document.getElementById('form-entrar');
  if (!form || !Conta) return;

  var recado = document.getElementById('recado');
  var botao = document.getElementById('enviar');
  var texto = botao.querySelector('[data-texto]');

  function dizer(msg, tipo) {
    recado.hidden = false;
    recado.className = 'aviso-forma aviso-forma--' + (tipo || 'erro');
    recado.textContent = msg;
    recado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* "Tentar de novo" que TENTA DE NOVO.
   *
   * Quando a biblioteca da conta não chega, recarregar a página só
   * repete a mesma espera. Este botão manda o nuvem.js buscar o arquivo
   * outra vez e, se vier, reenvia o formulário — a pessoa não digita
   * nada de novo.
   *
   * Botão que não faz nada é pior que botão nenhum, então ele só
   * aparece quando há o que tentar (`podeTentar`). Se o site é que não
   * está ligado ao banco, não há nada a tentar e o recado sai seco. */
  function dizerComTentativa(r, refazer) {
    dizer(r.erro);
    if (!r.podeTentar || !Nuvem || !Nuvem.tentarDeNovo) return;

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'linkish aviso-forma__tentar';
    b.textContent = 'Tentar de novo';
    b.addEventListener('click', async function () {
      b.disabled = true;
      b.textContent = 'Tentando…';
      var deu = await Nuvem.tentarDeNovo();
      if (!deu) {
        b.disabled = false;
        b.textContent = 'Tentar de novo';
        dizer('Ainda não deu. Confira a conexão e tente mais uma vez.');
        return;
      }
      calar();
      refazer();
    });
    /* Sem <br>: o `.aviso-forma` é um flex row e ali a quebra de linha
       não faz nada. Quem põe o botão embaixo é o CSS
       (`.aviso-forma__tentar{flex-basis:100%}`). */
    recado.appendChild(b);
  }

  function calar() { recado.hidden = true; recado.textContent = ''; }

  function esperando(sim, oque) {
    botao.setAttribute('aria-busy', String(sim));
    texto.textContent = sim ? (oque || 'Entrando…') : 'Entrar';
  }

  /* Se a pessoa já está dentro, esta tela não tem o que fazer: manda
     para a conta em vez de pedir a senha de novo. */
  (async function () {
    var u = await Conta.usuario();
    if (u) location.replace('conta.html');
  })();

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    calar();

    var email = document.getElementById('email').value.trim();
    var senha = document.getElementById('senha').value;

    if (!email || email.indexOf('@') === -1) {
      return dizer('Escreva o seu e-mail.');
    }
    if (!senha) {
      return dizer('Escreva a sua senha.');
    }

    esperando(true);
    var r = await Conta.entrar(email, senha);
    esperando(false);

    if (!r.ok) return dizerComTentativa(r, function () { form.requestSubmit(); });

    dizer('Tudo certo. Levando você para a sua conta…', 'ok');
    /* Um instante para a pessoa ler o recado antes da tela trocar. */
    setTimeout(function () { location.replace('conta.html'); }, 700);
  });

  /* Sai do ouvinte para ter nome, e assim o botão "Tentar de novo" poder
     chamar a MESMA coisa. Na primeira versão eu escrevi ali um
     `pedirSenha(email)` que não existia em lugar nenhum: o botão
     aparecia e estourava ao ser clicado. Botão que não faz nada é o que
     o Brian pediu para nunca existir, e um que dá erro é pior. */
  async function pedirTrocaDeSenha(email) {
    esperando(true, 'Enviando…');
    var r = await Conta.esqueciSenha(email);
    esperando(false);

    if (!r.ok) {
      return dizerComTentativa(r, function () { pedirTrocaDeSenha(email); });
    }
    dizer('Mandamos um link para ' + email + '. Procure na sua caixa de entrada.', 'ok');
  }

  document.getElementById('esqueci').addEventListener('click', function () {
    calar();
    var email = document.getElementById('email').value.trim();
    if (!email || email.indexOf('@') === -1) {
      return dizer('Escreva o seu e-mail acima, e eu mando o link para trocar a senha.');
    }
    pedirTrocaDeSenha(email);
  });

  /* O olho da senha. */
  document.querySelectorAll('[data-ver-senha]').forEach(function (b) {
    b.addEventListener('click', function () {
      var campo = document.getElementById(b.getAttribute('data-ver-senha'));
      if (!campo) return;
      var vendo = campo.type === 'text';
      campo.type = vendo ? 'password' : 'text';
      b.setAttribute('aria-pressed', String(!vendo));
      b.setAttribute('aria-label', vendo ? 'Mostrar a senha' : 'Esconder a senha');
    });
  });
})();
