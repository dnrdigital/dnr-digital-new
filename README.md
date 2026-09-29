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

Open http://localhost:3000. An Unsplash key is optional: without one, the site rotates through the 30 photos in `data/imageCache.json`. Plain Next.js development uses the bundled snapshot and never contacts the Unsplash API. The published Netlify scheduled function uses `UNSPLASH_ACCESS_KEY` and optional collection/topic overrides. Never commit credentials.

The old key was committed to repository history. Rotate it in Unsplash before deploying this refresh and set the replacement in Netlify's environment variables. Removing it from the current code does not invalidate it.

## Image behaviour

- The homepage and image APIs only read cached metadata. Visitor traffic, cold starts and the die never trigger Unsplash discovery requests.
- `netlify/functions/refresh-photos.mjs` fetches a batch of up to 30 landscape photos once per hour, with high content filtering. By default it searches the approved themes; collection/topic overrides are optional. Only the currently published production deploy may write. Preview/local scheduler invocations safely skip, and previews may read the shared pool.
- Netlify Blobs stores the last good full photo response and next-attempt time in the site-wide `unsplash-photos` store, surviving deploys and instance restarts. An atomic conditional reservation prevents overlapping refreshes. The normal discovery budget is one request per hour; required download events would be additional, see `docs/unsplash-production.md`.
- Failed refreshes retain the pool and back off for 1, 2, 4, then 8 hours, respecting longer `Retry-After` values. Rate-limit remaining is saved for diagnostics. Storage reservation failure makes no API request; missing credentials do not refresh. Unsplash requests time out after five seconds, storage requests after two seconds.
- Readers retain a last-good in-memory pool for storage failures and recheck storage once per minute per instance. Cold readers can use the bundled 30-photo snapshot for the default search source. A custom collection or topic never falls back to unrelated seed photos; it uses the local background until the first successful refresh.
- The first image starts with an inline blurred preview and readable white text; the sharp image fades in once decoded. Reduced-motion users get an immediate swap.
- An HttpOnly, SameSite, host-only cookie (`dnr_photos`, 30-day lifetime) records up to 90 attempted photo IDs, not a visitor identifier. Photos are selected randomly without repetition until the current pool is exhausted; cycle boundaries avoid an immediate repeat when at least two photos exist. Failed candidates are skipped too. Clearing/blocking cookies removes cross-reload history. Concurrent tabs can race on the cookie; this is best-effort browser history, not cross-device tracking.
- “Change of scenery” waits for a responsive candidate to download and decode, retains the current image during loading, and crossfades complete layers over 700ms. One next photo is prepared after the image settles (skipped for Save-Data/2G connections); a prepared but unused photo may be recorded in the history cookie. It tries at most three candidates; API/image timeouts are bounded and failure keeps the current scenery with retry feedback. A failed initial image tries alternatives, with the existing local background and white text as fallback.
- The die supports keyboard input, keeps focus while loading and respects reduced motion. Photographer attribution changes with the image. The layout, colour treatment and contact link remain intact.
- Responsive images load directly from Unsplash’s CDN at quality 65 with tracking parameters preserved. Adobe Fonts remains a direct head stylesheet with connection hints and CSS fallbacks; font-display is controlled by the Adobe web project.

The homepage and `GET /api/background` serialize photo ID, URL, colour, attribution and a small inline BlurHash preview. The preview is generated server-side; the decoder is not shipped to the browser. `GET /api/imageCache` retains the existing full response. Personalized responses are not cached. Download events are not yet emitted: the production-access interpretation is explicitly pending in `docs/unsplash-production.md`.

### Photo selection

The default scheduler rotates through **Quiet monumental**, **Otherworldly Earth** and **Hidden patterns**, using the queries in `lib/photo-selection.js`. Each invocation makes only one discovery request, requesting up to 30 landscape results with high content filtering. The source rotates between three phrases per theme and the first five available search pages. Photos must be at least 1920 × 1080, landscape, and no wider than 2.5:1. Each theme retains its last successful batch (up to 30); the combined pool deduplicates IDs and holds at most 90 images. A failure retains the previous pool and backs off. Automated filtering improves suitability but cannot guarantee composition or a good mobile crop.

The first successful refresh supplies one theme; two further successful hourly runs add the other two. Until then, local development and a new deployment use the existing bundled snapshot, which is **not** a preview of the new selection. Custom collection/topic overrides request random photos using the corresponding API parameter and the same size filters. Time-of-day selection remains deferred.

### Netlify cache rollout

1. Keep `UNSPLASH_ACCESS_KEY` available to **Functions** in the production deploy context. Leave `UNSPLASH_COLLECTION_ID` and `UNSPLASH_TOPIC_ID` unset for the approved searches. The legacy `bo8jQKTaE0Y` collection setting also maps to these searches; it was actually a Wallpapers topic ID. A genuine custom collection ID overrides searches; `UNSPLASH_TOPIC_ID` (ID or slug) takes precedence if both are configured.
2. After an approved merge/deploy, open Netlify **Functions → refresh-photos** and check its Scheduled badge. It runs hourly on the hour (UTC). Use **Run now** on the published production deploy for the first refresh; no redeploy is needed for future refreshes.
3. In the function log, expect `status: fresh` and a nonzero photo count. In **Blobs → unsplash-photos**, the `pool-themes-v1` entry (or `pool-<source-id>` for an override) contains images, `updatedAt`, `nextAttempt`, quota remaining and the latest search theme/query. Never edit the cache by hand to bypass its cooldown.
4. A preview's manual scheduler run intentionally does not write production data or spend API quota. Until the first production refresh, the default search source uses the seed snapshot. Production persistence and scheduler execution therefore require a post-merge check.
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

### Scheduled-function packaging check

The native scheduled function explicitly imports `getStore` from `@netlify/blobs` and passes it to the shared store factory. Keep that import: Netlify's native-function packaging can miss an SDK dependency referenced only through the shared CommonJS module, even when the Next.js build and source tests pass.

For a packaging regression check, run these commands from the project root in a local terminal (Node 24). The packager is installed under `/tmp`, not added to the project's dependencies:

```sh
npm install --prefix /tmp/dnr-function-packaging @netlify/zip-it-and-ship-it@16.2.2
node --input-type=module - <<'JS'
import { zipFunctions } from '/tmp/dnr-function-packaging/node_modules/@netlify/zip-it-and-ship-it/dist/main.js';
const root = process.cwd();
await zipFunctions(`${root}/netlify/functions`, '/tmp/dnr-packaged-check', {
  archiveFormat: 'none', basePath: root, repositoryRoot: root,
  config: { '*': { nodeVersion: '24.x' } },
});
JS
env -i PATH="$PATH" node tests/packaged-function-smoke.mjs /tmp/dnr-packaged-check/refresh-photos/netlify/functions/refresh-photos.mjs
```

The smoke test loads the isolated packaged function, uses synthetic credentials and intercepts all HTTP. It verifies SDK resolution, snapshot persistence, the cooldown and the preview write guard without calling Unsplash or Netlify. Actual production runtime credentials and the first live write still require post-deployment verification.
