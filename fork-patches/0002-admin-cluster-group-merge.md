# 0002-admin-cluster-group-merge

## Résumé

Permet à l'admin de fusionner directement un utilisateur dans le groupe
de reconnaissance faciale ("cluster group") d'un autre compte, sans
passer par le flow self-service invite/accept déjà existant upstream
(v3.2.0). Une fois fusionnés, les deux comptes partagent les mêmes
personnes nommées (reconnues) à travers leurs bibliothèques.

Cas d'usage concret : P1 possède des photos avec des personnes nommées.
L'admin veut que P2 bénéficie de cette reconnaissance sans que P1 ait à
inviter P2 et que P2 accepte.

**Dépend du feature upstream "Cluster Groups"** (tables `cluster_group`,
`person_group`, colonne `user.clusterGroupId`, méthode
`personRepository.reassignCluster`) — ce patch ne fait qu'ajouter une
voie d'accès admin à un mécanisme déjà présent et testé upstream. Si
upstream supprime ou renomme ce mécanisme, ce patch cessera de
s'appliquer proprement — voir section conflits.

## Fichiers touchés (par catégorie)

| Catégorie | Fichiers | Note pour un conflit |
|---|---|---|
| DTOs | `server/src/dtos/cluster-group-admin.dto.ts` (nouveau fichier) | Jamais de conflit possible, fichier neuf |
| API admin | `server/src/controllers/user-admin.controller.ts`, `server/src/services/user-admin.service.ts` | Insertion en fin de fichier, partagé avec le patch 0001 (même fichiers) — conflit rare, résolution triviale si ça arrive (garder les deux blocs) |
| Tests | `server/src/services/user-admin.service.spec.ts` | Partagé avec le patch 0001 également |
| **Généré — ne jamais résoudre à la main** | `open-api/immich-openapi-specs.json`, `packages/sdk/src/fetch-client.ts` | Toujours régénérer, voir commandes ci-dessous |
| i18n | `i18n/en.json` (clés `admin.cluster_group*`, `admin.add_cluster_group_member`, `errors.unable_to_update_cluster_group`) | Attention : il existe DÉJÀ des clés top-level `cluster_group*` (feature self-service upstream) — les nôtres sont sous le namespace `admin.*`, donc pas de collision de clé, mais vérifier après un merge que le tri alphabétique n'a pas mélangé les deux groupes de façon trompeuse |
| Web | `web/src/lib/modals/ClusterGroupAdminAddModal.svelte` (nouveau), `web/src/routes/admin/users/[id]/+layout.svelte`, `+layout.ts` | `+layout.svelte`/`+layout.ts` partagés avec le patch 0001 — conflit probable si les deux patches touchent la même zone du fichier en même temps lors d'un rebase, résolution en gardant les deux blocs de card |
| **Dépendance upstream fragile** | `server/src/repositories/user.repository.ts` (méthode `get`, colonne `clusterGroupId` incluse dans `columns.userAdmin`), `server/src/repositories/person.repository.ts` (`reassignCluster`), `server/src/repositories/cluster-group.repository.ts` (`getUsers`, `create`) | **On ne modifie aucun de ces fichiers** — ce patch les consomme tels quels. Si upstream change la signature de `reassignCluster` ou retire `clusterGroupId` de la sélection admin, la compilation cassera immédiatement (erreur TS claire, pas un bug silencieux) — corriger l'appel dans `user-admin.service.ts` en conséquence |

## Commandes de régénération obligatoires après application/rebase

Identiques au patch 0001 :

```bash
cd server
npx nest build
export DB_URL="postgres://postgres:postgres@localhost:5432/immich"
node dist/bin/sync-open-api.js

cd ..
npx oazapfts@7.5.0 --optimistic --argumentStyle=object --useEnumType --allSchemas \
  open-api/immich-openapi-specs.json packages/sdk/src/fetch-client.ts
cd packages/sdk && pnpm run build
```

## Validation avant de considérer le patch à jour

```bash
cd server
npx nest build
npx vitest run --config test/vitest.config.mjs \
  src/services/user-admin.service.spec.ts \
  src/controllers/user-admin.controller.spec.ts

cd ../web
npx tsc --noEmit
npx svelte-check --no-tsconfig --compiler-warnings 'state_referenced_locally:ignore'
npx eslint . --max-warnings 0
npx vite build
```

Pas de migration DB propre à ce patch (aucune nouvelle table), donc pas
de vérification `sql-tools migrations generate` nécessaire pour ce
patch spécifiquement.

## Endpoints ajoutés

- `GET /admin/users/:id/cluster-group/members` — liste les comptes
  partageant la reconnaissance faciale avec `:id` (inclut `:id`
  lui-même)
- `PUT /admin/users/:id/cluster-group/members` (`{ userId }`) — fusionne
  `userId` dans le cluster group de `:id`
- `DELETE /admin/users/:id/cluster-group/members/:memberId` — retire
  `memberId` du cluster group de `:id`, lui donne un cluster group neuf
  et indépendant

Permissions réutilisées : `AdminUserRead` / `AdminUserUpdate`.

## Non couvert (limitations connues)

- Ne déclenche pas automatiquement les jobs de détection/reconnaissance
  faciale — c'est déjà possible nativement via la page admin "Jobs"
  (Face Detection / Facial Recognition, avec option "force" pour
  relancer)
- Pas de vue d'ensemble admin listant tous les cluster groups de
  l'instance — seulement la vue par utilisateur sur sa page de détail

## Dernière validation complète (état au moment de l'écriture)

- `nest build` : sans erreur
- `user-admin.service.spec.ts` : 20/20 (6 nouveaux tests pour cette feature)
- `user-admin.controller.spec.ts` : 15/15 (inchangé)
- `tsc --noEmit` + `svelte-check` sur tout `web/` : 0 erreur, 0 warning
- `eslint . --max-warnings 0` sur tout `web/` : propre
- `vite build` (build de prod) : succès
