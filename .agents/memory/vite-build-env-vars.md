---
name: Vite build env vars
description: PORT and BASE_PATH are runtime-only; vite.config.ts must not require them during production builds.
---

## Rule
All Vite configs in this project (`flowforge`, `flowforge-video`, `flowforge-sales-deck`) must use the `async ({ command }) => { ... }` function form and skip `PORT`/`BASE_PATH` validation when `command === "build"`.

## Why
Replit's production deployment builds artifacts before injecting runtime env vars. `[services.env]` in `artifact.toml` is runtime-only. When `vite build` runs during deploy, `PORT` and `BASE_PATH` are not set, causing the old top-level validation to throw immediately and fail the build.

## How to apply
```ts
export default defineConfig(async ({ command }) => {
  const isBuild = command === "build";
  const port = Number(process.env.PORT || "3000");
  if (!isBuild && !process.env.PORT) throw new Error("PORT required");
  const basePath = process.env.BASE_PATH ?? "/";
  if (!isBuild && !process.env.BASE_PATH) throw new Error("BASE_PATH required");
  return { base: basePath, server: { port }, ... };
});
```
- `BASE_PATH` defaults to `"/"` for builds (correct for production deploys).
- `PORT` defaults to `3000` for builds (never actually used during static builds).
