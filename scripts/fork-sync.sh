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
  # Régénère fork-patches/*.patch à partir des commits de `fork` situés
  # après le point où `fork` divergeait de `main` avant ce sync.
  base_sha=$(git merge-base main fork)
  rm -f fork-patches/*.patch
  git format-patch "$base_sha" --output-directory fork-patches/ --numbered --zero-commit --no-signature >/dev/null

  # Renomme selon la convention NNNN-nom-court.patch en gardant l'ordre
  # de fork-patches/series existant si les titres correspondent, sinon
  # laisse les noms générés par git (préfixe numérique déjà correct) et
  # prévient l'utilisateur de vérifier `series` à la main.
  echo "==> Patches régénérés dans fork-patches/. Vérifie que fork-patches/series"
  echo "    liste bien les mêmes fichiers dans le même ordre (renomme si besoin)."
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
