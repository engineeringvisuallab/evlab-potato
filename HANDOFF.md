# EVLab Potato - Handoff (read this first)

**Goal (from the owner):** an offline, MS-Office-like suite delivered as a ready-to-install Windows `.exe` (Electron).
Three SEPARATE apps - **EVWrite** (documents), **EVCell** (spreadsheets), **EVPresent** (presentations) - each with its own
Start Menu/Desktop shortcut, icon, window and taskbar identity. Owner writes in Banglish (Bengali in Latin script); reply in the language they use.

## What is in this zip
| Path | What |
|---|---|
| `EVLab-Potato-Setup-0.4.0.exe` | Windows x64 NSIS installer (per-user by default, user may choose folder). Unsigned. |
| `source/` | Everything needed to rebuild + continue (includes `.git` history). |
| `HANDOFF.md` | This file. |

## Architecture in 60 seconds
- The suite is a **plain ES-module web app** (no framework, no bundler): `index.html`, `src/`, `styles/`. It still runs in a browser
  (`python -m http.server`) - keep it that way.
- Electron is a thin wrapper in `electron/`:
  - `main.js` - registers the `evlab://` protocol (serves `index.html`, `src/`, `styles/` only; ES modules do not work on `file://`
    and IndexedDB needs a stable origin), creates windows, native dialogs, menu, single-instance lock, offline + permission lockdown.
  - `preload.js` - exposes only `window.evNative {alert, confirm, prompt}`. `contextIsolation:true`, `sandbox:true`, no Node in the page.
  - `prompt.html` + `prompt-preload.js` - modal dialog window that implements `prompt()` (**Electron has no window.prompt**; the editors use it ~15 times).
  - `src/shared/native-shim.js` (classic script in `index.html`) swaps `alert/confirm/prompt` for the native versions; no-op in a browser.
- **One exe, four entry points**: `EVLab Potato.exe` (hub) / `--app=evwrite` / `--app=evcell` / `--app=evpresent`. `src/app.js` reads
  `?app=` (see `MODE`) and shows only that app. `build/installer.nsh` creates the 3 extra shortcuts; `win.setAppDetails` in `main.js`
  gives each app its own taskbar identity. If an instance is already running, a new launch opens another window in it (`second-instance`).
- Data: IndexedDB (`src/shared/storage.js`) in `%APPDATA%\EVLab Potato`. All windows share it.
- `build/after-pack.js` stamps icon + version into the exe with the pure-JS `resedit` (needed because we build on Linux without rcedit).

## Commands
```
npm install
npm start                 # hub, dev mode (DevTools in View menu)
npm run start:write       # / start:cell / start:present
npm run smoke             # 22 automated checks against the real Electron app (Linux needs: xvfb, openbox)
npm run icons             # regenerate build/icons/* (needs Pillow)
npm run dist              # -> dist/EVLab-Potato-Setup-<version>.exe
```
Building on **Windows**: `npm install && npm run dist` just works. Building on **Linux** additionally needs `wine` + `wine32:i386`
(electron-builder runs the NSIS uninstaller generator under wine) - that is how the included exe was built.

## Verified vs NOT verified
Verified (Linux Electron 45, real windows, `npm run smoke`): hub + 3 app windows load over `evlab://`; per-app filtering; creating a file
in each app (IndexedDB); `prompt()` round trip incl. Bangla and Cancel; autosave + reload persistence; page has no Node access; remote
requests are blocked; no console errors. Installer wizard starts (screenshot under wine) with correct icon/branding.

**NOT verified on a real Windows machine** (do this first):
1. Installer completes and creates Start Menu + Desktop shortcuts EVWrite / EVCell / EVPresent with their own icons. (Under wine the
   running-process check wrongly says "cannot be closed", so the install could not be completed there - believed to be a wine artifact.)
2. Each app gets its own taskbar button (`setAppDetails`) and pinning keeps working.
3. Exe icon/version info (set by `build/after-pack.js`), uninstaller, upgrade-over-existing-install.
4. Print/PDF (`window.print()` in EVWrite), file download dialogs, Bangla typing/IME, spell check.
5. Real MS Word / Excel / LibreOffice opening exported .docx/.xlsx (the README of the web app says this was never checked either).

## Gotchas learned the hard way
- **Bug fixed**: editor buttons share `data-act` names (`rename`, `importdocx`, `importcsv`) with the home-screen click handler in
  `src/app.js`; clicks bubbled up and showed "Something went wrong". Guard added at the top of that handler. Keep it.
- Do **not** change `productName` or the `evlab://app` origin: it moves/loses users' IndexedDB data.
- No Edit menu on purpose: its Ctrl+Z/Y/C/V accelerators could fight the editors' own undo/clipboard code.
- Editors veto `beforeunload` when dirty; Electron then blocks closing silently, so `main.js` handles `will-prevent-unload` with a dialog.
- In the smoke harness, main-process timers can stall when idle in Electron; waits are done with a renderer timer (`sleep` in `scripts/smoke-main.js`).
- The same file open in two windows is not synchronised (last save wins). Not handled yet.
- Smoke test code is only loaded when `EVLAB_SMOKE=1`; `scripts/` is not packaged.

## Suggested next steps (in order)
1. Windows verification list above; fix whatever breaks.
2. Code-signing certificate (otherwise SmartScreen warns on install); then `electron-updater` auto-update.
3. File associations + "Open with": `.docx`->EVWrite, `.xlsx/.csv`->EVCell (pass the path via argv/`open-file`, reuse `importFile` / `importSpreadsheet`).
4. Web-app roadmap (see `README.md`): EVPresent 4b (tables, charts, PDF export) and 4c (PPTX import/export, 16 templates); backup *restore*;
   cross-sheet formulas in EVCell; charts in XLSX export.
5. Warn/lock when the same file is open in two windows.
6. Optional: real filesystem save/open (`.evpotato.json` or native .docx/.xlsx) instead of browser-style download/upload; stronger CSP.
7. CI (GitHub Actions on `windows-latest`) running `npm run dist` and `npm run smoke`.

## v0.5.0 - Hub (step 1 done)
- Hub redesigned (sidebar, app cards, Recent Files, Template Gallery, Quick Actions, Settings, Help & About; Tools/Plugins = Soon). Green accent like the mockup. Smoke 22/22.
- Next: editor menu bar + right panel + icon rail, then real Save/Open (.evw/.evc/.evp), then Cell icons. Zip + exe only when all done.

## v0.5.0 - Editor frame (step 2 done)
- `src/shared/shell.js` now builds, for each editor: title bar (brand, click file name to rename, undo/redo/present), menu bar (File/Edit/Insert/Format/View + per-app menus, items forward clicks to the existing buttons), left icon rail, right Properties panel (Writer, Cell; Present keeps its own object panel). Not-built features are shown as "Soon".
- Also fixed: the Find/Replace bar was always visible (`.ew-bar[hidden]`).
- Smoke: 31/31 (3 new checks per app). Next: real Save/Open (.evw/.evc/.evp), Cell icons, then rebuild exe + full zip.

## Package note
- This zip's `EVLab-Potato-Setup-0.5.0.exe` was built from this exact source (Hub + editor frame). Unsigned, not yet tested on a real Windows machine.
- Still to do: real Save/Open (.evw/.evc/.evp), Cell toolbar icons.
