# Render deployment verification - 24 October 2026

- App: https://domtransport.onrender.com
- Repository: https://github.com/domzxc/locusprototype
- User triggered Manual Deploy and confirmed "deployed" in this session.
- Before the deploy, the public app returned HTTP 200 but served older assets `index-B0Y5MQ4-.js` / `index-CnjDDCYM.css`, without CSV exports and current unserved labels.
- After the deploy, the public app returned HTTP 200 with `/assets/index-CqFchSpm.js`. This matches the local production asset name built from application commit `62e4468`.
- The fetched public JavaScript contains `Export network CSV` and `Unserved (planned)`. These were absent before deployment. Public responses establish that the prior CSV/filtering release is now hosted.
- No Render credentials were requested or copied from GitHub. This session has no authenticated Render integration, Render CLI credentials or browser surface. The user's manual deploy provided the release action.

The later fleet-experiment crew UI and submission package are additional changes after this observed release. Their deployment status must be checked separately after GitHub publication. HTTP assets do not establish full browser interaction, WebGL, external road-service availability or an actual delivery result. Run the browser smoke checks in deployment.md before the panel demo.
