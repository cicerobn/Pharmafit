/* =========================================================
   PHARMA FIT — tela de entrar
   ========================================================= */
(function () {
  'use strict';

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

    if (!r.ok) return dizer(r.erro);

    dizer('Tudo certo. Levando você para a sua conta…', 'ok');
    /* Um instante para a pessoa ler o recado antes da tela trocar. */
    setTimeout(function () { location.replace('conta.html'); }, 700);
  });

  document.getElementById('esqueci').addEventListener('click', async function () {
    calar();
    var email = document.getElementById('email').value.trim();
    if (!email || email.indexOf('@') === -1) {
      return dizer('Escreva o seu e-mail acima, e eu mando o link para trocar a senha.');
    }

    esperando(true, 'Enviando…');
    var r = await Conta.esqueciSenha(email);
    esperando(false);

    if (!r.ok) return dizer(r.erro);
    dizer('Mandamos um link para ' + email + '. Procure na sua caixa de entrada.', 'ok');
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
