// EVLab Potato - Electron main process.
// One executable, four entry points (hub + 3 apps) chosen by --app=<key>. See HANDOFF.md.
const { app, BrowserWindow, Menu, protocol, session, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ---- App registry --------------------------------------------------------------------------------
const APPS = {
  hub:       { title: 'EVLab Potato', icon: 'evlab',     query: '' },
  evwrite:   { title: 'EVWrite',      icon: 'evwrite',   query: '?app=evwrite' },
  evcell:    { title: 'EVCell',       icon: 'evcell',    query: '?app=evcell' },
  evpresent: { title: 'EVPresent',    icon: 'evpresent', query: '?app=evpresent' },
};
const appKeyFromArgv = (argv) => {
  const a = argv.find((x) => /^--app=/.test(x));
  const k = a ? a.slice(6).toLowerCase() : 'hub';
  return APPS[k] ? k : 'hub';
};
const iconDir = () => (app.isPackaged ? path.join(process.resourcesPath, 'icons') : path.join(__dirname, '..', 'build', 'icons'));
const iconPath = (key) => path.join(iconDir(), APPS[key].icon + '.ico');

// ---- evlab:// protocol: serves index.html/src/styles from inside the app --------------------------
// Needed because the code uses ES modules (blocked on file://) and because IndexedDB needs a stable origin.
protocol.registerSchemesAsPrivileged([
  { scheme: 'evlab', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};
const SERVED_TOP = new Set(['index.html', 'src', 'styles']); // nothing else is reachable from the page
function registerProtocol() {
  protocol.handle('evlab', async (req) => {
    try {
      let p = decodeURIComponent(new URL(req.url).pathname);
      if (p.endsWith('/')) p += 'index.html';
      const root = app.getAppPath();
      const file = path.normalize(path.join(root, p));
      if (!file.startsWith(root + path.sep) || !SERVED_TOP.has(path.relative(root, file).split(path.sep)[0])) {
        return new Response('Forbidden', { status: 403 });
      }
      const buf = await fs.promises.readFile(file);
      return new Response(buf, { headers: { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

// ---- Windows --------------------------------------------------------------------------------------
const openExternalSafe = (url) => { if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url); };
let windowCount = 0;

function openApp(key) {
  const def = APPS[key] || APPS.hub;
  const off = (windowCount++ % 6) * 28; // small cascade so extra windows do not sit exactly on top of each other
  const win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600, show: false,
    title: def.title, icon: iconPath(key), autoHideMenuBar: true, backgroundColor: '#fbf6e9',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
  });
  if (off) { const [x, y] = win.getPosition(); win.setPosition(x + off, y + off); }
  win.once('ready-to-show', () => win.show());

  // Separate taskbar identity per app (Windows): each app gets its own taskbar button/icon, like Word vs Excel.
  if (process.platform === 'win32') {
    try {
      win.setAppDetails({
        appId: 'com.evlab.potato.' + key, appIconPath: iconPath(key), appIconIndex: 0,
        relaunchCommand: `"${process.execPath}"${key === 'hub' ? '' : ' --app=' + key}`, relaunchDisplayName: def.title,
      });
    } catch (e) { console.warn('setAppDetails failed', e.message); }
  }

  const wc = win.webContents;
  wc.on('will-navigate', (e, url) => { if (!url.startsWith('evlab://app/')) { e.preventDefault(); openExternalSafe(url); } });
  wc.setWindowOpenHandler(({ url }) => { openExternalSafe(url); return { action: 'deny' }; });
  // The editors call preventDefault() in 'beforeunload' when there are unsaved edits. Electron then blocks the close
  // silently, so we show a real dialog instead.
  wc.on('will-prevent-unload', (e) => {
    const c = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Leave without saving', 'Stay'], defaultId: 1, cancelId: 1,
      title: 'Unsaved changes', message: 'This file has changes that have not been saved yet.', detail: 'Choose "Stay" and wait a moment: autosave runs a second or two after you stop typing.' });
    if (c === 0) e.preventDefault(); // ignore the beforeunload veto = close anyway
  });
  // Right-click menu: spelling suggestions + cut/copy/paste in editable areas.
  wc.on('context-menu', (_e, params) => {
    const items = [];
    if (params.misspelledWord) {
      (params.dictionarySuggestions || []).slice(0, 5).forEach((s) => items.push({ label: s, click: () => wc.replaceMisspelling(s) }));
      if (items.length) items.push({ type: 'separator' });
    }
    if (params.isEditable) items.push({ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' });
    else if (params.selectionText) items.push({ role: 'copy' });
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });

  win.loadURL('evlab://app/index.html' + def.query);
  return win;
}

// ---- Native dialogs (replace alert/confirm/prompt; see src/shared/native-shim.js) -----------------
const parentOf = (e) => BrowserWindow.fromWebContents(e.sender);
ipcMain.on('ev:alert', (e, msg) => {
  const w = parentOf(e);
  dialog.showMessageBoxSync(w, { type: 'info', buttons: ['OK'], title: w ? w.getTitle() : 'EVLab Potato', message: String(msg) });
  e.returnValue = true;
});
ipcMain.on('ev:confirm', (e, msg) => {
  const w = parentOf(e);
  const r = dialog.showMessageBoxSync(w, { type: 'question', buttons: ['OK', 'Cancel'], defaultId: 0, cancelId: 1, title: w ? w.getTitle() : 'EVLab Potato', message: String(msg) });
  e.returnValue = r === 0;
});
const prompts = new Map(); // prompt window webContents.id -> {message, def, finish}
ipcMain.on('ev:prompt', (e, message, def) => {
  const parent = parentOf(e);
  const w = new BrowserWindow({
    parent, modal: !!parent, width: 460, height: 210, resizable: false, minimizable: false, maximizable: false, show: false,
    autoHideMenuBar: true, title: parent ? parent.getTitle() : 'EVLab Potato',
    webPreferences: { preload: path.join(__dirname, 'prompt-preload.js'), contextIsolation: true, sandbox: true },
  });
  w.removeMenu();
  const id = w.webContents.id;
  let done = false;
  const finish = (v) => { if (done) return; done = true; e.returnValue = v; }; // returnValue may be set later: the renderer waits
  prompts.set(id, { message: String(message), def: String(def == null ? '' : def), finish });
  w.once('ready-to-show', () => w.show());
  w.on('closed', () => { prompts.delete(id); finish(null); });
  w.loadFile(path.join(__dirname, 'prompt.html'));
});
ipcMain.handle('ev:prompt-init', (e) => { const p = prompts.get(e.sender.id); return p ? { message: p.message, value: p.def } : null; });
ipcMain.on('ev:prompt-done', (e, value) => {
  const p = prompts.get(e.sender.id);
  if (p) p.finish(value == null ? null : String(value));
  const w = BrowserWindow.fromWebContents(e.sender); if (w) w.close();
});

// ---- Menu -----------------------------------------------------------------------------------------
// No Edit menu on purpose: its Ctrl+Z/Y/C/V accelerators could fight the editors' own undo/redo/clipboard code.
function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'New EVWrite window', click: () => openApp('evwrite') },
      { label: 'New EVCell window', click: () => openApp('evcell') },
      { label: 'New EVPresent window', click: () => openApp('evpresent') },
      { label: 'EVLab Potato hub (all apps)', click: () => openApp('hub') },
      { type: 'separator' }, { role: 'close' }, { role: 'quit' } ] },
    { label: 'View', submenu: [
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' },
      ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'toggleDevTools' }]) ] },
    { label: 'Help', submenu: [
      { label: 'Open data folder', click: () => shell.openPath(app.getPath('userData')) },
      { label: 'About EVLab Potato', click: () => dialog.showMessageBox({ type: 'info', title: 'About', message: 'EVLab Potato ' + app.getVersion(),
          detail: 'EVWrite · EVCell · EVPresent\nPowered by Engineering Visual Lab\nFiles are stored on this computer (use "Backup all" on the home screen regularly).' }) } ] },
  ]));
}

// ---- Startup --------------------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit(); // another copy is running; it receives our argv in 'second-instance' and opens the requested app
} else {
  app.on('second-instance', (_e, argv) => openApp(appKeyFromArgv(argv)));
  app.setAppUserModelId('com.evlab.potato');
  app.whenReady().then(() => {
    registerProtocol();
    // The suite is fully offline: block every network request, allow only our own content.
    session.defaultSession.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(evlab|data|blob|devtools|file):/i.test(d.url) }));
    session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['fullscreen', 'clipboard-sanitized-write'].includes(perm)));
    buildMenu();
    const first = openApp(appKeyFromArgv(process.argv));
    if (process.env.EVLAB_SMOKE) require('../scripts/smoke-main.js')({ app, BrowserWindow, openApp, first });
  });
  app.on('window-all-closed', () => app.quit());
}
