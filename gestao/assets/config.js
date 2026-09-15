/* =========================================================
   PHARMA FIT — configuração (site + área de gestão)
   -----------------------------------------------------
   Preencha os campos abaixo com os dados do seu projeto
   Supabase (Project Settings → API). Enquanto estiverem
   vazios, tudo funciona em MODO DEMONSTRAÇÃO — útil para
   testar o fluxo, mas os dados ficam só neste navegador.
   ========================================================= */

window.PHARMAFIT_CONFIG = {

  /* URL do projeto, ex.: "https://xxxxxxxx.supabase.co" */
  SUPABASE_URL: '',

  /* Chave pública (anon / publishable). Nunca use a service_role aqui. */
  SUPABASE_ANON_KEY: '',

  /* WhatsApp que recebe as vendas, só números com DDI.
     Ex.: '5592991234567' (Manaus). */
  WHATSAPP: '5545988140817',

  /* Chave pública VAPID, para as notificações no celular.
     Gere o par com:  npx web-push generate-vapid-keys
     A chave privada fica na Edge Function, nunca aqui. */
  VAPID_PUBLIC_KEY: '',

  /* E-mail do dono. Só ele enxerga o painel pessoal (gestao/pessoal.html). */
  EMAIL_DONO: 'gestao@pharmafit.com',

  /* Primeiro mês que aparece nos relatórios (ano, mês — 8 = agosto) */
  MES_INICIAL: { ano: 2026, mes: 8 },

  /* Meios de pagamento aceitos (aparecem ao confirmar a venda) */
  PAGAMENTOS: ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência', 'Boleto'],

  /* Cliente é considerado inativo depois de tantos dias sem comprar */
  DIAS_INATIVIDADE: 60,

  /* Onde a sessão fica guardada no navegador */
  STORAGE_KEY: 'pharmafit_gestao_auth',

  /* Opcional: restringe o painel a e-mails específicos.
     Deixe a lista vazia para permitir qualquer usuário criado no Supabase.
     Atenção: isto é apenas uma checagem de interface — a proteção real
     dos dados deve ser feita com RLS (Row Level Security) no Supabase. */
  EMAILS_AUTORIZADOS: [],

  /* Credenciais usadas SOMENTE no modo demonstração, ou seja, enquanto
     SUPABASE_URL estiver vazio. Elas aparecem de propósito na tela de login
     nesse modo, e no modo demonstração os dados ficam só no navegador de quem
     abre — não existe dado seu para alguém alcançar por aqui.

     Assim que SUPABASE_URL for preenchido, quem confere a senha é o Supabase e
     estas credenciais param de valer (veja o `if (!sb)` em gestao/assets/auth.js).

     segredo-ok: senha de demonstração, mostrada na própria tela de login e
     sem valor nenhum depois que o Supabase for configurado. */
  DEMO: {
    email: 'gestao@pharmafit.com',
    senha: 'pharmafit2026',
    nome: 'Equipe Pharma Fit'
  }
};
