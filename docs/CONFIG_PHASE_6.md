# Config Phase 6

Phase 6 adds a dedicated runtime config layer without changing the current browser-only behavior.

## Added

- `assets/js/config/app-config.js`
- `BuildPlanConfig` global for product metadata, schema version, storage key, feature flags, and future licensing settings.
- `BuildPlan.modules.config` public namespace.

## Why

Subscription, login, and license checks should not be hard-coded into storage, rendering, or task editing files. This config boundary lets the app keep running in `local-demo` mode while a backend service is designed separately.

## Future Integration Points

- `BuildPlanConfig.licensing.mode`: switch from `local-demo` to a backend-backed mode.
- `BuildPlanConfig.licensing.loginRequired`: gate app startup after auth is available.
- `BuildPlanConfig.licensing.endpoints.session`: validate logged-in sessions.
- `BuildPlanConfig.licensing.endpoints.licenseStatus`: check monthly/yearly subscription validity.
- `BuildPlanConfig.licensing.endpoints.checkout`: start payment or renewal.
