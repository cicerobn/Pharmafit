/* Máscaras e conferências dos campos do checkout.
 *
 * As máscaras nascem dos dígitos e não ficam presas no texto. Por isso apagar
 * funciona: "01/" volta a ser "01", e não um "01/" que não sai mais — que é o
 * jeito clássico de uma máscara virar armadilha. Um cliente já desistiu de uma
 * compra por causa disso: teve que copiar e colar a data de outro lugar. */

function digitos(texto) {
  return String(texto || '').replace(/\D/g, '');
}

/* ---------- CPF ---------- */

/** "12345678909" -> "123.456.789-09", montando enquanto a pessoa digita. */
export function formatarCpf(texto) {
  const n = digitos(texto).slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

/** Confere os dois dígitos verificadores. Pega erro de digitação de verdade. */
export function cpfValido(texto) {
  const n = digitos(texto);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  const conta = (ate) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(n[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return conta(9) === Number(n[9]) && conta(10) === Number(n[10]);
}

/* ---------- CEP ---------- */

/** "01001000" -> "01001-000" */
export function formatarCep(texto) {
  const n = digitos(texto).slice(0, 8);
  return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
}

export function cepValido(texto) {
  return digitos(texto).length === 8;
}

/* ---------- data de nascimento ---------- */

/**
 * Monta a data digitando: 01021990 vira 01/02/1990.
 *
 * A data que o navegador preenche sozinho chega em 1990-02-01, e essa passa
 * inteira: contar os dígitos dela daria 19/90/0201.
 */
export function formatarNascimento(texto) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto || '').trim());
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const n = digitos(texto).slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

/**
 * Aceita 01/02/1990 ou 1990-02-01 e devolve no formato do banco, ou null se a
 * data não existe (31/02) ou está no futuro.
 */
export function nascimentoParaBanco(texto) {
  const limpo = String(texto || '').trim();
  const br = /^(\d{2})[/\-.](\d{2})[/\-.](\d{4})$/.exec(limpo);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpo);
  if (!br && !iso) return null;

  const [ano, mes, dia] = br
    ? [Number(br[3]), Number(br[2]), Number(br[1])]
    : [Number(iso[1]), Number(iso[2]), Number(iso[3])];

  const data = new Date(Date.UTC(ano, mes - 1, dia));
  // O Date acomoda 31/02 virando 03/03: comparar de volta é o que pega isso.
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    return null;
  }
  if (data.getTime() > Date.now()) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** "1990-02-01" -> "01/02/1990" */
export function nascimentoParaTela(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = String(iso).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

/* ---------- telefone e e-mail ---------- */

/** "92991234567" -> "(92) 99123-4567" */
export function formatarTelefone(texto) {
  const n = digitos(texto).slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

/** DDD de 11 a 99, e celular de 11 dígitos tem que começar com 9. */
export function telefoneValido(texto) {
  const n = digitos(texto);
  if (n.length < 10 || n.length > 11) return false;
  if (Number(n.slice(0, 2)) < 11) return false;
  if (n.length === 11 && n[2] !== '9') return false;
  return true;
}

/** Checagem simples: pega erro de digitação sem recusar endereço esquisito
 *  que é válido. Quem decide de verdade é o servidor. */
export function emailValido(texto) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(texto || '').trim());
}

export { digitos };
