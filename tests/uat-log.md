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

## 29 September 2026 — text entrance and contact hover

- Added a 650ms fade/rise with 50/150/250ms delays for heading, subtitle and contact. CSS animates opacity/transform only and releases its values after finishing, preserving existing colour/opacity interactions. The entrance is independent of image loading and is not keyed to photo changes.
- A temporary local HTTP fixture added event observation only: recorded exactly three text-arrive starts in heading/subtitle/contact order and three ends. Mid-animation computed values confirmed the stagger (heading opacity ~0.68, subtitle ~0.22, contact 0). Dice activation did not add any entrance events.
- Keyboard Tab reaches the mailto link; focus has a visible outline, a -2px vertical lift and a fully drawn underline. Pointer hover uses the same CSS effects, gated to fine pointers with hover capability; no mail application was launched during verification.
- A separate temporary fixture forced the existing prefers-reduced-motion CSS branch to match without changing OS preferences. All three text blocks were immediately visible with animation:none and transform:none; focused contact had no transform, a 0s transition and the visible underline. At 390 × 844 the document width remained 390px with no horizontal overflow.
- No application console warnings/errors. All 28 tests, production build and npm audit pass (zero vulnerabilities). No dependencies, new JavaScript or automated test files added for this presentation change; temporary fixtures are outside the repository.
# 29 September 2026 — missing scheduled themes

- Production browser inspection: Netlify lists the hourly `refresh-photos` schedule. Historical logs show 14:00:57 and 15:00:54 BST invocations with duration/memory only, without the handler's refresh message. Blobs lists `pool-themes-v1` at 245.9 KB; its contents were not downloaded successfully. This supports an early deployment-guard return; the exact missing runtime fields are not visible in the old logs.
- Official Netlify runtime inspection: deployment context defaults to an empty string and published to false when HTTP metadata headers are absent. Official scheduled-function docs guarantee automatic runs only on published deploys and document the `next_run` event body.
- Local regression: simulated hourly starts at 13:39, 14:00:57 and 15:00:54 populate all three themes. Same-hour duplicates remain blocked; failure backoff remains a full elapsed hour or longer. Scheduled events lacking HTTP metadata execute; explicit preview/unpublished and malformed events skip.
- No visual changes. Production recovery remains pending an approved deploy and live automatic-run verification; local tests do not establish that the live pool is repaired.

## 29 September 2026 — curated portrait/landscape rotation

- Source checks: 34 tests pass; Node 24 production build passes; npm audit reports zero vulnerabilities. Isolated native Netlify package passes with all four collection/orientation requests, synthetic credentials, mocked HTTP, persistence, cooldown and preview guard checks.
- Browser: production build at `http://127.0.0.1:3101`, using a temporary mocked Blobs store with four existing landscape seed photos and three portrait examples from the approved WEIRD collection. Portrait fixture metadata/credits are synthetic and were not added to the repository or deployed. No authenticated Unsplash API requests were made.
- At 1440×900, first load shows a landscape photo. At 390×844, a fresh load shows a portrait photo; the rendered image dimensions confirm portrait. The head has separate portrait/landscape media preloads and the page renders one active photo. Portrait dice changes remain portrait and update the visible credit.
- Crossing 1440×900 → 390×844 replaces the image through the existing decoded crossfade. Switching 390×844 → 844×390 → 390×844 during a simulated two-second API delay retains the portrait and clears busy state; the stale landscape result does not replace it.
- Forced 503 responses on an orientation change retain the previous image/credit, show retry feedback and leave the die usable. Restoring the API and pressing Enter on the die loads a matching landscape and clears feedback. Resizing 844×390 → 1200×800 keeps the same photo. Browser error/warning log is empty after these checks.
- Local production API returns the requested orientation for both valid values and 400 for invalid/array orientation parameters. Automated history tests verify exhausting one orientation does not reset the other.
- Production collection eligibility, counts and actual curation/crops remain pending deployment and the first authenticated refresh. The checked-in landscape seed remains the fallback until `pool-curated-v1` is populated.
# 30 September 2026 — service slides

- Approved layout implemented on `feature/service-slides`: strategy, procurement, project management and delivery link to four centred, full-screen sections with lorem ipsum. Links share the contact lift/underline styles. The photograph remains confined to the title slide; all service backgrounds use its metadata colour.
- Local production preview at `http://127.0.0.1:3105`: desktop 1280 × 720 and mobile 390 × 844 verified. All four service links land at their section's top and focus the destination. Desktop sections measure 720px high. Mobile project management wraps cleanly, and the document has no horizontal overflow.
- Fixed control stays 16px from the bottom-left edges: New perspective changes the photo on the title; the up arrow in the die outline returns to the title. Keyboard Enter navigates to project management and back; return restores focus to the title. Dice activation retains keyboard focus, changes the loaded image and credit, and clears its busy state.
- Observed service background matching the photo backing for both light `rgb(243, 243, 243)` and dark `rgb(12, 38, 12)` images, with black/white text respectively. Service sections contain no image elements. Console warning/error log is empty.
- Smooth scrolling is active in computed desktop CSS. The reduced-motion rule switches it to auto and retains the existing animation reductions; OS reduced-motion preference was not changed for this check.
- Node 24: 34 tests pass, production build passes, npm audit reports zero vulnerabilities. No dependency changes. Production merge/deployment remains pending approval.
# 30 September 2026 — service slide follow-up

- Perspective control restored to bottom-right; return arrow remains bottom-left. New label wraps naturally into “Take a new” / “perspective”, with a non-shrinking 32px die. At 390 × 844 the control is 48px high, 16px from the right/bottom content edges, and the two-line label is 30px high. Service dividers are centred dots with .5em spacing on either side, including the hidden text-fit sizing copy.
- Reported cathedral checked against the actual browser image: source `sn_GTCzcBqo`, stored dimensions 4195 × 2797; decoded responsive image 792 × 528, confirming landscape. Local bundled metadata contains 30 landscape photos and no portraits. The existing explicit cross-orientation fallback therefore explains a landscape image in portrait; it does not establish an incorrect landscape selection. Clarification requested before changing selection behaviour.
- Mobile image and title both cover the 375 × 844 content viewport with no horizontal overflow. 34 automated tests and production build pass; npm audit reports zero vulnerabilities. Image-selection code is unchanged in this follow-up.
# 30 September 2026 — shared bottom-right control

- Duncan clarified that both states must occupy the same bottom-right position and changed the title label to “Want a new perspective?”. Both states now use one shared position and a 6rem label width; the perspective wording wraps onto two lines.
- Browser at 1280 × 720: both button states have identical bounds (left 1085.8125, top 656, width 163.1875, height 48), with 16px right/bottom offsets inside the content viewport. Keyboard Enter on strategy scrolls to its slide and switches the control to Back to top. Current user preview also shows the updated two-line wording.
- All 34 tests and production build pass; npm audit reports zero vulnerabilities. This supersedes the earlier instruction to keep the return arrow on the left.
# 30 September 2026 — matching underline gaps

- Service links' .4em vertical click-area padding was pushing the underline away from the text. The shared underline offset now accounts for that padding without changing the hit area or layout.
- Browser computed styles confirm all four service links and Get in touch have the same .120em offset below their text content. Keyboard focus still shows the shared lift and underline. 34 tests and production build pass; npm audit reports zero vulnerabilities.
# 30 September 2026 — approved visual-only release

- Duncan approved publishing the visual updates with service navigation inactive. A disabled source flag preserves the draft slide implementation while rendering service labels as non-interactive spans and omitting all placeholder sections from the published page.
- Local production browser: zero service anchors, zero service slides, no Lorem ipsum in the page, and document height equals viewport height (720px). Clicking strategy leaves the URL hash empty and scroll position at zero. Contact remains a mailto link; Want a new perspective? remains the active photo control.
- All 34 tests and production build pass; npm audit reports zero vulnerabilities. Live deployment verification follows publication.
