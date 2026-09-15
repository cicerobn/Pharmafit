/* =========================================================
   PHARMA FIT — tela de criar conta
   ========================================================= */
(function () {
  'use strict';

  var Conta = window.PharmaFitConta;
  var U = window.PharmaFitValidacao;
  var form = document.getElementById('form-criar');
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

  function esperando(sim) {
    botao.setAttribute('aria-busy', String(sim));
    texto.textContent = sim ? 'Criando…' : 'Criar conta';
  }

  (async function () {
    var u = await Conta.usuario();
    if (u) location.replace('conta.html');
  })();

  function digitos(s) { return String(s || '').replace(/\D+/g, ''); }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    calar();

    var nome = document.getElementById('nome').value.trim();
    var email = document.getElementById('email').value.trim();
    var telefone = document.getElementById('telefone').value.trim();
    var senha = document.getElementById('senha').value;
    var senha2 = document.getElementById('senha2').value;

    /* As conferências na ordem em que a pessoa preencheu, para o recado
       apontar o primeiro campo errado e não o último. */
    if (nome.split(/\s+/).filter(Boolean).length < 2) {
      return dizer('Escreva o seu nome e o sobrenome — é o nome que vai no pedido.');
    }
    if (!email || email.indexOf('@') === -1 || email.indexOf('.') === -1) {
      return dizer('Confira o e-mail: parece faltar alguma coisa nele.');
    }
    if (digitos(telefone).length < 10) {
      return dizer('O WhatsApp precisa do DDD e do número completo.');
    }
    if (senha.length < 6) {
      return dizer('A senha precisa de pelo menos 6 caracteres.');
    }
    if (senha !== senha2) {
      return dizer('As duas senhas estão diferentes.');
    }

    esperando(true);
    var r = await Conta.criar({ nome: nome, email: email, telefone: telefone, senha: senha });
    esperando(false);

    if (!r.ok) return dizer(r.erro);

    /* O projeto pode exigir confirmação por e-mail. Quando exige, não
       há sessão de volta — e mandar a pessoa para o login sem avisar
       faz ela tentar entrar, não conseguir e não entender por quê. */
    if (r.confirmarEmail) {
      form.hidden = true;
      return dizer('Conta criada. Falta confirmar: mandamos uma mensagem para ' + email +
        '. Abra o link de lá e depois volte para entrar.', 'ok');
    }

    dizer('Conta criada. Levando você para a sua conta…', 'ok');
    setTimeout(function () { location.replace('conta.html'); }, 700);
  });

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
