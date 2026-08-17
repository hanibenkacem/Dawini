/**
 * licenseManager.js
 *
 * Public API used by main.js / IPC handlers. Wraps machineId, crypto, and
 * secureStore into a single cohesive status/activation flow.
 *
 * License key format (what the doctor pastes in):
 *   base64url(JSON payload) + "." + base64(Ed25519 signature)
 *
 * Payload fields:
 *   {
 *     machineId: "<raw sha256 hex from machineId.js>",
 *     tier: "single" | "multi" | "enterprise",
 *     type: "permanent" | "subscription",
 *     issuedAt: ISO date,
 *     expiresAt: ISO date | null,   // null => permanent
 *     customer: "optional display name",
 *     licenseId: "unique id for revocation lookups later"
 *   }
 *
 * The `type`/`expiresAt`/`revocation` fields exist now so that subscription
 * licenses, renewal, and remote revocation (future extensions) don't
 * require a payload format change — only new validation branches.
 */

'use strict';

const { getMachineId } = require('./machineId');
const { verify, canonicalize } = require('./crypto');
const secureStore = require('./secureStore');

const TRIAL_LENGTH_DAYS = 7;

const STATUS = {
  TRIAL_ACTIVE: 'trial_active',
  TRIAL_EXPIRED: 'trial_expired',
  NOT_ACTIVATED: 'not_activated', // no trial started yet, no license
  LICENSED: 'licensed',
  LICENSE_INVALID: 'license_invalid', // signature bad, or wrong machine
  LICENSE_EXPIRED: 'license_expired', // valid signature, subscription lapsed
};

function decodeLicenseKey(licenseKeyString) {
  const trimmed = String(licenseKeyString || '').trim();
  const parts = trimmed.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signatureB64] = parts;
  let payload;
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    payload = JSON.parse(json);
  } catch (err) {
    return null;
  }
  return { payload, payloadJson: canonicalize(payload), signatureB64 };
}

/**
 * Validates a decoded license against the current machine + current time.
 * Does NOT touch storage — pure function, easy to unit test.
 */
function validateDecoded(decoded, currentMachineIdRaw, now = new Date()) {
  if (!decoded) return { valid: false, reason: 'malformed' };

  const { payload, payloadJson, signatureB64 } = decoded;

  if (!verify(payloadJson, signatureB64)) {
    return { valid: false, reason: 'bad_signature' };
  }

  if (payload.machineId !== currentMachineIdRaw) {
    return { valid: false, reason: 'wrong_machine' };
  }

  if (payload.expiresAt) {
    const expires = new Date(payload.expiresAt);
    if (now.getTime() > expires.getTime()) {
      return { valid: false, reason: 'expired', payload };
    }
  }

  return { valid: true, payload };
}

class LicenseManager {
  constructor() {
    this._machineId = null; // { raw, formatted }
  }

  getMachineId() {
    if (!this._machineId) this._machineId = getMachineId();
    return this._machineId;
  }

  /**
   * Full status check — call this once at app startup before showing any UI.
   *
   * Every branch includes both `machineId` (short "XXXX-XXXX-XXXX" form,
   * shown on screen) and `machineIdRaw` (full 64-char sha256 hex). The raw
   * value is what license keys are actually signed against — it is NOT
   * derivable from the short form (which is just its first 12 hex chars),
   * so the renderer needs it verbatim to let a doctor send you something
   * you can actually generate a license from.
   */
  getStatus() {
    const machineId = this.getMachineId();

    // 1. Is there an activated, valid license stored?
    const storedLicense = secureStore.loadLicense();
    if (storedLicense) {
      const decoded = decodeLicenseKey(storedLicense.licenseKey);
      const result = validateDecoded(decoded, machineId.raw);
      if (result.valid) {
        return {
          status: STATUS.LICENSED,
          machineId: machineId.formatted,
          machineIdRaw: machineId.raw,
          tier: result.payload.tier,
          type: result.payload.type,
          expiresAt: result.payload.expiresAt,
        };
      }
      if (result.reason === 'expired') {
        return {
          status: STATUS.LICENSE_EXPIRED,
          machineId: machineId.formatted,
          machineIdRaw: machineId.raw,
          expiresAt: result.payload.expiresAt,
        };
      }
      // Signature invalid or wrong machine (e.g. folder copied elsewhere).
      return {
        status: STATUS.LICENSE_INVALID,
        machineId: machineId.formatted,
        machineIdRaw: machineId.raw,
      };
    }

    // 2. No license — check trial status.
    const marker = secureStore.findTrialMarkerForMachine(machineId.raw);
    if (!marker) {
      return {
        status: STATUS.NOT_ACTIVATED,
        machineId: machineId.formatted,
        machineIdRaw: machineId.raw,
      };
    }

    const startedAt = new Date(marker.startedAt);
    const elapsedMs = Date.now() - startedAt.getTime();
    const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
    const daysRemaining = TRIAL_LENGTH_DAYS - elapsedDays;

    if (daysRemaining > 0) {
      return {
        status: STATUS.TRIAL_ACTIVE,
        machineId: machineId.formatted,
        machineIdRaw: machineId.raw,
        daysRemaining,
      };
    }

    return {
      status: STATUS.TRIAL_EXPIRED,
      machineId: machineId.formatted,
      machineIdRaw: machineId.raw,
    };
  }

  /**
   * Starts the 7-day trial for this machine. No-op / rejected if a trial
   * was already consumed on this machine (checked via redundant markers).
   */
  startTrial() {
    const machineId = this.getMachineId();
    const existing = secureStore.findTrialMarkerForMachine(machineId.raw);
    if (existing) {
      return { ok: false, reason: 'trial_already_used' };
    }
    secureStore.recordTrialStart(machineId.raw, new Date().toISOString());
    return { ok: true, daysRemaining: TRIAL_LENGTH_DAYS };
  }

  /**
   * Validates and, if valid, persists a license key entered by the user.
   */
  activateLicense(licenseKeyString) {
    const machineId = this.getMachineId();
    const decoded = decodeLicenseKey(licenseKeyString);
    const result = validateDecoded(decoded, machineId.raw);

    if (!result.valid) {
      return { ok: false, reason: result.reason || 'invalid' };
    }

    secureStore.saveLicense({ licenseKey: String(licenseKeyString).trim() });
    return { ok: true, tier: result.payload.tier, type: result.payload.type };
  }
}

module.exports = { LicenseManager, STATUS, TRIAL_LENGTH_DAYS };