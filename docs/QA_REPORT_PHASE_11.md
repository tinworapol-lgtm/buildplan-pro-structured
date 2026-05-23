# QA Report Phase 11

## Scope

Automated preflight QA for the Structured package.

## Commands

```powershell
node tools\verify-structured.js
node tools\qa-preflight.js
```

## Manual Browser Smoke Test Still Recommended

- Open `index.html`.
- Confirm the Gantt page renders rows and bars.
- Switch to Dashboard, Actual, Cost, and Duration pages.
- Export a project JSON.
- Import the exported JSON.
- Check print preview.

## Limitation

Automated in-app browser control could not directly navigate to the `file://` URL due to browser automation policy. The app itself can still be opened normally by the user from the local file path.
