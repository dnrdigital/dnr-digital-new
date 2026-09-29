# Project refresh

## Review and security
- [x] Review current functionality, repository state and open GitHub alerts (29 September 2026).
- [x] Confirm scope: preserve the design; fix reliability, performance and accessibility.
- [x] Resolve all 50 currently open Dependabot alerts in the dependency tree.
- [x] Verify a clean install, production build and npm audit.

## Reliability and polish
- [x] Remove the hard-coded Unsplash key and production-domain fetch.
- [x] Make image caching safe for serverless execution, API failures and concurrent requests.
- [x] Keep content/contact visible when images fail; repair image markup and keyboard accessibility.
- [x] Replace starter documentation with actual setup and deployment instructions.
- [x] Add regression coverage and record browser UAT.

## Release (requires approval)
- [x] Restore access for production builds: Duncan confirmed `main` deployed successfully on 29 September 2026.
- [x] Resolve repository mismatch: Netlify was linked to `dnrdigital/dnr-digital`; reconnecting `dnrdigital/dnr-digital-new` restored deployment. Preview verification was superseded by the successful production deployment.
- [x] Update the Unsplash key: confirmed by Duncan on 29 September 2026.
- [x] Add `UNSPLASH_ACCESS_KEY` to Netlify and redeploy: confirmed by Duncan and verified against fresh production photo responses.
- [x] Verify fresh authenticated Unsplash refreshes: both homepage and API returned photos absent from the bundled snapshot; image loading returned 200.
- [x] PR #2 merged by Duncan; Netlify automatically deployed merge commit `9f63c47` on 29 September 2026.
- [x] Verify production: homepage/API return 200, photo returns an image, and GitHub reports zero open Dependabot alerts.
- [x] Close superseded Dependabot PR #1 after the replacement is merged.

## Performance polish
- [x] Move Adobe Fonts to a direct head stylesheet link and add font/image connection hints.
- [x] Compare image qualities across representative photos and use quality 65.
- [x] Trim homepage photo props while retaining the full image API response.
- [x] Run tests, production build and audit; verify desktop/mobile rendering and payload savings (15 tests pass; zero audit findings).
- [x] Review and merge performance PR #3: confirmed by Duncan and GitHub on 29 September 2026 (merge `5e1ce51`).
- [x] Verify performance release in production: homepage 200, quality 65, slim props and direct font stylesheet confirmed on 29 September 2026.

## Image rotation and Unsplash production access — approved 29 September 2026
- [x] Review current cache, selection filters and official Unsplash guidelines.
- [x] Agree shared metadata cache, refresh budget and per-browser non-repeating rotation.
- [x] Agree curated collection criteria and playful shuffle interaction; consider time-of-day pools separately.
- [ ] Resolve download-event semantics for this background/shuffle use case and budget required tracking requests.
- [x] Implement durable last-good metadata, bounded refresh/retry behaviour and image-load fallback with an hourly production scheduler.
- [x] Implement approved rotation/control with keyboard and reduced-motion support.
- [x] Remove the redundant success message so the scenery control stays in place after a successful change.
- [x] Test API failures, exhausted quota, concurrent/cold instances, repeat avoidance and attribution during transitions. Browser outage simulation retains the displayed image; see UAT log.
- [x] Draft accurate application description, curation criteria and unresolved download-event question in `docs/unsplash-production.md`.
- [ ] Capture final deployed desktop/mobile attribution evidence and submit only after the download-event requirement is resolved.
- [x] PR #4 merged as `c30316e`; deployed scheduler invocation reported by Duncan.
- [x] Production refresh after the missing-SDK fix confirmed working by Duncan on 29 September 2026.

## Scheduled function runtime fix
- [x] Reproduce missing `@netlify/blobs` in Netlify's packaged native function.
- [x] Make the native SDK import explicit and verify the isolated package with mocked HTTP.
- [x] Run source tests, production build and security audit; document repeatable packaging smoke test.
- [x] Deploy fix and confirm the first live refresh: Duncan confirmed it works on 29 September 2026. Confirmation is user-reported; no separate inspection of the live snapshot was performed in this follow-up.

## Scenery refinements — approved 29 September 2026
- [x] Agree Quiet monumental, Otherworldly Earth and Hidden patterns; defer time-of-day selection.
- [x] Add server-rendered BlurHash previews and decoded, complete-layer crossfades.
- [x] Prepare one next image, respecting reduced-data connections and reduced-motion transitions.
- [x] Rotate bounded themed searches hourly; retain per-theme last-good batches and correct topic/collection configuration.
- [x] Complete automated, packaging and desktop/mobile/failure browser verification (28 tests; build, audit and isolated packaged search refresh pass).
- [x] Prepare the refinement changes and deployment instructions for PR review.
- [ ] Review and merge/deploy the refinement PR after approval.
- [ ] Verify live themed pool after three successful production refreshes and review photo relevance/crops.
