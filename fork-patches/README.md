# fork-patches/

Ce dossier contient l'historique des features maison de ce fork, sous
forme de patchs `git format-patch`, un fichier par feature, appliqués
dans l'ordre défini par `series`.

## Modèle

- La branche `main` de ce repo est un **miroir strict** de
  `immich-app/immich:main` — jamais de commit direct dessus.
- La branche `fork` = `main` + un commit par patch listé dans `series`,
  dans l'ordre. C'est la branche qu'on build/déploie.
- Chaque commit sur `fork` correspond exactement à un fichier
  `NNNN-nom-de-la-feature.patch` ici. Un fichier `.md` de même nom
  documente les fichiers touchés, les risques de conflit connus, et les
  commandes de régénération/validation à relancer après un rebase.

## Voir aussi

Toute la mécanique (mise à jour depuis upstream, résolution de conflits,
ajout d'une nouvelle feature) est documentée dans le skill Claude :
[`.claude/skills/fork-patch-sync/SKILL.md`](../.claude/skills/fork-patch-sync/SKILL.md).

Le script `scripts/fork-sync.sh` automatise le rebase + la
régénération des patchs après résolution de conflits.

## Ajouter une nouvelle feature

1. Développer normalement sur la branche `fork` (ou une branche
   temporaire rebasée dessus), en un commit unique et autonome par
   feature (squash avant de finaliser).
2. `git format-patch -1 <sha> --output-directory fork-patches/` puis
   renommer en `NNNN-nom-court.patch` (numéro suivant dans `series`).
3. Ajouter `NNNN-nom-court.patch` à la fin de `series`.
4. Écrire `NNNN-nom-court.md` (copier la structure d'un fichier
   existant) : fichiers touchés, risques de conflit, commandes de
   régénération/validation spécifiques à cette feature.
5. Committer le tout sur `fork`.
