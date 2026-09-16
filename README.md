# Pharma Fit — site

Réplica das duas telas enviadas (Início e Produtos), em HTML/CSS/JS puro, sem build e sem dependências.

> **As pastas `loja-fonte/` e `loja/` são de outro projeto**, uma loja que ainda
> não está pronta para vender e que pegou carona nesta publicação por ser a que
> já funciona. Ela aparece em `/loja/`, e está fora do `robots.txt`.
>
> `loja-fonte/` é a fonte (React) e `loja/` é a montagem dela — este repositório
> é publicado como está, sem passo de montagem, então a montagem fica pronta
> aqui dentro. O servidor não serve `loja-fonte/`.
>
> **As duas têm de andar juntas.** Depois de mexer na fonte:
> `cd loja-fonte && npm run build && cp -r dist/. ../loja/`. A conferência
> automática monta a fonte do zero e compara arquivo por arquivo com `loja/` —
> se alguém esquecer de montar, ela falha e diz o que ficou diferente.

## Arquivos

```
(raiz do site — é o que a Hostinger publica)
├── index.html          # tela 1 — Início (hero, diferenciais, protocolos, nav inferior)
├── produtos.html       # tela 2 — Produtos (categorias, "Mais vendidos", grade, barra de confiança)
├── assets/
│   ├── css/styles.css  # design system completo (cores, tipografia, componentes)
│   ├── js/app.js       # menu lateral, carrossel, filtro de categorias, busca
│   ├── js/pedido.js    # formulário de pedido + saída para o WhatsApp
│   ├── js/catalogo.js  # 💰 produtos, custos, preços e promoções — edite aqui
│   ├── js/loja.js      # monta a grade e o carrossel a partir do catálogo
│   └── img/*.svg       # ilustrações vetoriais dos produtos e do hero
└── gestao/             # área restrita da equipe
    ├── login.html      # tela de login
    ├── index.html      # painel (fila de confirmação, indicadores, produtos)
    ├── sw.js           # service worker das notificações
    ├── manifest.webmanifest
    ├── assets/
    │   ├── config.js       # ⚙️ Supabase, WhatsApp e chave VAPID — edite aqui
    │   ├── auth.js         # login, logout, sessão e proteção de página
    │   ├── dados.js        # pedidos e produtos (Supabase ou modo demonstração)
    │   ├── notificacoes.js # permissão, som e push no celular
    │   ├── painel.js       # fila, indicadores e tabelas
    │   └── gestao.css      # estilos do login e do painel
    └── supabase/
        ├── schema.sql                          # tabelas, permissões e tempo real
        └── functions/notificar-pedido/index.ts # envia o push de novo pedido

medgroup/index.html     # painel MedGroup anterior, movido para cá
.htaccess               # HTTPS, cache e bloqueio dos arquivos de projeto
```

## Como abrir

Basta abrir `index.html` no navegador.

## Publicar na Hostinger (implantação por Git)

> **Quem publica é ESTE repositório.** A Hostinger acompanha
> `cicerobn/Pharmafit`, branch `main` — está medido: a conferência automática
> compara o site no ar com o md5 dos arquivos deste commit, e bate.
>
> Esta seção dizia para apontar a Hostinger para `cicerobn/medgroup`, branch
> `claude/site-clone-31skzi`. Isso está errado e mandaria alguém para o lugar
> errado: aquele repositório é uma CÓPIA de leitura (guarda o SQL da gestão, a
> loja nova e os documentos) e editar lá não muda nada no ar.

No **hPanel → Avançado → GIT**:

1. **Criar novo repositório**
   - Repositório: `https://github.com/cicerobn/Pharmafit`
   - Branch: `main`
   - Diretório: deixe **em branco** (é a raiz do `public_html`)
2. Clique em **Criar**. Se o repositório for privado, a Hostinger mostra uma
   *Deploy key* — copie e cole em GitHub → Settings → Deploy keys do repositório.
3. Sempre que houver mudança, volte nessa tela e clique em **Deploy** (ou configure
   o webhook para atualizar sozinho).

Depois disso:

- `seudominio.com` → o site
- `seudominio.com/gestao/login.html` → o painel da equipe
- `seudominio.com/medgroup/` → o painel MedGroup anterior

O `.htaccess` na raiz já força HTTPS (necessário para as notificações), bloqueia os
arquivos de projeto (`.sql`, `.md`) e configura cache.

### Se depois de publicar o site parecer "meio errado"

A Hostinger tem um **CDN na frente** (`server: hcdn`, `cache-control: max-age=86400`),
e a publicação **não é atômica**: o HTML pode chegar ao servidor antes do CSS.

Quem pedir um arquivo nesses poucos segundos recebe a versão velha — e o CDN guarda
essa resposta velha, **no endereço novo, por 24 horas**. Depois disso, nem o arquivo
certo já estando lá resolve: aquele endereço ficou envenenado até expirar.

Foi medido em 15/09/2026, no `gestao.css`:

| endereço pedido | tamanho | o que era |
|---|---|---|
| sem marca de versão | 35 228 bytes | versão velha (cache HIT, 6h) |
| com marca `?v=…` | 38 624 bytes | versão velha (cache HIT, 5h) |
| com `?nocache=…` | 39 091 bytes | **a versão certa, igual ao repositório** |

O que fazia isso acontecer quase sempre era a própria conferência automática: ela
disparava uns 2000 pedidos aos endereços com marca segundos depois do push, dentro
da janela. Isso foi consertado — ela agora pergunta furando o cache, e só olha o
endereço do visitante **uma vez**, depois de o arquivo já ter chegado.

Sobrou uma janela pequena, de poucos segundos por publicação, em que um visitante
pode cair nisso sozinho. **Se acontecer:** não é preciso republicar; o endereço
se corrige sozinho em até 24h. Para resolver na hora, limpe o cache do CDN no
hPanel da Hostinger.

Fechar essa janela de vez significa mexer no cache do site no ar, e isso é decisão
do Brian — não foi feito.

## Design

- Paleta: dourado `#b08c4a`, creme `#f6f2ec`, preto `#101010` — definida em variáveis CSS no topo de `styles.css`.
- Tipografia: **Playfair Display** (títulos) + **Inter** (texto), via Google Fonts, com fallback local.
- Layout mobile-first, idêntico às telas enviadas; a partir de 900px a página se expande
  para desktop (hero em duas colunas, grade de produtos em quatro colunas).

## O que ainda precisa dos seus dados reais

1. **Fotos dos produtos** — as imagens são ilustrações vetoriais feitas para ficarem iguais às
   das telas. Substitua os arquivos em `assets/img/` pelas fotos reais (mesmos nomes, ou ajuste
   o `src` no HTML).
2. **Logo oficial** — `assets/img/logo-pf.svg` é uma reconstrução do monograma PF.
3. **Estoque** — todos os produtos estão com 0 unidades; ajuste em `catalogo.js`
   (ou direto na tabela `produtos` do Supabase).
4. **WhatsApp** — já configurado como `559285904669` (+55 92 8590-4669) em
   `gestao/assets/config.js`. Para trocar, é só editar essa linha.
5. **Fotos e textos institucionais** — as perguntas frequentes de `atendimento.html` estão
   com respostas genéricas; ajuste para a realidade do seu atendimento (prazos, formas de
   pagamento, política de troca).

## Catálogo e preços

Tudo vem de um arquivo só: **`assets/js/catalogo.js`**. Ele alimenta a grade da loja,
o carrossel da home, o formulário de pedido e a tabela do painel — mude o preço ali e
muda em todo lugar.

Cada produto tem:

| Campo    | Para quê                                                              |
|----------|-----------------------------------------------------------------------|
| `custo`  | quanto custa para vocês — **só aparece no painel**, nunca no site      |
| `venda`  | preço para o cliente                                                  |
| `antes`  | preço "de" riscado; `0` = sem promoção                                |

Os produtos de **R$ 999,00** estão marcados como promoção: o site mostra
~~R$ 1.300,00~~ riscado, o selo **-23%** e o preço atual. Embaixo de todo preço aparece
**"ou em até 3x sem juros de R$ 333,00"**, calculado automaticamente (`venda ÷ 3`).

No painel, a tabela de produtos mostra **Custo → Venda → Margem** lado a lado.

> O custo do **Tirzedral 15 mg** não veio na sua lista — está como `0` e aparece
> como "—" no painel. Me passe o valor que eu preencho.

## O que o site tem

| Página                | Para quê                                                          |
|-----------------------|-------------------------------------------------------------------|
| `index.html`          | home com hero, protocolos e atalhos                               |
| `produtos.html`       | catálogo com filtros, promoções e favoritos                       |
| `quiz.html`           | 3 perguntas que indicam o produto ou o setor certo                |
| `favoritos.html`      | o que a pessoa salvou — sem conta, fica no aparelho dela          |
| `representantes.html` | cadastro de revendedores, clínicas e parceiros                    |
| `atacado.html`        | orçamento para pedidos grandes                                    |
| `parceiro.html`       | área do representante aprovado — só quem tem o link chega nela    |
| `atendimento.html`    | WhatsApp, como funciona a compra e perguntas frequentes           |
| `pedidos.html`        | histórico dos pedidos feitos naquele aparelho                     |
| `conta.html`          | área do cliente: aplicações, pedidos e dados de entrega           |
| `privacidade.html`    | o que é guardado e o que fica só com o cliente                    |
| `404.html`            | página de endereço não encontrado                                 |

Na página de produtos dá para **ordenar** a vitrine (nossa seleção, menor preço,
maior preço ou promoções primeiro) sem perder o filtro de categoria nem a busca.

### Português e espanhol

Na barra lateral há duas bandeiras — Brasil e Paraguai. Tocar troca o site
inteiro entre **português do Brasil** e **espanhol do Paraguai**, a escolha fica
guardada no aparelho e vale nas outras telas.

**A tradução é completa, e isso é medido, não prometido.** O conferidor abre as
16 páginas em espanhol, percorre tudo que aparece na tela e lista o que
continuar em português: 1.415 textos olhados, zero sobrando.

O que **não** se traduz, de propósito:

- **nome, marca e dose de produto.** "Tirzec Pen 15 mg" é igual nas duas
  línguas, porque é o nome da caixa que o cliente vai receber. Um tradutor
  automático escreveria "Bolígrafo Tirzec" e ele pediria a coisa errada;
- **"PHARMA FIT"** — marca não se traduz;
- telefone, endereço e valor em real.

Isso é garantido por construção: a tradução é um dicionário de **frases
exatas** (`assets/js/idioma-es.js`), e o que não está lá não é tocado.

**Para acrescentar ou corrigir uma frase**, mexa só nesse arquivo — uma linha
por frase, e não é preciso abrir nenhuma das 16 páginas. Frase com número
dentro ("ou em até 3x sem juros de R$ 366,33") entra na lista de padrões no fim
do mesmo arquivo.

O registro é **"usted"**, que é como o comércio paraguaio trata o cliente. Para
mudar para o tratamento informal, é nesse arquivo também.

Se alguém escrever texto novo numa página e esquecer o dicionário, a publicação
para: `conferir-idioma.mjs` exige tradução para toda frase de tela. Meio
traduzido é pior que não traduzido — o cliente paraguaio acha que quebrou.

### O painel não aparece para o visitante

O item "Gestão (equipe)" **não está no HTML de nenhuma página**. Ele é posto
pelo JavaScript e só aparece para quem tem sessão do painel naquele aparelho.

Duas coisas que isso **não** é:

1. **Não é segurança.** Quem protege o painel é a tela de login e as regras do
   banco (a RLS). Está conferido que um visitante sem login, digitando
   `/gestao/index.html`, `/gestao/app/inicio.html`, `/gestao/relatorios.html` ou
   `/gestao/ajustes.html` na mão, é jogado para o login nos quatro casos.
   Esconder o link só faz o painel parar de ser anunciado a quem não tem nada a
   ver com ele.
2. **Não é um jeito de saber quem é da equipe.** É um sinal daquele navegador.
   Se a equipe limpar os dados do navegador, o link desaparece — e o caminho
   passa a ser digitar **`/gestao/login.html`**, que continua funcionando.

Depois de enviar, o cliente vê uma **confirmação dentro do site** com o resumo do
que pediu e um botão para abrir a conversa no WhatsApp. Antes o site tentava abrir
o WhatsApp sozinho, o que o navegador do iPhone bloqueia — a pessoa tocava em
enviar e não acontecia nada.

Em **Meus pedidos** e na **Minha área**, cada pedido antigo tem **"Pedir de novo"**:
abre o formulário já com o produto, a quantidade e os dados de entrega preenchidos.

Produtos sem estoque trocam o botão por **"Avise-me quando chegar"** e a pessoa entra
na fila de interesse, que aparece no painel.

### Área do cliente

Em `conta.html`, sem cadastro e sem senha. O cliente vê um resumo (pedidos, favoritos,
aplicações) e tem o **controle das aplicações**: toca em "Apliquei hoje" e o painel
passa a mostrar a data da próxima, quantos dias faltam e o histórico. Dá para dizer
qual produto está usando e tocar em **"Lembrar no celular"**: o site gera um arquivo
de calendário (.ics) com as próximas 12 aplicações e alarme meia hora antes — funciona
no iPhone e no Android sem instalar nada. Dá para escolher
o intervalo (3, 7, 14, 15, 21 ou 30 dias) conforme o protocolo. Quando o dia chega, o
cartão muda de cor; se atrasar, avisa há quantos dias.

Tudo fica no aparelho de quem usa — nada disso vai para o servidor.

## O que o painel tem

| Tela                     | Para quê                                                                    |
|--------------------------|-----------------------------------------------------------------------------|
| `gestao/dashboard.html`  | abertura do painel: avisos, números do mês e gráficos                       |
| `gestao/index.html`      | vendas: fila de confirmação, busca, edição e produtos                       |
| `gestao/relatorios.html` | fechamento mês a mês, lucro bruto/líquido e rankings                        |
| `gestao/despesas.html`   | gastos da empresa: funcionários, insumos, frete, anúncios                   |
| `gestao/clientes.html`   | todos os clientes, quem precisa reativar, representantes, orçamentos e fila |
| `gestao/cliente.html`    | ficha individual: histórico, hábitos de compra, observações e ações rápidas |
| `gestao/pessoal.html`    | **suas** contas, separadas da empresa — só o e-mail dono enxerga            |
| `gestao/ajustes.html`    | diagnóstico do site publicado e ligação com o banco — só o dono enxerga     |

**Ajustes** (só o dono vê) é a tela para usar depois de publicar. Ela confere
sozinha se a acentuação está certa, se o HTTPS está ligado, se o banco responde,
quais tabelas já existem e se o WhatsApp e o e-mail do dono foram trocados. No
mesmo lugar dá para colar a URL e a chave do Supabase: a tela testa a conexão na
hora e devolve o `config.js` pronto para copiar e colar pelo gerenciador de
arquivos da Hostinger — sem precisar editar código. Se alguém colar a chave
`service_role` por engano, ela é recusada com o motivo.

Na mesma tela fica a **cópia de segurança**: um botão baixa um arquivo com tudo
(pedidos, produtos, gastos, cadastros, observações e ajustes) e outro restaura
a partir dele. A restauração só acrescenta o que está faltando — nunca apaga nem
troca o que já existe. Enquanto o banco não estiver ligado, o Dashboard avisa em
vermelho se fizer mais de uma semana desde a última cópia.

**Meta do mês**: defina no Dashboard quanto quer faturar e o painel mostra a
barra de progresso, quanto falta e quanto precisa vender por dia até o fim do mês.
Dá para mudar ou tirar a meta a qualquer momento, sem mexer em arquivo.

**Comprovante da venda**: ao confirmar um pedido, o painel abre a mensagem de
confirmação já escrita (produto, valor, pagamento, data e endereço). Nada sai
sozinho — você lê, ajusta se quiser e envia pelo WhatsApp, ou copia o texto.

**Área do parceiro**: depois de aprovar um representante em Clientes, o botão
**Copiar link** gera o endereço da área dele (`parceiro.html?p=Nome`) para você
mandar no WhatsApp. Lá ele monta o pedido inteiro de uma vez, escolhendo a
quantidade de cada produto, e o pedido chega no painel como orçamento marcado
como parceiro. Preço de parceiro continua sendo combinado por você no WhatsApp —
a página não promete desconto nenhum. Ela fica fora do menu público e do robots.txt.

**Comparar dois meses**: nos Relatórios, ao lado do fechamento, uma tabela põe
o mês escolhido contra qualquer outro — faturamento, vendas, ticket, custo, gastos
e lucro, com a diferença em reais e em porcentagem, e uma frase dizendo se você
lucrou mais ou menos.

**Filtro por vendedor**: a tabela de vendas ganha um seletor de quem vendeu, que
só aparece quando mais de uma pessoa já vendeu.

**Etiqueta de envio**: toda venda com endereço ganha um botão **etiqueta** na
tabela de vendas (e logo depois de confirmar). Ele imprime só a etiqueta —
destinatário, endereço, telefone, remetente e o número do pedido. O nome do
produto **não** vai na etiqueta de propósito: o que a pessoa comprou não precisa
ficar escrito do lado de fora da caixa.

**Ficha do cliente** abre pelo nome em qualquer lista do painel (fila de pedidos,
tabela de vendas, ranking de clientes ou a lista "Todos os clientes"). Ela reúne
total comprado e lucro que ele deu, número de compras e de quanto em quanto tempo
costuma comprar, ticket médio, endereço de entrega, meio de pagamento e produto
preferidos, o histórico completo (com exportação em planilha), observações da
equipe e dois atalhos: chamar no WhatsApp com a mensagem já escrita e lançar um
pedido novo em nome dele.

**Relatórios** mostram, por mês (de agosto em diante): faturamento, nº de vendas,
ticket médio, custo dos produtos, gastos, **lucro bruto** (faturamento − custo),
**lucro líquido** (bruto − gastos) e o meio de pagamento mais usado.

**Gastos** é a tela do dia a dia: um campo para lançar rapidinho o que saiu do caixa —
salário de funcionário, isopor, fita, frete, anúncio — com total do mês, quanto foi de
folha, maior gasto, média por dia e quebra por categoria. Tudo que entra aqui é
descontado do lucro líquido automaticamente.
Os rankings cobrem clientes que mais compram, produtos mais vendidos, vendas por
pessoa da equipe, meios de pagamento e a maior venda do período.

**Clientes para reativar** lista quem não compra há mais de 60 dias
(`DIAS_INATIVIDADE` no config), do mais antigo para o mais novo, com botão que já
abre o WhatsApp com a mensagem escrita.

**Dashboard** é a tela de abertura: mostra primeiro o que precisa de você (pedidos
aguardando, estoque acabando, clientes parados) e depois os números do mês —
faturamento, lucro líquido, vendas e ticket, cada um comparado com o mês anterior.
Os gráficos são cinco: faturamento × lucro por mês, vendas dia a dia, meios de
pagamento, gastos por categoria e os rankings de produtos e clientes. Fecha com o
caminho do dinheiro: de quanto entrou, quanto virou lucro.

Os gráficos são SVG desenhado na mão, sem biblioteca externa — a página carrega
rápido e funciona mesmo se o CDN estiver fora do ar.

**Meu painel** é só seu: entradas e saídas pessoais, para onde vai seu dinheiro e o
histórico mês a mês. O lucro da empresa aparece ao lado apenas como comparação — não
entra na sua conta. Quem não for o `EMAIL_DONO` é mandado de volta para a visão geral.

## Estoque

No painel, cada produto tem o botão **editar**: ali você ajusta custo, preço de venda,
preço antigo (promoção) e **estoque**.

- **Campo de estoque vazio** = sem controle. O produto aparece sempre disponível.
- **Com número** = controlado. Cada venda confirmada **desconta a quantidade vendida**
  e o painel avisa quanto restou.
- **Chegou a zero** = o site troca o botão por **"Avise-me quando chegar"** e quem se
  cadastrar entra na fila de interesse, que aparece na tela de Clientes.

## O prefixo `pf_` nas tabelas (leia antes de mexer no banco)

Este Supabase é **compartilhado por oito negócios**, e ainda tem 81 tabelas com nomes
genéricos (`produtos`, `leads`, `notas`) que são de outro sistema. As tabelas da Pharma
Fit todas começam com `pf_`.

Ninguém escreve o nome da tabela na mão. Tanto o site quanto o painel passam por um
ajudante que põe o prefixo, e o prefixo vem de um lugar só
(`PREFIXO_TABELAS` em `gestao/assets/config.js`):

| onde | ajudante |
|---|---|
| painel | `T('pedidos')` em `gestao/assets/dados.js` |
| site | `tabela('pedidos')` em `assets/js/nuvem.js` |

**Por que isso está escrito aqui em letra grande.** Em 16/09/2026 eu descobri que o site
não tinha esse ajudante. Quando as tabelas ganharam o prefixo (migração 02), o painel foi
ajustado e o site ficou pedindo `pedidos`, `espera`, `orcamentos` e `representantes` —
quatro nomes que não existem mais no banco. Resultado: **nenhum formulário do site
chegava ao painel**, e a tela não tinha como perceber (o formulário abre, valida e o botão
responde; só a gravação não acontece). A vitrine, pior, pedia `produtos`, que existe e é
**de outro negócio**.

Hoje a publicação trava se isso voltar: o CI roda `conferir-tabelas.mjs` nas duas metades,
`gestao` **e** `assets`.

## Como funciona uma venda

```
1. Cliente clica em "Quero meu atendimento" / "Saiba mais"
   → deixa nome, WhatsApp, quantidade e endereço de entrega
   → o pedido nasce PENDENTE e a conversa abre no WhatsApp
     já com produto, quantidade e endereço escritos

2. Vocês fecham a venda na conversa

3. No painel, o pedido está em "Aguardando confirmação"
   (com o endereço de entrega à vista):
   → Confirmar  = pede o valor fechado e o meio de pagamento;
                  a venda entra no faturamento, registra quem vendeu
                  e baixa o estoque do produto
   → Excluir    = some da lista (cliente desistiu, teste, engano)

4. A cada pedido novo, o celular da equipe recebe uma
   notificação: "Novo pedido — Nome do cliente — Produto"
```

Só o pedido **confirmado** entra em "Vendas hoje", "Faturamento do mês" e
"Ticket médio". Pendente não move número nenhum.

Vendas que já chegaram prontas pelo WhatsApp, sem passar pelo site, entram
pelo botão **"Lançar pedido"** no painel — com o mesmo ciclo de confirmação.

## Área de gestão

Acesso em `gestao/login.html` (link discreto no menu lateral do site).
Usa **Supabase Auth**, o mesmo padrão do painel MedGroup.

### 1. Ligar no banco

1. No [Supabase](https://supabase.com), crie o projeto e vá em **Project Settings → API**.
2. Copie a **Project URL** e a chave **anon/publishable** para `gestao/assets/config.js`.
3. Preencha também o `WHATSAPP` (só números com DDI, ex.: `5592991234567`).
4. Em **SQL Editor → New query**, rode o arquivo `gestao/supabase/schema.sql`
   (cria as tabelas, as permissões e liga o tempo real).
5. Em **Authentication → Users**, crie o usuário de cada pessoa da equipe.
6. Opcional: liste os e-mails autorizados em `EMAILS_AUTORIZADOS`.

Enquanto os campos ficarem vazios, tudo roda em **modo demonstração**
(`gestao@pharmafit.com` / `pharmafit2026`), com aviso na tela e dados guardados
só naquele navegador — dá para testar o fluxo inteiro antes de configurar.

> ⚠️ **Importante:** o modo demonstração não é segurança — a validação acontece no
> próprio navegador. Só use com dados reais depois de configurar o Supabase. A chave
> `service_role` nunca deve ir para o front-end.

### 2. Ligar as notificações no celular

Com o painel aberto, o aviso já funciona: basta tocar em **"Ativar avisos"** e
aceitar a permissão. Para receber **com o painel fechado**, falta o push:

1. Gere o par de chaves:  `npx web-push generate-vapid-keys`
2. Cole a **pública** em `VAPID_PUBLIC_KEY` (`gestao/assets/config.js`).
3. Publique a função:  `supabase functions deploy notificar-pedido`
   (o código está em `gestao/supabase/functions/notificar-pedido/`).
4. Em **Edge Functions → Secrets**, cadastre:
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (ex.: `mailto:...`)
   e `PAINEL_URL` (endereço do painel publicado).
5. Em **Database → Webhooks**, crie um webhook na tabela `pedidos`,
   evento **INSERT**, apontando para a função `notificar-pedido`.

Detalhes que costumam pegar:

- Notificação web **exige HTTPS** — funciona no site publicado, não em `file://`.
- No **iPhone**, o push só chega se o painel for aberto pelo Safari e adicionado
  à tela de início (Compartilhar → Adicionar à Tela de Início). No Android funciona direto.
- Cada aparelho precisa tocar em "Ativar avisos" uma vez.

### 3. Já tenho o banco de uma versão anterior

Se você **já rodou** o `schema.sql` antes e tem dados dentro, não rode ele de novo.
Use `gestao/supabase/migracao-01-campos-novos.sql`: ele só acrescenta o que falta
(endereço e quantidade no pedido, custo e promoção no produto, e as tabelas de
representantes, orçamentos, fila de espera, gastos, finanças pessoais,
observações de cliente e ajustes do painel) sem apagar nada.

Enquanto a migração não roda, observações e meta continuam funcionando —
ficam guardadas no aparelho e o painel avisa isso quando você salva.

Banco vazio? Aí sim rode o `schema.sql` completo.

### 4. Tabelas do banco

| Tabela               | Para quê                                                        |
|----------------------|-----------------------------------------------------------------|
| `pedidos`            | cliente, endereço, quantidade, valor, custo, pagamento, vendedor  |
| `produtos`           | nome, categoria, custo, preço, promoção, estoque (vazio = livre) |
| `representantes`     | cadastros de parceiros vindos do site                            |
| `orcamentos`         | pedidos de atacado                                               |
| `notas`              | observações da equipe na ficha de cada cliente                   |
| `configuracoes`      | ajustes feitos pelo painel, como a meta do mês                   |
| `espera`             | fila de interesse por produto em falta                           |
| `despesas`           | gastos da empresa (entram no lucro)                              |
| `pessoal`            | suas finanças pessoais — separadas da empresa                    |
| `push_subscriptions` | celulares da equipe que recebem as notificações                  |

`status` vale `pendente`, `confirmado` ou `enviado`. As permissões (RLS) deixam o
site **criar** pedido pendente, mas só quem está logado consegue ler, confirmar ou excluir.

### O que o painel já faz

- **Vendas**: fila de confirmação, busca por cliente/produto/pagamento, filtro por
  período, edição (valor, pagamento, situação) e exclusão
- **Produtos**: cadastro, edição de custo/preço/promoção/estoque, tirar do site sem
  apagar e exclusão; busca que ignora acentos
- **Estoque**: baixa automática a cada venda confirmada
- **Gastos**: lançamento rápido, categorias, total do mês, folha e média por dia
- **Relatórios**: fechamento mensal com lucro bruto e líquido, rankings e maior venda
- **Clientes**: quem parou de comprar, representantes, orçamentos e fila de interesse
- **Meu painel**: finanças pessoais do dono, separadas da empresa

### O que a tela de login já faz

- Validação de e-mail e senha com mensagens de erro em português
- Mostrar/ocultar senha, "lembrar de mim" e "esqueci minha senha" (e-mail de redefinição)
- Redireciona para o painel se já houver sessão, e bloqueia o painel sem login
- Botão "Sair" encerra a sessão

## Detalhe de comportamento

Na tela de Produtos, a categoria "Tirzepatida" aparece selecionada e a grade mostra todos os
produtos — igual à tela enviada. O filtro passa a valer a partir do primeiro clique em uma
categoria; "Ver seleção" limpa o filtro.
