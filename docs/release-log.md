# DomTransport release log

## 23 October 2026: initial GitHub publication

- Repository: https://github.com/domzxc/locusprototype
- Published branch: `main`.
- Initial application commit: `e5adb987dc8bbc462397f33e1fa082e237353520`.
- Verified `git ls-remote origin refs/heads/main` matched the local initial commit after push. GitHub's repository API confirmed the public repository and `main` default branch.
- Publication contains application source, lockfile, tests, Render configuration and approach/panel/deployment documents. Local workflow skills, legacy scaffold, dependency folders, generated builds, local settings and credentials were excluded.
- Checks: 17 planning tests passed; TypeScript and Vite production build passed. Vite's known large MapLibre chunk warning remains documented.
- Render Blueprint: Node 24, `npm ci && npm test && npm run build`, publish `dist`.
- Render service: not created in this session; the Render integration has not been installed/connected. No hosted URL or successful Render deployment is claimed.
- Browser/UI and hosted smoke checks remain outstanding. The final approach PDF remains pending content review.

Use [Deploy to Render](https://render.com/deploy?repo=https://github.com/domzxc/locusprototype) to open the repository's Blueprint in your Render account. Review the single static-site resource and deploy it. Alternatively, connect the Render integration to continue deployment from this chat.

Applied JSON settings remain local to each browser origin. Export settings from localhost and import them at the Render URL; hosting does not automatically transfer browser storage or turn it into a shared database.

## 23 October 2026: retailer-management update

Added synthetic retailer profile management and a separate ten-record Metro Manila public reference catalog. Existing receiving windows migrate into editable profiles. Applied active Pasig profiles drive the demo; public references stay out of dispatch. Added data source/workflow notes, schema tests and a browser-QA checklist. Twenty-five automated tests and the production build pass; browser and hosted verification remain outstanding. This update does not establish verified retailer receiving schedules or current branch operation.
