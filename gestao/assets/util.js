/* =========================================================
   PHARMA FIT — utilidades do painel

   Formatação, avisos e confirmação. Antes cada tela tinha a
   sua cópia dessas funções; agora ficam num lugar só.
   ========================================================= */
(function () {
  'use strict';

  var Util = {

    /** 999 -> "R$ 999,00" */
    moeda: function (v) {
      return Number(v || 0).toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL', minimumFractionDigits: 2
      });
    },

    /** ISO -> "12/08/26" */
    data: function (v) {
      if (!v) return '—';
      var d = new Date(v);
      return isNaN(d) ? String(v)
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    },

    /** ISO -> "09:30" */
    hora: function (v) {
      var d = new Date(v);
      return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    },

    /** Escapa texto que vai para dentro do HTML. */
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },

    /** Texto sem acento e minúsculo, para comparar em buscas. */
    normalizar: function (s) {
      return String(s == null ? '' : s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
    },

    /** Só os dígitos de um texto. */
    digitos: function (s) {
      return String(s || '').replace(/\D/g, '');
    },

    /**
     * Número pronto para o link do WhatsApp.
     * O cliente digita "(92) 99610-7788", mas o wa.me só funciona
     * com o código do país junto: 5592996107788.
     * Devolve '' quando o número não dá para aproveitar.
     */
    whatsapp: function (telefone) {
      var n = Util.digitos(telefone);

      /* já veio com o 55 na frente (DDI + DDD + 8 ou 9 dígitos) */
      if (n.length >= 12 && n.length <= 13 && n.indexOf('55') === 0) return n;

      /* número brasileiro sem DDI: DDD + 8 ou 9 dígitos */
      if (n.length === 10 || n.length === 11) return '55' + n;

      /* número internacional já completo */
      if (n.length > 13) return n;

      return '';
    },

    /** Link completo do WhatsApp, com a mensagem já escrita. */
    linkZap: function (telefone, texto) {
      var numero = Util.whatsapp(telefone);
      if (!numero) return '';
      return 'https://wa.me/' + numero + (texto ? '?text=' + encodeURIComponent(texto) : '');
    },

    /** Espera o usuário parar de digitar antes de filtrar. */
    debounce: function (fn, ms) {
      var t;
      return function () {
        var args = arguments, esse = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(esse, args); }, ms || 220);
      };
    },

    /** Aviso rápido no rodapé da tela. */
    toast: function (msg) {
      var el = document.getElementById('toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        el.className = 'toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.classList.add('is-visible');
      clearTimeout(el._t);
      el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 3400);
    },

    /**
     * Confirmação com a cara do painel, no lugar do confirm() do
     * navegador. Retorna uma Promise que resolve true/false.
     */
    confirmar: function (opcoes) {
      opcoes = typeof opcoes === 'string' ? { texto: opcoes } : (opcoes || {});

      return new Promise(function (resolve) {
        var fundo = document.createElement('div');
        fundo.className = 'modal is-open confirmacao';
        fundo.innerHTML =
          '<div class="modal__scrim" data-cancelar></div>' +
          '<div class="modal__card modal__card--pequeno" role="alertdialog" aria-modal="true">' +
            '<h2 class="modal__title">' + Util.esc(opcoes.titulo || 'Tem certeza?') + '</h2>' +
            '<p class="modal__lead">' + Util.esc(opcoes.texto || '') + '</p>' +
            '<div class="modal__acoes">' +
              '<button class="btn btn--outline" type="button" data-cancelar>' +
                Util.esc(opcoes.cancelar || 'Cancelar') + '</button>' +
              '<button class="btn ' + (opcoes.perigo ? 'btn--perigo' : 'btn--primary') +
                ' btn--block" type="button" data-confirmar>' +
                Util.esc(opcoes.confirmar || 'Confirmar') + '</button>' +
            '</div>' +
          '</div>';

        document.body.appendChild(fundo);

        function fechar(valor) {
          document.removeEventListener('keydown', aoTeclar);
          fundo.remove();
          resolve(valor);
        }
        function aoTeclar(e) {
          if (e.key === 'Escape') fechar(false);
          if (e.key === 'Enter') fechar(true);
        }

        fundo.addEventListener('click', function (e) {
          if (e.target.closest('[data-cancelar]')) fechar(false);
          if (e.target.closest('[data-confirmar]')) fechar(true);
        });
        document.addEventListener('keydown', aoTeclar);

        setTimeout(function () { fundo.querySelector('[data-confirmar]').focus(); }, 40);
      });
    },

    /**
     * Baixa uma planilha (CSV) com o que está na tela.
     * colunas: [{ titulo, campo }] · linhas: array de objetos
     */
    baixarCSV: function (nomeArquivo, colunas, linhas) {
      function celula(v) {
        var texto = String(v == null ? '' : v).replace(/"/g, '""');
        return '"' + texto + '"';
      }

      var conteudo = [colunas.map(function (c) { return celula(c.titulo); }).join(';')]
        .concat(linhas.map(function (l) {
          return colunas.map(function (c) {
            var valor = typeof c.campo === 'function' ? c.campo(l) : l[c.campo];
            if (typeof valor === 'number') return celula(String(valor).replace('.', ','));
            return celula(valor);
          }).join(';');
        })).join('\r\n');

      /* BOM para o Excel abrir os acentos certos */
      var blob = new Blob(['\ufeff' + conteudo], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },

    /** Troca o conteúdo por um esqueleto enquanto carrega. */
    esqueleto: function (alvo, linhas) {
      var el = typeof alvo === 'string' ? document.getElementById(alvo) : alvo;
      if (!el) return;
      var html = '';
      for (var i = 0; i < (linhas || 3); i++) html += '<div class="skeleton__linha"></div>';
      el.innerHTML = '<div class="skeleton">' + html + '</div>';
    }
  };

  window.PharmaFitUtil = Util;
})();
