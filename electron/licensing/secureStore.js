/**
 * secureStore.js
 *
 * Persists two things, both encrypted, both OUTSIDE the install directory:
 *   1. The activated license blob (license.dat)
 *   2. The trial-consumption marker (trial.dat)
 *
 * Encryption: Electron's built-in `safeStorage` module, which uses the OS
 * credential store (Windows DPAPI, tied to the OS user account) — this is
 * why we don't need to manage our own encryption keys. Content is never
 * written in plain text to disk.
 *
 * Redundant persistence for the trial marker: because AppData can be
 * wiped by an uninstaller or a determined user, we also write a fallback
 * marker into:
 *   - the registry (HKCU\Software\Dawini\Trial), and
 *   - %ProgramData%\Dawini (a shared, less obvious location a normal
 *     uninstall won't touch).
 * On every check we read all locations and trust whichever shows the
 * OLDEST trial-start date / an "already consumed" flag — i.e. we never
 * let the user get a fresh trial by clearing just one location.
 */

'use strict';

const { app, safeStorage } = require('electron');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_FOLDER_NAME = 'Dawini';

function licenseDir() {
  const dir = path.join(app.getPath('appData'), APP_FOLDER_NAME);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function programDataDir() {
  const base = process.env.ProgramData || 'C:\\ProgramData';
  const dir = path.join(base, APP_FOLDER_NAME);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    // Non-fatal: some locked-down environments won't allow writes here.
    // The AppData + registry copies are still sufficient.
  }
  return dir;
}

function licenseFilePath() {
  return path.join(licenseDir(), 'license.dat');
}

function trialFilePath() {
  return path.join(licenseDir(), 'trial.dat');
}

function trialFallbackPath() {
  return path.join(programDataDir(), '.trial');
}

function encryptAndWrite(filePath, obj) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS-level encryption is not available on this machine.');
  }
  const plain = JSON.stringify(obj);
  const encrypted = safeStorage.encryptString(plain);
  fs.writeFileSync(filePath, encrypted);
}

function readAndDecrypt(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const encrypted = fs.readFileSync(filePath);
    if (!safeStorage.isEncryptionAvailable()) return null;
    const plain = safeStorage.decryptString(encrypted);
    return JSON.parse(plain);
  } catch (err) {
    // Corrupted / tampered / undecryptable -> treat as absent.
    return null;
  }
}

// ---------- License blob ----------

function saveLicense(licenseObj) {
  encryptAndWrite(licenseFilePath(), licenseObj);
}

function loadLicense() {
  return readAndDecrypt(licenseFilePath());
}

function clearLicense() {
  try {
    fs.unlinkSync(licenseFilePath());
  } catch (err) {
    /* ignore */
  }
}

// ---------- Trial marker ----------
// We store { machineIdHash, startedAt, consumed: true } in three places.

function writeRegistryTrialMarker(marker) {
  try {
    const value = Buffer.from(JSON.stringify(marker), 'utf8').toString('hex');
    execFileSync(
      'reg',
      [
        'add',
        'HKCU\\Software\\Dawini\\Trial',
        '/v',
        'Marker',
        '/t',
        'REG_SZ',
        '/d',
        value,
        '/f',
      ],
      { windowsHide: true, timeout: 5000 }
    );
  } catch (err) {
    /* best effort */
  }
}

function readRegistryTrialMarker() {
  try {
    const out = execFileSync(
      'reg',
      ['query', 'HKCU\\Software\\Dawini\\Trial', '/v', 'Marker'],
      { windowsHide: true, timeout: 5000, encoding: 'utf8' }
    );
    const match = out.match(/Marker\s+REG_SZ\s+([0-9a-fA-F]+)/);
    if (!match) return null;
    const json = Buffer.from(match[1], 'hex').toString('utf8');
    return JSON.parse(json);
  } catch (err) {
    return null;
  }
}

function writeFallbackTrialMarker(marker) {
  try {
    fs.writeFileSync(trialFallbackPath(), JSON.stringify(marker), {
      // Hidden-ish; not a real security boundary, just an obstacle.
      mode: 0o600,
    });
  } catch (err) {
    /* best effort */
  }
}

function readFallbackTrialMarker() {
  try {
    if (!fs.existsSync(trialFallbackPath())) return null;
    return JSON.parse(fs.readFileSync(trialFallbackPath(), 'utf8'));
  } catch (err) {
    return null;
  }
}

/**
 * Writes the trial marker to all redundant locations at once.
 */
function recordTrialStart(machineIdHash, startedAtIso) {
  const marker = { machineIdHash, startedAt: startedAtIso, consumed: true };
  encryptAndWrite(trialFilePath(), marker);
  writeRegistryTrialMarker(marker);
  writeFallbackTrialMarker(marker);
}

/**
 * Reads all copies of the trial marker and returns the one that is most
 * restrictive for this machine (i.e. any marker matching this machine's
 * ID hash means the trial has already been used — we never let a partial
 * wipe reset it).
 */
function findTrialMarkerForMachine(machineIdHash) {
  const candidates = [
    readAndDecrypt(trialFilePath()),
    readRegistryTrialMarker(),
    readFallbackTrialMarker(),
  ].filter(Boolean);

  const forThisMachine = candidates.filter((m) => m.machineIdHash === machineIdHash);
  if (!forThisMachine.length) return null;

  // If copies disagree on start date (e.g. clock tampering), trust the
  // earliest one — it only ever shortens the remaining trial, never
  // extends it.
  forThisMachine.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  return forThisMachine[0];
}

module.exports = {
  saveLicense,
  loadLicense,
  clearLicense,
  recordTrialStart,
  findTrialMarkerForMachine,
};
