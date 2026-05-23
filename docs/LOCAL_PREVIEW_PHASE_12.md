# Local Preview Phase 12

Phase 12 adds a dependency-free local HTTP preview server.

## Why

Some browser automation policies block direct navigation to local `file://` URLs. The app still works as a local file, but a small local HTTP server makes QA and browser smoke testing easier.

## Run

```powershell
node tools\serve-local.js --port 4177
```

Open:

```text
http://127.0.0.1:4177/
```

## Notes

- This is a local preview helper, not a production backend.
- It serves only files inside the Structured package.
- It has no dependency install step.
- It does not implement login, subscription, payments, or cloud storage.
