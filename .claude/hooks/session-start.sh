#!/bin/bash
set -euo pipefail

# Site statique (GitHub Pages) : aucune dépendance à installer.
# On lance une validation légère (JSON, syntaxe JS, assets) pour éviter de
# travailler/déployer sur une version cassée. Non bloquant pour le démarrage.

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

if [ -f scripts/check.sh ]; then
  bash scripts/check.sh || echo "⚠️  Le lint a relevé des problèmes (voir ci-dessus)."
fi
