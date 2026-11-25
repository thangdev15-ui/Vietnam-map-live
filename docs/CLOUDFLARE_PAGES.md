# Cloudflare Pages: static broadcast CDN

Cloudflare Pages serves the static React/Vite application. Render remains the only backend for game state, TikTok, Socket.IO, TTS and admin API. This avoids sending each viewer's JS/CSS/WebP texture from Render.

Trước hết, tạo backend Render theo [`RENDER_NEW_ACCOUNT.md`](./RENDER_NEW_ACCOUNT.md) để có URL API mới.

## 1. Create the Pages project

In Cloudflare Dashboard, open **Workers & Pages → Create application → Pages → Import an existing Git repository** and choose `thangdev15-ui/Vietnam-map-live`.

Use these exact production settings:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm ci && npm run build:frontend` |
| Build output directory | `dist/client` |
| Root directory | leave blank |
| Node version environment variable | `NODE_VERSION=24.22.1` |
| Public build environment variable | `VITE_API_ORIGIN=https://<ten-service-render-moi>.onrender.com` |

Deploy. Cloudflare provides a URL such as `https://<project>.pages.dev`. Test the page at `/?broadcast=1`.

## 2. Allow this Pages site to reach Render

In Render → service mới → **Environment**, set `CORS_ORIGINS` to the exact Pages URL, without a trailing slash:

```text
https://<project>.pages.dev
```

If a custom Pages domain is added later, add it comma-separated too:

```text
https://<project>.pages.dev,https://live.example.com
```

Save and redeploy Render. Do not place `ADMIN_TOKEN`, TikTok keys, or any other secret in Cloudflare Pages variables. `VITE_API_ORIGIN` is public by design and contains only the Render API URL.

## 3. Verify before switching OBS/TikTok

1. Open the Pages URL with `/?broadcast=1`; state should connect and show **ĐỒNG BỘ LIVE**.
2. Open `/admin` on the Pages URL and use the existing admin token; run one safe simulator event.
3. In browser DevTools → Network, confirm `assets/*` responses come from `pages.dev`; `/api/*` and `/socket.io/*` go only to URL Render mới.
4. Leave the existing Render URL available as an emergency fallback.

## Limits

Pages offloads static files, which are normally the largest per-viewer downloads. Socket.IO state, API responses and dynamic MP3 still leave Render and count toward its bandwidth. The game intentionally keeps these messages small; the terrain texture is now 180 KB and cached immutably.

Cloudflare Pages redirect files cannot proxy an external Render domain, so the client calls the configured API origin directly. This is why the exact CORS allow-list above is required.
