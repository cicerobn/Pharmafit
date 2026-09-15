/* Ícones desenhados na mão, sem biblioteca: são poucos e o site carrega
 * rápido. As chaves de categoria são as mesmas que o painel vai oferecer. */

export function IconeCategoria({ chave, tamanho = 17 }) {
  const comum = {
    width: tamanho, height: tamanho, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round',
    strokeLinejoin: 'round', 'aria-hidden': true
  };

  switch (chave) {
    case 'ampola':
      return (
        <svg {...comum}>
          <path d="M9 2.8h6M10 2.8v4.4L8.2 10a4 4 0 0 0-.5 1.9v7.3a2 2 0 0 0 2 2h4.6a2 2 0 0 0 2-2v-7.3a4 4 0 0 0-.5-1.9L14 7.2V2.8" />
          <path d="M7.7 14.4h8.6" />
        </svg>
      );
    case 'seringa':
      return (
        <svg {...comum}>
          <path d="m14.8 3.6 5.6 5.6M18 4.4l1.6 1.6M12.4 6 18 11.6M4 20l3.2-.6 9.6-9.6-2.6-2.6L4.6 16.8z" />
          <path d="M9 11.4l2.6 2.6" />
        </svg>
      );
    case 'gota':
      return (
        <svg {...comum}>
          <path d="M12 2.8s5.6 6 5.6 9.9a5.6 5.6 0 1 1-11.2 0C6.4 8.8 12 2.8 12 2.8z" />
          <path d="M9.6 13.4a2.4 2.4 0 0 0 2.4 2.4" />
        </svg>
      );
    case 'frasco':
      return (
        <svg {...comum}>
          <path d="M8.4 2.8h7.2M9.6 2.8v3.4l-2 2.2a3 3 0 0 0-.8 2v9a1.8 1.8 0 0 0 1.8 1.8h6.8a1.8 1.8 0 0 0 1.8-1.8v-9a3 3 0 0 0-.8-2l-2-2.2V2.8" />
          <path d="M6.8 12.6h10.4" />
        </svg>
      );
    case 'capsula':
      return (
        <svg {...comum}>
          <rect x="3" y="8.4" width="18" height="7.2" rx="3.6" />
          <path d="M12 8.4v7.2" />
        </svg>
      );
    case 'halter':
      return (
        <svg {...comum}>
          <path d="M6.4 8v8M3.6 9.6v4.8M17.6 8v8M20.4 9.6v4.8M6.4 12h11.2" />
        </svg>
      );
    default:
      return (
        <svg {...comum}>
          <path d="m12 3.2 8 4.2v9.2l-8 4.2-8-4.2V7.4z" />
          <path d="m4 7.4 8 4.2 8-4.2" />
        </svg>
      );
  }
}

export function IconeBusca() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.4" />
      <path d="m15.8 15.8 4.4 4.4" />
    </svg>
  );
}

export function IconeSacola() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.6 7.6h12.8l-1 12.2a1.8 1.8 0 0 1-1.8 1.6H8.4a1.8 1.8 0 0 1-1.8-1.6z" />
      <path d="M9 7.6V6a3 3 0 0 1 6 0v1.6" />
    </svg>
  );
}

export function IconeFechar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function IconeCerto({ tamanho = 26 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

/** Marca d'água de produto sem foto. Melhor que imagem quebrada. */
export function IconeSemFoto({ tamanho = 34 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.2" y="4.6" width="17.6" height="14.8" rx="2.4" />
      <circle cx="8.6" cy="9.8" r="1.6" />
      <path d="m3.2 16.4 4.6-4.2 3.6 3.2 3.4-3 6 5.4" />
    </svg>
  );
}
