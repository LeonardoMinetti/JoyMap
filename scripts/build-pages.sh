#!/usr/bin/env bash
# Gera a versão estática (sem servidor) para o GitHub Pages em ./pages-dist
# Uso: scripts/build-pages.sh [/subcaminho/]   (padrão: /wagli-demo/)
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="${1:-/wagli-demo/}"
OUT="$PWD/pages-dist"
VITE_STATIC=1 WAGLI_BASE="$BASE" WAGLI_OUT="$OUT" npx vite build web

# mapa de demonstração (dados fictícios): mesma resposta que o servidor daria, salva como arquivo
TMP="$(mktemp -d)"; PORT=4391
DB_PATH="$TMP/pages.sqlite" PORT=$PORT node server/index.js >"$TMP/server.log" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true; rm -rf "$TMP"' EXIT
for i in $(seq 1 40); do curl -sf "http://localhost:$PORT/api/public/demo" -o "$OUT/demo.json" && break; sleep 0.25; done
test -s "$OUT/demo.json" || { echo "falha ao gerar demo.json"; cat "$TMP/server.log"; exit 1; }

# versão de teste: não deve aparecer em buscas
sed -i.bak 's#<meta charset="UTF-8" />#<meta charset="UTF-8" /><meta name="robots" content="noindex, nofollow" />#' "$OUT/index.html" && rm -f "$OUT/index.html.bak"
printf 'User-agent: *\nDisallow: /\n' > "$OUT/robots.txt"
cp "$OUT/index.html" "$OUT/404.html"   # o Pages serve 404.html em endereços como /@demo; o app roteia no navegador
touch "$OUT/.nojekyll"
echo "ok: $OUT ($(du -sh "$OUT" | cut -f1))"
