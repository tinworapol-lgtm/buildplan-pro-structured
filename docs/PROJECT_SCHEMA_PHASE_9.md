# Project Schema Phase 9

Phase 9 adds a dedicated schema and migration boundary for saved project files.

## Added

- `assets/js/services/project-schema.js`
- `window.BuildPlanSchema`
- `BuildPlan.modules.schema`
- `contracts/project-file.schema.json`

## Storage Hooks

- `collectProjectData()` now passes data through `BuildPlanSchema.prepareForSave()`.
- `applyProjectData(projectData)` now passes loaded data through `BuildPlanSchema.migrateProjectData()`.
- The autosave key and exported project metadata now read from `BuildPlanConfig`.

## Why

Project files will outlive individual app releases. A schema/migration service lets future versions load old files, cloud records, or customer backups without burying migration logic inside UI rendering code.
