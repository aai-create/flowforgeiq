const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PATCH_MARKER = "ReactNativeSPMPatch";

const RUBY_PATCH = `
# ---- SPM nil-target patch (react-native 0.81.x + CocoaPods 1.16.x) ----
# react-native's spm.rb line 80 crashes with "undefined method
# 'package_product_dependencies' for nil:NilClass" when the target lookup
# returns nil (e.g. when the Pods project target name differs from the user
# project target name, as seen with ClerkKit / ClerkKitUI SPM packages).
# This monkeypatch guards add_spm_to_target against nil and suppresses the
# crash so pod install succeeds.
module ReactNativeSPMPatch
  def add_spm_to_target(project, target_name, url, requirement, products)
    target = project.targets.find { |t| t.name == target_name }
    if target.nil?
      Pod::UI.warn "[SPM patch] Skipping SPM products #{products.inspect} " \
                   "— target '#{target_name}' not found in #{project.path.basename}"
      return
    end
    super
  rescue => e
    Pod::UI.warn "[SPM patch] #{e.message} — skipping #{products.inspect} for #{target_name}"
  end
end
ReactNative::SPM.singleton_class.prepend(ReactNativeSPMPatch) if defined?(ReactNative::SPM)
# ---- end SPM nil-target patch ----
`;

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

      if (contents.includes(PATCH_MARKER)) {
        return config;
      }

      // Insert after the first `require 'react_native_pods'` line so the
      // ReactNative::SPM module is already loaded before we prepend to it.
      const requireLine = "require 'react_native_pods'";
      const idx = contents.indexOf(requireLine);
      if (idx !== -1) {
        const insertAt = idx + requireLine.length;
        contents =
          contents.slice(0, insertAt) + "\n" + RUBY_PATCH + contents.slice(insertAt);
      } else {
        // Fallback: prepend to the file
        contents = RUBY_PATCH + contents;
      }

      fs.writeFileSync(podfilePath, contents, "utf8");
      return config;
    },
  ]);
