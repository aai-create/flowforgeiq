---
name: react-native-worklets babel phantom dependency
description: Why the Expo mobile deploy build fails with "Cannot find module '@babel/generator'" and where the babel deps must be declared under pnpm.
---

# react-native-worklets babel plugin phantom dependency (pnpm)

The Expo mobile artifact's deploy build can fail with `[BABEL] expo-router/entry.js: Cannot find module '@babel/generator'` (or `@babel/traverse` / `@babel/types`), thrown by `react-native-worklets/plugin/index.js`.

**Root cause:** `react-native-worklets`'s babel plugin does bare `require('@babel/generator'|'@babel/traverse'|'@babel/types'|'@babel/core')`, but only `@babel/core` is a declared dep of the worklets package. The other three are phantom deps. Under pnpm's isolated layout they are not guaranteed present in either the `.pnpm` hoist dir (`node_modules/.pnpm/node_modules/`) or the workspace-root `node_modules`, so the plugin's require walk fails.

**Why adding them to the mobile package does NOT work:** the plugin file lives in the pnpm virtual store (`node_modules/.pnpm/react-native-worklets@.../node_modules/react-native-worklets/plugin/`). Its `require()` walk reaches the `.pnpm` hoist dir and the workspace **root** `node_modules`, but never `artifacts/flowforge-mobile/node_modules`. So the deps must be visible at the root.

**Fix:** declare `@babel/generator`, `@babel/traverse`, `@babel/types` in the **workspace ROOT** `package.json` devDependencies (root deps land in root `node_modules`, which the plugin can reach). Pin to the 7.x line (e.g. `^7.29.7`) to match the `@babel/core: ^7.29.6` override in `pnpm-workspace.yaml` — a bare `pnpm add @babel/generator` pulls 8.0.0, which is incompatible with babel 7.

**Why:** this is a regression-prone phantom dep — it surfaces after dependency reshuffles (e.g. a "update/fix vulnerabilities" commit re-resolving the store). Local dev (Metro) may not expose it; the deploy build does.

**How to apply:** if the mobile deploy build dies in a babel `Cannot find module '@babel/...'`, check it's a worklets-plugin require, confirm the module is absent from `node_modules/.pnpm/node_modules/@babel/` and root `node_modules/@babel/`, then add it to root `package.json`. Verify with `require.resolve(mod, {paths:[<plugin dir>]})` and `require('react-native-worklets/plugin')` loading end-to-end. A full local Metro bundle is blocked by the dev workflow holding port 8081 (hardcoded in `scripts/build.js`) — that port conflict is an environment artifact, not the dep bug.

**Robust alternative (not applied):** `pnpm.packageExtensions` for `react-native-worklets` declaring the three babel deps at resolution level — more semantically precise than root injection, but more lockfile churn.
