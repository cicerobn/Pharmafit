/* =========================================================
   PHARMA FIT — tela de criar conta
   ========================================================= */
(function () {
  'use strict';

  var Nuvem = window.PharmaFitNuvem;

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
    /* 8, e não 6, desde 24/09/2026: senha de 6 se adivinha rápido, e o
       Supabase do projeto passa a exigir 8 também. */
    if (senha.length < 8) {
      return dizer('A senha precisa de pelo menos 8 caracteres.');
    }
    if (senha !== senha2) {
      return dizer('As duas senhas estão diferentes.');
    }

    esperando(true);
    var r = await Conta.criar({ nome: nome, email: email, telefone: telefone, senha: senha });
    esperando(false);

    if (!r.ok) {
      /* `podeTentar` significa que a biblioteca não chegou: aí o botão
         busca de novo e refaz o cadastro sem a pessoa redigitar nada.
         Erro de verdade do servidor (e-mail já usado, por exemplo) sai
         sem botão, porque tentar de novo daria no mesmo. */
      return dizerComTentativa(r, function () { form.requestSubmit(); });
    }

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
