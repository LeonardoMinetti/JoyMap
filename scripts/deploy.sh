#!/usr/bin/env bash
# Publica um deploy nomeado e categorizado.
# Uso: scripts/deploy.sh <categoria> "<nome do deploy>"
# Categorias: site | login | criador | explorador | restaurante | admin | mapa | conteudo | ajuste | docs
# O commit fica "[categoria] nome", ganha a tag deploy/<categoria>/NNN-slug, entra em DEPLOYS.md e o push na main
# dispara o workflow (Actions) que testa, gera a demonstração e publica no GitHub Pages.
set -euo pipefail
cd "$(dirname "$0")/.."
CATS="site login criador explorador restaurante admin mapa conteudo ajuste docs"
CAT="${1:-}"; NOME="${2:-}"
[[ " $CATS " == *" $CAT "* && -n "$NOME" ]] || { echo "uso: scripts/deploy.sh <categoria> \"<nome>\"   categorias: $CATS"; exit 1; }
npm test --silent >/dev/null
N=$(printf '%03d' $(( $(git tag -l 'deploy/*' | wc -l) + 1 )))
SLUG=$(printf '%s' "$NOME" | iconv -f utf8 -t ascii//TRANSLIT 2>/dev/null | tr 'A-Z' 'a-z' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//' | cut -c1-40)
TAG="deploy/$CAT/$N-$SLUG"
DATA=$(date '+%Y-%m-%d %H:%M')
[ -f DEPLOYS.md ] || printf '# Deploys\n\nCada deploy é nomeado e categorizado: `[categoria] nome`. Tag: `deploy/<categoria>/NNN-slug`.\n\n| Nº | Data | Categoria | Nome | Tag |\n|---|---|---|---|---|\n' > DEPLOYS.md
echo "| $N | $DATA | $CAT | $NOME | \`$TAG\` |" >> DEPLOYS.md
git add -A
git commit -q -m "[$CAT] $NOME"
git tag "$TAG"
git push -q origin main "$TAG"
echo "deploy $N publicado: [$CAT] $NOME  ($TAG)"
