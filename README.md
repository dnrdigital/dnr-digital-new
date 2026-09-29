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

Open http://localhost:3000. An Unsplash key is optional: without one, the site rotates through the 30 photos in `data/imageCache.json`. Add `UNSPLASH_ACCESS_KEY` to `.env.local` to refresh from Unsplash, and optionally change `UNSPLASH_COLLECTION_ID`. Never commit credentials.

The old key was committed to repository history. Rotate it in Unsplash before deploying this refresh and set the replacement in Netlify's environment variables. Removing it from the current code does not invalidate it.

## Image behaviour

- The homepage and `GET /api/imageCache` share `lib/image-cache.js`; local development and previews no longer call the production domain.
- A valid key enables a batch of 30 landscape photos from the configured collection. Refreshes are awaited, limited to one attempt per five minutes per instance, and concurrent requests share the same attempt.
- Refreshes time out after 2.5 seconds and retain the last good photos on errors, invalid responses or rate limits. The bundled JSON is a read-only starting snapshot; nothing writes to the deployed filesystem.
- Caches are per serverless instance, not a global rate limiter. Cold starts can each make a request. If traffic grows, revisit shared caching or scheduled refreshes against the actual Unsplash quota.
- If a remote image fails, the existing local `public/background.jpg` is shown with white text. The consultancy content and contact link remain usable even if both images fail.
- Responsive images load directly from Unsplash’s image CDN at quality 65 with its tracking parameters preserved, avoiding a second optimization proxy. Photographers and Unsplash are credited. Adobe Fonts remains an external dependency, with CSS font fallbacks. Its stylesheet is linked directly in the document head, with connection hints for the font and image hosts. Font-display is controlled by the Adobe web project.

The homepage serializes only image URL, colour and photographer attribution into its page props. The image API retains its full photo response. Page rendering and photo rotation are unchanged; no page caching has been added.

## Verification

```sh
npm test
npm run build
npm audit
npm start
```

Tests cover photo rotation, missing credentials, concurrent refreshes, refresh timing, upstream errors, invalid data and fallback behaviour. Browser checks are recorded in `tests/uat-log.md`. Work is tracked in the project-root `tasks.md`.

## Dependencies

The September 2026 refresh keeps Next.js 15, React 18 and Tailwind 3 to limit migration risk. It removes unused `fs`, `fitext`, `textfit-web-component` and `unsplash-js` packages. The latter is replaced by Node's native fetch.

The `next.postcss` override uses the project's patched PostCSS 8 version because Next 15 pins an older vulnerable release. Keep the override until Next's dependency is patched, and run the production build when changing it. Do not use `npm audit fix --force` to jump framework majors without reviewing the migration.

## Deployment

Netlify runs `npm run build` and publishes `.next` using its Next.js adapter. The site needs a server runtime; it cannot use `next export`. Node 24 is selected by `.nvmrc` and `engines.node`. Check any existing Netlify `NODE_VERSION` and function runtime overrides before deploying.

Merge and deployment require Duncan's approval. Before deployment, rotate/configure the Unsplash access key. After deployment, check the homepage, image loading, photo attribution, email link and `/api/imageCache`, then check GitHub's Dependabot alerts on `main`. Alerts will remain open until the patched lockfile reaches the default branch and GitHub rescans it. Dependabot PR #1 is superseded by this refresh and can be closed after merge.
