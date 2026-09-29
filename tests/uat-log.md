# UAT log

## 29 September 2026 — project refresh

Environment: Node 24.19.0, clean `npm ci`, Next.js 15.5.26 production build at `http://127.0.0.1:3100`, no Unsplash key configured. Automated tests mock Unsplash; a fresh authenticated API fetch still needs checking with the replacement key before release.

| Check | Result |
| --- | --- |
| Production homepage returns 200; consultancy content and contact render without a key | Pass |
| Desktop 1440 × 900: background loads, original layout and blend classes retained, no horizontal overflow | Pass |
| Mobile 390 × 844: background covers viewport, service text wraps, contact remains visible, no horizontal overflow | Pass |
| Keyboard Tab reaches photographer, Unsplash and contact links; contact has a visible outline and correct mailto URL | Pass |
| Decorative image does not add a redundant accessible description; page declares English | Pass |
| Simulated remote image 404 switches to the bundled local background with white text and keeps the contact link | Pass |
| API GET returns an image and rotates on successive requests; `Cache-Control: no-store` | Pass |
| API POST returns 405 and `Allow: GET` | Pass |
| Clean install and production build | Pass |
| Regression tests: rotation, missing key, concurrent requests, elapsed refresh time, rate limits, network errors, timeout, malformed responses, empty cache and CDN tracking parameters | 12 pass |
| npm audit | Zero vulnerabilities |
| Patched lockfile compared against all 50 open Dependabot advisory ranges | Zero matching vulnerable versions |

The image-failure browser check used a temporary localhost proxy to replace the photo URL with an unavailable image. No fixture routes or failure flags were added to the application. An earlier preview was invalidated while dependencies were being replaced; only the clean-build checks above are acceptance evidence.

Release checks still pending: replacement Unsplash key, Netlify environment/runtime settings, deployment smoke checks and GitHub's default-branch security rescan. Reduced-motion CSS is implemented but was not separately exercised in the browser.

Netlify preview for PR #2 failed before build execution: `git@github.com: Permission denied (publickey)` while cloning `dnrdigital/dnr-digital-new`. Repository access must be restored before preview/deployment can be verified. Log: https://app.netlify.com/projects/dnr-digital/deploys/6abb881d320f0c00082cb6c1

## Production verification — 29 September 2026

PR #2 merged as `9f63c47`. Netlify deployment `6abb90e46c80fd0008af8413` completed and reported the site live at 11:21 BST. The repository mismatch was corrected: the project had been linked to `dnrdigital/dnr-digital`, whereas this application's repository is `dnrdigital/dnr-digital-new`.

- `https://dnr.digital/` returned 200 with the new document language and contact link.
- `/api/imageCache` returned 200 with `Cache-Control: no-store`.
- A production photo URL returned 200 with an image content type.
- GitHub reported zero open Dependabot alerts; superseded Dependabot PR #1 was closed.
- Duncan confirmed the Unsplash key was updated. Sampled production photo IDs still belonged to the bundled snapshot; a fresh authenticated refresh remains unverified.

Follow-up: Netlify’s signed-in environment settings for `dnr-digital` show “No environment variables set for this project”. Add `UNSPLASH_ACCESS_KEY` and redeploy before verifying fresh Unsplash refreshes. The key update itself is confirmed by Duncan.

Final credential verification: after Duncan configured `UNSPLASH_ACCESS_KEY` and redeployed, the production homepage returned photo `vrwkh1Jrozs` and `/api/imageCache` returned `QEvJmLVzlgQ`. Neither exists in the bundled snapshot, confirming successful fresh Unsplash fetches. Both routes returned HTTP 200, and the homepage photo returned HTTP 200 with `image/jpeg`. GitHub still reports zero open Dependabot alerts. All release checklist items are complete.

## Performance polish — 29 September 2026

Local production build, Node 24.19.0 / Next.js 15.5.26. No dependency changes.

| Check | Result |
| --- | --- |
| Automated regression tests | 15 pass, including page-props serialization and preservation of the API photo |
| Production build / npm audit | Pass / zero vulnerabilities |
| Adobe Fonts stylesheet | Direct link in document head; no Typekit import in generated application CSS |
| Connection hints | Font host and Unsplash image host present in document head |
| Image quality | Rendered image and srcset use quality 65; tracking parameters retained |
| Desktop 1440 × 900 | Photo loaded, FatFrank rendered, attribution/contact intact, no browser warnings/errors |
| Mobile 390 × 844 | Photo loaded at 640px source width; content fits without horizontal overflow; contact keyboard focus visible |
| Homepage/API smoke checks | HTTP 200; API retains full photo metadata; POST still returns 405 |
| Homepage photo props, same saved photo | 4,220 → 275 bytes JSON (93.5% smaller) |
| Standalone props Brotli compression | 1,222 → 217 bytes; this is a payload comparison, not a measurement of full-page wire bytes |

Compared four 1440px AVIF photos with the site's existing visual treatment:

| Photo | Quality 75 bytes | Quality 65 bytes | Saving |
| --- | ---: | ---: | ---: |
| Ocean through car window (`N90UFM6fTHQ`) | 17,210 | 15,049 | 12.6% |
| Coloured shapes (`h0aDp_wUtyM`) | 37,865 | 33,836 | 10.6% |
| Sports car (`96ES9AOLRzQ`) | 48,724 | 45,191 | 7.3% |
| City street (`0jvACDxsB7U`) | 91,791 | 84,050 | 8.4% |

Quality 65 showed no obvious visual regression in the side-by-side review; results vary by photograph, format and viewport. Adobe's hosted CSS still specifies `font-display: auto`; the shared Adobe project was not changed. No throttled Lighthouse/Core Web Vitals score is claimed. Page caching and rotation frequency remain unchanged. Production rollout requires approval.

## 29 September 2026 — shared pool and Change of scenery

- Approved scope: one existing curated landscape collection, durable cache, non-repeating rotation and an accessible die. Time-of-day pools deferred.
- Local production build at `http://127.0.0.1:3103`: desktop and 390 × 844 mobile verified. Die changes the photograph and matching attribution. Mobile document width equals viewport width (390px). No application console warnings/errors on the normal page.
- Keyboard: visible focus outline; Enter activates the die; focus remains on the die throughout loading and completion. Repeated clicks while a request is active are guarded. Reduced-motion CSS disables the tumble and image-entry animation; OS preference was not changed for this check.
- 31 sequential HTTP page loads with the history cookie: first 30 photo IDs unique; no immediate repeat at cycle boundary. Shuffle excludes current photo; personalized responses are private/no-store; POST rejected with 405. Existing `/api/imageCache` still returns full metadata including `download_location`.
- Temporary localhost failure proxy returned 503 for shuffle requests: exactly three attempts, previous image and attribution retained, bounded retry feedback shown, control becomes available again. This was a local simulated service outage, not an interruption of production.
- Automated tests cover shared cold readers, atomic concurrent reservations, hourly request limits, missing credentials, storage/HTTP/network/timeout/JSON failures, exponential backoff, attribution validation, cookie history and preview scheduler write protection.
- Production performance release PR #3 confirmed live: HTTP 200, quality 65 URLs, slim props and direct Adobe stylesheet.
- Remaining deployment verification: actual production Blobs persistence and published scheduled refresh must be checked after an approved merge. Preview functions cannot write the production pool or spend discovery quota. Download-event interpretation and application screenshots/submission remain pending; this release is not a claim of full Unsplash production-access compliance.
- Follow-up browser fault check: a deliberately broken initial Unsplash URL plus unavailable alternatives produced exactly three recovery attempts, then a loaded `/background.jpg`, white heading text and an available retry control.
- Netlify preview for PR #4, code commit `e0517af`: build/checks passed. Three deployed HTTP reloads plus a shuffle returned four different IDs with private/no-store responses and history cookies. Deployed browser shuffle loaded its replacement, updated the credit, retained focus and emitted no console warnings/errors. Production-only scheduled writes remain intentionally untested before merge.
- Pre-deployment adjustment requested by Duncan: removed the redundant “New scenery” success message. Browser check confirmed a different loaded photo and updated top credit, an empty status region, and identical button top position before/after (928px). Retry feedback remains. All 22 tests, production build, dependency audit and diff checks pass.

## 29 September 2026 — scheduled function dependency packaging

- Duncan reported `MODULE_NOT_FOUND: @netlify/blobs` from the published `refresh-photos.mjs` invocation at 12:32. PR #4 was merged as `c30316e`; the scheduler's first successful live cache refresh remains unverified.
- Reproduced the exact missing-module failure using Netlify zip-it-and-ship-it 16.2.2 and an isolated native v2 function package outside the repository. The original package contained the shared application code but omitted the SDK.
- Fix: explicitly import the SDK's `getStore` in the native ESM function and inject it into the shared store factory. Netlify now traces and includes the Blobs SDK and its runtime dependencies. No dependency versions, credentials, quotas or schedule changed.
- Isolated packaged smoke test passed with an empty inherited environment, synthetic credentials and mocked HTTP only: SDK loads; conditional reservation and completed snapshot are written; one mocked Unsplash discovery; second invocation observes cooldown; preview invocation cannot write. No production cache mutation or API quota consumption during testing.
- All 22 source tests, Next.js production build, dependency audit (zero findings) and diff checks pass. Next's homepage and background API traces also include the Blobs SDK.
- Remaining: merge/deploy the fix after approval and run the published production scheduler once, then confirm a fresh snapshot in Blobs and rotation on the live site.
- Follow-up: Duncan confirmed “that works” after the deployment and Run now instructions on 29 September 2026. Production refresh acceptance is user-confirmed; this follow-up did not independently inspect the live Blobs entry. The runtime-fix tracking is complete.

## 29 September 2026 — themed scenery and smoother loading

- Approved: Quiet monumental, Otherworldly Earth and Hidden patterns; initial blurred preview, decoded crossfade and one prepared next image. Time-of-day selection deferred.
- 28 automated tests pass. Coverage includes source migration and explicit topic/collection filters, phrase/page rotation, image dimensions, bounded 90-photo themed pools, last-good retention on empty/failed searches, BlurHash validation and decode/abort failure handling. Existing quota, concurrent reservation, attribution and cookie tests continue to pass.
- Production build passes; npm audit reports zero vulnerabilities. BlurHash is decoded on the server and is not imported by browser components. No live Unsplash discovery requests were used for these checks.
- Native Netlify package tested outside the repository with clean environment, synthetic credentials and intercepted HTTP: default themed search, Blobs reservation/persistence, cooldown and preview guard pass. SDK packaging remains intact.
- Local production server at port 3110: desktop image/credit swap verified; observed outgoing opacity 1 and incoming opacity 0.094 during the final crossfade, with both image elements complete. The outgoing image element is retained across the transition. Dice remains busy through the fade and its top position is unchanged on success; no success status text. No application console warnings/errors.
- Mobile 390 × 844: document width 390px, no horizontal overflow; keyboard Enter changes the photo and credit and retains focus. The control returns to its available state. Reduced-motion CSS and timer paths are implemented; the OS preference was not changed in this browser check.
- Local slow-image fixture delayed the initial photo by 12 seconds. During the delay, an inline blurred preview and white readable text were visible, with attribution present; the sharp image appeared after completion.
- Local 503 fixture: one prepared attempt plus two click-time attempts, current photo and credit retained, retry message shown, control available. Broken-initial-photo plus failed alternatives: three recovery requests, loaded local background, white text, no misleading Unsplash credit.
- Local Save-Data fixture: zero automatic candidate requests after the initial image settled. Manual dice activation made exactly one candidate request, loaded a different photograph and matching credit, and returned the control to its available state.
- Default configuration and legacy Wallpapers collection setting now use `pool-themes-v1`. Local/preview seed photos are not evidence of the new search aesthetics. After approved production deployment, Run now once and allow subsequent hourly runs to populate all three themes; review relevance and desktop/mobile crops. Custom collection/topic overrides continue to take precedence as documented.
- Unsplash download-event semantics remain unresolved; this refinement does not claim production-access compliance or emit speculative tracking events.

## 29 September 2026 — text shadow and theme-pool follow-up

- Production Netlify function log inspected directly: 13:39:28 BST invocation returned fresh, 29 photos, remaining quota 49, theme quiet-monumental, query brutalist architecture. This is the first themed batch, not evidence that the other themes are being discarded.
- The saved nextAttempt is 14:39:27 BST. With the hourly schedule, the 14:00 invocation should observe cooldown; the next two successful refreshes at 15:00 and 16:00 should add Otherworldly Earth and Hidden patterns. These future outcomes remain unverified. No manual invocation, cache mutation or schedule change was made during this investigation.
- Replaced Tailwind shadow-2xl (rectangular box-shadow) with a subtle text-shadow on the heading, service line and contact link. Desktop visual review confirms shadows follow letter shapes. At 390 × 844, all three blocks compute box-shadow:none and text-shadow:rgba(0,0,0,0.3) 0px 2px 8px; document width remains 390px and the photo loads.
- All 28 tests and the production build pass; npm audit reports zero vulnerabilities. No new tests added for this CSS-only change.

## 29 September 2026 — DNR favicon

- Added a self-contained vector D monogram in white on #10293a; replaced favicon.ico with 16, 32 and 48px PNG-backed ICO entries and added a 180px Apple touch icon. No font or external image requests are required by the icon.
- Icon links now live in the global document head with versioned URLs; removed the old homepage-only declaration. Homepage and 404 HTML each include the expected SVG, ICO and Apple touch URLs without duplicate old declarations.
- Visually inspected the generated D icon. Decoded every ICO entry and verified its actual dimensions; Apple touch PNG is 180 × 180. All three versioned asset URLs returned HTTP 200 with appropriate image MIME types from the local production server.
- Browser page renders normally and exposes the icon declarations. The automation extension badges favicons on controlled tabs, so raw HTTP head output and decoded icon assets were used to verify the original favicon rather than treating that modified tab icon as production evidence.
- All 28 tests, production build and npm audit pass; zero vulnerabilities. No dependencies or application behaviour changed, and no new automated tests were needed for the static asset change.
