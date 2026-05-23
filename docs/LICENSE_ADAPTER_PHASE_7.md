# License Adapter Phase 7

Phase 7 adds a license/session adapter without changing the current local-demo behavior.

## Added

- `assets/js/services/license-adapter.js`
- `window.BuildPlanLicense`
- `BuildPlan.modules.license`

## Current Behavior

The app remains usable offline because `BuildPlanConfig.licensing.mode` is still `local-demo`. The adapter publishes a license state of `active` and adds lightweight body data attributes:

- `data-license-mode`
- `data-license-status`

## Future Backend Flow

When a backend is ready:

1. Change `BuildPlanConfig.licensing.mode` from `local-demo` to a backend mode.
2. Set `loginRequired` to `true`.
3. Fill `endpoints.session`, `endpoints.licenseStatus`, and `endpoints.checkout`.
4. Add UI gates that read `BuildPlan.modules.license.isLicenseActive()`.

The adapter is deliberately separate from storage, Gantt rendering, cost calculation, and task editing so subscription behavior can evolve without destabilizing core planning features.
