# DNR Digital

A single-page digital consultancy site built with Next.js Pages Router, React 18 and Tailwind CSS 3, deployed on Netlify. It shows a rotating Unsplash background, consultancy services and an email contact link. The existing typography, photo colour treatment and hover effect are preserved.

## Local development

Use Node 24 (`.nvmrc`). In a terminal in this repository:

```sh
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. An Unsplash key is optional: without one, the site rotates through the 30 photos in `data/imageCache.json`. Plain Next.js development uses the bundled snapshot and never contacts the Unsplash API. The published Netlify scheduled function uses `UNSPLASH_ACCESS_KEY` and optional `UNSPLASH_COLLECTION_ID`. Never commit credentials.

The old key was committed to repository history. Rotate it in Unsplash before deploying this refresh and set the replacement in Netlify's environment variables. Removing it from the current code does not invalidate it.

## Image behaviour

- The homepage and image APIs only read cached metadata. Visitor traffic, cold starts and the die never trigger Unsplash discovery requests.
- `netlify/functions/refresh-photos.mjs` refreshes up to 30 landscape photos from the curated collection once per hour, with high content filtering. Only the currently published production deploy may write. Preview/local scheduler invocations safely skip, and previews may read the shared pool.
- Netlify Blobs stores the last good full photo response and next-attempt time in the site-wide `unsplash-photos` store, surviving deploys and instance restarts. An atomic conditional reservation prevents overlapping refreshes. The normal discovery budget is one request per hour; required download events would be additional, see `docs/unsplash-production.md`.
- Failed refreshes retain the pool and back off for 1, 2, 4, then 8 hours, respecting longer `Retry-After` values. Rate-limit remaining is saved for diagnostics. Storage reservation failure makes no API request; missing credentials do not refresh. Unsplash requests time out after five seconds, storage requests after two seconds.
- Readers retain a last-good in-memory pool for storage failures and recheck storage once per minute per instance. Cold readers can use the bundled 30-photo snapshot for the default collection. A different collection never falls back to unrelated seed photos; it uses the local background until the first successful refresh.
- An HttpOnly, SameSite, host-only cookie (`dnr_photos`, 30-day lifetime) records up to 90 attempted photo IDs, not a visitor identifier. Photos are selected randomly without repetition until the current pool is exhausted; cycle boundaries avoid an immediate repeat when at least two photos exist. Failed candidates are skipped too. Clearing/blocking cookies removes cross-reload history. Concurrent tabs can race on the cookie; this is best-effort browser history, not cross-device tracking.
- “Change of scenery” preloads a responsive candidate, retains the current image during loading, and transitions only after success. It tries at most three candidates; API/image timeouts are bounded and failure keeps the current scenery with retry feedback. A failed initial image tries alternatives, with the existing local background and white text as fallback.
- The die supports keyboard input, keeps focus while loading and respects reduced motion. Photographer attribution changes with the image. The layout, colour treatment and contact link remain intact.
- Responsive images load directly from Unsplash’s CDN at quality 65 with tracking parameters preserved. Adobe Fonts remains a direct head stylesheet with connection hints and CSS fallbacks; font-display is controlled by the Adobe web project.

The homepage and `GET /api/background` serialize only photo ID, URL, colour and attribution. `GET /api/imageCache` retains the existing full response. Personalized responses are not cached. Download events are not yet emitted: the production-access interpretation is explicitly pending in `docs/unsplash-production.md`.

### Netlify cache rollout

1. Keep `UNSPLASH_ACCESS_KEY` available to **Functions** in the production deploy context. `UNSPLASH_COLLECTION_ID` is optional; default `bo8jQKTaE0Y`.
2. After an approved merge/deploy, open Netlify **Functions → refresh-photos** and check its Scheduled badge. It runs hourly on the hour (UTC). Use **Run now** on the published production deploy for the first refresh; no redeploy is needed for future refreshes.
3. In the function log, expect `status: fresh` and a nonzero photo count. In **Blobs → unsplash-photos**, the `pool-<collection-id>` entry contains images, `updatedAt`, `nextAttempt` and quota remaining. Never edit the cache by hand to bypass its cooldown.
4. A preview's manual scheduler run intentionally does not write production data or spend API quota. Until the first production refresh, the default collection uses the seed snapshot. Production persistence and scheduler execution therefore require a post-merge check.
5. Reload several times and use the die; photos and credits should change without new refresh log entries. No Netlify personal token is needed in site configuration: Blobs uses the function's runtime credentials.

## Verification

```sh
npm test
npm run build
npm audit
npm start
```

Tests cover shared reads, atomic refresh reservations, missing credentials, request budgets, failure backoff, last-good snapshots, attribution validation and non-repeating cookie rotation. Browser checks are recorded in `tests/uat-log.md`. Work is tracked in the project-root `tasks.md`.

## Dependencies

The September 2026 refresh keeps Next.js 15, React 18 and Tailwind 3 to limit migration risk. It removes unused `fs`, `fitext`, `textfit-web-component` and `unsplash-js` packages. The latter is replaced by Node's native fetch.

The `next.postcss` override uses the project's patched PostCSS 8 version because Next 15 pins an older vulnerable release. Keep the override until Next's dependency is patched, and run the production build when changing it. Do not use `npm audit fix --force` to jump framework majors without reviewing the migration.

## Deployment

Netlify runs `npm run build` and publishes `.next` using its Next.js adapter. The site needs a server runtime; it cannot use `next export`. Node 24 is selected by `.nvmrc` and `engines.node`. Check any existing Netlify `NODE_VERSION` and function runtime overrides before deploying.

Merge and deployment require Duncan's approval. Before deployment, rotate/configure the Unsplash access key. After deployment, check the homepage, image loading, photo attribution, email link and `/api/imageCache`, then check GitHub's Dependabot alerts on `main`. Alerts will remain open until the patched lockfile reaches the default branch and GitHub rescans it. Dependabot PR #1 is superseded by this refresh and can be closed after merge.
