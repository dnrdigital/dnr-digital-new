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
- [ ] Review and approve the performance PR, then merge/deploy and verify production.
