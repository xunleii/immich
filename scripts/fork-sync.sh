#!/usr/bin/env bash
# fork-sync.sh — rebase la branche `fork` sur le dernier `main` upstream,
# puis régénère les fichiers fork-patches/*.patch pour qu'ils reflètent
# le nouvel état. À lancer depuis la racine du repo.
#
# Usage:
#   ./scripts/fork-sync.sh              # rebase interactif normal
#   ./scripts/fork-sync.sh --continue   # après résolution manuelle d'un conflit
#   ./scripts/fork-sync.sh --abort      # annule le rebase en cours
#
# Ce script NE régénère PAS automatiquement les fichiers générés
# (open-api spec, SDK TypeScript) — voir fork-patches/*.md pour les
# commandes exactes, propres à chaque patch, à relancer après un rebase
# réussi.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [[ "${1:-}" == "--abort" ]]; then
  git rebase --abort
  echo "Rebase annulé."
  exit 0
fi

if [[ "${1:-}" == "--continue" ]]; then
  echo "==> Reprise du rebase après résolution de conflit"
  git rebase --continue
  echo "==> Régénération des fichiers fork-patches/*.patch"
  "$0" --export-patches
  exit 0
fi

if [[ "${1:-}" == "--export-patches" ]]; then
  # Régénère fork-patches/*.patch à partir des commits de `fork` qui
  # portent un trailer "Fork-Patch: NNNN-nom-court" — c'est ce trailer,
  # pas la position dans l'historique, qui identifie un commit comme
  # "patch de feature" (par opposition aux commits d'infra comme celui-ci,
  # qui ne doivent jamais finir dans fork-patches/).
  base_sha=$(git merge-base main fork)
  shas=$(git log --format="%H" --reverse "$base_sha..fork")

  tmpdir=$(mktemp -d)
  found_any=false
  for sha in $shas; do
    name=$(git log -1 --format="%(trailers:key=Fork-Patch,valueonly)" "$sha" | head -1)
    if [[ -z "$name" ]]; then
      continue # commit d'infra, pas un patch de feature : on l'ignore
    fi
    found_any=true
    git format-patch -1 "$sha" --output-directory "$tmpdir" --start-number 1 --numbered-files --zero-commit --no-signature >/dev/null
    mv "$tmpdir"/1 "fork-patches/${name}.patch"
  done
  rm -rf "$tmpdir"

  if [[ "$found_any" == false ]]; then
    echo "==> Aucun commit avec trailer Fork-Patch trouvé, rien à exporter."
  else
    echo "==> Patches régénérés dans fork-patches/ (identifiés par trailer 'Fork-Patch:')."
    echo "    Vérifie que fork-patches/series liste bien les mêmes fichiers, dans le même ordre."
  fi
  exit 0
fi

echo "==> Fetch upstream"
git fetch origin main

echo "==> Vérification que main est un mirroir strict d'upstream/main"
if ! git merge-base --is-ancestor main origin/main; then
  echo "ERREUR: la branche locale 'main' a divergé d'origin/main."
  echo "Elle ne doit JAMAIS recevoir de commit direct. Investigue avant de continuer."
  exit 1
fi

echo "==> Fast-forward de main vers origin/main"
git checkout main
git merge --ff-only origin/main

echo "==> Rebase de fork sur le nouveau main"
git checkout fork
if git rebase main; then
  echo "==> Rebase réussi sans conflit"
  "$0" --export-patches
  echo ""
  echo "N'oublie pas de relancer les commandes de régénération + validation"
  echo "listées dans chaque fork-patches/*.md avant de push."
else
  echo ""
  echo "==> CONFLIT détecté. Fichiers en conflit :"
  git diff --name-only --diff-filter=U
  echo ""
  echo "Résous les conflits (voir fork-patches/*.md pour le contexte de"
  echo "chaque fichier concerné), puis relance :"
  echo "  ./scripts/fork-sync.sh --continue"
  exit 1
fi
