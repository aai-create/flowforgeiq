#!/usr/bin/env node
/**
 * Expo dev starter with path-prefix rewriting proxy.
 *
 * The Replit expo proxy at expo.riker.replit.dev routes to localPort (3000)
 * but prepends the artifact previewPath (/flowforge-mobile/) to every request.
 * Metro only handles paths without that prefix, so this script:
 *   1. Starts Metro on METRO_PORT (PORT+1, default 3001)
 *   2. Starts an HTTP reverse proxy on PORT (default 3000) that strips
 *      the BASE_PATH prefix before forwarding to Metro.
 */

const { spawn } = require("child_process");
const http = require("http");
const net = require("net");

const PROXY_PORT = parseInt(process.env.PORT || "3000", 10);
const METRO_PORT = PROXY_PORT + 1;
const BASE = (process.env.BASE_PATH || "/flowforge-mobile").replace(/\/$/, "");

function rewriteUrl(url) {
  if (url === BASE || url === BASE + "/") return "/";
  if (url.startsWith(BASE + "/")) return url.slice(BASE.length);
  return url;
}

// --- 1. Start Metro bundler on METRO_PORT ---
const metroEnv = { ...process.env, PORT: String(METRO_PORT) };

const metro = spawn(
  "pnpm",
  ["exec", "expo", "start", "--port", String(METRO_PORT)],
  { env: metroEnv, stdio: "inherit", shell: false }
);

metro.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGTERM", () => metro.kill("SIGTERM"));
process.on("SIGINT", () => metro.kill("SIGINT"));

// --- 2. Start the path-stripping HTTP proxy on PROXY_PORT ---
const proxyServer = http.createServer((req, res) => {
  req.url = rewriteUrl(req.url);

  const opts = {
    hostname: "localhost",
    port: METRO_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${METRO_PORT}` },
  };

  const proxyReq = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end("Metro not ready yet");
    }
  });

  req.pipe(proxyReq, { end: true });
});

// WebSocket support (HMR / live reload)
proxyServer.on("upgrade", (req, socket, head) => {
  const newPath = rewriteUrl(req.url);

  const conn = net.connect(METRO_PORT, "localhost");

  conn.on("connect", () => {
    const hdrs = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    conn.write(
      `${req.method} ${newPath} HTTP/${req.httpVersion}\r\n${hdrs}\r\n\r\n`
    );
    if (head && head.length) conn.write(head);
  });

  socket.pipe(conn, { end: true });
  conn.pipe(socket, { end: true });

  const cleanup = () => {
    socket.destroy();
    conn.destroy();
  };
  conn.on("error", cleanup);
  socket.on("error", cleanup);
});

proxyServer.listen(PROXY_PORT, () => {
  console.log(
    `[expo-proxy] :${PROXY_PORT} → Metro :${METRO_PORT}  (strip prefix: "${BASE}")`
  );
});
