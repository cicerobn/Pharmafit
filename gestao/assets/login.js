/* =========================================================
   PHARMA FIT — tela de entrada do painel (gestao/login.html)

   Este código morava dentro do login.html, num <script> embutido.
   Saiu para cá em 25/09/2026 por segurança: com todo script em
   arquivo próprio, a Política de Segurança de Conteúdo (CSP) das
   páginas pode proibir script embutido — que é justamente a forma de
   um código injetado por alguém rodar. Nada mudou no que ele faz.
   ========================================================= */
(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var cfg = window.PHARMAFIT_CONFIG || {};

  var form = document.getElementById('form-login');
  var email = document.getElementById('email');
  var senha = document.getElementById('senha');
  var lembrar = document.getElementById('lembrar');
  var botao = document.getElementById('entrar');
  var botaoTexto = document.getElementById('entrar-texto');
  var erro = document.getElementById('alerta-erro');
  var erroTexto = document.getElementById('alerta-erro-texto');
  var ok = document.getElementById('alerta-ok');
  var okTexto = document.getElementById('alerta-ok-texto');

  var LEMBRADO = 'pharmafit_gestao_email';

  function mostrarErro(msg) {
    ok.classList.remove('is-visible');
    erroTexto.textContent = msg;
    erro.classList.add('is-visible');
  }
  function mostrarOk(msg) {
    erro.classList.remove('is-visible');
    okTexto.textContent = msg;
    ok.classList.add('is-visible');
  }
  function limpar() {
    erro.classList.remove('is-visible');
    ok.classList.remove('is-visible');
  }
  function carregando(estado) {
    botao.disabled = estado;
    botaoTexto.innerHTML = estado
      ? '<span class="spinner" aria-hidden="true"></span> Entrando…'
      : 'Entrar';
    botaoTexto.style.display = 'inline-flex';
    botaoTexto.style.alignItems = 'center';
    botaoTexto.style.gap = '10px';
  }

  /* modo demonstração: mostra as credenciais de teste */
  Auth.pronto.then(function () {
    if (Auth.modo !== 'demo') return;
    document.getElementById('demo-email').textContent = (cfg.DEMO || {}).email || '';
    document.getElementById('demo-senha').textContent = (cfg.DEMO || {}).senha || '';
    document.getElementById('nota-demo').hidden = false;
    if (cfg.SUPABASE_URL) {
      mostrarErro('A biblioteca do Supabase não carregou — verifique a conexão. Usando modo demonstração.');
    }
  });

  /* e-mail lembrado */
  try {
    var salvo = localStorage.getItem(LEMBRADO);
    if (salvo) { email.value = salvo; lembrar.checked = true; senha.focus(); }
    else { email.focus(); }
  } catch (e) { email.focus(); }

  /* mensagem vinda do painel (sessão sem permissão) */
  if (/[?&]erro=sem-acesso/.test(location.search)) {
    mostrarErro('Sua conta não tem permissão para acessar a gestão.');
  }

  /* já está logado? vai direto ao painel */
  /* DEPOIS DE ENTRAR, O PAINEL NOVO — e não o antigo.
   *
   * Achado em 18/09/2026, respondendo "como acessar o painel com a conta
   * de adm?": a entrada levava para `dashboard.html`, que é o painel
   * ANTIGO, e de lá não havia UM caminho para o painel novo, em formato
   * de aplicativo. Ele só existia para quem soubesse digitar
   * `/gestao/app/inicio.html` na barra de endereço — um painel que o
   * Brian pediu e que ninguém achava.
   *
   * O caminho contrário existe e continua existindo: o "Mais" do painel
   * novo leva para Gastos e para o Dashboard antigo. Então o novo é o
   * lugar por onde se começa, e o antigo é um dos lugares onde se
   * chega. */
  /* CHEGOU PELO LINK DO E-MAIL? Então a tela é a da senha nova, e o
     "já está logado, vai ao painel" logo abaixo NÃO pode rodar: o link
     já traz uma sessão, e ela mandaria a pessoa ao painel sem nunca
     criar a senha. O `type=recovery` do endereço é o que o Supabase
     põe no link; o `nova-senha=1` é o nosso, que sobrevive mesmo
     depois de o Supabase limpar o endereço. */
  var recuperando = /[?&]nova-senha=1/.test(location.search) || /type=recovery/.test(location.hash);
  if (recuperando) {
    form.hidden = true;
    document.querySelector('.auth__title').textContent = 'Criar senha nova';
    document.querySelector('.auth__lead').textContent = 'Escolha a senha que você vai usar daqui para frente.';
    var formNova = document.getElementById('form-nova');
    formNova.hidden = false;
    var novaErro = document.getElementById('nova-erro');
    var novaOk = document.getElementById('nova-ok');
    var dizNova = function (msg, bom) {
      (bom ? novaErro : novaOk).classList.remove('is-visible');
      document.getElementById(bom ? 'nova-ok-texto' : 'nova-erro-texto').textContent = msg;
      (bom ? novaOk : novaErro).classList.add('is-visible');
    };
    document.getElementById('nova-senha').focus();
    formNova.addEventListener('submit', async function (e) {
      e.preventDefault();
      var s1 = document.getElementById('nova-senha').value;
      var s2 = document.getElementById('nova-senha2').value;
      if (s1.length < 8) return dizNova('A senha precisa de pelo menos 8 caracteres.');
      if (s1 !== s2) return dizNova('As duas senhas não são iguais.');
      var b = document.getElementById('nova-salvar');
      b.disabled = true; b.textContent = 'Salvando…';
      var r = await Auth.novaSenha(s1);
      b.disabled = false; b.textContent = 'Salvar senha nova';
      if (!r.ok) return dizNova(r.erro);
      dizNova('Senha nova salva. Entrando no painel…', true);
      setTimeout(function () { location.replace('app/inicio.html'); }, 1200);
    });
  } else {
    Auth.usuario().then(async function (u) {
      if (!u) return;
      if (await Auth.precisaCodigo()) { pedirCodigo(); return; }
      location.replace('app/inicio.html');
    });
    if (/[?&]codigo=1/.test(location.search)) pedirCodigo();
  }

  /* O SEGUNDO PASSO: o código de 6 dígitos (duas etapas, 25/09/2026). */
  function pedirCodigo() {
    form.hidden = true;
    document.querySelector('.auth__title').textContent = 'Confirme que é você';
    document.querySelector('.auth__lead').textContent =
      'Abra o app autenticador no celular e digite o código de 6 números da Pharma Fit.';
    var f = document.getElementById('form-codigo');
    if (!f.hidden) return;
    f.hidden = false;
    var campo = document.getElementById('codigo');
    campo.focus();
    var erroC = document.getElementById('codigo-erro');
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      erroC.classList.remove('is-visible');
      var b = document.getElementById('codigo-entrar');
      b.disabled = true; b.textContent = 'Conferindo…';
      var r = await Auth.confirmarCodigo(campo.value);
      b.disabled = false; b.textContent = 'Confirmar e entrar';
      if (!r.ok) {
        document.getElementById('codigo-erro-texto').textContent = r.erro;
        erroC.classList.add('is-visible');
        campo.select();
        return;
      }
      location.replace('app/inicio.html');
    });
    document.getElementById('codigo-outra').addEventListener('click', async function () {
      await Auth.sair();
      location.replace('login.html');
    });
  }

  /* mostrar / ocultar senha */
  document.getElementById('ver-senha').addEventListener('click', function () {
    var visivel = senha.type === 'text';
    senha.type = visivel ? 'password' : 'text';
    this.setAttribute('aria-pressed', String(!visivel));
    this.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
    document.getElementById('icone-olho').innerHTML = visivel
      ? '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M4 4l16 16"/><path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.5 4.1M6.6 7.9A17 17 0 0 0 2.5 12S6 18.2 12 18.2a9.5 9.5 0 0 0 3.4-.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';
    senha.focus();
  });

  /* entrar */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    limpar();

    if (!email.value.trim()) { mostrarErro('Informe seu e-mail.'); email.focus(); return; }
    if (!senha.value) { mostrarErro('Informe sua senha.'); senha.focus(); return; }

    carregando(true);
    var r = await Auth.entrar(email.value, senha.value, lembrar.checked);
    carregando(false);

    if (r.precisaCodigo) {
      try {
        if (lembrar.checked) localStorage.setItem(LEMBRADO, email.value.trim());
        else localStorage.removeItem(LEMBRADO);
      } catch (err) {}
      pedirCodigo();
      return;
    }
    if (!r.ok) { mostrarErro(r.erro); senha.select(); return; }

    try {
      if (lembrar.checked) localStorage.setItem(LEMBRADO, email.value.trim());
      else localStorage.removeItem(LEMBRADO);
    } catch (err) {}

    location.href = 'app/inicio.html';
  });

  /* recuperar senha */
  document.getElementById('esqueci').addEventListener('click', async function () {
    limpar();
    if (!email.value.trim()) {
      mostrarErro('Digite seu e-mail no campo acima e clique novamente.');
      email.focus();
      return;
    }
    var r = await Auth.recuperarSenha(email.value);
    if (r.ok) mostrarOk('Enviamos um link de redefinição para ' + email.value.trim() + '.');
    else mostrarErro(r.erro);
  });
})();
