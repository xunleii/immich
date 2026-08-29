# 0001-admin-share-allowlist

## Résumé

Permet à l'admin d'activer, par compte utilisateur, une allowlist de
partage : dès qu'au moins une entrée existe pour un compte, celui-ci ne
peut plus partager qu'avec les utilisateurs listés. Un compte sans
entrée reste illimité (comportement stock Immich, inchangé).

Côté UX : le sélecteur "partager l'album avec…" (`AlbumAddUsersModal`)
est pré-filtré via `GET /users/me/share-allowlist` — un compte
restreint ne voit que les utilisateurs autorisés au lieu de se prendre
un `BadRequestException` au moment de valider. Allowlist vide =
sélecteur inchangé (tous les utilisateurs).

## Fichiers touchés (par catégorie)

| Catégorie | Fichiers | Note pour un conflit |
|---|---|---|
| Schéma DB | `server/src/schema/tables/user-share-allowlist.table.ts`, `server/src/schema/index.ts` | Nouvelle table isolée, conflit improbable sauf ajout d'une autre table `User*` juste à côté dans `index.ts` — garder les deux entrées |
| Migration | `server/src/schema/migrations/1787200000000-AddUserShareAllowlist.ts` | Fichier neuf, jamais de conflit possible. Si le timestamp collisionne avec une migration upstream, renommer le fichier avec un timestamp plus récent (`date +%s%3N`) |
| Logique métier | `server/src/repositories/user.repository.ts` (méthodes ajoutées en fin de fichier), `server/src/services/album.service.ts` (`create`/`addUsers` + `requireShareAllowed`), `server/src/services/user.service.ts` (`getMyShareAllowlist`) | Conflit possible si upstream modifie `create`/`addUsers` (zone gelée upstream, donc rare) ; `user.service.ts` = méthode ajoutée après `getMe`, insertion additive |
| DTOs | `server/src/dtos/user.dto.ts` (bloc ajouté en fin de fichier) | Rare |
| API admin | `server/src/controllers/user-admin.controller.ts`, `server/src/services/user-admin.service.ts` | Rare, insertion en fin de fichier |
| API user | `server/src/controllers/user.controller.ts` (`GET me/share-allowlist`, ajouté après `me/calendar-heatmap`) | Rare, insertion additive |
| Tests | `server/src/services/album.service.spec.ts`, `server/src/services/user.service.spec.ts` (`describe('getMyShareAllowlist')`) | Peut nécessiter un ajustement mineur si upstream modifie les fixtures `AlbumFactory`/`UserFactory` |
| **Généré — ne jamais résoudre à la main** | `open-api/immich-openapi-specs.json`, `packages/sdk/src/fetch-client.ts` | **Toujours régénérer**, voir commandes ci-dessous. Ne JAMAIS merger ces fichiers manuellement même en cas de conflit trivial |
| i18n | `i18n/en.json` (clés `admin.share_allowlist*`, `admin.add_allowed_share_user`, `errors.unable_to_update_share_allowlist`) | Fichier trié automatiquement, conflits rares et résolubles en gardant les deux blocs puis en relançant `prettier --write` |
| Web | `web/src/lib/modals/ShareAllowlistAddModal.svelte` (nouveau), `web/src/lib/modals/AlbumAddUsersModal.svelte` (filtre le sélecteur via `getMyShareAllowlist`), `web/src/routes/admin/users/[id]/+layout.svelte`, `+layout.ts` | `+layout.svelte` est un fichier à fort trafic upstream — insertion additive (un bloc `AdminCard` autonome), donc conflit probable mais résolution simple. `AlbumAddUsersModal.svelte` : upstream le modifie parfois — le patch ne change que l'`onMount`, réappliquer le `Promise.all` + filtre |

## Commandes de régénération obligatoires après application/rebase

```bash
# 1. Rebuild + régénère le spec OpenAPI (nécessite Postgres local, voir README du skill)
cd server
npx nest build
export DB_URL="postgres://postgres:postgres@localhost:5432/immich"
node dist/bin/sync-open-api.js

# 2. Régénère le client SDK TypeScript
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
  src/services/album.service.spec.ts \
  src/services/user.service.spec.ts \
  src/services/user-admin.service.spec.ts \
  src/controllers/user-admin.controller.spec.ts

export DB_URL="postgres://postgres:postgres@localhost:5432/immich"
npx sql-tools -u "$DB_URL" migrations run
npx sql-tools -u "$DB_URL" migrations generate tmp   # doit dire "No changes detected"

cd ../web
npx tsc --noEmit
npx svelte-check --no-tsconfig --compiler-warnings 'state_referenced_locally:ignore'
npx eslint . --max-warnings 0
npx vite build
```

## Endpoints ajoutés

- `GET /admin/users/:id/share-allowlist`
- `PUT /admin/users/:id/share-allowlist` (`{ allowedUserIds: string[] }`, tableau vide = désactive l'allowlist)
- `GET /users/me/share-allowlist` — allowlist du compte courant (non-admin), pour pré-filtrer le sélecteur de partage côté web

Permissions réutilisées : `AdminUserRead` / `AdminUserUpdate` pour l'API admin, `UserRead` pour `me/share-allowlist` (aucune nouvelle permission créée).

## Non couvert (limitations connues)

- Le partage "Partner" (bibliothèque entière, `partner.service.ts`) n'est
  pas concerné — feature distincte
- Les liens de partage publics (`shared-link`) ne ciblent pas un
  utilisateur précis, donc non concernés par construction
- SDK Dart (mobile) non régénéré — seul le SDK TypeScript (web) l'est

## Dernière validation complète (état au moment de l'écriture)

- Migration rejouée sur Postgres 16 + pgvector, base vierge + toutes les
  migrations existantes du projet — succès, rollback testé
- `sql-tools migrations generate` → "No changes detected" (zéro drift)
- `album.service.spec.ts` : 66/66 tests (dont 2 couvrant le blocage)
- `user-admin.service.spec.ts` + `user-admin.controller.spec.ts` : 29/29
- `tsc --noEmit` + `svelte-check` sur tout `web/` : 0 erreur, 0 warning
- `eslint . --max-warnings 0` sur tout `web/` : propre
- `vite build` (build de prod) : succès

## Validation du raffinement "pré-filtrage du sélecteur" (commit séparé, à squasher)

- `nest build` : OK
- `vitest` `user.service.spec.ts` (29/29, dont 2 nouveaux `getMyShareAllowlist`)
  + `album.service.spec.ts` (66/66)
- `node dist/bin/sync-open-api.js` (mode PREVIEW, sans DB) → spec régénéré
  **identique** à l'entrée `/users/me/share-allowlist` ajoutée
- `oazapfts` → `fetch-client.ts` régénéré, `getMyShareAllowlist` identique
- `web` : `tsc --noEmit` OK, `svelte-check` 0/0, `eslint` sur
  `AlbumAddUsersModal.svelte` propre
- Pas de migration / changement de schéma → aucun risque de drift
