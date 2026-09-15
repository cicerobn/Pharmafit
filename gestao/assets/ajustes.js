/* =========================================================
   PHARMA FIT — ajustes e diagnóstico

   Duas coisas que antes só dava para fazer abrindo arquivo:
   1) conferir se o site publicado está saudável (acentuação,
      HTTPS, conexão com o banco, tabelas que faltam);
   2) ligar o Supabase — cola URL e chave, a página testa e
      devolve o config.js pronto para copiar.

   A chave anon é pública por natureza (é ela que o site usa
   no navegador). A service_role NÃO é: se alguém colar uma
   aqui, a página recusa.
   ========================================================= */
(function () {
  'use strict';

  var U = window.PharmaFitUtil;
  var esc = U.esc, toast = U.toast;

  var Auth = window.PharmaFitAuth;
  var Dados = window.PharmaFitDados;
  var cfg = window.PHARMAFIT_CONFIG || {};

  /* tabelas que o painel usa, e para quê */
  var TABELAS = [
    { nome: 'produtos',       para: 'catálogo, preços e estoque' },
    { nome: 'pedidos',        para: 'vendas e fila de confirmação' },
    { nome: 'despesas',       para: 'gastos da empresa' },
    { nome: 'representantes', para: 'cadastros de parceiros' },
    { nome: 'orcamentos',     para: 'pedidos de atacado' },
    { nome: 'espera',         para: 'fila de interesse' },
    { nome: 'pessoal',        para: 'seu painel pessoal' },
    { nome: 'notas',          para: 'observações da ficha do cliente' },
    { nome: 'configuracoes',  para: 'meta do mês' }
  ];

  var conexaoTestada = null; /* { url, chave } que passou no teste */

  /* ---------- leitura da chave ---------- */

  /** Lê o miolo do JWT sem validar assinatura — só para ver o papel. */
  function papelDaChave(chave) {
    try {
      var meio = String(chave).split('.')[1];
      if (!meio) return '';
      var json = atob(meio.replace(/-/g, '+').replace(/_/g, '/'));
      return String(JSON.parse(json).role || '');
    } catch (e) {
      return '';
    }
  }

  function chaveDeServico(chave) {
    if (/service_role/i.test(String(chave))) return true;
    return papelDaChave(chave) === 'service_role';
  }

  /* ---------- diagnóstico ---------- */

  function item(estado, titulo, texto) {
    return '<li class="check check--' + estado + '">' +
      '<span class="check__marca" aria-hidden="true">' +
        (estado === 'ok' ? '✓' : (estado === 'erro' ? '!' : '•')) +
      '</span>' +
      '<span><span class="check__titulo">' + esc(titulo) + '</span>' +
        (texto ? '<span class="check__texto">' + texto + '</span>' : '') +
      '</span>' +
    '</li>';
  }

  /** Testa se a URL+chave respondem, sem precisar da biblioteca. */
  async function testarConexao(url, chave) {
    /* Testa a conexão pela tabela COM prefixo: sem ele o teste passaria
       usando a tabela de outro sistema e diria que está tudo bem. */
    var tab = (window.PHARMAFIT_CONFIG || {}).PREFIXO_TABELAS || '';
    var alvo = String(url).replace(/\/+$/, '') + '/rest/v1/' + tab + 'produtos?select=id&limit=1';

    try {
      var r = await fetch(alvo, { headers: { apikey: chave, Authorization: 'Bearer ' + chave } });

      if (r.status === 401 || r.status === 403) {
        return { ok: false, erro: 'A chave não foi aceita. Confira se copiou a chave anon inteira.' };
      }
      if (r.status === 404) {
        return { ok: true, tabelaFaltando: true };
      }
      if (!r.ok) {
        return { ok: false, erro: 'O servidor respondeu ' + r.status + '. Confira a URL do projeto.' };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: 'Não conseguimos falar com esse endereço. Confira a URL.' };
    }
  }

  /** Uma consulta por tabela, só para saber se ela existe. */
  async function conferirTabelas(url, chave) {
    var base = String(url).replace(/\/+$/, '');

    return Promise.all(TABELAS.map(async function (t) {
      try {
        var r = await fetch(base + '/rest/v1/' + t.nome + '?select=*&limit=1',
          { headers: { apikey: chave, Authorization: 'Bearer ' + chave } });
        return { tabela: t, existe: r.status !== 404, status: r.status };
      } catch (e) {
        return { tabela: t, existe: false, status: 0 };
      }
    }));
  }

  async function pintarDiagnostico() {
    var caixa = document.getElementById('checklist');
    caixa.innerHTML = '<li class="check check--neutro"><span class="check__marca">•</span>' +
      '<span><span class="check__titulo">Conferindo…</span></span></li>';

    var linhas = [];

    /* 1. acentuação — o problema clássico do Apache mandando ISO-8859-1 */
    var charset = String(document.characterSet || document.charset || '').toUpperCase();
    linhas.push(charset === 'UTF-8'
      ? item('ok', 'Acentuação', 'A página está em UTF-8. Os acentos aparecem certos.')
      : item('erro', 'Acentuação quebrada',
          'O servidor está mandando <b>' + esc(charset || 'desconhecido') + '</b> em vez de UTF-8. ' +
          'Confira se o arquivo <b>.htaccess</b> subiu para o public_html — ele é oculto, ' +
          'ative "mostrar arquivos ocultos" no gerenciador da Hostinger.'));

    /* 2. https */
    var local = location.protocol === 'file:' ||
                /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    if (local) {
      linhas.push(item('neutro', 'Endereço', 'Você está abrindo o painel direto do arquivo, ' +
        'não pelo site publicado.'));
    } else {
      linhas.push(location.protocol === 'https:'
        ? item('ok', 'HTTPS', 'Conexão segura. As notificações no celular podem funcionar.')
        : item('erro', 'Sem HTTPS', 'Ative o certificado SSL na Hostinger. Sem ele o aviso ' +
            'de novo pedido não chega no celular.'));
    }

    /* 3. conexão com o banco */
    if (!Auth.configurado) {
      linhas.push(item('erro', 'Modo demonstração',
        'O banco ainda não foi ligado, então cada aparelho tem os dados dele. ' +
        'Preencha o bloco abaixo para ligar.'));
    } else {
      var r = await testarConexao(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      linhas.push(r.ok
        ? item('ok', 'Banco conectado', 'Os dados são os mesmos em todos os aparelhos.')
        : item('erro', 'Banco não respondeu', esc(r.erro)));

      if (r.ok) {
        await pintarTabelas(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      }
    }

    /* 4. avisos de sistema */
    if (Auth.configurado && !cfg.VAPID_PUBLIC_KEY) {
      linhas.push(item('neutro', 'Avisos no celular desligados',
        'Falta a chave VAPID. Sem ela o painel funciona igual, só não vibra quando entra pedido.'));
    }

    /* 5. e-mail do dono */
    linhas.push(String(cfg.EMAIL_DONO || '') === 'gestao@pharmafit.com'
      ? item('neutro', 'E-mail do dono ainda é o de exemplo',
          'Enquanto for <b>gestao@pharmafit.com</b>, o painel pessoal fica visível para ' +
          'quem entrar. Troque pelo seu e-mail de verdade.')
      : item('ok', 'Painel pessoal protegido',
          'Só <b>' + esc(cfg.EMAIL_DONO) + '</b> enxerga a aba "Meu painel".'));

    /* 6. WhatsApp */
    var zap = U.digitos(cfg.WHATSAPP);
    linhas.push(zap.length >= 12
      ? item('ok', 'WhatsApp da loja', esc(cfg.WHATSAPP) + ' — com código do país.')
      : item('erro', 'WhatsApp incompleto',
          'Precisa do código do país na frente (55). Hoje está: ' + esc(cfg.WHATSAPP || 'vazio')));

    caixa.innerHTML = linhas.join('');
  }

  async function pintarTabelas(url, chave) {
    var bloco = document.getElementById('bloco-tabelas');
    var lista = document.getElementById('tabelas');

    bloco.hidden = false;
    lista.innerHTML = '<li class="check check--neutro"><span class="check__marca">•</span>' +
      '<span><span class="check__titulo">Conferindo as tabelas…</span></span></li>';

    var resultado = await conferirTabelas(url, chave);
    var faltando = resultado.filter(function (r) { return !r.existe; });

    lista.innerHTML = resultado.map(function (r) {
      return r.existe
        ? item('ok', r.tabela.nome, esc(r.tabela.para))
        : item('erro', r.tabela.nome, 'não existe ainda — ' + esc(r.tabela.para));
    }).join('');

    document.getElementById('dica-migracao').hidden = !faltando.length;
  }

  /* ---------- cópia de segurança ---------- */

  var COLECOES = ['pedidos', 'produtos', 'despesas', 'representantes', 'orcamentos',
                  'espera', 'pessoal', 'notas', 'configuracoes'];

  var CHAVE_BACKUP = 'pharmafit_ultimo_backup';

  function contar(dados) {
    return COLECOES
      .map(function (c) { return { nome: c, n: (dados[c] || []).length }; })
      .filter(function (c) { return c.n > 0; });
  }

  function resumoBackup(dados) {
    var itens = contar(dados);
    if (!itens.length) return 'nada guardado ainda';
    return itens.map(function (c) { return c.n + ' ' + c.nome; }).join(', ');
  }

  async function baixarBackup() {
    var botao = document.getElementById('baixar-backup');
    botao.disabled = true;

    var dados = { versao: 1, gerado_em: new Date().toISOString() };
    for (var i = 0; i < COLECOES.length; i++) {
      dados[COLECOES[i]] = await Dados.listar(COLECOES[i]);
    }

    botao.disabled = false;

    var d = new Date();
    var nome = 'pharmafit-backup-' + d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';

    var blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

    try { localStorage.setItem(CHAVE_BACKUP, dados.gerado_em); } catch (e) {}

    pintarBackup();
    toast('Cópia baixada: ' + resumoBackup(dados) + '.');
  }

  /** Só acrescenta o que falta — nada existente é apagado ou trocado. */
  async function restaurar(dados) {
    var novos = 0, pulados = 0;

    for (var i = 0; i < COLECOES.length; i++) {
      var colecao = COLECOES[i];
      var doArquivo = dados[colecao];
      if (!Array.isArray(doArquivo) || !doArquivo.length) continue;

      var atuais = await Dados.listar(colecao);
      var jaTem = {};
      atuais.forEach(function (r) { jaTem[String(r.id)] = true; });

      for (var k = 0; k < doArquivo.length; k++) {
        var registro = doArquivo[k];
        if (!registro || jaTem[String(registro.id)]) { pulados++; continue; }

        var r = await Dados.inserir(colecao, registro);
        if (r.ok) novos++; else pulados++;
      }
    }

    return { novos: novos, pulados: pulados };
  }

  function avisoBackup(estado, html) {
    var caixa = document.getElementById('resultado-backup');
    caixa.hidden = false;
    caixa.className = 'aviso-conexao aviso-conexao--' + estado;
    caixa.innerHTML = html;
  }

  async function aoEscolherArquivo(e) {
    var arquivo = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;

    var dados;
    try {
      dados = JSON.parse(await arquivo.text());
    } catch (err) {
      avisoBackup('erro', 'Esse arquivo não é uma cópia da Pharma Fit.');
      return;
    }

    var temAlgo = COLECOES.some(function (c) { return Array.isArray(dados[c]); });
    if (!temAlgo) {
      avisoBackup('erro', 'Esse arquivo não parece ser uma cópia da Pharma Fit — ' +
        'não achamos nenhum pedido ou produto dentro dele.');
      return;
    }

    var certeza = await U.confirmar({
      titulo: 'Restaurar esta cópia?',
      texto: 'O arquivo tem ' + resumoBackup(dados) + '. Vamos acrescentar só o que estiver ' +
             'faltando aqui — nada do que já existe é apagado.',
      confirmar: 'Restaurar'
    });
    if (!certeza) return;

    avisoBackup('neutro', 'Restaurando…');
    var r = await restaurar(dados);

    avisoBackup(r.novos ? 'ok' : 'neutro',
      r.novos
        ? '<b>' + r.novos + (r.novos === 1 ? ' registro recuperado.</b> ' : ' registros recuperados.</b> ') +
          (r.pulados ? r.pulados + ' já existiam por aqui e ficaram como estavam.' : '')
        : 'Nada para recuperar: tudo o que estava no arquivo já existe por aqui.');

    toast(r.novos ? r.novos + ' registros recuperados.' : 'Nada novo para recuperar.');
  }

  async function pintarBackup() {
    var quando = null;
    try { quando = localStorage.getItem(CHAVE_BACKUP); } catch (e) {}

    document.getElementById('backup-quando').textContent =
      quando ? 'última cópia em ' + U.data(quando) : 'nenhuma cópia baixada ainda';

    var pedidos = await Dados.listar('pedidos');

    document.getElementById('backup-aviso').innerHTML = Auth.configurado
      ? 'Seus dados estão no banco, que já é guardado pelo Supabase. Ainda assim, baixar ' +
        'uma cópia de vez em quando não custa nada.'
      : '<b>Você está sem banco de dados.</b> Tudo o que está no painel ' +
        (pedidos.length ? '— ' + pedidos.length + ' pedidos, entre outras coisas — ' : '') +
        'existe só neste navegador. Se limpar o histórico ou trocar de aparelho, some. ' +
        'Baixe uma cópia agora e ligue o banco assim que puder.';
  }

  /* ---------- montar o config.js ---------- */

  function textoConfig(dados) {
    function aspas(v) { return "'" + String(v).replace(/'/g, "\\'") + "'"; }

    return [
      '/* PHARMA FIT — configuração do site e da gestão.',
      '   Gerado pela tela de Ajustes do painel. */',
      '',
      'window.PHARMAFIT_CONFIG = {',
      '',
      '  SUPABASE_URL: ' + aspas(dados.url) + ',',
      '',
      '  /* Chave pública (anon). Nunca use a service_role aqui. */',
      '  SUPABASE_ANON_KEY: ' + aspas(dados.chave) + ',',
      '',
      '  /* WhatsApp que recebe as vendas, só números com DDI. */',
      '  WHATSAPP: ' + aspas(dados.zap) + ',',
      '',
      '  /* Chave pública VAPID, para os avisos no celular.',
      '     Gere o par com:  npx web-push generate-vapid-keys */',
      '  VAPID_PUBLIC_KEY: ' + aspas(cfg.VAPID_PUBLIC_KEY || '') + ',',
      '',
      '  /* Só este e-mail enxerga o painel pessoal. */',
      '  EMAIL_DONO: ' + aspas(dados.dono) + ',',
      '',
      '  MES_INICIAL: { ano: ' + (cfg.MES_INICIAL || {}).ano + ', mes: ' + (cfg.MES_INICIAL || {}).mes + ' },',
      '',
      '  PAGAMENTOS: ' + JSON.stringify(cfg.PAGAMENTOS || []).replace(/","/g, "', '")
                          .replace(/^\["/, "['").replace(/"\]$/, "']") + ',',
      '',
      '  DIAS_INATIVIDADE: ' + Number(cfg.DIAS_INATIVIDADE || 60) + ',',
      '',
      '  STORAGE_KEY: ' + aspas(cfg.STORAGE_KEY || 'pharmafit_gestao_auth') + ',',
      '',
      '  EMAILS_AUTORIZADOS: [],',
      '',
      '  /* Usado somente enquanto SUPABASE_URL estiver vazio. */',
      '  DEMO: {',
      /* segredo-ok: isto MONTA o texto do arquivo de configuração para o dono
         copiar; não guarda senha nenhuma. */
      '    email: ' + aspas((cfg.DEMO || {}).email || '') + ',',
      '    senha: ' + aspas((cfg.DEMO || {}).senha || '') + ',',
      '    nome: ' + aspas((cfg.DEMO || {}).nome || 'Equipe Pharma Fit'),
      '  }',
      '};',
      ''
    ].join('\n');
  }

  /* ---------- formulário ---------- */

  function aviso(estado, html) {
    var caixa = document.getElementById('resultado-conexao');
    caixa.hidden = false;
    caixa.className = 'aviso-conexao aviso-conexao--' + estado;
    caixa.innerHTML = html;
  }

  async function testar(e) {
    e.preventDefault();

    var url = document.getElementById('cfg-url').value.trim().replace(/\/+$/, '');
    var chave = document.getElementById('cfg-key').value.trim();
    var zap = U.digitos(document.getElementById('cfg-zap').value) || U.digitos(cfg.WHATSAPP);
    var dono = document.getElementById('cfg-dono').value.trim() || cfg.EMAIL_DONO;

    if (!/^https:\/\/[^\s]+$/.test(url)) {
      aviso('erro', 'A URL precisa começar com <b>https://</b> e ser o endereço do projeto ' +
        'no Supabase, algo como <b>https://abcdefgh.supabase.co</b>.');
      return;
    }
    if (!chave) { aviso('erro', 'Cole a chave pública (anon) do projeto.'); return; }

    if (chaveDeServico(chave)) {
      aviso('erro', '<b>Essa é a chave service_role.</b> Ela dá acesso total ao banco e ficaria ' +
        'visível para qualquer visitante do site. Volte no Supabase e copie a chave ' +
        '<b>anon</b> (ou <b>publishable</b>).');
      return;
    }
    if (zap.length < 12) {
      aviso('erro', 'O WhatsApp precisa do código do país na frente. Ex.: <b>5592991234567</b>.');
      return;
    }

    var botao = document.getElementById('testar');
    botao.disabled = true;
    aviso('neutro', 'Testando a conexão…');

    var r = await testarConexao(url, chave);
    botao.disabled = false;

    if (!r.ok) { aviso('erro', esc(r.erro)); return; }

    conexaoTestada = { url: url, chave: chave, zap: zap, dono: dono };

    aviso('ok', r.tabelaFaltando
      ? 'Conectou! Mas a tabela <b>produtos</b> ainda não existe — rode o <b>schema.sql</b> ' +
        'no SQL Editor do Supabase depois de salvar o arquivo abaixo.'
      : 'Conectou certinho. Agora é só copiar o arquivo abaixo e colar no lugar do config.js.');

    document.getElementById('config-texto').textContent = textoConfig(conexaoTestada);
    document.getElementById('bloco-arquivo').hidden = false;
    document.getElementById('bloco-arquivo').scrollIntoView({ behavior: 'smooth', block: 'start' });

    await pintarTabelas(url, chave);
  }

  function copiar() {
    var texto = document.getElementById('config-texto').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () {
        toast('Arquivo copiado. Agora cole no lugar do config.js.');
      }, function () { toast('Não foi possível copiar. Selecione o texto na tela.'); });
    } else {
      toast('Selecione o texto na tela para copiar.');
    }
  }

  /* ---------- início ---------- */

  (async function () {
    await Auth.pronto;

    var user = await Auth.exigirLogin('login.html');
    if (!user) return;

    document.getElementById('usuario').textContent = user.nome || user.email || 'Equipe';
    window.PharmaFitMenu.montar(user);

    document.getElementById('sair').addEventListener('click', async function () {
      await Auth.sair();
      location.replace('login.html');
    });

    /* já deixa preenchido o que existe hoje */
    document.getElementById('cfg-url').value = cfg.SUPABASE_URL || '';
    document.getElementById('cfg-zap').value = cfg.WHATSAPP || '';
    document.getElementById('cfg-dono').value =
      String(cfg.EMAIL_DONO || '') === 'gestao@pharmafit.com' ? '' : (cfg.EMAIL_DONO || '');

    document.getElementById('form-conexao').addEventListener('submit', testar);
    document.getElementById('copiar-config').addEventListener('click', copiar);
    document.getElementById('reconferir').addEventListener('click', pintarDiagnostico);
    document.getElementById('baixar-backup').addEventListener('click', baixarBackup);
    document.getElementById('arquivo-backup').addEventListener('change', aoEscolherArquivo);

    document.getElementById('conteudo').hidden = false;
    document.getElementById('carregando').hidden = true;

    await pintarDiagnostico();
    await pintarBackup();
  })();
})();
