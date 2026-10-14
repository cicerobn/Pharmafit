#!/usr/bin/env bash
# A CONFERÊNCIA DE IMAGEM, MEDIDA CONTRA UM SERVIDOR DE VERDADE.
#
# Rode assim, da raiz do site:   bash provas/conferir-imagem.sh
#
# POR QUE ESTA PROVA EXISTE
#
# 14/10/2026: a conferência "Conferir o site no ar" reprovou dez
# tentativas seguidas, cinco minutos, dizendo que duas imagens não
# tinham chegado — uma delas a foto grande da página inicial. O
# diagnóstico pediu as duas no servidor: HTTP 200, JPEG válido, nos
# três endereços. Estavam no ar desde sempre.
#
# Quem errava era a conferência. Para JPEG o `file` escreve a
# densidade ("density 1x1") ANTES da medida da imagem, e a função que
# lia a medida pegava o 1x1. De um lado 1x1, do outro 1600x941: toda
# JPEG do site reprovava, todo dia, sem motivo. E conferência que
# grita sem motivo é pior que conferência nenhuma — ela ensina a gente
# a ignorar o vermelho.
#
# COMO ESTA PROVA FUNCIONA
#
# Ela não copia as funções: ARRANCA do .github/conferir-no-ar.sh as
# funções de verdade e roda aquilo. Se alguém mexer lá e quebrar, esta
# prova quebra.
#
# E o servidor do outro lado devolve o que a Hostinger devolve de
# verdade: a mesma imagem recomprimida, com o cabeçalho reescrito de
# JFIF para Exif — foi assim que o diagnóstico a mediu no ar.
set -u
cd "$(dirname "$0")/.."
RAIZ="$PWD"
SCRIPT="$RAIZ/.github/conferir-no-ar.sh"
[ -f "$SCRIPT" ] || { echo "não achei $SCRIPT"; exit 1; }

# As funções, arrancadas por MARCA e não por número de linha: número
# de linha vira mentira no primeiro commit que mexer no arquivo.
trecho="$(sed -n '/^eh_imagem()/,/^# ---- pergunta 1/p' "$SCRIPT" | sed '$d')"
printf '%s' "$trecho" | grep -q 'confere()' \
  || { echo "PROVA QUEBRADA: não achei confere() no trecho arrancado"; exit 1; }
NAVEGADOR="Mozilla/5.0 (prova)"
eval "$trecho"

# E a função que escapa o nome para virar endereço, que mora no começo
# do arquivo.
escapador="$(grep '^pro_endereco() ' "$SCRIPT")"
[ -n "$escapador" ] \
  || { echo "PROVA QUEBRADA: não achei pro_endereco() no $SCRIPT"; exit 1; }
eval "$escapador"

ok=0; mal=0
diz() { if [ "$1" = "sim" ]; then echo "  ok     $2"; ok=$((ok+1));
        else echo "  FALHOU $2"; mal=$((mal+1)); fi; }

PASTA="$(mktemp -d)"

# O `kill` DE PERTINHO DO PÉ. Eu havia escrito `kill ${servidor:-0}`, e
# `kill 0` em bash não é "não mata ninguém": é MATA O GRUPO TODO,
# inclusive esta prova. Quando a prova saía antes de subir o servidor
# — por exemplo para dizer "não rodou, falta Pillow", que é saída 2 —
# o trap a matava e ela saía 143. O publicador compara a saída com 2,
# então um ambiente sem biblioteca reprovaria uma publicação boa.
limpar() {
  if [ -n "${servidor:-}" ]; then
    kill "$servidor" 2>/dev/null
    wait "$servidor" 2>/dev/null
  fi
  [ -n "${PASTA:-}" ] && rm -rf "$PASTA"
  return 0
}
trap limpar EXIT

# A imagem de referência é a maior JPEG do site — a que reprovava.
REPO="$(ls -S "$RAIZ"/assets/img/*.jpg "$RAIZ"/assets/img/*.jpeg 2>/dev/null | head -1)"
[ -n "$REPO" ] || { echo "PROVA QUEBRADA: o site não tem nenhuma JPEG"; exit 1; }

# ---- o que a Hostinger devolve, reproduzido ----
#
# Recomprimir e redimensionar: pelo Pillow se a máquina tiver, senão
# pelo `convert` do ImageMagick. Uma das duas sempre tem — e eu não
# quero que esta prova deixe de rodar por causa de biblioteca.
if python3 -c 'import PIL' 2>/dev/null; then
  python3 -I -c '
import sys
from PIL import Image
o, pasta = sys.argv[1], sys.argv[2]
im = Image.open(o)
im.save(pasta + "/t.jpg", "JPEG", quality=82)
im.resize((im.width - 60, im.height - 40)).save(pasta + "/t2.jpg", "JPEG", quality=90)
' "$REPO" "$PASTA"
elif command -v convert >/dev/null 2>&1; then
  convert "$REPO" -quality 82 "$PASTA/t.jpg"
  convert "$REPO" -resize '94%' -quality 90 "$PASTA/t2.jpg"
else
  echo "PROVA NÃO RODOU: esta máquina não tem Pillow nem ImageMagick."
  echo "Nada foi medido — isto NÃO é defeito do conferir-no-ar.sh."
  exit 2
fi

# E a troca do cabeçalho JFIF por Exif, que é o que a Hostinger faz na
# entrega. Isto é python de fábrica, sem biblioteca nenhuma.
python3 -I -c '
import struct, sys
def para_exif(entrada, saida):
    b = open(entrada, "rb").read()
    i = 2
    if b[i:i+2] == b"\xff\xe0":
        i += 2 + struct.unpack(">H", b[i+2:i+4])[0]
    tiff = (b"MM\x00*\x00\x00\x00\x08\x00\x01"
            b"\x01\x1a\x00\x05\x00\x00\x00\x01\x00\x00\x00\x1a\x00\x00\x00\x00")
    carga = b"Exif\x00\x00" + tiff
    app1 = b"\xff\xe1" + struct.pack(">H", len(carga) + 2) + carga
    open(saida, "wb").write(b[:2] + app1 + b[i:])
pasta, origem = sys.argv[1], sys.argv[2]
para_exif(pasta + "/t.jpg",  pasta + "/recomprimida.jpg")
para_exif(pasta + "/t2.jpg", pasta + "/encolhida.jpg")
open(pasta + "/cortada.jpg", "wb").write(open(origem, "rb").read()[:300])
' "$PASTA" "$REPO"

[ -s "$PASTA/recomprimida.jpg" ] || { echo "PROVA QUEBRADA: não consegui montar as imagens"; exit 1; }
# Se a recompressão tiver MUDADO as medidas, a prova mediria a coisa
# errada e eu nem saberia.
if [ "$(medidas "$REPO")" != "$(medidas "$PASTA/recomprimida.jpg")" ]; then
  echo "PROVA QUEBRADA: a recompressão mudou as medidas ($(medidas "$REPO") → $(medidas "$PASTA/recomprimida.jpg"))."
  echo "A Hostinger mantém as medidas; esta prova tem de manter também."
  exit 1
fi

CSS="$(ls "$RAIZ"/assets/css/*.css | head -1)"
cp "$CSS" "$PASTA/estilo.css"

# O SERVIDOR DA PROVA, e três cuidados que custaram uma rodada inteira.
#
# Na primeira vez eu escrevi `(cd "$PASTA" && python3 -m http.server) &`
# e matei "$!" no fim. "$!" é o subshell, não o python: o python ficou
# vivo segurando a porta. A rodada seguinte não conseguiu subir
# servidor nenhum, TODO pedido voltou SEM-RESPOSTA, e a prova acusou
# seis defeitos que não existiam — inclusive na versão certa do
# script. Prova que grita sem medir nada é pior que prova nenhuma.
#
#   1. `exec` dentro do subshell: aí "$!" É o python, e o trap o mata.
#   2. porta sorteada e conferida: se outra coisa estiver na porta, eu
#      não vou medir a outra coisa achando que é a minha.
#   3. logo abaixo, a prova confere se ELA PRÓPRIA está vendo o
#      servidor, e se não estiver diz PROVA QUEBRADA em vez de
#      reprovar o script.
PORTA=0
for tentativa in 1 2 3 4 5; do
  p=$(( 8700 + RANDOM % 900 ))
  curl -fsS --max-time 1 -o /dev/null "http://127.0.0.1:$p/" 2>/dev/null && continue
  PORTA=$p; break
done
[ "$PORTA" != "0" ] || { echo "PROVA QUEBRADA: não achei porta livre"; exit 1; }

(cd "$PASTA" && exec python3 -m http.server "$PORTA" --bind 127.0.0.1 >/dev/null 2>&1) &
servidor=$!
BASE="http://127.0.0.1:$PORTA"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS --max-time 1 -o /dev/null "$BASE/recomprimida.jpg" 2>/dev/null && break
  sleep 0.3
done
if ! curl -fsS --max-time 3 -o /dev/null "$BASE/recomprimida.jpg" 2>/dev/null; then
  echo "PROVA QUEBRADA: o servidor da prova não respondeu na porta $PORTA."
  echo "Nada foi medido — isto NÃO é defeito do conferir-no-ar.sh."
  exit 1
fi

echo
echo "===========  a imagem que a Hostinger recomprimiu  ==========="
echo "    arquivo daqui:  $(stat -c%s "$REPO") bytes · md5 $(md5sum "$REPO" | cut -c1-12)"
echo "    o que vem de lá: $(stat -c%s "$PASTA/recomprimida.jpg") bytes · md5 $(md5sum "$PASTA/recomprimida.jpg" | cut -c1-12)"
echo "                     (md5 DIFERENTE — e tem de passar assim)"
r="$(confere "$REPO" "$BASE/recomprimida.jpg")"
[ "$r" = "IGUAL" ] && diz sim "recompressão da hospedagem PASSA" \
                   || diz nao "recompressão da hospedagem reprovou — era o defeito de 14/10: $r"

echo
echo "===========  e o que tem de continuar sendo pego  ==========="
r="$(confere "$REPO" "$BASE/encolhida.jpg")"
[ "$r" = "DIFERENTE" ] && diz sim "imagem com OUTRAS MEDIDAS é pega" \
                       || diz nao "imagem encolhida passou batido: $r"
r="$(confere "$REPO" "$BASE/cortada.jpg")"
[ "$r" = "DIFERENTE" ] && diz sim "imagem CORTADA no meio da publicação é pega" \
                       || diz nao "imagem cortada passou batido: $r"
r="$(confere "$REPO" "$BASE/nao-existe-mesmo.jpg")"
[ "$r" = "SEM-RESPOSTA" ] && diz sim "404 continua sendo 404" \
                          || diz nao "404 virou outra coisa: $r"

echo
echo "===========  arquivo de texto ainda é byte por byte  ==========="
r="$(confere "$CSS" "$BASE/estilo.css")"
[ "$r" = "IGUAL" ] && diz sim "CSS igual passa" || diz nao "CSS igual reprovou: $r"
printf '\n/* um byte a mais */\n' >> "$PASTA/estilo.css"
r="$(confere "$CSS" "$BASE/estilo.css")"
[ "$r" = "DIFERENTE" ] && diz sim "CSS com UM byte de diferença é pego" \
                       || diz nao "CSS alterado passou batido — a regra de imagem vazou para texto: $r"

echo
echo "===========  o relatório diz POR QUE  ==========="
: > /tmp/detalhe-imagem.txt
confere "$REPO" "$BASE/encolhida.jpg" >/dev/null
if grep -q 'servidor' /tmp/detalhe-imagem.txt; then
  diz sim "escreveu a medida dos dois lados: $(tail -1 /tmp/detalhe-imagem.txt | sed "s|$RAIZ/||" | cut -c1-80)"
else
  diz nao "não escreveu o motivo (o relatório diria só 'não chegou')"
fi

echo
echo "===========  nome com espaço: a conferência consegue pedir?  ==========="
#
# A conferência reprovou a foto da página inicial — "WhatsApp Image
# 2026-09-23 at 22.05.30.jpeg" — porque montava o endereço com os
# espaços crus, e o curl recusa isso antes de sair da máquina. Aqui o
# arquivo EXISTE no servidor: se o pedido falhar, é a conferência que
# não sabe pedir.
cp "$PASTA/recomprimida.jpg" "$PASTA/Foto Com Espaco No Nome.jpg"
r="$(confere "$REPO" "$BASE/$(pro_endereco 'Foto Com Espaco No Nome.jpg')")"
[ "$r" = "IGUAL" ] && diz sim "arquivo com espaço no nome é pedido e encontrado" \
                   || diz nao "não deu para pedir o arquivo com espaço: $r"
r="$(confere "$REPO" "$BASE/Foto Com Espaco No Nome.jpg")"
[ "$r" = "SEM-RESPOSTA" ] && diz sim "e sem escapar, o pedido nem sai — era o defeito de 14/10" \
                         || diz nao "sem escapar funcionou; então o escape não era o problema: $r"

echo
echo "===========  o que a conferência cobra da Hostinger  ==========="
#
# Eu mesmo causei isto hoje: criei esta prova como .sh, ela entrou na
# lista dos arquivos publicáveis, e a conferência passou cinco minutos
# cobrando da hospedagem um arquivo que o .htaccess recusa DE
# PROPÓSITO. As duas listas têm de fechar: o que o site publica tem de
# chegar igual, e o que é ferramenta tem de dar 404.
publicaveis="$(sed -n '/^ARQUIVOS=\$(find/,/sort)$/p' "$SCRIPT")"
ferramentas="$(sed -n '/^FERRAMENTAS_CI=\$(find/,/sort)$/p' "$SCRIPT")"
if [ -z "$publicaveis" ] || [ -z "$ferramentas" ]; then
  diz nao "PROVA QUEBRADA: não achei as duas listas no $SCRIPT"
else
  eval "$publicaveis"; eval "$ferramentas"
  eu="provas/$(basename "$0")"
  printf '%s\n' "$ARQUIVOS" | grep -qx "$eu" \
    && diz nao "esta prova está na lista dos publicáveis — a conferência vai cobrá-la da Hostinger" \
    || diz sim "nenhum .sh na lista do que a Hostinger tem de publicar"
  printf '%s\n' "$FERRAMENTAS_CI" | grep -qx "$eu" \
    && diz sim "e esta prova está na lista do que tem de dar 404" \
    || diz nao "esta prova NÃO está na lista do que tem de dar 404 — ninguém confere se ela está exposta"
  grep -q 'FilesMatch "\\\.(sql|ts|md|yml|yaml|sh)\$"' "$RAIZ/.htaccess" \
    && diz sim "e o .htaccess recusa .sh, que é o que torna isso verdade" \
    || diz nao "o .htaccess NÃO recusa .sh — então esta prova está baixável no site"
fi

echo
echo "===========  todas as imagens do site têm medida legível  ==========="
sem_medida=""
while IFS= read -r f; do
  [ -n "$f" ] || continue
  [ -n "$(medidas "$f")" ] || sem_medida="$sem_medida $f"
done < <(git ls-files -z 2>/dev/null | tr '\0' '\n' | grep -Ei '\.(png|jpg|jpeg|webp|gif)$')
[ -z "$sem_medida" ] && diz sim "as $(git ls-files | grep -Eic '\.(png|jpg|jpeg|webp|gif)$') imagens do site" \
                     || diz nao "sem medida legível:$sem_medida"

echo
if [ "$mal" = "0" ]; then echo "Tudo passou — $ok ok, 0 falhou"; exit 0; fi
echo "FALTA CONSERTAR — $ok ok, $mal falhou"; exit 1
