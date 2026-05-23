# Storage Split Phase 4

Phase 4 separates the previous core/storage module into smaller responsibility areas while keeping the application as classic browser scripts.

## Script order

1. `00-buildplan-namespace.js` - namespace container and registry helpers.
2. `01-core-state.js` - app state, undo/redo, alerts, and shared UI helpers.
3. `02-storage.js` - project import/export, local autosave, and data mapping.
4. `03-ui-controls-print.js` - signatures, display toggles, date helpers, and print behavior.
5. `04-duration-installments.js` - work-duration and installment calculations.
6. `05-gantt-rendering.js` - Gantt rendering, sizing, and visual overlays.
7. `06-actual-dashboard.js` - actual-progress dashboard and charts.
8. `07-cost-scurve.js` - project value, cost table, and S-Curve behavior.
9. `08-task-editing-bootstrap.js` - task editing, initialization, and startup.
10. `09-public-api.js` - public BuildPlan namespace bindings.

## Notes

- The split is intentionally low risk: functions remain globally available to preserve the existing inline event handlers and cross-module calls.
- Storage now has a dedicated file, making future login, subscription, encryption, and cloud sync work easier to isolate.
- The original single-file prototype remains unchanged outside the Structured workspace.
