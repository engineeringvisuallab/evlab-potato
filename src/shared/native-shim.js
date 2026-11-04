// Classic (non-module) script, loaded BEFORE app.js.
// In a normal browser this does nothing.
// In the Electron desktop app, window.evNative is exposed by electron/preload.js. Electron does not
// support window.prompt() at all, and its alert()/confirm() can leave text inputs unfocusable on Windows,
// so all three are routed to native dialogs in the main process (see electron/main.js).
(function () {
  var n = window.evNative;
  if (!n) return;
  window.alert = function (m) { n.alert(String(m == null ? '' : m)); };
  window.confirm = function (m) { return n.confirm(String(m == null ? '' : m)); };
  window.prompt = function (m, d) { return n.prompt(String(m == null ? '' : m), d == null ? '' : String(d)); };
})();
