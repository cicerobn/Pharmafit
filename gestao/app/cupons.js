/* =========================================================
   PHARMA FIT — tela "Cupons" do painel

   Brian, 24/09/2026: "cupons para fazer promoção / Cupom de % ou de
   valor".

   A equipe cria o cupom aqui, com o código, o tipo (porcentagem ou
   valor fixo), o valor e, se quiser, até quando ele vale. O cliente
   digita o código no carrinho do site; quem responde se vale é a
   função `pf_cupom` do banco, que só enxerga cupom LIGADO e dentro da
   validade. Desligar aqui tira o cupom do site na hora.

   ESTA TELA FALA COM O BANCO DIRETO, e não pelo `dados.js`: lá, quando
   o banco erra, a lista cai em silêncio para o que está guardado no
   aparelho. Para cupom isso seria mentir — a tela mostraria um cupom
   "criado" que o site não conhece. Aqui erro é erro, e aparece.
   ========================================================= */

(function () {
  'use strict';

  var Auth = window.PharmaFitAuth;
  var Moldura = window.PharmaFitMoldura;
  var U = window.PharmaFitUtil;

  var tipo = 'porcentagem';

  function achar(nome) { return document.querySelector('[data-' + nome + ']'); }

  function numero(texto) {
    var s = String(texto || '').trim().replace(/\s/g, '').replace(/^R\$/i, '');
    /* "1.250,50" e "1250.50" viram 1250.5; "10" vira 10 */
    if (s.indexOf(',') !== -1) s = s.replace(/\./g, '').replace(',', '.');
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  function hojeManaus() {
    /* A validade é contada no dia de Manaus, igual ao banco. */
    var agora = new Date(Date.now() - 4 * 3600 * 1000);
    return agora.toISOString().slice(0, 10);
  }

  function dataBonita(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function descricao(c) {
    return c.tipo === 'porcentagem'
      ? String(Number(c.valor)).replace('.', ',') + '% de desconto'
      : U.moeda(c.valor) + ' de desconto';
  }

  /** Em que pé o cupom está, do jeito que o site vai tratá-lo. */
  function situacao(c) {
    if (!c.ativo) return { texto: 'Desligado', classe: 'cancelado' };
    if (c.valido_ate && String(c.valido_ate).slice(0, 10) < hojeManaus()) {
      return { texto: 'Vencido', classe: 'pendente' };
    }
    return { texto: 'Valendo', classe: 'pago' };
  }

  function dizer(texto, bom) {
    var r = achar('cupom-recado');
    r.hidden = !texto;
    r.className = 'folha__recado folha__recado--' + (bom ? 'bom' : 'ruim');
    r.textContent = texto || '';
  }

  /* ---------- a lista ---------- */

  var cupons = [];

  async function carregar() {
    var sb = Auth.cliente();
    if (!sb) { cupons = []; return 'Sem conexão com o banco.'; }
    var r = await sb.from('pf_cupons').select('*').order('criado_em', { ascending: false });
    if (r.error) { cupons = []; return r.error.message; }
    cupons = r.data || [];
    return '';
  }

  function pintar(erro) {
    var lista = achar('cupons');
    var vazio = achar('cupons-vazio');

    if (erro) {
      lista.innerHTML = '';
      vazio.hidden = false;
      vazio.querySelector('.vazio__titulo').textContent = 'Não consegui ler os cupons';
      vazio.querySelector('.vazio__texto').textContent = erro;
      return;
    }

    vazio.hidden = cupons.length > 0;
    lista.innerHTML = cupons.map(function (c) {
      var s = situacao(c);
      var validade = c.valido_ate ? 'vale até ' + dataBonita(c.valido_ate) : 'sem data para acabar';
      return '<li class="item cupom-linha" data-id="' + U.esc(c.id) + '">' +
        '<span class="item__icone">' + Moldura.svg('etiqueta', 19, 1.6) + '</span>' +
        '<span class="item__corpo">' +
          '<span class="item__nome cupom-linha__codigo">' + U.esc(c.codigo) + '</span>' +
          '<span class="item__linha">' + U.esc(descricao(c)) + ' · ' + U.esc(validade) + '</span>' +
          '<span class="cupom-linha__acoes">' +
            '<button class="cupom-linha__botao" type="button" data-alternar>' +
              (c.ativo ? 'Desligar' : 'Ligar') + '</button>' +
            '<button class="cupom-linha__botao cupom-linha__botao--perigo" type="button" data-excluir>' +
              'Excluir</button>' +
          '</span>' +
        '</span>' +
        '<span class="marca marca--' + s.classe + '">' + s.texto + '</span>' +
      '</li>';
    }).join('');
  }

  async function recarregar() { pintar(await carregar()); }

  /* ---------- criar ---------- */

  function escolherTipo(novo) {
    tipo = novo;
    document.querySelectorAll('[data-cupom-tipo]').forEach(function (b) {
      var sim = b.getAttribute('data-cupom-tipo') === novo;
      b.classList.toggle('is-ativo', sim);
      b.setAttribute('aria-checked', String(sim));
    });
    achar('cupom-valor-rotulo').textContent = novo === 'porcentagem' ? 'Desconto (%)' : 'Desconto (R$)';
    achar('cupom-valor').placeholder = novo === 'porcentagem' ? '10' : '50,00';
  }

  async function criar(e) {
    e.preventDefault();
    var codigo = achar('cupom-codigo').value.trim().toUpperCase().replace(/\s+/g, '');
    var valor = numero(achar('cupom-valor').value);
    var ate = achar('cupom-ate').value || null;

    if (!/^[A-Z0-9_-]{3,24}$/.test(codigo)) {
      achar('cupom-codigo').focus();
      return dizer('O código precisa ter de 3 a 24 letras ou números, sem espaço nem acento.', false);
    }
    if (!(valor > 0)) {
      achar('cupom-valor').focus();
      return dizer('Escreva quanto o cupom desconta — um número maior que zero.', false);
    }
    if (tipo === 'porcentagem' && valor > 100) {
      achar('cupom-valor').focus();
      return dizer('Porcentagem vai até 100%.', false);
    }
    if (ate && ate < hojeManaus()) {
      achar('cupom-ate').focus();
      return dizer('A data já passou: o cupom nasceria vencido.', false);
    }

    var botao = achar('cupom-criar');
    botao.disabled = true;
    botao.textContent = 'Criando…';
    try {
      var sb = Auth.cliente();
      if (!sb) throw new Error('sem conexão com o banco');
      var r = await sb.from('pf_cupons').insert({
        codigo: codigo, tipo: tipo, valor: Math.round(valor * 100) / 100, valido_ate: ate
      });
      if (r.error) {
        /* 23505 = código repetido: o índice único do banco recusou */
        throw new Error(r.error.code === '23505'
          ? 'já existe um cupom ' + codigo + '. Use outro código, ou ligue o que já existe'
          : r.error.message);
      }
      achar('cupom-codigo').value = '';
      achar('cupom-valor').value = '';
      achar('cupom-ate').value = '';
      dizer('Cupom ' + codigo + ' criado: ' + descricao({ tipo: tipo, valor: valor }) +
            '. Ele já vale no carrinho do site.', true);
      await recarregar();
    } catch (err) {
      dizer('Não criei o cupom: ' + (err && err.message ? err.message : 'erro desconhecido') + '.', false);
    } finally {
      botao.disabled = false;
      botao.textContent = 'Criar cupom';
    }
  }

  /* ---------- ligar, desligar, excluir ---------- */

  async function agirNaLista(e) {
    var botao = e.target.closest('button');
    if (!botao) return;
    var linha = botao.closest('[data-id]');
    var c = cupons.filter(function (x) { return String(x.id) === linha.getAttribute('data-id'); })[0];
    if (!c) return;
    var sb = Auth.cliente();
    if (!sb) return;

    botao.disabled = true;
    var r;
    if (botao.hasAttribute('data-alternar')) {
      r = await sb.from('pf_cupons').update({ ativo: !c.ativo }).eq('id', c.id);
      if (!r.error) {
        dizer(c.ativo
          ? 'Cupom ' + c.codigo + ' desligado. O site já não aceita esse código.'
          : 'Cupom ' + c.codigo + ' ligado de novo.', true);
      }
    } else if (botao.hasAttribute('data-excluir')) {
      /* Excluir não tem volta, e os pedidos antigos continuam com o
         código escrito — por isso a pergunta antes. */
      if (!window.confirm('Excluir o cupom ' + c.codigo + '? Os pedidos que já usaram ' +
                          'continuam com o código registrado.')) {
        botao.disabled = false;
        return;
      }
      r = await sb.from('pf_cupons').delete().eq('id', c.id);
      if (!r.error) dizer('Cupom ' + c.codigo + ' excluído.', true);
    }
    if (r && r.error) dizer('Não consegui: ' + r.error.message + '.', false);
    await recarregar();
  }

  /* ---------- montar ---------- */

  (async function () {
    var user = await Auth.exigirLogin('../login.html');
    if (!user) return;

    await Moldura.montar({ aba: 'mais' });
    Moldura.aoNovo(function () { location.href = '../index.html#novo'; });
    achar('volta').innerHTML = Moldura.svg('volta', 20, 1.9);

    document.querySelectorAll('[data-cupom-tipo]').forEach(function (b) {
      b.addEventListener('click', function () { escolherTipo(b.getAttribute('data-cupom-tipo')); });
    });
    achar('cupom-form').addEventListener('submit', criar);
    achar('cupons').addEventListener('click', agirNaLista);

    await recarregar();
    Moldura.animarEntrada('.bloco');
  })();
})();
