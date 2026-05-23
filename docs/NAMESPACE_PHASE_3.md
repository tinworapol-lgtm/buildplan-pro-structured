# Namespace Phase 3

## What Changed

Two classic scripts were added around the existing feature files:

- `assets/js/modules/00-buildplan-namespace.js` creates `window.BuildPlan`.
- `assets/js/modules/07-public-api.js` registers grouped public APIs.

The existing global functions are still present for inline HTML handlers. This phase only creates stable boundaries for later refactors.

## Public Namespaces

- `BuildPlan.modules.core`
- `BuildPlan.modules.storage`
- `BuildPlan.modules.duration`
- `BuildPlan.modules.gantt`
- `BuildPlan.modules.actual`
- `BuildPlan.modules.dashboard`
- `BuildPlan.modules.cost`
- `BuildPlan.modules.editing`

## Verification

Run:

```powershell
node tools/verify-structured.js
```

Expected:

```text
structured verification ok
modules: 8
namespaces: 8
```

## Next Step

Move one namespace at a time from global functions into `BuildPlan.modules.*`, starting with pure helpers and storage.
