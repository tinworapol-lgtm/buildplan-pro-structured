# Quality Gate Phase 14

Phase 14 adds a single quality gate command for the Structured package.

## Added

- `package.json`
- `tools/quality-gate.js`
- `reports/quality-gate-phase-14.json` is created when the quality gate runs.

## Commands

```powershell
npm run quality
```

or directly:

```powershell
node tools\quality-gate.js
```

## What It Runs

1. `node tools\audit-production-readiness.js`
2. `node tools\verify-structured.js`
3. `node tools\qa-preflight.js`

## Status Meaning

- `pilotReady: true` means the local/demo package is suitable for controlled testing.
- `paidProductionReady: false` currently means CDN dependencies still need to be vendored or bundled before commercial release.
