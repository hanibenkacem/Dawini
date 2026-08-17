/**
 * machineId.js
 *
 * Generates a stable, hardware-derived Machine ID for the current computer.
 *
 * Design goals:
 *  - Same value across app restarts / reboots.
 *  - Different value if the app (or its data) is copied to another PC.
 *  - No external npm dependency — uses only Node's `child_process` and
 *    Windows built-in tools (PowerShell / reg.exe), which are always
 *    present on any Windows target we ship to.
 *
 * We combine two independent hardware identifiers so that spoofing one
 * alone isn't enough to fool the fingerprint:
 *   1. Win32_ComputerSystemProduct.UUID (motherboard/BIOS UUID)
 *   2. The OS-level "MachineGuid" (regenerated on OS reinstall, but stable
 *      across app reinstalls, which is what we actually care about)
 *
 * The two raw values are hashed together with SHA-256 and the digest is
 * re-encoded into the human-friendly "XXXX-XXXX-XXXX" form shown in the UI.
 */

'use strict';

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const os = require('os');

function safeRun(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      windowsHide: true,
      timeout: 5000,
      encoding: 'utf8',
    }).trim();
  } catch (err) {
    return '';
  }
}

/** Motherboard / BIOS UUID via PowerShell CIM (works on Win 8.1+). */
function getSystemUuid() {
  const out = safeRun('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    '(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID',
  ]);
  if (out && out.toUpperCase() !== 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF') {
    return out;
  }
  // Fallback to the older wmic path for very old Windows 10 builds.
  const wmicOut = safeRun('wmic', ['csproduct', 'get', 'UUID']);
  const lines = wmicOut.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines[1] || '';
}

/** OS-level MachineGuid from the registry (Cryptography key). */
function getMachineGuid() {
  const out = safeRun('reg', [
    'query',
    'HKLM\\SOFTWARE\\Microsoft\\Cryptography',
    '/v',
    'MachineGuid',
  ]);
  const match = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
  return match ? match[1] : '';
}

/** Best-effort CPU identifier as a third, low-weight signal. */
function getCpuSignature() {
  const cpus = os.cpus();
  if (!cpus || !cpus.length) return '';
  return `${cpus[0].model}|${cpus.length}`;
}

/**
 * Returns { raw, formatted } where:
 *   raw       = full 64-char hex SHA-256 digest (used internally / in licenses)
 *   formatted = short "XXXX-XXXX-XXXX" string shown to the user
 */
function getMachineId() {
  const uuid = getSystemUuid();
  const guid = getMachineGuid();
  const cpu = getCpuSignature();

  if (!uuid && !guid) {
    // Extremely degraded environment (e.g. sandboxed/VM without WMI).
    // Fall back to hostname + cpu so the app can still function, though
    // this is weaker and should be rare in practice on real doctor PCs.
    const fallback = `${os.hostname()}|${cpu}`;
    return formatFromSeed(fallback);
  }

  const seed = `${uuid}::${guid}::${cpu}`;
  return formatFromSeed(seed);
}

function formatFromSeed(seed) {
  const hash = crypto.createHash('sha256').update(seed, 'utf8').digest('hex');
  // Take the first 12 hex chars for the human-readable form, grouped in 4s.
  const short = hash.slice(0, 12).toUpperCase();
  const formatted = `${short.slice(0, 4)}-${short.slice(4, 8)}-${short.slice(8, 12)}`;
  return { raw: hash, formatted };
}

module.exports = { getMachineId };
