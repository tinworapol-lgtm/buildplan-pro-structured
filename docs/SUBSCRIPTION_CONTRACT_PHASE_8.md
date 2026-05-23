# Subscription Contract Phase 8

Phase 8 adds a backend-facing contract and extends the local license adapter with session and checkout entrypoints.

## Added Adapter Methods

- `BuildPlanLicense.getSessionStatus()`
- `BuildPlanLicense.startCheckout(plan)`
- `BuildPlan.modules.license.getSessionStatus()`
- `BuildPlan.modules.license.startCheckout(plan)`

In `local-demo` mode these methods return safe placeholder data and do not block the app.

## Backend Contract

See `contracts/subscription-api.contract.json`.

The contract defines four planned endpoints:

- `GET /api/session`
- `GET /api/license/status`
- `POST /api/checkout`
- `POST /api/webhooks/payment`

## Integration Notes

- Use secure cookie sessions for browser login.
- Keep license checks server-side; frontend checks are UX gates, not security.
- Project files should still be treated as user data, not license authority.
- Monthly/yearly subscription status should come from the backend response, then the adapter can update `BuildPlanLicense` state.
