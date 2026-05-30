---
name: pnpm store fix
description: How to resolve pnpm store version mismatch in this Replit environment
---

## Problem
pnpm v11 is in the workspace `node_modules/.bin/pnpm` but the installed node_modules were built with the v10 store at `/home/runner/workspace/.local/share/pnpm/store/v10`. Running `pnpm add` or `pnpm install` fails with `ERR_PNPM_UNEXPECTED_STORE`.

## Fix
1. Add `store-dir=/home/runner/workspace/.local/share/pnpm/store/v10` to `.npmrc`
2. Use the system pnpm binary (v10): `/nix/store/61lr9izijvg30pcribjdxgjxvh3bysp4-pnpm-10.26.1/bin/pnpm`
3. Run with `--no-frozen-lockfile` flag when adding new packages

**Why:** The Replit environment ships pnpm v10 in nix store; the workspace node_modules/.bin/pnpm symlink may point to v11 depending on CI context.

## To add a new package
```sh
/nix/store/61lr9izijvg30pcribjdxgjxvh3bysp4-pnpm-10.26.1/bin/pnpm install --no-frozen-lockfile
```
Or: add the dependency manually to `package.json` and run the above command.
