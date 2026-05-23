# User Launcher Phase 15

Phase 15 adds simple launchers so users do not need to remember PowerShell commands.

## Recommended For Normal Users

Double-click:

```text
Start-BuildPlan-Pro.cmd
```

It will:

1. Change to the correct project folder.
2. Start the local preview server.
3. Open `http://127.0.0.1:4177/` in the browser.

## PowerShell Option

From the project folder:

```powershell
.\Start-BuildPlan-Pro.ps1
```

If PowerShell blocks scripts, use the `.cmd` launcher instead.

## Manual Option

```powershell
node .\tools\serve-local.js --port 4177
```

Then open:

```text
http://127.0.0.1:4177/
```
