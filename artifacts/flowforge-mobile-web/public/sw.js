const CACHE_NAME = "flowforge-mobile-v1";
const SHARE_FILE_CACHE_KEY = "/__ff_share_file";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Handle POST share target (Android Chrome file shares may POST even with GET manifest
  // declared; this handler intercepts defensively and redirects to GET so React takes over)
  if (
    event.request.method === "POST" &&
    url.pathname.endsWith("/capture")
  ) {
    event.respondWith(handleSharePost(event.request));
    return;
  }

  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

async function handleSharePost(request) {
  try {
    const formData = await request.formData();
    const text = formData.get("text") ?? "";
    const title = formData.get("title") ?? "";
    const url = formData.get("url") ?? "";
    const file = formData.get("file");

    // Build redirect URL with text/title/url as GET params
    const base = new URL(request.url);
    const redirectUrl = new URL(base.origin + base.pathname.replace(/\/+$/, ""));
    if (title) redirectUrl.searchParams.set("title", String(title));
    if (text) redirectUrl.searchParams.set("text", String(text));
    if (url) redirectUrl.searchParams.set("url", String(url));
    redirectUrl.searchParams.set("via", "share");

    if (file && file instanceof File) {
      const cache = await caches.open(CACHE_NAME);

      // Persist the full file bytes so Capture can read them even on cold start.
      // Store as a Response with custom headers carrying name/type/size.
      await cache.put(
        SHARE_FILE_CACHE_KEY,
        new Response(file, {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-File-Name": encodeURIComponent(file.name),
            "X-File-Size": String(file.size),
          },
        })
      );

      // Also opportunistically broadcast to any open clients (fast path).
      // Clone the buffer for each client — transferring the same ArrayBuffer detaches
      // it after the first postMessage, making subsequent sends deliver an empty buffer.
      try {
        const arrayBuffer = await file.arrayBuffer();
        const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
        for (const client of clients) {
          const copy = arrayBuffer.slice(0);
          client.postMessage(
            { type: "share-file", name: file.name, size: file.size, mimeType: file.type, buffer: copy },
            [copy]
          );
        }
      } catch {
        // Non-critical; Capture will fall back to reading from cache
      }
    }

    return Response.redirect(redirectUrl.toString(), 303);
  } catch {
    const base = new URL(request.url);
    return Response.redirect(base.origin + base.pathname, 303);
  }
}
