/**
 * Dev wrapper for Replit Expo artifacts.
 *
 * Problem: Expo Metro uses lazy port-binding — the port is not actually
 * bound until the first HTTP request arrives, so Replit's port checker
 * (which reads the PORT env var) never sees it open.
 *
 * Solution:
 * 1. Read PUBLIC_PORT from the PORT env var (what Replit monitors).
 * 2. Immediately bind an HTTP proxy on PUBLIC_PORT — satisfies the checker.
 * 3. Launch Expo Metro on INTERNAL_PORT (PUBLIC_PORT + 1) via --port CLI arg,
 *    keeping PORT=PUBLIC_PORT in the child env so Replit still monitors the
 *    right port.
 * 4. Proxy every HTTP request + WebSocket upgrade → INTERNAL_PORT.
 */

const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

const PUBLIC_PORT = parseInt(process.env.PORT || '3001', 10);
const INTERNAL_PORT = PUBLIC_PORT + 1;

// ─── HTTP proxy ───────────────────────────────────────────────────────────────

function forwardRequest(req, res) {
  const options = {
    hostname: '127.0.0.1',
    port: INTERNAL_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'text/plain', 'Retry-After': '2' });
      res.end('Metro starting…');
    }
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer(forwardRequest);

// WebSocket / upgrade passthrough (Metro HMR uses ws://)
server.on('upgrade', (req, clientSocket, head) => {
  const serverSocket = net.createConnection(INTERNAL_PORT, '127.0.0.1', () => {
    serverSocket.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
        Object.entries(req.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n'
    );
    if (head && head.length) serverSocket.write(head);
    clientSocket.pipe(serverSocket);
    serverSocket.pipe(clientSocket);
  });
  serverSocket.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => serverSocket.destroy());
});

// ─── Start listening immediately so Replit's PORT check passes ───────────────

server.listen(PUBLIC_PORT, () => {
  process.stdout.write(
    `[dev-wrapper] HTTP proxy bound on :${PUBLIC_PORT} → :${INTERNAL_PORT}\n`
  );

  // Keep PORT=PUBLIC_PORT in env so Replit monitors the right port.
  // Pass the actual Metro port only via the --port CLI flag.
  const expo = spawn(
    'pnpm',
    ['exec', 'expo', 'start', '--localhost', '--port', String(INTERNAL_PORT)],
    { env: process.env, stdio: 'inherit' }
  );

  expo.on('exit', (code) => {
    server.close();
    process.exit(code ?? 0);
  });
});
