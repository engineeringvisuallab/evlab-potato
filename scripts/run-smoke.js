// npm run smoke  -> launches the real Electron app, drives all 4 entry points, prints PASS/FAIL, exit code 0/1.
// Linux needs xvfb (virtual display); Windows/macOS run directly.
const { spawnSync } = require('child_process');
const os = require('os'); const path = require('path'); const fs = require('fs');
const root = path.join(__dirname, '..');
const electron = require('electron'); // path to the electron binary
const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'evsmoke-'));
const args = ['.', '--user-data-dir=' + ud, '--disable-gpu'];
if (process.platform === 'linux') args.push('--no-sandbox');
const cmd = process.platform === 'linux' ? 'xvfb-run' : electron;
// Linux: modal dialogs need a window manager, so start openbox (apt install openbox) inside the virtual display if present.
const q = (x) => "'" + String(x).replace(/'/g, "'\\''") + "'";
const full = process.platform === 'linux'
  ? ['-a', '-s', '-screen 0 1400x900x24', 'sh', '-c', `(which openbox >/dev/null && openbox &) ; sleep 1; exec ${[electron, ...args].map(q).join(' ')}`]
  : args;
const r = spawnSync(cmd, full, { cwd: root, stdio: 'inherit', env: { ...process.env, EVLAB_SMOKE: '1', EVLAB_SMOKE_OUT: os.tmpdir() } });
console.log('screenshots + smoke-result.json in', os.tmpdir());
process.exit(r.status ?? 1);
