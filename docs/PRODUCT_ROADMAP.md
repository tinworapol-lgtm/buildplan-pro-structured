# Product Roadmap

## Current Package

BuildPlan Pro is currently a structured browser-only prototype. It is suitable for internal testing, demo distribution, and controlled pilot use.

## Subscription Product Path

1. Backend Auth
   - Add secure login with cookie sessions.
   - Implement `GET /api/session`.
   - Keep frontend checks as UX gates only.

2. Billing
   - Implement monthly and yearly checkout.
   - Implement payment webhooks.
   - Store subscription status server-side.

3. License Enforcement
   - Switch `BuildPlanConfig.licensing.mode` away from `local-demo`.
   - Set `loginRequired: true`.
   - Fill session, license status, and checkout endpoints.

4. Data Sync
   - Use `contracts/project-file.schema.json` as the cloud record shape.
   - Keep migration in `BuildPlanSchema`.
   - Add per-user project ownership server-side.

5. Packaging
   - Keep this browser package as the frontend shell.
   - Move CDN dependencies to pinned local/vendor assets before commercial distribution.
   - Add build/deploy automation when a hosting target is chosen.
