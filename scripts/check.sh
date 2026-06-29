#!/bin/bash
# Vérification légère du site statique (JSON, syntaxe JS, assets référencés).
# Utilisable à la main : bash scripts/check.sh
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
fail=0

echo "🔎 Vérification du site Arthur & Mathilde…"

# 1. Fichiers JSON valides
for f in data/config.json data/gifts.json manifest.webmanifest; do
  if node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" 2>/dev/null; then
    echo "  ✅ JSON valide : $f"
  else
    echo "  ❌ JSON invalide : $f"; fail=1
  fi
done

# 2. Syntaxe JavaScript
if node --check js/app.js 2>/dev/null; then
  echo "  ✅ Syntaxe JS : js/app.js"
else
  echo "  ❌ Erreur de syntaxe : js/app.js"; fail=1
fi

# 3. Assets référencés présents
for a in assets/france.svg assets/japan.svg assets/gate-roof.svg assets/gate-pillar.svg \
         assets/gate-base.svg assets/og-image.png assets/icon-192.png assets/icon-512.png; do
  if [ -f "$a" ]; then echo "  ✅ présent : $a"; else echo "  ❌ manquant : $a"; fail=1; fi
done

# 4. Récapitulatif de la liste de cadeaux (info)
node -e "const g=JSON.parse(require('fs').readFileSync('data/gifts.json','utf8')).gifts; const ids=g.map(x=>x.id); const dup=ids.filter((id,i)=>ids.indexOf(id)!==i); console.log('  ℹ️  '+g.length+' activités, total '+g.reduce((s,x)=>s+(+x.price||0),0)+' €'); if(dup.length){console.log('  ❌ ids en double : '+dup.join(', ')); process.exit(1);}" || fail=1

if [ "$fail" -eq 0 ]; then echo "✅ Tout est bon."; else echo "‼️  Des problèmes ont été détectés."; fi
exit $fail
