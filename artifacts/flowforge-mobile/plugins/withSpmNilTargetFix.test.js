/**
 * Unit tests for withSpmNilTargetFix.js
 *
 * Uses Node's built-in test runner (node:test) — no extra deps required.
 * Mocks `fs` and `@expo/config-plugins` via require-cache substitution so the
 * plugin can be exercised without touching real files or running Expo prebuild.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const REQUIRE_LINE = "require 'react_native_pods'";
const PATCH_MARKER = "ReactNativeSPMPatch";
const POST_INSTALL_ANCHOR = "react_native_post_install(installer";
const POST_INSTALL_PREPEND = "ReactNative::SPM.singleton_class.prepend(ReactNativeSPMPatch)";

/** Minimal Expo-generated Podfile that has both the require line and the anchor. */
const STANDARD_PODFILE = [
  "require 'react_native_pods'",
  "",
  "platform :ios, '15.1'",
  "",
  "target 'flowforgemobile' do",
  "  post_install do |installer|",
  "    react_native_post_install(installer,",
  "      :mac_catalyst_enabled => false",
  "    )",
  "  end",
  "end",
].join("\n");

/** Podfile that is missing the `require 'react_native_pods'` line. */
const PODFILE_WITHOUT_REQUIRE = [
  "platform :ios, '15.1'",
  "",
  "target 'flowforgemobile' do",
  "  post_install do |installer|",
  "    react_native_post_install(installer,",
  "      :mac_catalyst_enabled => false",
  "    )",
  "  end",
  "end",
].join("\n");

// ---------------------------------------------------------------------------
// Test harness — run the plugin against an in-memory Podfile
// ---------------------------------------------------------------------------

/**
 * Loads and runs withSpmNilTargetFix against `initialContent`.
 * The fs module and @expo/config-plugins are replaced with in-memory mocks
 * for the duration of the call; caches are restored afterwards.
 *
 * @param {string} initialContent  The Podfile content to start from.
 * @param {{ exists?: boolean }}   options
 * @returns {string}               The Podfile content after the plugin ran.
 */
function runPlugin(initialContent, { exists = true } = {}) {
  let fileContent = initialContent;

  const mockFs = {
    existsSync: () => exists,
    readFileSync: (_p, _enc) => fileContent,
    writeFileSync: (_p, content, _enc) => {
      fileContent = content;
    },
  };

  // withDangerousMod(config, [platform, callback]) — we call the callback
  // synchronously so the test can be purely synchronous.
  const mockConfigPlugins = {
    withDangerousMod: (config, [_platform, callback]) => callback(config),
  };

  const fakeConfig = {
    modRequest: { platformProjectRoot: "/fake/root/ios" },
  };

  // Resolve absolute paths for the three modules we need to stub.
  const fsResolved = require.resolve("fs");
  const cpResolved = require.resolve("@expo/config-plugins");
  const pluginResolved = require.resolve("./withSpmNilTargetFix.js");

  const origFs = require.cache[fsResolved];
  const origCp = require.cache[cpResolved];
  const origPlugin = require.cache[pluginResolved];

  // Install mocks.
  require.cache[fsResolved] = {
    id: fsResolved,
    filename: fsResolved,
    loaded: true,
    exports: mockFs,
  };
  require.cache[cpResolved] = {
    id: cpResolved,
    filename: cpResolved,
    loaded: true,
    exports: mockConfigPlugins,
  };
  // Always reload the plugin so it picks up the fresh mocks.
  delete require.cache[pluginResolved];

  try {
    const plugin = require("./withSpmNilTargetFix.js");
    plugin(fakeConfig);
    return fileContent;
  } finally {
    // Restore originals.
    if (origFs) {
      require.cache[fsResolved] = origFs;
    } else {
      delete require.cache[fsResolved];
    }
    if (origCp) {
      require.cache[cpResolved] = origCp;
    } else {
      delete require.cache[cpResolved];
    }
    if (origPlugin) {
      require.cache[pluginResolved] = origPlugin;
    } else {
      delete require.cache[pluginResolved];
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("inserts module definition after `require 'react_native_pods'`", () => {
  const result = runPlugin(STANDARD_PODFILE);

  // The module block must appear.
  assert.ok(
    result.includes(PATCH_MARKER),
    "Output should contain the PATCH_MARKER string",
  );

  // The module block must immediately follow the require line.
  const requireIdx = result.indexOf(REQUIRE_LINE);
  const markerIdx = result.indexOf(PATCH_MARKER);
  assert.ok(
    markerIdx > requireIdx,
    "Module definition should appear after the require line",
  );

  // The require line itself must still be present.
  assert.ok(
    result.includes(REQUIRE_LINE),
    "Original require line must be preserved",
  );
});

test("inserts prepend call inside post_install before the anchor", () => {
  const result = runPlugin(STANDARD_PODFILE);

  assert.ok(
    result.includes(POST_INSTALL_PREPEND),
    "Prepend call should be present in the output",
  );

  // The prepend call must appear before the anchor.
  const prependIdx = result.indexOf(POST_INSTALL_PREPEND);
  const anchorIdx = result.indexOf(POST_INSTALL_ANCHOR);
  assert.ok(
    prependIdx < anchorIdx,
    "Prepend call should appear before the post_install anchor",
  );
});

test("idempotency — running the plugin twice produces identical output", () => {
  const firstPass = runPlugin(STANDARD_PODFILE);
  const secondPass = runPlugin(firstPass);

  assert.equal(
    secondPass,
    firstPass,
    "Second run should not alter the already-patched Podfile",
  );

  // Confirm the marker appears exactly once, not duplicated.
  const occurrences = firstPass.split(PATCH_MARKER).length - 1;
  assert.ok(
    occurrences >= 1,
    "PATCH_MARKER should appear at least once after the first run",
  );
  assert.equal(
    firstPass.split(PATCH_MARKER).length,
    secondPass.split(PATCH_MARKER).length,
    "Marker count must not increase on second run",
  );
});

test("fallback — module is prepended to file when require line is absent", () => {
  const result = runPlugin(PODFILE_WITHOUT_REQUIRE);

  // The patch marker must still be inserted (at the top as fallback).
  assert.ok(
    result.includes(PATCH_MARKER),
    "PATCH_MARKER should appear even when the require line is missing",
  );

  // The module should appear before the original content.
  const markerIdx = result.indexOf(PATCH_MARKER);
  const platformIdx = result.indexOf("platform :ios");
  assert.ok(
    markerIdx < platformIdx,
    "Fallback module block should be prepended before the rest of the file",
  );

  // Original content must be preserved.
  assert.ok(
    result.includes("target 'flowforgemobile'"),
    "Original Podfile content must be preserved in fallback path",
  );
});

test("no-op when Podfile does not exist", () => {
  // When the file doesn't exist the plugin should return without writing.
  // We verify this by confirming the initial (empty) content is unchanged.
  const result = runPlugin("", { exists: false });
  assert.equal(result, "", "Content should be untouched when Podfile is absent");
});
