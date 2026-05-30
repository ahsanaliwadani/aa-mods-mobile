---
name: pnpm store fix
description: How to resolve pnpm store issues in this Replit environment and for EAS builds
---

## Rule
**Never put a hardcoded `store-dir` pointing to `/home/runner/...` in `.npmrc`.** EAS build servers run as `/home/expo` and will get `EACCES: permission denied, mkdir '/home/runner'` on `pnpm install --frozen-lockfile`.

**Why:** The `.npmrc` `store-dir` path is absolute and Replit-specific. EAS build servers don't have a `/home/runner` path, so pnpm fails with a permission error when trying to create the store directory.

**How to apply:** Keep `.npmrc` free of `store-dir`. Let pnpm resolve the store to its default location. This works both locally in Replit and on EAS build servers.

## Current .npmrc
```
confirmModulesPurge=false
```
(No store-dir — pnpm uses its default, which works in all environments.)

## Adding packages in Replit dev environment
When adding packages locally, the pnpm version can vary. Use `--no-frozen-lockfile`:
```sh
pnpm install --no-frozen-lockfile
```
Or add dependencies directly to `package.json` and then run `pnpm install --no-frozen-lockfile`.
