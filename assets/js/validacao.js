/* =========================================================
   PHARMA FIT — validação e máscara dos formulários

   Telefone com máscara enquanto digita, checagem de e-mail e
   mensagem embaixo do campo que errou (em vez de só um aviso
   solto no rodapé da tela).
   ========================================================= */
(function () {
  'use strict';

  var Validacao = {

    /** "92991234567" -> "(92) 99123-4567" */
    mascaraTelefone: function (valor) {
      var d = String(valor || '').replace(/\D/g, '').slice(0, 11);
      if (d.length <= 2) return d;
      if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
      return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    },

    /** Telefone brasileiro: DDD + 8 ou 9 dígitos. */
    telefoneValido: function (valor) {
      var d = String(valor || '').replace(/\D/g, '');
      if (d.length < 10 || d.length > 11) return false;
      if (Number(d.slice(0, 2)) < 11) return false;           /* DDD não existe */
      if (d.length === 11 && d[2] !== '9') return false;       /* celular começa com 9 */
      return true;
    },

    emailValido: function (valor) {
      var v = String(valor || '').trim();
      return v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    },

    /** Mostra a mensagem embaixo do campo. */
    erro: function (campo, mensagem) {
      Validacao.limpar(campo);
      if (!campo) return;

      var caixa = campo.closest('.field') || campo.parentElement;
      caixa.classList.add('field--erro');

      var aviso = document.createElement('p');
      aviso.className = 'field__erro';
      aviso.textContent = mensagem;
      caixa.appendChild(aviso);

      campo.setAttribute('aria-invalid', 'true');
      campo.focus();
    },

    limpar: function (campo) {
      if (!campo) return;
      var caixa = campo.closest('.field') || campo.parentElement;
      caixa.classList.remove('field--erro');
      var aviso = caixa.querySelector('.field__erro');
      if (aviso) aviso.remove();
      campo.removeAttribute('aria-invalid');
    },

    limparTudo: function (form) {
      if (!form) return;
      form.querySelectorAll('.field--erro').forEach(function (c) { c.classList.remove('field--erro'); });
      form.querySelectorAll('.field__erro').forEach(function (a) { a.remove(); });
    },

    /**
     * Confere os campos de um formulário. Regras aceitas:
     * obrigatorio, telefone, email, numero.
     * Retorna true quando está tudo certo.
     */
    conferir: function (form) {
      Validacao.limparTudo(form);

      var campos = form.querySelectorAll('[data-valida]');
      for (var i = 0; i < campos.length; i++) {
        var campo = campos[i];
        var regras = campo.getAttribute('data-valida').split(' ');
        var valor = String(campo.value || '').trim();
        var rotulo = campo.getAttribute('data-rotulo') || 'este campo';

        if (regras.indexOf('obrigatorio') !== -1 && !valor) {
          Validacao.erro(campo, 'Preencha ' + rotulo + '.');
          return false;
        }
        if (valor && regras.indexOf('telefone') !== -1 && !Validacao.telefoneValido(valor)) {
          Validacao.erro(campo, 'Confira o número: precisa de DDD + 8 ou 9 dígitos.');
          return false;
        }
        if (valor && regras.indexOf('email') !== -1 && !Validacao.emailValido(valor)) {
          Validacao.erro(campo, 'Confira o e-mail — parece incompleto.');
          return false;
        }
        if (regras.indexOf('numero') !== -1 && valor && !(Number(valor) > 0)) {
          Validacao.erro(campo, 'Informe um número maior que zero.');
          return false;
        }
      }
      return true;
    },

    /** Liga a máscara e a limpeza do erro ao digitar. */
    ligar: function (raiz) {
      raiz = raiz || document;

      raiz.querySelectorAll('input[type=tel]').forEach(function (campo) {
        if (campo._mascarado) return;
        campo._mascarado = true;
        campo.setAttribute('inputmode', 'tel');
        campo.addEventListener('input', function () {
          var posicaoFinal = campo.selectionStart === campo.value.length;
          campo.value = Validacao.mascaraTelefone(campo.value);
          if (posicaoFinal) campo.setSelectionRange(campo.value.length, campo.value.length);
          Validacao.limpar(campo);
        });
      });

      raiz.querySelectorAll('[data-valida]').forEach(function (campo) {
        if (campo._limpaErro) return;
        campo._limpaErro = true;
        campo.addEventListener('input', function () { Validacao.limpar(campo); });
      });
    }
  };

  window.PharmaFitValidacao = Validacao;

  document.addEventListener('DOMContentLoaded', function () { Validacao.ligar(); });
})();
