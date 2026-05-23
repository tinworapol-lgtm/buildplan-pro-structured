# JavaScript Module Split - Phase 2

## What Changed

The previous monolithic runtime was preserved as:

- `assets/js/app.bundle.js`

`index.html` now loads six classic script files in dependency order:

1. `assets/js/modules/01-core-state-storage.js`
2. `assets/js/modules/02-duration-installments.js`
3. `assets/js/modules/03-gantt-rendering.js`
4. `assets/js/modules/04-actual-dashboard.js`
5. `assets/js/modules/05-cost-scurve.js`
6. `assets/js/modules/06-task-editing-bootstrap.js`

This is a behavior-preserving split. The files are still classic scripts, not ES modules, because the existing app relies on shared global state and inline HTML event handlers.

## Verification

Run:

```powershell
node tools/verify-structured.js
```

Expected:

```text
structured verification ok
modules: 6
```

## Next Refactor Step

The next safe step is to introduce `window.BuildPlan` namespaces one feature at a time, starting with pure helpers and storage. After that, inline handlers can be replaced with event listeners.
