#!/usr/bin/env bash
# fork-sync.sh — synchronise la branche `fork` avec le dernier `main`
# upstream par un MERGE (pas un rebase), puis régénère les fichiers
# fork-patches/*.patch pour qu'ils reflètent l'état courant.
#
# Ce script fait la même chose que le bouton "Sync fork" de GitHub
# utilisé directement sur la branche `fork` : un vrai `git merge`, pas
# un rebase. Utile pour :
#   - tester/résoudre un conflit AVANT de synchroniser sur GitHub
#   - régénérer fork-patches/*.patch après une synchronisation faite
#     depuis l'UI GitHub (--export-patches seul suffit dans ce cas,
#     après un `git pull` sur `fork`)
#
# Usage:
#   ./scripts/fork-sync.sh              # fetch + merge normal
#   ./scripts/fork-sync.sh --continue   # après résolution manuelle d'un conflit
#   ./scripts/fork-sync.sh --abort      # annule le merge en cours
#   ./scripts/fork-sync.sh --export-patches   # juste régénérer les .patch
#
# Ce script NE régénère PAS automatiquement les fichiers générés
# (open-api spec, SDK TypeScript) — voir fork-patches/*.md pour les
# commandes exactes, propres à chaque patch, à relancer après toute
# synchronisation réussie (via ce script OU via GitHub).

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [[ "${1:-}" == "--abort" ]]; then
  git merge --abort
  echo "Merge annulé."
  exit 0
fi

if [[ "${1:-}" == "--continue" ]]; then
  echo "==> Finalisation du merge après résolution de conflit"
  # git merge n'a pas de --continue natif : si tous les conflits sont
  # résolus (git add fait), il suffit de committer le merge en cours.
  if [[ -f .git/MERGE_HEAD ]]; then
    git commit --no-edit
  else
    echo "Pas de merge en cours (.git/MERGE_HEAD absent)."
  fi
  echo "==> Régénération des fichiers fork-patches/*.patch"
  "$0" --export-patches
  exit 0
fi

if [[ "${1:-}" == "--export-patches" ]]; then
  # Régénère fork-patches/*.patch à partir des commits de `fork` qui
  # portent un trailer "Fork-Patch: NNNN-nom-court" — c'est ce trailer,
  # pas la position dans l'historique, qui identifie un commit comme
  # "patch de feature" (par opposition aux commits d'infra ou de merge,
  # qui ne doivent jamais finir dans fork-patches/). Robuste aux commits
  # de merge : testé et validé sur un historique contenant un vrai merge
  # GitHub (Merge branch 'immich-app:main' into fork).
  base_sha=$(git merge-base main fork)
  shas=$(git log --format="%H" --reverse "$base_sha..fork")

  tmpdir=$(mktemp -d)
  found_any=false
  for sha in $shas; do
    name=$(git log -1 --format="%(trailers:key=Fork-Patch,valueonly)" "$sha" | head -1)
    if [[ -z "$name" ]]; then
      continue # commit d'infra ou de merge, pas un patch de feature : on l'ignore
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

echo "==> Merge de main dans fork"
git checkout fork
if git merge main --no-edit; then
  echo "==> Merge réussi sans conflit"
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
  echo "chaque fichier concerné, TOUS listés d'un coup contrairement à un"
  echo "rebase), 'git add' chaque fichier résolu, puis relance :"
  echo "  ./scripts/fork-sync.sh --continue"
  exit 1
fi
