# CSS Split Phase 5

Phase 5 turns the single stylesheet into a stable entrypoint plus feature-level CSS modules.

## Files

- `assets/css/buildplan.css` remains the only stylesheet loaded by `index.html`.
- `assets/css/buildplan.bundle.css` keeps the previous monolithic stylesheet as a reference backup.
- `assets/css/modules/00-foundation.css` contains global layout primitives, cells, inputs, and scrollbars.
- `assets/css/modules/01-gantt.css` contains Gantt and group bar visual rules.
- `assets/css/modules/02-navigation-cost-dashboard.css` contains page switching, navigation, cost, chart, dashboard, and S-Curve controls.
- `assets/css/modules/03-plan-duration.css` contains plan toolbar, installment lines, and work-duration table controls.
- `assets/css/modules/04-print.css` contains print-only formatting.

## Notes

- The cascade order is preserved through `@import` statements in `buildplan.css`.
- Keeping the same stylesheet entrypoint avoids HTML churn and makes rollback simple.
- The split creates a cleaner path for future theme, responsive, and print-specific changes.
