const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PATCH_MARKER = "ReactNativeSPMPatch";

// Module definition inserted after `require 'react_native_pods'`.
// ReactNative::SPM may not be defined at top-level parse time, so we only
// define the patch module here — the actual prepend happens in post_install.
const RUBY_MODULE = `
# ---- SPM nil-target patch (react-native 0.81.x + CocoaPods 1.16.x) ----
# react-native's spm.rb line 80 crashes with "undefined method
# 'package_product_dependencies' for nil:NilClass" when the target lookup
# returns nil (e.g. when the Pods project target name differs from the user
# project target name, as seen with ClerkKit / ClerkKitUI SPM packages).
# This monkeypatch guards add_spm_to_target against nil and suppresses the
# crash so pod install succeeds.
# The module is defined here; it is prepended inside post_install where
# ReactNative::SPM is guaranteed to be defined.
module ReactNativeSPMPatch
  def add_spm_to_target(project, target_name, url, requirement, products)
    target = project.targets.find { |t| t.name == target_name }
    if target.nil?
      Pod::UI.warn "[SPM patch] Skipping SPM products #{products.inspect} " \
                   "-- target '#{target_name}' not found in #{project.path.basename}"
      return
    end
    super
  rescue => e
    Pod::UI.warn "[SPM patch] #{e.message} -- skipping #{products.inspect} for #{target_name}"
  end
end
# ---- end SPM nil-target patch module ----
`;

// Inserted inside post_install, immediately before react_native_post_install.
// At this point in the CocoaPods lifecycle ReactNative::SPM is fully loaded.
const POST_INSTALL_PREPEND = `
    ReactNative::SPM.singleton_class.prepend(ReactNativeSPMPatch)
`;

// Anchor used to locate the insertion point inside post_install.
const POST_INSTALL_ANCHOR = "react_native_post_install(installer";

module.exports = (config) =>
  withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let contents = fs.readFileSync(podfilePath, "utf8");

      // Idempotency: skip if the patch was already applied.
      if (contents.includes(PATCH_MARKER)) {
        return config;
      }

      // 1. Insert the module definition after `require 'react_native_pods'`.
      const requireLine = "require 'react_native_pods'";
      const requireIdx = contents.indexOf(requireLine);
      if (requireIdx !== -1) {
        const insertAt = requireIdx + requireLine.length;
        contents =
          contents.slice(0, insertAt) +
          "\n" +
          RUBY_MODULE +
          contents.slice(insertAt);
      } else {
        // Fallback: prepend to the file when the require line is absent.
        contents = RUBY_MODULE + contents;
      }

      // 2. Insert the prepend call inside post_install, before the first
      //    occurrence of `react_native_post_install(installer`.  In a standard
      //    Expo-generated Podfile this anchor appears exactly once, but we only
      //    replace the first occurrence defensively.
      const anchorIdx = contents.indexOf(POST_INSTALL_ANCHOR);
      if (anchorIdx !== -1) {
        contents =
          contents.slice(0, anchorIdx) +
          POST_INSTALL_PREPEND +
          contents.slice(anchorIdx);
      }

      fs.writeFileSync(podfilePath, contents, "utf8");
      return config;
    },
  ]);
