# Project instructions

- Preserve the single-page DNR.DIGITAL design; agree significant features or redesigns first.
- Use a `fix/` or `feature/` branch. Never commit to main; merging/deploying requires Duncan's approval.
- Work is tracked in the project-root `tasks.md`; there is no configured issue-based workflow.
- Run `npm test`, `npm run build`, and `npm audit` after relevant changes. Record browser verification in `tests/uat-log.md`.
- Use Node 24 (see `.nvmrc`). Keep credentials in environment variables, never source files.
- The site uses Next.js Pages Router and Netlify. Keep image loading compatible with serverless, read-only filesystems.
