/* Quem decide se você está na loja ou no painel.
 *
 * O painel mora no mesmo site, no endereço #/painel. O endereço é com # de
 * propósito: o site é estático e a hospedagem não precisa saber de nada — não
 * existe configuração de servidor para esquecer e nenhum caminho que dá 404 ao
 * recarregar a página.
 *
 * O código do painel é carregado só quando alguém vai até ele. Quem entra para
 * comprar não baixa o painel junto. */

import { lazy, Suspense, useEffect, useState } from 'react';
import App from './App.jsx';

const Painel = lazy(() => import('./painel/Painel.jsx'));

function ondeEstou() {
  const hash = window.location.hash || '';
  if (hash.indexOf('#/painel') === 0) return 'painel';
  /* O link de "nova senha" do Supabase volta com ?painel=1 e cola o próprio
     pedaço depois do #. Por isso a porta do painel também atende pela busca. */
  if (/[?&]painel=1/.test(window.location.search || '')) return 'painel';
  return 'loja';
}

export default function Site() {
  const [onde, setOnde] = useState(ondeEstou);

  useEffect(() => {
    const mudou = () => setOnde(ondeEstou());
    window.addEventListener('hashchange', mudou);
    return () => window.removeEventListener('hashchange', mudou);
  }, []);

  /* O index.html deixa na tela um aviso enquanto o programa não acorda, e esse
   * aviso vira um diagnóstico se ele não acordar nunca. Aqui é o único lugar
   * que sabe, com certeza, que ele acordou: efeito de montagem roda depois de o
   * navegador já ter a tela desenhada.
   *
   * Tentei antes apagar o aviso logo depois do render, no quadro seguinte —
   * mas o React 18 desenha quando ele quer, e naquele instante a tela ainda
   * estava vazia. O resultado era o aviso de "não abriu" ficando embaixo da
   * loja funcionando.
   *
   * Se o programa quebrar antes de montar, este efeito não roda e o aviso fica
   * na tela. É exatamente o que se quer. */
  useEffect(() => {
    const aviso = document.getElementById('partida');
    if (aviso) aviso.remove();
  }, []);

  function irParaLoja() {
    /* Limpa tanto o # quanto o ?painel=1, senão a loja abre e o painel volta
       no próximo recarregamento. */
    const limpo = window.location.origin + window.location.pathname;
    window.history.replaceState(null, '', limpo);
    setOnde('loja');
  }

  if (onde === 'painel') {
    return (
      <Suspense fallback={<p className="pn-carregando">Abrindo o painel…</p>}>
        <Painel aoVoltarParaLoja={irParaLoja} />
      </Suspense>
    );
  }

  return <App />;
}
