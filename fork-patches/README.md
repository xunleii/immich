# fork-patches/

Ce dossier contient l'historique des features maison de ce fork, sous
forme de patchs `git format-patch`, un fichier par feature, appliqués
dans l'ordre défini par `series`.

## Modèle

- La branche `main` de ce repo est un **miroir strict** de
  `immich-app/immich:main` — jamais de commit direct dessus.
- La branche `fork` = `main` + un commit par patch listé dans `series`,
  dans l'ordre, synchronisée périodiquement avec upstream via un
  **merge** (bouton "Sync fork" de GitHub utilisé directement sur la
  branche `fork`, ou `./scripts/fork-sync.sh` en local — les deux font
  la même chose). C'est la branche qu'on build/déploie.
- Chaque commit "feature" sur `fork` porte un trailer git
  `Fork-Patch: NNNN-nom-court` et correspond exactement à un fichier
  `NNNN-nom-de-la-feature.patch` ici. C'est ce trailer, pas la position
  dans l'historique, qui identifie un commit comme patch de feature —
  robuste aux commits de merge et d'infra qui s'intercalent entre deux
  patches au fil des synchronisations. Un fichier `.md` de même nom
  documente les fichiers touchés, les risques de conflit connus, et les
  commandes de régénération/validation à relancer après une sync.

## Voir aussi

Toute la mécanique (mise à jour depuis upstream, résolution de conflits,
ajout d'une nouvelle feature) est documentée dans le skill Claude :
[`.claude/skills/fork-patch-sync/SKILL.md`](../.claude/skills/fork-patch-sync/SKILL.md).

Le script `scripts/fork-sync.sh` automatise le merge + la régénération
des patchs après résolution de conflits (ou juste la régénération seule
via `--export-patches`, après une sync faite depuis GitHub).

## Ajouter une nouvelle feature

1. Développer normalement sur la branche `fork`, en un commit unique et
   autonome par feature (squash avant de finaliser), avec un trailer
   `Fork-Patch: NNNN-nom-court` dans le message de commit.
2. `./scripts/fork-sync.sh --export-patches` — génère automatiquement
   `fork-patches/NNNN-nom-court.patch` à partir du trailer.
3. Ajouter `NNNN-nom-court.patch` à la fin de `series`.
4. Écrire `NNNN-nom-court.md` (copier la structure d'un fichier
   existant) : fichiers touchés, risques de conflit, commandes de
   régénération/validation spécifiques à cette feature.
5. Committer le tout sur `fork`.
