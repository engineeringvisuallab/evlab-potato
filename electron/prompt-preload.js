const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('evPrompt', {
  init: () => ipcRenderer.invoke('ev:prompt-init'),
  done: (value) => ipcRenderer.send('ev:prompt-done', value), // value === null means cancelled
});
