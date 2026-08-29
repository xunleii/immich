# fork-patches/

This folder holds the history of this fork's home-grown features as
`git format-patch` files — one file per feature, applied in the order
defined by `series`.

## Model

- This repo's `main` branch is a **strict mirror** of
  `immich-app/immich:main` — never commit to it directly.
- The `fork` branch = `main` + one commit per patch listed in `series`,
  in order, synced periodically with upstream via a **merge** (GitHub's
  "Sync fork" button used directly on the `fork` branch, or
  `./scripts/fork-sync.sh` locally — both do the same thing). This is
  the branch we build and deploy.
- Each "feature" commit on `fork` carries a `Fork-Patch: NNNN-short-name`
  git trailer and maps exactly to one `NNNN-feature-name.patch` file
  here. It is that trailer, not the position in history, that marks a
  commit as a feature patch — robust to the merge and infra commits
  that get interleaved between patches over successive syncs. A `.md`
  file of the same name documents the touched files, known conflict
  risks, and the regeneration/validation commands to re-run after a
  sync.

## See also

The whole mechanism (updating from upstream, resolving conflicts,
adding a new feature) is documented in the Claude skill:
[`.claude/skills/fork-patch-sync/SKILL.md`](../.claude/skills/fork-patch-sync/SKILL.md).

The `scripts/fork-sync.sh` script automates the merge + patch
regeneration after conflict resolution (or just the regeneration alone
via `--export-patches`, after a sync done from GitHub).

## Automation (CI)

- `.github/workflows/fork-sync-pr.yml` — every 6 h, if a new **stable**
  `immich-app/immich` release is out, opens a `sync/<tag>` → `fork` PR.
  If no `fork-patches/` patch conflicts, the PR is merged automatically
  and `fork-build.yml` is triggered; otherwise the PR stays open, to be
  resolved with the skill (local path `./scripts/fork-sync.sh`).
- `.github/workflows/fork-build.yml` — on every push to `fork` or on
  dispatch after a `sync/<tag>` merge, builds + pushes
  `ghcr.io/<owner>/immich-server`. For a `sync/<tag>` merge: image
  tagged `:<tag>`, `<tag>-fork` git tag + GitHub release.
- No repo secret or setting to configure: everything runs off the
  workflows' `GITHUB_TOKEN`.
- The `fork-patches/*.patch` files are **not** regenerated
  automatically after a CI sync — run `./scripts/fork-sync.sh
  --export-patches` locally if you need an up-to-date `.patch`.

## Adding a new feature

1. Develop normally on the `fork` branch, as a single self-contained
   commit per feature (squash before finalizing), with a
   `Fork-Patch: NNNN-short-name` trailer in the commit message.
2. `./scripts/fork-sync.sh --export-patches` — generates
   `fork-patches/NNNN-short-name.patch` from the trailer automatically.
3. Add `NNNN-short-name.patch` to the end of `series`.
4. Write `NNNN-short-name.md` (copy the structure of an existing file):
   touched files, conflict risks, regeneration/validation commands
   specific to that feature.
5. Commit everything on `fork`.
