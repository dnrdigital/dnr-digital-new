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
- [ ] Rotate the exposed Unsplash access key; configure the replacement in Netlify.
- [ ] Review and approve the refresh PR, then merge/deploy.
- [ ] Verify production and confirm GitHub closes all 50 alerts after the default branch updates.
- [ ] Close superseded Dependabot PR #1 after the replacement is merged.
