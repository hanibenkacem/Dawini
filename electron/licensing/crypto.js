/**
 * crypto.js
 *
 * Signature verification for license files, using Ed25519
 * (Node's built-in crypto module — no external dependency).
 *
 * IMPORTANT: this file only ever holds the PUBLIC key. The private key
 * lives exclusively in tools/license-generator on the developer's machine
 * and must never be committed to, or shipped inside, the Dawini app.
 */

'use strict';

const crypto = require('crypto');

// Replace this with the public key printed by `tools/license-generator/keygen.js`.
// It is safe to embed in the app / commit to the app's repo.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAfsWzEZ3sBkPVDxHnNj1BqWh558Sc9CtdmiMv/3BYiaI=
-----END PUBLIC KEY-----`;

function getPublicKey() {
  return crypto.createPublicKey(PUBLIC_KEY_PEM);
}

/**
 * Verifies a signature over a payload.
 * @param {string} payloadJson - canonical JSON string that was signed
 * @param {string} signatureB64 - base64-encoded Ed25519 signature
 * @returns {boolean}
 */
function verify(payloadJson, signatureB64) {
  try {
    const publicKey = getPublicKey();
    const signature = Buffer.from(signatureB64, 'base64');
    return crypto.verify(null, Buffer.from(payloadJson, 'utf8'), publicKey, signature);
  } catch (err) {
    return false;
  }
}

/**
 * Produces a canonical JSON string for a license payload object so that
 * both the generator and the app hash/sign/verify the exact same bytes,
 * regardless of key insertion order.
 */
function canonicalize(obj) {
  const sortedKeys = Object.keys(obj).sort();
  const sorted = {};
  for (const k of sortedKeys) sorted[k] = obj[k];
  return JSON.stringify(sorted);
}

module.exports = { verify, canonicalize, PUBLIC_KEY_PEM };
