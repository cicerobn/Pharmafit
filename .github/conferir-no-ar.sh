#!/usr/bin/env bash
# =============================================================================
# CONFERIR O SITE NO AR
# =============================================================================
#
# Este script era um bloco de 480 linhas dentro do conferir-site.yml, e em
# 16/09/2026 ele bateu no teto: ao passar de 23.172 para 24.983 bytes, o
# GitHub parou de conseguir LER o arquivo do workflow inteiro. Nenhum passo
# rodava, o nome do workflow virava o caminho do arquivo, e nem o YAML nem o
# validador de esquema reclamavam de nada — o defeito não estava na escrita,
# estava no tamanho.
#
# Morando aqui, ele perde o teto e ganha duas coisas que faltavam: dá para
# `bash -n` nele antes de publicar, e dá para ler sem contar dez espaços de
# indentação em cada linha.
#
# Mora em .github/ porque .github/ não é parte do site: a conferência da
# publicação já exclui essa pasta da lista de arquivos publicáveis, e o
# .htaccess recusa `.sh` do mesmo jeito que já recusava `.yml`.
#
# Chamado por: .github/workflows/conferir-site.yml, passo "Conferir o site".
# Recebe: SITE_URL (opcional), GITHUB_EVENT_NAME e GITHUB_EVENT_PATH.
# =============================================================================

candidatos="
https://darkblue-deer-373108.hostingersite.com
https://powderblue-pony-338424.hostingersite.com
"
[ -n "$SITE_URL" ] && candidatos="$SITE_URL"

achou=""
# UM NAVEGADOR DE VERDADE NO CABEÇALHO.
#
# Sem isto a Hostinger responde HTTP 403 com "Checking your browser
# before accessing" para o GitHub — é a proteção antirrobô dela, e
# quem está sendo barrado é esta conferência, não o cliente. Pedir
# 280 arquivos de uma vez, dez vezes seguidas, é exatamente o que
# parece robô; provavelmente fui eu que acendi o alarme.
NAVEGADOR="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"

echo "Procurando a Pharma Fit:"
barrado=0
# "respondeu" = o servidor devolveu ALGUMA resposta HTTP, mesmo
# que ruim. Fica separado de "nem abriu a conexão", que é outro
# assunto e está explicado mais abaixo.
respondeu=0

# TRÊS VOLTAS, E NÃO UMA.
#
# Uma única tentativa de 20s transforma qualquer soluço de rede
# em "o site caiu". Três voltas espaçadas custam dois minutos no
# pior caso e só sobram quando o problema é constante.
for volta in 1 2 3; do
  achou=""
  for bruto in $candidatos; do
    alvo="${bruto%/}"
    : > /tmp/home.html
    # Sem `|| echo 000` aqui: o próprio -w já escreve 000 quando a
    # conexão não acontece, e os dois juntos imprimiam "HTTP 000000",
    # um código que não existe. Detalhe pequeno que faz duvidar do
    # resto do recado.
    codigo=$(curl -s -A "$NAVEGADOR" -o /tmp/home.html -w '%{http_code}' --max-time 20 "$alvo/") || true
    [ -n "$codigo" ] || codigo=000
    titulo=$(grep -oiE '<title>[^<]*' /tmp/home.html 2>/dev/null | head -1 | sed 's/<title>//I')
    echo "  volta $volta · $alvo → HTTP $codigo  ${titulo}"
    [ "$codigo" = "000" ] || respondeu=1
    if grep -qiE 'checking your browser|just a moment|cf-browser-verification|__cf_chl' /tmp/home.html 2>/dev/null; then
      barrado=1
    fi
    if [ "$codigo" = "200" ] && printf '%s' "$titulo" | grep -qi "pharma"; then
      achou="$alvo"
    fi
  done
  [ -z "$achou" ] || break
  [ "$volta" = "3" ] || { echo "  … esperando 45s para tentar de novo"; sleep 45; }
done

# PAREI DE CHAMAR "SITE FORA DO AR" O QUE É "NÃO CONSEGUI OLHAR".
#
# Em 16/09/2026 esta conferência escreveu "A Pharma Fit não respondeu
# em nenhum dos endereços" com o site funcionando perfeitamente: o
# que ela recebeu foi a tela de verificação de navegador. Duas coisas
# muito diferentes — uma é o site quebrado, a outra é a porta fechada
# para MIM — e dar o mesmo nome às duas manda o Brian procurar
# defeito onde não tem.
#
# Quando é a proteção, isto não reprova nada: ela não diz NADA sobre
# a publicação. Fica o aviso, e o jeito de voltar a poder conferir.
if [ -z "$achou" ] && [ "$barrado" = "1" ]; then
  echo "::notice::Não deu para conferir o site no ar: a Hostinger devolveu a tela de verificação de navegador (proteção antirrobô) para o GitHub. ISTO NÃO DIZ QUE O SITE ESTÁ COM PROBLEMA — para o visitante, que usa navegador de verdade, ela passa sozinha. Para esta conferência voltar a funcionar: hPanel → Segurança → proteção antirrobô/bot, e liberar (ou desligar). Enquanto isso, o que dá para garantir daqui são as conferências que rodam sem internet, e essas passaram todas."
  exit 0
fi

# "NÃO VEIO RESPOSTA" NÃO É "VEIO RESPOSTA RUIM".
#
# Em 16/09/2026, às 15:22, esta conferência escreveu: "não
# respondeu em nenhum dos endereços (e não foi proteção
# antirrobô: nenhuma resposta tinha a tela de verificação)".
# Mas o que ela recebeu foi HTTP 000 nas duas — ou seja,
# NENHUMA resposta. E sem resposta não existe tela de
# verificação para achar: ela absolvia a proteção antirrobô
# usando como prova exatamente o que um bloqueio produz.
#
# Do runner não dá para distinguir "a Hostinger caiu" de "a
# Hostinger fechou a porta para o GitHub". Então o recado diz
# as duas possibilidades e diz o que resolve em dez segundos:
# abrir o site no celular. Continua reprovando, porque uma das
# duas possibilidades é o site fora do ar — mas sem mandar
# procurar defeito no código, que não é nenhuma das duas.
if [ -z "$achou" ] && [ "$respondeu" = "0" ]; then
  echo "::error::Não consegui nem abrir a conexão com o site (HTTP 000 nas três voltas, em todos os endereços). Daqui não dá para saber qual dos dois é: (a) a Hostinger está fora do ar, ou (b) ela está bloqueando o GitHub por IP — que é o vizinho da proteção antirrobô e não devolve tela nenhuma. O que decide em dez segundos: abra https://darkblue-deer-373108.hostingersite.com no celular. Se abrir, é (b) e o site está bem: hPanel → Segurança → liberar o IP do GitHub. Se não abrir, é (a) e é caso de suporte da Hostinger. Em nenhum dos dois o problema está no código — as conferências que rodam sem internet passaram todas."
  exit 1
fi

if [ -z "$achou" ]; then
  echo "::error::Os endereços acima responderam, mas nenhum devolveu a página da Pharma Fit (código diferente de 200, ou título sem \"Pharma\"). Aí é resposta de verdade com conteúdo errado — vale olhar o que a Hostinger está servindo."
  exit 1
fi

echo
echo "Conferindo $achou"
falhou=0

# ---- 1. acentos ----
tipo=$(curl -sI -A "$NAVEGADOR" --max-time 20 "$achou/" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-type"{print $2}')
echo "página:  $tipo"
case "$tipo" in
  *utf-8*|*UTF-8*) ;;
  *) echo "::error::A página vem como \"$tipo\". Sem UTF-8 os acentos aparecem trocados — já aconteceu neste site."; falhou=1 ;;
esac

# ---- 2. as páginas todas abrem ----
#
# COM TRÊS TENTATIVAS, E O MOTIVO É A HOSTINGER.
#
# A publicação dela NÃO É ATÔMICA: ela troca arquivo por arquivo, e uma
# página pode não existir por alguns segundos no meio disso. Esta
# conferência roda segundos depois do `git push`, então ela cai
# justamente dentro dessa janela.
#
# Aconteceu em 18/09/2026: `produtos.html` respondeu 404 às 14:30:21 e,
# 21 segundos depois, a MESMA conferência (a parte que compara arquivo
# por arquivo) achou os 40 arquivos certos, produtos.html incluído. O
# site estava bem; a foto foi tirada no meio da troca.
#
# Uma página que continua 404 depois de três tentativas com 8 segundos
# entre elas é defeito de verdade — e continua falhando a publicação.
for pagina in index.html produtos.html atendimento.html parceiro.html atacado.html \
              conta.html quiz.html representantes.html privacidade.html \
              pedidos.html favoritos.html gestao/login.html; do
  c=000
  for tentativa in 1 2 3; do
    c=$(curl -s -A "$NAVEGADOR" -o /dev/null -w '%{http_code}' --max-time 20 "$achou/$pagina" || echo 000)
    [ "$c" = "200" ] && break
    echo "  $pagina veio $c (tentativa $tentativa de 3) — a publicação pode estar no meio da troca"
    [ "$tentativa" != "3" ] && sleep 8
  done
  if [ "$c" != "200" ]; then
    echo "::error::$pagina respondeu HTTP $c em três tentativas"
    falhou=1
  fi
done
echo "as 12 páginas: conferidas"

# ---- 3. estilo e script, com o tipo certo ----
for par in "assets/css/styles.css:css" "assets/js/app.js:javascript"; do
  arq="${par%%:*}"; esperado="${par##*:}"
  t=$(curl -sI -A "$NAVEGADOR" --max-time 20 "$achou/$arq" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-type"{print $2}')
  echo "$arq → $t"
  case "$t" in
    *"$esperado"*) ;;
    *) echo "::error::$arq vem como \"$t\", e o navegador precisa de $esperado."; falhou=1 ;;
  esac
done

# ---- 3b. a loja nova, que mora em /loja/ ----
#
# O endereço que uma pessoa digita é a PASTA (`/loja/`), não o
# arquivo. Arquivo respondendo 200 não prova que a pasta abre: quem
# decide isso é o DirectoryIndex, e sem ele a pasta devolve 403 —
# que foi exatamente o que apareceu na primeira tentativa.
c=$(curl -s -A "$NAVEGADOR" -o /tmp/loja.html -w '%{http_code}' --max-time 20 "$achou/loja/" || echo 000)
if [ "$c" = "200" ] && grep -q 'id="raiz"' /tmp/loja.html; then
  echo "/loja/ → HTTP 200, e o que vem é a loja"
else
  echo "::error::/loja/ respondeu HTTP $c e não parece ser a loja."
  echo "A pasta é o endereço que uma pessoa digita; o arquivo dentro dela não substitui isso."
  falhou=1
fi

# O tipo de cada script da loja.
#
# A loja é montada, e os nomes saem com impressão digital
# (`index-Ctj6MFPc.js`), que muda a cada mudança na fonte. Lista fixa
# aqui viraria mentira na primeira montagem — então a lista vem da
# própria pasta.
#
# Tipo errado num .js é a falha mais cruel deste site: o navegador
# recusa o módulo em silêncio e a loja abre BRANCA, sem uma palavra.
for arq in $(find loja -type f -name '*.js' | sort); do
  t=$(curl -sI -A "$NAVEGADOR" --max-time 20 "$achou/$arq" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-type"{print $2}')
  echo "$arq → $t"
  case "$t" in
    *javascript*|*ecmascript*) ;;
    *) echo "::error::$arq vem como \"$t\". O navegador só executa módulo que chega como javascript — com outro tipo, a loja abre branca."; falhou=1 ;;
  esac
done

# ---- 4. o que NÃO pode ser servido ----
#
# O .htaccess recusa .sql, .ts e .md, e bloqueia gestao/supabase/.
# Os arquivos nem estão neste repositório, mas a regra é o que segura
# se alguém copiá-los para lá um dia — então ela é conferida.
#
# As ferramentas `.mjs` da raiz entram na lista SOZINHAS, pelo find.
# Escritas à mão elas ficariam atrás: `conferir-css.mjs` nasceu hoje
# e eu já ia esquecer de somar ele aqui.
#
# O contrário — que a regra não derrubou nada que o site precisa —
# está provado no passo 3 logo acima: ele baixa TODO .js de /loja/ e
# exige tipo de javascript. Se o bloqueio pegasse a loja por engano,
# aquele passo falharia antes deste.
FERRAMENTAS=$(find . -maxdepth 1 -type f -name '*.mjs' | sed 's|^\./||' | sort)
echo "ferramentas da raiz que têm de estar bloqueadas: $(echo $FERRAMENTAS)"

# E AS FERRAMENTAS DE PUBLICAÇÃO, pela forma também.
#
# Este script mesmo virou um arquivo do repositório em 16/09/2026, e
# arquivo do repositório é servido pela Hostinger até alguém dizer que não.
# Lista pela FORMA e não pelo nome, pelo mesmo motivo de sempre: no dia em
# que nascer o segundo `.sh` aqui ele já vem protegido.
FERRAMENTAS_CI=$(find .github -type f \( -name '*.sh' -o -name '*.yml' -o -name '*.yaml' \) | sed 's|^\./||' | sort)
echo "ferramentas de publicação que têm de estar bloqueadas: $(echo $FERRAMENTAS_CI)"

for proibido in gestao/supabase/schema.sql \
                gestao/supabase/functions/notificar-pedido/index.ts \
                loja-fonte/src/App.jsx \
                loja-fonte/package.json \
                loja/.htaccess \
                README.md \
                $FERRAMENTAS \
                $FERRAMENTAS_CI; do
  c=$(curl -s -A "$NAVEGADOR" -o /dev/null -w '%{http_code}' --max-time 20 "$achou/$proibido" || echo 000)
  if [ "$c" = "200" ]; then
    echo "::error::$proibido está sendo servido ao público (HTTP 200). Isso entrega a estrutura do banco a quem passar."
    falhou=1
  else
    echo "$proibido → HTTP $c (bloqueado, certo)"
  fi
done

# ---- 5. o 404 é a página da casa ----
c=$(curl -s -A "$NAVEGADOR" -o /tmp/perdido.html -w '%{http_code}' --max-time 20 "$achou/pagina-que-nao-existe-$RANDOM" || echo 000)
if [ "$c" = "404" ] && grep -qi "pharma" /tmp/perdido.html; then
  echo "404: mostra a página própria, certo"
else
  echo "::warning::Endereço inexistente respondeu HTTP $c e não parece ser o 404.html da casa."
fi

# ---- 5b. o robots.txt é o da Hostinger, e ele barra o Google ----
#
# MEDIDO, não suposto. O arquivo do repositório NÃO chega na web: a
# Hostinger serve o dela, e o dela diz
#
#     User-agent: Googlebot
#     Disallow: /
#
# ou seja, o Google está barrado do site INTEIRO. Isso é o normal em
# endereço de teste `*.hostingersite.com`, e por enquanto até ajuda —
# é o que mantém a loja inacabada fora da busca, e não o
# `Disallow: /loja/` que eu tinha escrito, que nunca valeu.
#
# O QUE IMPORTA É O DIA DO DOMÍNIO PRÓPRIO: se essa regra continuar
# valendo, o site entra no ar invisível para o Google e ninguém
# descobre por meses. Então isto fica conferido a cada dia: enquanto
# for o endereço de teste, é só um recado; quando o robots mudar de
# cara, o recado muda junto e a gente fica sabendo.
curl -fsS -A "$NAVEGADOR" --max-time 20 "$achou/robots.txt" > /tmp/robots-no-ar.txt 2>/dev/null || true
if grep -qi 'Googlebot' /tmp/robots-no-ar.txt && grep -qi 'Disallow: /' /tmp/robots-no-ar.txt; then
  echo "robots.txt: é o da Hostinger e barra o Google do site todo (esperado em endereço de teste)"
  echo "::notice::O Google está barrado deste site pelo robots.txt da Hostinger. Correto agora, por ser endereço de teste — mas no dia do domínio próprio isto tem de sair, ou o site fica invisível na busca."
elif ! cmp -s robots.txt /tmp/robots-no-ar.txt; then
  echo "::warning::O robots.txt no ar não é o da Hostinger nem o do repositório. Vale olhar: é ele que decide se o site aparece na busca."
  sed 's/^/    /' /tmp/robots-no-ar.txt
else
  echo "robots.txt: agora é o do repositório — a Hostinger parou de sobrescrever."
  echo "::notice::A Hostinger parou de sobrescrever o robots.txt: agora vale o do repositório. Confira se ele libera o que deve liberar."
fi

# ---- 6. a publicação CHEGOU? ----
#
# Os testes acima provam que o site está no ar. Não provam que está na
# versão que acabou de ser enviada — e "no ar" com a versão velha é
# exatamente o jeito de alguém achar que publicou e não ter publicado.
#
# Como este site não tem passo de montagem, o repositório é a verdade:
# o arquivo publicado tem que ser BYTE POR BYTE o arquivo do commit.
# Se diferir, a Hostinger ainda não pegou (ou pegou pela metade).
#
# A LISTA VEM DO REPOSITÓRIO, e não escrita à mão.
#
# Ela era escrita à mão, com onze arquivos, e isso é uma armadilha:
# a lista não acompanha o trabalho. Os arquivos que eu mudo hoje não
# são os que eu listei ontem — mudei cinco arquivos da gestão e
# NENHUM DOS CINCO estava na lista. A conferência teria dito "chegou"
# depois de comparar onze arquivos que ninguém tocou.
#
# Aprovar por ter olhado só onde nada mudou é a mesma falha que eu já
# tinha cometido no conferidor de tabelas, que aprovava por não ter
# olhado nada. Então agora a lista é TUDO o que o site publica, e o
# que fica fora fica fora por um motivo dito aqui:
#
#   .htaccess       o Apache se recusa a servir (é a configuração dele)
#   .md .sql .ts    o próprio .htaccess recusa, de propósito
#   .yml .yaml      idem
#   *.mjs           ferramenta de publicação; o .htaccess recusa pelo nome
#   .git* .gitignore não é para o navegador
#   loja-fonte/     RedirectMatch 404 — é a fonte, não o site
#   .github/        não é publicado
#   robots.txt      a Hostinger serve o DELA, não o nosso (medido — veja abaixo)
#
# Que esses continuem recusados é conferido na lista de proibidos, ali
# acima — as duas metades se fecham: o que está aqui tem que chegar
# igual, e o que está lá tem que não chegar.
ARQUIVOS=$(find . -type f \
  -not -path './.git/*' \
  -not -path './.github/*' \
  -not -path './loja-fonte/*' \
  -not -name '.htaccess' \
  -not -name '.gitignore' \
  -not -name '*.md' \
  -not -name '*.sql' \
  -not -name '*.ts' \
  -not -name '*.yml' \
  -not -name '*.yaml' \
  -not -name '*.mjs' \
  -not -name 'robots.txt' \
  | sed 's|^\./||' | sort)

# UMA LINHA POR ARQUIVO, e nunca separado por espaço.
#
# Era separado por espaço, e em 16/09/2026 o Brian subiu pelo GitHub
# um arquivo chamado "ChatGPT Image 16 de set. de 2026, 05_14_27.png".
# A conferência partiu o nome em sete pedaços, procurou por "ChatGPT",
# "Image", "16"... no site, não achou nenhum, e reprovou a publicação
# dizendo "não chegou: 05_14_27.png 16 2026, ChatGPT Image de set." —
# com o recado para conferir se a Hostinger estava ligada no Git.
#
# A Hostinger estava certa. A publicação tinha chegado. O errado era
# a conferência, e o pior não foi reprovar: foi apontar a causa
# errada. Conferidor que erra o diagnóstico manda a gente arrumar o
# que não está quebrado.
echo "O site tem $(printf '%s\n' "$ARQUIVOS" | grep -c .) arquivos publicáveis."

echo
echo "Conferindo se a publicação chegou (comparando com este commit):"

# =================================================================
# ESTA CONFERÊNCIA ESTAVA CAUSANDO O PROBLEMA QUE ELA RELATAVA.
# =================================================================
#
# Ela reprovou três publicações seguidas dizendo que gestao.css não
# havia chegado, com uma lista que se contradizia: um arquivo
# aparecia ausente na tentativa 1, presente na 3, ausente na 4.
# Arquivo publicado não despublica.
#
# O diagnóstico (40 pedidos seguidos, códigos HTTP impressos)
# respondeu, e a minha suspeita de limite de pedidos estava ERRADA:
# 40 de 40 deram HTTP 200. O que apareceu foi outra coisa:
#
#   gestao/assets/gestao.css, no repositório: 39091 bytes, 977ffa5c
#     sem marca          35228 bytes  DIFERENTE  (HIT, age 23094)
#     com marca ?v=…     38624 bytes  DIFERENTE  (HIT, age 19196)
#     furando o cache    39091 bytes  IGUAL
#
# O arquivo está certo no servidor. O que está velho é a cópia que o
# CDN guardou DO ENDEREÇO COM MARCA — o endereço que o visitante pede.
#
# ISSO DERRUBA A MINHA PREMISSA. Eu escrevi, aqui mesmo, que "não
# existe cópia velha de um endereço que ninguém pediu ainda". Existe:
# a publicação não é atômica. O HTML pode chegar antes do CSS, e
# quem pedir `gestao.css?v=<marca nova>` nessa janela recebe o CSS
# VELHO — e o CDN guarda essa resposta velha, sob o endereço novo,
# por 24 horas (max-age=86400). Depois disso nem o arquivo certo
# chegando resolve: o endereço já está envenenado.
#
# E QUEM PEDIA NESSA JANELA ERA ESTA CONFERÊNCIA. Ela disparava
# ~2000 pedidos (101 arquivos × 2 endereços × 10 tentativas) contra
# os endereços com marca, começando segundos depois do push — dentro
# da janela. Ela envenenava o endereço do visitante e depois
# relatava isso como "não chegou". Um visitante teria de cair nos
# mesmos segundos; eu caía mil vezes.
#
# ENTÃO SÃO DUAS PERGUNTAS DIFERENTES, e elas se separam aqui:
#
#   1. O ARQUIVO CHEGOU AO SERVIDOR?  Pergunta-se furando o cache,
#      com um `?nocache=` diferente a cada pedido. É a única
#      pergunta que uma conferência de publicação responde de
#      verdade, e furar o cache não guarda nada sob endereço nenhum
#      que o visitante use. Falhar aqui é falha de publicação.
#
#   2. O ENDEREÇO DO VISITANTE DEVOLVE O CERTO?  Pergunta-se UMA
#      VEZ POR ARQUIVO, e só depois da 1 ter passado. Uma vez, não
#      em laço: pedir em laço é justamente o que guarda a resposta
#      errada. Falhar aqui é aviso, não erro — expira sozinho.
#
# E a lista encurtou: só os arquivos que ESTE commit mudou, mais as
# páginas HTML (que o visitante pede sem marca). Pedir 101 arquivos
# dez vezes nunca respondeu nada que 28 não respondam.

# Só o que mudou, pelo git, mais todas as páginas. `git diff` contra
# o commit anterior; num primeiro commit sem pai, cai para a lista
# inteira em vez de conferir nada.
# Só faz sentido perguntar "o que mudou" quando houve um push. Na
# rodada diária e na manual não há commit novo: ali a pergunta é "o
# site continua inteiro?", e a resposta pede a lista toda — o que
# não custa, porque nessas rodadas o site já está assentado e a
# primeira tentativa resolve.
# O PONTO DE PARTIDA É O DO PUSH, E NÃO "O COMMIT ANTERIOR".
#
# `HEAD~1 HEAD` olha só o ÚLTIMO commit. Quem manda dois ou três de uma vez
# — o que acontece toda hora — tem os primeiros conferidos apenas se
# mexeram em .html, porque as páginas entram pela outra lista. Aconteceu em
# 16/09/2026: o app.css e o app.js do painel foram publicados sem ninguém
# olhar se chegaram ao servidor.
#
# O campo `before` do evento diz de onde o push saiu. Ele vem com 40 zeros
# quando a branch é nova, e pode apontar para um commit fora deste clone
# raso; nos dois casos eu caio no commit anterior, que é o que dava antes.
#
# Lido do ARQUIVO do evento, e não por expressão colada no script: valor de
# fora colado dentro de shell é porta de injeção, e aqui não custa nada
# fazer do jeito certo.
ANTES=""
if [ -n "$GITHUB_EVENT_PATH" ] && [ -f "$GITHUB_EVENT_PATH" ]; then
  ANTES=$(python3 -c 'import json,os;print(json.load(open(os.environ["GITHUB_EVENT_PATH"])).get("before",""))' 2>/dev/null || true)
fi

PARTIDA="HEAD~1"
if [ -n "$ANTES" ] && ! printf '%s' "$ANTES" | grep -qE '^0{40}$'; then
  if git cat-file -e "$ANTES^{commit}" 2>/dev/null; then
    PARTIDA="$ANTES"
  else
    # E ISTO NÃO PASSA CALADO. Cair no atalho sem avisar é a conferência
    # trabalhando menos e continuando a dar verde.
    echo "::notice::O commit de partida do push ($ANTES) não está neste clone, então conferi só o último commit. Se este aviso repetir, aumente o fetch-depth do passo \"Pegar o código\"."
  fi
fi

if [ "$GITHUB_EVENT_NAME" = "push" ] && git rev-parse --verify -q "$PARTIDA" >/dev/null; then
  # `--diff-filter=d` = tudo menos o que foi APAGADO.
  #
  # Arquivo que este commit apagou não tem como chegar ao site: ele
  # deixou de existir de propósito. Sem este filtro, a conferência
  # pedia o md5 de um arquivo que não está mais aqui, o md5sum
  # reclamava, a comparação dava diferente, e as dez tentativas
  # terminavam em "a publicação não chegou". Apagar um arquivo
  # reprovava a publicação para sempre.
  MUDARAM=$(git diff --name-only --diff-filter=d "$PARTIDA" HEAD \
            | grep -vE '^(\.github/|loja-fonte/)' \
            | grep -vE '\.(md|sql|ts|yml|yaml|mjs)$' \
            | grep -v '^\.' || true)
  PAGINAS=$(printf '%s\n' "$ARQUIVOS" | grep '\.html$' || true)
  printf '%s\n%s\n' "$MUDARAM" "$PAGINAS" | grep -v '^$' | sort -u > /tmp/alvos.txt
  echo "  vão ser conferidos $(grep -c . /tmp/alvos.txt) arquivos:"
  echo "  $(printf '%s\n' "$MUDARAM" | grep -c . || true) que este commit mudou" \
       "+ $(printf '%s\n' "$PAGINAS" | grep -c . || true) páginas"
else
  printf '%s\n' "$ARQUIVOS" | grep -v '^$' > /tmp/alvos.txt
  echo "  rodada $GITHUB_EVENT_NAME: conferindo os $(grep -c . /tmp/alvos.txt) arquivos"
fi
echo

esperado8() { md5sum "$1" | cut -c1-8; }

# O `--` tem de vir DEPOIS do --include, senão o grep trata o
# "--include=*.html" como nome de arquivo, reclama que não existe, e
# sai procurando em TODO arquivo do repositório. Ele ainda achava a
# marca e devolvia a resposta certa, por sorte — com um erro impresso
# no meio do relatório. Resposta certa por sorte não serve.
estampado() {
  grep -qr --include='*.html' --exclude-dir=node_modules \
    -e "?v=$(esperado8 "$1")" . 2>/dev/null
}

# Baixa e devolve o md5. Devolve "SEM-RESPOSTA" quando o servidor não
# entregou, em vez do md5 do vazio — senão pedido recusado e conteúdo
# errado viram a mesma coisa no relatório, que foi meio caminho para
# eu passar uma hora atrás da causa errada.
baixar() {
  if curl -fsS -A "$NAVEGADOR" --max-time 20 "$1" -o /tmp/veio 2>/dev/null; then
    md5sum /tmp/veio | cut -d' ' -f1
  else
    echo "SEM-RESPOSTA"
  fi
}

# =================================================================
# PARA IMAGEM, "CHEGOU IGUAL" NÃO É BYTE A BYTE.
# =================================================================
#
# Esta conferência reprovou a publicação dizendo que sete imagens não
# chegaram — entre elas os seis PNG do logo, que estão na barra de
# cima de TODAS as páginas. Se fosse verdade, o logo estaria quebrado
# para todo visitante.
#
# Não era. O diagnóstico (17/09/2026) pediu cada um dos sete, no
# endereço cru e furando o cache, e imprimiu o que veio:
#
#   logo-pf-192.png           repo   7.193 → servidor   7.734  192x192
#   logo-pf-512.png           repo  28.557 → servidor  30.052  512x512
#   logo-pf-compartilhar.png  repo  66.135 → servidor  66.750  1200x630
#   logo-pf-original.png      repo 442.394 → servidor 335.957  1600x541 (!)
#
# Todos HTTP 200, todos PNG válido, todos no tamanho certo — menos o
# último, que a hospedagem ENCOLHEU (era 2157x729). Ou seja: a
# Hostinger recomprime imagem na entrega e limita a dimensão. O site
# está certo; os bytes é que nunca mais vão bater.
#
# Comparar md5 de imagem, aqui, é uma conferência que reprova todo dia
# por um motivo que não existe. E conferência que grita sem motivo é
# pior que conferência nenhuma: ela ensina a gente a ignorar o
# vermelho, e no dia em que o vermelho for de verdade ninguém olha.
#
# Então para imagem a pergunta passa a ser a que dá para responder:
# veio uma IMAGEM VÁLIDA, com as MESMAS MEDIDAS? O 404 e o arquivo
# corrompido continuam sendo pegos, que é o que importa.
#
# O QUE ISTO DEIXA PASSAR, e eu prefiro escrever do que esconder: uma
# versão ANTERIOR da mesma imagem, se tiver as mesmas medidas, passa
# como se fosse a nova. Para logo e ícone isso não muda nada. No dia
# em que uma foto de produto for trocada mantendo o tamanho, é olho
# humano que vai ver — não este script.
#
# SVG não entra nesta regra: é texto, ninguém recomprime, e ali o md5
# vale.
eh_imagem() {
  case "$(printf '%s' "${1##*.}" | tr 'A-Z' 'a-z')" in
    png|jpg|jpeg|webp|gif|avif) return 0 ;;
    *) return 1 ;;
  esac
}

# As medidas pelo `file`, que já está na máquina. Ele escreve de
# formas diferentes por formato — "PNG image data, 192 x 192",
# "Web/P image, VP8 encoding, 620x407" — então pego o primeiro
# "<número> x <número>" e tiro os espaços.
medidas() {
  file -b "$1" 2>/dev/null | grep -oE '[0-9]+ ?x ?[0-9]+' | head -1 | tr -d ' '
}

# Devolve IGUAL, DIFERENTE ou SEM-RESPOSTA.
confere() {   # $1 = arquivo daqui   $2 = endereço
  if ! curl -fsS -A "$NAVEGADOR" --max-time 20 "$2" -o /tmp/veio 2>/dev/null; then
    echo "SEM-RESPOSTA"; return
  fi
  if eh_imagem "$1"; then
    if [ -n "$(medidas /tmp/veio)" ] && [ "$(medidas "$1")" = "$(medidas /tmp/veio)" ]; then
      echo "IGUAL"
    else
      echo "DIFERENTE"
    fi
  elif [ "$(md5sum /tmp/veio | cut -d' ' -f1)" = "$(md5sum "$1" | cut -d' ' -f1)" ]; then
    echo "IGUAL"
  else
    echo "DIFERENTE"
  fi
}

# ---- pergunta 1: chegou ao servidor? ----
#
# A lista vem de ARQUIVO e o laço é `while read`, não `for`. Assim
# nome com espaço dentro continua sendo UM nome — foi o `for` que
# partiu "ChatGPT Image 16 de set..." em sete e acusou a Hostinger.
: > /tmp/ausentes.txt
for tentativa in 1 2 3 4 5 6 7 8 9 10; do
  : > /tmp/ausentes.txt
  while IFS= read -r arq; do
    [ -n "$arq" ] || continue
    # `?nocache=` diferente a cada pedido: sem isto, a própria
    # pergunta viraria cache e as dez tentativas leriam a mesma
    # resposta velha, o que faz o laço não servir para nada.
    [ "$(confere "$arq" "$achou/$arq?nocache=$RANDOM$RANDOM$tentativa")" = "IGUAL" ] \
      || printf '%s\n' "$arq" >> /tmp/ausentes.txt
  done < /tmp/alvos.txt
  if [ ! -s /tmp/ausentes.txt ]; then
    echo "Chegou ao servidor: os $(grep -c . /tmp/alvos.txt) arquivos são os deste commit."
    break
  fi
  echo "Tentativa ${tentativa}: ainda não chegou →$(sed 's/^/ · /' /tmp/ausentes.txt | tr '\n' ' ')"
  [ "$tentativa" = "10" ] || sleep 30
done

# ---- pergunta 2: o endereço do visitante devolve o certo? ----
#
# UMA vez por arquivo, e só agora que a 1 passou. Em laço, este
# trecho seria o próprio envenenador.
: > /tmp/cdn-velho.txt
if [ ! -s /tmp/ausentes.txt ]; then
  echo
  echo "Conferindo o endereço que o visitante pede (um pedido por arquivo):"
  while IFS= read -r arq; do
    [ -n "$arq" ] || continue
    if estampado "$arq"; then
      url="$achou/$arq?v=$(esperado8 "$arq")"
    else
      url="$achou/$arq"
    fi
    [ "$(confere "$arq" "$url")" = "IGUAL" ] && continue
    printf '%s\n' "$arq" >> /tmp/cdn-velho.txt
  done < /tmp/alvos.txt
  if [ ! -s /tmp/cdn-velho.txt ]; then
    echo "  todos: o visitante recebe a versão deste commit"
  fi
fi

if [ -s /tmp/cdn-velho.txt ]; then
  echo "::notice::O CDN da Hostinger ainda guarda a versão anterior destes, no endereço SEM a marca de versão: $(tr '\n' ' ' < /tmp/cdn-velho.txt). Não afeta ninguém — as páginas pedem o endereço com marca, e ali já vem a versão nova. Some sozinho em até 24h."
fi

if [ -s /tmp/ausentes.txt ]; then
  echo "::error::A publicação não chegou depois de 5 minutos, nem em pedidos repetidos. Não chegaram: $(tr '\n' ' ' < /tmp/ausentes.txt)"
  echo "Antes de mexer na Hostinger, confira se algum desses nomes tem espaço ou"
  echo "acento estranho, e se algum deles foi APAGADO neste commit: as duas coisas"
  echo "já fizeram esta conferência culpar a hospedagem sem motivo."
  echo "Se os nomes estiverem normais, então sim: confira se a Hostinger está ligada"
  echo "no Git desta branch (main) e com deploy automático."
  falhou=1
fi

echo
if [ "$falhou" = "1" ]; then
  echo "::error::O site está no ar, mas com problema — está apontado acima."
  exit 1
fi
echo "A Pharma Fit está no ar, inteira e na versão deste commit: $achou"
