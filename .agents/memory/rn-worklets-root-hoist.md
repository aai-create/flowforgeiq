---
name: react-native-worklets root hoist
description: react-native-reanimated v4's Babel plugin requires react-native-worklets at the workspace root, not just in the mobile artifact.
---

## Rule
`react-native-worklets` must be declared in the **workspace root** `package.json` devDependencies (currently `0.5.1`), in addition to the mobile artifact's `package.json`.

## Why
`react-native-reanimated@4.x`'s Babel plugin (`react-native-reanimated/plugin/index.js`) lives in the pnpm store under the workspace root (`node_modules/.pnpm/.../react-native-reanimated/`). When Babel runs, Node resolves `require('react-native-worklets/plugin')` starting from that pnpm-store location, walking up to the **workspace root** `node_modules/`. If worklets is only in `artifacts/flowforge-mobile/node_modules/`, the require fails with "Cannot find module 'react-native-worklets/plugin'" and the Metro bundle build errors out with HTTP 500.

## How to apply
- Keep `react-native-worklets: 0.5.1` in both `package.json` (root) and `artifacts/flowforge-mobile/package.json`.
- Never remove it thinking it's unused — nothing directly imports it in app code, but Reanimated's Babel plugin needs it.
- The CocoaPods post-install failure on EAS is a separate issue from Reanimated v4 itself, not caused by worklets.
