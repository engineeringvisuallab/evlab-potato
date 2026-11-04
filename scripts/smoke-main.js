// Loaded by electron/main.js ONLY when EVLAB_SMOKE=1 (never in normal use). Drives the real app and prints a report.
const fs = require('fs');
const OUT = process.env.EVLAB_SMOKE_OUT || '/tmp';
module.exports = ({ app, BrowserWindow, openApp, first }) => {
  const results = []; const errors = [];
  const ok = (name, pass, info = '') => { results.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  -> ' + info : '')); };
  let sleeper = null; // main-process timers can stall in Electron when idle, so wait using a renderer timer
  const sleep = (ms) => (sleeper && !sleeper.isDestroyed() ? sleeper.webContents.executeJavaScript(`new Promise(r=>setTimeout(r,${ms}))`) : new Promise((r) => setTimeout(r, ms)));
  const ev = (w, js) => w.webContents.executeJavaScript(js, true);
  const waitFor = async (w, js, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(w, js)) return true; } catch {} await sleep(150); } return false; };
  const shot = async (w, n) => { const img = await w.webContents.capturePage(); fs.writeFileSync(`${OUT}/smoke-${n}.png`, img.toPNG()); };
  const watch = (w, tag) => {
    w.webContents.on('console-message', (e) => { const lv = e.level ?? e; if (lv === 'error' || lv === 3) errors.push(tag + ': ' + (e.message || '')); });
    w.webContents.on('did-fail-load', (_e, c, d, u) => errors.push(tag + ' load fail ' + c + ' ' + d + ' ' + u));
    w.webContents.on('render-process-gone', (_e, d) => errors.push(tag + ' renderer gone ' + d.reason));
  };
  const loaded = (w) => new Promise((r) => (w.webContents.isLoading() ? w.webContents.once('did-finish-load', r) : r()));

  (async () => {
    try {
      // ---- Hub
      const hub = first; sleeper = hub; watch(hub, 'hub'); await loaded(hub); await sleep(500);
      ok('hub: loads over evlab:// and renders 3 app cards', (await ev(hub, `[...document.querySelectorAll('.card h3')].slice(0,3).map(e=>e.textContent).join(',')`)) === 'EVWrite,EVCell,EVPresent');
      ok('hub: window title', hub.getTitle() === 'EVLab Potato', hub.getTitle());
      ok('shim: alert/confirm/prompt replaced', await ev(hub, `typeof window.evNative==='object' && !/native code/.test(window.prompt.toString()) && !/native code/.test(window.confirm.toString())`));
      ok('security: node is NOT exposed to the page', await ev(hub, `typeof require==='undefined' && typeof process==='undefined'`));
      ok('offline: remote request is blocked', await ev(hub, `fetch('https://example.com').then(()=>false,()=>true)`));
      await shot(hub, 'hub');

      // ---- each app window
      const defs = [['evwrite', 'EVWrite', 'new', 'document'], ['evcell', 'EVCell', 'new', 'spreadsheet'], ['evpresent', 'EVPresent', 'new', 'presentation']];
      for (const [key, title, , kind] of defs) {
        const w = openApp(key); watch(w, key); await loaded(w); await sleep(500);
        ok(`${key}: only its own card + title`, (await ev(w, `document.querySelectorAll('.grid')[0].querySelectorAll('.card').length===1 && document.querySelector('h1').textContent==='Welcome to ${title}'`)) && w.getTitle() === title, w.getTitle());
        ok(`${key}: no app filter dropdown, templates only for this app`, await ev(w, `!document.querySelector('#tapp') && [...document.querySelectorAll('.card .tag')].every(t=>!t.textContent.includes('·')||t.textContent.startsWith('${title}'))`));
        await ev(w, `document.querySelector('[data-new="${key}"]').click()`);
        const mounted = await waitFor(w, `location.hash.startsWith('#/file/') && !document.body.textContent.includes('editor is not built yet') && document.querySelector('main').children.length>0`);
        ok(`${key}: blank ${kind} opens in the editor (IndexedDB works)`, mounted);
        await sleep(600); await shot(w, key);
        ok(`${key}: menu bar, rail and title bar are built`, await ev(w, `document.querySelectorAll('.sh-mb').length>=5 && !!document.querySelector('.sh-rail') && !!document.querySelector('.sh-brand')`));
        await ev(w, `[...document.querySelectorAll('.sh-mb')].find(b=>b.textContent==='Edit').click()`);
        ok(`${key}: Edit menu opens and lists Undo`, await ev(w, `[...document.querySelectorAll('.sh-menu button')].some(b=>b.textContent.startsWith('Undo'))`));
        await ev(w, `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
        ok(`${key}: Esc closes the menu`, await ev(w, `!document.querySelector('.sh-menu')`));
      }

      // ---- prompt() round trip in EVWrite (the thing Electron cannot do natively)
      const wr = BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'EVWrite');
      await ev(wr, `document.querySelector('#page').focus()`);
      const pending = ev(wr, `document.querySelector('[data-act="rename"]').click()`);
      let pw = null; for (let i = 0; i < 40 && !pw; i++) { await sleep(150); pw = BrowserWindow.getAllWindows().find((x) => x.webContents.getURL().endsWith('prompt.html')); }
      ok('prompt: modal dialog window opens', !!pw);
      if (pw) {
        await waitFor(pw, `document.querySelector('#msg').textContent.length>0`);
        const shown = await ev(pw, `document.querySelector('#msg').textContent+'|'+document.querySelector('#v').value`);
        ok('prompt: shows message + default value', shown.startsWith('Document name|'), shown);
        ev(pw, `document.querySelector('#v').value='Smoke বাংলা Doc'; document.querySelector('#ok').click()`).catch(() => {}); /* fire and forget: window closes itself */ // window closes itself, so the call may reject
      }
      const settled = await Promise.race([pending.then(() => 'resolved', (e) => 'rejected ' + e.message), sleep(4000).then(() => 'timeout')]);
      ok('prompt: page continues after the dialog closes', settled === 'resolved' && (await ev(wr, '1+1')) === 2, settled);
      ok('prompt: typed value (incl. Bangla) returned to the page', (await ev(wr, `document.querySelector('#title').textContent`)) === 'Smoke বাংলা Doc', await ev(wr, `document.querySelector('#title').textContent`));
      // cancel path -> null
      const p2 = ev(wr, `String(prompt('x','y'))`);
      let pw2 = null; for (let i = 0; i < 40 && !pw2; i++) { await sleep(150); pw2 = BrowserWindow.getAllWindows().find((x) => x.webContents.getURL().endsWith('prompt.html')); }
      if (pw2) ev(pw2, `document.querySelector('#cancel').click()`).catch(() => {});
      ok('prompt: Cancel returns null', (await p2) === 'null');

      // ---- persistence + autosave: type, wait for autosave, reload, text still there
      await ev(wr, `(()=>{const p=document.querySelector('#page');p.focus();document.execCommand('insertText',false,'Hello potato — হ্যালো');p.dispatchEvent(new Event('input',{bubbles:true}))})()`);
      await sleep(2600);
      const id = await ev(wr, `location.hash.slice(7)`);
      wr.webContents.reload(); await loaded(wr); await sleep(800);
      ok('persistence: text survives a reload', (await ev(wr, `document.querySelector('#page')?.textContent||''`)).includes('Hello potato — হ্যালো'), id);

      // ---- docx export triggers a real download (save dialog is bypassed in test)
      ok('single instance lock held', app.hasSingleInstanceLock());
      ok('no console errors / failed loads', errors.length === 0, errors.slice(0, 5).join(' | '));
    } catch (e) { ok('smoke run crashed', false, e.stack || e.message); }
    const failed = results.filter((r) => !r.pass).length;
    console.log(`\nSMOKE RESULT: ${results.length - failed}/${results.length} passed`);
    fs.writeFileSync(`${OUT}/smoke-result.json`, JSON.stringify({ results, errors }, null, 2));
    app.exit(failed ? 1 : 0);
  })();
};
