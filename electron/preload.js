const { contextBridge, ipcRenderer } = require('electron');

const config = ipcRenderer.sendSync('config:get-sync');

let apiBase = 'http://localhost:3000';
if (config) {
  apiBase = config.role === 'server'
    ? 'http://localhost:3000'
    : `http://${config.serverIp}:3000`;
}

contextBridge.exposeInMainWorld('__DAWINI_API_BASE__', apiBase);

contextBridge.exposeInMainWorld('electronConfig', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (role, serverIp) => ipcRenderer.invoke('config:set', { role, serverIp }),
});

// Send full HTML to main process → printed via hidden BrowserWindow.
// Resolves to { success, method, filePath? } — see main.js print-html handler.
contextBridge.exposeInMainWorld('electronPrint', {
  printHtml: (html) => ipcRenderer.invoke('print-html', html),
});

// Licensing bridge — required by ActivationScreen.jsx
// (window.licensing.getStatus / startTrial / activate), backed by the
// IPC handlers registered in electron/licensing/ipc.js via main.js.
contextBridge.exposeInMainWorld('licensing', {
  getStatus: () => ipcRenderer.invoke('licensing:getStatus'),
  startTrial: () => ipcRenderer.invoke('licensing:startTrial'),
  activate: (licenseKey) => ipcRenderer.invoke('licensing:activate', licenseKey),
});

// Backend readiness bridge — lets ActivationScreen wait for MySQL/Express
// to finish booting (server role only) before unlocking the main app,
// instead of the window loading with a backend that isn't listening yet.
contextBridge.exposeInMainWorld('dawiniBackend', {
  getStatusSync: () => ipcRenderer.sendSync('backend:get-status-sync'),
  onReady: (callback) => ipcRenderer.on('backend-ready', callback),
});