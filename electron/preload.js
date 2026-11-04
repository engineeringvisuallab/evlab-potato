// Runs in the renderer before the page. Exposes ONE tiny object (window.evNative) - no Node access.
// src/shared/native-shim.js uses it to replace alert/confirm/prompt with native dialogs.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('evNative', {
  isDesktop: true,
  alert: (m) => { ipcRenderer.sendSync('ev:alert', m); },
  confirm: (m) => ipcRenderer.sendSync('ev:confirm', m),
  prompt: (m, d) => ipcRenderer.sendSync('ev:prompt', m, d),
});
