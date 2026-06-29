---
name: Mobile Metro build port
description: Metro bundler during Replit deploy builds uses port 8083 to avoid conflicting with the dev workflow on 8081.
---

## Rule
`METRO_BUILD_PORT = 8083` is defined in `artifacts/flowforge-mobile/scripts/build.js` and passed as `--port 8083` to `expo start`. All `localhost:8081` references in that file use `METRO_BUILD_PORT` instead.

## Why
The dev workflow runs Metro on port 8081. When the Replit deployment build triggers `node scripts/build.js` alongside the running dev workflow, Metro tries 8081, finds it occupied, and in non-interactive mode can't prompt for an alternative — it exits with code 1, killing the build. Using a dedicated build port (8083) avoids the conflict.

## How to apply
If the dev workflow port ever changes, update `expo-start.js` and `METRO_BUILD_PORT` in `build.js` to avoid collision. Port 8083 is currently free and not used by any other workflow.
