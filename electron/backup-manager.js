const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const { Writable, pipeline: pipelineCb } = require('stream');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const mysqlManager = require('./mysql-manager');

const EXE = process.platform === 'win32' ? '.exe' : '';

// ── DB credentials (set once MySQL + setupAppDatabase have finished) ─────
let creds = null;
function init({ creds: c }) {
  creds = c;
  // Remove temp folders left behind by an interrupted restore
  try {
    const ud = app.getPath('userData');
    for (const n of fs.readdirSync(ud)) {
      if (/^(restore-tmp-|backup-tmp-)/.test(n)) {
        fs.rmSync(path.join(ud, n), { recursive: true, force: true });
      }
    }
  } catch {}
}

// Uploaded files (logo, backgrounds, ...) live here — see main.js UPLOADS_DIR
function getUploadsDir() {
  return path.join(app.getPath('userData'), 'uploads');
}

// ── Locate the bundled mysqldump binary ──────────────────────────────────
let cachedBinDir = null;

function searchForBinary(root, name, depth) {
  if (depth < 0) return null;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return null; }
  for (const e of entries) {
    if (e.isFile() && e.name.toLowerCase() === name.toLowerCase()) return root;
  }
  for (const e of entries) {
    // Never look inside the asar archive: binaries there can't be executed
    if (e.isDirectory() && e.name !== 'node_modules' && !/\.asar$/i.test(e.name)) {
      const found = searchForBinary(path.join(root, e.name), name, depth - 1);
      if (found) return found;
    }
  }
  return null;
}

function getBinDir() {
  if (cachedBinDir) return cachedBinDir;

  // 1) Known packaged location
  const packaged = path.join(process.resourcesPath, 'mysql-portable', 'bin');
  if (app.isPackaged && fs.existsSync(path.join(packaged, 'mysqldump' + EXE))) {
    return (cachedBinDir = packaged);
  }

  // 2) Fallback search (skips app.asar); in dev, search the project folder
  const root = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  const found = searchForBinary(root, 'mysqldump' + EXE, 6);
  if (found) return (cachedBinDir = found);

  throw new Error('mysqldump introuvable dans le dossier MySQL embarqué');
}

function getMysql() {
  if (!creds) throw new Error('Base de données non initialisée');
  return {
    bin: getBinDir(),
    host: '127.0.0.1',
    port: creds.port,
    user: creds.user,
    password: creds.password,
    database: creds.database,
  };
}

// ── Settings ─────────────────────────────────────────────────────────────
// Settings live in userData (wiped on reinstall), but backups default to
// Documents so they survive a reinstall.
const SETTINGS_FILE = path.join(app.getPath('userData'), 'backup-settings.json');
const DEFAULTS = {
  enabled: true,
  folder: path.join(app.getPath('documents'), 'Dawini-Backups'),
  keep: 14,
  lastSuccess: null,
  lastError: null,
};

function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }; }
  catch { return { ...DEFAULTS }; }
}
function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2));
  return next;
}

// ── Process helpers ──────────────────────────────────────────────────────
// Fails with a clear message (instead of a bare "spawn EFTYPE") when the
// binary is inside app.asar or isn't a real Windows executable.
function assertRealExe(file) {
  if (file.includes('app.asar') && !file.includes('app.asar.unpacked')) {
    throw new Error(
      `${file} est dans app.asar et ne peut pas être exécuté. ` +
      `Déplacez MySQL vers extraResources ou asarUnpack.`
    );
  }
  const size = fs.statSync(file).size;
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(2);
  fs.readSync(fd, head, 0, 2, 0);
  fs.closeSync(fd);
  if (size < 100 * 1024 || head.toString() !== 'MZ') {
    throw new Error(`${file} n'est pas un exécutable Windows valide (${size} octets)`);
  }
}

function spawnMysql(exe, args) {
  const m = getMysql();
  const full = path.join(m.bin, exe + EXE);
  assertRealExe(full);
  return spawn(full, args, {
    env: { ...process.env, MYSQL_PWD: m.password }, // keeps password off the command line
    windowsHide: true,
  });
}

function waitExit(proc) {
  let err = '';
  proc.stderr.on('data', (d) => (err += d));
  return new Promise((res, rej) => {
    proc.on('error', rej);
    proc.on('close', (code) =>
      code === 0 ? res() : rej(new Error(err.trim() || `code de sortie ${code}`))
    );
  });
}

// Local time with seconds, so two backups never share a filename
function localStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-` +
         `${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

// Windows can briefly lock a freshly written file (antivirus, Explorer
// preview), which makes rename fail with EPERM/EBUSY. Retry a few times.
async function moveFile(from, to) {
  for (let i = 0; i < 6; i++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code) || i === 5) throw e;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
}

// ── Backup container (.dawini) ───────────────────────────────────────────
// One gzip-compressed file holding the database dump AND the uploaded files:
//   MAGIC, then entries [uint16 nameLen][name][uint64 size][bytes]..., then
//   a zero nameLen as terminator. Entries: "db.sql" and "uploads/<path>".
// No third-party archive library is needed.
const MAGIC = Buffer.from('DAWINIBK1\n');

function waitDrain(dest) {
  return new Promise((res, rej) => {
    const cleanup = () => {
      dest.off('drain', onDrain);
      dest.off('error', onErr);
      dest.off('close', onClose);
    };
    const onDrain = () => { cleanup(); res(); };
    const onErr = (e) => { cleanup(); rej(e); };
    const onClose = () => { cleanup(); rej(new Error('Écriture interrompue')); };
    dest.on('drain', onDrain);
    dest.on('error', onErr);
    dest.on('close', onClose);
  });
}

async function writeChunk(dest, buf) {
  if (!dest.write(buf)) await waitDrain(dest);
}

function listFiles(dir, rel = '') {
  let out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out = out.concat(listFiles(full, r));
    else if (e.isFile()) out.push({ rel: r, full });
  }
  return out;
}

async function addEntry(dest, name, filePath) {
  const size = fs.statSync(filePath).size;
  const nameBuf = Buffer.from(name, 'utf8');
  const head = Buffer.alloc(2 + nameBuf.length + 8);
  head.writeUInt16BE(nameBuf.length, 0);
  nameBuf.copy(head, 2);
  head.writeBigUInt64BE(BigInt(size), 2 + nameBuf.length);
  await writeChunk(dest, head);
  if (size === 0) return;

  let count = 0;
  await new Promise((res, rej) => {
    const src = fs.createReadStream(filePath, { start: 0, end: size - 1 });
    const onDestErr = (e) => rej(e);
    dest.once('error', onDestErr);
    src.on('error', rej);
    src.on('data', (c) => { count += c.length; });
    src.on('end', () => { dest.off('error', onDestErr); res(); });
    src.pipe(dest, { end: false });
  });
  if (count !== size) throw new Error(`Le fichier a changé pendant la sauvegarde : ${name}`);
}

async function writeContainer(outPath, sqlPath, uploadsDir) {
  const gz = zlib.createGzip();
  const ws = fs.createWriteStream(outPath);
  const done = new Promise((res, rej) => {
    ws.on('finish', res);
    ws.on('error', rej);
    gz.on('error', rej);
  });
  done.catch(() => {});
  gz.pipe(ws);
  try {
    await writeChunk(gz, MAGIC);
    await addEntry(gz, 'db.sql', sqlPath);
    for (const f of listFiles(uploadsDir)) {
      await addEntry(gz, 'uploads/' + f.rel, f.full);
    }
    await writeChunk(gz, Buffer.from([0, 0]));
    gz.end();
    await done;
  } catch (e) {
    gz.destroy();
    ws.destroy();
    throw e;
  }
}

class ByteReader {
  constructor(stream) {
    this.it = stream[Symbol.asyncIterator]();
    this.buf = Buffer.alloc(0);
  }
  async fill(n) {
    while (this.buf.length < n) {
      const { value, done } = await this.it.next();
      if (done) throw new Error('Fichier de sauvegarde tronqué');
      this.buf = this.buf.length ? Buffer.concat([this.buf, value]) : value;
    }
  }
  async read(n) {
    await this.fill(n);
    const out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    return out;
  }
  async pipe(n, dest) {
    let left = n;
    while (left > 0) {
      if (!this.buf.length) await this.fill(1);
      const take = Math.min(left, this.buf.length);
      const chunk = this.buf.subarray(0, take);
      this.buf = this.buf.subarray(take);
      left -= take;
      if (dest && !dest.write(chunk)) await waitDrain(dest);
    }
  }
}

// Calls onEntry(name, size, take) for each entry. onEntry must call
// take(writable | null) to consume the entry's bytes (null = discard).
async function readContainer(filePath, onEntry) {
  const raw = fs.createReadStream(filePath);
  const gz = zlib.createGunzip();
  raw.on('error', (e) => gz.destroy(e));
  raw.pipe(gz);
  try {
    const r = new ByteReader(gz);
    const magic = await r.read(MAGIC.length);
    if (!magic.equals(MAGIC)) throw new Error('Format de sauvegarde inconnu');
    for (;;) {
      const nameLen = (await r.read(2)).readUInt16BE(0);
      if (nameLen === 0) return;
      const name = (await r.read(nameLen)).toString('utf8');
      const size = Number((await r.read(8)).readBigUInt64BE(0));
      let taken = false;
      await onEntry(name, size, async (dest) => {
        taken = true;
        await r.pipe(size, dest);
      });
      if (!taken) await r.pipe(size, null);
    }
  } finally {
    raw.destroy();
    gz.destroy();
  }
}

// Reads the whole container: structure OK, db.sql present and complete
async function verifyContainer(filePath) {
  let sawDb = false;
  let tail = '';
  let files = 0;
  await readContainer(filePath, async (name, _size, take) => {
    if (name === 'db.sql') {
      sawDb = true;
      await take(new Writable({
        write(chunk, _e, cb) {
          tail = (tail + chunk.toString('latin1')).slice(-300);
          cb();
        },
      }));
    } else {
      files++;
      await take(null);
    }
  });
  if (!sawDb || !tail.includes('Dump completed')) {
    throw new Error('Fichier de sauvegarde incomplet');
  }
  return files;
}

// Unpacks a container into destDir: db.sql + uploads/
async function extractContainer(filePath, destDir) {
  fs.mkdirSync(path.join(destDir, 'uploads'), { recursive: true });
  const sqlPath = path.join(destDir, 'db.sql');
  let sawDb = false;

  await readContainer(filePath, async (name, _size, take) => {
    let target;
    if (name === 'db.sql') {
      target = sqlPath;
      sawDb = true;
    } else if (name.startsWith('uploads/')) {
      const parts = name.slice(8).split('/');
      if (parts.some((p) => !p || p === '.' || p === '..' || /[:\\]/.test(p))) {
        throw new Error('Nom de fichier invalide dans la sauvegarde : ' + name);
      }
      target = path.join(destDir, 'uploads', ...parts);
      fs.mkdirSync(path.dirname(target), { recursive: true });
    } else {
      await take(null);
      return;
    }
    const ws = fs.createWriteStream(target);
    let werr = null;
    ws.on('error', (e) => { werr = e; });
    await take(ws);
    await new Promise((res) => ws.end(res));
    if (werr) throw werr;
  });

  if (!sawDb) throw new Error('Base de données absente de la sauvegarde');
  return { sqlPath, uploadsDir: path.join(destDir, 'uploads') };
}

// Small sanity check for the raw dump before it is packed
function verifyPlainSql(file) {
  const size = fs.statSync(file).size;
  const len = Math.min(300, size);
  const buf = Buffer.alloc(len);
  const fd = fs.openSync(file, 'r');
  try { fs.readSync(fd, buf, 0, len, size - len); } finally { fs.closeSync(fd); }
  if (!buf.toString('latin1').includes('Dump completed')) {
    throw new Error('Export de la base incomplet');
  }
}

// ── Backup ───────────────────────────────────────────────────────────────
async function runBackup(reason = 'manual', { prune = true } = {}) {
  const s = loadSettings();
  const m = getMysql();
  let file = path.join(s.folder, `dawini-${localStamp()}-${reason}.dawini`);
  if (fs.existsSync(file)) file = file.replace(/\.dawini$/, `-${Date.now() % 100000}.dawini`);
  const tmp = file + '.part';
  const tmpSql = path.join(app.getPath('userData'), `backup-tmp-${Date.now()}.sql`);
  try {
    fs.mkdirSync(s.folder, { recursive: true });
    const dump = spawnMysql('mysqldump', [
      '-h', m.host, '-P', String(m.port), '-u', m.user,
      '--single-transaction', '--no-tablespaces', '--triggers',
      '--default-character-set=utf8mb4',
      '--add-drop-database', '--databases', m.database,
    ]);
    await Promise.all([
      pipeline(dump.stdout, fs.createWriteStream(tmpSql)),
      waitExit(dump),
    ]);
    verifyPlainSql(tmpSql);
    await writeContainer(tmp, tmpSql, getUploadsDir());
    await verifyContainer(tmp);
    await moveFile(tmp, file);
    saveSettings({ lastSuccess: new Date().toISOString(), lastError: null });
    if (prune) pruneOld();
    return file;
  } catch (e) {
    saveSettings({ lastError: e.message });
    throw e;
  } finally {
    for (const f of [tmp, tmpSql]) { try { fs.unlinkSync(f); } catch {} }
  }
}

function listBackups(folder = loadSettings().folder) {
  try {
    return fs.readdirSync(folder)
      .filter((f) => /^dawini-.*\.(dawini|sql(\.gz)?)$/.test(f))
      .map((f) => {
        const p = path.join(folder, f);
        const st = fs.statSync(p);
        return { name: f, path: p, size: st.size, mtime: st.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch { return []; }
}

function pruneOld() {
  const { keep } = loadSettings();
  listBackups().slice(keep).forEach((b) => { try { fs.unlinkSync(b.path); } catch {} });
}

// ── Restore ──────────────────────────────────────────────────────────────
// The database is restored through the mysql2 driver (no mysql.exe needed):
// the dump is streamed line by line and executed statement by statement, so
// memory use stays small even for large backups.

function openSql(filePath) {
  const state = { err: null };
  const raw = fs.createReadStream(filePath);
  const input = filePath.endsWith('.gz')
    ? pipelineCb(raw, zlib.createGunzip(), (e) => { state.err = e || null; })
    : raw;
  raw.on('error', (e) => { state.err = e; });
  return { input, state };
}

// Yields one SQL statement at a time (understands DELIMITER for triggers).
async function* sqlStatements(filePath) {
  const { input, state } = openSql(filePath);
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let delimiter = ';';
  let buf = '';
  for await (const line of rl) {
    if (!buf) {
      const t = line.trim();
      if (t === '' || t.startsWith('--')) continue;
      const d = t.match(/^DELIMITER\s+(\S+)$/i);
      if (d) { delimiter = d[1]; continue; }
    }
    buf += line + '\n';
    const trimmed = buf.trimEnd();
    if (trimmed.endsWith(delimiter)) {
      const stmt = trimmed.slice(0, -delimiter.length).trim();
      buf = '';
      if (stmt) yield stmt;
    }
  }
  if (state.err) throw state.err;
  if (buf.trim()) throw new Error('Fichier de sauvegarde tronqué');
}

// Checks a SQL dump BEFORE anything is changed: readable, complete, and
// made for this database.
async function validateBackup(sqlPath, dbName) {
  const { input, state } = openSql(sqlPath);
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let hasDb = false;
  let completed = false;
  for await (const line of rl) {
    if (line.length > 400) continue; // skip huge INSERT lines
    if (line.startsWith('CREATE DATABASE') && line.includes('`' + dbName + '`')) hasDb = true;
    if (line.includes('Dump completed')) completed = true;
  }
  if (state.err) throw new Error('Fichier illisible : ' + state.err.message);
  if (!completed) throw new Error('Fichier de sauvegarde incomplet ou corrompu');
  if (!hasDb) throw new Error(`Cette sauvegarde ne correspond pas à la base "${dbName}"`);
}

async function applyBackup(sqlPath) {
  const m = getMysql();
  let mysql2;
  try { mysql2 = require('mysql2/promise'); }
  catch { throw new Error('Module mysql2 introuvable'); }

  const conn = await mysql2.createConnection({
    host: m.host,
    port: m.port,
    user: m.user,
    password: m.password,
    charset: 'utf8mb4',
  });
  try {
    for await (const stmt of sqlStatements(sqlPath)) {
      await conn.query(stmt);
    }
  } finally {
    await conn.end().catch(() => {});
  }
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
}

// Swaps the uploads folder for the one from the backup (old one kept until
// the copy succeeds, then removed).
async function replaceUploads(srcDir) {
  const target = getUploadsDir();
  const old = target + '.old';
  fs.rmSync(old, { recursive: true, force: true });
  const hadOld = fs.existsSync(target);
  if (hadOld) await moveFile(target, old);
  try {
    copyDir(srcDir, target);
  } catch (e) {
    fs.rmSync(target, { recursive: true, force: true });
    if (hadOld) await moveFile(old, target);
    throw e;
  }
  try { fs.rmSync(old, { recursive: true, force: true }); } catch {}
}

// Turns any backup file into { sqlPath, uploadsDir|null, cleanup() }.
// Old-style .sql / .sql.gz backups have no uploads (uploadsDir = null, so
// restoring them leaves the current uploads untouched).
async function prepareSource(filePath) {
  if (!filePath.toLowerCase().endsWith('.dawini')) {
    return { sqlPath: filePath, uploadsDir: null, cleanup() {} };
  }
  const tmpDir = path.join(
    app.getPath('userData'),
    `restore-tmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  );
  const cleanup = () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} };
  try {
    const r = await extractContainer(filePath, tmpDir);
    return { ...r, cleanup };
  } catch (e) {
    cleanup();
    throw e;
  }
}

async function restoreBackup(filePath) {
  const m = getMysql();
  const src = await prepareSource(filePath);
  try {
    // 1) Refuse bad files before touching any data
    await validateBackup(src.sqlPath, m.database);

    // 2) Safety copy of the current data (no pruning, so the file being
    //    restored can never be deleted by the retention rule)
    const safety = await runBackup('pre-restore', { prune: false });

    // 3) Apply database + uploads; if anything fails, roll back to the safety copy
    try {
      await applyBackup(src.sqlPath);
      if (src.uploadsDir) await replaceUploads(src.uploadsDir);
    } catch (e) {
      let back = null;
      try {
        back = await prepareSource(safety);
        await applyBackup(back.sqlPath);
        if (back.uploadsDir) await replaceUploads(back.uploadsDir);
      } catch (e2) {
        throw new Error(
          `${e.message} — ATTENTION : retour arrière impossible (${e2.message}). ` +
          `Sauvegarde de sécurité : ${safety}`
        );
      } finally {
        if (back) back.cleanup();
      }
      throw new Error(`${e.message} — vos données d'origine ont été rétablies.`);
    }
  } finally {
    src.cleanup();
  }

  // 4) Restart so the backend opens fresh DB connections
  try { await mysqlManager.stopMysqld(); } catch {}
  app.relaunch();
  app.exit(0);
}

// ── Scheduler ────────────────────────────────────────────────────────────
// Backs up shortly after startup if the last one is over 24h old, then
// re-checks hourly. Clinic PCs are often off overnight, so a fixed clock
// time would get missed.
function startScheduler() {
  const tick = async () => {
    const s = loadSettings();
    if (!s.enabled) return;
    const last = s.lastSuccess ? Date.parse(s.lastSuccess) : 0;
    if (Date.now() - last < 24 * 3600 * 1000) return;
    try { await runBackup('auto'); }
    catch (e) { console.error('[backup] auto failed:', e.message); }
  };
  setTimeout(tick, 60 * 1000); // let the app finish booting first
  setInterval(tick, 60 * 60 * 1000);
}

// ── IPC ──────────────────────────────────────────────────────────────────
function registerIpc(ipcMain, getWindow) {
  ipcMain.handle('backup:get', () => ({ settings: loadSettings(), backups: listBackups() }));

  ipcMain.handle('backup:set', (_e, patch) => {
    const allowed = {};
    if (typeof patch.enabled === 'boolean') allowed.enabled = patch.enabled;
    if (Number.isInteger(patch.keep) && patch.keep >= 1 && patch.keep <= 90) allowed.keep = patch.keep;
    saveSettings(allowed);
    return { ok: true };
  });

  ipcMain.handle('backup:chooseFolder', async () => {
    const r = await dialog.showOpenDialog(getWindow(), {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (r.canceled) return { ok: false };
    saveSettings({ folder: r.filePaths[0] });
    return { ok: true, folder: r.filePaths[0] };
  });

  ipcMain.handle('backup:now', async () => {
    try { return { ok: true, file: await runBackup('manual') }; }
    catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle('backup:restore', async (_e, filePath) => {
    // filePath === null means "pick a file from disk"
    if (!filePath) {
      const r = await dialog.showOpenDialog(getWindow(), {
        filters: [{ name: 'Sauvegarde Dawini', extensions: ['dawini', 'gz', 'sql'] }],
        properties: ['openFile'],
      });
      if (r.canceled) return { ok: false, canceled: true };
      filePath = r.filePaths[0];
    }
    const c = await dialog.showMessageBox(getWindow(), {
      type: 'warning',
      buttons: ['Annuler', 'Restaurer'],
      defaultId: 0,
      cancelId: 0,
      message: 'Restaurer cette sauvegarde ?',
      detail:
        "Toutes les données actuelles (patients, consultations et fichiers importés) " +
        "seront remplacées par celles de la sauvegarde. " +
        "Une sauvegarde de sécurité des données actuelles est créée d'abord. " +
        "L'application va redémarrer.",
    });
    if (c.response !== 1) return { ok: false, canceled: true };
    try { await restoreBackup(filePath); return { ok: true }; }
    catch (e) { return { ok: false, error: e.message }; }
  });
}

module.exports = { init, registerIpc, startScheduler };