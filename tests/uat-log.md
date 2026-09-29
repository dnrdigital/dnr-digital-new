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
