# QA Preflight Phase 11

Phase 11 adds a repeatable static QA preflight for the Structured package.

## Added

- `tools/qa-preflight.js`
- `reports/qa-preflight-phase-11.json` is created when the QA command runs.

## What It Checks

- Every JS file listed in `release-manifest.json` exists and is loaded by `index.html`.
- Script load order matches the manifest.
- CSS and contract files listed in the manifest exist.
- Contract JSON files parse.
- HTML ids are unique.
- JavaScript `getElementById(...)` references resolve to existing HTML ids.
- Inline HTML handlers call functions present in the JS bundle.
- Runtime markers for config, license, schema, storage, and public API exist.

## Browser Note

The in-app browser automation policy blocked direct navigation to `file://` URLs during this phase. This preflight does not replace a human browser smoke test, but it catches structural regressions that would break the local file package.
