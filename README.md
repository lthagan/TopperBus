# TopperBus

Live WKU campus bus tracker — https://topperbus.org/

Vite + React frontend, hosted on a single Cloudflare Worker ([worker/index.ts](worker/index.ts)) that:

- serves the built site from `dist/` (with SPA fallback),
- handles `POST /api/feedback` (Turnstile check → Discord webhook),
- posts a yearly academic-calendar reminder to Discord on Jan 1 (cron in [wrangler.jsonc](wrangler.jsonc)).

## Development

```sh
npm install
npm run dev        # Vite dev server on :8080 (feedback API not available here)
npm run preview    # build + run the full Worker locally, including /api/feedback
```

For local secrets, create `.dev.vars` (git-ignored) with the variables listed below.

## Deploying

Pushing to `main` deploys automatically via Cloudflare Workers Builds (connected to this GitHub repo). Manual deploy: `npm run deploy`.

Required secrets (set in the Cloudflare dashboard or with `npx wrangler secret put <NAME>`):

| Name | Used for |
| --- | --- |
| `TURNSTILE_SECRET_KEY` | Verifying the feedback form CAPTCHA |
| `DISCORD_WEBHOOK_SUGGESTIONS` | Suggestion feedback |
| `DISCORD_WEBHOOK_BUGS` | Bug reports |
| `DISCORD_WEBHOOK_FEEDBACK` | General feedback |
| `DISCORD_WEBHOOK_URL` | Yearly calendar reminder |

The CARTO basemap key is in [src/components/BusMap.tsx](src/components/BusMap.tsx). It is public by nature and restricted to topperbus.org in the CARTO dashboard.
