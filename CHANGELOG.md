# Changelog

## phase-61-public-beta-trial - 2026-05-25

### Added

- Public beta mode for real signup/cloud-save rollout.
- Automatic 90-day beta trial creation with package `599` and billing cycle `trial`.
- Cloud project beta quota, payload limit, and project archive endpoint.
- Feedback API and admin beta summary scaffold.
- Public beta quality gate coverage.

### Updated

- Runtime config now points auth, license, readiness, cloud project, and feedback adapters at API endpoints.
- Supabase schema now includes trial fields, archived projects, feedback, and audit log tables.

## phase-60A-real-subscription-packages - 2026-05-25

### Added

- Added package-based subscription scaffold for BuildPlan Pro packages `Free`, `199`, and `599`.
- Added package-specific Stripe price environment variables for `199` and `599` monthly/yearly billing.
- Added `subscription-packages` quality gate coverage for checkout, readiness, webhook, schema, and config.

### Updated

- Updated checkout API to accept `packageCode` and `billingCycle`.
- Updated Stripe webhook and Supabase schema scaffold to store package code and billing cycle.
- Updated subscription contract and launch docs for package-based billing.

## phase-58-release-metadata-refresh - 2026-05-25

### Updated

- Refreshed release metadata after the production static-demo deployment and recent BuildPlan Pro planning features.
- Documented the current production URL, regression quality gate, and latest feature surface for handoff.
- Clarified that the current web deployment is a static-demo/pilot build; paid SaaS still needs real Supabase and Stripe environment activation.

### Recent Feature Baseline

- Default sample project data loads for first-time users.
- Project value header is synced with the cost summary total.
- Installment payment tracking now includes paid dates, cumulative paid value, and Executive Dashboard paid/earned reporting.
- Executive Dashboard supports report-date selection, schedule day status, and earned-vs-paid value delta.
- Actual Progress allows editing 100% values on the selected completion date.
- tools/phase-regression-preflight.js is now part of the quality gate to protect recent behavior.

## structured-phase-10 - 2026-05-19

### Added

- Release manifest for packaging and handoff.
- Product roadmap for subscription rollout.
- Release checklist for manual QA, packaging, and backend readiness.
- Verification checks for release metadata.

### Previous Structure Phases

- Phase 9: Project schema and migration boundary.
- Phase 8: Subscription API contract and checkout/session adapter methods.
- Phase 7: License/session adapter in local-demo mode.
- Phase 6: Runtime config layer.
- Phase 5: CSS module split.
- Phase 4: Storage split from core state.
- Phase 3: Public namespace.
- Phase 2: JavaScript module split.
- Phase 1: Structured copy from the standalone prototype.
