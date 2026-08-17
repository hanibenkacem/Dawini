const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { startMysqld, stopMysqld } = require('./mysql-manager');
const { setupAppDatabase } = require('./setup-database');
const { registerLicensingIpc } = require('./licensing/ipc');
const { LicenseManager } = require('./licensing/licenseManager');
// LicenseManager takes no constructor args — it pulls machineId/crypto/
// secureStore in internally and lazily computes the machine ID on first use.
const licenseManager = new LicenseManager();

app.commandLine.appendSwitch('enable-print-preview');

const isDev = !app.isPackaged;
const configPath = path.join(app.getPath('userData'), 'dawini-config.json');
const dbCredsPath = path.join(app.getPath('userData'), 'dawini-db-credentials.json');

const logPath = path.join(app.getPath('userData'), 'dawini-boot.log');
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(logPath, line); } catch {}
}

let mainWindow;
let backendStarted = false;
let backendReady = false;

function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf-8')); }
  catch { return null; }
}

function writeConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function startBackendInProcess(dbCreds) {
  if (backendStarted) return;
  backendStarted = true;

  if (dbCreds) {
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_PORT = String(dbCreds.port);
    process.env.DB_USER = dbCreds.user;
    process.env.DB_PASSWORD = dbCreds.password;
    process.env.DB_NAME = dbCreds.database;
    log('DB env vars set — host=127.0.0.1 port=' + dbCreds.port + ' user=' + dbCreds.user + ' db=' + dbCreds.database);
  } else {
    log('WARNING: no dbCreds passed to startBackendInProcess!');
  }

  process.env.UPLOADS_DIR = path.join(app.getPath('userData'), 'uploads');
  fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

  const backendEntry = isDev
    ? path.join(__dirname, '../backend/server.js')
    : path.join(process.resourcesPath, 'backend/server.js');

  log('Loading backend from: ' + backendEntry);
  log('Backend file exists: ' + fs.existsSync(backendEntry));

  const backendDir = path.dirname(backendEntry);
  process.env.NODE_PATH = path.join(backendDir, 'node_modules');
  require('module').Module._initPaths();
  process.env.NODE_ENV = 'production';

  try {
    require(backendEntry);
    log('Backend require() completed — server should be listening on 3000');
  } catch (err) {
    log('FATAL: Failed to start backend: ' + err.stack);
  }
}

async function bootServerRole() {
  log('bootServerRole() starting...');
  const dataDir = path.join(app.getPath('userData'), 'mysql-data');
  const alreadyInitialized = fs.existsSync(path.join(dataDir, 'mysql'));
  log('MySQL data dir: ' + dataDir);
  log('Already initialized: ' + alreadyInitialized);

  log('Starting mysqld...');
  await startMysqld(app);
  log('mysqld started OK');

  log('Running setupAppDatabase...');
  const dbCreds = await setupAppDatabase({
    dataDirJustInitialized: !alreadyInitialized,
    configPath: dbCredsPath,
    schemaPath: isDev
      ? path.join(__dirname, '../cabinet.sql')
      : path.join(process.resourcesPath, 'cabinet.sql'),
  });
  log('setupAppDatabase done, creds: ' + JSON.stringify({ ...dbCreds, password: '***' }));
  startBackendInProcess(dbCreds);

  backendReady = true;
  if (mainWindow) mainWindow.webContents.send('backend-ready');
  log('backendReady = true, backend-ready event sent');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '../icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
}

app.whenReady().then(async () => {
  log('app.whenReady() fired');
  log('userData path: ' + app.getPath('userData'));

  // Show the window immediately — ActivationScreen renders and waits on
  // backend-ready internally, instead of the whole app blocking on MySQL
  // boot before any window appears.
  createWindow();

  // Licensing IPC must be registered before the renderer loads, so
  // ActivationScreen's window.licensing.getStatus() call has a handler
  // to talk to.
  try {
    registerLicensingIpc(licenseManager);
    log('Licensing IPC handlers registered');
  } catch (err) {
    log('FATAL: Failed to register licensing IPC: ' + err.stack);
  }

  const config = readConfig();
  log('Config read: ' + JSON.stringify(config));

  if (config && config.role === 'server') {
    // Fire-and-forget: runs in the background while the window is already
    // visible. Errors are logged rather than blocking startup.
    bootServerRole().catch((err) => {
      log('FATAL bootServerRole error: ' + err.stack);
    });
  } else {
    log('Not a server role — skipping MySQL/backend boot. Config was: ' + JSON.stringify(config));
    // Client role has no local MySQL/backend to wait on.
    backendReady = true;
  }
});

app.on('window-all-closed', () => {
  stopMysqld();
  app.quit();
});

ipcMain.handle('config:get', () => readConfig());
ipcMain.on('config:get-sync', (event) => { event.returnValue = readConfig(); });
ipcMain.handle('config:set', (_event, { role, serverIp }) => {
  writeConfig({ role, serverIp: role === 'client' ? serverIp : null });
  setTimeout(() => { app.relaunch(); app.exit(0); }, 200);
});

// Lets the renderer poll current backend readiness at any time (e.g. on
// mount, in case it missed the push event), independent of the one-time
// 'backend-ready' event sent from bootServerRole().
ipcMain.on('backend:get-status-sync', (event) => {
  event.returnValue = { ready: backendReady };
});

// ── Print HTML in a hidden window, falling back to Save-as-PDF ──────────────
// Tries the real printer first (shows the OS print dialog since silent:false).
// If that fails — most commonly because no default printer is configured on
// the machine — it renders the same HTML to a PDF and opens a native
// "Save As" dialog so the user still ends up with a usable document instead
// of the print button silently doing nothing.
ipcMain.handle('print-html', (_event, html) => {
  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    printWin.webContents.once('did-finish-load', () => {
      printWin.webContents.print(
        { silent: false, printBackground: true },
        async (success, errorType) => {
          if (success) {
            printWin.destroy();
            resolve({ success: true, method: 'printer' });
            return;
          }

          log('Print failed (' + (errorType || 'unknown') + ') — falling back to PDF save');

          try {
            const pdfBuffer = await printWin.webContents.printToPDF({
              printBackground: true,
              pageSize: 'A5',
            });

            const { canceled, filePath } = await dialog.showSaveDialog({
              title: 'Enregistrer le document',
              defaultPath: path.join(app.getPath('documents'), 'document.pdf'),
              filters: [{ name: 'PDF', extensions: ['pdf'] }],
            });

            printWin.destroy();

            if (canceled || !filePath) {
              resolve({ success: false, method: 'pdf-cancelled' });
              return;
            }

            fs.writeFileSync(filePath, pdfBuffer);
            log('PDF saved to: ' + filePath);
            resolve({ success: true, method: 'pdf', filePath });
          } catch (pdfErr) {
            log('PDF fallback also failed: ' + pdfErr.stack);
            printWin.destroy();
            resolve({ success: false, method: 'pdf-error', error: String(pdfErr) });
          }
        }
      );
    });
  });
});