# BuildPlan Pro Structure Review

## Current Structured Layout

```text
BuildPlan-Pro-Structured/
|-- index.html
|-- assets/
|   |-- css/
|   |   |-- buildplan.css
|   |   |-- buildplan.bundle.css
|   |   `-- modules/
|   |-- js/
|   |   |-- config/
|   |   |   `-- app-config.js
|   |   `-- modules/
|   `-- docs/
|-- docs/
|   |-- STRUCTURE.md
|   `-- superpowers/plans/2026-05-19-structure-buildplan-pro.md
`-- tools/
    `-- verify-structured.js
```

## Responsibility Boundaries

- `index.html`: static markup, CDN loading, stylesheet entrypoint, config script, and ordered feature scripts.
- `assets/js/config/app-config.js`: product metadata, schema version, autosave key, feature flags, and future subscription endpoints.
- `assets/js/services/license-adapter.js`: isolated license/session adapter for login and subscription checks.
- `assets/js/services/project-schema.js`: saved project schema, validation, and migration adapter.
- `assets/js/modules/00-buildplan-namespace.js`: shared namespace and module registry.
- `assets/js/modules/01-core-state.js`: state, undo/redo, alerts, and shared UI helpers.
- `assets/js/modules/02-storage.js`: JSON import/export, autosave, schema data mapping.
- `assets/js/modules/03-ui-controls-print.js`: signatures, display toggles, date helpers, and print behavior.
- `assets/js/modules/04-duration-installments.js`: installments and work-duration planning.
- `assets/js/modules/05-gantt-rendering.js`: date calculation, tables, timeline, bars, dependencies, overlays.
- `assets/js/modules/06-actual-dashboard.js`: actual progress, snapshots, dashboard charts.
- `assets/js/modules/07-cost-scurve.js`: cost table, project totals, and S-Curve chart.
- `assets/js/modules/08-task-editing-bootstrap.js`: task editing and startup initialization.
- `assets/js/modules/09-public-api.js`: public `BuildPlan.modules` registrations.
- `assets/css/modules/`: feature-level CSS grouped by foundation, Gantt, navigation/cost/dashboard, plan/duration, and print.

## Refactor Rule

Keep behavior unchanged while splitting files. Move one boundary at a time, then run `node tools\verify-structured.js` before making the next change.
