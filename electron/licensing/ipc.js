/**
 * ipc.js
 *
 * Registers the IPC handlers the renderer (ActivationScreen.jsx) calls
 * through the preload bridge. Call `registerLicensingIpc(licenseManager)`
 * once from main.js, after `app.whenReady()`.
 */

'use strict';

const { ipcMain } = require('electron');

function registerLicensingIpc(licenseManager) {
  ipcMain.handle('licensing:getStatus', () => {
    return licenseManager.getStatus();
  });

  ipcMain.handle('licensing:startTrial', () => {
    return licenseManager.startTrial();
  });

  ipcMain.handle('licensing:activate', (_event, licenseKey) => {
    return licenseManager.activateLicense(licenseKey);
  });
}

module.exports = { registerLicensingIpc };
