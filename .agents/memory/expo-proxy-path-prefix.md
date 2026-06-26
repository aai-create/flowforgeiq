---
name: Replit expo proxy path prefix
description: The expo.riker.replit.dev proxy adds the artifact previewPath when forwarding to Metro, causing 404. Fix pattern documented here.
---

## The Problem

The Replit expo proxy at `<repl-id>.expo.riker.replit.dev` routes to the artifact's `localPort` but **prepends the artifact's `previewPath`** to every request it forwards. For a mobile artifact with `previewPath = "/flowforge-mobile/"`, Expo Go's `GET /` manifest request arrives at Metro as `GET /flowforge-mobile/`, which Metro returns 404 for.

**Why:** The Replit reverse proxy is path-based (each artifact owns a sub-path). The expo domain uses the same routing table, so requests from Expo Go are routed as if they came from the main proxy — with the artifact path prefix included.

**How to spot it:** Metro returns 200 for `GET /` with Expo-Platform header, but 404 for `GET /flowforge-mobile/`. The expo proxy returns that exact same 404 HTML (Metro's own web 404 page, titled with the app name).

## The Fix

`expo-start.js` at the root of the mobile artifact:
- Starts Metro on `PORT+1` (e.g. 3001) internally
- Starts an HTTP reverse proxy on `PORT` (e.g. 3000) that strips `BASE_PATH` prefix before forwarding to Metro
- Handles both HTTP and WebSocket (HMR) connections

Update `artifact.toml` `localPort` and `[services.env] PORT` to the **proxy port** (e.g. 3000).

Update the dev script in `package.json` to call `node expo-start.js` instead of `pnpm exec expo start --port $PORT`.

**How to apply:** Any time an Expo mobile artifact is set up in a monorepo where its `previewPath` is not `/`, add this proxy pattern. The artifact takes `localPort = N`, Metro runs on `N+1`.
