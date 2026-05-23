# Release Checklist

## Before Sharing With Test Users

- Run `node tools\verify-structured.js`.
- Open `index.html` in a browser and confirm the Gantt page loads.
- Test project save/export.
- Test project import with a freshly exported JSON file.
- Test autosave restore.
- Test print preview for the schedule report.
- Confirm duration table has no horizontal overflow at target screen sizes.
- Confirm S-Curve smooth/normal toggle still affects the chart.

## Before Paid Subscription

- Replace `local-demo` license mode with backend-backed mode.
- Set `BuildPlanConfig.licensing.loginRequired` to `true`.
- Implement all endpoints in `contracts/subscription-api.contract.json`.
- Store subscription state server-side.
- Add payment webhook verification.
- Add server-side project ownership and access checks.
- Avoid relying on frontend code as a license authority.

## Packaging Notes

- Do not distribute the original prototype as the commercial package.
- Use the Structured folder as the source package.
- Keep `release-manifest.json` updated for each release candidate.
- Keep `CHANGELOG.md` updated with user-facing changes.
