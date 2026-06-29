/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with special routes:
 * - GET /health → JSON status of manifest artifacts
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 *   (if manifest is missing, returns a valid error-state manifest so Expo Go
 *    can display a human-readable message instead of a parse failure)
 * - GET / without expo-platform → landing page HTML
 *   (if manifests are missing, shows a "build not ready" page with instructions)
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Dependencies: Node.js built-ins (http, fs, path) + qrcode (server-side QR generation).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function manifestExists(platform) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");
  return fs.existsSync(manifestPath);
}

function readManifestSafe(platform) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");
  try {
    return { ok: true, content: fs.readFileSync(manifestPath, "utf-8") };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function serveHealth(res) {
  const ios = manifestExists("ios");
  const android = manifestExists("android");
  const allReady = ios && android;

  const body = JSON.stringify({
    status: allReady ? "ok" : "build_not_ready",
    manifests: { ios, android },
  });

  res.writeHead(allReady ? 200 : 503, { "content-type": "application/json" });
  res.end(body);
}

function serveManifest(platform, res) {
  const result = readManifestSafe(platform);

  if (!result.ok) {
    // Expo Go expects a JSON object it can parse as a manifest. Returning a
    // bare {"error": "..."} causes "Failed to parse manifest JSON". Instead,
    // return a minimal manifest whose launchAsset points nowhere but carries a
    // human-readable message field that Expo Go can surface.
    const errorManifest = JSON.stringify({
      id: `build-not-ready-${platform}`,
      createdAt: new Date().toISOString(),
      runtimeVersion: "0",
      launchAsset: {
        key: "build-not-ready",
        contentType: "application/javascript",
        url: "",
      },
      assets: [],
      metadata: {},
      extra: {
        expoClient: { name: getAppName() },
      },
      message:
        "The app build has not completed yet. " +
        `The manifest for platform "${platform}" is not available. ` +
        "Trigger a new deployment to rebuild the bundle, then try again.",
    });

    res.writeHead(200, {
      "content-type": "application/json",
      "expo-protocol-version": "1",
      "expo-sfv-version": "0",
      "x-build-status": "not-ready",
    });
    res.end(errorManifest);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(result.content);
  } catch {
    // Content exists but is malformed — serve the same error-state manifest.
    const errorManifest = JSON.stringify({
      id: `malformed-manifest-${platform}`,
      createdAt: new Date().toISOString(),
      runtimeVersion: "0",
      launchAsset: {
        key: "malformed-manifest",
        contentType: "application/javascript",
        url: "",
      },
      assets: [],
      metadata: {},
      extra: {
        expoClient: { name: getAppName() },
      },
      message:
        `The stored manifest for platform "${platform}" is malformed (not valid JSON). ` +
        "Trigger a new deployment to rebuild the bundle, then try again.",
    });

    res.writeHead(200, {
      "content-type": "application/json",
      "expo-protocol-version": "1",
      "expo-sfv-version": "0",
      "x-build-status": "malformed",
    });
    res.end(errorManifest);
    return;
  }

  void parsed;
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(result.content);
}

function serveBuildNotReadyPage(res, appName) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName} — Build Not Ready</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 2.5rem;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,.5);
    }
    .icon { font-size: 3rem; margin-bottom: 1.25rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; color: #f1f5f9; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 1rem; }
    .badge {
      display: inline-flex; align-items: center; gap: 0.4rem;
      background: #7c3aed22; border: 1px solid #7c3aed55;
      color: #a78bfa; border-radius: 99px;
      padding: 0.2rem 0.75rem; font-size: 0.8rem;
      margin-bottom: 1.75rem;
    }
    .steps { list-style: none; counter-reset: step; }
    .steps li {
      counter-increment: step;
      display: flex; align-items: flex-start; gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #1e293b;
      color: #94a3b8;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .steps li:last-child { border-bottom: none; }
    .steps li::before {
      content: counter(step);
      background: #334155; color: #e2e8f0;
      border-radius: 50%; min-width: 1.5rem; height: 1.5rem;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
    }
    .health-url {
      font-family: monospace; font-size: 0.85rem;
      background: #0f172a; border: 1px solid #334155;
      border-radius: 0.4rem; padding: 0.2rem 0.5rem;
      color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🏗️</div>
    <span class="badge">⚠ Build not ready</span>
    <h1>${appName}</h1>
    <p>
      The mobile app bundle has not been built yet, or the last build did not
      complete successfully. Expo Go cannot load the app until a valid build
      is present.
    </p>
    <ol class="steps">
      <li>Trigger a new deployment from the Replit Deployments panel.</li>
      <li>Watch the deployment logs — look for "Build complete!" at the end to confirm success.</li>
      <li>
        Check <span class="health-url">/health</span> on this domain — it returns
        <code>{"status":"ok"}</code> once both iOS and Android manifests are present.
      </li>
      <li>Open Expo Go and scan the QR code (or enter the URL manually) to load the app.</li>
    </ol>
  </div>
</body>
</html>`;

  res.writeHead(503, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

async function serveLandingPage(req, res, landingPageTemplate, appName) {
  // If neither manifest exists, show a "build not ready" page instead.
  const iosReady = manifestExists("ios");
  const androidReady = manifestExists("android");
  if (!iosReady && !androidReady) {
    return serveBuildNotReadyPage(res, appName);
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  // Use /manifest sub-path so Expo Go fetches a sub-path (bypasses the
  // flowforge CDN's /* → /index.html static rewrite that catches the root).
  const manifestSubPath = basePath ? `${basePath}/manifest` : `/manifest`;
  const expsUrl = `${host}${manifestSubPath}`;
  const deepLink = `exp://${expsUrl}`;

  let qrSvg = "";
  try {
    qrSvg = await QRCode.toString(deepLink, {
      type: "svg",
      margin: 1,
      color: { dark: "#333333", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });
  } catch (err) {
    // Non-fatal: fall back to empty; client-side JS will still attempt to render.
    console.error("QR generation failed:", err.message);
  }

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName)
    .replace(/QR_SVG_PLACEHOLDER/g, qrSvg);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStaticFile(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType });
  res.end(content);
}

let landingPageTemplate;
try {
  landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
} catch {
  landingPageTemplate = null;
}
const appName = getAppName();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/health") {
    return serveHealth(res);
  }

  // /manifest is a dedicated manifest endpoint that doesn't rely on the
  // expo-platform header being forwarded through the proxy. Defaults to "ios"
  // so Expo Go on iPhone always gets a valid JSON manifest regardless of
  // whether the proxy strips the expo-platform header.
  if (pathname === "/manifest") {
    const platform =
      req.headers["expo-platform"] === "android" ? "android" : "ios";
    return serveManifest(platform, res);
  }

  if (pathname === "/") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }
    if (!landingPageTemplate) {
      return serveBuildNotReadyPage(res, appName);
    }
    return serveLandingPage(req, res, landingPageTemplate, appName);
  }

  serveStaticFile(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
  console.log(`Health check available at /health`);
});
