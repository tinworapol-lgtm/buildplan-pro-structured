# BuildPlan Pro - Structured Prototype

BuildPlan Pro is a Thai-language construction planning prototype for Gantt charts, S-Curves, work value summaries, installment/payment tracking, Actual Progress, Executive Dashboard reporting, import/export, local autosave, and production web demo deployment.

## Current Production Demo

https://buildplan-pro-structured.vercel.app/

The current production deployment runs in static-demo mode. It is suitable for pilot/demo usage and product review. Real paid SaaS operation still requires activating Supabase/Stripe environment variables and backend services.

## Main Files

- index.html - app shell and page markup.
- assets/css/buildplan.css - stable stylesheet entrypoint.
- assets/js/config/app-config.js - product metadata, storage keys, feature flags, and static-demo backend settings.
- assets/js/modules/ - planner modules for storage, Gantt, Actual Progress, Dashboard, cost/S-Curve, and editing.
- assets/js/services/ - app shell, auth/license/cloud adapters, SaaS readiness, account/cloud UI, and mock subscription UI.
- contracts/ - planned backend/API contracts.
- tools/quality-gate.js - full local quality gate.
- tools/phase-regression-preflight.js - regression checks for recent planning/dashboard/payment behavior.

## Local Preview

```powershell
node tools\serve-local.js --port 4177
```

Then open:

```text
http://127.0.0.1:4177/
```

## Quality Gate

```powershell
node tools\quality-gate.js
```

Expected important lines:

```text
PASS phase-regression
pilot ready: true
paid production ready: true
```

## Next Recommended Step

Activate the real SaaS backend path: configure Supabase Auth, Supabase project storage, Stripe checkout/webhooks, then switch assets/js/config/app-config.js away from static-demo endpoints.
