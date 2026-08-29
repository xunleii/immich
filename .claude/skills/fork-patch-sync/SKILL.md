---
name: fork-patch-sync
description: Use this skill when working in the xunleii/immich fork to sync with immich-app/immich upstream, resolve rebase conflicts on the `fork` branch, add a new home-grown feature as a patch, or validate the fork after any of the above. Triggers include "update the fork", "sync with upstream", "rebase fork", "add a new patch/feature to the fork", "resolve fork conflicts", or any mention of fork-patches/, the `fork` branch, or `scripts/fork-sync.sh` in this repo.
---

# Fork patch-sync (immich)

Ce repo est un fork de `immich-app/immich` maintenu selon un modèle
**patch-queue** : chaque feature maison (non mergeable upstream, souvent
à cause de leur feature-freeze sur "Sharing/Asset ownership") vit comme
**un seul commit git**, exporté en fichier `.patch` lisible dans
`fork-patches/`. Mettre à jour le fork = rebaser ces commits sur le
nouveau `main` upstream.

## Modèle mental

```
main    ── mirror strict de immich-app/immich:main, jamais de commit direct
fork    ── main + commit(s) listés dans fork-patches/series, dans l'ordre
```

`fork-patches/<NNNN-nom>.patch` = la sérialisation lisible de chaque
commit de `fork`. `fork-patches/<NNNN-nom>.md` documente, pour CETTE
feature précise : quels fichiers elle touche, où les conflits sont
probables, et quelles commandes relancer après un rebase (notamment la
régénération de fichiers générés — spec OpenAPI, SDK TypeScript — qui
ne doivent JAMAIS être résolus à la main en cas de conflit).

Toujours lire `fork-patches/README.md` et le(s) `.md` des patches
concernés avant d'agir — ils contiennent le contexte spécifique à
chaque feature que ce skill ne duplique pas.

## Tâche : mettre à jour le fork (sync upstream)

**Chemin principal (préféré par l'utilisateur)** : cliquer sur "Sync
fork" directement sur GitHub, sur la branche `fork` (pas `main`). C'est
un vrai `git merge`, pas un rebase — c'est pour ça que l'historique de
`fork` contient des commits `Merge branch 'immich-app:main' into fork`.
Le système de trailer `Fork-Patch:` a été testé et validé sur ce genre
d'historique : `--export-patches` (étape 2 ci-dessous) fonctionne
correctement quelle que soit la topologie (merge ou rebase), aucune
adaptation nécessaire.

1. L'utilisateur (ou toi) clique "Sync fork" sur GitHub. Si GitHub
   n'arrive pas à merger automatiquement (conflit), il proposera
   d'ouvrir une PR — dans ce cas, passe plutôt par le chemin local
   (section suivante) plutôt que de résoudre via l'éditeur web GitHub.
2. Une fois la sync GitHub faite : `git fetch fork fork:fork &&
   git checkout fork` en local, puis `git fetch origin main &&
   git checkout main && git merge --ff-only origin/main` pour que
   `main` reste un mirroir à jour (nécessaire pour que le calcul du
   trailer-scan dans `--export-patches` reste correct).
3. `./scripts/fork-sync.sh --export-patches` — régénère
   `fork-patches/*.patch` à partir de l'état courant de `fork` (le hash
   source change à chaque sync, donc le contenu du patch peut changer
   même sans conflit réel — normal, à commiter si différent).
4. Relance, pour CHAQUE patch listé dans `fork-patches/series`, les
   commandes de régénération + validation indiquées dans son `.md`
   (spec OpenAPI/SDK à régénérer, `nest build`, tests, `migrations
   generate` pour vérifier l'absence de drift, `svelte-check`,
   `vite build`). Ne jamais sauter cette étape même si la sync GitHub
   n'a montré aucun conflit — un merge propre au niveau Git n'implique
   pas que le code compile toujours ni que le spec OpenAPI est à jour.
5. Commit `fork-patches/*.patch` si leur contenu a changé, puis push.

**Chemin local alternatif** (pour tester/résoudre un conflit avant de
synchroniser sur GitHub, ou en headless sans passer par l'UI web) :
`./scripts/fork-sync.sh` fait le même travail que le bouton GitHub —
fetch upstream, fast-forward `main`, `git merge main` sur `fork` — puis
enchaîne automatiquement sur l'étape 3 ci-dessus en cas de succès.

## Tâche : résoudre un conflit de sync (merge)

Point d'entrée courant : le workflow `fork-sync-pr.yml` ouvre une PR
`sync/<tag>` → `fork` en auto-merge. Si elle n'a pas fusionné seule,
c'est un conflit : `git fetch origin fork:fork && git checkout fork &&
git merge sync/<tag>` en local, puis résoudre comme ci-dessous (ou
`./scripts/fork-sync.sh`, équivalent). Ne jamais résoudre via l'éditeur
web GitHub.

Contrairement à un rebase, un merge affiche TOUS les fichiers en
conflit d'un coup (pas commit par commit) — plus simple à traiter :

1. `git status` pour lister les fichiers en conflit.
2. Pour chaque fichier en conflit, identifie quel(s) patch(es) le
   touche(nt) en consultant le tableau "Fichiers touchés" de chaque
   `fork-patches/*.md` — plusieurs patches peuvent toucher le même
   fichier (ex: `user-admin.controller.ts` est partagé par 0001 et
   0002), lis les deux `.md` dans ce cas.
3. **Fichiers marqués "généré — ne jamais résoudre à la main"** (spec
   OpenAPI, SDK TypeScript) : ne tente jamais un merge manuel. Résous
   en gardant ta version (`git checkout --ours <fichier>`), puis
   régénère intégralement le fichier avec les commandes du `.md`
   correspondant une fois TOUS les conflits résolus et le merge commité.
4. **Fichiers de logique métier / DTOs / contrôleurs** : merge normal.
   Comprends l'intention de CHAQUE côté du conflit (le changement
   upstream ET le/les patch(es)) avant de trancher — ne prends jamais
   automatiquement "notre" version ou "leur" version sans lire les deux.
   Si upstream a renommé/déplacé une fonction qu'un patch appelle,
   adapte l'appel du patch au nouveau nom/emplacement plutôt que de
   rétablir l'ancien.
5. **`i18n/en.json`** : quasi toujours résoluble en gardant les deux
   blocs de clés (fichier volumineux, clés des patches isolées), puis
   `npx prettier --write i18n/en.json` pour retrier.
6. **`web/.../[id]/+layout.svelte`** ou tout fichier à insertion additive
   (un bloc de carte/route ajouté par un patch à côté d'autres blocs
   upstream ou d'un autre patch) : garde tous les blocs sauf si l'un
   remplace clairement l'autre.
7. Une fois un fichier résolu : `git add <fichier>`.
8. Quand TOUS les fichiers en conflit sont résolus : lance les
   commandes de validation de chaque `.md` concerné **avant** de
   finaliser le merge, pour attraper une résolution syntaxiquement
   correcte mais sémantiquement fausse.
9. `./scripts/fork-sync.sh --continue` — commite le merge et régénère
   automatiquement `fork-patches/*.patch`.
10. En cas de blocage réel (conflit qui remet en cause le design d'une
    feature elle-même, pas juste sa syntaxe) : `./scripts/fork-sync.sh
    --abort` et documente le problème plutôt que de forcer une
    résolution qui casserait une feature silencieusement.

## Tâche : builder l'image Docker du fork

L'image `immich-server` (backend + web statiques) se build directement
depuis `server/Dockerfile` — inchangé par nos patches, il consomme le
code source patché sans modification.

**En local** : `docker build -f server/Dockerfile --target server .`
build juste l'étage serveur (rapide, utile pour valider qu'un patch
compile). Le build complet (`docker build -f server/Dockerfile .`, sans
`--target`) inclut aussi web/cli/plugins et est nettement plus lourd —
prévoir plusieurs Go d'espace disque libre et du temps.

**En CI** : `.github/workflows/fork-build.yml` build et pousse l'image
complète sur `ghcr.io/<owner>/immich-server` à chaque push sur
`fork`, plus déclenchement manuel (`workflow_dispatch`). Utilise
`docker/build-push-action` avec cache GHA — pas de secret à configurer,
`GITHUB_TOKEN` suffit pour pousser sur GHCR (permission `packages:
write` déjà déclarée dans le workflow).

Ne touche jamais à l'image `immich-machine-learning` — ce fork ne la
modifie pas, donc l'image officielle upstream suffit pour ce service.

Avant de modifier `server/Dockerfile` lui-même (rare, seulement si un
futur patch a besoin d'une dépendance système supplémentaire par
exemple), valide toujours avec un build `--target server` local d'abord
— c'est l'étage qui compile réellement notre code TypeScript patché.



1. Développe sur la branche `fork` (HEAD = dernier patch appliqué).
   Utilise les commandes déjà en place comme référence de convention
   (regarde `fork-patches/0001-admin-share-allowlist.md` pour le niveau
   de détail attendu dans les métadonnées, `git show` sur le commit
   correspondant pour le niveau de qualité de code/tests attendu :
   toujours des tests unitaires à jour, migration testée sur Postgres
   réel avec `sql-tools migrations generate` pour vérifier le zéro-drift,
   `svelte-check`/`eslint`/`vite build` propres côté web si la feature
   touche le web).
2. Une fois la feature terminée et validée, squash-la en **un seul
   commit** (`git rebase -i` si plusieurs commits de travail) avec un
   message clair (résumé + détails + `Based on immich-app/immich@<sha
   du main actuel>` en dernière ligne).
3. Exporte-la : `git format-patch -1 <sha> --output-directory
   fork-patches/` puis renomme en `NNNN-nom-court.patch` (NNNN = numéro
   suivant dans `fork-patches/series`).
4. Ajoute `NNNN-nom-court.patch` à la fin de `fork-patches/series`.
5. Écris `fork-patches/NNNN-nom-court.md` sur le modèle de
   `0001-admin-share-allowlist.md` : tableau des fichiers touchés avec
   risque de conflit par fichier, commandes de régénération (si le
   patch touche des fichiers générés), commandes de validation.
6. Commit `fork-patches/` (le nouveau `.patch`, le `.md`, `series` mis à
   jour) — ce commit d'infra reste séparé du commit de feature lui-même.

## Validation générale (à relancer après toute opération de ce skill)

Nécessite un Postgres local avec pgvector pour la partie migration —
voir `fork-patches/0001-admin-share-allowlist.md` pour la commande
d'installation si l'environnement ne l'a pas déjà.

```bash
cd server && pnpm install && npx nest build
cd ../web && pnpm install && npx tsc --noEmit && npx eslint . --max-warnings 0
```

Ne jamais considérer un sync/ajout de patch terminé sans avoir relancé
au minimum ces deux commandes, en plus des commandes spécifiques
listées dans chaque `fork-patches/*.md` concerné par l'opération.

## Ce que ce skill NE fait PAS

- N'ouvre jamais de Pull Request, ni sur ce fork ni sur upstream, sauf
  demande explicite de l'utilisateur pour CE message précis.
- Ne push jamais sur le remote du fork sans confirmation explicite de
  l'utilisateur pour CE message précis, même si un sync/rebase a
  réussi localement.
- Ne mélange jamais deux features dans un même commit/patch — un
  fichier `.patch` = une feature = un commit.
