# GitHub and Render handoff

Prepared 23 October 2026. Published to [domzxc/locusprototype](https://github.com/domzxc/locusprototype), branch `main`, under the user's explicit instruction. The initial push was verified against the remote branch and GitHub repository metadata; see [release log](release-log.md). Render deployment requires an authenticated Render account. A Render integration is available but has not yet been connected in this session.

## Release checks

The planning tests and production build were rerun before publication. Browser checks in `verification.md` remain outstanding because no supported browser is connected. Generate the final PDF after content sign-off. Only application source, tests, configuration and supporting documents are selected for Git; credentials, `.env` variants, browser settings, generated builds and local tool configuration are excluded. The bundled `skills` folder is local workflow material and is not required by the deployed app.

Use a new repository containing the application files, lockfile, tests, README, Render configuration and reviewed documents. Publish only the reviewed source selection; do not blindly upload every local file. Keep any supplied confidential challenge material outside the public repository unless publication rights have been established. The app and written approach use synthetic data.

## Render Static Site

Render documents free static-site deployment from a connected Git repository, with an `onrender.com` URL and deployment on pushes to the selected branch. Bandwidth and build pipeline usage count toward workspace allowances: [official static-site documentation](https://render.com/docs/static-sites).

1. Use [domzxc/locusprototype](https://github.com/domzxc/locusprototype), branch `main`. The README includes a [Deploy to Render link](https://render.com/deploy?repo=https://github.com/domzxc/locusprototype) that reads the repository's Blueprint.
2. In Render choose **New → Static Site**, then connect that repository.
3. Root directory: repository root. Build command: `npm ci && npm test && npm run build`. Publish directory: `dist`.
4. Node 24 is specified in `.node-version` and the Blueprint. No app secrets or backend are required.
5. Create the site and wait for the build to succeed. The `render.yaml` Blueprint sets `SKIP_INSTALL_DEPS=true` because the build command installs from the lockfile itself, then runs tests and builds. If configuring manually, set this variable too to avoid a redundant automatic install.
6. Open the generated HTTPS URL and perform the smoke checks below before sharing it.

Navigation is component state on one URL, so no nested SPA paths or fallback rewrites are required. Do not select a dynamic web service or use the legacy `server.mjs` for this static deployment.

## Will the JSON settings still work?

Yes. The application has browser-local JSON settings, not a shared JSON database on the server. Receiving-hour edits, traffic, costs and other applied assumptions are stored in localStorage and can be exported as version-2 domtransport-settings JSON (all six masters); legacy version-1 imports remain supported. Synthetic orders and dispatch plans are regenerated from that configuration and the seed. Version-2 plan exports are review snapshots, not settings imports.

Localhost and Render are different browser origins: export settings from localhost and import the file in Data studio at the live Render URL. They do not transfer automatically. Reloading or redeploying at the same hostname normally keeps localStorage. A different device, browser, private session, cleared site data or new hostname uses separate storage. Different users do not see each other's changes. A shared database would need a separate backend/data service and is outside the current prototype scope.

## Deployment smoke test

Open the hosted site in a fresh browser. Verify default 100-order plan, normal/peak switch, map tiles and attribution, vehicle manifest, GPS playback, insufficient-fleet exceptions, settings Apply and JSON export/import. Reload and confirm applied settings persist locally. Test a narrow screen and keyboard focus. Check browser console/network errors and compare the exported default plan with test evidence. Basemap and font resources need internet access.

## Release / rollback

Record the repository commit and deployed URL in the final submission. Keep the last known good deployment/commit. To roll back a published release, restore that reviewed version through Render's deployment controls or a normal Git revert and redeploy; do not rewrite shared Git history.

The final email package should contain the reviewed approach PDF, public GitHub source link and live Render app link. Email sending is not part of the currently completed work.
