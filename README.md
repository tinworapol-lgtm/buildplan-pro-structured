# BuildPlan Pro - Structured Prototype

This folder is a structured copy of the standalone prototype. The original file is intentionally left unchanged:

- Source: `D:\AI\01-แผนงานก่อสร้าง\NEW\BuildPlan-Pro-Construction-Schedule-Actual-Prototype.html`

## Files

- `index.html` - page shell, external CDN links, markup, and ordered script loading.
- `release-manifest.json` - release metadata for packaging and handoff.
- `CHANGELOG.md` - phase and release history.
- `assets/css/buildplan.css` - stable stylesheet entrypoint that imports CSS modules.
- `assets/css/buildplan.bundle.css` - backup of the previous monolithic stylesheet.
- `assets/css/modules/` - feature-level CSS modules.
- `assets/js/config/app-config.js` - product metadata, storage keys, feature flags, and future subscription settings.
- `assets/js/services/license-adapter.js` - isolated local-demo/license/session adapter.
- `assets/js/modules/` - ordered browser scripts split by responsibility.
- `tools/verify-structured.js` - local structure and parse verification.
- `contracts/subscription-api.contract.json` - planned backend contract for session, license status, checkout, and payment webhooks.
- `contracts/project-file.schema.json` - saved project file schema for import/export and future cloud records.
- `docs/` - structure notes and phase history.

## Current State

This is still a browser-only HTML application. It uses CDN dependencies for Tailwind, Font Awesome, Google Fonts, and SweetAlert2. Autosave still uses `localStorage`, but the storage key and product metadata now come from `BuildPlanConfig`.

## Next Recommended Step

Add a dedicated auth/license adapter that reads from `BuildPlanConfig.licensing`. Keep the app usable in `local-demo` mode until the backend login and subscription service are ready.

## Local Preview

Run:

```powershell
node tools\serve-local.js --port 4177
```

Then open `http://127.0.0.1:4177/`.

## Production Readiness Audit

Run:

```powershell
node tools\audit-production-readiness.js
```

The current package is pilot-ready, with paid-production packaging pending local/vendor replacement for CDN dependencies.

## Quality Gate

Run all local checks:

```powershell
npm run quality
```

No dependency install is required for the current scripts.

## Start For Users

Double-click:

```text
Start-BuildPlan-Pro.cmd
```

This starts the local preview server and opens `http://127.0.0.1:4177/`.

## Web Demo Deploy

Check locally first:

```powershell
node .\tools\quality-gate.js
```

Deploy preview with Vercel:

```powershell
vercel
```

Deploy production:

```powershell
vercel --prod
```


## Current Web Demo

https://buildplan-pro-structured.vercel.app/

This is a static demo deployment. Subscription/login/cloud storage are planned backend phases.
