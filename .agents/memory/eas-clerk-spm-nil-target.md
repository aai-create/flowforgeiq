---
name: EAS Clerk SPM nil-target crash
description: @clerk/expo v3 adds ClerkKit via SPM; RN 0.81.x spm.rb crashes with nil target in CocoaPods 1.16.x post-install.
---

## The Rule
When @clerk/expo v3.x is used with react-native 0.81.x and CocoaPods 1.16.x,
EAS iOS builds fail with:
  `undefined method 'package_product_dependencies' for nil:NilClass  spm.rb:80`

## Why
spm.rb's `add_spm_to_target` does:
  target = project.targets.find { |t| t.name == target_name }
  target.package_product_dependencies.push(dep)  # crashes when target is nil

The user xcodeproj target name doesn't match the CocoaPods aggregate target name.

## Fix
Expo config plugin `plugins/withSpmNilTargetFix.js` using `withDangerousMod`
that patches the generated Podfile AFTER `require 'react_native_pods'`:
- Prepends `ReactNativeSPMPatch` module to `ReactNative::SPM.singleton_class`
- Guards `add_spm_to_target` to return early (with a warning) if target is nil
- Registered as first entry in app.json plugins array

## How to apply
Any time ClerkKit SPM install fails in EAS iOS builds with this nil error,
the config plugin at `artifacts/flowforge-mobile/plugins/withSpmNilTargetFix.js`
handles it. Check that it's first in the plugins list in app.json.
