---
name: EAS Clerk SPM nil-target crash
description: @clerk/expo v3 adds ClerkKit via SPM; RN 0.81.x spm.rb crashes with nil target in CocoaPods 1.16.x post-install. Correct fix is a pnpm patch, NOT a config plugin.
---

## The bug

`pod install` crashes with `undefined method 'package_product_dependencies' for nil:NilClass` at `spm.rb:80`. Caused by `add_spm_to_target` receiving a nil `target` when CocoaPods can't find the Clerk pod target by name in the Pods project at SPM-linking time.

## Critical structure facts (RN 0.81.5)

- `spm.rb` defines `class SPMManager` with **instance methods** including `add_spm_to_target(project, target, url, requirement, products)`.
- `SPM = SPMManager.new` — `SPM` is a **plain Ruby instance**, NOT a module/class with class methods. There is no `ReactNative::SPM` namespace.
- `apply_on_post_install` passes `project.targets.find { |t| t.name == pod_name }` (can be nil) as the `target` arg to `add_spm_to_target`. The crash is at `target.package_product_dependencies` on nil.

## Why the config plugin (withDangerousMod) approach DOES NOT WORK

1. **Wrong Ruby namespace**: monkeypatching `ReactNative::SPM.singleton_class` — but that namespace doesn't exist; it's just `SPM` at top level.
2. **Wrong parameter name**: the method receives an already-found target object (or nil), not a name string.
3. **Reliability**: `withDangerousMod` Podfile modifications can be silently skipped on EAS if the modifier errors or if Pods caching is involved.

## Correct fix: pnpm patch on react-native

Add `return if target.nil?` as the first line of `SPMManager#add_spm_to_target` via a pnpm patch:
- Patch file: `patches/react-native@0.81.5.patch`
- Registered in `pnpm-workspace.yaml` under `patchedDependencies`
- Applied at `pnpm install` time — before `expo prebuild` and `pod install` run on EAS
- Verified locally: mobile `node_modules/react-native` symlinks to `react-native@0.81.5_patch_hash=...` with line 69 patched

**Why pnpm patch wins:** Applied at install time, committed to repo, guaranteed before any native build step. No Ruby namespace confusion, no EAS caching issues.
