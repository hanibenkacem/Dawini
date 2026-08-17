/**
 * preload-licensing-snippet.js
 *
 * NOT a standalone file to ship — this is a snippet to merge into your
 * existing electron/preload.js, alongside whatever you already expose
 * via contextBridge (e.g. API_BASE).
 *
 * Merge instructions:
 *   1. Keep your existing `contextBridge.exposeInMainWorld('api', {...})`
 *      call (or whatever object name you currently use).
 *   2. Add the `licensing` key shown below inside that same object,
 *      OR expose it as a second top-level bridge — either works.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licensing', {
  getStatus: () => ipcRenderer.invoke('licensing:getStatus'),
  startTrial: () => ipcRenderer.invoke('licensing:startTrial'),
  activate: (licenseKey) => ipcRenderer.invoke('licensing:activate', licenseKey),
});
